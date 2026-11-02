import test from 'node:test'
import assert from 'node:assert/strict'
import { workoutForDay,workoutDurationSeconds } from '../src/features/fitness/model.ts'
import { initialWorkoutSession,progressWorkout,pauseWorkout,resumeWorkout,skipWorkoutStep,restoreWorkoutSession,workoutSteps } from '../src/features/fitness/workoutSession.ts'
const day='2026-11-02'
const plan=workoutForDay(1,0,20,'muscle','chest-shoulders')
test('workout steps match displayed duration including warm-up, rests and cooldown',()=>{
 const list=workoutSteps(plan)
 assert.equal(list[0].phase,'warmup')
 assert.equal(list.at(-1)?.phase,'cooldown')
 assert.equal(list.filter(s=>s.phase==='exercise').length,plan.sets*plan.exercises.length)
 assert.equal(list.reduce((n,s)=>n+s.seconds,0),workoutDurationSeconds(plan))
 assert.ok(Math.abs(workoutDurationSeconds(plan)-1200)<=60)
})
test('exercise timer moves through actual stages and never immediately finishes',()=>{
 const started=initialWorkoutSession(day,plan,1000)
 const warm=progressWorkout(started,plan,2000)
 assert.equal(warm.remaining,started.remaining-1)
 let step=started
 for(let n=0;n<plan.warmupSeconds;n++)step=progressWorkout(step,plan,step.lastTick+1000)
 assert.equal(workoutSteps(plan)[step.step].phase,'exercise')
 assert.equal(step.completed,false)
})
test('background or locked device cannot burn through exercise time',()=>{
 const started=initialWorkoutSession(day,plan,1000)
 const later=progressWorkout(started,plan,1000+10*60*1000)
 assert.equal(later.remaining,started.remaining-3)
 const paused=pauseWorkout(later,plan,later.lastTick+1000)
 assert.equal(paused.running,false)
 assert.equal(progressWorkout(paused,plan,Date.now()+999999),paused)
 assert.equal(resumeWorkout(paused,600000).running,true)
})
test('session can be restored as paused only for same owner date and plan',()=>{
 const started=initialWorkoutSession(day,plan,1000)
 const encoded=JSON.stringify(started)
 const restored=restoreWorkoutSession(encoded,day,plan)
 assert.equal(restored?.running,false)
 assert.equal(restored?.remaining,plan.warmupSeconds)
 assert.equal(restoreWorkoutSession(encoded,'2026-11-03',plan),null)
 assert.equal(restoreWorkoutSession(encoded,day,workoutForDay(1,0,30,'muscle')),null)
 assert.equal(restoreWorkoutSession('garbage',day,plan),null)
})
test('skip moves through steps and stops at actual completed stage',()=>{
 let current=initialWorkoutSession(day,plan,1000)
 const count=workoutSteps(plan).length
 for(let i=0;i<count;i++)current=skipWorkoutStep(current,plan,1000+i)
 assert.equal(current.completed,false)
 assert.equal(current.running,false)
 assert.equal(current.step,count-1)
 assert.ok(current.remaining>0)
})
test('all focus levels use controlled instructions and honest duration',()=>{
 for(const focus of ['full-body','chest-shoulders','legs','core'] as const)for(const level of ['beginner','regular'] as const){
  const p=workoutForDay(1,4,20,'gain',focus,level)
  assert.ok(Math.abs(p.durationMinutes-20)<=2)
  assert.ok(p.exercises.every(e=>e.instruction.length>30))
 }
})
