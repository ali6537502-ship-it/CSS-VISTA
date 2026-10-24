import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {randomUUID} from 'node:crypto'
if(process.env.CI!=='true'||process.env.CSSV_DB_NAME!=='cssvista_briefing_test')throw Error('Disposable database required')
const php=(...args)=>process.env.CSSV_TEST_PHP_CONTAINER?execFileSync('docker',['exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...args],{encoding:'utf8'}).trim():execFileSync('php',args,{encoding:'utf8'}).trim()
const user=php('tests/current-affairs/setup.php','user',`catalog-rehearsal-${randomUUID()}@example.invalid`),seed=JSON.parse(php('tests/workspace/catalog-fixture.php','seed',user))
const page=extra=>JSON.parse(php('tests/workspace/catalog-fixture.php','page',user,JSON.stringify({view:'catalog',q:seed.needle,...extra})))
const first=page({}),last=page({offset:20}),subject=page({subject:'pakistan-affairs'})
assert.deepEqual([...first.catalog,...last.catalog].map(v=>v.id),seed.ids);assert.equal(first.has_more,true);assert.equal(last.has_more,false);assert.equal(subject.catalog.length,13);assert.equal(subject.catalog_subjects.find(v=>v.id==='current-affairs').count,13)
console.log('PASS: 25 published catalog editions, 20/5 pages, exact subject JSON mappings/counts and mismatched publication-pointer exclusion on the selected disposable engine. HTTP auth/expiry/pause are covered by the separate native suite.')
