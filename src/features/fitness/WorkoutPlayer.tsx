import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Pause, Play, RotateCcw, SkipForward, StopCircle, ExternalLink } from 'lucide-react'
import type { WorkoutPlan } from './model'
import { initialWorkoutSession, pauseWorkout, progressWorkout, restoreWorkoutSession, resumeWorkout, sessionPlanId, skipWorkoutStep, workoutSteps, type WorkoutSession } from './workoutSession'
import { ExerciseFigure } from './ExerciseFigure'

export function WorkoutPlayer({plan,day,ownerId,completed,onComplete,disabled}:{plan:WorkoutPlan;day:string;ownerId:string;completed:boolean;onComplete:()=>void;disabled:boolean}){
  const steps=useMemo(()=>workoutSteps(plan),[plan])
  const storeKey='cssvista:fitness:active-session:'+encodeURIComponent(ownerId)+':'+day
  const [session,setSession]=useState<WorkoutSession|null>(null)
  useEffect(()=>{
    try {setSession(restoreWorkoutSession(sessionStorage.getItem(storeKey),day,plan))}
    catch {setSession(null)}
  },[storeKey,day,plan])
  useEffect(()=>{
    try{
      if(session && session.planId===sessionPlanId(day,plan))sessionStorage.setItem(storeKey,JSON.stringify({...session,running:false}))
      else sessionStorage.removeItem(storeKey)
    }catch{/* Session resume is optional; recording remains separate. */}
  },[session,storeKey,day,plan])
  useEffect(()=>{
    if(!session?.running)return
    const id=window.setInterval(()=>setSession(current=>current?progressWorkout(current,plan,Date.now()):null),250)
    return ()=>window.clearInterval(id)
  },[session?.running,plan])
  useEffect(()=>{
    function lock(){
      if(document.visibilityState==='hidden')setSession(previous=>previous?pauseWorkout(previous,plan):null)
    }
    document.addEventListener('visibilitychange',lock)
    return ()=>document.removeEventListener('visibilitychange',lock)
  },[plan])
  const active=Boolean(session && !session.completed && session.step < steps.length)
  const step=active&&session?steps[session.step]:null
  const exercise=step?.phase==='exercise'?plan.exercises[step.exerciseIndex??0]:undefined
  const following=step?.phase==='rest'?steps.slice((session?.step||0)+1).find(p=>p.phase==='exercise'):undefined
  const nextExercise=following?plan.exercises[following.exerciseIndex??0]:undefined
  const completedSteps=session?.completed?steps.length:session?.step||0
  const approximateMinutes=Math.round(steps.reduce((total,s)=>total+s.seconds,0)/60)
  function stop(){setSession(null)}
  function finish(){if(!session?.completed)return;try{sessionStorage.removeItem(storeKey)}catch{/* optional */}onComplete();setSession(null)}
  return <div className="space-y-4 rounded-2xl border border-emerald-900/10 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600"><span className="inline-flex items-center gap-2"><Clock3 size={16}/>{approximateMinutes} min guided session</span><span>{plan.strengthDay?'Strength · '+plan.sets+' rounds':'Recovery · gentle mobility'}</span></div>
    {completed && !session&&<div className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"><Check className="mr-2 inline" size={17}/> Workout logged today. You can repeat it if you wish.</div>}
    {session?.completed ? <div className="space-y-3 rounded-xl bg-emerald-50 p-5 text-center">
      <Check size={40} className="mx-auto text-emerald-800"/><h3 className="text-xl font-bold">Session finished</h3>
      <p className="text-sm text-slate-700">Save your session to your private fitness progress.</p>
      <button type="button" onClick={finish} className="min-h-12 w-full rounded-xl bg-emerald-900 px-4 font-semibold text-white">Save completed workout</button>
      <button type="button" onClick={stop} className="min-h-11 text-xs text-slate-600 underline">Discard unsaved session</button>
    </div> : active&&step&&session ? <>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Workout step progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completedSteps}><div className="h-2 rounded-full bg-emerald-800 transition-all" style={{width:Math.round(completedSteps/steps.length*100)+'%'}}/></div>
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">{step.phase==='exercise'?'Exercise '+((step.exerciseIndex??0)+1)+' of '+plan.exercises.length+' · round '+step.round+'/'+plan.sets:step.phase==='rest'?'Rest and breathe':step.phase==='warmup'?'Warm up':'Cool down'}</p>
      <ExerciseFigure exerciseId={exercise?.id|| (step.phase==='warmup'?'march':step.phase==='cooldown'?'reach':'rest')} label={exercise?.name||step.phase}/>
      <h3 className="text-xl font-bold">{exercise?.name|| (step.phase==='warmup'?'Warm up with gentle marching':step.phase==='cooldown'?'Slow down and stretch comfortably':'Rest before the next movement')}</h3>
      <p className="text-sm leading-6 text-slate-600">{exercise?.instruction || (step.phase==='warmup'?'Begin slowly. Move gently, breathe freely, and check you feel comfortable.':step.phase==='cooldown'?'Walk slowly, relax shoulders and continue steady breathing.':'Take a short recovery break. '+(nextExercise?'Up next: '+nextExercise.name+'.':''))}</p>
      {exercise?.reps&&<p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><strong>Suggested repetitions:</strong> {exercise.reps} · Stop earlier if form becomes uncomfortable.</p>}
      {exercise?.techniqueUrl&&<a href={exercise.techniqueUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-emerald-900 underline">Check exercise technique <ExternalLink size={14}/></a>}
      <p aria-label={'Remaining '+session.remaining+' seconds'} className="my-4 text-center text-5xl font-bold tabular-nums text-emerald-950">{session.remaining}<span className="text-lg"> sec</span></p>
      {!session.running && <p role="status" className="rounded-xl bg-amber-50 p-2 text-center text-xs text-amber-900">Paused. Your exercise does not continue while the phone is locked or this page is hidden.</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button type="button" onClick={()=>setSession(current=>current?(current.running?pauseWorkout(current,plan):resumeWorkout(current)):null)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-3 font-semibold text-white">{session.running?<Pause size={18}/>:<Play size={18}/>} {session.running?'Pause':'Resume'}</button>
        <button type="button" onClick={()=>setSession(current=>current?skipWorkoutStep(current,plan):null)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold"><SkipForward size={16}/> Next step</button>
        <button type="button" onClick={stop} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold text-red-700 sm:col-span-1"><StopCircle size={16}/> End session</button>
      </div>
    </>:<>
      <ExerciseFigure exerciseId={plan.exercises[0].id} label={plan.title}/>
      <p className="text-sm leading-6 text-slate-600">{plan.strengthDay?'Your session has a gentle warm-up, three to four rounds of controlled strength exercises, breaks and a cooldown.':'Today is a lighter active-recovery day. Gentle movement is optional and intended to complement strength sessions.'}</p>
      <button type="button" disabled={disabled} onClick={()=>setSession(initialWorkoutSession(day,plan))} className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 font-bold text-white disabled:opacity-50"><Play size={18}/>{disabled?'Seek professional clearance before exercise':'Start guided session'}</button>
    </>}
    <p className="text-xs leading-5 text-slate-500">Exercise animations are simplified position cues, not a form assessment. Follow written instructions. Stop if you feel pain, dizziness or unusual symptoms.</p>
  </div>
}
