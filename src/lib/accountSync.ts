import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyProgressChanged } from '@/lib/progressEvents'

export type ProgressSnapshot = Record<string, unknown>

const PRIMARY_PROGRESS_KEYS = new Set([
  'cssvista:v1',
  'cssvista:progress:v1',
])

interface CloudActivityRow {
  user_id: string
  event_key: string
  activity_type: string
  label: string
  path: string | null
  metadata: Record<string, unknown>
  occurred_at: string
}

interface CloudQuizAttemptRow {
  user_id: string
  attempt_key: string
  quiz_type: string
  category: string
  score: number
  total: number
  metadata: Record<string, unknown>
  completed_at: string
}

function isStudentProgressKey(key: string) {
  return PRIMARY_PROGRESS_KEYS.has(key) || key.startsWith('cssvista:tool:')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function itemIdentity(value: unknown): string {
  if (isRecord(value)) {
    if (typeof value.id === 'string') return `id:${value.id}`
    if (typeof value.date === 'string') return `date:${value.date}`
    if (typeof value.path === 'string' && typeof value.type === 'string') {
      return `activity:${value.type}:${value.path}`
    }
  }
  return `value:${JSON.stringify(value)}`
}

function mergeArrays(cloud: unknown[], local: unknown[]) {
  const merged = new Map<string, unknown>()
  cloud.forEach((item) => merged.set(itemIdentity(item), item))
  local.forEach((item) => merged.set(itemIdentity(item), item))
  return [...merged.values()]
}

function mergeValues(cloud: unknown, local: unknown): unknown {
  if (local === undefined) return cloud
  if (cloud === undefined) return local
  if (Array.isArray(cloud) && Array.isArray(local)) return mergeArrays(cloud, local)
  if (isRecord(cloud) && isRecord(local)) {
    const result: Record<string, unknown> = { ...cloud }
    for (const [key, value] of Object.entries(local)) {
      result[key] = mergeValues(cloud[key], value)
    }
    return result
  }
  return local
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toIsoDate(value: unknown): string | null {
  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return null
}

function activityRows(snapshot: ProgressSnapshot, userId: string): CloudActivityRow[] {
  const progress = isRecord(snapshot['cssvista:progress:v1'])
    ? snapshot['cssvista:progress:v1']
    : {}

  return asArray(progress.activities).flatMap((entry) => {
    if (!isRecord(entry)) return []
    const type = typeof entry.type === 'string' ? entry.type : ''
    const label = typeof entry.label === 'string' ? entry.label : ''
    const path = typeof entry.path === 'string' ? entry.path : null
    const occurredAt = toIsoDate(entry.ts)
    if (!type || !occurredAt) return []
    const eventKey = `activity:${type}:${path ?? ''}:${occurredAt}`
    return [{
      user_id: userId,
      event_key: eventKey,
      activity_type: type,
      label,
      path,
      metadata: {},
      occurred_at: occurredAt,
    }]
  })
}

function quizAttemptRows(snapshot: ProgressSnapshot, userId: string): CloudQuizAttemptRow[] {
  const state = isRecord(snapshot['cssvista:v1']) ? snapshot['cssvista:v1'] : {}
  return asArray(state.quizResults).flatMap((entry) => {
    if (!isRecord(entry)) return []
    const id = typeof entry.id === 'string' ? entry.id : ''
    const type = typeof entry.type === 'string' ? entry.type : ''
    const category = typeof entry.category === 'string' ? entry.category : ''
    const score = asFiniteNumber(entry.score)
    const total = asFiniteNumber(entry.total)
    const completedAt = toIsoDate(entry.date)
    if (!id || !type || score === null || total === null || total <= 0 || score < 0 || score > total || !completedAt) {
      return []
    }
    return [{
      user_id: userId,
      attempt_key: id,
      quiz_type: type,
      category,
      score: Math.trunc(score),
      total: Math.trunc(total),
      metadata: {
        wrong_topics: Array.isArray(entry.wrongTopics) ? entry.wrongTopics : [],
        wrong_topic_counts: isRecord(entry.wrongTopicCounts) ? entry.wrongTopicCounts : {},
        student_name: typeof entry.studentName === 'string' ? entry.studentName : null,
        duration_seconds: asFiniteNumber(entry.durationSeconds),
        mock_kind: entry.mockKind === 'gk' || entry.mockKind === 'mpt' ? entry.mockKind : null,
      },
      completed_at: completedAt,
    }]
  })
}

async function syncNormalizedStudentRecords(
  client: SupabaseClient,
  userId: string,
  snapshot: ProgressSnapshot,
) {
  const activities = activityRows(snapshot, userId)
  if (activities.length) {
    const { error } = await client
      .from('student_activity')
      .upsert(activities, { onConflict: 'user_id,event_key', ignoreDuplicates: true })
    if (error) throw error
  }

  const attempts = quizAttemptRows(snapshot, userId)
  if (attempts.length) {
    const { error } = await client
      .from('quiz_attempts')
      .upsert(attempts, { onConflict: 'user_id,attempt_key' })
    if (error) throw error
  }

  const { error: profileError } = await client
    .from('student_profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (profileError) throw profileError
}

export function captureProgressSnapshot(): ProgressSnapshot {
  const snapshot: ProgressSnapshot = {}
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || !isStudentProgressKey(key)) continue
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try {
      snapshot[key] = JSON.parse(raw)
    } catch {
      snapshot[key] = raw
    }
  }
  return snapshot
}

export function mergeProgressSnapshots(
  cloud: ProgressSnapshot,
  local: ProgressSnapshot,
): ProgressSnapshot {
  return mergeValues(cloud, local) as ProgressSnapshot
}

export function applyProgressSnapshot(snapshot: ProgressSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (!isStudentProgressKey(key)) continue
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  }
}

export function clearLocalStudentProgress() {
  const keys: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key && isStudentProgressKey(key)) keys.push(key)
  }
  keys.forEach((key) => localStorage.removeItem(key))
  notifyProgressChanged()
}

export async function syncStudentProgress(
  client: SupabaseClient,
  userId: string,
): Promise<ProgressSnapshot> {
  const local = captureProgressSnapshot()
  const { data, error } = await client
    .from('student_progress')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  const cloud = isRecord(data?.payload) ? data.payload : {}
  const merged = mergeProgressSnapshots(cloud, local)
  const now = new Date().toISOString()
  const { error: upsertError } = await client
    .from('student_progress')
    .upsert(
      {
        user_id: userId,
        payload: merged,
        client_updated_at: now,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    )

  if (upsertError) throw upsertError
  await syncNormalizedStudentRecords(client, userId, merged)
  applyProgressSnapshot(merged)
  return merged
}

export async function clearCloudStudentProgress(
  client: SupabaseClient,
  userId: string,
) {
  const { error } = await client
    .from('student_progress')
    .delete()
    .eq('user_id', userId)
  if (error) throw error
}
