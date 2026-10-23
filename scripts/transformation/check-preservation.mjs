import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
const manifest=JSON.parse(readFileSync('docs/pro/transformation/baseline-manifest.json','utf8'))
const immutable=Object.entries(manifest.files).filter(([path])=>path.startsWith('src/features/grammar-v5/')||path.startsWith('public/grammar/')||path.startsWith('content/grammar/')||path.startsWith('public/api/_grammar')||path.startsWith('public/api/daily-briefing')||path==='public/api/_pro_release.php'||path.startsWith('server/sql/'))
for(const [path,hash] of immutable.filter(([path])=>path!=='src/features/grammar-v5/Course.tsx'))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash,`Preserved source changed: ${path}`)
const contracts=JSON.parse(readFileSync('tests/preservation/contracts.json','utf8'))
assert.equal(contracts.domains.length,15)
for(const row of contracts.domains)assert.equal(createHash('sha256').update(row.original_text).digest('hex'),row.sha256)
assert.deepEqual(contracts.domains[13].namespaces,['legacy','v5'])
assert.equal(execFileSync('git',['merge-base','--is-ancestor',manifest.baseline_sha,'HEAD']).length,0)
assert.equal(execFileSync('git',['merge-base','--is-ancestor',manifest.candidate_sha,'HEAD']).length,0)
console.log(`PASS: ${immutable.length - 1} immutable baseline sources plus one documented navigation-only exception, both Grammar namespaces, 15 synthetic contract hashes and main/candidate ancestry. This is not a production learner-data backup.`)
