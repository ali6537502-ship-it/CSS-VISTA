import test from 'node:test'
import assert from 'node:assert/strict'
import { accountDestination, accessIssues, type AccessValues } from '../src/features/account/accessForm.ts'
import { registrationIssues } from '../src/features/account/registrationModel.ts'
import { firstIncompleteProfileStep, incompatibleProfileList, profileDraft, profileIssues, profilePayload, profileSteps, type StudentProfile } from '../src/features/account/profileForm.ts'

const access: AccessValues = { name: 'Test Student', email: 'student@example.invalid', password: 'eight words long', confirmation: '', resetCode: '' }
const contact = { display_name: 'Test Student', phone: '+923001234567', whatsapp: '', previous_css_vista_student: 'No' }
test('one-page signup validates all existing profile requirements and photo together', () => {
  const complete = { ...contact, date_of_birth: '2000-01-01', gender: 'Other', city: 'Test', province_region: 'Test', country: 'Pakistan', css_attempt_year: '2027', preparation_level: 'Starting out', optional_subjects: '["Political Science"]', education: 'Bachelor degree' }
  assert.deepEqual(registrationIssues(complete, true), {})
  const invalid = registrationIssues({ ...complete, phone: '', city: '', education: '' }, false)
  for (const field of ['phone', 'city', 'education', 'photo']) assert.ok(invalid[field])
  assert.deepEqual(registrationIssues({ ...complete, phone: '', whatsapp: '+923001234567' }, true), {})
  assert.deepEqual(complete.optional_subjects, '["Political Science"]', 'Validation does not seed a full planner combination')
})
test('account creation needs three fields; legacy sign-in does not acquire new password restrictions', () => {
  assert.deepEqual(accessIssues(access, 'create', false, false), {})
  assert.deepEqual(accessIssues({ ...access, password: 'old' }, 'sign-in', false, false), {})
  assert.ok(accessIssues({ ...access, password: 'short' }, 'create', false, false).password)
  assert.ok(accessIssues({ ...access, name: '' }, 'create', false, false).name)
  assert.ok(accessIssues({ ...access, email: 'invalid' }, 'create', false, false).email)
})
test('new passwords respect the native 72-byte boundary, including Unicode', () => {
  assert.deepEqual(accessIssues({ ...access, password: 'é'.repeat(36) }, 'create', false, false), {})
  assert.ok(accessIssues({ ...access, password: 'é'.repeat(37) }, 'create', false, false).password)
  assert.ok(accessIssues({ ...access, password: 'a'.repeat(73) }, 'create', false, false).password)
  assert.ok(accessIssues({ ...access, password: 'password\0' }, 'create', false, false).password)
})
test('password recovery retains confirmation and the existing six-digit code requirement', () => {
  assert.ok(accessIssues(access, 'sign-in', true, true).confirmation)
  assert.ok(accessIssues(access, 'sign-in', true, true).resetCode)
  assert.deepEqual(accessIssues({ ...access, confirmation: access.password, resetCode: '123456' }, 'sign-in', true, true), {})
  assert.deepEqual(accessIssues({ ...access, email: '', confirmation: access.password }, 'sign-in', true, false), {})
})
test('return destinations preserve queries and anchors without account redirect loops', () => {
  assert.equal(accountDestination('/account/tasks?view=week#plan'), '/account/tasks?view=week#plan')
  assert.equal(accountDestination('/account?mode=create'), '/account/dashboard')
  assert.equal(accountDestination('/account?settings=1'), '/account?settings=1')
  for (const path of [null, 'https://evil.invalid', '//evil.invalid', 'javascript:alert(1)']) assert.equal(accountDestination(path), '/account/dashboard')
})
test('the native mandatory history answer is present in the first savable profile step', () => {
  assert.ok(profileSteps[0].fields.some(field => field.key === 'previous_css_vista_student'))
  assert.deepEqual(profileIssues(contact, 0), {})
  assert.deepEqual(profileIssues({ ...contact, phone: '', whatsapp: '+923001234567' }, 0), {})
  assert.ok(profileIssues({ ...contact, phone: '' }, 0).phone)
  assert.ok(profileIssues({ ...contact, previous_css_vista_student: '' }, 0).previous_css_vista_student)
  assert.ok(profileIssues({ ...contact, previous_css_vista_student: 'Both' }, 0).previous_css_vista_services)
  assert.deepEqual(profileIssues({ ...contact, previous_css_vista_student: 'Both', previous_css_vista_services: 'Test Series' }, 0), {})
  assert.ok(profileIssues({ ...contact, phone: 'abcdefghi' }, 0).phone)
})
test('profile step validation is scoped and does not impose a competing optional-subject rule engine', () => {
  const studies = { ...contact, css_attempt_year: '2027', preparation_level: 'Starting out', optional_subjects: 'Political Science', education: 'Bachelor degree' }
  assert.deepEqual(profileIssues(studies, 2), {}, 'A profile shortlist is not the planner examination combination')
  assert.ok(profileIssues({ ...studies, css_attempt_year: '2041' }, 2).css_attempt_year)
  assert.ok(profileIssues({ ...studies, optional_subjects: '' }, 2).optional_subjects)
  const about = { ...contact, date_of_birth: '2000-01-01', gender: 'Other', city: 'Test', province_region: 'Test', country: 'Pakistan' }
  const now = new Date('2026-10-26T12:00:00Z')
  assert.deepEqual(profileIssues(about, 1, now), {})
  for (const date_of_birth of ['2026-10-27', '1900-01-01', '2000-02-30', 'wrong']) assert.ok(profileIssues({ ...about, date_of_birth }, 1, now).date_of_birth)
})
test('profile adapters retain existing arrays, plain imported names and unrecognized selections', () => {
  const saved = { ...contact, optional_subjects: '["Punjabi","Imported subject"]', previous_css_vista_services: ['Batch'], css_attempt_year: 2027 }
  const draft = profileDraft(saved)
  assert.equal(draft.optional_subjects, '["Punjabi","Imported subject"]')
  assert.equal(draft.previous_css_vista_services, '["Batch"]')
  assert.deepEqual(profilePayload(draft).optional_subjects, ['Punjabi', 'Imported subject'])
  assert.equal(profileDraft({ optional_subjects: 'Unrecognized subject' }).optional_subjects, 'Unrecognized subject')
  assert.deepEqual(saved.optional_subjects, '["Punjabi","Imported subject"]', 'Reading never rewrites records')
  assert.deepEqual(profilePayload({ optional_subjects: ' Punjabi, Punjabi ', css_attempt_year: '2027', date_of_birth: '' }).optional_subjects, ['Punjabi'])
  assert.equal(profilePayload(draft).css_attempt_year, 2027)
  assert.equal(profilePayload(draft).date_of_birth, null)
  const commaName = { optional_subjects: ['Legacy subject, imported'] }
  assert.deepEqual(profilePayload(profileDraft(commaName)).optional_subjects, commaName.optional_subjects, 'An untouched imported name containing a comma remains one record')
  for (const value of [{ unknown: 'subject' }, '[42]', 'true']) assert.equal(incompatibleProfileList({ optional_subjects: value }, ['phone']), 'optional_subjects')
  for (const value of [null, '', 'Punjabi', '["Punjabi"]', ['Legacy subject, imported']]) assert.equal(incompatibleProfileList({ optional_subjects: value }, ['phone']), undefined)
  assert.equal(incompatibleProfileList({ optional_subjects: '{"unknown":"subject"}' }, ['optional_subjects']), undefined, 'Only an explicit edit can correct an incompatible list')
  assert.equal(profileDraft({ optional_subjects: '{"unknown":"subject"}' }).optional_subjects, '{"unknown":"subject"}', 'The original representation remains inspectable')
})
test('profile continuation comes from saved server requirements, while completed profiles stay editable', () => {
  const checks = profileSteps.flatMap(step => step.checks).map(key => ({ key, label: key, complete: true }))
  const saved = { ...contact, email: access.email, has_photo: false, completion: { checks, complete: false, total: 12, completed: 11, percent: 92 } } as StudentProfile
  checks.find(check => check.key === 'photo')!.complete = false
  assert.equal(firstIncompleteProfileStep(saved), 3)
  checks.find(check => check.key === 'education')!.complete = false
  assert.equal(firstIncompleteProfileStep(saved), 2)
  assert.equal(firstIncompleteProfileStep({ ...saved, previous_css_vista_student: '' }), 0)
  assert.equal(firstIncompleteProfileStep({ ...saved, completion: { ...saved.completion, complete: true } }), 0)
})
