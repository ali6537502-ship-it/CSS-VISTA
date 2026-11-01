import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Dumbbell, HeartPulse, Pause, Play, RotateCcw, Utensils, Activity } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { preparationPhysicalKey } from '@/lib/preparationStorage'
import { notifyProgressChanged } from '@/lib/progressEvents'
import { AVOID_OPTIONS, buildMeals, calculateEnergy, DEFAULT_FOODS, FITNESS_KEY, FOOD_REFERENCE, FOODS, type FitnessProfile, type FitnessRecord, type Goal, type Sex, todayPK, addWeeks, validateProfile, workoutForDay, weightTrendGuidance } from '@/features/fitness/model'
import { recipeFoods, estimateDailyFoodCost, type HomeRecipe } from '@/features/fitness/recipeEngine'
import { HomeFoodStudio } from '@/features/fitness/HomeFoodStudio'

type View = 'diet' | 'workout' | 'progress'
type Session = { index:number; round:number; mode:'work'|'rest'|'done'; remaining:number; running:boolean }
const initial = ():FitnessProfile => ({
  sex:'male',age:25,height:170,weight:65,target:67,weeks:8,goal:'gain',activity:'sitting',
  minutes:20,available:DEFAULT_FOODS,avoids:[],foodNotes:'',conditionReview:false,startDate:todayPK()
})
function readRecord(ownerId:string|null|undefined):FitnessRecord|null {
  if(!ownerId)return null
  try{
    const parsed:unknown=JSON.parse(localStorage.getItem(preparationPhysicalKey(FITNESS_KEY))||'null')
    if(!parsed || typeof parsed!=='object'||!('profile' in parsed)) return null
    const result=parsed as FitnessRecord
    if(result.ownerId!==ownerId || !result.profile || !Array.isArray(result.profile.available) || validateProfile(result.profile)) return null
    return result
  }catch{return null}
}
function Metric({label,value,detail}:{label:string;value:string;detail?:string}){
  return <div className="rounded-2xl border border-emerald-900/10 bg-white p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-emerald-950">{value}</p>{detail&&<p className="mt-1 text-xs text-slate-500">{detail}</p>}</div>
}
function Field({label,children}:{label:string;children:ReactNode}){
  return <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">{label}</span>{children}</label>
}
const fieldClass='w-full min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600'
function MotionFigure({kind,exerciseId}:{kind:'stand'|'squat'|'push'|'floor'|'lunge';exerciseId?:string}){
  const isWall=exerciseId==='wallpush',isBird=exerciseId==='bird',isPlank=exerciseId==='plank'
  const isFloorPush=kind==='push'&&!isWall
  const isBridge=kind==='floor'&&!isBird&&!isPlank
  return <div className="flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-emerald-50/70" role="img" aria-label="Simplified movement illustration; refer to written instructions and clinician-reviewed demonstration videos for correct form">
    <svg viewBox="0 0 260 190" width="240" height="185" aria-hidden="true" className="max-w-full">
      <path d="M18 171 H242" stroke="#a7c6b5" strokeWidth="2"/>
      {isWall && <><path d="M205 18 V172" stroke="#91b8a2" strokeWidth="8"/><g className="fc-wall" stroke="#12634a" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="94" cy="44" r="14" strokeWidth="5"/><path d="M95 61 L110 118 M107 75 L190 80 L204 85 M110 118 L102 164 M110 118 L135 164"/></g></>}
      {isBird && <g className="fc-bird" stroke="#12634a" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="72" cy="97" r="12" strokeWidth="5"/><path d="M88 101 L148 113 L205 100 M107 107 L106 168 M143 113 L150 169 M91 106 L49 86"/></g>}
      {isPlank && <g stroke="#12634a" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="52" cy="117" r="12" strokeWidth="5"/><path d="M70 119 L190 115 L221 158 M93 118 L94 167 M94 166 L63 166"/><path d="M213 163 L231 163"/></g>}
      {isFloorPush && <g className="fc-push" stroke="#12634a" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="64" cy="117" r="14" strokeWidth="5"/><path d="M82 120 L167 115 L207 130 M113 119 L113 168 M164 115 L190 165"/></g>}
      {isBridge && <g className="fc-bridge" stroke="#12634a" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="64" cy="117" r="14" strokeWidth="5"/><path d="M79 135 L121 125 L158 146 L204 159 M120 126 L128 171 M158 146 L161 170"/></g>}
      {!(isWall||isBird||isPlank||isFloorPush||isBridge) && <g className={kind==='squat'?'fc-squat':kind==='lunge'?'fc-lunge':'fc-march'} stroke="#12634a" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="130" cy="43" r="15" strokeWidth="5"/><path d="M130 62 L130 113 M130 75 L103 97 M130 75 L157 97 M130 113 L105 162 M130 113 L155 162"/></g>}
      <text x="130" y="184" fill="#346a56" fontSize="10" textAnchor="middle">{isPlank?'HOLD POSITION':'SCHEMATIC MOTION'} · NOT LIVE FORM CHECK</text>
    </svg>
  </div>
}
function buildWeek(profile:FitnessProfile){
  const now=new Date(todayPK()+'T12:00:00Z').getTime()
  const origin=new Date(profile.startDate+'T12:00:00Z').getTime()
  return Math.max(1,Math.min(profile.weeks,Math.floor((now-origin)/604800000)+1))
}
export default function FitnessCoach(){
  const {user,syncStatus}=useAccount()
  const [record,setRecord]=useState<FitnessRecord|null>(()=>readRecord(user?.id))
  const [editing,setEditing]=useState(false)
  const [draft,setDraft]=useState<FitnessProfile>(()=>readRecord(user?.id)?.profile||initial())
  const [step,setStep]=useState(0)
  const [error,setError]=useState('')
  const [tab,setTab]=useState<View>('diet')
  const [foodQuery,setFoodQuery]=useState('')
  const [weightInput,setWeightInput]=useState('')
  const [session,setSession]=useState<Session|null>(null)
  const [saveError,setSaveError]=useState('')
  useEffect(()=>{
    const owned=readRecord(user?.id)
    setRecord(owned)
    setDraft(owned?.profile||initial())
    setEditing(false)
    setSession(null)
  },[user?.id])
  const profile=record?.profile
  const today=todayPK()
  const lastWeight=record?.weights.at(-1)?.weight ?? profile?.weight ?? 65
  const daysRemaining=profile?Math.max(1,Math.ceil((new Date(addWeeks(profile.startDate,profile.weeks)+'T12:00:00Z').getTime()-new Date(todayPK()+'T12:00:00Z').getTime())/86400000)):0
  const energy=profile?calculateEnergy({...profile,weight:lastWeight,weeks:Math.max(1,Math.ceil(daysRemaining/7))}):null
  const homeFoods=profile?recipeFoods(record?.homeRecipes??[],profile):[]
  const elapsed=profile?Math.max(0,Math.floor((new Date(today+'T12:00:00Z').getTime()-new Date(profile.startDate+'T12:00:00Z').getTime())/86400000)):0
  const meals=profile?buildMeals({...profile,weight:lastWeight},record?.dailyAvailability?.[today]??{},elapsed,homeFoods):null
  const budget=meals?estimateDailyFoodCost(meals.meals,record?.foodPrices??{},profile?.budgetPkr):null
  const weekMenu=profile?Array.from({length:7},(_,i)=>{
    const at=new Date(today+'T12:00:00Z');at.setUTCDate(at.getUTCDate()+i)
    const date=at.toISOString().slice(0,10)
    return {date,plan:buildMeals({...profile,weight:lastWeight},record?.dailyAvailability?.[date]??{},elapsed+i,homeFoods)}
  }):[]
  const week=profile?buildWeek(profile):1
  const workout=useMemo(()=>profile?workoutForDay(week,Math.floor((new Date(today+'T12:00:00Z').getTime()-new Date(profile.startDate+'T12:00:00Z').getTime())/86400000)%7,profile.minutes,profile.goal,profile.focusArea):null,[profile,week,today])
  const goalLabels:Record<Goal,string>={gain:'Gain healthy weight',lose:'Reduce excess fat',muscle:'Build muscle',fitness:'Stay active and fit'}
  const daysLeft=profile?Math.max(0,Math.ceil((new Date(addWeeks(profile.startDate,profile.weeks)+'T12:00:00Z').getTime()-new Date(today+'T12:00:00Z').getTime())/86400000)):0
  function save(next:FitnessRecord){
    try{
      localStorage.setItem(preparationPhysicalKey(FITNESS_KEY),JSON.stringify(next))
      setRecord(next);setSaveError('');notifyProgressChanged()
    }catch{setSaveError('Your browser could not save the plan. Check available storage.')}
  }
  function edit(update:(r:FitnessRecord)=>FitnessRecord){
    if(!record)return
    save({...update(record),updatedAt:new Date().toISOString()})
  }
  useEffect(()=>{
    if(syncStatus!=='synced')return
    const incoming=readRecord(user?.id)
    if(incoming) setRecord(current=>(!current || Date.parse(incoming.updatedAt||'')>Date.parse(current.updatedAt||''))?incoming:current)
  },[syncStatus,user?.id])
  useEffect(()=>{
    if(!session?.running||!workout)return
    const interval=window.setInterval(()=>setSession(state=>{
      if(!state || !state.running)return state
      if(state.remaining>1)return {...state,remaining:state.remaining-1}
      if(state.mode==='work')return {...state,mode:'rest',remaining:workout.restSeconds}
      if(state.mode==='rest'){
        const next=state.index+1,round=next>=workout.exercises.length?state.round+1:state.round
        if(round>workout.sets)return {...state,mode:'done',running:false,remaining:0}
        const index=next>=workout.exercises.length?0:next
        return {index,round,mode:'work',remaining:workout.exercises[index].seconds,running:true}
      }
      return state
    }),1000)
    return ()=>window.clearInterval(interval)
  },[session?.running,workout])
  function createPlan(){
    if(!user?.id){setError('Sign in to create a personal fitness plan.');return}
    const problem=validateProfile(draft)
    if(problem){setError(problem);return}
    const changedGoal=!!record&&(record.profile.goal!==draft.goal||record.profile.target!==draft.target||record.profile.weeks!==draft.weeks)
    const updated={...draft,startDate:changedGoal?today:record?.profile.startDate||today}
    const next:FitnessRecord={ownerId:user.id,profile:updated,updatedAt:new Date().toISOString(),weights:record?.weights.length?record.weights:[{date:today,weight:updated.weight}],workouts:record?.workouts||{},meals:record?.meals||{},dailyAvailability:record?.dailyAvailability||{},homeRecipes:record?.homeRecipes||[],foodPrices:record?.foodPrices||{}}
    save(next);setError('');setEditing(false);setTab('diet')
  }
  function changeFood(id:string){
    edit(r=>{
      const todaySelections=r.dailyAvailability?.[today]||{}
      const currently=todaySelections[id]??r.profile.available.includes(id)
      return {...r,dailyAvailability:{...r.dailyAvailability,[today]:{...todaySelections,[id]:!currently}},meals:{...r.meals,[today]:{}}}
    })
  }
  function saveHomeRecipe(recipe:HomeRecipe){
    edit(r=>({...r,homeRecipes:[...(r.homeRecipes??[]),recipe],
      profile:{...r.profile,available:[...r.profile.available,recipe.id]},meals:{...r.meals,[today]:{}}}))
  }
  function deleteHomeRecipe(id:string){
    edit(r=>({...r,homeRecipes:(r.homeRecipes??[]).filter(recipe=>recipe.id!==id),
      profile:{...r.profile,available:r.profile.available.filter(x=>x!==id)},meals:{...r.meals,[today]:{}}}))
  }
  function setFoodPrice(id:string,price?:number){
    if(price!==undefined&&(!Number.isFinite(price)||price<0||price>100000))return
    edit(r=>{const prices={...r.foodPrices};if(price===undefined)delete prices[id];else prices[id]=price;return {...r,foodPrices:prices}})
  }
  function markMeal(id:string){
    edit(r=>({...r,meals:{...r.meals,[today]:{...(r.meals[today]||{}),[id]:!r.meals[today]?.[id]}}}))
  }
  function logWeight(){
    const value=Number(weightInput)
    if(!Number.isFinite(value)||value<35||value>250){setError('Please enter a weight from 35 to 250 kg.');return}
    edit(r=>({...r,weights:[...r.weights.filter(x=>x.date!==today),{date:today,weight:value}].sort((a,b)=>a.date.localeCompare(b.date))}))
    setWeightInput('');setError('')
  }
  function startWorkout(){
    if(!workout || profile?.conditionReview)return
    setSession({index:0,round:1,mode:'work',remaining:workout.exercises[0].seconds,running:true})
  }
  function finishWorkout(){
    if(!session || session.mode!=='done')return
    edit(r=>({...r,workouts:{...r.workouts,[today]:new Date().toISOString()}}))
    setSession(null)
  }
  return <main className="min-h-[70vh] bg-[#f7f9f6] px-4 py-7 text-slate-900 sm:py-10">
    <style>{'@keyframes fc-squat {0%,100%{transform:translateY(0)}50%{transform:translateY(19px)}} @keyframes fc-march{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}} @keyframes fc-lunge{0%,100%{transform:translate(0,0)}50%{transform:translate(7px,10px)}} @keyframes fc-push{0%,100%{transform:translateY(0)}50%{transform:translateY(10px)}} @keyframes fc-bridge{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}@keyframes fc-wall{0%,100%{transform:translateX(0)}50%{transform:translateX(10px)}}@keyframes fc-bird{0%,100%{transform:translate(0,0)}50%{transform:translate(5px,-4px)}} .fc-squat{animation:fc-squat 2.4s ease-in-out infinite}.fc-march{animation:fc-march 1.3s ease-in-out infinite}.fc-lunge{animation:fc-lunge 2.4s ease-in-out infinite}.fc-push{animation:fc-push 2s ease-in-out infinite}.fc-bridge{animation:fc-bridge 2.4s ease-in-out infinite}.fc-wall{animation:fc-wall 2.4s ease-in-out infinite}.fc-bird{animation:fc-bird 2.4s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.fc-squat,.fc-march,.fc-lunge,.fc-push,.fc-bridge,.fc-wall,.fc-bird{animation:none}}'}</style>
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-800">CSS VISTA · MY HEALTH</p><h1 className="mt-1 text-2xl font-bold text-emerald-950 sm:text-3xl">Personal Fitness Coach</h1><p className="mt-1 max-w-xl text-sm text-slate-600">Your meals. Your home workouts. Your personal target.</p></div>
        <Link to="/account/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-900"><ArrowLeft size={17}/> My account</Link>
      </header>
      {(!record || editing) ? <section className="rounded-3xl border border-emerald-900/10 bg-white p-4 shadow-sm sm:p-7">
        <div className="mb-5"><p className="text-xs font-semibold text-emerald-800">YOUR FITNESS PROFILE · STEP {step+1} OF 4</p><div className="mt-2 flex gap-2">{[0,1,2,3].map(i=><span key={i} className={'h-1.5 flex-1 rounded-full '+(i<=step?'bg-emerald-800':'bg-slate-200')}/>)}</div></div>
        {step===0 && <div className="space-y-4"><h2 className="text-xl font-bold">Tell us about yourself</h2><p className="text-sm text-slate-600">These details help estimate your energy needs. The male profile is selected by default.</p>
          <Field label="Calorie calculation profile"><select className={fieldClass} value={draft.sex} onChange={e=>setDraft({...draft,sex:e.target.value as Sex})}><option value="male">Male</option><option value="female">Female</option></select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Age (years)"><input className={fieldClass} type="number" min="18" max="80" value={draft.age} onChange={e=>setDraft({...draft,age:Number(e.target.value)})}/></Field><Field label="Height (cm)"><input className={fieldClass} type="number" min="125" max="220" value={draft.height} onChange={e=>setDraft({...draft,height:Number(e.target.value)})}/></Field></div>
          <Field label="Current weight (kg)"><input className={fieldClass} type="number" min="35" max="250" step=".1" value={draft.weight} onChange={e=>setDraft({...draft,weight:Number(e.target.value)})}/></Field>
          <Field label="Usual daily activity"><select className={fieldClass} value={draft.activity} onChange={e=>setDraft({...draft,activity:e.target.value as FitnessProfile['activity']})}><option value="sitting">Mostly sitting or studying</option><option value="light">Some walking or light exercise</option><option value="moderate">Active most days</option><option value="active">Very active throughout the day</option></select></Field>
        </div>}
        {step===1 && <div className="space-y-4"><h2 className="text-xl font-bold">Set your target and deadline</h2>
          <Field label="My goal"><select className={fieldClass} value={draft.goal} onChange={e=>{const goal=e.target.value as Goal;setDraft({...draft,goal,target:goal==='gain'?draft.weight+3:goal==='lose'?Math.max(35,draft.weight-3):draft.weight})}}><option value="gain">Gain healthy weight</option><option value="lose">Lose excess fat</option><option value="muscle">Build muscle</option><option value="fitness">Stay healthy and fit</option></select></Field>
          <Field label="Target weight (kg)"><input className={fieldClass} type="number" min="35" max="250" step=".1" value={draft.target} onChange={e=>setDraft({...draft,target:Number(e.target.value)})}/></Field>
          <Field label="Programme duration"><select className={fieldClass} value={draft.weeks} onChange={e=>setDraft({...draft,weeks:Number(e.target.value)})}><option value="4">1 month (4 weeks)</option><option value="8">2 months (8 weeks)</option><option value="12">3 months (12 weeks)</option><option value="24">6 months (24 weeks)</option></select></Field>
          <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">You choose the target. Your coach will check whether the pace appears reasonable and will not promise a fixed outcome.</p>
        </div>}
        {step===2 && <div className="space-y-4"><h2 className="text-xl font-bold">What can you eat at home?</h2><p className="text-sm text-slate-600">Select everyday foods. The plan will use your choices, not require expensive ingredients.</p>
          <input className={fieldClass} value={foodQuery} onChange={e=>setFoodQuery(e.target.value)} type="search" placeholder="Find roti, daal, eggs, fruit…"/>
          <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{FOODS.filter(f=>(f.label+' '+f.group).toLowerCase().includes(foodQuery.toLowerCase())).map(food=><label key={food.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" className="mt-1 accent-emerald-800" checked={draft.available.includes(food.id)} onChange={e=>setDraft({...draft,available:e.target.checked?[...draft.available,food.id]:draft.available.filter(x=>x!==food.id)})}/><span><strong>{food.label}</strong><small className="mt-0.5 block text-slate-500">{food.portion}{food.historicalRecipe?' · historical reference recipe':''}</small></span></label>)}</div>
          <p className="text-xs text-slate-500">{draft.available.length} foods selected · Pakistani prepared dishes are labelled as 2001 reference recipes</p>
          <Field label="Restrictions or allergies">{<div className="grid grid-cols-2 gap-2">{AVOID_OPTIONS.map(o=><label key={o.id} className="flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm"><input type="checkbox" checked={draft.avoids.includes(o.id)} onChange={e=>setDraft({...draft,avoids:e.target.checked?[...draft.avoids,o.id]:draft.avoids.filter(x=>x!==o.id)})}/>{o.name}</label>)}</div>}</Field>
          <Field label="Daily food budget in PKR (optional)"><input className={fieldClass} type="number" min="0" max="100000" step="1" placeholder="Your actual daily budget" value={draft.budgetPkr??''} onChange={e=>setDraft({...draft,budgetPkr:e.target.value===''?undefined:Number(e.target.value)})}/></Field>
          <Field label="Other foods or cooking details (optional)"><textarea className={fieldClass+' min-h-20 py-2'} maxLength={300} value={draft.foodNotes} onChange={e=>setDraft({...draft,foodNotes:e.target.value})} placeholder="e.g. Homemade chicken salan, Bannu pulao, oily food, food budget"/></Field>
          <p className="text-xs text-slate-600">Named homemade dishes need a measured recipe before accurate calories can be calculated. Allergies must always be checked against actual ingredients.</p>
        </div>}
        {step===3 && <div className="space-y-4"><h2 className="text-xl font-bold">Your home workout</h2><p className="text-sm text-slate-600">No gym or equipment required. Exercises begin at an approachable level.</p>
          <Field label="Main area to strengthen"><select className={fieldClass} value={draft.focusArea??"full-body"} onChange={e=>setDraft({...draft,focusArea:e.target.value as FitnessProfile["focusArea"]})}><option value="full-body">Whole body</option><option value="chest-shoulders">Chest and shoulders</option><option value="legs">Legs</option><option value="core">Core and posture</option></select></Field>
          <Field label="Time available per session"><select className={fieldClass} value={draft.minutes} onChange={e=>setDraft({...draft,minutes:Number(e.target.value)})}><option value="10">10 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option></select></Field>
          <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm"><input type="checkbox" checked={draft.conditionReview} onChange={e=>setDraft({...draft,conditionReview:e.target.checked})} className="mt-1 accent-emerald-800"/><span>I have a medical condition, significant injury, pregnancy/breastfeeding consideration, or another reason to get professional advice before a personalised diet or exercise plan.</span></label>
          <p className="text-xs leading-5 text-slate-600">The plan is for adults. Stop activity if you experience chest pain, faintness or unusual symptoms. For conditions requiring medical assessment, personalised targets will be held for review.</p><p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-950">Your weight, food choices, restrictions and workout records will be saved as private account-linked fitness progress and may sync across signed-in devices. This feature is optional. Read the <Link className="font-semibold underline" to="/privacy-policy">Privacy Policy</Link> before creating your plan.</p>
        </div>}
        {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-7 flex justify-between gap-3">{editing?<button type="button" onClick={()=>{setEditing(false);setError('')}} className="min-h-12 rounded-xl border px-4 text-sm font-semibold">Cancel</button>:null}{step>0?<button type="button" onClick={()=>{setStep(step-1);setError('')}} className="inline-flex min-h-12 items-center gap-2 rounded-xl border px-5 font-semibold"><ChevronLeft size={17}/> Back</button>:<span/>}
          <button type="button" onClick={()=>{setError('');if(step===3){createPlan();return}if(step===0&&(draft.age<18||draft.age>80||draft.height<125||draft.weight<35)){setError('Please enter a valid adult age, height and weight.');return}setStep(step+1)}} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-900 px-5 font-semibold text-white">{step===3?'Create my plan':'Continue'}<ArrowRight size={17}/></button></div>
      </section>: profile && energy && meals && workout && <div className="space-y-5">
        <div className="rounded-3xl bg-emerald-950 p-5 text-white sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">{profile.sex==='male'?'Male':'Female'} profile · Week {week} of {profile.weeks}</p><h2 className="mt-2 text-2xl font-bold">{goalLabels[profile.goal]}</h2><p className="mt-2 text-sm text-emerald-100">Starting {profile.weight} kg · Requested target {profile.target} kg · {daysLeft} days left</p></div><button onClick={()=>{setDraft(profile);setStep(0);setEditing(true);setSession(null)}} className="min-h-11 rounded-xl border border-emerald-300/40 px-3 text-xs font-semibold">Edit profile</button></div>
        </div>
        {energy.needsReview && <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Target needs review.</strong> {profile.conditionReview?'Get appropriate professional advice before following personalised exercise or nutrition targets.':!energy.direction?'Your requested weight does not match the selected goal.':energy.underweightLoss?'Weight loss is not recommended by this automatic planner at the estimated BMI.':energy.lowIntake?'The estimated intake would be too low for an unsupervised programme. Seek qualified guidance.':'The requested rate is relatively fast. Consider a longer deadline or a smaller target.'} An automatic calorie target has been withheld; your profile can be edited.</div>}
        {saveError&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{saveError}</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Maintenance estimate" value={energy.maintenance+' kcal'} detail="Per day"/>
          <Metric label="Daily calorie target" value={energy.targetCalories?energy.targetCalories+' kcal':'Review needed'} detail="Estimate, not prescription"/>
          <Metric label="Protein reference" value={energy.proteinRange[0]+'–'+energy.proteinRange[1]+' g'} detail="Daily range"/>
          <Metric label="Target change" value={energy.rate+' kg/week'} detail="Requested average"/>
        </div>
        <nav aria-label="Fitness dashboard" className="grid grid-cols-3 gap-2 rounded-2xl border bg-white p-2">{([{id:'diet',name:'My Diet',icon:Utensils},{id:'workout',name:'Workout',icon:Dumbbell},{id:'progress',name:'Progress',icon:Activity}] as const).map(item=><button key={item.id} type="button" onClick={()=>setTab(item.id)} aria-current={tab===item.id?'page':undefined} className={'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold sm:flex-row sm:text-sm '+(tab===item.id?'bg-emerald-900 text-white':'text-slate-700 hover:bg-emerald-50')}><item.icon size={18}/>{item.name}</button>)}</nav>
        {tab==='diet' && <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Today's meals</h2><p className="text-sm text-slate-600">Built from foods you selected as available.</p></div><span className="text-sm font-semibold text-emerald-900">{meals.totalCalories} kcal · {meals.totalProtein} g protein</span></div>
          {meals.meals.map(meal=><article key={meal.id} className="rounded-2xl border bg-white p-4"><div className="mb-2 flex items-center justify-between gap-3"><h3 className="font-bold">{meal.name}</h3><label className="flex items-center gap-2 text-xs font-medium text-emerald-900"><input type="checkbox" checked={!!record.meals[today]?.[meal.id]} onChange={()=>markMeal(meal.id)} className="accent-emerald-800"/> Eaten</label></div>{meal.items.length?<div className="space-y-2">{meal.items.map(item=><div key={item.food.id} className="flex justify-between gap-3 text-sm"><span>{item.food.label} <span className="text-slate-500">× {item.amount} ({item.food.portion})</span>{item.food.sourceUrl&&<a className="ml-2 text-xs text-emerald-900 underline" href={item.food.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>}</span><span className="shrink-0 text-slate-600">{item.kcal} kcal</span></div>)}</div>:<p className="text-sm text-amber-800">Add available foods to complete this meal.</p>}<p className="mt-3 border-t pt-2 text-xs text-slate-600">{meal.kcal} kcal · ~{meal.protein} g protein</p></article>)}
          {(meals.varietyWarning || (energy.targetCalories!==null && Math.abs(meals.totalCalories-energy.targetCalories)>250)) && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">This sample menu {meals.varietyWarning?'has limited variety':'does not fully match your estimated energy target'}. Add suitable available foods or adjust portions with qualified advice; it is not a complete prescribed diet.</p>}
          <div className="rounded-2xl border bg-white p-4"><h3 className="font-bold">Your goal-based nutrition check</h3>
            <p className="mt-2 text-sm text-slate-600">{energy.targetCalories===null?'Personalised calorie target is on hold until your goal is reviewed.':'Today’s sample menu: '+meals.totalCalories+' kcal versus an estimated '+energy.targetCalories+' kcal target.'} {meals.totalProtein} g protein versus a reference range of {energy.proteinRange[0]}–{energy.proteinRange[1]} g. Differences do not imply an exact weight change.</p>
            {profile.budgetPkr!==undefined&&<p className="mt-2 text-sm text-slate-600">Budget: PKR {profile.budgetPkr}/day. {budget?.complete?'Priced portions total approximately PKR '+budget.costPkr+(budget.underBudget?' within your limit.':' above your limit.'):'Prices are missing for '+(budget?.missing.length??0)+' chosen foods. Enter local prices to check affordability.'}</p>}
          </div>
          <details className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer font-bold">Next 7 days: planned meals</summary>
            <p className="my-3 text-xs text-slate-600">Varied options from your home foods and measured recipes. Portion adequacy and available foods require review. No purchases are assumed.</p>
            <div className="space-y-3">{weekMenu.map(({date,plan})=><div key={date} className="rounded-xl bg-slate-50 p-3"><p className="font-semibold text-sm">{date} · {plan.totalCalories} kcal · {plan.totalProtein} g protein</p><p className="mt-1 text-xs leading-5 text-slate-600">{plan.meals.map(m=>m.name+': '+(m.items.map(i=>i.food.label).join(', ')||'needs foods')).join(' · ')}</p></div>)}</div>
          </details>
          <details className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer font-bold">Pakistani food library and my recipes</summary><div className="mt-4"><HomeFoodStudio profile={profile} recipes={record.homeRecipes??[]} prices={record.foodPrices??{}} onSave={saveHomeRecipe} onRemove={deleteHomeRecipe} onPriceUpdate={setFoodPrice}/></div></details>
          <details className="rounded-2xl border bg-white p-4"><summary className="cursor-pointer font-bold">Change what's available today</summary><p className="mt-2 text-xs text-slate-600">Today's changes do not change your usual home food preferences.</p><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">{[...FOODS,...homeFoods].map(food=><label className="flex min-h-11 items-center gap-2 rounded-lg border p-2 text-sm" key={food.id}><input type="checkbox" checked={record.dailyAvailability?.[today]?.[food.id]??profile.available.includes(food.id)} onChange={()=>changeFood(food.id)} className="accent-emerald-800"/>{food.label}</label>)}</div></details>
          <p className="text-xs leading-5 text-slate-500">{FOOD_REFERENCE} Composite recipes are excluded from automatic planning when an allergy/restriction is selected until their ingredients are verified. A selected food is not automatically suitable for a stated allergy: always check ingredients, cross-contact and individual advice. Meals marked “Eaten” reflect your own log, not automatically measured consumption.</p>
        </section>}
        {tab==='workout' && <section className="space-y-4"><div><h2 className="text-xl font-bold">Today's home workout</h2><p className="text-sm text-slate-600">{workout.strengthDay?'Strength training':'Active recovery'} · {workout.exercises.length} movements · {workout.sets} round{workout.sets!==1?'s':''} · rest between movements · no equipment</p></div>
          {record.workouts[today]&&<p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"><Check size={18}/> Workout completed today</p>}
          <div className="rounded-2xl border bg-white p-4 sm:p-6">
            {session && session.mode!=='done' ? <><MotionFigure kind={workout.exercises[session.index].kind} exerciseId={workout.exercises[session.index].id}/><p className="mt-4 text-xs font-semibold text-emerald-800">{session.mode==='work'?'EXERCISE':'REST'} · ROUND {session.round}/{workout.sets}</p><h3 className="mt-1 text-xl font-bold">{workout.exercises[session.index].name}</h3><p className="mt-2 text-sm text-slate-600">{workout.exercises[session.index].instruction}</p>{workout.exercises[session.index].techniqueUrl&&<a className="mt-2 inline-block text-xs font-semibold text-emerald-900 underline" target="_blank" rel="noopener noreferrer" href={workout.exercises[session.index].techniqueUrl}>View technique reference</a>}<p aria-live="off" className="my-5 text-center text-5xl font-bold tabular-nums text-emerald-950">{session.remaining}<span className="text-lg"> s</span></p><div className="flex flex-wrap justify-center gap-2"><button onClick={()=>setSession(s=>s?{...s,running:!s.running}:s)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-900 px-5 font-semibold text-white">{session.running?<Pause size={18}/>:<Play size={18}/>} {session.running?'Pause':'Resume'}</button><button className="min-h-11 rounded-xl border px-4 font-semibold" onClick={()=>setSession(s=>s?{...s,mode:'rest',remaining:workout.restSeconds}:s)}>Skip movement</button><button className="min-h-11 rounded-xl border px-4 text-sm" onClick={()=>setSession(null)}>End session</button></div></>:
            session?.mode==='done' ? <div className="space-y-3 text-center"><Check className="mx-auto text-emerald-800" size={40}/><h3 className="text-xl font-bold">Session finished</h3><p className="text-sm text-slate-600">Save your completed workout for today's progress record.</p><button className="min-h-12 rounded-xl bg-emerald-900 px-6 font-semibold text-white" onClick={finishWorkout}>Save completed workout</button></div>:
            <><MotionFigure kind="squat"/><p className="mt-3 text-sm text-slate-600">Follow each animated illustration with the written movement instructions. These simplified animations do not assess technique.</p><button onClick={startWorkout} disabled={profile.conditionReview} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Play size={18}/> {profile.conditionReview?'Seek clearance before starting':'Start guided workout'}</button></>}
          </div>
          <div className="rounded-2xl border bg-white p-4"><h3 className="mb-3 font-bold">Session movements</h3><a href="https://www.nhs.uk/live-well/exercise/strength-and-flex-exercise-plan-how-to-videos/" target="_blank" rel="noopener noreferrer" className="mb-3 inline-block text-sm font-semibold text-emerald-900 underline">NHS technique videos (warm-up, squat, standing press-up)</a><div className="space-y-3">{workout.exercises.map((exercise,i)=><div key={exercise.id} className="flex gap-3 border-b pb-3 last:border-0"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-900">{i+1}</span><div><p className="font-semibold">{exercise.name} <span className="text-xs font-normal text-slate-500">({exercise.seconds}s)</span></p><p className="text-xs leading-5 text-slate-600">{exercise.instruction}</p>{exercise.techniqueUrl&&<a className="mt-1 inline-block text-xs font-medium text-emerald-900 underline" href={exercise.techniqueUrl} target="_blank" rel="noopener noreferrer">Technique reference</a>}</div></div>)}</div></div>
        </section>}
        {tab==='progress' && <section className="space-y-4"><h2 className="text-xl font-bold">Your progress</h2><div className="grid grid-cols-2 gap-3"><Metric label="Starting weight" value={profile.weight+' kg'}/><Metric label="Latest recorded" value={(record.weights.at(-1)?.weight??profile.weight)+' kg'}/><Metric label="Workouts logged" value={String(Object.keys(record.workouts).length)}/><Metric label="Deadline" value={addWeeks(profile.startDate,profile.weeks)}/></div>
          <div className="rounded-2xl border bg-white p-4"><h3 className="font-bold">Weekly weight check-in</h3><p className="my-2 text-xs text-slate-600">Use the same scale, ideally at a similar time of day. Daily fluctuations are normal.</p><div className="flex gap-2"><input className={fieldClass} type="number" step=".1" min="35" max="250" placeholder="Weight in kg" value={weightInput} onChange={e=>setWeightInput(e.target.value)}/><button onClick={logWeight} className="min-h-12 shrink-0 rounded-xl bg-emerald-900 px-4 text-sm font-bold text-white">Save</button></div>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>
          <div className="rounded-2xl border border-emerald-900/10 bg-emerald-50 p-4"><h3 className="font-bold text-emerald-950">Your weekly review</h3><p className="mt-2 text-sm leading-6 text-slate-700">{weightTrendGuidance(profile,record.weights)}</p></div><div className="rounded-2xl border bg-white p-4"><h3 className="font-bold">Weight history</h3><div className="mt-3 space-y-2">{record.weights.slice(-10).map(w=><div key={w.date} className="flex justify-between border-b py-2 text-sm"><time>{w.date}</time><strong>{w.weight} kg</strong></div>)}</div></div>
          <p className="text-xs text-slate-500">Weekly changes help guide future adjustments. The app cannot guarantee that weight gained is muscle or that weight lost is exclusively fat.</p>
        </section>}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-slate-500"><span><HeartPulse className="mr-1 inline" size={14}/> Private account feature · {syncStatus==='synced'?'Account progress synchronized':'Saved on this device; sync may be pending'}</span><button className="inline-flex min-h-10 items-center gap-1 underline" onClick={()=>{setDraft(profile);setStep(0);setEditing(true)}}><RotateCcw size={14}/> Revise plan</button></footer>
      </div>}
      <p className="mt-7 text-xs leading-5 text-slate-500">For adults 18–80. Estimates are educational and not medical advice. The simplified movement figures are coaching aids, not live posture correction. The app does not replace a registered dietitian, physician or qualified trainer.</p>
    </div>
  </main>
}
