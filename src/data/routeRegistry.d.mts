export type RouteMatch = 'exact' | 'prefix' | 'pattern'
/**
 * Advertising eligibility. Deliberately independent of `access` and
 * `indexable`: an authenticated noindex page may be `enabled`, and an
 * indexable legal page may be `disabled`.
 */
export type AdMode = 'enabled' | 'disabled' | 'auto'
export type RouteAccess = 'public' | 'authenticated' | 'admin'
export type ContentQuality =
  | 'substantial'
  | 'legal'
  | 'document'
  | 'interactive'
  | 'utility'
  | 'private'
  | 'incomplete'

export interface RouteDefinition {
  path: string
  match: RouteMatch
  title: string
  description: string
  h1: string
  intro: string
  access: RouteAccess
  contentQuality: ContentQuality
  indexable: boolean
  sitemap: boolean
  robots: string
  schemaType: string
  adMode: AdMode
  manualAdPlacement: boolean
  placementType: 'pre-footer' | 'article-break' | 'category-break' | 'publication-break'
  minimumHeight: number
}

export interface RoutePolicy {
  path: string
  known: boolean
  access: RouteAccess
  contentQuality: ContentQuality
  indexable: boolean
  sitemap: boolean
  adMode: AdMode
  robots: string
  canonical: string | null
}

export interface RouteRedirect {
  from: string
  to: string
  status: number
  reason: string
}

export const CANONICAL_ORIGIN: string
export const CONTENT_QUALITY: readonly ContentQuality[]
export const ROUTE_REGISTRY: readonly RouteDefinition[]
export const ROUTE_REDIRECTS: readonly RouteRedirect[]
export const INDEXABLE_STATIC_ROUTES: readonly RouteDefinition[]
export const FUNCTIONAL_NOINDEX_ROUTES: readonly RouteDefinition[]
export function normalizeRoutePath(pathname: string): string
export function findRouteDefinition(pathname: string): RouteDefinition | null
export function findRedirect(pathname: string): RouteRedirect | null
export function getRoutePolicy(pathname: string): RoutePolicy
export function canonicalForPath(pathname: string): string
