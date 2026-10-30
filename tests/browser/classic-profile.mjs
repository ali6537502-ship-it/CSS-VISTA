/** Preserve the production profile UI and full-profile POST safety for non-pilot accounts. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw Error('Disposable database required')
const base=process.env.CSSV_TEST_BROWSER_ORIGIN||'https://localhost:3444'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback only')
const env={...process.env}
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key]
const email=`classic-profile-${randomUUID()}@example.invalid`
const setup=['tests/current-affairs/setup.php','user',email]
if(process.env.CSSV_TEST_PHP_CONTAINER)execFileSync('docker',['--host=unix:///var/run/docker.sock','exec',process.env.CSSV_TEST_PHP_CONTAINER,'php',...setup],{env,stdio:'pipe'})
else execFileSync('php',setup,{env,stdio:'pipe'})
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||chromium.executablePath(),headless:true,args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844}})
await isolateNetwork(context,base)
const page=await context.newPage();page.setDefaultTimeout(20000)
const read=async()=>(await(await context.request.get(base+'/api/student/profile.php')).json()).profile
const keys=['display_name','phone','whatsapp','date_of_birth','gender','city','province_region','country','css_attempt_year','preparation_level','optional_subjects','education','previous_academy_mentor','previous_css_vista_student','previous_css_vista_services','previous_css_vista_details']
let token
const save=async changes=>{
  const previous=await read(),data=Object.fromEntries(keys.map(key=>[key,previous[key]??'']))
  data.css_attempt_year=Number(data.css_attempt_year);data.optional_subjects=typeof data.optional_subjects==='string'?JSON.parse(data.optional_subjects):data.optional_subjects
  const response=await context.request.post(base+'/api/student/profile.php',{headers:{'X-CSRF-Token':token},data:{...data,...changes}})
  assert.equal(response.status(),200,await response.text())
}
try {
  assert.equal((await context.request.post(base+'/api/auth/login.php',{data:{email,password:'TEST ONLY native fixture password'}})).status(),200)
  token=decodeURIComponent((await context.cookies()).find(cookie=>cookie.name==='cssv_csrf').value)
  const subjects=['Political Science','TEST ONLY, imported subject']
  await save({optional_subjects:subjects,previous_css_vista_student:'Both',previous_css_vista_services:['Batch','Purchased Notes'],previous_css_vista_details:'TEST ONLY retained history'})
  await page.goto(base+'/account?settings=1')
  await page.getByRole('heading',{name:'Your profile, your learning space',exact:true}).waitFor()
  assert.equal(await page.locator('.student-workspace').count(),0)
  const city=page.getByLabel('City',{exact:true}),submit=page.getByRole('button',{name:'Save details',exact:true})
  await city.fill('TEST ONLY city edit')
  await save({education:'TEST ONLY independent qualification'})
  await submit.click()
  await page.getByText('All 12 checks complete. Your account services are unlocked.',{exact:true}).waitFor()
  let stored=await read()
  assert.equal(stored.city,'TEST ONLY city edit');assert.equal(stored.education,'TEST ONLY independent qualification')
  assert.deepEqual(JSON.parse(stored.optional_subjects),subjects);assert.deepEqual(stored.previous_css_vista_services,['Batch','Purchased Notes'])
  await city.fill('TEST ONLY pending city')
  const fail=route=>route.request().method()==='POST'?route.fulfill({status:503,json:{error:'fixture_failure',message:'TEST ONLY save unavailable'}}):route.continue()
  await page.route('**/api/student/profile.php',fail)
  await submit.click();await page.getByText('TEST ONLY save unavailable',{exact:true}).waitFor()
  assert.equal(await city.inputValue(),'TEST ONLY pending city');assert.equal((await read()).city,'TEST ONLY city edit')
  await page.unroute('**/api/student/profile.php',fail)
  await save({city:'TEST ONLY independent city'})
  await submit.click()
  await page.getByText('Newer saved details were found. Your entries are retained. Review them and save again to use your changes.',{exact:true}).waitFor()
  assert.equal(await city.inputValue(),'TEST ONLY pending city');assert.equal((await read()).city,'TEST ONLY independent city')
  await submit.click();await page.getByText('All 12 checks complete. Your account services are unlocked.',{exact:true}).waitFor()
  await page.reload();assert.equal(await city.inputValue(),'TEST ONLY pending city')
  stored=await read();assert.deepEqual(JSON.parse(stored.optional_subjects),subjects);assert.equal(stored.previous_css_vista_details,'TEST ONLY retained history')
  console.log('PASS classic profile: genuine edits, independent field merge, imported subject commas/history retained, failed-save draft retained, conflict review/retry and refresh.')
} finally {await browser.close()}
