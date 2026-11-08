import { safeStudyReturn } from './navigation.ts'
export const studyStages = ['Learn', 'Write', 'Feedback', 'Review'] as const
export function studyMinutes(value: string | null | undefined) { return value === '15' ? 15 : value === '60' ? 60 : 30 }
export function studyLink(destination: string, course: string, minutes: number, stage: number) {
  const url = new URL(safeStudyReturn(destination), 'https://www.css-vista.com')
  url.searchParams.set('studyCourse', course)
  url.searchParams.set('studyMinutes', String(studyMinutes(String(minutes)))); url.searchParams.set('studyStage', String(Math.max(0, Math.min(3, stage))))
  return url.pathname + url.search + url.hash
}
export function stageMinutes(minutes: number) {
  const learn = Math.round(minutes * .35), write = Math.round(minutes * .35), feedback = Math.round(minutes * .15)
  return [learn, write, feedback, minutes - learn - write - feedback]
}
/** Keep the actual native lesson location, without copying response text or search queries. */
export function studyLesson(current: string, canonical: string, course: string): string | undefined {
  const safe = safeStudyReturn(current, '')
  if (!safe || safe.length > 2048) return
  const url = new URL(safe, 'https://www.css-vista.com'), base = new URL(safeStudyReturn(canonical), 'https://www.css-vista.com')
  if (url.pathname !== base.pathname) return
  if (url.pathname === '/account/preparation' && (url.searchParams.get('topic') !== course || url.searchParams.get('view') !== 'topics')) return
  if (course === 'grammar-v5' && url.searchParams.get('view') === 'legacy') return
  const allowed = new Set(['day','section','concept','view','edition','attempt','topic','topicSection','topicMode','topicHistory','workspace','version','unit','lesson'])
  for (const key of [...url.searchParams.keys()]) if (!allowed.has(key)) url.searchParams.delete(key)
  return url.pathname + url.search + url.hash
}
