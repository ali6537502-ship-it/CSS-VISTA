// Validates the reviewed MPT release bank. Usage:
//   node scripts/mpt/validate-bank.mjs            (whole bank; exits 1 on any problem)
//   node scripts/mpt/validate-bank.mjs <dir|file>  (a subset, e.g. one contributor file)
import { statSync, readFileSync } from 'node:fs'
import { loadBank, validateBank, summarise, BANK_DIR } from './bank-lib.mjs'
import { loadServedArchive, stemHash } from './served-archive.mjs'

const target = process.argv[2] ?? BANK_DIR
let bank
if (statSync(target).isDirectory()) bank = loadBank(target)
else {
  const rows = JSON.parse(readFileSync(target, 'utf8'))
  const full = loadBank(BANK_DIR) // passages may live in another file
  bank = {
    questions: rows.filter((r) => 'q' in r).map((r) => ({ ...r, __file: target })),
    passages: [...full.passages, ...rows.filter((r) => !('q' in r)).map((r) => ({ ...r, __file: target }))],
  }
}
const { problems, warnings } = validateBank(bank)
const served = loadServedArchive()
for (const q of bank.questions) {
  if (served.stems.has(stemHash(q.q))) problems.push(`${q.__file} ${q.id}: question text was already served in an earlier MPT series (data-archive/mpt-served-archive.json)`)
}
console.log(JSON.stringify({ summary: summarise(bank), problems: problems.length, warnings: warnings.length }, null, 2))
problems.slice(0, 200).forEach((p) => console.log('PROBLEM', p))
warnings.slice(0, 50).forEach((w) => console.log('WARN', w))
if (problems.length) process.exitCode = 1
