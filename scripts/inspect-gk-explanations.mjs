import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dir = path.join(root, 'public', 'mcq')
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))
const category = index.categories.find(c => c.slug === 'environment')
const rows = []
for (let chunk=0; chunk<category.chunks; chunk++) rows.push(...JSON.parse(fs.readFileSync(path.join(dir, `cat-${category.slug}-${chunk}.json`),'utf8')))
const norm = (v) => String(v ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim()
const groups = new Map()
for (const q of rows) {
  const k=norm(q.e); if (!k) continue
  const g=groups.get(k) ?? {text:q.e, rows:[]}; g.rows.push(q); groups.set(k,g)
}
const repeated=[...groups.values()].filter(g=>g.rows.length>1).sort((a,b)=>b.rows.length-a.rows.length)
for (const g of repeated.slice(0,5)) {
  console.log(`\n### ${g.rows.length}x: ${g.text}`)
  for (const q of g.rows) console.log(`- ${q.id}: ${q.q} => ${q.o[q.a]}`)
}
