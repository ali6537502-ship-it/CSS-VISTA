const adFreePrefixes = [
  '/gk/quiz',
  '/five-minute',
  '/mpt',
  '/test-series',
  '/answer-writing',
  '/answer-evaluation',
  '/answer-timer',
  '/games',
]

export function isAdFreePath(pathname: string) {
  return adFreePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
