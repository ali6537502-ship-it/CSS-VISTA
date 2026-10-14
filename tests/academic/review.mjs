// Private development utility: no provider calls, database writes or release activation.
import {createHash} from 'node:crypto'
import {closeSync, fchmodSync, lstatSync, openSync, readFileSync, realpathSync, readdirSync, writeFileSync} from 'node:fs'
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const catalogue = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url)))
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const operationFeatures = {sentence: 'sentence', paragraph: 'paragraph', argument: 'argumentation', analysis: 'analysis', essay: 'essay', precis: 'precis', tutor: 'tutor'}
const commonCriteria = [
  ['meaning_preserved', 'Preserves intended meaning and does not invent student claims.'],
  ['academically_correct', 'Criticism and explanations are academically correct, including unconventional correct answers.'],
  ['actionable_hint', 'Feedback offers specific, usable instructional help.'],
  ['evidence_boundaries_respected', 'Unverified claims stay unverified; no invented facts, citations or official marks.'],
  ['premature_solution_avoided', 'Feedback supports independent work without prematurely supplying a finished solution.'],
]
const assert = (condition, message) => { if (!condition) throw Error(message) }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const nonempty = value => typeof value === 'string' && value.trim().length > 0
const textLeaves = value => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(textLeaves) : []
const synthetic = value => /TEST|fixture|synthetic/i.test(value)

export function reviewCriteria(caseId) {
  const item = catalogue.cases.find(c => c.id === caseId)
  assert(item && item.feature !== 'handwriting_extract', 'OCR requires a separate genuine-image and ground-truth review; unknown cases are not accepted.')
  return [...commonCriteria.map(([id, criterion]) => ({id, criterion})),
    ...item.review_expectations.map((criterion, i) => ({id: `expectation_${i + 1}`, criterion})),
    ...item.unacceptable_behavior.map((criterion, i) => ({id: `safeguard_${i + 1}`, criterion: `Confirm this safeguard: ${criterion}`}))]
}

export function readPacket(raw) {
  const packet = JSON.parse(raw)
  const item = catalogue.cases.find(c => c.id === packet.case_id)
  reviewCriteria(packet.case_id)
  assert(packet.status === 'REQUIRES_HUMAN_ACADEMIC_REVIEW' && packet.case_version === catalogue.version && packet.release_approval === false, 'Use an unchanged current private export, without release approval.')
  assert(uuid.test(packet.operation_id) && /^resp_[A-Za-z0-9_-]+$/.test(packet.provider_response_id || ''), 'Missing saved operation identity.')
  const prompt = item.feature === 'tutor' ? 'ask-vista-scoped-v1' : item.feature === 'precis' ? 'precis-source-v1'
    : item.context?.lesson_id || ['argument', 'analysis', 'essay'].includes(item.feature) ? 'skills-instruction-v1' : 'writing-feedback-v1'
  assert(packet.provider === 'openai' && packet.operation_feature === operationFeatures[item.feature] && packet.prompt_version === prompt, 'Provider, operation scope or assessment version differs from the case.')
  for (const model of [packet.configured_model, packet.reported_model]) assert(nonempty(model) && !synthetic(model), 'Test or missing model metadata is not academic evidence.')
  assert(!synthetic(packet.provider_response_id), 'Test transports are not academic evidence.')
  assert(same(packet.expectations, item.review_expectations) && same(packet.unacceptable_behavior, item.unacceptable_behavior), 'Case criteria differ from the reviewed catalogue.')
  const input = packet.source_snapshot
  assert(input && typeof input === 'object', 'Missing immutable source snapshot.')
  const actual = input.responses?.[item.stage ?? ''] ?? (item.feature === 'tutor' ? input.question : input.student_text)
  assert(actual === item.student_text, 'Student text differs from the catalogue case.')
  if (item.context?.lesson_id) assert(input.source?.id === item.context.lesson_id && input.level === item.level && input.stage === item.stage, 'Guided lesson, level or activity differs.')
  if (item.feature === 'essay') assert(input.source?.id === item.context.theme, 'Essay theme differs.')
  if (item.feature === 'precis') assert(input.original === item.context.passage && input.title === item.context.title, 'Original passage or title differs.')
  if (item.feature === 'tutor') assert(input.context?.id === item.context.context_id && (input.context.authoritative_text ?? input.context.text ?? '').includes(item.context.source_text), 'Bounded tutor source differs.')
  assert(packet.validated_feedback && typeof packet.validated_feedback === 'object' && textLeaves(packet.validated_feedback).some(nonempty), 'Missing saved feedback.')
  return {packet, sha256: createHash('sha256').update(raw).digest('hex')}
}

export function reviewTemplate(raw) {
  const {packet, sha256} = readPacket(raw)
  return {
    version: 'pro-academic-human-review-v1', case_id: packet.case_id, case_version: catalogue.version,
    operation_id: packet.operation_id, provider_response_id: packet.provider_response_id, packet_sha256: sha256,
    reviewer: null, reviewed_on: null,
    actual_provider_request_confirmed: null, source_snapshot_compared: null,
    checks: reviewCriteria(packet.case_id).map(c => ({...c, outcome: null, explanation: null, feedback_excerpt: null})),
    limitations: [], release_approval: false,
  }
}

export function assessReview(raw, review) {
  const template = reviewTemplate(raw)
  const {packet} = readPacket(raw)
  for (const key of ['version', 'case_id', 'case_version', 'operation_id', 'provider_response_id', 'packet_sha256', 'release_approval']) assert(review[key] === template[key], 'Review does not match the immutable packet and current case.')
  assert(Array.isArray(review.checks) && review.checks.length === template.checks.length, 'Every criterion must be reviewed; do not omit unfavorable checks.')
  const feedback = textLeaves(packet.validated_feedback)
  for (let i = 0; i < template.checks.length; i++) {
    const check = review.checks[i], expected = template.checks[i]
    assert(check.id === expected.id && check.criterion === expected.criterion, 'Review criteria were changed or reordered.')
    assert([null, 'met', 'not_met', 'uncertain'].includes(check.outcome), 'Use met, not_met or uncertain; blank checks remain unreviewed.')
    if (check.outcome !== null) {
      assert(nonempty(check.explanation) && nonempty(check.feedback_excerpt), 'Each decision needs a reason and an exact feedback excerpt.')
      assert(feedback.some(text => text.includes(check.feedback_excerpt)), 'Review excerpt does not occur in the saved feedback.')
    }
  }
  assert(Array.isArray(review.limitations) && review.limitations.every(nonempty), 'Record limitations as a list of observations.')
  for (const key of ['actual_provider_request_confirmed', 'source_snapshot_compared']) assert([null, true, false].includes(review[key]), 'Provider and source attestations must be explicit.')
  if (review.reviewer !== null) assert(nonempty(review.reviewer), 'Name the human reviewer.')
  if (review.reviewed_on !== null) {
    assert(typeof review.reviewed_on === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(review.reviewed_on), 'Use a UTC review timestamp.')
    const date = new Date(review.reviewed_on)
    assert(!Number.isNaN(date.getTime()) && date.toISOString().replace('.000Z', 'Z') === review.reviewed_on.replace('.000Z', 'Z') && date.getTime() <= Date.now(), 'Invalid or future review timestamp.')
  }
  let status = 'UNREVIEWED'
  if (review.reviewer && review.reviewed_on && review.checks.every(c => c.outcome !== null)) {
    status = review.actual_provider_request_confirmed !== true || review.source_snapshot_compared !== true ? 'EVIDENCE_UNCONFIRMED'
      : review.checks.some(c => c.outcome === 'not_met') ? 'CORRECTION_REQUIRED'
      : review.checks.some(c => c.outcome === 'uncertain') ? 'REVIEW_UNCERTAIN' : 'REVIEWED_NO_ADVERSE_FINDINGS'
  }
  return {case_id: packet.case_id, operation_id: packet.operation_id, model: packet.reported_model, configured_model: packet.configured_model, prompt_version: packet.prompt_version, status,
    reviewer: review.reviewer, reviewed_on: review.reviewed_on,
    unresolved_checks: review.checks.filter(c => c.outcome !== 'met').map(c => c.id), limitations: review.limitations}
}

export function coverageReport(packetRaws, reviews) {
  const packets = packetRaws.map(raw => ({raw, ...readPacket(raw)}))
  const operations = new Set(), responses = new Set(), reviewMap = new Map()
  for (const {packet} of packets) {
    assert(!operations.has(packet.operation_id) && !responses.has(packet.provider_response_id), 'Duplicate operation or provider response would inflate review coverage.')
    operations.add(packet.operation_id); responses.add(packet.provider_response_id)
  }
  for (const review of reviews) {
    assert(operations.has(review.operation_id), 'Orphan review has no corresponding saved packet.')
    assert(!reviewMap.has(review.operation_id), 'Multiple reviews of one operation are ambiguous; retain a single authoritative sidecar per report.')
    reviewMap.set(review.operation_id, review)
  }
  const trials = packets.map(({raw, packet}) => reviewMap.has(packet.operation_id) ? assessReview(raw, reviewMap.get(packet.operation_id))
    : {case_id: packet.case_id, operation_id: packet.operation_id, model: packet.reported_model, configured_model: packet.configured_model, prompt_version: packet.prompt_version, status: 'UNREVIEWED', reviewer: null, reviewed_on: null, unresolved_checks: reviewCriteria(packet.case_id).map(c => c.id), limitations: []})
  const cases = catalogue.cases.map(item => {
    const attempts = trials.filter(t => t.case_id === item.id)
    return {case_id: item.id, feature: item.feature, status: item.feature === 'handwriting_extract' ? 'GENUINE_IMAGE_REVIEW_BLOCKED'
      : !attempts.length ? 'MISSING_TRIAL' : attempts.every(t => t.status === 'REVIEWED_NO_ADVERSE_FINDINGS') ? 'REVIEWED_NO_ADVERSE_FINDINGS' : 'UNRESOLVED_TRIALS', trials: attempts}
  })
  const groups = new Map()
  for (const trial of trials) {
    const key = JSON.stringify([trial.configured_model, trial.model, trial.prompt_version])
    if (!groups.has(key)) groups.set(key, {configured_model: trial.configured_model, reported_model: trial.model, prompt_version: trial.prompt_version, trials: []})
    groups.get(key).trials.push({case_id: trial.case_id, operation_id: trial.operation_id, status: trial.status})
  }
  return {status: 'ACADEMIC_REVIEW_INCOMPLETE', case_version: catalogue.version, release_approval: false,
    provider_access_verified_by_this_tool: false, academic_correctness_verified_by_this_tool: false,
    coverage_is_aggregate_not_single_model_validation: true,
    total_cases: cases.length, saved_trials: trials.length,
    reviewed_cases_without_adverse_findings: cases.filter(c => c.status === 'REVIEWED_NO_ADVERSE_FINDINGS').length,
    missing_cases: cases.filter(c => c.status === 'MISSING_TRIAL').map(c => c.case_id),
    unresolved_cases: cases.filter(c => c.status === 'UNRESOLVED_TRIALS').map(c => c.case_id),
    genuine_image_cases_blocked: cases.filter(c => c.status === 'GENUINE_IMAGE_REVIEW_BLOCKED').map(c => c.case_id),
    cases, model_and_prompt_groups: [...groups.values()], remaining_release_checks: ['Real model capability and cost verification', 'Genuine image and ground-truth trials', 'Host cleanup verification', 'Approved owner policies and separate release instruction']}
}

function privatePath(path, directory = false) {
  const actual = realpathSync(path), rel = relative(repository, actual)
  assert(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel), 'Review files must stay outside the repository and public deployment.')
  for (let current = resolve(path); ; current = dirname(current)) {
    assert(!lstatSync(current).isSymbolicLink(), 'Review paths must not traverse symlinks.')
    if (dirname(current) === current) break
  }
  assert(!lstatSync(path).isSymbolicLink() && (directory ? lstatSync(actual).isDirectory() : lstatSync(actual).isFile()), 'Use private regular files and directories, without symlinks.')
  return actual
}
function readPrivate(path) {
  const actual = privatePath(path)
  assert(lstatSync(actual).size <= 1024 * 1024, 'Private review file exceeds the one MiB bound.')
  return readFileSync(actual, 'utf8')
}
function readDirectory(path, json = false) {
  const directory = privatePath(path, true), names = readdirSync(directory).filter(name => name.endsWith('.json')).sort()
  assert(names.length <= 1000, 'Review directory exceeds the trial bound.')
  return names.map(name => {const raw = readPrivate(resolve(directory, name)); return json ? JSON.parse(raw) : raw})
}
function writePrivate(path, value) {
  const directory = privatePath(dirname(resolve(path)), true)
  assert(resolve(path) === resolve(directory, path.split(sep).at(-1)), 'Use the resolved private output directory.')
  const descriptor = openSync(path, 'wx', 0o600)
  try {fchmodSync(descriptor, 0o600); writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`)} finally {closeSync(descriptor)}
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [, , command, ...args] = process.argv
    if (command === 'template' && args.length === 2) writePrivate(args[1], reviewTemplate(readPrivate(args[0])))
    else if (command === 'report' && args.length === 3) writePrivate(args[2], coverageReport(readDirectory(args[0]), readDirectory(args[1], true)))
    else throw Error('Usage: node tests/academic/review.mjs template PRIVATE_PACKET PRIVATE_REVIEW | report PRIVATE_PACKETS_DIR PRIVATE_REVIEWS_DIR PRIVATE_REPORT')
    console.log('Created a private review file. No AI call or release approval occurred.')
  } catch {console.error('Review unavailable: check private paths, matching packet hashes, complete criteria and bounded evidence. Existing files are never overwritten.'); process.exitCode = 2}
}
