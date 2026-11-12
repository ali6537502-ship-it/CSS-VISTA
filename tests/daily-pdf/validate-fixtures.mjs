import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { document } from './fixture.mjs'

const parser = process.env.CSSV_QPDF_TEST_BIN || 'qpdf'
const directory = await mkdtemp(join(tmpdir(), 'cssv-pdf-fixtures-'))
try {
  console.log(execFileSync(parser, ['--version'], { encoding: 'utf8' }).trim())
  for (const pages of [1, 3]) {
    const file = join(directory, `blank-${pages}-pages.pdf`)
    await writeFile(file, document(pages))
    // Warnings are failures too: qpdf must not repair the purportedly valid fixture.
    execFileSync(parser, ['--check', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const structure = JSON.parse(execFileSync(parser, ['--json', file], { encoding: 'utf8' }))
    assert.equal(structure.pages.length, pages, 'Fixture page tree does not match its declared size')
  }
  console.log('PASS PDF fixtures: one and three pages parse without repair warnings and retain correct page counts')
} finally {
  await rm(directory, { recursive: true, force: true })
}
