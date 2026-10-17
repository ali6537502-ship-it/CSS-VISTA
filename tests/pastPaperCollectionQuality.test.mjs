import test from 'node:test'
import assert from 'node:assert/strict'
import { validateCollectionContent } from '../scripts/lib/collection-content-quality.mjs'
import { extractRootHtml, primaryContentText } from '../scripts/lib/content-quality.mjs'

const canonical = 'https://www.css-vista.com/past-papers/mpt/2025'
const papers = [{ id: 'mpt-2025', examination: 'MPT', year: 2025, subject: 'CSS MPT Screening Test', fileUrl: '/papers/mpt-2025.pdf' }]
const html = '<html><head><title>MPT 2025 Past Papers | CSS Vista</title></head><body><div id="root"><main><h1>MPT 2025 Past Papers</h1><a href="/past-papers/view/mpt-2025">CSS MPT 2025 Screening Test Past Paper</a><p>CSS Vista holds 1 archived MPT 2025 paper covering 1 subject.</p></main></div></body></html>'

function result(value, source = papers) {
  return validateCollectionContent(value, canonical, source)
}

function fails(value, pattern, source = papers) {
  const validation = result(value, source)
  assert.equal(validation.valid, false)
  assert.match(validation.problems.join('\n'), pattern)
}

test('a genuinely short single-paper archive qualifies through its real resources and facts', () => {
  assert.ok(primaryContentText(extractRootHtml(html)).split(/\s+/).length < 60)
  assert.deepEqual(result(html), { valid: true, problems: [] })
})

test('missing, extra and wrong paper links fail source membership validation', () => {
  fails(html.replace(/<a[\s\S]*?<\/a>/, ''), /links do not exactly match/)
  fails(html.replace('/view/mpt-2025', '/view/mpt-2024'), /links do not exactly match/)
  fails(html.replace('</main>', '<a href="/past-papers/view/unrelated">Unrelated resource</a></main>'), /links do not exactly match/)
})

test('wrong examination/year identity and missing main content fail', () => {
  fails(html.replace('<h1>MPT 2025', '<h1>MPT 2024'), /H1/)
  fails(html.replace('<title>MPT 2025', '<title>CSS 2025'), /title/)
  fails(html.replaceAll('<main>', '<section>').replaceAll('</main>', '</section>'), /no substantive main/)
})

test('blank or explicitly hidden resource links fail', () => {
  fails(html.replace('>CSS MPT 2025 Screening Test Past Paper</a>', '></a>'), /no accessible visible label/)
  fails(html.replace('<a href=', '<a hidden href='), /no accessible visible label/)
  fails(html.replace('>CSS MPT 2025 Screening Test Past Paper</a>', '>Download</a>'), /recorded subject and year/)
})

test('fabricated counts or unsourced archives fail even with working links', () => {
  fails(html.replace('holds 1 archived', 'holds 2 archived'), /paper and subject counts/)
  fails(html.replace('covering 1 subject', 'covering 4 subjects'), /paper and subject counts/)
  fails(html, /no source-backed/, [])
  fails(html, /no source-backed/, [{ ...papers[0], fileUrl: '' }])
})

test('other page families never receive this exception', () => {
  assert.equal(validateCollectionContent(html, 'https://www.css-vista.com/book-summaries/example', papers), null)
  assert.equal(validateCollectionContent(html, 'https://css-vista.com/past-papers/mpt/2025', papers), null)
})
