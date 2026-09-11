import { readdir, readFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { validateDataset } from './lib/current-affairs-schema.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const contentDir = join(root, 'content', 'current-affairs')
const checkOnly = process.argv.includes('--check')
const output = resolve(root, process.env.CSSV_CLIENT_DIR || 'dist', 'api', '_briefing_release')
async function walk(dir, prefix = '') {
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) }
  catch (e) { if (e.code === 'ENOENT') return []; throw e }
  const files = []
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw new Error('Content symlinks are not supported.')
    const path = prefix + entry.name
    if (entry.isDirectory()) files.push(...await walk(join(dir, entry.name), path + '/'))
    else if (entry.name.endsWith('.json')) files.push(path)
  }
  return files.sort()
}
const editions = []
const seenIds = new Map()
for (const path of await walk(contentDir)) {
  if (!/^\d{4}\/\d{2}\/\d{4}-\d{2}-\d{2}\.json$/.test(path)) throw new Error('Invalid edition path: ' + path)
  const raw = await readFile(join(contentDir, path))
  if (raw.byteLength > 2097152) throw new Error('Edition exceeds 2 MiB: ' + path)
  let data
  try { data = validateDataset(JSON.parse(raw.toString('utf8'))) }
  catch (e) { throw new Error('Invalid edition ' + path + ': ' + e.message) }
  if (path !== data.date.slice(0, 4) + '/' + data.date.slice(5, 7) + '/' + data.date + '.json') throw new Error('Edition date does not match its path: ' + path)
  for (const story of data.stories) {
    if (seenIds.has(story.id)) throw new Error('Story ID occurs in multiple editions: ' + story.id)
    seenIds.set(story.id, data.date)
  }
  editions.push({ date: data.date, hash: createHash('sha256').update(raw).digest('hex'), file: data.date + '.php', data })
}
if (!checkOnly) {
  await rm(output, { recursive: true, force: true })
  await mkdir(output, { recursive: true })
  const guardedPhp = (data) => "<?php\ndeclare(strict_types=1);\nif (!defined('CSSV_CA_RELEASE') || CSSV_CA_RELEASE !== true) { http_response_code(404); exit; }\nreturn json_decode(base64_decode('" + Buffer.from(JSON.stringify(data)).toString('base64') + "'), true, 64, JSON_THROW_ON_ERROR);\n"
  const manifest = editions.map(({ date, hash, file }) => ({ date, hash, file }))
  const id = createHash('sha256').update(JSON.stringify(manifest)).digest('hex')
  for (const edition of editions) await writeFile(join(output, edition.file), guardedPhp(edition.data))
  await writeFile(join(output, 'catalog.php'), guardedPhp({ id, editions: manifest }))
  await writeFile(join(output, '.htaccess'), 'Require all denied\n')
}
console.log('Current affairs: ' + editions.length + ' validated editions; ' + (checkOnly ? 'no files written.' : 'protected PHP release packaged.'))
