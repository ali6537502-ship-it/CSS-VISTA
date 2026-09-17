/**
 * Where each exact route's generated page is actually served from.
 *
 * The build writes pages in one step and the prerender fills them in another,
 * so both must agree on the file Apache will serve. When they disagreed, the
 * real content was written to a file nothing served and a stub shipped
 * alongside it at the served path.
 */
import { join } from 'node:path'

/** Routes served from somewhere other than `seo/routes/`. */
export const SERVED_FILE_OVERRIDES = new Map([
  ['/css-2026-written-result', join('seo', 'css-2026-written-result.html')],
])

export function staticRouteFile(routePath) {
  const name = routePath.replace(/^\/+|\/+$/g, '').replaceAll('/', '--') || 'home'
  return `${name}.html`
}

/** The document-root-relative file a route is served from. */
export function servedFileFor(routePath) {
  if (routePath === '/') return 'index.html'
  return SERVED_FILE_OVERRIDES.get(routePath) ?? join('seo', 'routes', staticRouteFile(routePath))
}
