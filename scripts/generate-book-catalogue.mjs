/**
 * Generates the bundled book-summary catalogue.
 *
 * `public/book-summaries/index.json` is ~314 KB because it carries the full
 * text of all 100 summaries. Fetching it at runtime meant the hub page showed a
 * skeleton on every visit and rendered nothing at all for a crawler, which is
 * why /book-summaries could not be published to search.
 *
 * This writes the same library WITHOUT the summary bodies — about a fifth of
 * the size — so the catalogue can be bundled and rendered on first paint. The
 * full library still loads in the background for the reader and for full-text
 * search; nothing is duplicated by hand, because both come from one source.
 *
 * Run with --check to verify the committed file is still in step with the data.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const source = join(root, 'public', 'book-summaries', 'index.json')
const target = join(root, 'src', 'data', 'bookSummariesCatalogue.generated.json')
const checkOnly = process.argv.includes('--check')

const library = JSON.parse(await readFile(source, 'utf8'))
const books = Array.isArray(library.books) ? library.books : []

if (!books.length) throw new Error('Book-summary library is empty; refusing to generate a catalogue.')
if (new Set(books.map((book) => book.slug)).size !== books.length) {
  throw new Error('Book-summary slugs must be unique.')
}

const catalogue = {
  // A marker so nothing mistakes the catalogue for the complete library.
  bodiesIncluded: false,
  generatedAt: library.generatedAt,
  total: library.total,
  categories: library.categories,
  coverSources: library.coverSources,
  books: books.map((book) => ({
    slug: book.slug,
    category: book.category,
    order: book.order,
    title: book.title,
    author: book.author,
    excerpt: book.excerpt,
    body: '',
    wordCount: book.wordCount,
    priority: book.priority,
    cover: book.cover,
    coverProvider: book.coverProvider,
    coverSource: book.coverSource,
  })),
}

const next = `${JSON.stringify(catalogue, null, 2)}\n`

if (checkOnly) {
  let current = ''
  try {
    current = await readFile(target, 'utf8')
  } catch {
    current = ''
  }
  if (current !== next) {
    console.error(
      'The bundled book-summary catalogue is out of step with '
      + 'public/book-summaries/index.json. Run: node scripts/generate-book-catalogue.mjs',
    )
    process.exit(1)
  }
  console.log(`Book-summary catalogue is in step: ${catalogue.books.length} books, ${catalogue.categories.length} categories.`)
} else {
  await writeFile(target, next)
  const saved = Math.round((1 - next.length / (await readFile(source, 'utf8')).length) * 100)
  console.log(`Generated the bundled book-summary catalogue: ${catalogue.books.length} books, ${saved}% smaller than the full library.`)
}
