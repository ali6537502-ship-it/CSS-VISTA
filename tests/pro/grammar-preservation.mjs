import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const map=JSON.parse(await readFile('docs/pro/grammar-preservation-map.json','utf8'))
for(const [file,expected] of Object.entries(map.sourceFiles)) assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),expected,`Existing Grammar content changed: ${file}. Review and update the preservation map deliberately.`)
assert.equal(map.lessons.length,30)
assert.equal(map.lessons.reduce((sum,lesson)=>sum+lesson.questionIds.length,0),480)
assert.equal(map.lessons.reduce((sum,lesson)=>sum+lesson.correctionIds.length,0),180)
console.log('PASS: all existing Grammar source checksums, 30 lessons, 480 questions and 180 correction items preserved.')
