import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { CANONICAL_ORIGIN, canonicalForPath, findRouteDefinition } from '@/data/routeRegistry.mjs'
import { recoverFromDynamicImport } from '@/lib/chunkRecovery'
import { respectServerNoindex } from '@/lib/serverRobots'

const TRACKING_QUERY_KEYS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'gclid', 'dclid', 'fbclid', 'msclkid',
])

function hasIndexableTrackingQueryOnly(search: string) {
  const keys = [...new URLSearchParams(search).keys()]
  return keys.length > 0 && keys.every((key) => TRACKING_QUERY_KEYS.has(key.toLowerCase()))
}

function setMeta(selector: string, attribute: string, value: string) {
  let node = document.querySelector<HTMLMetaElement>(selector)
  if (!node) {
    const identity = /\[(name|property)="([^"]+)"\]/.exec(selector)
    if (!identity) return
    node = document.createElement('meta')
    node.setAttribute(identity[1], identity[2])
    document.head.appendChild(node)
  }
  node.setAttribute(attribute, value)
}

function setCanonical(url: string | null) {
  let node = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!url) {
    node?.remove()
    return
  }
  if (!node) {
    node = document.createElement('link')
    node.setAttribute('rel', 'canonical')
    document.head.appendChild(node)
  }
  node.setAttribute('href', url)
}

export default function RouteSeo() {
  const location = useLocation()

  useEffect(() => {
    const route = findRouteDefinition(location.pathname)
    const studyMaterialPattern = route?.match === 'pattern' && (
      route.path.startsWith('/study-material/optional/') || route.path.startsWith('/study-material/islamic-studies/'))
    const applyMetadata = (studyMaterial?: typeof import('@/data/studyMaterialMeta.mjs')) => {
      const pageMeta = studyMaterial?.studyMaterialMetaForPath(location.pathname) ?? null
      const unknown = !route || (studyMaterialPattern && !pageMeta)
      const title = unknown ? 'Page Not Found | CSS Vista' : (pageMeta?.title || route.title)
      const description = unknown ? 'The requested CSS Vista page could not be found.' : (pageMeta?.description || route.description)
      const robots = respectServerNoindex(location.pathname, location.search && !hasIndexableTrackingQueryOnly(location.search)
        ? 'noindex, follow'
        : (unknown ? 'noindex, nofollow' : route.robots))
      const canonical = unknown ? null : canonicalForPath(location.pathname)
      const routeSchema = document.getElementById('cssv-route-structured-data') as HTMLScriptElement | null

      document.getElementById('cssv-runtime-route-structured-data')?.remove()
      // Recreate these nodes after an error route removed them, including when
      // the next page delegates its remaining metadata to a detail component.
      setCanonical(canonical)
      if (canonical) setMeta('meta[property="og:url"]', 'content', canonical)
      else document.querySelector('meta[property="og:url"]')?.remove()

      // These routes have data-dependent metadata and structured data that their
      // page components own. Avoid replacing it with a generic route definition.
      if (
        location.pathname.startsWith('/past-papers/view/')
        || /^\/past-papers\/(?:css|pms|ppsc|mpt)\/\d{4}\/?$/.test(location.pathname)
        || location.pathname.startsWith('/gk/cat/')
        || location.pathname.startsWith('/book-summaries/')
        || location.pathname.startsWith('/vistagram/')
        || location.pathname === '/css-2026-written-result'
      ) {
        // A detail component may still be fetching its next record. Never leave
        // the preceding page's schema attached to that URL (including a bad ID).
        if (routeSchema) {
          try {
            const schema = JSON.parse(routeSchema.textContent || '{}')
            const entities = schema['@graph'] || [schema]
            if (!entities.some((entity: { url?: string }) => entity.url === canonical)) routeSchema.remove()
          } catch {
            routeSchema.remove()
          }
        }
        setMeta('meta[name="robots"]', 'content', robots)
        return
      }

      document.title = title
      setMeta('meta[name="description"]', 'content', description)
      setMeta('meta[name="robots"]', 'content', robots)
      setMeta('meta[property="og:title"]', 'content', title)
      setMeta('meta[property="og:description"]', 'content', description)
      setMeta('meta[name="twitter:title"]', 'content', title)
      setMeta('meta[name="twitter:description"]', 'content', description)

      const studyMaterialSchema = pageMeta ? studyMaterial?.studyMaterialStructuredDataForPath(location.pathname) : null
      if (!unknown && (studyMaterialSchema || (route && route.match === 'exact' && route.path !== '/'))) {
        const script = routeSchema || document.createElement('script')
        script.id = 'cssv-route-structured-data'
        script.type = 'application/ld+json'
        script.text = JSON.stringify(studyMaterialSchema || {
          '@context': 'https://schema.org',
          '@type': route?.schemaType,
          name: route?.h1,
          description: route?.description,
          url: canonical,
          isPartOf: { '@type': 'WebSite', name: 'CSS Vista', url: `${CANONICAL_ORIGIN}/` },
        })
        if (!routeSchema) document.head.appendChild(script)
      } else {
        routeSchema?.remove()
      }
    }

    if (!studyMaterialPattern) {
      applyMetadata()
      return
    }

    // Keep the accurate prerendered head while the shared subject/topic data
    // loads. Non-study routes never need these two content indexes. Cleanup
    // prevents a slow import from changing a later route's head or recovering
    // a failed chunk after the visitor has already left the study page.
    let active = true
    void import('@/data/studyMaterialMeta.mjs').then((studyMaterial) => {
      if (active) applyMetadata(studyMaterial)
    }).catch((error: unknown) => {
      if (active && !recoverFromDynamicImport(error)) {
        console.error('Unable to load study-material metadata.', error)
      }
    })
    return () => { active = false }
  }, [location.pathname, location.search])

  return null
}
