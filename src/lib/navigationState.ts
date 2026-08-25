export type NavigationKind = 'POP' | 'PUSH' | 'REPLACE'

export type ScrollIntent = 'restore' | 'hash' | 'top' | 'preserve'

export interface RouteScrollEntry {
  key: string
  position: number
  updatedAt: number
}

export const MAX_ROUTE_SCROLL_ENTRIES = 64

function safePosition(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : null
}

export function parseRouteScrollState(raw: string | null, limit = MAX_ROUTE_SCROLL_ENTRIES): RouteScrollEntry[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const entries = parsed.flatMap((candidate): RouteScrollEntry[] => {
      if (!candidate || typeof candidate !== 'object') return []
      const entry = candidate as Partial<RouteScrollEntry>
      const position = safePosition(entry.position)
      if (typeof entry.key !== 'string' || !entry.key || position === null) return []
      return [{
        key: entry.key,
        position,
        updatedAt: typeof entry.updatedAt === 'number' && Number.isFinite(entry.updatedAt) ? entry.updatedAt : 0,
      }]
    })
    return entries
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .filter((entry, index, all) => all.findIndex((candidate) => candidate.key === entry.key) === index)
      .slice(0, Math.max(1, limit))
  } catch {
    return []
  }
}

export function updateRouteScrollState(
  state: RouteScrollEntry[],
  key: string,
  position: number,
  updatedAt = Date.now(),
  limit = MAX_ROUTE_SCROLL_ENTRIES,
) {
  const nextPosition = safePosition(position)
  if (!key || nextPosition === null) return state
  return [
    { key, position: nextPosition, updatedAt },
    ...state.filter((entry) => entry.key !== key),
  ].slice(0, Math.max(1, limit))
}

export function getRouteScrollPosition(state: RouteScrollEntry[], key: string) {
  return state.find((entry) => entry.key === key)?.position
}

export function resolveScrollIntent({
  navigationType,
  previousPathname,
  pathname,
  previousHash,
  hash,
  hasSavedPosition,
}: {
  navigationType: NavigationKind
  previousPathname: string
  pathname: string
  previousHash: string
  hash: string
  hasSavedPosition: boolean
}): ScrollIntent {
  if (navigationType === 'POP') return hasSavedPosition ? 'restore' : 'preserve'
  if (hash && hash !== previousHash) return 'hash'
  if (pathname === previousPathname) return 'preserve'
  return 'top'
}
