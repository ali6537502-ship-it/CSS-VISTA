import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, type LinkProps, type NavLinkProps } from 'react-router'
import { ProReleaseContext, useProReleasePaused } from './proReleaseContext'
import { isProDestination } from './proDestinations'

export function ProReleaseProvider({ children }: { children: ReactNode }) {
  // Fail closed while loading or if availability cannot be verified. No local-storage override.
  const [paused, setPaused] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/pro-release.php', { cache: 'no-store', signal: controller.signal })
      .then(async response => response.ok ? response.json() as Promise<{ paused?: unknown }> : null)
      .then(data => { if (!controller.signal.aborted) setPaused(data?.paused !== false) })
      .catch(() => { if (!controller.signal.aborted) setPaused(true) })
    return () => controller.abort()
  }, [])
  return <ProReleaseContext value={paused}>{children}</ProReleaseContext>
}

export function ProPausedNotice() {
  return <section className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-bold text-slate-950">CSS Vista Pro is temporarily unavailable</h1><p className="mt-4 text-sm leading-7 text-slate-600">We are finalising the Pro learning experience. Your saved work and account records are retained.</p><Link to="/account/dashboard?plan=free" className="mt-6 inline-flex min-h-11 items-center rounded-xl border px-5 text-sm font-semibold">Open Free account</Link></section>
}

export function ProReleaseOutlet() {
  const paused = useProReleasePaused(), location = useLocation()
  const blocked = location.pathname !== '/account/dashboard' && isProDestination(location.pathname + location.search)
  return paused && blocked ? <ProPausedNotice /> : <Outlet />
}

function destination(to: LinkProps['to']): string {
  return typeof to === 'string' ? to : (to.pathname || '') + (to.search || '')
}
export function AvailableStudyLink(props: LinkProps) {
  const paused = useProReleasePaused()
  return paused && isProDestination(destination(props.to)) ? null : <Link {...props} />
}
export function AvailableStudyNavLink(props: NavLinkProps) {
  const paused = useProReleasePaused()
  return paused && isProDestination(destination(props.to)) ? null : <NavLink {...props} />
}
