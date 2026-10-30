export type ProfileCheck = { key: string; label: string; complete: boolean }
export type ProfileCompletion = { checks: ProfileCheck[]; completed: number; total: number; percent: number; complete: boolean }
export type StudentProfile = Record<string, unknown> & { completion: ProfileCompletion; has_photo: boolean; email: string }
export type ProfileDraft = Record<string, string>
export type ProfileField = { key: string; label: string; type?: string; max?: number; options?: string[]; multiOptions?: string[]; hint?: string; textarea?: boolean; optional?: boolean; autoComplete?: string }
export const profileSteps: { title: string; description: string; checks: string[]; fields: ProfileField[] }[] = [
  { title: 'Contact', description: 'A name, a contact number and your connection with CSS Vista.', checks: ['display_name', 'contact'], fields: [
    { key: 'display_name', label: 'Full name', max: 180, autoComplete: 'name' },
    { key: 'phone', label: 'Contact number', type: 'tel', max: 40, autoComplete: 'tel', hint: 'Use a phone number or add WhatsApp below.' },
    { key: 'whatsapp', label: 'WhatsApp number', type: 'tel', max: 40, optional: true },
    { key: 'previous_css_vista_student', label: 'Have you previously studied with Miss Sadia Zahoor or Sir Ali Hassan Sargana?', options: ['No', 'Miss Sadia Zahoor', 'Sir Ali Hassan Sargana', 'Both'] },
    { key: 'previous_css_vista_services', label: 'What did you previously join or purchase?', multiOptions: ['Batch', 'Test Series', 'Purchased Notes'], hint: 'Choose at least one when you have studied with us before.' },
    { key: 'previous_css_vista_details', label: 'Previous study details', max: 500, textarea: true, optional: true, hint: 'A batch year, test series or notes title, if you remember.' },
  ] },
  { title: 'About you', description: 'Your personal details and location, kept in your private profile.', checks: ['date_of_birth', 'gender', 'city', 'province_region', 'country'], fields: [
    { key: 'date_of_birth', label: 'Date of birth', type: 'date', autoComplete: 'bday' },
    { key: 'gender', label: 'Gender', options: ['Male', 'Female', 'Other'] },
    { key: 'city', label: 'City', max: 120, autoComplete: 'address-level2' },
    { key: 'province_region', label: 'Province / region', max: 120, autoComplete: 'address-level1' },
    { key: 'country', label: 'Country', max: 120, autoComplete: 'country-name' },
  ] },
  { title: 'Your studies', description: 'Tell us where you are in your preparation.', checks: ['css_attempt_year', 'preparation_level', 'optional_subjects', 'education'], fields: [
    { key: 'css_attempt_year', label: 'Attempt year', type: 'number' },
    { key: 'preparation_level', label: 'Preparation level', options: ['Starting out', 'Building foundations', 'Covering the syllabus', 'Revision and practice', 'Ready for the examination'] },
    { key: 'optional_subjects', label: 'Optional subjects', hint: 'Your profile shortlist. Review the full examination combination in My Study Plan.' },
    { key: 'education', label: 'Education', max: 240, hint: 'Your current or completed qualification.' },
    { key: 'previous_academy_mentor', label: 'Other previous academy / mentor', max: 240, optional: true },
  ] },
  { title: 'Your photo', description: 'Add a clear photo to finish your student profile.', checks: ['photo'], fields: [] },
]

export function profileValues(value: string): string[] {
  try {
    const values: unknown = JSON.parse(value)
    if (Array.isArray(values) && values.every(item => typeof item === 'string')) return values.map(item => item.trim()).filter(Boolean)
  } catch { /* Older imported plain-text lists remain readable. */ }
  return value.split(',').map(item => item.trim()).filter(Boolean)
}
export function profileDraft(profile: Record<string, unknown>): ProfileDraft {
  return Object.fromEntries(profileSteps.flatMap(step => step.fields).map(field => {
    let value = profile[field.key]
    if (['optional_subjects', 'previous_css_vista_services'].includes(field.key) && typeof value === 'string') {
      try { value = JSON.parse(value) } catch { /* Preserve supported imported plain text. */ }
    }
    return [field.key, value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')]
  }))
}
/** A full-profile POST must not silently reinterpret an untouched incompatible list. */
export function incompatibleProfileList(profile: Record<string, unknown>, changed: string[]): string | undefined {
  for (const key of ['optional_subjects', 'previous_css_vista_services']) {
    if (changed.includes(key)) continue
    let value = profile[key]
    if (value == null || value === '') continue
    if (typeof value === 'string') {
      try { value = JSON.parse(value) } catch { continue /* Supported imported plain text. */ }
    }
    if (value == null || typeof value === 'string' || (Array.isArray(value) && value.every(item => typeof item === 'string'))) continue
    return key
  }
}
export function profilePayload(form: ProfileDraft) {
  const trimmed = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]))
  return { ...trimmed, date_of_birth: trimmed.date_of_birth || null, css_attempt_year: trimmed.css_attempt_year ? Number(trimmed.css_attempt_year) : null,
    optional_subjects: [...new Set(profileValues(trimmed.optional_subjects || ''))], previous_css_vista_services: [...new Set(profileValues(trimmed.previous_css_vista_services || ''))] }
}
export function firstIncompleteProfileStep(profile: StudentProfile) {
  if (profile.completion.complete) return 0
  if (!profile.previous_css_vista_student) return 0
  const step = profileSteps.findIndex(group => group.checks.some(key => !profile.completion.checks.find(check => check.key === key)?.complete))
  return step < 0 ? 3 : step
}
export function profileFieldStep(key: string) {
  return key === 'photo' ? 3 : key === 'contact' ? 0 : Math.max(0, profileSteps.findIndex(step => step.fields.some(field => field.key === key)))
}
export function profileIssues(form: ProfileDraft, step: number, now = new Date()): Record<string, string> {
  const errors: Record<string, string> = {}
  const history = form.previous_css_vista_student || ''
  if (!['No', 'Miss Sadia Zahoor', 'Sir Ali Hassan Sargana', 'Both'].includes(history)) errors.previous_css_vista_student = 'Choose whether you have studied with us before.'
  else if (history !== 'No' && !profileValues(form.previous_css_vista_services || '').length) errors.previous_css_vista_services = 'Choose at least one previous service.'
  for (const field of profileSteps[step].fields) {
    if (field.optional || field.key.startsWith('previous_css_vista_')) continue
    const value = form[field.key]?.trim() || ''
    if (field.key === 'phone') {
      if (!value && !form.whatsapp?.trim()) errors.phone = 'Add a phone number or WhatsApp number.'
    } else if (!value) errors[field.key] = `Enter ${field.label.toLowerCase()}.`
    if (field.max && value.length > field.max) errors[field.key] = `Use no more than ${field.max} characters.`
  }
  for (const key of step === 0 ? ['phone', 'whatsapp'] : []) {
    const value = form[key]?.trim()
    if (value && (!/^[+0-9 ()-]{7,40}$/.test(value) || value.replace(/\D/g, '').length < 7)) errors[key] = 'Enter a valid contact number.'
  }
  if (step === 1 && form.date_of_birth) {
    const date = new Date(`${form.date_of_birth}T12:00:00`)
    const oldest = new Date(now); oldest.setFullYear(oldest.getFullYear() - 100); oldest.setHours(0, 0, 0, 0)
    const today = new Date(now); today.setHours(23, 59, 59, 999)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date_of_birth) || !Number.isFinite(date.getTime()) || date.getFullYear() !== Number(form.date_of_birth.slice(0, 4)) || date.getMonth() + 1 !== Number(form.date_of_birth.slice(5, 7)) || date.getDate() !== Number(form.date_of_birth.slice(8, 10)) || date > today || date < oldest) errors.date_of_birth = 'Enter a valid date of birth within the last 100 years.'
  }
  if (step === 2) {
    const year = Number(form.css_attempt_year)
    if (!Number.isInteger(year) || year < 2020 || year > 2040) errors.css_attempt_year = 'Choose an attempt year from 2020 to 2040.'
    const subjects = profileValues(form.optional_subjects || '')
    if (!subjects.length || subjects.length > 20 || subjects.some(subject => subject.length > 120)) errors.optional_subjects = 'Choose between 1 and 20 subjects.'
  }
  return errors
}
