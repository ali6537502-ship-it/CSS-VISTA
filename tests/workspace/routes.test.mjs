import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { parseHtaccess, resolveRequest } from '../../scripts/lib/htaccess-resolver.mjs'
const root = new URL('../../public/', import.meta.url).pathname
const rules = parseHtaccess(readFileSync(root + '.htaccess','utf8'))
test('Apache-compatible rules deny new includes before static PHP delivery', () => {
  for (const path of ['/api/_factbook_backup.php','/api/_factbook_backup.php/extra','/api/_factbook_schema.php','/api/_workspace.php','/api/_workspace_sources.php','/api/_topics_review.php','/api/_topics_writing.php']) assert.equal(resolveRequest(rules,root,path).status,403,path)
})
