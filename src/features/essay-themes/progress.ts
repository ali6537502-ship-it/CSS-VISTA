/**
 * Tick bookkeeping for the essay-theme roadmap.
 *
 * Ticks live in this browser only (src/lib/studyProgress.ts). Every id is
 * namespaced by theme, so the same checkpoint wording appearing under two
 * themes is tracked separately.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { onStudyProgressChange, setTicks, tickId, tickedIds, toggleTick } from '@/lib/studyProgress'

export const THEME_AREA = 'essay-theme'

export function checkpointKey(themeSlug: string, checkpointId: string): string {
  return tickId(THEME_AREA, themeSlug, checkpointId)
}

/**
 * The set of ticked ids, kept in step with every other component on the page.
 * One storage read per change rather than one per checkpoint.
 */
export function useTickedIds(): {
  ticked: Set<string>
  toggle: (key: string) => void
  setMany: (keys: string[], value: boolean) => void
} {
  const [ticked, setTicked] = useState<Set<string>>(() => new Set<string>())

  useEffect(() => {
    const refresh = () => setTicked(tickedIds())
    refresh()
    return onStudyProgressChange(refresh)
  }, [])

  const toggle = useCallback((key: string) => { toggleTick(key) }, [])
  const setMany = useCallback((keys: string[], value: boolean) => { setTicks(keys, value) }, [])

  return { ticked, toggle, setMany }
}

export interface Completion {
  done: number
  total: number
  percent: number
}

export function completionOf(keys: string[], ticked: Set<string>): Completion {
  const done = keys.reduce((count, key) => count + (ticked.has(key) ? 1 : 0), 0)
  return { done, total: keys.length, percent: keys.length ? Math.round((done / keys.length) * 100) : 0 }
}

/** Completion for a theme whose checkpoint ids are already known. */
export function useThemeCompletion(themeSlug: string, checkpointIds: string[], ticked: Set<string>): Completion {
  return useMemo(
    () => completionOf(checkpointIds.map((id) => checkpointKey(themeSlug, id)), ticked),
    [themeSlug, checkpointIds, ticked],
  )
}

/**
 * Roadmap activity read from the id namespace alone.
 *
 * Deliberately avoids importing the theme index: this runs on the signed-in
 * dashboard, which should not pull the roadmap's bundled catalogue into its
 * chunk just to render one status line.
 */
export function essayThemeActivity(): { themesStarted: number; directionsDone: number } {
  const prefix = `${THEME_AREA}:`
  const slugs = new Set<string>()
  let directionsDone = 0
  for (const id of tickedIds()) {
    if (!id.startsWith(prefix)) continue
    directionsDone += 1
    const slug = id.slice(prefix.length).split(':')[0]
    if (slug) slugs.add(slug)
  }
  return { themesStarted: slugs.size, directionsDone }
}
