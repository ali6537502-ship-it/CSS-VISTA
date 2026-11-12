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
  for (const field of ['completed', 'revisit', 'bookmarks', 'bookmarkRemoved', 'quizHistory', 'quizAttempts', 'questionReview', 'recallAttempts', 'reviewDue', 'planHistory', 'assessmentAttempts', 'studySessions', 'writtenAttempts'] as const) {
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
  // A resumed attempt may receive different responses on two devices. Merge
  // responses by question timestamp rather than dropping the older whole session.
  const attempts = merged.quizAttempts as Record<string, unknown>
  const cloudAttempts = isRecord(cloud.quizAttempts) ? cloud.quizAttempts : {}
  const localAttempts = isRecord(local.quizAttempts) ? local.quizAttempts : {}
  for (const id of Object.keys(attempts)) {
    const a = cloudAttempts[id], b = localAttempts[id], current = attempts[id]
    if (!isRecord(a) || !isRecord(b) || !isRecord(current)) continue
    const ar = isRecord(a.responses) ? a.responses : {}
    const br = isRecord(b.responses) ? b.responses : {}
    const responses: Record<string, unknown> = { ...ar, ...br }
    for (const q of Object.keys(responses)) {
      if (q in ar && q in br) responses[q] = recordTime(ar[q]) > recordTime(br[q]) ? ar[q] : br[q]
    }
    attempts[id] = { ...current, responses }
  }
  const assessments = merged.assessmentAttempts as Record<string, unknown>
  const ca = isRecord(cloud.assessmentAttempts) ? cloud.assessmentAttempts : {}
  const la = isRecord(local.assessmentAttempts) ? local.assessmentAttempts : {}
  for (const id of Object.keys(assessments)) {
    const a = ca[id], b = la[id]
    if (!isRecord(a) || !isRecord(b)) continue
    const finished = [a, b].filter(x => typeof x.finishedAt === 'string').sort((x, y) => Date.parse(String(x.finishedAt)) - Date.parse(String(y.finishedAt)))
    const winner = finished[0] ?? (recordTime(a) > recordTime(b) ? a : b)
    const deadline = typeof winner.deadline === 'string' ? Date.parse(winner.deadline) : Infinity
    const cutoff = Math.min(deadline, typeof winner.finishedAt === 'string' ? Date.parse(winner.finishedAt) : Infinity)
    const responses: Record<string, unknown> = {}
    for (const attempt of [a, b]) {
      if (!isRecord(attempt.responses)) continue
      for (const [q, r] of Object.entries(attempt.responses)) {
        if (recordTime(r) <= cutoff && (!(q in responses) || recordTime(r) > recordTime(responses[q]))) responses[q] = r
      }
    }
    const ae = isRecord(a.choiceEvents) ? a.choiceEvents : {}
    const be = isRecord(b.choiceEvents) ? b.choiceEvents : {}
    assessments[id] = { ...winner, responses, choiceEvents: { ...ae, ...be } }
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

const FITNESS_PROGRESS_KEY = 'cssvista:tool:fitness-coach:v1'
/** Preserve different-device weigh-ins and workouts while using the latest explicit
 * profile/recipe/food edit. A mismatched account owner is never mixed into the
 * currently loaded private fitness progress. */
function mergeFitnessProgress(cloud:unknown,local:unknown):unknown {
  const owner=preparationOwner()
  // The active account is the only permissible owner of a private fitness record.
  const safe=(item:unknown):item is Record<string,unknown>=>isRecord(item)&&typeof item.ownerId==='string'&&item.ownerId===owner
  if(!safe(cloud))return safe(local)?local:undefined
  if(!safe(local))return cloud
  const cloudStamp=Date.parse(String(cloud.updatedAt||''))||0
  const localStamp=Date.parse(String(local.updatedAt||''))||0
  const newer=localStamp>=cloudStamp?local:cloud
  const older=localStamp>=cloudStamp?cloud:local
  const byDate=new Map<string,unknown>()
  for(const entry of [older.weights,newer.weights]){
    if(!Array.isArray(entry))continue
    for(const weight of entry){if(isRecord(weight)&&typeof weight.date==='string')byDate.set(weight.date,weight)}
  }
  const workouts={...(isRecord(older.workouts)?older.workouts:{}),...(isRecord(newer.workouts)?newer.workouts:{})}
  // Completion timestamps are ISO strings; choose the later completion when both exist.
  if(isRecord(older.workouts)&&isRecord(newer.workouts))for(const date of Object.keys(workouts)){
    const a=older.workouts[date],b=newer.workouts[date]
    if(typeof a==='string'&&typeof b==='string')workouts[date]=Date.parse(a)>Date.parse(b)?a:b
  }
  return {...newer,
    weights:[...byDate.values()].sort((a,b)=>String((a as Record<string,unknown>).date).localeCompare(String((b as Record<string,unknown>).date))),
    workouts,
    // Food changes and completed-meal toggles must not be resurrected from an older device.
    meals:{...(isRecord(older.meals)?older.meals:{}),...(isRecord(newer.meals)?newer.meals:{})},
    dailyAvailability:{...(isRecord(older.dailyAvailability)?older.dailyAvailability:{}),...(isRecord(newer.dailyAvailability)?newer.dailyAvailability:{})},
    mealOffsets:{...(isRecord(older.mealOffsets)?older.mealOffsets:{}),...(isRecord(newer.mealOffsets)?newer.mealOffsets:{})},
  }
}

export function mergeProgressSnapshots(
  cloud: ProgressSnapshot,
  local: ProgressSnapshot,
): ProgressSnapshot {
  const merged = mergeValues(cloud, local) as ProgressSnapshot
  if (GSA_PROGRESS_KEY in cloud || GSA_PROGRESS_KEY in local) {
    merged[GSA_PROGRESS_KEY] = mergeGsaProgress(cloud[GSA_PROGRESS_KEY], local[GSA_PROGRESS_KEY])
  }
  if (FITNESS_PROGRESS_KEY in cloud || FITNESS_PROGRESS_KEY in local) {
    const safeFitness=mergeFitnessProgress(cloud[FITNESS_PROGRESS_KEY],local[FITNESS_PROGRESS_KEY])
    if(safeFitness!==undefined)merged[FITNESS_PROGRESS_KEY]=safeFitness
    else delete merged[FITNESS_PROGRESS_KEY]
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
