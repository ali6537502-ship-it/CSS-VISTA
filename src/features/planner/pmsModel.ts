import type { StudyScheduleTask, SyllabusItemStatus } from '../../lib/store.ts'
import { dayWorkload, shiftDay, validDay } from './model.ts'
export const PMS_SETTINGS_KEY = 'cssvista:tool:pms-planner:v1'
export type ExamTrack = 'css' | 'pms-punjab'
export type PmsTopic = { id: string; title: string; detail: string; section: string; page: number; transcription?: 'visual' }
export type PmsSubject = { id: string; title: string; designation: 'compulsory' | 'optional'; marks: number | null; file: string; sourceUrl: string; sha256: string; topics: PmsTopic[] }
export type PmsCatalogue = { version: string; retrievedOn: string; publisher: string; sourcePages: string[]; subjects: PmsSubject[] }
export type PmsSettings = { version: 1; selectedOptionals: string[]; alternative: 'islamic-studies' | 'ethics'; dailyMinutes: number; sessionMinutes: number; restDays: number[]; targetDate: string }
export const defaultPmsSettings: PmsSettings = { version: 1, selectedOptionals: [], alternative: 'islamic-studies', dailyMinutes: 180, sessionMinutes: 45, restDays: [0], targetDate: '' }
export const encodePmsSettings = (settings: PmsSettings) => JSON.stringify({ version: 1, settings: JSON.stringify(settings) })
export const taskExam = (task: Pick<StudyScheduleTask, 'syllabusItemId'>) : ExamTrack => task.syllabusItemId.startsWith('pms-punjab:') ? 'pms-punjab' : 'css'
export function readPmsSettings(value: unknown): PmsSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return structuredClone(defaultPmsSettings)
  if ('settings' in value && typeof value.settings === 'string') { try { return readPmsSettings(JSON.parse(value.settings)) } catch { return structuredClone(defaultPmsSettings) } }
  const x = value as Partial<PmsSettings>
  return { version: 1, selectedOptionals: Array.isArray(x.selectedOptionals) ? x.selectedOptionals.filter((s): s is string => typeof s === 'string') : [], alternative: x.alternative === 'ethics' ? 'ethics' : 'islamic-studies', dailyMinutes: Number.isInteger(x.dailyMinutes) && x.dailyMinutes! >= 15 && x.dailyMinutes! <= 720 ? x.dailyMinutes! : 180, sessionMinutes: Number.isInteger(x.sessionMinutes) && x.sessionMinutes! >= 5 && x.sessionMinutes! <= 600 ? x.sessionMinutes! : 45, restDays: Array.isArray(x.restDays) ? x.restDays.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 6) : [0], targetDate: typeof x.targetDate === 'string' && validDay(x.targetDate) ? x.targetDate : '' }
}
export function selectedPmsSubjects(subjects: PmsSubject[], settings: PmsSettings) {
  return subjects.filter(s => s.designation === 'compulsory' ? s.id !== (settings.alternative === 'ethics' ? 'compulsory-islamic-studies' : 'compulsory-ethics-for-non-muslim-candidates') : settings.selectedOptionals.includes(s.id))
}
export function pmsCoverage(subject: PmsSubject, statuses: Record<string, SyllabusItemStatus>) {
  const total = subject.topics.length, completed = subject.topics.filter(t => statuses[t.id] === 'completed').length
  return { total, completed, percent: total ? Math.round(completed / total * 100) : null }
}
export type PmsDraftTask = Omit<StudyScheduleTask, 'id' | 'createdAt' | 'status'>
/** One chosen outline item per session; estimates are student choices, not PPSC study-time claims.
 * Existing CSS/PMS tasks consume shared daily capacity, including archived/completed sessions. */
export function distributePmsTopics(subjects: PmsSubject[], selected: Set<string>, settings: PmsSettings, start: string, existing: StudyScheduleTask[], revision = false): PmsDraftTask[] {
  if (!validDay(start) || settings.restDays.length === 7 || !Number.isInteger(settings.sessionMinutes) || settings.sessionMinutes < 5 || settings.sessionMinutes > 600 || !Number.isInteger(settings.dailyMinutes) || settings.dailyMinutes < settings.sessionMinutes || settings.dailyMinutes > 720) throw new Error('Choose a valid start, at least one study day, and a session within your daily availability.')
  if (settings.targetDate && (!validDay(settings.targetDate) || settings.targetDate < start)) throw new Error('Your target must be on or after the schedule start.')
  const queue = subjects.map(s => ({ subject: s, topics: s.topics.filter(t => selected.has(t.id)) }))
  const result: PmsDraftTask[] = [], scheduled = new Set(existing.filter(t => t.status !== 'completed').map(t => t.syllabusItemId))
  let date = start, scans = 0
  while (queue.some(row => row.topics.length)) {
    for (const row of queue) {
      const topic = row.topics.shift(); if (!topic || scheduled.has(topic.id)) continue
      while (settings.restDays.includes(new Date(`${date}T12:00:00`).getDay()) || dayWorkload([...existing, ...result.map((t, i) => ({ ...t, id: `draft-${i}`, status: 'not-started' as const, createdAt: '' }))], date).minutes + settings.sessionMinutes > settings.dailyMinutes) {
        date = shiftDay(date, 1)
        if (++scans > 3660) throw new Error('The selected workload cannot fit within ten years. Reduce the selection or increase your availability.')
      }
      if (settings.targetDate && date > settings.targetDate) throw new Error('These topics do not fit before your chosen target. Reduce the selection or adjust your availability.')
      result.push({ syllabusItemId: topic.id, subject: row.subject.title, paper: 'PMS Punjab', section: topic.section, topic: topic.title, date, minutes: settings.sessionMinutes, ...(revision ? { activity: 'revision' as const } : {}) })
      scheduled.add(topic.id)
    }
  }
  return result
}
/** Device-saved PMS outline checks, all dates; no assessed result is inferred. */
export function pmsSummary(tasks: StudyScheduleTask[], statuses: Record<string, SyllabusItemStatus>) {
  const sessions = tasks.filter(t => taskExam(t) === 'pms-punjab')
  return { sessions: sessions.length, completedSessions: sessions.filter(t => t.status === 'completed').length, completedItems: Object.entries(statuses).filter(([id,status]) => status === 'completed' && /^pms-punjab:2026-10:(compulsory|optional)-[a-z-]+:[a-f0-9]{12}:\d+$/.test(id)).length }
}
