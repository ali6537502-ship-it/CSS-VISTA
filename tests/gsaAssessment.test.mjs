import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {createHash} from 'node:crypto'
const context=vm.createContext({});vm.runInContext(readFileSync('public/gsa-tutor/assessment-engine.js','utf8'),context)
const engine=context.CSSVistaGSAAssessment
const bank=Array.from({length:30},(_,i)=>({id:'q'+i,chapter:i%10+1,domain:'domain'+i%5,lessonId:'l'+i,prompt:'Question '+i,options:{A:'one',B:'two',C:'three',D:'four'},answer:'B',explanation:'Source explanation',contentVersion:'v1',verification:{status:'unreviewed'}}))
const at='2026-11-12T10:00:00Z',ts=Date.parse(at)
const config={mode:'diagnostic',count:15}
test('diagnostic sampling balances domains and chapters without duplicating IDs',()=>{
 const selected=engine.selectQuestions(bank,config)
 assert.equal(selected.length,15);assert.equal(new Set(selected.map(q=>q.id)).size,15)
 for(let i=0;i<5;i++)assert.equal(selected.filter(q=>q.domain==='domain'+i).length,3)
 assert.equal(new Set(selected.slice(0,10).map(q=>q.chapter)).size,10)
})
test('cumulative tests require an explicit studied-lesson link and never silently expand scope',()=>{
 const selected=engine.selectQuestions([...bank,{...bank[0],id:'untagged',lessonId:null}],{mode:'cumulative',count:15,completedLessons:['l0','l1']})
 assert.equal(selected.length,2);assert.ok(selected.every(q=>['l0','l1'].includes(q.lessonId)))
 assert.throws(()=>engine.createAttempt(bank,{...config,mode:'cumulative'},at,'a'),/explicitly linked/)
})
test('chapter and incorrect-question modes retain their exact selections',()=>{
 assert.ok(engine.selectQuestions(bank,{mode:'chapter',count:20,chapters:[3]}).every(q=>q.chapter===3))
 assert.equal(engine.selectQuestions(bank,{mode:'incorrect',count:20,missedIds:['q7']})[0].id,'q7')
})
test('question snapshots preserve the administered keys when content changes',()=>{
 const attempt=engine.createAttempt(bank,config,at,'a')
 const original=attempt.questions[0].answer,q=bank.find(q=>q.id===attempt.questions[0].id);q.answer='D';assert.equal(attempt.questions[0].answer,original);q.answer='B'
})
test('timed practice uses a persisted wall-clock deadline across reloads and rejects late answers',()=>{
 const a=engine.createAttempt(bank,{mode:'timed',count:2,minutes:1},at,'a')
 const events={one:{attemptId:'a',type:'answer',questionId:a.questions[0].id,selected:'B',at:new Date(ts+10000).toISOString()},late:{attemptId:'a',type:'answer',questionId:a.questions[1].id,selected:'B',at:new Date(ts+61000).toISOString()}}
 assert.equal(engine.state(a,events,ts+30000).remainingSeconds,30)
 const final=engine.state(JSON.parse(JSON.stringify(a)),events,ts+90000)
 assert.equal(final.finished,true);assert.equal(final.reason,'time-expired');assert.equal(final.correct,1);assert.equal(final.unanswered,1);assert.equal(final.percent,50)
})
test('submitted attempts are closed and unanswered questions remain in the denominator',()=>{
 const a=engine.createAttempt(bank,{mode:'diagnostic',count:2},at,'a')
 const events={answer:{attemptId:'a',type:'answer',questionId:a.questions[0].id,selected:'B',at:new Date(ts+1000).toISOString()},submit:{attemptId:'a',type:'submit',at:new Date(ts+2000).toISOString()},after:{attemptId:'a',type:'answer',questionId:a.questions[1].id,selected:'B',at:new Date(ts+3000).toISOString()}}
 const result=engine.state(a,events,ts+4000)
 assert.equal(result.correct,1);assert.equal(result.percent,50);assert.equal(result.reason,'submitted')
 assert.equal(engine.state(a,{...events,foreign:{...events.after,attemptId:'other'}},ts+4000).answered,1)
})
test('event ordering is deterministic and latest pre-submission answer wins',()=>{
 const a=engine.createAttempt(bank,{mode:'diagnostic',count:1},at,'a'),id=a.questions[0].id
 const wrong={attemptId:'a',type:'answer',questionId:id,selected:'A',at:new Date(ts+1000).toISOString()},right={...wrong,selected:'B',at:new Date(ts+2000).toISOString()}
 for(const events of [{one:wrong,two:right},{two:right,one:wrong}])assert.equal(engine.state(a,events,ts+3000).correct,1)
})

test('new attempt seeds vary practice while identical seeds reproduce the question set',()=>{
 const a=engine.selectQuestions(bank,{mode:'diagnostic',count:15,seed:'first'}).map(q=>q.id).join(',')
 assert.equal(engine.selectQuestions(bank,{mode:'diagnostic',count:15,seed:'first'}).map(q=>q.id).join(','),a)
 assert.notEqual(engine.selectQuestions(bank,{mode:'diagnostic',count:15,seed:'second'}).map(q=>q.id).join(','),a)
})

test('content-addressed question snapshots deduplicate history while preserving administered content',async()=>{
 const a=engine.createAttempt(bank,{mode:'diagnostic',count:2,seed:'same'},at,'a')
 const b=engine.createAttempt(bank,{mode:'diagnostic',count:2,seed:'same'},at,'b')
 const digest=async text=>createHash('sha256').update(text).digest('hex')
 const pa=await engine.packAttempt(a,digest),pb=await engine.packAttempt(b,digest)
 const pool={...pa.snapshots,...pb.snapshots}
 assert.equal(Object.keys(pool).length,2);assert.equal(pa.definition.questions,undefined)
 assert.equal(engine.hydrateAttempt(pa.definition,pool).questions[0].answer,a.questions[0].answer)
 assert.equal(engine.hydrateAttempt(pa.definition,{}),null,'Incomplete snapshots must not be silently reloaded from current content')
 assert.equal(engine.hydrateAttempt(a,{}),a,'Older full-snapshot attempts remain compatible')
})
