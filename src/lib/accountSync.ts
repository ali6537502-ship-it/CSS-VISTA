import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyProgressChanged } from '@/lib/progressEvents'

export type ProgressSnapshot = Record<string, unknown>

const PRIMARY_PROGRESS_KEYS = new Set([
  'cssvista:v1',
  'cssvista:progress:v1',
])

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
