import { safeStudyDestination } from './destinations.ts'
export type StudySession = { schema: 1; owner: string; course: string; minutes: number; stage: number; startedAt: number; lesson?: string; work?: string }
export const studySessionKey = (owner: string) => `cssvista:daily-study:v1:${owner}`
export function readStudySession(raw: string | null, owner: string, now = Date.now()): StudySession | undefined {
  if (!raw || raw.length > 8192) return
  try {
    const value = JSON.parse(raw) as StudySession
    if (!value || Object.keys(value).some(key => !['course','minutes','owner','schema','stage','startedAt','lesson','work'].includes(key)) || value.schema !== 1 || value.owner !== owner || typeof value.course !== 'string' || !/^[a-z0-9][a-z0-9-]{0,95}$/.test(value.course) || ![15,30,60].includes(value.minutes) || !Number.isInteger(value.stage) || value.stage < 0 || value.stage > 3 || !Number.isFinite(value.startedAt) || value.startedAt > now || now - value.startedAt >= 86400000) return
    if (value.lesson !== undefined && (typeof value.lesson !== 'string' || value.lesson.length > 2048 || !safeStudyDestination(value.lesson, ''))) return
    if (value.work !== undefined && (typeof value.work !== 'string' || value.work.length > 2048 || !safeStudyDestination(value.work, ''))) return
    return value
  } catch { return }
}
