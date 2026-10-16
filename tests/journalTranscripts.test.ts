import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import test from 'node:test'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { opinions } from '../src/data/books.ts'

const bundle = JSON.parse(readFileSync(new URL('../src/data/journalTranscripts.generated.json', import.meta.url), 'utf8')) as {
  articles: { slug: string; title: string; author: string; publishedOn: string; body: string; transcriptBodySha256: string; originalPublisher: string | null; originalPublicationUrl: string | null; imageSources: { image: string }[]; editorialNotes: { id: string; issuedOn: string; body: string; sources: { url: string; verifiedOn: string; httpStatus: number; responseSha256: string; locator?: string; verificationUrl?: string; verificationScope?: string }[]; verification?: string }[] }[]
}

test('every preserved Journal article has matching text, byline, image order and original archive date', () => {
  assert.deepEqual(bundle.articles.map((article) => article.slug), opinions.map((article) => article.slug))
  for (const opinion of opinions) {
    const transcript = bundle.articles.find((article) => article.slug === opinion.slug)!
    assert.equal(transcript.title, opinion.title)
    assert.equal(transcript.author, opinion.author)
    assert.deepEqual(transcript.imageSources.map((source) => source.image), opinion.pages)
    const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${transcript.publishedOn}T12:00:00Z`))
    assert.equal(date, opinion.date)
  }
})

test('multi-column transcripts reunite source sentences in reading order', () => {
  const body = (slug: string) => bundle.articles.find((article) => article.slug === slug)!.body
  assert.ok(body('opinion-power-without-peace').includes('doing so limits its military freedom of action.'))
  assert.ok(body('opinion-the-next-48-hours').includes('It is acting like a state that knows a diplomatic collapse'))
  assert.ok(body('opinion-harassers-calculus').includes('punishes the complainant more reliably than the accused.'))
  assert.ok(body('opinion-harassers-calculus').includes('certainty, severity and celerity of punishment.'))
  assert.ok(body('opinion-eid-eve-chaman-phatak').endsWith('We failed it long before the bomber did.'))
  assert.ok(body('opinion-machines-at-war').endsWith('tend to run until someone pulls the switch.'))
})

test('external publication is not asserted without a verified original publication URL', () => {
  for (const article of bundle.articles) {
    if (!article.originalPublicationUrl) assert.equal(article.originalPublisher, null)
  }
  assert.equal(opinions.find((article) => article.slug === 'opinion-machines-at-war')?.outlet, 'Opinion')
})

test('dated clarifications preserve the original Pacific and Eid text and remain separate from historical publication dates', () => {
  const expected = {
    'opinion-ali-hassan': 'ab108b401499e8a05574b3d4ad1595ba90978360cdf8af690c4fa6f909ea3af3',
    'opinion-eid-eve-chaman-phatak': 'b544c6b587313ff63882bbeaf2a8a464866729e6fa5624c5a3b7a74f68580c72',
  }
  for (const [slug, bodyHash] of Object.entries(expected)) {
    const article = bundle.articles.find((entry) => entry.slug === slug)!
    assert.equal(createHash('sha256').update(article.body).digest('hex'), bodyHash)
    assert.equal(article.transcriptBodySha256, bodyHash)
    assert.ok(article.editorialNotes.length > 0)
    for (const note of article.editorialNotes) assert.ok(note.issuedOn > article.publishedOn)
  }
  const pacific = bundle.articles.find((article) => article.slug === 'opinion-ali-hassan')!
  const clarification = pacific.editorialNotes.find((note) => note.id === 'ambient-temperature-wet-bulb-clarification')!
  assert.equal(clarification.sources[0].url, 'https://www.weather.gov/source/zhu/ZHU_Training_Page/definitions/dry_wet_bulb_definition/dry_wet_bulb.html')
  assert.equal(clarification.sources[0].httpStatus, 200)
  assert.match(clarification.sources[0].responseSha256, /^[a-f0-9]{64}$/)
  assert.ok(clarification.body.includes('does not independently verify the reported Jacobabad temperature'))
})

test('Eid calendar clarification records Sunday without inventing a replacement event date', () => {
  assert.equal(new Date(Date.UTC(2026, 4, 24)).getUTCDay(), 0)
  assert.equal(new Date(Date.UTC(2026, 4, 25)).getUTCDay(), 1)
  const eid = bundle.articles.find((article) => article.slug === 'opinion-eid-eve-chaman-phatak')!
  const note = eid.editorialNotes.find((entry) => entry.id === 'may-2026-calendar-clarification')!
  assert.equal(eid.publishedOn, '2026-05-25')
  assert.ok(note.verification?.includes('Date.UTC(2026, 4, 24)'))
  assert.ok(note.body.includes('This clarification does not assign a different event date.'))
})

test('historical climate figures retain the observed study period and regional case-study scope', () => {
  const article = bundle.articles.find((entry) => entry.slug === 'opinion-ali-hassan')!
  const note = article.editorialNotes.find((entry) => entry.id === 'study-period-and-punjab-case-context')!
  assert.ok(note.body.includes('2010–2017') && note.body.includes('2018–2026'))
  assert.ok(note.body.includes('15 stations') && note.body.includes('northern monsoon belt'))
  assert.ok(note.body.includes('Habib et al. (2022)') && note.body.includes('case-study'))
  const study = note.sources[0]
  assert.equal(study.url, 'https://doi.org/10.1155/2019/8281201')
  assert.equal(study.verificationUrl, 'https://api.crossref.org/works/10.1155/2019/8281201')
  assert.match(study.verificationScope!, /abstract endpoint, not a fresh full-paper download/)
  assert.match(note.sources[1].locator!, /printed page 43 \/ PDF page 55/)
})

test('workforce and violence statistics cannot silently become a current population-wide prevalence estimate', () => {
  const article = bundle.articles.find((entry) => entry.slug === 'opinion-harassers-calculus')!
  const note = article.editorialNotes.find((entry) => entry.id === 'participation-and-violence-measurement-context')!
  assert.match(note.body, /ever-married women aged 15–49/)
  assert.ok(note.body.includes('neither sought help nor told anyone') && note.body.includes('2017–2018'))
  assert.match(note.body, /not women’s share of the entire workforce/)
  assert.match(note.sources[1].locator!, /Table 16.16/)
  const complaints = article.editorialNotes.find((entry) => entry.id === 'complaint-reporting-period-context')!
  assert.match(complaints.body, /2024–2025/)
  assert.match(complaints.body, /does not establish a calendar-2024/)
  assert.ok(!article.body.includes(note.body), 'The clarification stays separate from the original article')
})

test('procurement and a Senate request are distinguished from findings about a specific strike', () => {
  const article = bundle.articles.find((entry) => entry.slug === 'opinion-machines-at-war')!
  const note = article.editorialNotes.find((entry) => entry.id === 'ai-adoption-and-strike-evidence-scope')!
  assert.match(note.body, /NATO adoption/)
  assert.match(note.body, /11 March 2026/)
  assert.match(note.body, /not a finding that AI selected the school/)
  assert.equal(new URL(note.sources[0].url).hostname, 'www.nato.int')
  assert.equal(new URL(note.sources[1].url).hostname, 'www.foreign.senate.gov')
  assert.ok(note.issuedOn > article.publishedOn, 'A later clarification does not change the historical publication date')
})

test('the real generator refuses unsafe or unexplained verification endpoints', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'cssv-journal-source-'))
  const root = fileURLToPath(new URL('..', import.meta.url))
  const script = join(fixture, 'scripts/editorial/build-journal-transcripts.mjs')
  const sourceFile = join(fixture, 'public/opinions/transcripts/opinion-ali-hassan.json')
  mkdirSync(dirname(script), { recursive: true })
  mkdirSync(dirname(sourceFile), { recursive: true })
  mkdirSync(join(fixture, 'src/data'), { recursive: true })
  copyFileSync(join(root, 'scripts/editorial/build-journal-transcripts.mjs'), script)
  const original = JSON.parse(readFileSync(join(root, 'public/opinions/transcripts/opinion-ali-hassan.json'), 'utf8'))
  writeFileSync(join(dirname(sourceFile), 'index.json'), JSON.stringify({ schemaVersion: 1, articles: ['opinion-ali-hassan.json'] }))
  for (const image of original.imageSources) copyFileSync(join(root, `public${image.image}`), join(fixture, `public${image.image}`))
  try {
    for (const patch of [{ verificationUrl: 'http://api.example.test/record' }, { verificationScope: '' }]) {
      const article = structuredClone(original)
      Object.assign(article.editorialNotes.find((note: { id: string }) => note.id === 'study-period-and-punjab-case-context').sources[0], patch)
      writeFileSync(sourceFile, JSON.stringify(article))
      const result = spawnSync(process.execPath, [script], { encoding: 'utf8' })
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /unsafe or unexplained source-verification endpoint/)
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})
