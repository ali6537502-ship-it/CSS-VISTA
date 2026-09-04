const RESULT_ANNOUNCEMENT_ENABLED = false

const RESULT_ANNOUNCEMENT_HIDDEN_ROUTES = [
  '/css-2026-written-result',
  '/mpt',
  '/gk/quiz',
  '/five-minute',
  '/test-series',
  '/css-mcqs',
  '/daily-challenge',
  '/grammar-vocabulary',
  '/answer-writing',
  '/answer-evaluation',
  '/answer-timer',
  '/essay',
  '/past-papers/view',
  '/notes/view',
  '/games',
  '/mistakes',
  '/dashboard',
  '/exam-intelligence',
  '/factbook',
  '/study-planner',
  '/account',
  '/admin',
] as const

function normalizePathname(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] || '/'
  return path === '/' ? path : path.replace(/\/+$/, '') || '/'
}

export function shouldShowCss2026ResultAnnouncement(pathname: string) {
  const normalized = normalizePathname(pathname)
  return RESULT_ANNOUNCEMENT_ENABLED && !RESULT_ANNOUNCEMENT_HIDDEN_ROUTES.some((route) => (
    normalized === route || normalized.startsWith(`${route}/`)
  ))
}
