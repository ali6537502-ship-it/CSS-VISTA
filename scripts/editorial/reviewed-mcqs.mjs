import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const ledgerPath = path.join(repositoryRoot, 'scripts/editorial/reviewed-mcq-explanations.json')
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

export function reviewedQuestion(change) {
  if (!/^cat-(general-ability|english-grammar)-\d+\.json$/.test(change.shard)) throw new Error(`${change.id}: unexpected review scope`)
  if (change.before.id !== change.id) throw new Error(`${change.id}: source identity mismatch`)
  if (Object.keys(change.patch).some(key => !['e', 'a', 'sourceUrl'].includes(key))) throw new Error(`${change.id}: review cannot change IDs, stems, choices or classification`)
  if (typeof change.patch.e !== 'string' || !change.patch.e.trim()) throw new Error(`${change.id}: missing question-specific explanation`)
  if ('a' in change.patch && change.patch.a !== change.before.a && !change.correctionNote) throw new Error(`${change.id}: answer correction needs an explicit reason`)
  const after = { ...change.before, ...change.patch }
  if (!Number.isInteger(after.a) || after.a < 0 || after.a >= after.o.length) throw new Error(`${change.id}: invalid reviewed answer`)
  return after
}

export function planReviewedMcqUpdates(root, review) {
  const ids = new Set()
  const groups = new Map()
  for (const change of review.changes) {
    reviewedQuestion(change)
    if (ids.has(change.id)) throw new Error(`${change.id}: duplicate review entry`)
    ids.add(change.id)
    if (!groups.has(change.shard)) groups.set(change.shard, [])
    groups.get(change.shard).push(change)
  }
  const writes = []
  for (const [shard, changes] of groups) {
    const publicPath = path.join(root, 'public/mcq', shard)
    const bundledPath = path.join(root, 'src/data/mcq-shards', shard)
    const publicBytes = fs.readFileSync(publicPath)
    if (!publicBytes.equals(fs.readFileSync(bundledPath))) throw new Error(`${shard}: public and bundled sources differ; refusing to overwrite either`)
    const rows = JSON.parse(publicBytes)
    for (const change of changes) {
      const matches = rows.map((row, index) => row.id === change.id ? index : -1).filter(index => index >= 0)
      if (matches.length !== 1) throw new Error(`${change.id}: source row missing or duplicated`)
      const index = matches[0]
      const after = reviewedQuestion(change)
      if (same(rows[index], after)) continue
      if (!same(rows[index], change.before)) throw new Error(`${change.id}: source changed after review; a new editorial review is required`)
      rows[index] = after
    }
    const content = `${JSON.stringify(rows)}\n`
    if (content !== publicBytes.toString()) {
      writes.push({ publicPath, bundledPath, content })
    }
  }
  return writes
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args.some(arg => !['--check', '--apply'].includes(arg)) || args.length > 1) throw new Error('Usage: node scripts/editorial/reviewed-mcqs.mjs [--check|--apply]')
  const review = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))
  // Validate every shard before any write, so a stale reviewed row cannot cause a partial update.
  const writes = planReviewedMcqUpdates(repositoryRoot, review)
  if (writes.length && args[0] !== '--apply') {
    throw new Error(`${writes.length} reviewed shard(s) differ from the editorial ledger. Inspect changes before using --apply.`)
  }
  for (const write of writes) {
    fs.writeFileSync(write.publicPath, write.content)
    fs.writeFileSync(write.bundledPath, write.content)
  }
  console.log(`MCQ editorial review ${args[0] === '--apply' ? 'applied' : 'passed'}: ${review.changes.length} individually reviewed questions; ${review.changes.filter(change => change.patch.a !== undefined && change.patch.a !== change.before.a).length} documented answer-key correction(s).`)
}
