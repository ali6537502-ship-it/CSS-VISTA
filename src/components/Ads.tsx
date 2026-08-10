import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { isAdFreePath } from '@/lib/ads'

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[]
  }
}

function protectAdFreeLinks(currentPath: string) {
  const currentPageIsAdFree = isAdFreePath(currentPath)
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    let destination = ''
    try {
      destination = new URL(anchor.href, window.location.origin).pathname
    } catch {
      return
    }
    if (currentPageIsAdFree || isAdFreePath(destination) || anchor.hasAttribute('download')) {
      anchor.setAttribute('data-google-vignette', 'false')
    }
  })
}

export function AdSenseLoader() {
  const location = useLocation()
  const client = (import.meta.env.VITE_ADSENSE_CLIENT ?? '').trim()

  useEffect(() => {
    protectAdFreeLinks(location.pathname)
    const observer = new MutationObserver(() => protectAdFreeLinks(location.pathname))
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [location.pathname])

  useEffect(() => {
    if (!client || isAdFreePath(location.pathname)) return
    if (document.querySelector('script[data-css-vista-adsense]')) return
    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
    script.dataset.cssVistaAdsense = 'true'
    document.head.appendChild(script)
  }, [client, location.pathname])

  return null
}

export function AdSlot({
  slot,
  className = '',
  format = 'auto',
  label = 'Advertisement space',
}: {
  slot?: string
  className?: string
  format?: 'auto' | 'rectangle' | 'horizontal'
  label?: string
}) {
  const client = (import.meta.env.VITE_ADSENSE_CLIENT ?? '').trim()
  const resolvedSlot = (slot ?? '').trim()

  useEffect(() => {
    if (!client || !resolvedSlot) return
    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    } catch {
      // AdSense can retry or leave the unit unfilled without affecting the page.
    }
  }, [client, resolvedSlot])

  if (!client || !resolvedSlot) {
    if (!import.meta.env.DEV) return null
    return (
      <div
        className={`flex min-h-20 items-center justify-center rounded-lg border border-dashed bg-secondary/25 px-4 text-center text-[11px] uppercase tracking-wide text-muted-foreground ${className}`}
        aria-label={`${label} preview`}
      >
        {label}
      </div>
    )
  }

  return (
    <div className={`ad-container overflow-hidden text-center ${className}`} aria-label="Advertisement">
      <p className="mb-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Advertisement</p>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={resolvedSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}

export function PageFooterAd() {
  const location = useLocation()
  if (isAdFreePath(location.pathname) || location.pathname.startsWith('/past-papers/view/')) return null
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5">
      <AdSlot
        slot={import.meta.env.VITE_ADSENSE_SLOT_BOTTOM}
        format="horizontal"
        label="Bottom page advertisement placement"
      />
    </div>
  )
}

export function PageHeaderAd() {
  const location = useLocation()
  if (isAdFreePath(location.pathname) || location.pathname.startsWith('/past-papers/view/')) return null
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-2 pt-3">
      <AdSlot
        slot={import.meta.env.VITE_ADSENSE_SLOT_TOP}
        format="horizontal"
        className="min-h-16"
        label="Top page advertisement placement"
      />
    </div>
  )
}
