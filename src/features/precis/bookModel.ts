import type { Chapter } from './api'
export type PrecisView = 'book' | 'write' | 'history'
export function precisView(params: URLSearchParams): PrecisView {
  if (params.get('view') === 'write' || params.get('view') === 'timed') return 'write'
  if (params.has('writing') || params.get('view') === 'history') return 'history'
  return 'book'
}
export function bookChapter(chapters: Chapter[], requested: string | null, saved?: number) {
  return chapters.find(chapter => chapter.id === requested) ||
    chapters.find(chapter => chapter.id === String(saved)) || chapters[0]
}
export function precisHref(params: URLSearchParams, view: PrecisView, fields: Record<string, string> = {}) {
  const next = new URLSearchParams(params)
  for (const key of ['view','writing','version','passage','day','guide_path','guide_step','unit_step','offset']) next.delete(key)
  next.set('view', view)
  for (const [key,value] of Object.entries(fields)) {
    if (value) next.set(key,value)
    else next.delete(key)
  }
  return `/account/precis?${next}`
}
