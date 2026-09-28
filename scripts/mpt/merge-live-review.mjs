// Merges editor review files ({ id: { verdict, reason?, explanation? } }) into
// src/data/mpt/release/live-review.json, the input the repair reads:
//   { reject: { id: reason }, explain: { id: explanation } }
//   node scripts/mpt/merge-live-review.mjs <review.json>…
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { REVIEW_PATH } from './release-config.mjs'

const current = existsSync(REVIEW_PATH) ? JSON.parse(readFileSync(REVIEW_PATH, 'utf8')) : { reject: {}, explain: {} }
let kept = 0
let rejected = 0
for (const file of process.argv.slice(2)) {
  for (const [id, v] of Object.entries(JSON.parse(readFileSync(file, 'utf8')))) {
    if (v.verdict === 'reject') {
      current.reject[id] = String(v.reason ?? 'rejected by the editor').trim()
      delete current.explain[id]
      rejected += 1
    } else if (v.verdict === 'keep') {
      const text = String(v.explanation ?? '').trim()
      if (!text) throw new Error(`${file}: ${id} kept without an explanation`)
      current.explain[id] = text
      delete current.reject[id]
      kept += 1
    } else throw new Error(`${file}: ${id} has verdict ${v.verdict}`)
  }
}
const sort = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(REVIEW_PATH, `${JSON.stringify({ note: 'Editor review of kept live MPT questions: rejected ids are replaced from the reviewed bank; kept ids receive the explanation where the live question had none. Question, options and key are never changed.', reject: sort(current.reject), explain: sort(current.explain) }, null, 1)}\n`)
console.log(JSON.stringify({ kept, rejected, totalRejected: Object.keys(current.reject).length, totalExplained: Object.keys(current.explain).length }))
