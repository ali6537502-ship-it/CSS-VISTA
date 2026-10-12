import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable database required')
const env = { ...process.env }
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key]
const php = (...args) => process.env.CSSV_TEST_PHP_CONTAINER
  ? execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', process.env.CSSV_TEST_PHP_CONTAINER, 'php', ...args], { env, encoding: 'utf8' }).trim()
  : execFileSync('php', args, { env, encoding: 'utf8' }).trim()
async function call(path, jar = new Map(), body, extra = {}) {
  const headers = { ...extra }
  if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  if (body) { headers['Content-Type'] = 'application/json'; headers['X-CSRF-Token'] = jar.get('cssv_csrf') || ''; Object.assign(headers, extra) }
  const response = await fetch('http://localhost:4173/api/' + path, { headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) })
  for (const cookie of response.headers.getSetCookie()) { const p = cookie.split(';')[0], i = p.indexOf('='); jar.set(p.slice(0, i), p.slice(i + 1)) }
  return { status: response.status, data: await response.json(), headers: response.headers }
}
async function user(label) {
  const email = `skills-${label}-${randomUUID()}@example.invalid`, id = php('tests/current-affairs/setup.php', 'user', email), jar = new Map()
  assert.equal((await call('auth/login.php', jar, { email, password: 'TEST ONLY native fixture password' })).status, 200)
  return { id, jar }
}

const a = await user('active'), b = await user('other'), free = await user('free'), endpoint = 'student/skills.php'
php('tests/precis/fixture.php', 'activate', a.id); php('tests/precis/fixture.php', 'activate', b.id)
php('tests/skills/fixture.php','config','off')
assert.equal((await call(endpoint)).status, 401)
assert.equal((await call(endpoint, free.jar)).data.catalog.length, 0)
assert.equal((await call(endpoint, a.jar, undefined, { 'X-CSSV-User': b.id })).status, 409)
const attempt = await call('student/learning.php', a.jar, { action: 'attempt_save', request_id: randomUUID(), expected_version: 0, target_year: 2027, target_date: null, optional_subject_ids: [], daily_minutes: 60, stage: 'starting' })
assert.equal(attempt.status, 200)
const raw = JSON.parse(readFileSync(new URL('../../public/api/_premium_files/skills-curriculum.json', import.meta.url)))
const roadmap = JSON.parse(readFileSync(new URL('../../public/study-material/essay-themes.json', import.meta.url)))
const body = fields => ({ request_id: randomUUID(), ...fields })
const run = async (feature, chosen, level = chosen.level) => {
  const start = body({ action: 'start', feature, lesson: chosen.id, level, attempt_id: attempt.data.attempt_id, statement: 'A hypothetical library access policy needs a limited trial.' })
  assert.equal((await call(endpoint, free.jar, start)).status, 403)
  assert.equal((await call(endpoint, a.jar, start, { 'X-CSRF-Token': 'bad' })).status, 403)
  const created = await call(endpoint, a.jar, start); assert.equal(created.status, 200, JSON.stringify(created.data))
  const id = created.data.workspace_id
  assert.equal((await call(endpoint+'?workspace_id='+id,b.jar)).status,404)
  let detail = (await call(endpoint+'?workspace_id='+id,a.jar)).data
  assert.equal(detail.saved,null); assert.equal(detail.workspace.version,0)
  assert.equal(detail.workspace.source.check?.answer,undefined)
  const stages = detail.workspace.source.stages
  if(feature !== 'essay') {
    assert.equal((await call(endpoint,a.jar,body({ action:'save', workspace_id:id, expected_version:0, stage:stages[1].id, response:'An independent sentence with a clear subject.', advance:true }))).status,409)
    const wrong = await call(endpoint,a.jar,body({ action:'save', workspace_id:id, expected_version:0, stage:'check', response:(chosen.check.answer+1)%4, advance:true }))
    assert.equal(wrong.status,200); assert.equal(wrong.data.evidence.next,0); assert.equal(wrong.data.evidence.check_feedback.correct,false)
    detail=(await call(endpoint+'?workspace_id='+id,a.jar)).data
  }
  let last, lastRequest
  for(const stage of stages) {
    const response=stage.id==='check'?chosen.check.answer:feature==='sentence'&&stage.id==='draft'?'Stop.':feature==='sentence'&&stage.id==='revision'?'Wait.':'My independent reasoning states a conditional claim and explains why the hypothetical access policy might help some students while staffing constraints could limit its effects. Actual demand and dated schedules would need checking before a wider conclusion.'
    const save=body({ action:'save', workspace_id:id, expected_version:detail.workspace.version, stage:stage.id, response, advance:true })
    const results=await Promise.all([call(endpoint,a.jar,save),call(endpoint,a.jar,save)])
    assert.equal(results[0].status,200,JSON.stringify(results[0].data)); assert.equal(results[1].status,200)
    assert.equal(results[0].data.version_id,results[1].data.version_id)
    assert.equal((await call(endpoint,a.jar,{...save,response:stage.id === 'check' ? (chosen.check.answer+1)%4 : 'changed intent'})).status,409)
    assert.equal((await call(endpoint+'?request_id='+save.request_id,a.jar)).data.version_id,results[0].data.version_id)
    assert.equal((await call(endpoint+'?request_id='+save.request_id,b.jar)).status,404)
    last=results[0].data; lastRequest=save
    detail=(await call(endpoint+'?workspace_id='+id,a.jar)).data
  }
  assert.equal(detail.saved.evidence.all_recorded,true)
  assert.equal(detail.versions.length,stages.length+(feature==='essay'?0:1))
  assert.equal((await call('student/learning.php',a.jar,body({action:'writing_save', id:detail.workspace.writing_id, expected_version:detail.workspace.version, attempt_id:attempt.data.attempt_id,kind:feature==='sentence'?'sentence':'paragraph',title:'Do not detach this writing',text:'A revision must stay with its guided responses.'}))).status,409)
  assert.equal((await call('student/expression.php?writing_id='+detail.workspace.writing_id,a.jar)).status,409)
  const writing=(await call('student/learning.php?writing_id='+detail.workspace.writing_id,a.jar)).data.writing
  assert.equal(writing.guided_workspace.id,id)
  assert.equal((await call(endpoint,a.jar,body({action:'save',workspace_id:id,expected_version:0,stage:stages[0].id,response:0}))).status,409)
  return {id,detail,last,lastRequest}
}
const sessions={}
for(const feature of ['sentence','argument','analysis']) sessions[feature]=await run(feature,raw.lessons.find(l=>l.feature===feature&&l.level==='beginner'))
sessions.essay=await run('essay',{id:roadmap.themes[0].slug},'advanced')
for(const session of Object.values(sessions)){php('tests/skills/fixture.php','normalize-workspace',session.id);assert.equal((await call(endpoint+'?workspace_id='+session.id,a.jar)).status,200,'JSON normalization invalidated saved source')}
const parent=sessions.essay
const target=raw.lessons.find(l=>l.feature==='sentence'&&l.level==='advanced')
const transfer=await call(endpoint,a.jar,body({action:'transfer',workspace_id:parent.id,version_id:parent.detail.saved.version_id,field:'thesis',feature:'sentence',lesson:target.id,level:target.level}))
assert.equal(transfer.status,200)
const child=transfer.data.workspace_id
let d=(await call(endpoint+'?workspace_id='+child,a.jar)).data
assert.equal(d.workspace.parent_feature,'essay');assert.equal(d.workspace.statement,parent.detail.saved.answers.thesis)
assert.equal((await call(endpoint,a.jar,body({action:'adopt',workspace_id:parent.id,expected_version:parent.detail.workspace.version,child_id:child,child_version_id:parent.detail.saved.version_id}))).status,422)
for(const stage of d.workspace.source.stages) {
 const saved=await call(endpoint,a.jar,body({action:'save',workspace_id:child,expected_version:d.workspace.version,stage:stage.id,response:stage.id==='check'?target.check.answer:'A limited trial may improve access if actual demand and staffing permit it.',advance:true}))
 assert.equal(saved.status,200,JSON.stringify(saved.data));d=(await call(endpoint+'?workspace_id='+child,a.jar)).data
}
const adopted=await call(endpoint,a.jar,body({action:'adopt',workspace_id:parent.id,expected_version:parent.detail.workspace.version,child_id:child,child_version_id:d.saved.version_id}))
assert.equal(adopted.status,200)
const contextId='skills:'+child+':'+d.saved.version_id+':revision'
const help=await call('student/tutor.php?context='+encodeURIComponent(contextId),a.jar)
assert.equal(help.status,200,JSON.stringify(help.data))
assert.ok(help.data.context.text.includes(d.saved.answers.revision))
assert.equal(help.data.context.attempt_id,attempt.data.attempt_id)
assert.equal((await call('student/tutor.php?context='+encodeURIComponent(contextId),b.jar)).status,404)
let changed=(await call(endpoint+'?workspace_id='+parent.id,a.jar)).data
assert.equal(changed.saved.answers.thesis,d.saved.answers.revision)
assert.equal((await call(endpoint+'?workspace_id='+parent.id+'&version_id='+parent.detail.saved.version_id,a.jar)).data.saved.answers.thesis,parent.detail.saved.answers.thesis)
// Revisiting a draft must not keep diagnosing an older revision, even after reflection.
const newSentence='A shorter trial may be defensible when reliable staffing evidence supports its scope.'
const revisited=await call(endpoint,a.jar,body({action:'save',workspace_id:child,expected_version:d.workspace.version,stage:'draft',response:newSentence}))
assert.equal(revisited.status,200)
const reflection=await call(endpoint,a.jar,body({action:'save',workspace_id:child,expected_version:revisited.data.version,stage:'reflection',response:'I have independently clarified the condition without claiming an unverified outcome.'}))
assert.equal(reflection.status,200)
const revisitedDetail=(await call(endpoint+'?workspace_id='+child,a.jar)).data
assert.equal(revisitedDetail.saved.text,newSentence)
assert.equal(revisitedDetail.saved.answers.revision,d.saved.answers.revision)
assert.equal((await call(endpoint+'?workspace_id='+child+'&version_id='+d.saved.version_id,a.jar)).data.saved.text,d.saved.text)
// Refine a selected Unicode passage without replacing the surrounding essay.
const original='🌿 Introductory context. A policy may help if staffing permits it. Closing qualification.'
const parentSave=await call(endpoint,a.jar,body({action:'save',workspace_id:parent.id,expected_version:changed.workspace.version,stage:'practice',response:original}))
assert.equal(parentSave.status,200)
const start=Array.from(original.slice(0,original.indexOf('A policy'))).length,end=start+Array.from('A policy may help if staffing permits it.').length
const part=await call(endpoint,a.jar,body({action:'transfer',workspace_id:parent.id,version_id:parentSave.data.version_id,field:'practice',feature:'sentence',lesson:target.id,level:target.level,start,end}))
assert.equal(part.status,200)
let partDetail=(await call(endpoint+'?workspace_id='+part.data.workspace_id,a.jar)).data
for(const stage of partDetail.workspace.source.stages){
 const response=stage.id==='check'?target.check.answer:'A limited policy trial may improve access when staffing and actual demand justify it.'
 assert.equal((await call(endpoint,a.jar,body({action:'save',workspace_id:partDetail.workspace.id,expected_version:partDetail.workspace.version,stage:stage.id,response,advance:true}))).status,200)
 partDetail=(await call(endpoint+'?workspace_id='+partDetail.workspace.id,a.jar)).data
}
const merge=await call(endpoint,a.jar,body({action:'adopt',workspace_id:parent.id,expected_version:parentSave.data.version,child_id:partDetail.workspace.id,child_version_id:partDetail.saved.version_id}))
assert.equal(merge.status,200)
changed=(await call(endpoint+'?workspace_id='+parent.id,a.jar)).data
assert.equal(changed.saved.answers.practice,'🌿 Introductory context. '+partDetail.saved.answers.revision+' Closing qualification.')
assert.equal((await call(endpoint,a.jar,body({action:'adopt',workspace_id:parent.id,expected_version:changed.workspace.version,child_id:partDetail.workspace.id,child_version_id:partDetail.saved.version_id}))).status,409,'Replaced a changed original selection')
// Older linked practices remain reachable, scoped and stable across tied timestamps.
const linkedIds=[child,partDetail.workspace.id]
for(let n=0;n<21;n++){
 const result=await call(endpoint,a.jar,body({action:'transfer',workspace_id:parent.id,version_id:changed.saved.version_id,field:'thesis',feature:'sentence',lesson:target.id,level:target.level}))
 assert.equal(result.status,200);linkedIds.push(result.data.workspace_id)
}
php('tests/skills/fixture.php','tie-linked',a.id,parent.id)
const linkedPath=endpoint+'?workspace_id='+parent.id
const page1=(await call(linkedPath,a.jar)).data,page2=(await call(linkedPath+'&children_offset=20',a.jar)).data
assert.equal(page1.children.length,20);assert.equal(page1.has_more_children,true);assert.equal(page1.children_offset,0)
assert.equal(page2.children.length,3);assert.equal(page2.has_more_children,false);assert.equal(page2.children_offset,20)
assert.deepEqual([...page1.children,...page2.children].map(c=>c.id),linkedIds.sort().reverse(),'Paging skipped or duplicated a tied linked workspace')
assert.deepEqual(page2.saved,page1.saved,'Linked paging changed selected writing')
assert.deepEqual(page2.versions,page1.versions,'Linked paging changed version history')
const references=await call(linkedPath+'&view=linked&children_offset=20',a.jar)
assert.equal(references.status,200)
assert.deepEqual(Object.keys(references.data).sort(),['children','children_offset','has_more_children','ok'])
assert.deepEqual(references.data.children,page2.children,'References-only paging disagrees with owned history')
assert.equal((await call(linkedPath+'&view=linked&children_offset=20',b.jar)).status,404)
assert.equal((await call(linkedPath+'&view=linked&children_offset=20')).status,401)
for(const offset of ['-1','1.5','100001','not-a-page'])assert.equal((await call(linkedPath+'&children_offset='+offset,a.jar)).status,422)
assert.equal((await call(linkedPath+'&children_offset=20',b.jar)).status,404)
assert.equal((await call(endpoint+'?workspace_id='+child,a.jar)).data.children.length,0,'Parent-linked practices leaked into another workspace')
assert.equal((await call('student/ai-usage.php',a.jar)).data.operations.length,0,'Fixed learning consumed AI')
assert.equal((await call(endpoint,a.jar,body({action:'evaluate',workspace_id:parent.id,version_id:adopted.data.version_id,policy_version:'not-configured',policy_hash:'0'.repeat(64),accepted:true}))).status,503)
php('tests/pro/fixture.php','expire',a.id)
const expired=(await call(endpoint+'?workspace_id='+parent.id,a.jar)).data
assert.equal(expired.workspace.source.explanation,undefined)
assert.equal(expired.saved.text,changed.saved.text)
const expiredChildren=(await call(linkedPath+'&children_offset=20',a.jar)).data
assert.deepEqual(expiredChildren.children,page2.children,'Expiry lost owned linked history')
assert.equal(expiredChildren.membership.status,'expired')
assert.equal((await call(endpoint,a.jar,body({action:'save',workspace_id:parent.id,expected_version:changed.workspace.version,stage:'thesis',response:'This new paid attempt is not allowed after expiry.'}))).status,403)

assert.equal((await call(endpoint+'?request_id='+parent.lastRequest.request_id,a.jar)).data.version_id,parent.last.version_id)
assert.equal((await call(endpoint,a.jar,parent.lastRequest)).data.version_id,parent.last.version_id)
assert.equal((await call(endpoint,a.jar,parent.last)).status,422) // A receipt object is not a writable action.
for(const path of ['_skills.php','_skills_core.php','_skills_ai.php','_premium_files/skills-curriculum.json'])assert.equal((await fetch('http://localhost:4173/api/'+path)).status,404)
console.log('PASS skills native: all four guided journeys, deterministic checks, scoped ownership, concurrency, exact receipts, conflicts, immutable transfer/return, bounded older-linked paging and expiry history')
