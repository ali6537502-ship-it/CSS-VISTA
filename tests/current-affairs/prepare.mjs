import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Isolated CI database required')
const fixture = JSON.parse(await readFile('examples/current-affairs/test-edition.json', 'utf8'))
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
fixture.date = date
fixture.published_at = date + 'T00:00:00+05:00'
// This disposable CI artifact never deploys; all stories retain TEST labels.
delete fixture.test
const folder = join('content/current-affairs', date.slice(0, 4), date.slice(5, 7))
await mkdir(folder, { recursive: true })
await writeFile(join(folder, date + '.json'), JSON.stringify(fixture))
await mkdir('test-artifacts', { recursive: true })
await writeFile('test-artifacts/edition.json', JSON.stringify(fixture))
