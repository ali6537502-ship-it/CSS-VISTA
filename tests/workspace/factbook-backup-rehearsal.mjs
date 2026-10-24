import {execFileSync} from 'node:child_process'
import {randomUUID} from 'node:crypto'
import {ENTRY_TYPE_DEFINITIONS,createEmptyContent} from '../../src/features/factbook/entryTypes.ts'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable database required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
const user=()=>php('tests/current-affairs/setup.php','user',`factbook-rehearsal-${randomUUID()}@example.invalid`)
const source=user(),target=user()
php('tests/workspace/factbook-backup-fixture.php','seed',source,JSON.stringify(ENTRY_TYPE_DEFINITIONS.map(({type})=>({type,content:{...createEmptyContent(type),html:'<p>TEST ONLY — اردو x² = 4</p>',nested:{empty:{},rows:[1,true]}}}))))
console.log(php('tests/workspace/factbook-backup-fixture.php','roundtrip',source,target))
