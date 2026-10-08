import { build } from 'esbuild'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import os from 'node:os'
import path from 'node:path'
const bundle = path.join(os.tmpdir(), `cssv-tutor-grammar-${process.pid}.mjs`)
try {
 await build({ entryPoints: ['src/data/grammarCourse.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'esm' })
 const { grammarLessons } = await import(pathToFileURL(bundle).href)
 const contexts = grammarLessons.flatMap(lesson => lesson.rules.map((rule, index) => ({
  id: `grammar:${lesson.day}:${index}`, category: 'grammar', title: `${lesson.title} — ${rule.heading}`,
  text: [rule.heading, rule.plain, ...rule.points, ...rule.models.flatMap(m => [m.sentence, m.note]), ...(rule.table ? [rule.table.caption, rule.table.columns.join(' | '), ...rule.table.rows.map(r => r.join(' | '))] : [])].join('\n\n'),
  attribution: `CSS Vista authored Grammar course, day ${lesson.day}. Teaching material; not an official past question.`,
  return_path: `/grammar-course?day=${lesson.day}`, date: null, sources: [], feature: 'tutor',
 })))
 if (contexts.some(c => c.text.length > 16000)) throw new Error('A tutor rule exceeds the bounded context policy.')
 const output = `<?php\ndeclare(strict_types=1);\n// Derived from existing authored rule text. No quiz solutions or course changes.\nreturn json_decode(<<<'CONTEXTS'\n${JSON.stringify(contexts)}\nCONTEXTS, true, 32, JSON_THROW_ON_ERROR);\n`
 const file = 'public/api/_tutor_grammar.php'
 if (process.argv.includes('--check')) { if (await readFile(file, 'utf8') !== output) throw new Error('Tutor grammar context differs from the preserved course.') }
 else await writeFile(file, output)
 console.log(`PASS: ${contexts.length} bounded tutor contexts match the existing Grammar rules without quiz solutions.`)
} finally { await unlink(bundle).catch(() => {}) }
