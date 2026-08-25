import { createHash } from 'node:crypto'
import { access, open, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGeneratedPastPapers } from './lib/past-paper-registry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const publicDir = join(root, 'public')
const manifest = JSON.parse(await readFile(join(publicDir, 'resource-manifest.json'), 'utf8'))
const remote = JSON.parse(await readFile(join(publicDir, 'remote-library-manifest.json'), 'utf8'))
const notesSource = await readFile(join(root, 'src', 'data', 'notes.ts'), 'utf8')
const notesPage = await readFile(join(root, 'src', 'pages', 'NotesLibrary.tsx'), 'utf8')
const paperPage = await readFile(join(root, 'src', 'pages', 'PastPapers.tsx'), 'utf8')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(manifest.schemaVersion === 1, 'Resource manifest schema version is missing')
assert(manifest.resourceCount === manifest.resources.length, 'Resource manifest count does not match its records')
assert(new Set(manifest.resources.map((item) => item.id)).size === manifest.resources.length, 'Resource IDs must be unique')
assert(new Set(manifest.resources.map((item) => item.path)).size === manifest.resources.length, 'Resource paths must be unique')
assert(!notesSource.includes("price: 'PKR") && !notesSource.includes('price: "PKR'), 'Public notes data must not contain numeric prices')
assert(notesSource.includes("notesPriceLabel = 'Contact for Price'"), 'Exact public notes price label is missing')
assert(notesPage.includes('{notesPriceLabel}'), 'Notes Library does not render the central price label')
assert(paperPage.includes('View Paper') && paperPage.includes('Download PDF'), 'Past-paper cards require separate View Paper and Download PDF actions')

for (const item of manifest.resources) {
  assert(item.access === 'public' && item.availability === 'available', `Invalid access state: ${item.path}`)
  const path = join(publicDir, item.path.replace(/^\/+/, ''))
  await access(path)
  const details = await stat(path)
  assert(details.size === item.sizeBytes, `Size mismatch: ${item.path}`)
  const digest = createHash('sha256').update(await readFile(path)).digest('hex')
  assert(digest === item.sha256, `Hash mismatch: ${item.path}`)
  if (item.mimeType === 'application/pdf') {
    assert(item.pageCount > 0, `Missing PDF page count: ${item.path}`)
    const handle = await open(path, 'r')
    try {
      const signature = Buffer.alloc(5)
      await handle.read(signature, 0, 5, 0)
      assert(signature.toString('ascii') === '%PDF-', `Invalid PDF signature: ${item.path}`)
    } finally {
      await handle.close()
    }
  }
}

const papers = (await loadGeneratedPastPapers(root)).filter((paper) => paper.fileUrl)
assert(papers.length === 782, `Expected 782 registered past papers, received ${papers.length}`)
assert(papers.every((paper) => manifest.resources.some((item) => item.path === paper.fileUrl && item.id === paper.id)), 'Every registered past paper must appear in the resource manifest')
assert(remote.fileCount === 790 && remote.files.length === 790, 'Remote library must contain 782 papers and 8 authorised notes samples')
assert(!remote.files.some((item) => item.path.endsWith('/PMS-Islamic-Studies-2020.pdf')), 'Corrupt legacy PMS record must not be published')

console.log(`Resource integrity audit passed: ${manifest.resources.length} resources, ${papers.length} past papers and ${remote.files.length} remote PDFs verified.`)
