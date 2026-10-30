import { currentHostingerAccountUser, hostingerRequest } from '@/lib/hostingerApi'
import { incompatibleProfileList, profileDraft, profilePayload, type ProfileDraft, type StudentProfile } from './profileForm'

export async function profileRequest<T>(owner: string, path: string, assertCurrent: () => void, init: RequestInit = {}): Promise<T> {
  assertCurrent()
  if (!owner || currentHostingerAccountUser() !== owner) throw new Error('Your account changed. Please reopen account setup.')
  const headers = new Headers(init.headers); headers.set('X-CSSV-User', owner)
  const result = await hostingerRequest<T>(path, { ...init, headers })
  assertCurrent()
  return result
}

export async function persistProfileEdit(owner: string, base: StudentProfile, form: ProfileDraft, keys: string[], editedBase: ProfileDraft, assertCurrent: () => void) {
  const read = () => profileRequest<{ profile: StudentProfile }>(owner, 'student/profile.php', assertCurrent)
  const { profile: latest } = await read(), fresh = profileDraft(latest), original = profileDraft(base)
  const changed = keys.filter(key => form[key] !== original[key])
  const incompatible = incompatibleProfileList(latest, changed)
  if (incompatible) throw new Error(`Your saved ${incompatible === 'optional_subjects' ? 'subject list' : 'previous-service list'} uses an unsupported format. Your saved data and entries are retained. Review that list before saving other changes.`)
  const conflicts = changed.filter(key => fresh[key] !== (editedBase[key] ?? original[key]) && fresh[key] !== form[key])
  if (conflicts.length || !changed.length) return { profile: latest, conflicts }
  const patch = Object.fromEntries(changed.map(key => [key, form[key]])), payload = profilePayload({ ...fresh, ...patch })
  await profileRequest(owner, 'student/profile.php', assertCurrent, { method: 'POST', body: JSON.stringify(payload) })
  const { profile: saved } = await read(), savedForm = profileDraft(saved), expected = profileDraft(payload)
  if (changed.some(key => savedForm[key] !== expected[key])) throw new Error('Your saved details could not be confirmed. Your entries are retained; please try again.')
  return { profile: saved, conflicts: [] as string[] }
}

export async function persistProfilePhoto(owner: string, photo: File, assertCurrent: () => void) {
  if (photo.size > 60 * 1024) throw new Error('Choose a photo of 60 KB or smaller.')
  const body = new FormData(); body.append('photo', photo)
  await profileRequest(owner, 'student/photo.php', assertCurrent, { method: 'POST', body })
  const { profile } = await profileRequest<{ profile: StudentProfile }>(owner, 'student/profile.php', assertCurrent)
  if (!profile.has_photo || Number(profile.profile_photo_bytes) !== photo.size) throw new Error('Your saved photo could not be confirmed. Please try again.')
  return profile
}
