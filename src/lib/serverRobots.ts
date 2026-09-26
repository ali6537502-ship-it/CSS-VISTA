/**
 * The production build decides indexability per page (real content or
 * `noindex`, never filler) and writes that decision into the served HTML. Page
 * components that set robots after hydration must not overturn a server-side
 * `noindex` for the URL the visitor or crawler actually landed on, or Google's
 * rendered page would contradict the HTML it fetched.
 *
 * Captured once, when the client bundle first evaluates and before any effect
 * has touched the head.
 */
const landingPath = typeof window === 'undefined' ? '' : window.location.pathname
const landingRobots = typeof document === 'undefined'
  ? ''
  : document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.getAttribute('content') || ''

/**
 * `robots`, unless this is the landing URL and the server served it `noindex`,
 * in which case the server's value is kept.
 */
export function respectServerNoindex(pathname: string, robots: string): string {
  return pathname === landingPath && /noindex/i.test(landingRobots) && !/noindex/i.test(robots)
    ? landingRobots
    : robots
}
