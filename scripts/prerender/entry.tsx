/**
 * Server-rendering entry used by the production prerender step.
 *
 * It renders the *real* page components, inside the same providers and router
 * the browser uses, so the crawler-facing HTML and the hydrated page describe
 * the same resource. A route that cannot be rendered here has no prerendered
 * primary content, and the build then refuses to treat it as indexable.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AccountProvider } from '@/components/AccountProvider'
import { SiteContentProvider } from '@/components/SiteContentProvider'
import Layout from '@/components/Layout'
import TrustFooter from '@/components/TrustFooter'
import { PRERENDER_ROUTES } from './routes'

export interface RenderResult {
  path: string
  html: string
  error?: string
}

export function renderRoute(pathname: string): RenderResult {
  const route = PRERENDER_ROUTES.find((entry) => entry.path === pathname)
  if (!route) return { path: pathname, html: '', error: 'No prerender component registered' }
  try {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={[route.path]}>
        <AccountProvider>
          <SiteContentProvider>
            {/* The same layout route the browser mounts, so the initial HTML
                carries the real header, navigation and trust footer. */}
            <Routes>
              <Route element={<><Layout /><TrustFooter /></>}>
                <Route path={route.pattern} element={route.render()} />
              </Route>
            </Routes>
          </SiteContentProvider>
        </AccountProvider>
      </MemoryRouter>,
    )
    return { path: pathname, html }
  } catch (error) {
    return { path: pathname, html: '', error: error instanceof Error ? error.message : String(error) }
  }
}

export function renderAll(): RenderResult[] {
  return PRERENDER_ROUTES.map((route) => renderRoute(route.path))
}

export { PRERENDER_ROUTES }
