import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const ROOT = 'http://127.0.0.1:18765/api/trees/index.php?action='
const evidence = n => readFileSync('/tmp/trees-isolated-fixtures/photo' + n + '.jpg')
const admin = JSON.parse(readFileSync('/tmp/trees-isolated-fixtures/admin-session.json','utf8'))
const plantedOn = new Date(Date.now()-45*86400000).toISOString().slice(0,10)
const today = new Date().toISOString().slice(0,10)

function requestClient() {
  const jar = new Map()
  return async (action, options={}) => {
    const {body, csrf, isAdmin=false, origin='http://127.0.0.1:18765'}=options
    const file=body instanceof FormData
    const headers = {
      Origin: origin,
      Cookie: isAdmin ? admin.cookie : [...jar].map(([k,v])=>k+'='+v).join('; ')
    }
    if (csrf) headers['X-CSRF-Token']=csrf
    if (body!==undefined && !file) headers['Content-Type']='application/json'
    const response=await fetch(ROOT+action,{method:body===undefined?'GET':'POST',headers,body:file?body:body!==undefined?JSON.stringify(body):undefined,redirect:'manual'})
    if(!isAdmin) for (const setCookie of response.headers.getSetCookie()) {
      const part=setCookie.split(';',1)[0], pos=part.indexOf('=')
      if(pos>0)jar.set(part.slice(0,pos),part.slice(pos+1))
    }
    const type=response.headers.get('content-type')||''
    const data=type.includes('application/json')?await response.json():type.startsWith('image/')?await response.arrayBuffer():await response.text()
    return {status:response.status,data,headers:response.headers}
  }
}
function evidenceForm(n,attrs={}) {
  const form=new FormData()
  for(const [key,val] of Object.entries(attrs))form.set(key,String(val))
  form.set('photo',new Blob([evidence(n)],{type:'image/jpeg'}),'photo.jpg')
  return form
}
function verify(r,expected) {
  assert.equal(r.status,expected,JSON.stringify(r.data).slice(0,300))
}

test('isolated account and evidence workflow',async t=>{
  const participant=requestClient()
  const guest=requestClient()
  const profile={name:'Example Planting Volunteer',mobile:'03000001001',city:'Multan',cnic:'1111100000001',password:'Example-Strong-Passphrase-2026',consent:true,public_name:true}
  let csrf='',key='',memberId='',first='',seed='',large='',survival=''
  await t.test('dashboard starts empty and catalogue is available',async()=>{
    const r=await participant('summary')
    verify(r,200)
    assert.equal(r.data.trees,0)
    assert.equal(r.data.target,100000000)
    assert.ok(Object.keys((await participant('catalog')).data.species).length>=18)
  })
  await t.test('register with consent and private credentials',async()=>{
    verify(await participant('register',{body:{...profile,consent:false}}),422)
    const r=await participant('register',{body:profile})
    verify(r,201)
    csrf=r.data.csrf_token
    key=r.data.recovery_key
    memberId=r.data.member.id
    assert.match(key,/^TREE-[A-F0-9]{48}$/)
    assert.equal(r.data.member.city,'Multan')
    verify(await guest('register',{body:{...profile,mobile:'03000001002'}}),409)
    verify(await guest('register',{body:{...profile,cnic:'2222200000001'}}),409)
  })
  await t.test('profile images require authentication and CSRF',async()=>{
    verify(await guest('queue'),401)
    verify(await guest('photo&kind=avatar&id='+memberId),401)
    verify(await participant('avatar',{body:evidenceForm(1),csrf:'wrong'}),403)
    const invalid=new FormData()
    invalid.set('photo',new Blob(['invalid file'],{type:'text/plain'}),'bad.txt')
    verify(await participant('avatar',{body:invalid,csrf}),422)
    verify(await participant('avatar',{body:evidenceForm(1),csrf}),200)
    const r=await participant('photo&kind=avatar&id='+memberId)
    verify(r,200)
    assert.equal(r.headers.get('content-type'),'image/jpeg')
    assert.ok(r.data.byteLength<=40960)
  })
  await t.test('submissions are pending and duplicate photos are refused',async()=>{
    const a={species:'neem',method:'sapling',quantity:2,planted_on:plantedOn,locality:'Test garden',public_photo:'yes'}
    let r=await participant('plant',{body:evidenceForm(2,a),csrf})
    verify(r,201)
    first=r.data.id
    verify(await participant('plant',{body:evidenceForm(2,a),csrf}),409)
    r=await participant('plant',{body:evidenceForm(3,{...a,method:'seed',quantity:3,public_photo:'no'}),csrf})
    verify(r,201)
    seed=r.data.id
    assert.equal((await participant('summary')).data.trees,0)
    verify(await guest('photo&kind=proof&id='+first),401)
    verify(await participant('mine'),200)
  })

  await t.test('moderator approval updates reviewed counts',async()=>{
    const queue=await guest('queue',{isAdmin:true})
    verify(queue,200)
    assert.equal(queue.data.reports.length,2)
    assert.equal(JSON.stringify(queue.data).includes(profile.mobile),false)
    verify(await guest('review',{isAdmin:true,csrf:'wrong',body:{id:first,decision:'approved',note:'Photo reviewed and valid.'}}),403)
    let r=await guest('review',{isAdmin:true,csrf:admin.csrf,body:{id:first,decision:'approved',note:'Photographic evidence and reported quantity reviewed.',field_checked:true,field_visit_date:today}})
    verify(r,200)
    r=await guest('review',{isAdmin:true,csrf:admin.csrf,body:{id:seed,decision:'approved',note:'Seed evidence and planting location reviewed.',field_checked:true,field_visit_date:today}})
    verify(r,200)
    const totals=await participant('summary')
    assert.equal(totals.data.trees,2)
    assert.equal(totals.data.seeds,3)
    assert.equal(totals.data.contributors,1)
    assert.equal(totals.data.leaderboard[0].name,profile.name)
    assert.equal(totals.data.public_gallery.length,1)
    verify(await guest('photo&kind=proof&id='+first),200)
    verify(await guest('photo&kind=proof&id='+seed),401)
  })
  await t.test('large claims require physical verification',async()=>{
    const payload={species:'jamun',method:'sapling',quantity:6,planted_on:plantedOn,locality:'Large test field',public_photo:'no'}
    let r=await participant('plant',{body:evidenceForm(4,payload),csrf})
    verify(r,201)
    large=r.data.id
    r=await guest('review',{isAdmin:true,csrf:admin.csrf,body:{id:large,decision:'approved',note:'Trying without checking the site.'}})
    verify(r,422)
    assert.equal(r.data.error,'field_check_required')
    r=await guest('review',{isAdmin:true,csrf:admin.csrf,body:{id:large,decision:'approved',note:'Site was checked and quantity was reviewed.',field_checked:true,field_visit_date:today}})
    verify(r,200)
    assert.equal((await participant('summary')).data.trees,8)
  })
  await t.test('survival evidence remains private until reviewed',async()=>{
    let r=await participant('followup',{body:evidenceForm(5,{planting_id:first,phase:30,surviving:1}),csrf})
    verify(r,201)
    survival=r.data.id
    verify(await guest('photo&kind=followup&id='+survival),401)
    verify(await guest('followup-queue'),401)
    const queue=await guest('followup-queue',{isAdmin:true})
    verify(queue,200)
    assert.equal(queue.data.reports.length,1)
    r=await guest('followup-review',{isAdmin:true,csrf:admin.csrf,body:{id:survival,decision:'approved',note:'Follow-up evidence reviewed against initial report.'}})
    verify(r,200)
    assert.equal((await participant('summary')).data.survival_checks,1)
  })
  await t.test('revocation subtracts disputed claims',async()=>{
    const r=await guest('review',{isAdmin:true,csrf:admin.csrf,body:{id:large,decision:'revoked',note:'Review found the claim was not supported by evidence.'}})
    verify(r,200)
    const totals=(await participant('summary')).data
    assert.equal(totals.trees,2)
    assert.equal(totals.seeds,3)
  })

  await t.test('offline recovery invalidates sessions and old keys',async()=>{
    let r=await participant('recover',{body:{mobile:profile.mobile,recovery_key:key,new_password:'Updated-Example-Password-2026'}})
    verify(r,200)
    assert.notEqual(r.data.recovery_key,key)
    verify(await participant('mine'),401)
    verify(await participant('recover',{body:{mobile:profile.mobile,recovery_key:key,new_password:'Repeated-Example-Password-2026'}}),401)
    r=await participant('login',{body:{mobile:profile.mobile,password:'Updated-Example-Password-2026'}})
    verify(r,200)
    csrf=r.data.csrf_token
    verify(await participant('mine'),200)
  })
  await t.test('deletion erases personal evidence and subtracts counters',async()=>{
    verify(await participant('delete-account',{csrf:'wrong',body:{confirm:'DELETE',password:'Updated-Example-Password-2026'}}),403)
    verify(await participant('delete-account',{csrf,body:{confirm:'DELETE',password:'incorrect'}}),401)
    verify(await participant('delete-account',{csrf,body:{confirm:'DELETE',password:'Updated-Example-Password-2026'}}),200)
    const totals=(await guest('summary')).data
    assert.equal(totals.trees,0)
    assert.equal(totals.seeds,0)
    assert.equal(totals.contributors,0)
    assert.equal(totals.survival_checks,0)
    assert.equal(totals.public_gallery.length,0)
    verify(await guest('photo&kind=proof&id='+first),404)
    verify(await participant('mine'),401)
    verify(await participant('login',{body:{mobile:profile.mobile,password:'Updated-Example-Password-2026'}}),401)
  })
})
