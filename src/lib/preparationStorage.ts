/** Existing logical progress keys stay unchanged on the server. A reset creates an
 * account-scoped device partition so outdated tabs cannot restore erased state. */
let owner: string | null = null
let generation: string | null = null
export const preparationGenerationKey = (id: string) => `cssvista:sync-generation:v1:${id}`
export const preparationRevisionKey = (id: string) => `cssvista:sync-revision:v1:${id}`
export const preparationLeaseKey = (id: string) => `cssvista:reset-write:v1:${id}`
export function bindPreparationStorage(id: string | null) {
  if (id === owner) return
  owner = id; generation = null
  try { if (id) generation = localStorage.getItem(preparationGenerationKey(id)) } catch { /* Hydration will report unavailable storage. */ }
}
export const preparationOwner = () => owner
export const preparationGeneration = () => generation
export function setPreparationGeneration(id: string, value: string | null) { if (id === owner) generation = value }
export function preparationPhysicalKey(key: string, id = owner, epoch: string | null = id === owner ? generation : id ? localStorage.getItem(preparationGenerationKey(id)) : null) {
  return id && epoch ? `cssvista:reset-data:v1:${encodeURIComponent(id)}:${epoch}:${encodeURIComponent(key)}` : key
}
export function preparationKeys(id = owner, epoch: string | null = id === owner ? generation : id ? localStorage.getItem(preparationGenerationKey(id)) : null) {
  const all = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((key): key is string => !!key)
  if (!id || !epoch) {
    const actualOwner = localStorage.getItem('cssvista:progress-owner')
    if (id && actualOwner && actualOwner !== id) return []
    return all.filter(key => key === 'cssvista:v1' || key === 'cssvista:progress:v1' || key.startsWith('cssvista:tool:'))
  }
  const prefix = `cssvista:reset-data:v1:${encodeURIComponent(id)}:${epoch}:`
  return all.filter(key => key.startsWith(prefix)).map(key => decodeURIComponent(key.slice(prefix.length)))
}
export function preparationWriteCurrent() {
  if (!owner) return true
  try {
    const lease = JSON.parse(localStorage.getItem(preparationLeaseKey(owner)) || 'null') as { at?: number } | null
    if (lease?.at && Math.abs(Date.now() - lease.at) < 30000) return false
    return localStorage.getItem(preparationGenerationKey(owner)) === generation
  } catch { return false }
}
/** Device-only drafts follow full preparation resets; partial schedule resets leave them intact. */
export function preparationDeviceKey(key: string, id: string) {
  if (typeof localStorage === 'undefined') return key
  try { const epoch = localStorage.getItem(`cssvista:study-reset:v1:${id}`); return epoch ? `${key}:reset:${epoch}` : key } catch { return key }
}
