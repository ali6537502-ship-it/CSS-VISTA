/**
 * Tick tracking for the CSS Study Material section.
 *
 * Deliberately separate from `progress.ts`: that record is synced to a signed-in
 * student's account, while study-material ticks stay in this browser only. The
 * key is namespaced per item so the same store serves essay-theme checkpoints
 * today and optional-subject topics later without a migration.
 *
 * Every read and write tolerates storage being unavailable (private browsing,
 * blocked site data, exhausted quota). A student whose browser refuses storage
 * still gets a fully usable page; they simply start each visit unticked.
 */

const KEY = 'cssvista:study-material:v1'
const CHANGE_EVENT = 'cssvista:study-material-changed'

export interface StudyMaterialProgress {
  /** Tick id -> the moment it was ticked. */
  ticks: Record<string, number>
}

const empty: StudyMaterialProgress = { ticks: {} }

/** The id a single checkpoint is stored under. */
export function tickId(area: string, group: string, item: string): string {
  return `${area}:${group}:${item}`
}

function read(): StudyMaterialProgress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ticks: {} }
    const parsed = JSON.parse(raw) as Partial<StudyMaterialProgress>
    const ticks = parsed?.ticks
    if (!ticks || typeof ticks !== 'object') return { ticks: {} }
    // Drop anything that is not a timestamp, so one corrupt entry cannot make
    // the whole record unreadable.
    const clean: Record<string, number> = {}
    for (const [id, ts] of Object.entries(ticks)) {
      if (typeof ts === 'number' && Number.isFinite(ts)) clean[id] = ts
    }
    return { ticks: clean }
  } catch {
    return { ...empty, ticks: {} }
  }
}

function write(state: StudyMaterialProgress): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    notifyChanged()
    return true
  } catch {
    return false
  }
}

function notifyChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

/** Subscribe to tick changes made anywhere in the page. Returns an unsubscribe. */
export function onStudyProgressChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGE_EVENT, listener)
  return () => window.removeEventListener(CHANGE_EVENT, listener)
}

export function getStudyProgress(): StudyMaterialProgress {
  return read()
}

export function isTicked(id: string): boolean {
  return Boolean(read().ticks[id])
}

/** All ticked ids, for a component testing many rows at once. */
export function tickedIds(): Set<string> {
  return new Set(Object.keys(read().ticks))
}

/** Returns the new ticked state. */
export function toggleTick(id: string): boolean {
  const state = read()
  const ticked = !state.ticks[id]
  if (ticked) state.ticks[id] = Date.now()
  else delete state.ticks[id]
  write(state)
  return ticked
}

/** Tick or untick a whole set at once - one write instead of N. */
export function setTicks(ids: string[], ticked: boolean) {
  const state = read()
  const now = Date.now()
  for (const id of ids) {
    if (ticked) state.ticks[id] = state.ticks[id] ?? now
    else delete state.ticks[id]
  }
  write(state)
}

/** How many of `ids` are ticked, and the percentage that represents. */
export function tickSummary(ids: string[]): { done: number; total: number; percent: number } {
  const ticks = read().ticks
  const done = ids.reduce((count, id) => count + (ticks[id] ? 1 : 0), 0)
  const total = ids.length
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}

/**
 * How many ticks sit under `prefix` (e.g. `essay-theme:climate-change:`).
 *
 * Lets a list page show per-item progress from the id namespace alone, without
 * loading the full content file just to learn which ids exist.
 */
export function countUnderPrefix(prefix: string): number {
  let count = 0
  for (const id of Object.keys(read().ticks)) {
    if (id.startsWith(prefix)) count += 1
  }
  return count
}

/** Counts for many prefixes in one storage read. */
export function countsUnderPrefixes(prefixes: string[]): Record<string, number> {
  const ids = Object.keys(read().ticks)
  const counts: Record<string, number> = {}
  for (const prefix of prefixes) counts[prefix] = 0
  for (const id of ids) {
    for (const prefix of prefixes) {
      if (id.startsWith(prefix)) { counts[prefix] += 1; break }
    }
  }
  return counts
}

/** Remove ticks under `prefix` whose id is no longer in `validIds`. */
export function pruneStaleTicks(prefix: string, validIds: Set<string>) {
  const state = read()
  let changed = false
  for (const id of Object.keys(state.ticks)) {
    if (id.startsWith(prefix) && !validIds.has(id)) { delete state.ticks[id]; changed = true }
  }
  if (changed) write(state)
}

/** Whether this browser will actually keep ticks between visits. */
export function storageAvailable(): boolean {
  try {
    const probe = `${KEY}:probe`
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}
