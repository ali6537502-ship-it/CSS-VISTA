export type RouteMatch = 'exact' | 'prefix' | 'pattern'
export type AdMode = 'none' | 'content'
export interface RouteDefinition {
  path: string
  match: RouteMatch
  title: string
  description: string
  h1: string
  intro: string
  robots: string
  indexable: boolean
  schemaType: string
  adMode: AdMode
  placementType: 'pre-footer' | 'article-break' | 'category-break' | 'publication-break'
  minimumHeight: number
}
export const CANONICAL_ORIGIN: string
export const ROUTE_REGISTRY: readonly RouteDefinition[]
export const INDEXABLE_STATIC_ROUTES: readonly RouteDefinition[]
export function normalizeRoutePath(pathname: string): string
export function findRouteDefinition(pathname: string): RouteDefinition | null
export function canonicalForPath(pathname: string): string
