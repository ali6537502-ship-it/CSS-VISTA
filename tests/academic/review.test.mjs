import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import {assessReview, coverageReport, readPacket, reviewTemplate} from './review.mjs'

// Metadata-shaped, in-memory fixtures only. No real model output, reviewer or provider access.
const catalogue = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url)))
const sample = 'Format-only feedback for unit checks; no academic accuracy assertion.'
function fixture(item = catalogue.cases[0], index = 1) {
  const input = {student_text: item.student_text, level: item.level, stage: item.stage}
  if (item.context?.lesson_id) input.source = {id: item.context.lesson_id}
  if (item.feature === 'essay') input.source = {id: item.context.theme}
  if (item.feature === 'precis') Object.assign(input, {original: item.context.passage, title: item.context.title})
  if (item.feature === 'tutor') Object.assign(input, {question: item.student_text, context: {id: item.context.context_id, text: item.context.source_text}})
  return JSON.stringify({status: 'REQUIRES_HUMAN_ACADEMIC_REVIEW', case_id: item.id, case_version: catalogue.version,
    operation_id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`, provider_response_id: `resp_format_${index}`,
    configured_model: 'format-only', reported_model: 'format-only', source_snapshot: input,
    provider: 'openai', operation_feature: {sentence: 'sentence', paragraph: 'paragraph', argument: 'argumentation', analysis: 'analysis', essay: 'essay', precis: 'precis', tutor: 'tutor'}[item.feature],
    prompt_version: item.feature === 'tutor' ? 'ask-vista-scoped-v1' : item.feature === 'precis' ? 'precis-source-v1' : item.context?.lesson_id || ['argument', 'analysis', 'essay'].includes(item.feature) ? 'skills-instruction-v1' : 'writing-feedback-v1',
    validated_feedback: {summary: sample}, expectations: item.review_expectations, unacceptable_behavior: item.unacceptable_behavior, release_approval: false})
}
function formatReview(raw) {
  const review = reviewTemplate(raw)
  Object.assign(review, {reviewer: 'Unit-only reviewer', reviewed_on: '2026-01-01T00:00:00Z', actual_provider_request_confirmed: true, source_snapshot_compared: true})
  for (const check of review.checks) Object.assign(check, {outcome: 'met', explanation: 'Format-only explanation.', feedback_excerpt: 'Format-only feedback'})
  return review
}
const clone = value => structuredClone(value)

test('Blank review never becomes a completed review or release approval', () => {
  const raw = fixture(), review = reviewTemplate(raw)
  assert.equal(review.packet_sha256, createHash('sha256').update(raw).digest('hex'))
  assert.equal(assessReview(raw, review).status, 'UNREVIEWED')
  assert.equal(review.release_approval, false)
  assert(review.checks.every(c => c.outcome === null))
})

test('Digest, operation, criteria and verbatim excerpts bind the decision to one saved packet', () => {
  const raw = fixture(), review = formatReview(raw)
  for (const mutate of [r => {r.packet_sha256 = '0'.repeat(64)}, r => {r.operation_id = 'wrong'},
    r => {r.checks.pop()}, r => {r.checks.reverse()}, r => {r.checks[0].criterion = 'Skip meaning'},
    r => {r.checks[0].feedback_excerpt = 'Invented quote'}, r => {r.checks[0].explanation = ''},
    r => {r.checks[0].outcome = 'pass'}, r => {r.release_approval = true}]) {
    const altered = clone(review); mutate(altered); assert.throws(() => assessReview(raw, altered))
  }
  assert.throws(() => assessReview(`${raw}\n`, review), /immutable packet/)
  assert.equal(assessReview(raw, review).status, 'REVIEWED_NO_ADVERSE_FINDINGS')
})

test('Incomplete, unconfirmed, unfavorable and uncertain observations remain distinct', () => {
  const raw = fixture(), review = formatReview(raw)
  for (const [change, expected] of [
    [r => {r.checks[0].outcome = null}, 'UNREVIEWED'],
    [r => {r.reviewer = null}, 'UNREVIEWED'],
    [r => {r.reviewed_on = null}, 'UNREVIEWED'],
    [r => {r.actual_provider_request_confirmed = false}, 'EVIDENCE_UNCONFIRMED'],
    [r => {r.source_snapshot_compared = null}, 'EVIDENCE_UNCONFIRMED'],
    [r => {r.checks[0].outcome = 'not_met'}, 'CORRECTION_REQUIRED'],
    [r => {r.checks[0].outcome = 'uncertain'}, 'REVIEW_UNCERTAIN'],
  ]) {const altered = clone(review); change(altered); assert.equal(assessReview(raw, altered).status, expected)}
  for (const date of ['2999-01-01T00:00:00Z', '2026-02-30T00:00:00Z', 'yesterday']) {
    const altered = clone(review); altered.reviewed_on = date; assert.throws(() => assessReview(raw, altered))
  }
})

test('Test, unknown, substituted and unsupported OCR packets cannot enter the textual report', () => {
  const packet = JSON.parse(fixture())
  for (const mutate of [p => {p.status = 'unknown'}, p => {p.configured_model = 'TEST-only'}, p => {p.reported_model = null},
    p => {p.provider_response_id = 'resp_fixture_1'}, p => {p.case_version = 'old'}, p => {p.source_snapshot.student_text = 'Changed'},
    p => {p.expectations = []}, p => {p.validated_feedback = {}}, p => {p.prompt_version = 'old'}, p => {p.operation_feature = 'wrong'},
    p => {p.case_id = catalogue.cases.find(c => c.feature === 'handwriting_extract').id}]) {
    const altered = clone(packet); mutate(altered); assert.throws(() => readPacket(JSON.stringify(altered)))
  }
  for (const feature of ['essay', 'precis', 'tutor']) {
    const item = catalogue.cases.find(c => c.feature === feature), altered = JSON.parse(fixture(item))
    if (feature === 'essay') altered.source_snapshot.source.id = 'wrong'
    if (feature === 'precis') altered.source_snapshot.original = 'different passage'
    if (feature === 'tutor') altered.source_snapshot.context.text = 'different source'
    assert.throws(() => readPacket(JSON.stringify(altered)))
  }
})

test('Coverage starts empty, rejects duplicates and retains every adverse trial', () => {
  const empty = coverageReport([], [])
  assert.equal(empty.total_cases, 45); assert.equal(empty.missing_cases.length, 41)
  assert.equal(empty.genuine_image_cases_blocked.length, 4); assert.equal(empty.reviewed_cases_without_adverse_findings, 0)
  const first = fixture(), retry = fixture(catalogue.cases[0], 2), failing = formatReview(first), passing = formatReview(retry)
  failing.checks[1].outcome = 'not_met'
  const report = coverageReport([first, retry], [failing, passing])
  assert.equal(report.cases[0].status, 'UNRESOLVED_TRIALS')
  assert.equal(report.cases[0].trials.length, 2)
  assert.equal(report.cases[0].trials[0].status, 'CORRECTION_REQUIRED')
  assert.equal(report.reviewed_cases_without_adverse_findings, 0)
  assert.throws(() => coverageReport([first, first], []), /Duplicate/)
  assert.throws(() => coverageReport([first], [failing, failing]), /Multiple reviews/)
  assert.throws(() => coverageReport([], [failing]), /Orphan/)
  const duplicateResponse = JSON.parse(retry); duplicateResponse.provider_response_id = JSON.parse(first).provider_response_id
  assert.throws(() => coverageReport([first, JSON.stringify(duplicateResponse)], []), /Duplicate/)
})

test('Even all format-only textual checks do not authorize launch or certify model accuracy', () => {
  const raws = catalogue.cases.filter(c => c.feature !== 'handwriting_extract').map((c, i) => fixture(c, i + 1))
  const report = coverageReport(raws, raws.map(formatReview))
  assert.equal(report.reviewed_cases_without_adverse_findings, 41)
  assert.equal(report.status, 'ACADEMIC_REVIEW_INCOMPLETE')
  assert.equal(report.release_approval, false)
  assert.equal(report.academic_correctness_verified_by_this_tool, false)
  assert.equal(report.provider_access_verified_by_this_tool, false)
  assert.equal(report.coverage_is_aggregate_not_single_model_validation, true)
  assert.equal(report.genuine_image_cases_blocked.length, 4)
  assert(report.model_and_prompt_groups.length > 1)
})

test('CLI creates private files without overwrite, symlink following or repository writes', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'cssv-review-format-only-'))
  const run = (...args) => spawnSync(process.execPath, [fileURLToPath(new URL('./review.mjs', import.meta.url)), ...args], {encoding: 'utf8'})
  try {
    const packets = resolve(directory, 'packets'), reviews = resolve(directory, 'reviews')
    mkdirSync(packets); mkdirSync(reviews)
    const packet = resolve(packets, 'packet.json'), review = resolve(reviews, 'review.json'), report = resolve(directory, 'report.json')
    writeFileSync(packet, fixture(), {mode: 0o600})
    assert.equal(run('template', packet, review).status, 0)
    assert.equal(statSync(review).mode & 0o777, 0o600)
    const unchanged = readFileSync(review, 'utf8')
    assert.equal(run('template', packet, review).status, 2)
    assert.equal(readFileSync(review, 'utf8'), unchanged)
    assert.equal(run('report', packets, reviews, report).status, 0)
    assert.equal(statSync(report).mode & 0o777, 0o600)
    assert.equal(JSON.parse(readFileSync(report)).cases[0].trials[0].status, 'UNREVIEWED')
    const link = resolve(directory, 'linked.json'); symlinkSync(packet, link)
    assert.equal(run('template', link, resolve(directory, 'no.json')).status, 2)
    assert.equal(run('template', packet, resolve('tests/academic/must-not-create.json')).status, 2)
    writeFileSync(resolve(reviews, 'bad.json'), JSON.stringify({operation_id: 'private-value-should-not-print'}))
    const failed = run('report', packets, reviews, resolve(directory, 'bad-report.json'))
    assert.equal(failed.status, 2); assert(!failed.stderr.includes('private-value-should-not-print'))
  } finally {rmSync(directory, {recursive: true, force: true})}
})
