import { preparationGeneration, preparationOwner, preparationPhysicalKey, preparationKeys, preparationWriteCurrent } from './preparationStorage'
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

export function captureProgressSnapshot(owner: string | null = preparationOwner(), epoch: string | null = owner === preparationOwner() ? preparationGeneration() : owner ? localStorage.getItem(`cssvista:sync-generation:v1:${owner}`) : null): ProgressSnapshot {
  const snapshot: ProgressSnapshot = {}
  for (const key of preparationKeys(owner, epoch)) {
    const raw = localStorage.getItem(preparationPhysicalKey(key, owner, epoch))
    if (raw === null) continue
    try {
      snapshot[key] = JSON.parse(raw)
    } catch {
      snapshot[key] = raw
    }
  }
  return snapshot
}

const GSA_PROGRESS_KEY = 'cssvista:tool:gsa-tutor:v1'

function recordTime(value: unknown): number {
  if (!isRecord(value) || typeof value.at !== 'string') return 0
  const timestamp = Date.parse(value.at)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function mergeGsaProgress(cloud: unknown, local: unknown): unknown {
  if (!isRecord(cloud)) return local
  if (!isRecord(local)) return cloud
  const merged = mergeValues(cloud, local) as Record<string, unknown>
  const cloudPlan = isRecord(cloud.plan) ? cloud.plan : null
  const localPlan = isRecord(local.plan) ? local.plan : null
  const planTime = (plan: Record<string, unknown> | null): number => {
    if (typeof plan?.changedAt !== 'string') return 0
    const timestamp = Date.parse(plan.changedAt)
    return Number.isFinite(timestamp) ? timestamp : 0
  }
  // The latest explicit reschedule wins; an older device cannot undo it.
  if (cloudPlan && localPlan) {
    merged.plan = planTime(cloudPlan) > planTime(localPlan) ? cloudPlan : localPlan
  } else if (cloudPlan || localPlan) {
    merged.plan = cloudPlan ?? localPlan
  }
  // Keep the latest graded attempt and revisit decision for each lesson.
  for (const field of ['completed', 'revisit', 'bookmarks', 'bookmarkRemoved'] as const) {
    const cloudRecords = isRecord(cloud[field]) ? cloud[field] : {}
    const localRecords = isRecord(local[field]) ? local[field] : {}
    const records: Record<string, unknown> = { ...cloudRecords, ...localRecords }
    for (const id of Object.keys(records)) {
      if (id in cloudRecords && id in localRecords) {
        records[id] = recordTime(cloudRecords[id]) > recordTime(localRecords[id])
          ? cloudRecords[id] : localRecords[id]
      }
    }
    merged[field] = records
  }
  const bookmarks = isRecord(merged.bookmarks) ? { ...merged.bookmarks } : {}
  const removed = isRecord(merged.bookmarkRemoved) ? { ...merged.bookmarkRemoved } : {}
  for (const id of Object.keys(removed)) {
    if (recordTime(removed[id]) >= recordTime(bookmarks[id])) delete bookmarks[id]
    else delete removed[id]
  }
  merged.bookmarks = bookmarks
  merged.bookmarkRemoved = removed
  const completed = merged.completed as Record<string, unknown>
  const revisit = merged.revisit as Record<string, unknown>
  for (const [id, record] of Object.entries(completed)) {
    if (isRecord(record) && record.selfRating === 'gotit' && recordTime(record) >= recordTime(revisit[id])) {
      delete revisit[id]
    }
  }
  return merged
}

export function mergeProgressSnapshots(
  cloud: ProgressSnapshot,
  local: ProgressSnapshot,
): ProgressSnapshot {
  const merged = mergeValues(cloud, local) as ProgressSnapshot
  if (GSA_PROGRESS_KEY in cloud || GSA_PROGRESS_KEY in local) {
    merged[GSA_PROGRESS_KEY] = mergeGsaProgress(cloud[GSA_PROGRESS_KEY], local[GSA_PROGRESS_KEY])
  }
  return merged
}

export function applyProgressSnapshot(snapshot: ProgressSnapshot, owner: string | null = preparationOwner()) {
  if (owner === preparationOwner() && !preparationWriteCurrent()) throw new Error('Preparation changed in another tab. Synchronize again before saving.')
  for (const [key, value] of Object.entries(snapshot)) {
    if (!isStudentProgressKey(key)) continue
    localStorage.setItem(preparationPhysicalKey(key, owner), typeof value === 'string' ? value : JSON.stringify(value))
  }
}

export function clearLocalStudentProgress(owner: string | null = preparationOwner()) {
  for (const key of preparationKeys(owner)) localStorage.removeItem(preparationPhysicalKey(key, owner))
  if (owner && localStorage.getItem('cssvista:progress-owner') === owner) {
    const legacy = Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).filter((key): key is string => !!key && isStudentProgressKey(key))
    for (const key of legacy) localStorage.removeItem(key)
  }
  notifyProgressChanged()
}

export function stashAccountProgress(owner: string) {
  const epoch = owner === preparationOwner() ? preparationGeneration() : localStorage.getItem(`cssvista:sync-generation:v1:${owner}`)
  const snapshot = captureProgressSnapshot(owner)
  localStorage.setItem(`cssvista:account-progress:${owner}`, JSON.stringify(epoch ? { generation: epoch, snapshot } : snapshot))
}
export function restoredAccountProgress(owner: string, value: unknown): ProgressSnapshot | null {
  const epoch = localStorage.getItem(`cssvista:sync-generation:v1:${owner}`)
  if (!isRecord(value)) return null
  if (!epoch) return value
  return value.generation === epoch && isRecord(value.snapshot) ? value.snapshot : null
}
