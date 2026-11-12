import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
const context=vm.createContext({});vm.runInContext(readFileSync('public/gsa-tutor/learning-engine.js','utf8'),context)
const {planCourse,demonstrated}=context.CSSVistaGSALearning
const lessons=Array.from({length:12},(_,i)=>({id:'l'+i,words:300,chapter:i<6?1:2}))
test('budgeted plan extends deadlines, respects rest days and retains every lesson once',()=>{
 const days=planCourse(lessons,{days:5,startDate:'2026-11-12',dailyMinutes:30,restDays:[0,6],level:'beginner'})
 assert.ok(days.length>5)
 assert.equal(new Set(days.flatMap(d=>d.ids)).size,12)
 assert.equal(days.flatMap(d=>d.ids).length,12)
 assert.ok(days.every(d=>d.estimatedMinutes<=30))
 assert.ok(days.every(d=>![0,6].includes(new Date(d.date+'T12:00:00Z').getUTCDay())))
})
test('recall shares the same budget and is never silently discarded',()=>{
 const reviews=lessons.map(l=>({id:l.id,date:'2026-11-12'}))
 const days=planCourse(lessons,{days:5,startDate:'2026-11-12',dailyMinutes:30}, {},reviews)
 assert.equal(days.flatMap(d=>d.reviews).length,12)
 assert.ok(days.every(d=>d.estimatedMinutes<=30))
})
test('catch-up omits studied lessons and keeps overdue recall without mutating history',()=>{
 const completed={l0:{at:'2026-11-01'},l1:{at:'2026-11-02'}}
 const original=JSON.stringify(completed)
 const days=planCourse(lessons,{days:5,startDate:'2026-11-12',dailyMinutes:30,remainingOnly:true},completed,[{id:'l0',date:'2026-11-01'}])
 assert.equal(days.flatMap(d=>d.ids).length,10)
 assert.equal(days.flatMap(d=>d.reviews).join(','),'l0')
 assert.equal(JSON.stringify(completed),original)
})
test('a single long lesson is retained and explicitly exposes a budget overrun',()=>{
 const days=planCourse([{id:'long',words:9000}],{days:5,startDate:'2026-11-12',dailyMinutes:15})
 assert.equal(days.flatMap(d=>d.ids).join(','),'long')
 assert.ok(days.some(d=>d.estimatedMinutes>15))
})
test('confidence and unapproved or outdated questions cannot establish demonstrated understanding',()=>{
 const questions=['q1','q2'].map(id=>({id,lessonId:'l0',conceptId:'wave',type:id==='q2'?'reasoning':'factual',verification:{status:'approved',approvedVersion:'v2'}}))
 const attempts={one:{at:'2026-11-12T10:00:00Z',questionId:'q1',correct:true,contentVersion:'v2'},two:{at:'2026-11-12T10:01:00Z',questionId:'q2',correct:true,contentVersion:'v2'}}
 assert.equal(demonstrated(questions,attempts,'v2').length,1)
 assert.equal(demonstrated(questions,attempts,'v1').length,0)
 assert.equal(demonstrated(questions.map(q=>({...q,verification:{status:'source-checked-draft'}})),attempts,'v2').length,0)
 attempts.three={...attempts.two,at:'2026-11-12T11:00:00Z',correct:false}
 assert.equal(demonstrated(questions,attempts,'v2').length,0)
})
