import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dir = path.join(root, 'public', 'mcq')
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))
const rows=[]
for (const c of index.categories) for (let i=0;i<c.chunks;i++) {
  for (const q of JSON.parse(fs.readFileSync(path.join(dir, `cat-${c.slug}-${i}.json`),'utf8'))) rows.push({category:c.slug,...q})
}
const norm=v=>String(v??'').normalize('NFKC').toLocaleLowerCase().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N}\p{S}]+/gu,' ').replace(/\s+/g,' ').trim()
const leads=[/^which of the following /,/^which one of the following /,/^which statement about /,/^which statement regarding /,/^which option correctly /,/^which option best /,/^which option /,/^what is the /,/^what was the /,/^what does /,/^who was the /,/^who is the /,/^according to /,/^in the context of /,/^in relation to /]
const core=v=>{let x=norm(v);for(const p of leads)x=x.replace(p,'');return x.trim()}
const groups=new Map()
for(const q of rows){const k=core(q.q);if(k.length<18)continue;const g=groups.get(k)??[];g.push(q);groups.set(k,g)}
console.log('\n## GLOBAL SAME-CORE GROUPS')
for(const [k,g] of [...groups].filter(([,g])=>g.length>1)){
  console.log(`\n### ${k}`)
  for(const q of g) console.log(`- ${q.category} / ${q.id}: ${q.q} => ${q.o[q.a]}`)
}

const targets=[
  'which geonames listed country or territory',
  'which period or date is correctly',
  'what is the country code top',
  'which country or territory is represented',
  'which statement about the capital of',
  'what is the un m49 numeric',
  'which country is represented by the',
  'which option correctly identifies the principal',
  'which option correctly identifies the associated',
  'which option correctly identifies the key',
  'what is the approximate atomic mass',
  'which electron configuration is listed for',
  'which set of oxidation states is',
  'what melting point in kelvin is',
  'what boiling point in kelvin is',
]
console.log('\n## TEMPLATE SAMPLES')
for(const target of targets){const t=norm(target);const found=rows.filter(q=>norm(q.q).startsWith(t));console.log(`\n### ${target} — ${found.length}`);for(const q of found.slice(0,3))console.log(`- ${q.category} / ${q.id}: ${q.q}`)}
