import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router'
import {
  ADSENSE_PUBLISHER_ID,
  AD_ACTIVE_PRESENCE_WINDOW_MS,
  AD_ACTIVE_TIME_MS,
  adContentIdentity,
  advanceActiveTime,
  claimAdOpportunity,
  createAdSessionState,
  getAdRoutePolicy,
  isAdFreePath,
  registerEligiblePageVisit,
  type AdOpportunityTrigger,
  type AdRoutePolicy,
  type AdSessionState,
} from '@/lib/ads'

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[]
  }
}

const SESSION_KEY = 'css-vista:ads:v1'
const initializedOpportunityIds = new Set<string>()
let adsenseLoadPromise: Promise<boolean> | null = null

interface AdOpportunity {
  id: string
  entryKey: string
  routeIdentity: string
  trigger: AdOpportunityTrigger
}

interface AdSenseContextValue {
  opportunity: AdOpportunity | null
  policy: AdRoutePolicy
  slot: string
  clearOpportunity: (id: string) => void
}

const AdSenseContext = createContext<AdSenseContextValue | null>(null)

function readSessionState(): AdSessionState {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '') as Partial<AdSessionState>
    if (parsed.version !== 1) return createAdSessionState()
    return {
      version: 1,
      eligiblePageCount: Number.isFinite(parsed.eligiblePageCount) ? Math.max(0, parsed.eligiblePageCount!) : 0,
      visitedEligiblePaths: Array.isArray(parsed.visitedEligiblePaths) ? parsed.visitedEligiblePaths.filter((value): value is string => typeof value === 'string') : [],
      handledEntryKeys: Array.isArray(parsed.handledEntryKeys) ? parsed.handledEntryKeys.filter((value): value is string => typeof value === 'string') : [],
      cooldownUntil: Number.isFinite(parsed.cooldownUntil) ? Math.max(0, parsed.cooldownUntil!) : 0,
      recentOpportunityKeys: Array.isArray(parsed.recentOpportunityKeys) ? parsed.recentOpportunityKeys.filter((value): value is string => typeof value === 'string') : [],
      lastRouteEvent: parsed.lastRouteEvent && typeof parsed.lastRouteEvent.path === 'string' && typeof parsed.lastRouteEvent.entryKey === 'string' && Number.isFinite(parsed.lastRouteEvent.at)
        ? { path: parsed.lastRouteEvent.path, entryKey: parsed.lastRouteEvent.entryKey, at: parsed.lastRouteEvent.at }
        : null,
    }
  } catch {
    return createAdSessionState()
  }
}

function writeSessionState(state: AdSessionState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state))
  } catch {
    // Storage may be unavailable in private or restricted browsing modes.
  }
}

function protectVignetteLinks(currentPath: string, currentSearch: string) {
  const currentRouteIsAdFree = isAdFreePath(currentPath, currentSearch)
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    let destination: URL
    try {
      destination = new URL(anchor.href, window.location.origin)
    } catch {
      return
    }

    const mustBlockVignette = currentRouteIsAdFree
      || anchor.hasAttribute('download')
      || (destination.origin === window.location.origin && isAdFreePath(destination.pathname, destination.search))

    if (mustBlockVignette) {
      anchor.setAttribute('data-google-vignette', 'false')
      anchor.setAttribute('data-css-vista-vignette-protected', 'true')
    } else if (anchor.hasAttribute('data-css-vista-vignette-protected')) {
      anchor.removeAttribute('data-google-vignette')
      anchor.removeAttribute('data-css-vista-vignette-protected')
    }
  })
}

function loadAdSenseOnce() {
  if (import.meta.env.DEV) return Promise.resolve(false)
  if (adsenseLoadPromise) return adsenseLoadPromise

  adsenseLoadPromise = new Promise<boolean>((resolve) => {
    const selector = `script[data-css-vista-adsense="${ADSENSE_PUBLISHER_ID}"]`
    const existing = document.querySelector<HTMLScriptElement>(selector)
    if (existing) {
      if (window.adsbygoogle) {
        resolve(true)
        return
      }
      existing.addEventListener('load', () => resolve(true), { once: true })
      existing.addEventListener('error', () => resolve(false), { once: true })
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`
    script.dataset.cssVistaAdsense = ADSENSE_PUBLISHER_ID
    script.addEventListener('load', () => resolve(true), { once: true })
    script.addEventListener('error', () => resolve(false), { once: true })
    document.head.appendChild(script)
  })

  return adsenseLoadPromise
}

function resolveContentSlot() {
  return (
    import.meta.env.VITE_ADSENSE_SLOT_CONTENT
    || import.meta.env.VITE_ADSENSE_SLOT_BOTTOM
    || import.meta.env.VITE_ADSENSE_SLOT_TOP
    || ''
  ).trim()
}

export function AdSenseProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const policy = useMemo(
    () => getAdRoutePolicy(location.pathname, location.search),
    [location.pathname, location.search],
  )
  const routeIdentity = adContentIdentity(location.pathname)
  const entryKey = location.key || routeIdentity
  const slot = resolveContentSlot()
  const [opportunity, setOpportunity] = useState<AdOpportunity | null>(null)

  useLayoutEffect(() => {
    setOpportunity((current) => (
      current?.entryKey === entryKey && current.routeIdentity === routeIdentity && policy.eligible
        ? current
        : null
    ))
  }, [entryKey, policy.eligible, routeIdentity])

  useEffect(() => {
    protectVignetteLinks(location.pathname, location.search)
    const observer = new MutationObserver(() => protectVignetteLinks(location.pathname, location.search))
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!policy.eligible) return

    let cancelled = false
    let opportunityClaimed = false
    let pendingThirdPage = false
    let activeElapsedMs = 0
    let lastTickAt = performance.now()
    let lastActivityAt = Date.now()
    const opportunityEnabled = import.meta.env.DEV || Boolean(slot)

    const initialState = readSessionState()
    const visit = registerEligiblePageVisit(initialState, {
      eligible: true,
      path: routeIdentity,
      entryKey,
      at: Date.now(),
    })
    if (visit.state !== initialState) writeSessionState(visit.state)
    pendingThirdPage = visit.thirdPageDue

    function requestOpportunity(trigger: AdOpportunityTrigger) {
      if (cancelled || opportunityClaimed || !opportunityEnabled) return false

      const claimed = claimAdOpportunity(readSessionState(), {
        entryKey,
        at: Date.now(),
        trigger,
      })
      if (!claimed.claimed) return false

      writeSessionState(claimed.state)
      opportunityClaimed = true
      pendingThirdPage = false
      setOpportunity({
        id: claimed.opportunityKey,
        entryKey,
        routeIdentity,
        trigger,
      })
      return true
    }

    const noteActivity = () => {
      lastActivityAt = Date.now()
    }
    const handleVisibilityChange = () => {
      lastTickAt = performance.now()
      if (document.visibilityState === 'visible') noteActivity()
    }
    const stopForPageExit = () => {
      cancelled = true
    }

    const activityEvents: (keyof WindowEventMap)[] = ['focus', 'keydown', 'pointerdown', 'scroll', 'touchstart']
    activityEvents.forEach((event) => window.addEventListener(event, noteActivity, { passive: true }))
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', stopForPageExit)

    if (pendingThirdPage) requestOpportunity('third-page')

    const timer = window.setInterval(() => {
      if (cancelled || opportunityClaimed) return

      const tickAt = performance.now()
      const now = Date.now()
      const active = document.visibilityState === 'visible'
        && document.hasFocus()
        && now - lastActivityAt <= AD_ACTIVE_PRESENCE_WINDOW_MS
      activeElapsedMs = advanceActiveTime(activeElapsedMs, tickAt - lastTickAt, active)
      lastTickAt = tickAt

      const delayedDue = activeElapsedMs >= AD_ACTIVE_TIME_MS
      if (pendingThirdPage || delayedDue) {
        const trigger: AdOpportunityTrigger = pendingThirdPage && delayedDue
          ? 'combined'
          : pendingThirdPage
            ? 'third-page'
            : 'delayed'
        requestOpportunity(trigger)
      }
    }, 1_000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      activityEvents.forEach((event) => window.removeEventListener(event, noteActivity))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', stopForPageExit)
    }
  }, [entryKey, policy.eligible, routeIdentity, slot])

  const value = useMemo<AdSenseContextValue>(() => ({
    opportunity,
    policy,
    slot,
    clearOpportunity: (id: string) => setOpportunity((current) => current?.id === id ? null : current),
  }), [opportunity, policy, slot])

  return <AdSenseContext.Provider value={value}>{children}</AdSenseContext.Provider>
}

export function AdSlot({
  slot,
  placementType,
  routeEligible,
  responsive = true,
  format = 'auto',
  minimumReservedHeight,
  delayedDisplay,
  thirdPageDisplay,
  opportunityId,
  onUnused,
}: {
  slot: string
  placementType: AdRoutePolicy['placementType']
  routeEligible: boolean
  responsive?: boolean
  format?: 'auto' | 'rectangle' | 'horizontal'
  minimumReservedHeight: number
  delayedDisplay: boolean
  thirdPageDisplay: boolean
  opportunityId: string
  onUnused: () => void
}) {
  const insRef = useRef<HTMLModElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const displayApproved = delayedDisplay || thirdPageDisplay

  useEffect(() => {
    if (!routeEligible || !displayApproved || collapsed || import.meta.env.DEV || !slot) return

    const node = insRef.current
    if (!node || !node.isConnected) return
    const adNode = node
    let cancelled = false
    let statusObserver: MutationObserver | null = null
    let collapseTimer = 0

    const collapse = () => {
      if (cancelled) return
      setCollapsed(true)
      onUnused()
    }

    async function initialize() {
      if (cancelled || !adNode.isConnected || initializedOpportunityIds.has(opportunityId)) return
      initializedOpportunityIds.add(opportunityId)
      if (initializedOpportunityIds.size > 100) {
        const oldest = initializedOpportunityIds.values().next().value
        if (oldest) initializedOpportunityIds.delete(oldest)
      }

      const loaded = await loadAdSenseOnce()
      if (cancelled || !adNode.isConnected) return
      if (!loaded) {
        collapse()
        return
      }

      statusObserver = new MutationObserver(() => {
        const status = adNode.getAttribute('data-ad-status')
        if (status === 'unfilled') collapse()
        if (status === 'filled' && collapseTimer) window.clearTimeout(collapseTimer)
      })
      statusObserver.observe(adNode, { attributes: true, attributeFilter: ['data-ad-status'] })
      collapseTimer = window.setTimeout(() => {
        if (!adNode.getAttribute('data-ad-status')) collapse()
      }, 20_000)

      try {
        window.adsbygoogle = window.adsbygoogle || []
        window.adsbygoogle.push({})
      } catch {
        collapse()
      }
    }

    if (!('IntersectionObserver' in window)) {
      void initialize()
      return () => {
        cancelled = true
        statusObserver?.disconnect()
        if (collapseTimer) window.clearTimeout(collapseTimer)
      }
    }

    const intersectionObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        intersectionObserver.disconnect()
        void initialize()
      }
    }, { rootMargin: '300px 0px' })
    intersectionObserver.observe(adNode)

    return () => {
      cancelled = true
      intersectionObserver.disconnect()
      statusObserver?.disconnect()
      if (collapseTimer) window.clearTimeout(collapseTimer)
    }
  }, [collapsed, displayApproved, onUnused, opportunityId, routeEligible, slot])

  if (!routeEligible || !displayApproved || collapsed) return null

  if (import.meta.env.DEV) {
    return (
      <div
        className="grid w-full place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-[10px] uppercase tracking-[0.16em] text-slate-500"
        style={{ minHeight: minimumReservedHeight }}
        data-ad-test-placeholder="true"
      >
        Advertisement
      </div>
    )
  }

  if (!slot) return null

  return (
    <div
      className="ad-container w-full overflow-hidden text-center"
      style={{ minHeight: minimumReservedHeight }}
      data-ad-placement={placementType}
    >
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

export function ManagedAdOpportunity() {
  const context = useContext(AdSenseContext)
  const location = useLocation()
  const livePolicy = getAdRoutePolicy(location.pathname, location.search)
  if (!context || !livePolicy.eligible || !context.opportunity) return null

  const routeIdentity = adContentIdentity(location.pathname)
  const entryKey = location.key || routeIdentity
  const opportunity = context.opportunity
  if (opportunity.entryKey !== entryKey || opportunity.routeIdentity !== routeIdentity) return null

  return (
    <section
      className="no-print mx-auto w-full max-w-5xl px-4 py-8 sm:py-10"
      aria-label="Advertisement"
      data-css-vista-managed-ad="true"
    >
      <AdSlot
        slot={context.slot}
        placementType={livePolicy.placementType}
        routeEligible={livePolicy.eligible}
        format="auto"
        minimumReservedHeight={livePolicy.minimumHeight}
        delayedDisplay={opportunity.trigger === 'delayed' || opportunity.trigger === 'combined'}
        thirdPageDisplay={opportunity.trigger === 'third-page' || opportunity.trigger === 'combined'}
        opportunityId={opportunity.id}
        onUnused={() => context.clearOpportunity(opportunity.id)}
      />
    </section>
  )
}
