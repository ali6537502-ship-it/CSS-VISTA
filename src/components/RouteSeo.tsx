import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { CANONICAL_ORIGIN, canonicalForPath, findRouteDefinition } from '@/data/routeRegistry.mjs'

function setMeta(selector: string, attribute: string, value: string) {
  const node = document.querySelector<HTMLMetaElement>(selector)
  if (node) node.setAttribute(attribute, value)
}

export default function RouteSeo() {
  const location = useLocation()

  useEffect(() => {
    const route = findRouteDefinition(location.pathname)
    const unknown = !route
    const title = route?.title || 'Page Not Found | CSS Vista'
    const description = route?.description || 'The requested CSS Vista page could not be found.'
    const robots = location.search ? 'noindex, follow' : (route?.robots || 'noindex, nofollow')
    const canonical = unknown ? `${CANONICAL_ORIGIN}/404` : canonicalForPath(location.pathname)
    const routeSchema = document.getElementById('cssv-route-structured-data') as HTMLScriptElement | null

    document.getElementById('cssv-runtime-route-structured-data')?.remove()

    // These routes have data-dependent metadata and structured data that their
    // page components own. Avoid replacing it with a generic route definition.
    if (
      location.pathname.startsWith('/past-papers/view/')
      || location.pathname.startsWith('/gk/cat/')
      || location.pathname === '/css-2026-written-result'
    ) {
      setMeta('meta[name="robots"]', 'content', robots)
      return
    }

    document.title = title
    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[name="robots"]', 'content', robots)
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[property="og:url"]', 'content', canonical)
    setMeta('meta[name="twitter:title"]', 'content', title)
    setMeta('meta[name="twitter:description"]', 'content', description)
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonical)

    if (route && route.match === 'exact' && route.path !== '/') {
      const script = routeSchema || document.createElement('script')
      script.id = 'cssv-route-structured-data'
      script.type = 'application/ld+json'
      script.text = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': route.schemaType,
        name: route.h1,
        description: route.description,
        url: canonical,
        isPartOf: { '@type': 'WebSite', name: 'CSS Vista', url: `${CANONICAL_ORIGIN}/` },
      })
      if (!routeSchema) document.head.appendChild(script)
    } else {
      routeSchema?.remove()
    }
  }, [location.pathname, location.search])

  return null
}
