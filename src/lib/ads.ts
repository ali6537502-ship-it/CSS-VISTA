import { findRouteDefinition, normalizeRoutePath } from '../data/routeRegistry.mjs'

export const ADSENSE_PUBLISHER_ID = 'ca-pub-6131271603014611'
export const ADSENSE_SIGNED_IN_ACCOUNT_SLOT_ID = '1618565899'

export interface AdRoutePolicy {
  autoAdsEnabled: boolean
  manualAdsEnabled: boolean
  reason: string
  placementType: 'category-break' | 'article-break' | 'publication-break' | 'pre-footer'
  minimumHeight: number
}

export interface AuthenticatedAccountAdState {
  authenticated: boolean
  authLoading?: boolean
  passwordRecovery?: boolean
  sensitiveControlsVisible?: boolean
  contentLoading?: boolean
  contentError?: boolean
}

/**
 * Advertising is fail-closed: only a substantial route explicitly marked as
 * content in the shared route registry may load Auto ads or render a manual
 * slot. Account and dashboard routes stay excluded from Auto ads; a separate
 * authenticated-only predicate controls their deliberately placed manual
 * opportunity. Google, not application timers, controls vignette frequency.
 */
export function getAdRoutePolicy(pathname: string, search = ''): AdRoutePolicy {
  const route = findRouteDefinition(pathname)
  if (!route) {
    return {
      autoAdsEnabled: false,
      manualAdsEnabled: false,
      reason: 'Unknown or insufficient-content route',
      placementType: 'pre-footer',
      minimumHeight: 0,
    }
  }

  if (normalizeRoutePath(pathname) === '/current-affairs') {
    const tab = new URLSearchParams(search).get('tab')
    if (tab === 'mcqs') {
      return {
        autoAdsEnabled: false,
        manualAdsEnabled: false,
        reason: 'Active current-affairs question practice',
        placementType: 'pre-footer',
        minimumHeight: 0,
      }
    }
  }

  const autoEligible = route.adMode === 'content'
  const manualEligible = autoEligible && route.manualAdPlacement === true
  return {
    autoAdsEnabled: autoEligible,
    manualAdsEnabled: manualEligible,
    reason: autoEligible
      ? (manualEligible ? 'Substantial public content with an audited manual placement' : 'Substantial public content; Auto Ads only')
      : 'Protected route',
    placementType: route.placementType,
    minimumHeight: manualEligible ? route.minimumHeight : 0,
  }
}

/**
 * Account advertising is manual-placement only. It must never become eligible
 * while authentication, registration, recovery or destructive account
 * controls are being shown. Keeping this separate from the route registry also
 * prevents server-rendered/private URLs from becoming generally ad eligible.
 */
export function canShowAuthenticatedAccountAd(
  pathname: string,
  search: string,
  state: AuthenticatedAccountAdState,
) {
  const route = findRouteDefinition(pathname)
  if (!route?.accountAdPlacement) return false

  const resetRequested = new URLSearchParams(search).get('reset') === '1'
  return state.authenticated
    && !state.authLoading
    && !state.passwordRecovery
    && !state.sensitiveControlsVisible
    && !state.contentLoading
    && !state.contentError
    && !resetRequested
}

export function isAdFreePath(pathname: string, search = '') {
  const policy = getAdRoutePolicy(pathname, search)
  return !policy.autoAdsEnabled && !policy.manualAdsEnabled
}

export function shouldProtectVignetteLink(input: {
  currentPath: string
  currentSearch?: string
  destinationPath?: string
  destinationSearch?: string
  external?: boolean
  download?: boolean
  navigationControl?: boolean
}) {
  const currentPolicy = getAdRoutePolicy(input.currentPath, input.currentSearch)
  return Boolean(
    input.download
    || input.external
    || input.navigationControl
    || !currentPolicy.autoAdsEnabled
    || (input.destinationPath && isAdFreePath(input.destinationPath, input.destinationSearch)),
  )
}
