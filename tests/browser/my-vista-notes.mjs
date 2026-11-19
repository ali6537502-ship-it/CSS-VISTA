// Disposable browser fixture; intercept all account APIs and never contact production.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright-core'
import { startArtifactPreview } from './artifact-preview.mjs'

const {server,origin}=await startArtifactPreview(resolve(import.meta.dirname,'../../dist'))
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']})
const context=await browser.newContext({viewport:{width:1400,height:900},reducedMotion:'reduce'})
const studentId='11111111-1111-4111-8111-111111111111'
const folders=[],notes=[],pages=new Map()
let failSave=false,notesWrites=0
const reply=(route,data,status=200)=>route.fulfill({status,json:data,headers:{'cache-control':'no-store'}})
await context.route('**/*',async route=>{
 const request=route.request(),url=new URL(request.url())
 if(url.origin!==origin)return route.abort('blockedbyclient')
 if(!url.pathname.startsWith('/api/'))return route.continue()
 if(url.pathname==='/api/auth/session.php')return reply(route,{ok:true,authenticated:true,provider:'hostinger',user:{id:studentId,email:'fixture@example.invalid',display_name:'Browser Fixture',profile_complete:true,user_metadata:{full_name:'Browser Fixture'}}})
 if(url.pathname==='/api/auth/workspace-preview.php')return reply(route,{enabled:true,user_id:studentId})
 if(url.pathname==='/api/workspace-release.php')return reply(route,{enabled:true})
 if(url.pathname==='/api/pro-release.php')return reply(route,{paused:true})
 if(url.pathname==='/api/student/progress.php')return reply(route,{ok:true,payload:{}})
 if(url.pathname!=='/api/student/notes.php')return reply(route,{error:'fixture_only',message:'Not available in browser fixture'},503)
 const now=new Date().toISOString()
 if(request.method()==='GET'){
  const view=url.searchParams.get('view')||'list'
  if(view==='list'){
   const folder=url.searchParams.get('folder')||'root'
   const search=(url.searchParams.get('search')||'').toLowerCase()
   const entries=notes.filter(n=>!n.deleted_at&&(search?n.title.toLowerCase().includes(search):n.folder_id===(folder==='root'?null:folder)))
   return reply(route,{ok:true,folders,notes:entries,has_more:false,next_offset:entries.length})
  }
  if(view==='note'){
   const note=notes.find(n=>n.id===url.searchParams.get('id'))
   if(!note)return reply(route,{error:'not_found'},404)
   const metadata=[...pages.values()].filter(p=>p.note_id===note.id).map(({id,position,version,deleted_at,updated_at})=>({id,position,version,deleted_at,updated_at}))
   return reply(route,{ok:true,note,pages:metadata})
  }
  if(view==='page'){
   const item=pages.get(url.searchParams.get('id'))
   return item?reply(route,{ok:true,page:item}):reply(route,{error:'not_found'},404)
  }
  if(view==='history')return reply(route,{ok:true,revisions:[]})
  return reply(route,{error:'fixture_missing'},404)
 }
 if(request.method()!=='POST')return reply(route,{error:'method'},405)
 const body=request.postDataJSON()
 if(body.action==='note_create'){
  const id=randomUUID(),pageId=randomUUID()
  notes.push({id,folder_id:body.folder_id||null,title:body.title||'Untitled note',pinned:false,deleted_at:null,created_at:now,updated_at:now})
  pages.set(pageId,{id:pageId,note_id:id,position:1,content_html:'',version:1,deleted_at:null,updated_at:now})
  return reply(route,{ok:true,id,page_id:pageId})
 }
 if(body.action==='note_update'){
  const note=notes.find(n=>n.id===body.id)
  if(!note)return reply(route,{error:'not_found'},404)
  for(const k of ['title','folder_id','pinned'])if(k in body)note[k]=body[k]
  return reply(route,{ok:true,id:note.id})
 }
 if(body.action==='page_create'){
  const id=randomUUID(),position=[...pages.values()].filter(p=>p.note_id===body.note_id).length+1
  pages.set(id,{id,note_id:body.note_id,position,version:1,content_html:'',deleted_at:null,updated_at:now})
  return reply(route,{ok:true,id,position,version:1})
 }
 if(body.action==='page_save'){
  notesWrites++
  if(failSave)return reply(route,{error:'notes_unavailable',message:'Simulated network interruption'},503)
  const entry=pages.get(body.id)
  if(!entry)return reply(route,{error:'not_found'},404)
  if(body.version!==entry.version)return reply(route,{error:'note_version_conflict',message:'Other device saved first'},409)
  entry.content_html=body.html;entry.version++;entry.updated_at=now
  return reply(route,{ok:true,id:entry.id,version:entry.version})
 }
 return reply(route,{error:'fixture_missing'},503)
})
const page=await context.newPage(),errors=[]
page.setDefaultTimeout(25000)
page.on('pageerror',error=>errors.push(error.message))
try{
 await page.goto(origin+'/account/notes',{waitUntil:'domcontentloaded'})
 await page.getByRole('heading',{name:'My Notes'}).waitFor()
 await page.getByRole('button',{name:'New note'}).click()
 const editor=page.getByRole('textbox',{name:'Write your note'})
 await editor.waitFor()
 await editor.fill('Drafting an original research outline.')
 await page.getByText('Saved to account',{exact:true}).waitFor({timeout:15000})
 assert.ok([...pages.values()][0].content_html.includes('Drafting an original research outline.'))
 assert.ok(notesWrites>=1,'Autosave must send content to fixture server')
 for(const label of ['Bold','Italic','Underline','Strikethrough','Font size','Font family','Highlight color','Bullet list','Numbered list']){
  assert.ok(await page.getByLabel(label,{exact:true}).count(),'Missing formatting control: '+label)
 }
 failSave=true
 await editor.fill('Original text plus an unsynced private continuation.')
 await page.getByText('Offline draft',{exact:true}).waitFor({timeout:15000})
 await page.waitForTimeout(500)
 const draft=await page.evaluate(async()=>await new Promise(resolve=>{
  const open=indexedDB.open('cssvista-personal-notes-drafts',1)
  open.onerror=()=>resolve(null)
  open.onsuccess=()=>{
   const tx=open.result.transaction('drafts','readonly'),req=tx.objectStore('drafts').getAll()
   req.onsuccess=()=>resolve(req.result[0]??null)
   req.onerror=()=>resolve(null)
  }
 }))
 assert.ok(draft?.html.includes('unsynced private continuation'),'Device draft must survive failed cloud save')

 const cloudPage=[...pages.values()][0]
 cloudPage.content_html='<p>Newer edit from a different signed-in device.</p>'
 cloudPage.version++
 failSave=false
 page.on('dialog',dialog=>dialog.accept())
 await page.reload({waitUntil:'domcontentloaded'})
 await page.getByText('Save conflict',{exact:true}).waitFor({timeout:15000})
 assert.ok((await editor.innerText()).includes('unsynced private continuation'),'Unsynced local draft must survive a remote conflict')
 assert.ok(cloudPage.content_html.includes('Newer edit'),'Newer cloud edit must not be overwritten')
 await page.getByRole('button',{name:'Preserve my draft as a new page'}).click()
 await page.getByText('Saved to account',{exact:true}).waitFor({timeout:15000})
 assert.equal([...pages.values()].length,2,'Conflict should be recoverable as an additional page')
 await page.setViewportSize({width:390,height:844})
 await page.waitForTimeout(300)
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile viewport must not overflow horizontally')
 assert.deepEqual(errors,[],'No uncaught errors in notes editor fixture')
 console.log('My VISTA Notes browser fixture passed')
}finally{
 await context.close()
 await browser.close()
 await new Promise(resolve=>server.close(resolve))
}
