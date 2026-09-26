// Archive of every question already exposed (or frozen for exposure) in an
// official or browser MPT paper before the editorial rebuild. The rebuilt
// release must not reuse any of these question texts under a new ID.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { canonical } from './bank-lib.mjs'

export const SERVED_ARCHIVE_PATH = 'data-archive/mpt-served-archive.json'
export const stemHash = (text) => createHash('sha256').update(canonical(text)).digest('hex')

export function loadServedArchive(path = SERVED_ARCHIVE_PATH) {
  const archive = JSON.parse(readFileSync(path, 'utf8'))
  const legacy = JSON.parse(readFileSync('data-archive/mpt-legacy-fingerprints.json', 'utf8'))
  // The legacy file hashes the older canonical form (no Arabic-mark stripping); keep both.
  return {
    stems: new Set([...archive.stems, ...legacy.entries.map(([, hash]) => hash)]),
    ids: new Set([...archive.ids, ...legacy.entries.map(([id]) => id)]),
    meta: archive.meta,
  }
}
