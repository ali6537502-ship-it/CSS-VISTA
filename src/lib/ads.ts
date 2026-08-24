export const ADSENSE_PUBLISHER_ID = 'ca-pub-6131271603014611'
export const AD_ACTIVE_TIME_MS = 60_000
export const AD_COOLDOWN_MS = 5 * 60_000
export const AD_ACTIVE_PRESENCE_WINDOW_MS = 90_000

type RouteMatch = 'exact' | 'prefix' | 'pattern'

export interface AdRouteRule {
  pattern: string
  match: RouteMatch
  reason: string
}

export interface EligibleAdRouteRule extends AdRouteRule {
  placementType: 'category-break' | 'article-break' | 'publication-break' | 'pre-footer'
  minimumHeight: number
}

/**
 * Central, fail-closed denylist. A route listed here can never render a
 * site-managed ad, start an ad timer, request an impression, or reserve space.
 */
export const AD_ROUTE_DENYLIST: readonly AdRouteRule[] = [
  { pattern: '/', match: 'exact', reason: 'Homepage' },
  { pattern: '/mpt', match: 'prefix', reason: 'MPT landing, practice, questions, mocks, and results' },
  { pattern: '/gk', match: 'exact', reason: 'GK/PMS mock landing' },
  { pattern: '/gk/quiz', match: 'prefix', reason: 'GK/PMS active questions, mocks, and results' },
  { pattern: '/five-minute', match: 'prefix', reason: 'Timed examination' },
  { pattern: '/test-series', match: 'prefix', reason: 'Mock and test-series workflow' },
  { pattern: '/css-mcqs', match: 'prefix', reason: 'Active MCQ practice can occur on this route' },
  { pattern: '/daily-challenge', match: 'prefix', reason: 'Active question-solving screen' },
  { pattern: '/grammar-vocabulary', match: 'prefix', reason: 'Active question-solving screen' },
  { pattern: '/answer-writing', match: 'prefix', reason: 'Active answer-writing practice' },
  { pattern: '/answer-evaluation', match: 'prefix', reason: 'Private answer-evaluation workflow' },
  { pattern: '/answer-timer', match: 'prefix', reason: 'Timed examination tool' },
  { pattern: '/essay', match: 'prefix', reason: 'Interactive answer-practice workflow' },
  { pattern: '/past-papers/view', match: 'prefix', reason: 'Full-paper view' },
  { pattern: '/study-tools', match: 'prefix', reason: 'Interactive study tools' },
  { pattern: '/subjects/selector', match: 'prefix', reason: 'Interactive subject-selection tool' },
  { pattern: '/games', match: 'prefix', reason: 'Interactive game' },
  { pattern: '/mistakes', match: 'prefix', reason: 'Private study data' },
  { pattern: '/checklists', match: 'prefix', reason: 'Interactive/private checklist' },
  { pattern: '/dashboard', match: 'prefix', reason: 'Private study dashboard' },
  { pattern: '/study-planner', match: 'prefix', reason: 'Private study dashboard' },
  { pattern: '/account', match: 'prefix', reason: 'Login, registration, and account settings' },
  { pattern: '/admin', match: 'prefix', reason: 'Private administration' },
  { pattern: '/books', match: 'prefix', reason: 'Purchase and inquiry controls' },
  { pattern: '/mentors', match: 'prefix', reason: 'Contact and inquiry controls' },
  { pattern: '/privacy', match: 'prefix', reason: 'Privacy and legal page' },
  { pattern: '/terms', match: 'prefix', reason: 'Privacy and legal page' },
  { pattern: '/legal', match: 'prefix', reason: 'Privacy and legal page' },
  { pattern: '/cookies', match: 'prefix', reason: 'Privacy and legal page' },
  { pattern: '/live-theme-demos', match: 'prefix', reason: 'Development/preview route' },
  { pattern: '/404', match: 'prefix', reason: 'Error page' },
]

/**
 * Explicit informational-route allowlist. Anything not listed is treated as
 * empty, loading, error, insufficient-content, or otherwise ineligible.
 */
export const AD_ELIGIBLE_ROUTES: readonly EligibleAdRouteRule[] = [
  { pattern: '/start-css', match: 'exact', reason: 'CSS informational guide', placementType: 'article-break', minimumHeight: 250 },
  { pattern: '/subjects/compulsory', match: 'exact', reason: 'Subject category page', placementType: 'category-break', minimumHeight: 250 },
  { pattern: '/subjects/compulsory/:slug', match: 'pattern', reason: 'Subject information page', placementType: 'article-break', minimumHeight: 250 },
  { pattern: '/subjects/optional', match: 'exact', reason: 'Subject category page', placementType: 'category-break', minimumHeight: 250 },
  { pattern: '/notes', match: 'exact', reason: 'Notes category page', placementType: 'category-break', minimumHeight: 250 },
  { pattern: '/past-papers', match: 'exact', reason: 'Past-paper index', placementType: 'category-break', minimumHeight: 250 },
  { pattern: '/past-papers/:exam/:year', match: 'pattern', reason: 'Past-paper year index', placementType: 'category-break', minimumHeight: 250 },
  { pattern: '/current-affairs', match: 'exact', reason: 'Current-affairs informational content', placementType: 'article-break', minimumHeight: 250 },
  { pattern: '/psych-viva', match: 'exact', reason: 'Psychological assessment guidance', placementType: 'article-break', minimumHeight: 250 },
  { pattern: '/fpsc-updates', match: 'exact', reason: 'FPSC informational updates', placementType: 'article-break', minimumHeight: 250 },
  { pattern: '/services', match: 'exact', reason: 'Occupational-group information', placementType: 'article-break', minimumHeight: 250 },
  { pattern: '/analysis', match: 'exact', reason: 'Long-form analysis', placementType: 'article-break', minimumHeight: 280 },
  { pattern: '/one-liner-gk', match: 'exact', reason: 'GK reference content', placementType: 'article-break', minimumHeight: 250 },
  { pattern: '/language-grammar', match: 'exact', reason: 'Language reference content', placementType: 'category-break', minimumHeight: 250 },
  { pattern: '/book-summaries', match: 'exact', reason: 'Book-summary content', placementType: 'article-break', minimumHeight: 250 },
  { pattern: '/lectures', match: 'exact', reason: 'Lecture information page', placementType: 'pre-footer', minimumHeight: 250 },
  { pattern: '/handwritten-notes', match: 'exact', reason: 'Notes and samples page', placementType: 'pre-footer', minimumHeight: 250 },
  { pattern: '/fpsc-syllabus', match: 'exact', reason: 'FPSC syllabus reference', placementType: 'pre-footer', minimumHeight: 250 },
  { pattern: '/css-past-paper-analysis', match: 'exact', reason: 'Past-paper analysis', placementType: 'article-break', minimumHeight: 280 },
  { pattern: '/gk/cat/:slug', match: 'pattern', reason: 'GK category selection page', placementType: 'category-break', minimumHeight: 250 },
  { pattern: '/opinions', match: 'exact', reason: 'Long-form opinion content', placementType: 'article-break', minimumHeight: 250 },
]

export interface AdRoutePolicy {
  eligible: boolean
  reason: string
  placementType: EligibleAdRouteRule['placementType']
  minimumHeight: number
}

function normalizePathname(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] || '/'
  if (path === '/') return path
  return path.replace(/\/+$/, '') || '/'
}

function matchesRule(pathname: string, rule: AdRouteRule) {
  if (rule.match === 'exact') return pathname === rule.pattern
  if (rule.match === 'prefix') return pathname === rule.pattern || pathname.startsWith(`${rule.pattern}/`)

  const pathSegments = pathname.split('/').filter(Boolean)
  const patternSegments = rule.pattern.split('/').filter(Boolean)
  return pathSegments.length === patternSegments.length && patternSegments.every((segment, index) => (
    segment.startsWith(':') || segment === pathSegments[index]
  ))
}

export function getAdRoutePolicy(pathname: string, search = ''): AdRoutePolicy {
  const normalizedPath = normalizePathname(pathname)
  const denied = AD_ROUTE_DENYLIST.find((rule) => matchesRule(normalizedPath, rule))
  if (denied) {
    return { eligible: false, reason: denied.reason, placementType: 'pre-footer', minimumHeight: 0 }
  }

  if (normalizedPath === '/current-affairs') {
    const tab = new URLSearchParams(search).get('tab')
    if (tab === 'mcqs') {
      return { eligible: false, reason: 'Active current-affairs MCQ practice', placementType: 'pre-footer', minimumHeight: 0 }
    }
  }

  const eligible = AD_ELIGIBLE_ROUTES.find((rule) => matchesRule(normalizedPath, rule))
  if (!eligible) {
    return {
      eligible: false,
      reason: 'Unlisted, error, loading, empty, or insufficient-content route',
      placementType: 'pre-footer',
      minimumHeight: 0,
    }
  }

  return {
    eligible: true,
    reason: eligible.reason,
    placementType: eligible.placementType,
    minimumHeight: eligible.minimumHeight,
  }
}

export function isAdFreePath(pathname: string, search = '') {
  return !getAdRoutePolicy(pathname, search).eligible
}

export function adContentIdentity(pathname: string) {
  // Query, filter, pagination, tab, modal, and hash changes never create a new
  // eligible-page count. Genuine dynamic content uses its own pathname.
  return normalizePathname(pathname)
}

export interface AdSessionState {
  version: 1
  eligiblePageCount: number
  visitedEligiblePaths: string[]
  handledEntryKeys: string[]
  cooldownUntil: number
  recentOpportunityKeys: string[]
  lastRouteEvent: { path: string; entryKey: string; at: number } | null
}

export function createAdSessionState(): AdSessionState {
  return {
    version: 1,
    eligiblePageCount: 0,
    visitedEligiblePaths: [],
    handledEntryKeys: [],
    cooldownUntil: 0,
    recentOpportunityKeys: [],
    lastRouteEvent: null,
  }
}

function keepRecent(values: string[], limit = 40) {
  return values.slice(Math.max(0, values.length - limit))
}

export function registerEligiblePageVisit(
  state: AdSessionState,
  input: { eligible: boolean; path: string; entryKey: string; at: number },
) {
  if (!input.eligible) return { state, counted: false, thirdPageDue: false }

  const path = adContentIdentity(input.path)
  const alreadyVisited = state.visitedEligiblePaths.includes(path)
  const rapidDuplicate = state.lastRouteEvent?.path === path
    && state.lastRouteEvent.entryKey === input.entryKey
    && input.at - state.lastRouteEvent.at < 1_500

  if (alreadyVisited || rapidDuplicate) {
    return { state, counted: false, thirdPageDue: false }
  }

  const eligiblePageCount = state.eligiblePageCount + 1
  const nextState: AdSessionState = {
    ...state,
    eligiblePageCount,
    visitedEligiblePaths: keepRecent([...state.visitedEligiblePaths, path], 80),
    lastRouteEvent: { path, entryKey: input.entryKey, at: input.at },
  }

  return {
    state: nextState,
    counted: true,
    thirdPageDue: eligiblePageCount % 3 === 0,
  }
}

export type AdOpportunityTrigger = 'delayed' | 'third-page' | 'combined'

export function claimAdOpportunity(
  state: AdSessionState,
  input: { entryKey: string; at: number; trigger: AdOpportunityTrigger },
) {
  if (state.handledEntryKeys.includes(input.entryKey)) {
    return { state, claimed: false, pendingCooldown: false, opportunityKey: '' }
  }
  if (state.cooldownUntil > input.at) {
    return { state, claimed: false, pendingCooldown: true, opportunityKey: '' }
  }

  const opportunityKey = `${input.entryKey}:${state.eligiblePageCount}:${input.trigger}`
  const nextState: AdSessionState = {
    ...state,
    handledEntryKeys: keepRecent([...state.handledEntryKeys, input.entryKey]),
    cooldownUntil: input.at + AD_COOLDOWN_MS,
    recentOpportunityKeys: keepRecent([...state.recentOpportunityKeys, opportunityKey], 20),
  }

  return { state: nextState, claimed: true, pendingCooldown: false, opportunityKey }
}

export function advanceActiveTime(elapsedMs: number, deltaMs: number, active: boolean) {
  if (!active || deltaMs <= 0) return elapsedMs
  // Clamping prevents a sleeping/background browser from adding a large jump.
  return elapsedMs + Math.min(deltaMs, 2_000)
}
