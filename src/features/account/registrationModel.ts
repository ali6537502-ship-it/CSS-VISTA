import { profileIssues, type ProfileDraft } from './profileForm.ts'

/** One validation pass across the existing required profile fields and photo. */
export function registrationIssues(form: ProfileDraft, hasPhoto: boolean, now = new Date()): Record<string, string> {
  return { ...profileIssues(form, 0, now), ...profileIssues(form, 1, now), ...profileIssues(form, 2, now), ...(!hasPhoto ? { photo: 'Choose your profile photo.' } : {}) }
}
