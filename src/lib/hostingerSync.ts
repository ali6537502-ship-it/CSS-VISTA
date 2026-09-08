import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applyProgressSnapshot,
  captureProgressSnapshot,
  mergeProgressSnapshots,
  type ProgressSnapshot,
} from '@/lib/accountSync'
import {
  clearHostingerProgress,
  ensureHostingerSession,
  loadHostingerProgress,
  saveHostingerProgress,
} from '@/lib/hostingerApi'

function isRecord(value: unknown): value is ProgressSnapshot {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export async function syncStudentProgressToHostinger(
  client: SupabaseClient,
  userId: string,
) {
  if (!await ensureHostingerSession(client)) throw new Error('Sign in again to connect progress sync.')
  const local = captureProgressSnapshot()
  const [hostinger, legacy] = await Promise.all([
    loadHostingerProgress(),
    client.from('student_progress').select('payload').eq('user_id', userId).maybeSingle(),
  ])
  if (legacy.error) throw legacy.error
  const target = isRecord(hostinger.payload) ? hostinger.payload : {}
  const source = isRecord(legacy.data?.payload) ? legacy.data.payload : {}
  const merged = mergeProgressSnapshots(mergeProgressSnapshots(target, source), local)
  await saveHostingerProgress(merged)
  applyProgressSnapshot(merged)
  return merged
}

export async function clearHostingerStudentProgress(client: SupabaseClient) {
  if (!await ensureHostingerSession(client)) throw new Error('Sign in again to reset progress.')
  await clearHostingerProgress()
}
