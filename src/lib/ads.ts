import { findRouteDefinition, normalizeRoutePath } from '../data/routeRegistry.mjs'
import type { AdMode } from '../data/routeRegistry.mjs'

export const ADSENSE_PUBLISHER_ID = 'ca-pub-6131271603014611'
export const ADSENSE_SIGNED_IN_ACCOUNT_SLOT_ID = '1618565899'

export interface AdRoutePolicy {
  autoAdsEnabled: boolean
  manualAdsEnabled: boolean
  adMode: AdMode
  reason: string
  placementType: 'category-break' | 'article-break' | 'publication-break' | 'pre-footer'
  minimumHeight: number
}

export interface AdPageState {
  /** An authentication, registration, recovery or verification transaction. */
  authTransaction?: boolean
  /** Destructive or credential-bearing controls are on screen. */
  sensitiveControlsVisible?: boolean
  /** An active question, timed test or result screen. */
  activeAssessment?: boolean
  /** A genuine error, not-found or fatal failure screen. */
  errorState?: boolean
  /** The page has nothing rendered yet. */
  loadingState?: boolean
}

export interface AuthenticatedAccountAdState extends AdPageState {
  authenticated: boolean
  authLoading?: boolean
  passwordRecovery?: boolean
}

/**
 * States in which advertising is never appropriate, whatever a route's
 * configured `adMode` says. These are transaction, failure and empty states —
 * not a judgement about authentication or indexability.
 */
export function isAdSuppressedState(state: AdPageState = {}): string | null {
  if (state.errorState) return 'Error or not-found state'
  if (state.loadingState) return 'Page has not rendered content yet'
  if (state.authTransaction) return 'Authentication, registration, recovery or verification transaction'
  if (state.sensitiveControlsVisible) return 'Sensitive account controls are visible'
  if (state.activeAssessment) return 'Active question, timed test or result screen'
  return null
}

/**
 * Advertising eligibility for a route.
 *
 * This reads ONLY the route's `adMode`. It deliberately does not consult
 * `indexable`, `access` or `robots`: an authenticated noindex account page can
 * be ad-eligible, and an indexable legal page can be ad-free. Unknown routes
 * fail closed.
 */
export function getAdRoutePolicy(pathname: string, search = '', state: AdPageState = {}): AdRoutePolicy {
  const route = findRouteDefinition(pathname)
  if (!route) {
    return {
      autoAdsEnabled: false,
      manualAdsEnabled: false,
      adMode: 'disabled',
      reason: 'Unknown route',
      placementType: 'pre-footer',
      minimumHeight: 0,
    }
  }

  const suppressed = isAdSuppressedState(state)
  if (suppressed) {
    return {
      autoAdsEnabled: false,
      manualAdsEnabled: false,
      adMode: route.adMode,
      reason: suppressed,
      placementType: route.placementType,
      minimumHeight: 0,
    }
  }

  // Active current-affairs question practice is an assessment state expressed
  // through the query string rather than a separate route.
  if (normalizeRoutePath(pathname) === '/current-affairs' && new URLSearchParams(search).get('tab') === 'mcqs') {
    return {
      autoAdsEnabled: false,
      manualAdsEnabled: false,
      adMode: route.adMode,
      reason: 'Active current-affairs question practice',
      placementType: route.placementType,
      minimumHeight: 0,
    }
  }

  // 'auto' defers to the content class: a route only opts in implicitly when
  // its primary content is substantial. 'enabled'/'disabled' are explicit.
  const eligible = route.adMode === 'enabled'
    || (route.adMode === 'auto' && route.contentQuality === 'substantial')
  const manualEligible = eligible && route.manualAdPlacement === true

  return {
    autoAdsEnabled: eligible,
    manualAdsEnabled: manualEligible,
    adMode: route.adMode,
    reason: eligible
      ? (manualEligible ? 'Ad-eligible route with an audited manual placement' : 'Ad-eligible route; Auto Ads only')
      : `Advertising is ${route.adMode} for this route`,
    placementType: route.placementType,
    minimumHeight: manualEligible ? route.minimumHeight : 0,
  }
}

/**
 * The live page state for a request, derived from the route and the account
 * session.
 *
 * This is the single place that decides "is this an authentication
 * transaction?", so the provider and the tests cannot drift apart. An
 * authenticated route with nobody signed in is showing its sign-in,
 * registration or recovery form, which is never an ad surface whatever the
 * route's own adMode says.
 */
export function deriveAdPageState(input: {
  pathname: string
  search?: string
  user: unknown
  loading?: boolean
  passwordRecovery?: boolean
}): AdPageState {
  const route = findRouteDefinition(input.pathname)
  return {
    loadingState: Boolean(input.loading),
    authTransaction: (route?.access === 'authenticated' && !input.user)
      || Boolean(input.passwordRecovery)
      || new URLSearchParams(input.search ?? '').get('reset') === '1',
  }
}

/**
 * The deliberately placed signed-in account unit.
 *
 * Eligibility comes from the route's own `adMode`, so any authenticated route
 * the owner marks ad-eligible can carry it — authentication alone never
 * disables advertising. Authentication transactions and sensitive control
 * states still suppress it.
 */
export function canShowAuthenticatedAccountAd(
  pathname: string,
  search: string,
  state: AuthenticatedAccountAdState,
) {
  if (!state.authenticated || state.authLoading || state.passwordRecovery) return false
  if (new URLSearchParams(search).get('reset') === '1') return false

  const route = findRouteDefinition(pathname)
  if (!route || route.access !== 'authenticated') return false

  return getAdRoutePolicy(pathname, search, state).autoAdsEnabled
}

export function isAdFreePath(pathname: string, search = '', state: AdPageState = {}) {
  const policy = getAdRoutePolicy(pathname, search, state)
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
