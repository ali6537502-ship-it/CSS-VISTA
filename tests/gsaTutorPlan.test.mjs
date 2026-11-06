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
 if(p.document.querySelector('[data-choice]')){
  const prompt=p.document.querySelector('.lesson-card h2').textContent.trim();
  const sourceQuestion=chapter(1).questions.find(q=>q.prompt===prompt);
  assert.ok(sourceQuestion,'The source question must have a valid answer key');
  p.click('[data-choice="'+sourceQuestion.answer+'"]');
 }
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

test('chapter practice records the actual missed question and preserves every retest',async()=>{
 const p=await open();
 p.click('[data-view="practice"]');
 p.click('[data-practice="6"]');
 await wait(40);
 const c=chapter(6),q=c.questions[0],wrong=Object.keys(q.options).find(x=>x!==q.answer);
 assert.ok(p.document.querySelector('[data-quiz-choice="'+wrong+'"]'));
 p.click('[data-quiz-choice="'+wrong+'"]');
 let state=JSON.parse(p.dom.window.localStorage.getItem(KEY));
 assert.equal(state.questionReview[q.id].unresolved,true);
 assert.equal(state.questionReview[q.id].chapter,6);
 assert.equal(state.revisit[c.sections[0].id],undefined,'A wrong chapter question must not flag the first lesson');
 assert.equal(Object.keys(state.quizAttempts).length,1);
 p.click('[data-action="nextquestion"]');
 assert.match(p.document.querySelector('.panel.accent').textContent,/0 correct out of 1 questions answered in this attempt/);
 p.click('[data-action="restartquestions"]');
 assert.match(p.document.getElementById('app').textContent,/Previous practice attempts/);
 assert.match(p.document.getElementById('app').textContent,/0 \/ 1 correct/);
 p.click('[data-quiz-choice="'+q.answer+'"]');
 state=JSON.parse(p.dom.window.localStorage.getItem(KEY));
 assert.equal(state.questionReview[q.id].unresolved,false,'A later successful retest resolves the missed question');
 assert.equal(Object.keys(state.quizAttempts).length,2,'Both attempts must persist');
 const results=Object.values(state.quizAttempts).map(a=>a.responses[q.id]?.correct);
 assert.ok(results.includes(true)&&results.includes(false),'Historical incorrect attempt remains available');
 assert.equal(state.quizHistory[q.id].correct,true,'Compatibility latest-answer record remains available');
 p.dom.window.close();
});

test('revision notebook takes the learner directly to the exact missed question',async()=>{
 const p=await open();
 const c=chapter(6),q=c.questions[0],wrong=Object.keys(q.options).find(x=>x!==q.answer);
 p.click('[data-view="practice"]');
 p.click('[data-practice="6"]');
 await wait(40);
 p.click('[data-quiz-choice="'+wrong+'"]');
 p.click('[data-view="review"]');
 assert.ok(p.document.querySelector('[data-review-question="'+q.id+'"]'),'Missed question must be visible');
 p.click('[data-review-question="'+q.id+'"]');
 await wait(40);
 assert.match(p.document.querySelector('.panel').textContent,/Targeted revision/);
 assert.equal(p.document.querySelectorAll('[data-quiz-choice]').length,4);
 p.click('[data-quiz-choice="'+q.answer+'"]');
 p.click('[data-action="returnreview"]');
 assert.equal(p.document.querySelector('[data-review-question="'+q.id+'"]'),null);
 p.dom.window.close();
});

test('studied lessons are distinct from self-rated clear lessons',async()=>{
 const id=catalog.chapters[0].sections[0].id;
 const p=await open({plan:{days:20,startDate:'2026-11-01'},completed:{[id]:{at:'2026-11-01T09:00:00Z',selfRating:'partial'}},revisit:{[id]:{at:'2026-11-01T09:00:00Z',kind:'lesson'}}});
 const stats=[...p.document.querySelectorAll('.stat-row strong')].map(el=>el.textContent);
 assert.equal(stats[0],'1 / 141','Studied counter is retained');
 assert.equal(stats[1],'0 / 141','Partly clear is never displayed as confident');
 assert.match(p.document.querySelector('.stat-row').textContent,/Self-rated clear/);
 p.dom.window.close();
});

test('a wrong concept check cannot be self-rated clear until it is passed',async()=>{
 const p=await open();
 p.click('[data-view="library"]');
 p.click('[data-chapter="17"]');
 await wait(35);
 const id=chapter(17).sections[0].id;
 p.click('[data-lesson="'+id+'"]');
 await wait(35);
 while(p.document.querySelector('[data-action="nextbeat"]'))p.click('[data-action="nextbeat"]');
 assert.ok(p.document.querySelector('[data-choice]'),'This lesson should contain a source understanding check');
 const prompt=p.document.querySelector('.lesson-card h2').textContent.trim();
 const q=chapter(17).questions.find(q=>q.prompt===prompt);
 assert.ok(q,'Source check must map to the published question');
 const wrong=Object.keys(q.options).find(x=>x!==q.answer);
 p.click('[data-choice="'+wrong+'"]');
 p.click('[data-action="torecall"]');
 let textarea=p.document.getElementById('recall');
 textarea.value='This explanation covers the scientific process and its components, but I need to review the concept more thoroughly.';
 textarea.dispatchEvent(new p.dom.window.Event('input',{bubbles:true}));
 p.click('[data-action="reveal"]');
 p.click('[data-grade="gotit"]');
 p.click('[data-action="finish"]');
 let state=JSON.parse(p.dom.window.localStorage.getItem(KEY));
 assert.equal(state.completed[id],undefined,'Uncorrected error cannot be marked clear');
 assert.ok(state.revisit[id],'Missed concept stays assigned for revision');
 assert.match(p.document.getElementById('app').textContent,/Answer it correctly before marking this lesson clear/);
 p.click('[data-choice="'+q.answer+'"]');
 p.click('[data-action="torecall"]');
 textarea=p.document.getElementById('recall');
 if(!textarea.value.trim()){
   textarea.value='The correct concept is the process explained in the original section and supported by its documented scientific evidence.';
   textarea.dispatchEvent(new p.dom.window.Event('input',{bubbles:true}));
 }
 p.click('[data-action="reveal"]');
 p.click('[data-grade="gotit"]');
 p.click('[data-action="finish"]');
 state=JSON.parse(p.dom.window.localStorage.getItem(KEY));
 assert.equal(state.completed[id].selfRating,'gotit');
 assert.equal(state.revisit[id],undefined);
 assert.equal(state.questionReview[q.id].unresolved,false);
 p.dom.window.close();
});

test('rest days are excluded without dropping lessons or changing the total number of study sessions',async()=>{
 const p=await open();
 p.click('[data-days="8"]');
 const monday=p.document.querySelector('[data-rest-day="1"]'),friday=p.document.querySelector('[data-rest-day="5"]');
 for(const cb of [monday,friday]){cb.checked=true;cb.dispatchEvent(new p.dom.window.Event('change',{bubbles:true}))}
 const minutes=p.document.getElementById('daily-minutes');minutes.value='60';minutes.dispatchEvent(new p.dom.window.Event('change',{bubbles:true}));
 p.click('[data-action="saveplan"]');
 const saved=JSON.parse(p.dom.window.localStorage.getItem(KEY));
 assert.deepEqual(saved.plan.restDays,[1,5]);assert.equal(saved.plan.dailyMinutes,60);
 p.click('[data-action="expandplan"]');
 const rows=[...p.document.querySelectorAll('.day')];
 assert.equal(rows.length,8);
 const dates=rows.map(row=>{const m=row.querySelector('summary strong').textContent.match(/\d{1,2} [A-Za-z]+ \d{4}/);return new Date(m[0]+' 12:00:00 UTC').getUTCDay()});
 assert.ok(dates.every(day=>day!==1&&day!==5),'No active session may land on an excluded weekday');
 assert.equal(p.document.querySelectorAll('.day-lesson').length,141);
 p.click('[data-action="editplan"]');
 assert.equal(p.document.getElementById('daily-minutes').value,'60');
 assert.ok(p.document.querySelector('[data-rest-day="1"]').checked);
 assert.ok(p.document.querySelector('[data-rest-day="5"]').checked);
 p.dom.window.close();
});

test('dated recall is explicitly scheduled and retained after plan changes',async()=>{
 const id=catalog.chapters[0].sections[0].id;
 const dueDate='2026-01-01',old={at:'2025-12-30T10:00:00Z',date:dueDate,stage:1};
 const p=await open({plan:{days:20,startDate:'2026-01-01'},completed:{[id]:{at:'2025-12-30T10:00:00Z',selfRating:'gotit'}},reviewDue:{[id]:old},recallAttempts:{}});
 assert.match(p.document.getElementById('app').textContent,/review due/);
 p.click('[data-view="review"]');
 assert.match(p.document.getElementById('app').textContent,/Recall due/);
 assert.ok(p.document.querySelector('[data-lesson="'+id+'"]'),'Due lesson must be accessible');
 p.click('[data-view="course"]');
 p.click('[data-action="editplan"]');
 p.document.getElementById('custom-days').value='60';
 p.click('[data-action="saveplan"]');
 const updated=JSON.parse(p.dom.window.localStorage.getItem(KEY));
 assert.equal(updated.reviewDue[id].date,dueDate);
 assert.equal(updated.plan.days,60);
 p.dom.window.close();
});

test('science models show the correct source-linked concept and respond to the learner',async()=>{
 const p=await open();
 const checks=[
  {chapter:3,id:'c3-s3-4',selector:'[data-eclipse="lunar"]',fragment:'Earth between Sun and Moon'},
  {chapter:5,id:'c5-s5-2',selector:'[data-seismic="S"]',fragment:'S waves displace material perpendicular'},
  {chapter:9,id:'c9-s9-3',selector:'[data-osm="hyper"]',fragment:'Net water moves out of the cell'},
  {chapter:18,id:'c18-s18-1',selector:'[data-water="4"]',fragment:'step 5 highlighted'}
 ];
 for(const item of checks){
   p.click('[data-view="library"]');p.click('[data-chapter="'+item.chapter+'"]');await wait(35);
   p.click('[data-lesson="'+item.id+'"]');await wait(35);
   assert.ok(p.document.querySelector(item.selector),'Expected model control for '+item.id);
   p.click(item.selector);
   const graphic=p.document.querySelector('.science-graphic svg');
   assert.ok(graphic,'Expected scientific diagram '+item.id);
   assert.match(graphic.getAttribute('aria-label'),new RegExp(item.fragment));
   assert.equal(p.document.querySelector(item.selector).getAttribute('aria-pressed'),'true');
   const link=p.document.querySelector('.model a[href^="https://"]');
   assert.ok(link,'Model must retain a primary or academic reference');
 }
 p.dom.window.close();
});

test('corrupt day or impossible all-week-off plans are refused without removing saved work',async()=>{
 const p=await open({plan:{days:8,startDate:'2026-11-01'},completed:{'c1-s1-1':{at:'2026-11-01T10:00:00Z',selfRating:'gotit'}}});
 p.click('[data-action="editplan"]');
 p.document.getElementById('start-date').value='2026-02-30';
 // HTML date inputs reject nonsensical dates before custom validation.
 for(let n=0;n<7;n++){const el=p.document.querySelector('[data-rest-day="'+n+'"]');el.checked=true;el.dispatchEvent(new p.dom.window.Event('change',{bubbles:true}))}
 p.click('[data-action="saveplan"]');
 assert.match(p.document.getElementById('app').textContent,/at least one active weekday/);
 const saved=JSON.parse(p.dom.window.localStorage.getItem(KEY));
 assert.ok(saved.completed['c1-s1-1'],'Rescheduling validation must not erase lesson work');
 p.dom.window.close();
});

test('short course clearly warns when tentative workload exceeds available time',async()=>{
 const p=await open();
 p.click('[data-days="5"]');
 const input=p.document.getElementById('daily-minutes');
 input.value='30';input.dispatchEvent(new p.dom.window.Event('change',{bubbles:true}));
 p.click('[data-action="saveplan"]');
 assert.match(p.document.getElementById('app').textContent,/estimated workload exceeding your stated time/);
 const saved=JSON.parse(p.dom.window.localStorage.getItem(KEY));
 assert.equal(saved.plan.dailyMinutes,30);
 assert.equal(saved.plan.days,5);
 p.dom.window.close();
});
