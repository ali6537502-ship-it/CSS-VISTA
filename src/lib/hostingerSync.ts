import { applyProgressSnapshot, captureProgressSnapshot, mergeProgressSnapshots } from './accountSync'
import { clearHostingerProgress, currentHostingerAccountUser, loadHostingerProgress, saveHostingerProgress } from './hostingerApi'
export async function syncStudentProgressToHostinger(userId: string) {
  const remote = await loadHostingerProgress(userId)
  if (currentHostingerAccountUser() !== userId) throw new Error('Your account changed. Please sign in again.')
  const merged = mergeProgressSnapshots(remote.payload || {}, captureProgressSnapshot())
  await saveHostingerProgress(merged, userId)
  if (currentHostingerAccountUser() === userId) applyProgressSnapshot(mergeProgressSnapshots(merged, captureProgressSnapshot()))
  return merged
}
export async function clearHostingerStudentProgress(userId: string) { await clearHostingerProgress(userId) }
