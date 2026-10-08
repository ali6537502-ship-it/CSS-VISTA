import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../data-archive/current-affairs-issues.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const exports = {}
// Compile the existing, trusted repository authoring source; no uploaded code.
new Function('exports', compiled)(exports)
const issues = exports.caIssues
if (!Array.isArray(issues) || !issues.length) throw new Error('Missing Current Affairs issue files')
await mkdir(new URL('../public/api/_premium_files/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/api/_premium_files/current-affairs-issues.json', import.meta.url), JSON.stringify(issues))
await writeFile(new URL('../src/data/bundled/current-affairs-issues-index.json', import.meta.url), JSON.stringify(issues.map(({ slug, title, category, lastUpdated }) => ({ slug, title, category, lastUpdated })), null, 2) + '\n')
const ids = []
for (const file of await readdir(new URL('../public/mcq/', import.meta.url))) {
  if (/^cat-(general-ability|current-affairs)-[0-9]+\.json$/.test(file)) ids.push(...JSON.parse(await readFile(new URL('../public/mcq/' + file, import.meta.url), 'utf8')).map(q => q.id))
}
await writeFile(new URL('../public/api/_premium_files/question-ids.json', import.meta.url), JSON.stringify(ids))
