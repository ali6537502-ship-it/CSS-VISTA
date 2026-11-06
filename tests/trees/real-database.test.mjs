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
