import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const publicRoot = join(root, 'public')
const failures = []
const check = (condition, message) => { if (!condition) failures.push(message) }
const json = async (path) => JSON.parse(await readFile(join(publicRoot, path), 'utf8'))
const normalize = (value) => value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

const index = await json('css-subject-mcqs/index.json')
const report = await json('css-subject-mcqs/import-report.json')
const seenQuestions = new Set()
let total = 0
for (const subject of index.subjects) {
  const bank = await json(`css-subject-mcqs/${subject.file}`)
  check(bank.length === subject.count, `${subject.name}: index count does not match shard`)
  check(bank.length > 0, `${subject.name}: published with an empty bank`)
  total += bank.length
  for (const item of bank) {
    check(typeof item.question === 'string' && normalize(item.question).length >= 12, `${subject.name}: malformed question ${item.id}`)
    check(Array.isArray(item.options) && item.options.length === 4 && new Set(item.options.map(normalize)).size === 4, `${subject.name}: malformed options ${item.id}`)
    check(Number.isInteger(item.answer) && item.answer >= 0 && item.answer <= 3, `${subject.name}: invalid answer ${item.id}`)
    const key = normalize(item.question)
    check(!seenQuestions.has(key), `${subject.name}: duplicate normalized question ${item.id}`)
    seenQuestions.add(key)
  }
}
check(total === report.accepted, 'MCQ report accepted total does not match published shards')
check(total === 50482, `Expected audited import total 50,482; found ${total}`)
check(index.subjects.length === 44, `Expected 44 supplied MCQ subjects; found ${index.subjects.length}`)

const affairs = await json('recent-affairs/batch-2026-07-11_2026-08-16.json')
check(affairs.oneLiners.length === 135, 'Recent-affairs one-liner count changed')
check(affairs.mcqs.length === 726, 'Recent-affairs MCQ count changed')
check(affairs.mcqs.every((item) => item.source && (item.background || item.whyItMatters || item.explanation)), 'A current-affairs Details record is disconnected')
check(affairs.mcqs.every((item) => item.updatedAt === '16 August 2026'), 'A new current-affairs MCQ is missing its upload update date')

const syllabus = await json('fpsc-syllabus.json')
check(syllabus.subjects.length === 52, 'Official FPSC subject/alternative count changed')
check(syllabus.subjects.filter((item) => item.designation === 'optional').length === 45, 'Official FPSC optional subject count changed')
check(new Set(syllabus.subjects.filter((item) => item.group).map((item) => item.group)).size === 7, 'Official FPSC optional groups are incomplete')

const magazine = await readFile(join(publicRoot, 'magazines/css-vista-current-affairs-weekly-2026-08-15.pdf'))
check(magazine.subarray(0, 5).toString() === '%PDF-', 'Weekly magazine is not a valid PDF payload')

for (const folder of ['internal-security', 'cpec', 'indus-waters', 'pakistan-india-relations', 'biological-theory-crime', 'legal-ethical-investigation', 'iqbal-political-thought', 'social-contract-theorists', 'state-system', 'french-revolution']) {
  for (let page = 1; page <= 3; page += 1) {
    try { await stat(join(publicRoot, `note-previews/${folder}/page-${page}.webp`)) }
    catch { failures.push(`Missing protected note preview: ${folder}/page-${page}.webp`) }
  }
}

const mockSource = await readFile(join(root, 'src/pages/gk/GKQuiz.tsx'), 'utf8')
check(mockSource.includes("if (m === 'mpt-mock') r.qs = r.qs.slice(0, 200)"), 'MPT resolver does not retain the full 200-question paper')
check(mockSource.includes('timeSec: 200 * 60'), 'MPT 200-minute timer is missing')
check(mockSource.includes('fullPaper.length !== 200 || uniqueQuestions(fullPaper).length !== 200'), 'MPT in-paper duplicate guard is missing')
check(mockSource.includes('qs.length !== 100'), 'PMS 100-question guard is missing')

const productionEnvironment = await readFile(join(root, '.env.production'), 'utf8')
check(productionEnvironment.includes('VITE_SUPABASE_URL=https://puxdxzvzzwqglxjtiyre.supabase.co'), 'Production Supabase URL is missing')
check(productionEnvironment.includes('VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_'), 'Production Supabase publishable key is missing')
check(!productionEnvironment.includes('service_role'), 'A forbidden Supabase service-role key is exposed to Vite')

const realtimeProvider = await readFile(join(root, 'src/components/SiteContentProvider.tsx'), 'utf8')
check(realtimeProvider.includes(".channel('css-vista-published-content')"), 'Supabase Realtime content subscription is missing')
check(realtimeProvider.includes("filter: 'id=eq.published'"), 'Realtime subscription is not scoped to published content')
check(realtimeProvider.includes("client.rpc('is_css_vista_admin')"), 'Realtime is not restricted to authenticated administrators')

const storageMigration = await readFile(join(root, 'supabase/migrations/202608160001_realtime_content_and_protected_documents.sql'), 'utf8')
check(storageMigration.includes("'protected-academic-samples'"), 'Private academic sample bucket migration is missing')
check(storageMigration.includes('to authenticated'), 'Protected academic sample RLS is missing')

if (failures.length) {
  console.error(`Functional QA failed (${failures.length}):`)
  failures.forEach((failure) => console.error(`  - ${failure}`))
  process.exit(1)
}

console.log(`Functional QA passed: ${total.toLocaleString()} unique subject MCQs across ${index.subjects.length} subjects, official syllabus hierarchy, recent-affairs Details, magazine, notes, and mock guards.`)
