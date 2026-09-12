// Compare the existing suite with the exact unchanged base when it has failures.
// New failures block the feature; inherited failures remain visible in CI.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
const root = process.cwd()
const artifacts = resolve('test-artifacts')
mkdirSync(artifacts, { recursive: true })
function suite(cwd, label) {
  const files = readdirSync(join(cwd, 'tests')).filter((p) => p.endsWith('.test.ts')).map((p) => join('tests', p))
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files], { cwd, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  writeFileSync(join(artifacts, label + '-tests.log'), (result.stdout || '') + (result.stderr || ''))
  if (result.error) throw result.error
  const failures = [...(result.stdout || '').matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => m[1])
  if (result.status !== 0 && !failures.length) throw new Error(label + ' test process failed; inspect diagnostics')
  return failures
}
const current = suite(root, 'current')
if (!current.length) { console.log('All repository tests passed.'); process.exit(0) }
const base = process.env.CSSV_TEST_BASE_SHA
if (!/^[a-f0-9]{40}$/.test(base || '')) throw new Error('A verified base commit is required to assess inherited test failures')
const baseline = join(process.env.RUNNER_TEMP, 'cssv-current-affairs-baseline')
function git(args) { const r = spawnSync('git', args, { stdio: 'inherit' }); if (r.status) throw new Error('Could not prepare baseline') }
git(['fetch', '--depth=1', 'origin', base])
git(['worktree', 'add', '--detach', baseline, base])
try {
  symlinkSync(join(root, 'node_modules'), join(baseline, 'node_modules'), 'dir')
  const existing = suite(baseline, 'baseline')
  const regressions = current.filter((name) => !existing.includes(name))
  for (const name of current) console.log((regressions.includes(name) ? '::error::New failure: ' : '::warning::Also fails on unchanged base: ') + name)
  if (regressions.length) process.exitCode = 1
} finally { git(['worktree', 'remove', '--force', baseline]) }
