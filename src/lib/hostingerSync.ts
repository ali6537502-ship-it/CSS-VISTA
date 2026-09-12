import { applyProgressSnapshot, captureProgressSnapshot, mergeProgressSnapshots } from './accountSync'
import { clearHostingerProgress, currentHostingerAccountUser, loadHostingerProgress, saveHostingerProgress } from './hostingerApi'
export async function syncStudentProgressToHostinger(userId: string) {
  const local = captureProgressSnapshot()
  const remote = await loadHostingerProgress(userId)
  if (currentHostingerAccountUser() !== userId) throw new Error('Your account changed. Please sign in again.')
  const merged = mergeProgressSnapshots(remote.payload || {}, local)
  await saveHostingerProgress(merged, userId)
  if (currentHostingerAccountUser() === userId) applyProgressSnapshot(merged)
  return merged
}
export async function clearHostingerStudentProgress(userId: string) { await clearHostingerProgress(userId) }
