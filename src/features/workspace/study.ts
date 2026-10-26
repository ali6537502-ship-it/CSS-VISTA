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
