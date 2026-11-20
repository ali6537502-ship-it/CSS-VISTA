import test from 'node:test'
import assert from 'node:assert/strict'
import { optionalGroups, type OptionalSubject } from '../src/data/syllabus.ts'
import { buildSubjectCombination, validateSubjectCombination, validateStudySelection } from '../src/lib/subjectSelection.ts'

const all = optionalGroups.flatMap((group) => group.subjects)
const subject = (name: string): OptionalSubject => {
  const found = all.find((entry) => entry.name === name)
  assert.ok(found, `Missing fixture: ${name}`)
  return found
}
const rankFirst = (...names: string[]) => [
  ...names.map(subject),
  ...all.filter((entry) => !names.includes(entry.name)),
]

test('full official catalog generates 600 rather than the previous all-groups 900', () => {
  const result = buildSubjectCombination(all)
  assert.equal(result.total, 600)
  assert.equal(result.valid, true)
  assert.deepEqual(result.violations, [])
  assert.equal(new Set(result.subjects.map((entry) => entry.name)).size, result.subjects.length)
  assert.ok(new Set(result.subjects.map((entry) => entry.group)).size < 7)
})

test('a higher-ranked 200-mark Group II subject is retained', () => {
  const result = buildSubjectCombination(rankFirst('Physics', 'Political Science', 'Statistics', 'Geology'))
  assert.equal(result.valid, true)
  assert.deepEqual(result.subjects.filter((entry) => entry.group === 2).map((entry) => entry.name), ['Physics'])
})

test('two preferred 100-mark Group II subjects outrank an available 200-mark subject', () => {
  const result = buildSubjectCombination(rankFirst('Statistics', 'Geology', 'Physics', 'Political Science'))
  assert.equal(result.valid, true)
  assert.deepEqual(result.subjects.filter((entry) => entry.group === 2).map((entry) => entry.name), ['Statistics', 'Geology'])
})

test('Group II may be omitted when four preferred 100-mark groups follow Group I', () => {
  const names = ['Political Science', 'Public Administration', 'History of USA', 'Gender Studies', 'International Law']
  const result = buildSubjectCombination(rankFirst(...names))
  assert.equal(result.valid, true)
  assert.deepEqual(result.subjects.map((entry) => entry.name), names)
})

test('Group I may be omitted when Group II and four other groups are preferred', () => {
  const names = ['Chemistry', 'Public Administration', 'History of USA', 'Gender Studies', 'International Law']
  const result = buildSubjectCombination(rankFirst(...names))
  assert.equal(result.valid, true)
  assert.deepEqual(result.subjects.map((entry) => entry.name), names)
})

test('selection backtracks from an incomplete Group II pair to a feasible 600', () => {
  const result = buildSubjectCombination([
    subject('Statistics'), subject('Political Science'), subject('Public Administration'),
    subject('History of USA'), subject('Gender Studies'), subject('International Law'),
  ])
  assert.equal(result.valid, true)
  assert.equal(result.subjects.some((entry) => entry.name === 'Statistics'), false)
})

test('a missing 600-mark combination is explicitly invalid', () => {
  for (const input of [[], [subject('Political Science')], all.filter((entry) => entry.group >= 3)]) {
    const result = buildSubjectCombination(input)
    assert.equal(result.valid, false)
    assert.ok(result.violations.some((violation) => violation.includes('exactly 600')))
  }
})

test('validation rejects two distinct subjects from the same single-subject group even at 600', () => {
  const result = validateSubjectCombination([
    subject('Political Science'), subject('Economics'), subject('Physics'),
  ])
  assert.equal(result.total, 600)
  assert.equal(result.valid, false)
  assert.ok(result.violations.includes('Select at most one subject from Group 1'))
})

test('validation rejects duplicate subjects, and builder deduplicates its ranked input', () => {
  const result = validateSubjectCombination([subject('Physics'), subject('Physics'), subject('Political Science')])
  assert.equal(result.total, 600)
  assert.equal(result.valid, false)
  assert.ok(result.violations.includes('A subject cannot be selected more than once'))
  const built = buildSubjectCombination([...all, ...all.map((entry) => ({ ...entry }))])
  assert.equal(built.valid, true)
  assert.equal(new Set(built.subjects.map((entry) => entry.name)).size, built.subjects.length)
})

test('validation rejects a lone 100-mark Group II subject and a mixed 200+100 choice', () => {
  for (const names of [
    ['Political Science', 'Statistics', 'Public Administration', 'History of USA', 'Gender Studies'],
    ['Political Science', 'Physics', 'Statistics', 'Gender Studies'],
  ]) {
    const result = validateSubjectCombination(names.map(subject))
    assert.equal(result.total, 600)
    assert.equal(result.valid, false)
    assert.ok(result.violations.some((violation) => violation.startsWith('Group II permits')))
  }
})

test('validation rejects malformed groups or marks', () => {
  const result = validateSubjectCombination([
    { ...subject('Political Science'), group: 8 },
    { ...subject('Public Administration'), marks: 200 },
    subject('Physics'),
  ])
  assert.equal(result.valid, false)
  assert.ok(result.violations.some((violation) => violation.startsWith('Unknown group')))
  assert.ok(result.violations.some((violation) => violation.startsWith('Invalid marks')))
})

test('alternate ranking produces a different legal combination without mutating the catalog', () => {
  const before = [...all]
  const primary = buildSubjectCombination(all)
  const alternative = buildSubjectCombination([
    ...all.filter((entry) => !primary.subjects.includes(entry)), ...primary.subjects,
  ])
  assert.equal(alternative.valid, true)
  assert.notDeepEqual(alternative.subjects.map((entry) => entry.name), primary.subjects.map((entry) => entry.name))
  assert.deepEqual(all, before)
})


test('partial optional study selection is allowed without claiming a valid FPSC examination combination',()=>{
  const gender=[subject('Gender Studies')]
  assert.equal(validateSubjectCombination(gender).valid,false)
  const focused=validateStudySelection(gender)
  assert.equal(focused.total,100)
  assert.equal(focused.valid,true)
  assert.deepEqual(focused.violations,[])
  const halfGroupII=validateStudySelection([subject('Statistics')])
  assert.equal(halfGroupII.total,100)
  assert.equal(halfGroupII.valid,true,'A single 100-mark Group II option can be prepared ahead of its final pair')
  assert.equal(validateSubjectCombination([subject('Statistics')]).valid,false)
  const final=buildSubjectCombination(all)
  assert.equal(validateStudySelection(final.subjects).valid,true)
  assert.equal(validateSubjectCombination(final.subjects).valid,true)
})

test('partial study permission never overrides duplicate, group or maximum marks rules',()=>{
  const sameGroup=validateStudySelection([subject('Gender Studies'),subject('Environmental Sciences')])
  assert.equal(sameGroup.valid,false)
  assert.match(sameGroup.violations.join(' '),/Group 5/)
  const over=validateStudySelection([
    subject('Political Science'),subject('Physics'),subject('Business Administration'),
    subject('History of USA'),subject('Gender Studies'),subject('Criminology'),
  ])
  assert.equal(over.total,800)
  assert.equal(over.valid,false)
  assert.match(over.violations.join(' '),/maximum 600/)
  assert.equal(validateStudySelection([subject('Statistics'),subject('Physics')]).valid,false)
  assert.equal(validateStudySelection([subject('Political Science'),subject('Statistics'),subject('Public Administration'),subject('History of USA'),subject('Gender Studies')]).valid,false,'A fully selected 600-mark scheme cannot contain an unpaired Group II 100-mark subject')
  assert.equal(validateStudySelection([subject('Gender Studies'),subject('Gender Studies')]).valid,false)
})
