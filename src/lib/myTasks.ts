import type { StudyScheduleTask } from '@/lib/store'
import { notifyProgressChanged } from '@/lib/progressEvents'

export const MY_TASKS_ARCHIVE_KEY = 'cssvista:tool:my-tasks-archive:v1'
export const CSSV_SCHEDULE_START = 'CSSV_SCHEDULE_V1'
export const CSSV_SCHEDULE_END = 'END_CSSV_SCHEDULE'

export type TaskArchiveEntry = { archivedAt?: string; restoredAt?: string }
export type TaskArchiveState = Record<string, TaskArchiveEntry>

export interface AiScheduleTask {
  date: string
  subject: string
  topic: string
  activity: string
  minutes: number
  time?: string
  priority: 'high' | 'medium' | 'low'
}

export interface ParsedAiSchedule {
  title: string
  tasks: AiScheduleTask[]
  dayCount: number
}

export const AI_SCHEDULE_PROMPT = `You are creating a study schedule that I will import into My CSS Vista.

First, use the information I give you about my routine, subjects/syllabus, priorities, weak areas, available study hours, fixed commitments, preferred study times, rest/light days, start date, end date and desired number of daily tasks. If a critical detail is missing, ask me for it before making the final schedule.

Rules:
1. Make the workload realistic for the daily time I have available.
2. Give more time to weak and high-priority subjects.
3. Include revision and practice at sensible intervals.
4. Leave realistic recovery/light time where needed.
5. Do not invent detailed syllabus topics that I did not provide. If I only provide a broad subject, keep the task broad.
6. Use exact calendar dates in YYYY-MM-DD format.
7. Each task must be at least 5 minutes and no more than 600 minutes.
8. Use 24-hour HH:MM time only when I have given or requested study times. Otherwise omit time.
9. Priority must be exactly high, medium or low.
10. At the very end of your answer, output one machine-readable CSS Vista block. Do not use Markdown code fences around that block.

The block must start on its own line exactly with:
${CSSV_SCHEDULE_START}

Then output valid JSON in exactly this general structure:
{
  "title": "My Study Schedule",
  "timezone": "Asia/Karachi",
  "days": [
    {
      "date": "2026-09-15",
      "tasks": [
        {
          "subject": "Political Science",
          "topic": "Revise sovereignty",
          "activity": "Study",
          "minutes": 60,
          "time": "08:00",
          "priority": "high"
        }
      ]
    }
  ]
}

The block must end on its own line exactly with:
${CSSV_SCHEDULE_END}

Inside the JSON do not add comments, explanations, trailing commas or Markdown. Every task must contain subject, topic, activity, minutes and priority. The time field is optional. Put explanations, if any, before the CSS Vista block, never inside it.

I will now tell you my routine, priorities, syllabus and requirements.`

export function localTaskDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function validDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  return localTaskDateKey(new Date(year, month - 1, day, 12)) === value
}

export function readTaskArchiveState(): TaskArchiveState {
  try {
    const parsed = JSON.parse(localStorage.getItem(MY_TASKS_ARCHIVE_KEY) || '{}') as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as TaskArchiveState : {}
  } catch {
    return {}
  }
}

function archiveTime(entry?: TaskArchiveEntry) {
  return entry?.archivedAt ? Date.parse(entry.archivedAt) || 0 : 0
}

function restoreTime(entry?: TaskArchiveEntry) {
  return entry?.restoredAt ? Date.parse(entry.restoredAt) || 0 : 0
}

export function isTaskArchived(id: string, state = readTaskArchiveState()) {
  const entry = state[id]
  return archiveTime(entry) > restoreTime(entry)
}

export function saveTaskArchiveState(state: TaskArchiveState) {
  try {
    localStorage.setItem(MY_TASKS_ARCHIVE_KEY, JSON.stringify(state))
    notifyProgressChanged()
    return true
  } catch {
    return false
  }
}

export function archiveTaskState(id: string, state = readTaskArchiveState()) {
  const next: TaskArchiveState = {
    ...state,
    [id]: { ...state[id], archivedAt: new Date().toISOString() },
  }
  saveTaskArchiveState(next)
  return next
}

export function restoreTaskState(id: string, state = readTaskArchiveState()) {
  const next: TaskArchiveState = {
    ...state,
    [id]: { ...state[id], restoredAt: new Date().toISOString() },
  }
  saveTaskArchiveState(next)
  return next
}

export function activeStudyTasks(tasks: StudyScheduleTask[], archive = readTaskArchiveState()) {
  return tasks.filter((task) => !isTaskArchived(task.id, archive))
}

export function dueStudyTasks(tasks: StudyScheduleTask[], today = localTaskDateKey()) {
  const active = activeStudyTasks(tasks)
  return {
    today: active
      .filter((task) => task.date === today)
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    overdue: active
      .filter((task) => task.status !== 'completed' && task.date < today)
      .sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`)),
    upcoming: active
      .filter((task) => task.status !== 'completed' && task.date > today)
      .sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`)),
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function cleanString(value: unknown, field: string, max: number, required = true) {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${field} is missing.`)
    return ''
  }
  if (typeof value !== 'string') throw new Error(`${field} must be text.`)
  const result = value.trim()
  if (required && !result) throw new Error(`${field} cannot be empty.`)
  if (result.length > max) throw new Error(`${field} is too long.`)
  return result
}

export function parseCssVistaSchedule(input: string): ParsedAiSchedule {
  const start = input.indexOf(CSSV_SCHEDULE_START)
  const end = input.indexOf(CSSV_SCHEDULE_END, start + CSSV_SCHEDULE_START.length)
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Paste the complete ${CSSV_SCHEDULE_START} … ${CSSV_SCHEDULE_END} block from your AI.`)
  }

  const jsonText = input.slice(start + CSSV_SCHEDULE_START.length, end).trim()
  if (!jsonText || jsonText.length > 1_500_000) throw new Error('The imported schedule is empty or too large.')

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('The AI schedule JSON is not valid. Ask the AI to regenerate the CSS Vista block exactly.')
  }

  const root = record(parsed)
  if (!root) throw new Error('The CSS Vista schedule must be a JSON object.')
  const title = cleanString(root.title ?? 'My Study Schedule', 'Schedule title', 160, false) || 'My Study Schedule'
  const days = root.days
  if (!Array.isArray(days) || !days.length) throw new Error('The schedule does not contain any days.')
  if (days.length > 366) throw new Error('A single import can contain at most 366 days.')

  const tasks: AiScheduleTask[] = []
  for (const dayValue of days) {
    const day = record(dayValue)
    if (!day) throw new Error('Each schedule day must be an object.')
    const date = cleanString(day.date, 'Task date', 10)
    if (!validDateKey(date)) throw new Error(`Invalid task date: ${date}. Use YYYY-MM-DD.`)
    if (!Array.isArray(day.tasks)) throw new Error(`Tasks are missing for ${date}.`)

    for (const taskValue of day.tasks) {
      if (tasks.length >= 2000) throw new Error('A single import can contain at most 2,000 tasks.')
      const task = record(taskValue)
      if (!task) throw new Error(`A task on ${date} is not valid.`)
      const subject = cleanString(task.subject, 'Subject', 120)
      const topic = cleanString(task.topic, 'Task/topic', 300)
      const activity = cleanString(task.activity ?? 'Study', 'Activity', 80, false) || 'Study'
      const minutes = Number(task.minutes)
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > 600) throw new Error(`Invalid minutes for "${topic}". Use a whole number from 5 to 600.`)
      const time = cleanString(task.time, 'Time', 5, false)
      if (time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(`Invalid time for "${topic}". Use 24-hour HH:MM.`)
      const priority = cleanString(task.priority, 'Priority', 6).toLowerCase()
      if (!['high', 'medium', 'low'].includes(priority)) throw new Error(`Invalid priority for "${topic}". Use high, medium or low.`)
      tasks.push({ date, subject, topic, activity, minutes, time: time || undefined, priority: priority as AiScheduleTask['priority'] })
    }
  }

  if (!tasks.length) throw new Error('The schedule does not contain any tasks.')
  return { title, tasks, dayCount: new Set(tasks.map((task) => task.date)).size }
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function aiScheduleTaskId(task: AiScheduleTask, index: number) {
  return `ai:${stableHash([task.date, task.time ?? '', task.subject, task.topic, task.activity, task.minutes, task.priority, index].join('|'))}`
}
