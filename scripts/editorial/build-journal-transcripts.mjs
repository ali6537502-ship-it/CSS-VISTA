import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const sourceDir = resolve(root, 'public/opinions/transcripts')
const target = resolve(root, 'src/data/journalTranscripts.generated.json')
const index = JSON.parse(readFileSync(resolve(sourceDir, 'index.json'), 'utf8'))
const articles = []
const slugs = new Set()
const sourceImages = new Set()

if (index.schemaVersion !== 1 || !Array.isArray(index.articles) || !index.articles.length) {
  throw new Error('Journal transcript index is missing or has an unsupported schema.')
}
for (const file of index.articles) {
  if (!/^opinion-[a-z0-9-]+\.json$/.test(file)) throw new Error(`Unsafe Journal transcript filename: ${file}`)
  const article = JSON.parse(readFileSync(resolve(sourceDir, file), 'utf8'))
  if (article.schemaVersion !== 1 || article.slug !== file.replace(/\.json$/, '') || slugs.has(article.slug)) {
    throw new Error(`Missing, mismatched or duplicate Journal slug in ${file}`)
  }
  slugs.add(article.slug)
  for (const key of ['title', 'author', 'publishedOn', 'dateEvidence', 'body', 'transcriptionMethod']) {
    if (typeof article[key] !== 'string' || !article[key].trim()) throw new Error(`${file} lacks ${key}`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(article.publishedOn) || Number.isNaN(Date.parse(article.publishedOn))) {
    throw new Error(`${file} has an invalid original date.`)
  }
  const bodyHash = createHash('sha256').update(article.body).digest('hex')
  if (article.transcriptBodySha256 !== bodyHash) {
    throw new Error(`${file}: archived reading body changed; review the transcript and record its new fingerprint explicitly.`)
  }
  if (!Array.isArray(article.editorialNotes)) throw new Error(`${file} lacks a separate editorial-note inventory.`)
  const noteIds = new Set()
  for (const note of article.editorialNotes) {
    if (typeof note.id !== 'string' || !/^[a-z0-9-]+$/.test(note.id) || noteIds.has(note.id) || !note.title?.trim() || !note.body?.trim()) {
      throw new Error(`${file} has an invalid or duplicate editorial clarification.`)
    }
    noteIds.add(note.id)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(note.issuedOn) || Number.isNaN(Date.parse(note.issuedOn)) || !Array.isArray(note.sources)) {
      throw new Error(`${file} has an undated clarification or missing source inventory.`)
    }
    if (!note.sources.length && !note.verification?.trim()) throw new Error(`${file} has an unsupported editorial clarification.`)
    for (const source of note.sources) {
      const url = new URL(source.url)
      if (url.protocol !== 'https:' || url.username || url.password || !source.label?.trim() || !source.verifiedOn || source.httpStatus !== 200 || !/^[a-f0-9]{64}$/.test(source.responseSha256)) {
        throw new Error(`${file} has an unverified or unsafe editorial source.`)
      }
      // A DOI's public abstract/indicator metadata can be checked at its
      // official API while the human citation remains on the primary page.
      // Identify that endpoint and its narrower scope instead of implying
      // that its response fingerprint belongs to the full cited document.
      if (source.verificationUrl) {
        const endpoint = new URL(source.verificationUrl)
        if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || !source.verificationScope?.trim()) {
          throw new Error(`${file} has an unsafe or unexplained source-verification endpoint.`)
        }
      }
    }
  }
  if (!Array.isArray(article.imageSources) || !article.imageSources.length) throw new Error(`${file} lacks image evidence.`)
  for (const [i, source] of article.imageSources.entries()) {
    if (source.page !== i + 1 || !/^\/opinions\/opinion-[a-z0-9-]+-p\d+\.jpg$/.test(source.image) || sourceImages.has(source.image)) {
      throw new Error(`${file} has a duplicate, unordered or unsafe source image.`)
    }
    sourceImages.add(source.image)
    const actual = createHash('sha256').update(readFileSync(resolve(root, `public${source.image}`))).digest('hex')
    if (actual !== source.sha256) throw new Error(`${file}: source image changed; recheck its transcription before rebuilding.`)
  }
  if (article.sourceType !== 'existing-owner-repository-page-images') throw new Error(`${file} lacks original source provenance.`)
  if (article.originalPublicationUrl !== null && !/^https:\/\//.test(article.originalPublicationUrl)) throw new Error(`${file} has an unsafe publication URL.`)
  articles.push(article)
}
const serialized = `${JSON.stringify({ schemaVersion: 1, articles }, null, 2)}\n`
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== serialized) throw new Error('Bundled Journal transcripts are stale. Run node scripts/editorial/build-journal-transcripts.mjs')
  console.log(`Journal transcripts checked: ${articles.length} articles, ${sourceImages.size} unchanged source images.`)
} else {
  writeFileSync(target, serialized)
  console.log(`Bundled ${articles.length} Journal transcripts from ${sourceImages.size} unchanged original images.`)
}
