import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import os from 'node:os'
import path from 'node:path'
const bundle = path.join(os.tmpdir(), `cssv-grammar-${process.pid}.mjs`)
await build({ entryPoints: ['src/data/grammarCourse.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'esm' })
const { grammarLessons } = await import(pathToFileURL(bundle).href)
const catalog = grammarLessons.map(({ day, title, phase, warmUp, drill, corrections, examples, checklist }) => ({ day, title, phase,
  warmUp: warmUp.map(q => ({ id: q.id, options: q.options.length, answer: q.answer })),
  drill: drill.map(q => ({ id: q.id, options: q.options.length, answer: q.answer })),
  corrections: corrections.map(c => c.id), examples: examples.length, checklist: checklist.length }))
const output = `<?php\ndeclare(strict_types=1);\n// Generated from the preserved authored course. Run scripts/grammar/export-catalog.mjs.\nreturn json_decode(<<<'CATALOG'\n${JSON.stringify(catalog)}\nCATALOG, true, 32, JSON_THROW_ON_ERROR);\n`
const file = 'public/api/_grammar_catalog.php'
if (process.argv.includes('--check')) {
  if (await readFile(file, 'utf8') !== output) throw new Error('Grammar server catalog differs from the authored course.')
  console.log('PASS: server Grammar catalog matches all authored lessons and answers.')
} else await writeFile(file, output)
