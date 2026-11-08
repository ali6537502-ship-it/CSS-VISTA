import type { WorkoutPlan } from './model.ts'

/** No session can be marked completed by opening a tab or closing the phone. */
export type WorkoutStep={phase:'warmup'|'exercise'|'rest'|'cooldown';seconds:number;exerciseIndex?:number;round?:number}
export type WorkoutSession={day:string;planId:string;step:number;remaining:number;running:boolean;lastTick:number;completed:boolean}
export function workoutSteps(plan:WorkoutPlan):WorkoutStep[]{
  const steps:WorkoutStep[]=[{phase:'warmup',seconds:plan.warmupSeconds}]
  for(let round=1;round<=plan.sets;round++){
    for(let index=0;index<plan.exercises.length;index++){
      steps.push({phase:'exercise',seconds:plan.exercises[index].seconds,exerciseIndex:index,round})
      if(!(round===plan.sets&&index===plan.exercises.length-1)){
        steps.push({phase:'rest',seconds:plan.restSeconds,round})
      }
    }
  }
  return [...steps,{phase:'cooldown',seconds:plan.cooldownSeconds}]
}
export function sessionPlanId(date:string,plan:WorkoutPlan){
  return [date,plan.title,plan.durationMinutes,plan.level,plan.focusArea,plan.exercises.map(e=>e.id).join(',')].join(':')
}
export function initialWorkoutSession(date:string,plan:WorkoutPlan,now=Date.now()):WorkoutSession{
  return {day:date,planId:sessionPlanId(date,plan),step:0,remaining:plan.warmupSeconds,running:true,lastTick:now,completed:false}
}
export function progressWorkout(session:WorkoutSession,plan:WorkoutPlan,now:number):WorkoutSession{
  if(!session.running||session.completed)return session
  const steps=workoutSteps(plan)
  if(session.step<0||session.step>=steps.length)return {...session,running:false,completed:false}
  // Cap time accounting after browser suspension: a locked device must not
  // silently finish exercises the person was not doing.
  const elapsed=Math.max(0,Math.min(3,Math.floor((now-session.lastTick)/1000)))
  if(elapsed===0)return session
  let remaining=session.remaining-elapsed,idx=session.step
  while(remaining<=0 && idx<steps.length-1){idx++;remaining+=steps[idx].seconds}
  if(remaining<=0) return {...session,step:steps.length,remaining:0,running:false,lastTick:now,completed:true}
  return {...session,step:idx,remaining,lastTick:now}
}
export function pauseWorkout(session:WorkoutSession,plan:WorkoutPlan,now=Date.now()):WorkoutSession {
  return {...progressWorkout(session,plan,now),running:false,lastTick:now}
}
export function resumeWorkout(session:WorkoutSession,now=Date.now()):WorkoutSession {
  return session.completed?session:{...session,running:true,lastTick:now}
}
export function skipWorkoutStep(session:WorkoutSession,plan:WorkoutPlan,now=Date.now()):WorkoutSession{
  const steps=workoutSteps(plan)
  const next=session.step+1
  // Skipping the last cooldown is not evidence the workout was completed.
  if(next>=steps.length)return {...session,step:steps.length-1,remaining:steps.at(-1)!.seconds,running:false,completed:false,lastTick:now}
  return {...session,step:next,remaining:steps[next].seconds,lastTick:now}
}
export function restoreWorkoutSession(raw:string|null,day:string,plan:WorkoutPlan):WorkoutSession|null{
  if(!raw)return null
  try{
    const value=JSON.parse(raw) as WorkoutSession
    if(value.day!==day||value.planId!==sessionPlanId(day,plan)||!Number.isInteger(value.step)
      ||value.step<0||value.step>workoutSteps(plan).length||!Number.isFinite(value.remaining)||value.remaining<0||value.remaining>600
      ||typeof value.completed!=='boolean')return null
    return {...value,running:false,lastTick:Date.now()}
  }catch{return null}
}
