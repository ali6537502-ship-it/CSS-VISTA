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
