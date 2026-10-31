import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { JSDOM } from 'jsdom'

const html=fs.readFileSync('public/gsa-tutor/studio.html','utf8')
const script=fs.readFileSync('public/gsa-tutor/studio-v2.js','utf8')
const catalog=JSON.parse(fs.readFileSync('public/gsa-tutor/content/catalog.json','utf8'))
const chapter=id=>JSON.parse(fs.readFileSync('public/gsa-tutor/content/chapter-'+String(id).padStart(2,'0')+'.json','utf8'))
const KEY='cssvista:tool:gsa-tutor:v1'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
async function open(saved,storage={}){
 const requests=[]
 const dom=new JSDOM(html,{url:'https://www.css-vista.com/gsa-tutor/studio.html',runScripts:'outside-only',pretendToBeVisual:true,beforeParse(window){if(saved)window.localStorage.setItem(KEY,JSON.stringify(saved));for(const [key,value]of Object.entries(storage))window.localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value))}})
 dom.window.scrollTo=()=>{}
 dom.window.fetch=async url=>{
   requests.push(String(url))
   const path=String(url)
   if(path.endsWith('/catalog.json'))return {ok:true,json:async()=>catalog}
   const match=path.match(/chapter-(\d+)\.json$/)
   if(match)return {ok:true,json:async()=>chapter(Number(match[1]))}
   return {ok:false,status:404}
 }
 dom.window.eval(script)
 await wait(30)
 return {dom,requests,document:dom.window.document,click(selector){const button=dom.window.document.querySelector(selector);assert.ok(button,selector+' unavailable');button.click()}}
}
test('course loads only a small catalogue until a chapter is opened',async()=>{
 const p=await open()
 assert.deepEqual(p.requests,['/gsa-tutor/content/catalog.json'])
 assert.equal(p.document.querySelectorAll('.duration').length,6)
 p.click('[data-view="library"]')
 p.click('[data-chapter="1"]')
 await wait(35)
 assert.ok(p.requests.includes('/gsa-tutor/content/chapter-01.json'))
 assert.equal(p.requests.length,2)
 assert.equal(p.document.querySelectorAll('[data-chapter="2"]').length,0)
 p.dom.window.close()
})
test('every duration retains all 141 unique lessons',async()=>{
 const p=await open()
 for(const n of [5,8,14,20,30,45,60,120]){
   if(p.document.querySelector('[data-action="editplan"]'))p.click('[data-action="editplan"]')
   const input=p.document.getElementById('custom-days')
   input.value=String(n)
   p.click('[data-action="saveplan"]')
   if(p.document.querySelector('[data-action="expandplan"]'))p.click('[data-action="expandplan"]')
   const days=[...p.document.querySelectorAll('.day')]
   assert.equal(days.length,n)
   const ids=[...p.document.querySelectorAll('.day-lesson')].map(el=>el.dataset.lesson)
   assert.equal(ids.length,141)
   assert.equal(new Set(ids).size,141)
   assert.ok(days.every(x=>x.querySelectorAll('.day-lesson').length>=1))
 }
 p.dom.window.close()
})
test('deep lesson uses full original sections with progressive reading and written recall',async()=>{
 const p=await open()
 p.click('[data-days="20"]')
 p.click('[data-action="saveplan"]')
 p.click('.day-lesson')
 await wait(35)
 assert.equal(p.requests.length,2)
 const first=chapter(1).sections[0]
 const source=first.text.trim().split(/\s+/).length
 assert.ok(source>145)
 assert.ok(p.document.querySelector('.lesson-card .study-copy').textContent.length>0)
 let steps=0
 while(p.document.querySelector('[data-action="nextbeat"]')&&steps<40){p.click('[data-action="nextbeat"]');steps++}
 assert.ok(steps>=2,'the lesson must have multiple substantive explanations')
 assert.ok(p.document.querySelector('[data-action="torecall"]')||p.document.getElementById('recall'))
 // When a source MCQ is linked to this lesson, answer it before recall.
 if(p.document.querySelector('[data-choice]'))p.click('[data-choice]')
 if(p.document.querySelector('[data-action="torecall"]'))p.click('[data-action="torecall"]')
 const textarea=p.document.getElementById('recall')
 assert.ok(textarea,'the learner must write an explanation')
 textarea.value='The universe includes space and time. We can use observations and models to understand evidence for scientific processes.'
 textarea.dispatchEvent(new p.dom.window.Event('input',{bubbles:true}))
 p.click('[data-action="reveal"]')
 assert.ok(p.document.querySelector('.compare .study-copy').textContent.length>100)
 p.click('[data-grade="gotit"]')
 p.click('[data-action="finish"]')
 const stored=JSON.parse(p.dom.window.localStorage.getItem(KEY))
 assert.ok(stored.completed[first.id], 'lesson completion must persist')
 assert.ok(stored.drafts[first.id], 'written recall must persist')
 p.dom.window.close()
})
test('rescheduling keeps saved completion, revision, bookmarks and drafts',async()=>{
 const p=await open()
 p.click('[data-days="8"]')
 p.click('[data-action="saveplan"]')
 const state=JSON.parse(p.dom.window.localStorage.getItem(KEY))
 const first=catalog.chapters[0].sections[0].id
 state.completed[first]={at:'2026-10-30T10:00:00Z',selfRating:'gotit'}
 state.revisit[first]={at:'2026-10-30T09:00:00Z',kind:'manual'}
 state.bookmarks[first]={at:'2026-10-30T10:00:00Z'}
 state.drafts[first]='A substantive explanatory attempt'
 const q=await open(state)
 assert.equal(q.document.querySelectorAll('.day-lesson.done').length,1)
 q.click('[data-action="editplan"]')
 q.document.getElementById('custom-days').value='60'
 q.click('[data-action="saveplan"]')
 const saved=JSON.parse(q.dom.window.localStorage.getItem(KEY))
 assert.equal(saved.plan.days,60)
 assert.ok(saved.completed[first]&&saved.revisit[first]&&saved.bookmarks[first]&&saved.drafts[first])
 q.dom.window.close();p.dom.window.close()
})
test('another account hydration does not leak previous account study history',async()=>{
 const p=await open({completed:{'c1-s1-1':{at:'2026-10-30'}},plan:{days:8,startDate:'2026-10-30'}})
 const e=new p.dom.window.MessageEvent('message',{data:{type:'cssvista:gsa:hydrate',snapshot:{completed:{},revisit:{},bookmarks:{},plan:null}},origin:'https://www.css-vista.com',source:p.dom.window.parent})
 p.dom.window.dispatchEvent(e)
 assert.equal(p.document.querySelectorAll('.day').length,0)
 assert.ok(p.document.querySelector('.duration'))
 p.dom.window.close()
})
test('standalone stale course cannot write into a different account',async()=>{
 const p=await open({plan:{days:8,startDate:'2026-10-30'},completed:{'c1-s1-1':{at:'2026-10-30'}}},{'cssvista:progress-owner':'fixture-a'})
 p.click('.day-lesson');await wait(35)
 const other={plan:null,completed:{},drafts:{}}
 p.dom.window.localStorage.setItem('cssvista:progress-owner','fixture-b')
 p.dom.window.localStorage.setItem(KEY,JSON.stringify(other))
 p.click('[data-action="bookmark"]')
 assert.deepEqual(JSON.parse(p.dom.window.localStorage.getItem(KEY)),other)
 assert.match(p.document.getElementById('app').textContent,/Study account changed/)
 assert.equal(p.document.querySelectorAll('.lesson-card').length,0)
 p.dom.window.close()
})
test('standalone storage ownership change hides the previous course before another action',async()=>{
 const p=await open({plan:{days:8,startDate:'2026-10-30'},completed:{'c1-s1-1':{at:'2026-10-30'}}},{'cssvista:progress-owner':'fixture-a'})
 p.dom.window.localStorage.setItem('cssvista:progress-owner','fixture-b')
 p.dom.window.dispatchEvent(new p.dom.window.StorageEvent('storage',{key:'cssvista:progress-owner',oldValue:'fixture-a',newValue:'fixture-b'}))
 assert.match(p.document.getElementById('app').textContent,/Study account changed/)
 assert.equal(p.document.querySelectorAll('.day-lesson').length,0)
 assert.ok(p.document.querySelector('[data-action="reloadaccount"]'))
 p.dom.window.close()
})
test('standalone uses reset partitions and rejects a stale generation without overwriting legacy data',async()=>{
 const physical=epoch=>`cssvista:reset-data:v1:fixture-a:${epoch}:${encodeURIComponent(KEY)}`
 const legacy={plan:{days:5,startDate:'2026-10-30'},drafts:{private:'Legacy work stays retained'}}
 const p=await open(legacy,{'cssvista:progress-owner':'fixture-a','cssvista:sync-generation:v1:fixture-a':'one',[physical('one')]:{plan:{days:8,startDate:'2026-10-30'},completed:{'c1-s1-1':{at:'2026-10-30'}}}})
 assert.equal(p.document.querySelectorAll('.day-lesson.done').length,1)
 p.click('[data-action="editplan"]');p.document.getElementById('custom-days').value='60';p.click('[data-action="saveplan"]')
 assert.equal(JSON.parse(p.dom.window.localStorage.getItem(physical('one'))).plan.days,60)
 assert.deepEqual(JSON.parse(p.dom.window.localStorage.getItem(KEY)),legacy)
 p.dom.window.localStorage.setItem('cssvista:sync-generation:v1:fixture-a','two')
 p.click('[data-action="editplan"]');p.document.getElementById('custom-days').value='30';p.click('[data-action="saveplan"]')
 assert.equal(p.dom.window.localStorage.getItem(physical('two')),null)
 assert.equal(JSON.parse(p.dom.window.localStorage.getItem(physical('one'))).plan.days,60)
 assert.match(p.document.querySelector('[role="alert"]').textContent,/could not be saved/)
 const q=await open(legacy,{'cssvista:progress-owner':'fixture-a','cssvista:sync-generation:v1:fixture-a':'two'})
 assert.ok(q.document.querySelector('.duration'),'Reset course must not recover the retired root')
 q.click('[data-days="8"]');q.click('[data-action="saveplan"]')
 assert.equal(JSON.parse(q.dom.window.localStorage.getItem(physical('two'))).plan.days,8)
 assert.deepEqual(JSON.parse(q.dom.window.localStorage.getItem(KEY)),legacy)
 p.dom.window.close();q.dom.window.close()
})
test('chapter inventories preserve every source question and model answer without invention',()=>{
 let totalLessons=0,totalQuestions=0,totalAnalytical=0;const ids=new Set();const prompts=new Set()
 for(const meta of catalog.chapters){
  const c=chapter(meta.id)
  assert.equal(c.sections.length,meta.sections.length)
  totalLessons+=c.sections.length;totalQuestions+=c.questions.length;totalAnalytical+=c.analytical.length
  for(const q of c.questions){
   assert.equal(Object.keys(q.options).length,4)
   assert.ok(['A','B','C','D'].includes(q.answer),q.id)
   assert.ok(q.options[q.answer],q.id)
   assert.ok(q.explanation.trim().length>0,q.id)
   assert.ok(!ids.has(q.id),q.id);ids.add(q.id)
   assert.ok(!prompts.has(q.prompt.toLowerCase().trim()),q.id);prompts.add(q.prompt.toLowerCase().trim())
  }
 }
 assert.equal(totalLessons,141)
 assert.equal(totalQuestions,250)
 assert.equal(totalAnalytical,31)
})
