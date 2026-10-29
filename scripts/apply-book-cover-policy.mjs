import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { protectUnverifiedBookCovers } from './lib/book-cover-policy.mjs'

const file = resolve(import.meta.dirname, '../', process.env.CSSV_CLIENT_DIR || 'dist/client', '.htaccess')
await writeFile(file, protectUnverifiedBookCovers(await readFile(file, 'utf8')))
console.log('Publisher cover artwork withheld from HTTP delivery; source originals preserved.')
