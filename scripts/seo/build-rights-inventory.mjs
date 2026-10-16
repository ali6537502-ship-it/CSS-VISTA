import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { books as hostedBooks } from '../../src/data/books.ts'

const root = new URL('../../', import.meta.url)
const json = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const localAsset = async (url) => {
  if (!url.startsWith('/') || url.includes('..')) throw new Error(`Unsafe asset path: ${url}`)
  const bytes = await readFile(new URL(`public${url}`, root))
  return { url, bytes: bytes.length, sha256: hash(bytes) }
}
const library = await json('public/book-summaries/index.json')
const cache = await json('scripts/book_summary_cover_cache.json')
const transcriptIndex = await json('public/opinions/transcripts/index.json')
const inventory = {
  reviewedOn: '2026-10-15',
  scope: 'Existing repository material only; no external copies fetched. Source attribution and API availability do not establish copyright permission. No private permission records were available.',
  rightsStatus: 'owner-permission-evidence-pending',
  books: await Promise.all(library.books.map(async (book) => ({
    slug: book.slug, title: book.title, author: book.author,
    url: `https://www.css-vista.com/book-summaries/${book.slug}`,
    summary: {
      source: 'public/book-summaries/index.json',
      bodySha256: hash(book.body),
      provenance: 'Importer describes owner-provided summaries; this does not independently verify authorship or permissions.',
      permissionEvidence: null,
      action: 'Owner confirms original analysis, contributor rights and basis for any quoted passages; quotation verification is recorded separately.',
    },
    cover: {
      ...await localAsset(book.cover), provider: book.coverProvider,
      recordUrl: book.coverSource, cachedOriginalImageUrl: cache[book.slug]?.imageUrl ?? null,
      permissionEvidence: null,
      action: 'Confirm applicable display/reproduction terms with the rightsholder or use an owner-created/licensed cover. A catalog/API record is provenance, not a licence.',
    },
  }))),
  journalImages: [],
  optionalSourceDocuments: [],
  otherHostedPublications: [],
  providerGuidance: [{
    url: 'https://openlibrary.org/dev/docs/api/covers',
    checkedOn: '2026-10-15',
    observation: 'Official API guidance describes cover display, attribution links and bulk access limits. It does not establish this project’s rightsholder permissions.',
  }],
}
for (const file of transcriptIndex.articles) {
  const article = await json(`public/opinions/transcripts/${file}`)
  for (const image of article.imageSources) {
    inventory.journalImages.push({
      article: article.slug, author: article.author, ...await localAsset(image.image),
      originalPublisher: article.originalPublisher, originalPublicationUrl: article.originalPublicationUrl,
      permissionEvidence: null,
      action: 'Confirm author/publication agreement and any photograph or other embedded third-party image rights. Accessibility transcription does not establish those permissions.',
    })
  }
}
for (const file of (await readdir(new URL('data-archive/optional-notes/', root))).filter((file) => file.endsWith('.docx')).sort()) {
  const path = `data-archive/optional-notes/${file}`
  const bytes = await readFile(new URL(path, root))
  inventory.optionalSourceDocuments.push({
    path, bytes: bytes.length, sha256: hash(bytes), permissionEvidence: null,
    action: 'Confirm original authorship/contributor permission and rights for any reproduced extracts or illustrations. Preserve author source and reviewed corrections separately.',
  })
}
for (const book of hostedBooks) {
  inventory.otherHostedPublications.push({
    id: book.id, title: book.title, assertedByline: book.subtitle,
    destination: book.file, accountRequired: Boolean(book.accountRequired),
    localDocument: book.file.endsWith('.pdf') ? await localAsset(book.file) : null,
    cover: await localAsset(book.cover), permissionEvidence: null,
    action: 'Confirm owner authorship and embedded-asset rights. Account-gated material was not fetched or republished.',
  })
}
const next = `${JSON.stringify(inventory, null, 2)}\n`
const target = new URL('docs/seo/editorial/rights-inventory.json', root)
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8').catch(() => '') !== next) throw new Error('Rights inventory is stale. Run node scripts/seo/build-rights-inventory.mjs.')
} else await writeFile(target, next)
console.log(`Rights inventory ${process.argv.includes('--check') ? 'checked' : 'written'}: ${inventory.books.length} summaries/covers, ${inventory.journalImages.length} archive images, ${inventory.optionalSourceDocuments.length} DOCX sources, ${inventory.otherHostedPublications.length} other publication records. Permissions remain unverified.`)
