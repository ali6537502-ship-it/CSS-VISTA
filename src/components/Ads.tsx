import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import {
  ADSENSE_PUBLISHER_ID,
  ADSENSE_SIGNED_IN_ACCOUNT_SLOT_ID,
  canShowAuthenticatedAccountAd,
  deriveAdPageState,
  getAdRoutePolicy,
  renderedAdContentState,
  needsCleanAdDocument,
  type AdContentState,
  shouldProtectVignetteLink,
  type AdRoutePolicy,
} from '@/lib/ads'
import { useAccount } from '@/lib/accountContext'
import { scheduleIdleWork } from '@/lib/idle'
import { isNotesBundleExclusiveWindow } from '@/data/notesBundleOffer'

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[]
  }
}

const AdContentStateContext = createContext<AdContentState>('ready')

const initializedSlots = new WeakSet<HTMLElement>()
let adsenseLoadPromise: Promise<boolean> | null = null

function loadAdSenseOnce() {
  if (import.meta.env.DEV) return Promise.resolve(false)
  if (adsenseLoadPromise) return adsenseLoadPromise

  adsenseLoadPromise = new Promise<boolean>((resolve) => {
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (window.adsbygoogle) resolve(true)
      else {
        existing.addEventListener('load', () => resolve(true), { once: true })
        existing.addEventListener('error', () => resolve(false), { once: true })
      }
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.src = src
    script.addEventListener('load', () => resolve(true), { once: true })
    script.addEventListener('error', () => resolve(false), { once: true })
    document.head.appendChild(script)
  })

  return adsenseLoadPromise
}

function protectVignetteLinks(currentPath: string, currentSearch: string, root: ParentNode = document) {
  const anchors = [...root.querySelectorAll<HTMLAnchorElement>('a[href]')]
  if (root instanceof HTMLAnchorElement && root.matches('a[href]')) anchors.unshift(root)

  anchors.forEach((anchor) => {
    let destination: URL
    try {
      destination = new URL(anchor.href, window.location.origin)
    } catch {
      return
    }

    const navigationControl = Boolean(anchor.closest('header, nav, footer, [role="navigation"], [data-cssv-auto-ad-exclusion]'))
    const protectedLink = shouldProtectVignetteLink({
      currentPath,
      currentSearch,
      destinationPath: destination.origin === window.location.origin ? destination.pathname : undefined,
      destinationSearch: destination.search,
      external: destination.origin !== window.location.origin,
      download: anchor.hasAttribute('download'),
      navigationControl,
    })

    if (protectedLink) {
      anchor.setAttribute('data-google-vignette', 'false')
      anchor.setAttribute('data-css-vista-vignette-protected', 'true')
    } else if (anchor.hasAttribute('data-css-vista-vignette-protected')) {
      anchor.removeAttribute('data-google-vignette')
      anchor.removeAttribute('data-css-vista-vignette-protected')
    }
  })
}

/**
 * Loads Google's official Auto ads library only after an eligible public
 * content route is reached. No counters, artificial delays or impression
 * simulation are used; vignette frequency belongs to AdSense.
 */
export function AdSenseProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { loading, user, passwordRecovery } = useAccount()
  const [contentState, setContentState] = useState<AdContentState>('ready')
  const routeKey = `${location.pathname}${location.search}`
  const [documentTransition, setDocumentTransition] = useState({ route: routeKey, clean: false })
  if (documentTransition.route !== routeKey) {
    // React re-renders this component before committing its children. This
    // prevents the destination's private content flashing into the old document.
    setDocumentTransition({
      route: routeKey,
      clean: needsCleanAdDocument({
        previousRoute: documentTransition.route,
        pathname: location.pathname,
        search: location.search,
        libraryPresent: typeof document !== 'undefined'
          && Boolean(document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')),
      }),
    })
  }
  const cleanDocumentNeeded = documentTransition.clean

  useLayoutEffect(() => {
    if (cleanDocumentNeeded) {
      // Use a normal same-origin document navigation before rendering private
      // or focused-study content into a document with Google's library active.
      window.location.replace(`${window.location.origin}${routeKey}${location.hash}`)
      return
    }
  }, [cleanDocumentNeeded, routeKey, location.hash])

  // The live page state, so the suppression rules actually apply in production
  // rather than only in tests.
  const pageState = deriveAdPageState({
    pathname: location.pathname,
    search: location.search,
    user,
    loading,
    passwordRecovery,
    contentState,
  })
  const policy = getAdRoutePolicy(location.pathname, location.search, pageState)

  useEffect(() => {
    setContentState(renderedAdContentState(document))
    protectVignetteLinks(location.pathname, location.search)
    const pendingRoots = new Set<ParentNode>()
    let scheduled = false
    let active = true
    const flush = () => {
      scheduled = false
      if (!active) return
      setContentState(renderedAdContentState(document))
      pendingRoots.forEach((root) => protectVignetteLinks(location.pathname, location.search, root))
      pendingRoots.clear()
    }
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) pendingRoots.add(node)
      }))
      if (!scheduled) {
        scheduled = true
        queueMicrotask(flush)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-cssv-ad-state'] })
    return () => {
      active = false
      pendingRoots.clear()
      observer.disconnect()
    }
  }, [location.pathname, location.search])

  useEffect(() => {
    if (isNotesBundleExclusiveWindow()) return undefined
    if (!policy.autoAdsEnabled) return undefined
    return scheduleIdleWork(
      () => {
        // Recheck at execution time: a fetch can fail after idle work was queued.
        // A navigation to an ad-free route gets a clean document above.
        if (renderedAdContentState(document) === 'ready') void loadAdSenseOnce()
      },
      { timeout: 2_500, fallbackDelay: 1_200 },
    )
  }, [policy.autoAdsEnabled])

  if (cleanDocumentNeeded) {
    return <div role="status" data-cssv-ad-state="loading" className="mx-auto max-w-5xl px-4 py-10">Opening the requested page…</div>
  }
  return <AdContentStateContext.Provider value={contentState}>{children}</AdContentStateContext.Provider>
}

function configuredContentSlot() {
  const slot = (import.meta.env.VITE_ADSENSE_SLOT_CONTENT || '').trim()
  return /^\d+$/.test(slot) ? slot : ADSENSE_SIGNED_IN_ACCOUNT_SLOT_ID
}

export function AdSlot({
  slot,
  placementType,
  routeEligible,
  responsive = true,
  format = 'auto',
  minimumReservedHeight,
}: {
  slot: string
  placementType: AdRoutePolicy['placementType']
  routeEligible: boolean
  responsive?: boolean
  format?: 'auto' | 'rectangle' | 'horizontal'
  minimumReservedHeight: number
}) {
  const insRef = useRef<HTMLModElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!routeEligible || collapsed || import.meta.env.DEV || !/^\d+$/.test(slot)) return
    const node = insRef.current
    if (!node?.isConnected || initializedSlots.has(node)) return

    let cancelled = false
    let statusObserver: MutationObserver | null = null
    let statusTimer = 0
    const collapse = () => {
      if (!cancelled) setCollapsed(true)
    }

    const initialize = async () => {
      if (!node.isConnected || initializedSlots.has(node)) return
      if (renderedAdContentState(document) !== 'ready') return
      initializedSlots.add(node)
      const loaded = await loadAdSenseOnce()
      if (cancelled || !node.isConnected || !loaded || renderedAdContentState(document) !== 'ready') {
        collapse()
        return
      }

      statusObserver = new MutationObserver(() => {
        const status = node.getAttribute('data-ad-status')
        if (status === 'unfilled') collapse()
        if (status === 'filled' && statusTimer) window.clearTimeout(statusTimer)
      })
      statusObserver.observe(node, { attributes: true, attributeFilter: ['data-ad-status'] })
      statusTimer = window.setTimeout(() => {
        if (!node.getAttribute('data-ad-status')) collapse()
      }, 20_000)

      try {
        window.adsbygoogle = window.adsbygoogle || []
        window.adsbygoogle.push({})
      } catch {
        collapse()
      }
    }

    let intersectionObserver: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          intersectionObserver?.disconnect()
          void initialize()
        }
      }, { rootMargin: '300px 0px' })
      intersectionObserver.observe(node)
    } else {
      void initialize()
    }

    return () => {
      cancelled = true
      intersectionObserver?.disconnect()
      statusObserver?.disconnect()
      if (statusTimer) window.clearTimeout(statusTimer)
    }
  }, [collapsed, routeEligible, slot])

  if (isNotesBundleExclusiveWindow() || !routeEligible || collapsed || !/^\d+$/.test(slot)) return null

  return (
    <div className="ad-container w-full overflow-hidden text-center" style={{ minHeight: minimumReservedHeight }} data-ad-placement={placementType}>
      <p className="mb-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Advertisement</p>
      <ins
        ref={insRef}
        className="adsbygoogle block w-full"
        style={{ display: 'block', minHeight: Math.max(90, minimumReservedHeight - 20) }}
        data-ad-client={ADSENSE_PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  )
}

/** A single, below-content manual placement using the verified content slot. */
export function ManagedContentAd() {
  const location = useLocation()
  const contentState = useContext(AdContentStateContext)
  const policy = getAdRoutePolicy(location.pathname, location.search, {
    loadingState: contentState === 'loading',
    errorState: contentState === 'error',
  })
  const slot = configuredContentSlot()
  if (!policy.manualAdsEnabled || !slot) return null

  return (
    <section className="no-print mx-auto w-full max-w-5xl px-4 py-8 sm:py-10" aria-label="Advertisement" data-css-vista-managed-ad="true">
      <AdSlot
        slot={slot}
        placementType={policy.placementType}
        routeEligible={policy.manualAdsEnabled}
        minimumReservedHeight={policy.minimumHeight}
      />
    </section>
  )
}

/**
 * A reserved component for any future explicitly reviewed account-content
 * placement. Current account management/navigation/practice routes are ad-free.
 * Authentication, recovery, assessment and error states always fail closed.
 */
export function AuthenticatedAccountAd({
  sensitiveControlsVisible = false,
  authTransaction = false,
  activeAssessment = false,
  errorState = false,
  loadingState = false,
}: {
  sensitiveControlsVisible?: boolean
  authTransaction?: boolean
  activeAssessment?: boolean
  errorState?: boolean
  loadingState?: boolean
}) {
  const location = useLocation()
  const { loading, user, passwordRecovery } = useAccount()
  const contentState = useContext(AdContentStateContext)
  const eligible = canShowAuthenticatedAccountAd(location.pathname, location.search, {
    authenticated: Boolean(user),
    authLoading: loading,
    passwordRecovery,
    sensitiveControlsVisible,
    authTransaction,
    activeAssessment,
    errorState: errorState || contentState === 'error',
    loadingState: loadingState || contentState === 'loading',
  })

  if (!eligible) return null

  return (
    <section
      className="no-print clear-both border-t border-border/70 pt-8"
      aria-label="Advertisement"
      data-css-vista-authenticated-account-ad="true"
    >
      <AdSlot
        slot={ADSENSE_SIGNED_IN_ACCOUNT_SLOT_ID}
        placementType="pre-footer"
        routeEligible={eligible}
        minimumReservedHeight={250}
      />
    </section>
  )
}
