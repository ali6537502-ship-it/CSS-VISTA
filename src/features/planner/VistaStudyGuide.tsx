import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, CalendarDays, Check, CheckCircle2, ClipboardCopy, Clock3, ExternalLink, RefreshCw, Save, Search, Settings2, Sparkles } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { currentHostingerAccountUser } from '@/lib/hostingerApi'
import { preparationPhysicalKey, preparationWriteCurrent } from '@/lib/preparationStorage'
import { isTaskArchived } from '@/lib/myTasks'
import { notifyProgressChanged } from '@/lib/progressEvents'
import { addStudyScheduleTasks, getState, saveStudyPlanner, setSyllabusItemStatus, updateStudyScheduleTask } from '@/lib/store'
import { useAccountSnapshot } from '@/pages/account/shared'
import { optionalCatalogue } from '@/features/workspace/model'
import { essayThemeIndex } from '@/data/essayThemes'
import { validateSubjectCombination } from '@/lib/subjectSelection'
import PlannerTask from './PlannerTask'
import { dayKey, readableDay, shiftDay, validDay } from './model'
import { PMS_SETTINGS_KEY, readPmsSettings, taskExam } from './pmsModel'
import {
  buildVistaNotesCommand, cssGuideSubjects,
  generateVistaPlan, guideUnits, pmsGuideSubjects, readVistaPreferences,
  selectedVistaSubjects, type VistaExam, type VistaPlan, type VistaPreferences,
  type VistaSubject, type VistaUnit,
} from './vistaGuideModel'
import './vistaGuide.css'

const KEY = 'cssvista:tool:vista-guide:v1:'
const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
function initial(exam: VistaExam) {
  const state = getState(), css = state.studyPlanner
  let legacy = readPmsSettings(null)
  try { legacy = readPmsSettings(JSON.parse(localStorage.getItem(preparationPhysicalKey(PMS_SETTINGS_KEY)) || 'null')) } catch { /* use safe defaults */ }
  let comparative = false
  if(exam==='css'){
    try {
      const id=currentHostingerAccountUser()
      const saved=JSON.parse(localStorage.getItem('cssvista:workspace:v1:'+(id||'guest'))||'null')
      comparative=saved?.comparative===true
    } catch { /* retain Islamic Studies default */ }
  }
  const fallback: Partial<VistaPreferences> = exam === 'pms-punjab' ? {
    selectedOptionals: legacy.selectedOptionals, alternative: legacy.alternative,
    dailyMinutes: legacy.dailyMinutes, restDays: legacy.restDays, targetDate: legacy.targetDate,
  } : {
    selectedOptionals: css?.selectedOptionals || [], dailyMinutes: Math.round((css?.dailyHours || 4) * 60),
    restDays: [css?.restDay ?? 0], targetDate: css?.examDate || '', alternative: comparative ? 'comparative' : 'islamic-studies',
  }
  try { return readVistaPreferences(JSON.parse(localStorage.getItem(preparationPhysicalKey(KEY + exam)) || 'null'), fallback) }
  catch { return readVistaPreferences(null, fallback) }
}
function resourcePath(u: VistaUnit) {
  return u.resource === 'precis' ? '/account/precis' : u.resource === 'essay' ? '/study-material/essay-themes' + (u.resourceSlug ? '/' + encodeURIComponent(u.resourceSlug) : '') : ''
}
function CopyNotes({ unit, compact = false }: { unit: VistaUnit; compact?: boolean }) {
  const [status, setStatus] = useState('')
  const [text, setText] = useState('')
  async function copy() {
    const command = buildVistaNotesCommand(unit)
    try { await navigator.clipboard.writeText(command); setStatus('Command copied. Paste it into ChatGPT to create your notes.'); setText('') }
    catch { setText(command); setStatus('Clipboard unavailable: select and copy the command below.') }
  }
  return <div className="vg-copy">
    <button type="button" className={compact ? 'vg-inline-action' : 'pl-secondary'} onClick={copy}><ClipboardCopy size={15}/>Copy notes command</button>
    {status && <span className="vg-copy-feedback" role="status">{status}</span>}
    {text && <textarea aria-label="Copy notes command manually" value={text} readOnly rows={6} onFocus={e=>e.currentTarget.select()}/>}
  </div>
}

export default function VistaStudyGuide({ exam, mode = 'syllabus' }: { exam: VistaExam; mode?: 'syllabus' | 'settings' }) {
  const { user, syncStatus, syncError } = useAccount()
  const { snapshot, refresh } = useAccountSnapshot()
  const [catalogue, setCatalogue] = useState<VistaSubject[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [prefs, setPrefs] = useState<VistaPreferences>(()=>initial(exam))
  const [draftPrefs, setDraftPrefs] = useState<VistaPreferences>(()=>initial(exam))
  const edited = useRef(false)
  const [settingsOpen, setSettingsOpen] = useState(mode === 'settings')
  const [plan, setPlan] = useState<VistaPlan | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [subjectSearch, setSubjectSearch] = useState('')
  const [optionalSearch, setOptionalSearch] = useState('')
  const [showOnlyRemaining, setShowOnlyRemaining] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [showCount, setShowCount] = useState(20)
  useEffect(()=>{
    const controller = new AbortController()
    setCatalogue(null); setLoadError('')
    const path = exam === 'pms-punjab' ? '/pms-punjab/vista-syllabus.json' : '/fpsc-syllabus.json'
    fetch(path,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Unable to load syllabus');return r.json()}).then(json=>{
      const subjects = exam === 'pms-punjab' ? pmsGuideSubjects(json,essayThemeIndex()) : cssGuideSubjects(json,essayThemeIndex())
      if (!subjects.length || exam === 'pms-punjab' && subjects.length !== 40 || subjects.some(s=>!s.id || !Array.isArray(s.sections))) throw Error('The syllabus catalogue is incomplete.')
      if(!controller.signal.aborted)setCatalogue(subjects)
    }).catch(e=>{if(!controller.signal.aborted)setLoadError(e instanceof Error?e.message:'Syllabus temporarily unavailable')})
    return ()=>controller.abort()
  },[exam,retry])
  useEffect(()=>{
    if(!edited.current){const next=initial(exam);setPrefs(next);setDraftPrefs(next);setPlan(null)}
  },[exam,syncStatus])
  useEffect(()=>{if(mode==='settings')setSettingsOpen(true)},[mode])
  const subjects = catalogue || []
  const chosen = useMemo(()=>selectedVistaSubjects(subjects,exam,prefs),[subjects,exam,prefs])
  const chosenUnits = useMemo(()=>chosen.flatMap(s=>guideUnits(s,exam)),[chosen,exam])
  const visible = showAll ? subjects : chosen
  const filtered = visible.filter(s=>s.title.toLowerCase().includes(subjectSearch.toLowerCase()))
  const active = subjects.find(s=>s.id===subjectId) || chosen[0] || subjects[0]
  const allUnits = useMemo(()=>active ? guideUnits(active,exam):[],[active,exam])
  const activeTasks = snapshot.activeTasks.filter(t=>taskExam(t)===exam)
  const today = dayKey()
  const todayRows = activeTasks.filter(t=>t.date===today)
  const revisions = activeTasks.filter(t=>t.activity==='revision' && t.status!=='completed' && t.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6)
  const hasStatus = (u:VistaUnit) => snapshot.state.syllabusItemStatuses?.[u.id] === 'completed' || activeTasks.some(t=>t.syllabusItemId===u.id && t.status==='completed')
  const alreadyScheduled = new Set(snapshot.state.studyScheduleTasks.filter(t=>!isTaskArchived(t.id) || t.status==='completed').map(t=>t.syllabusItemId))
  const remaining = chosenUnits.filter(u=>!hasStatus(u) && !alreadyScheduled.has(u.id))
  const completed = chosenUnits.filter(u=>hasStatus(u)).length
  const visibleUnits = allUnits.filter(u=>!showOnlyRemaining || !hasStatus(u))
  const cssOptionalValidation = useMemo(()=>{
    const recognized = optionalCatalogue.filter(s=>draftPrefs.selectedOptionals.includes(s.name))
    const unknown = draftPrefs.selectedOptionals.filter(n=>!recognized.some(s=>s.name===n))
    const result = validateSubjectCombination(recognized)
    return {valid:!unknown.length && (!draftPrefs.selectedOptionals.length || result.valid),messages:[...result.violations,...unknown.map(n=>'Unknown subject: '+n)]}
  },[draftPrefs.selectedOptionals])
  function checkWrite(){
    if(syncStatus==='syncing' || !preparationWriteCurrent() || (user && currentHostingerAccountUser()!==user.id)){
      setError('Account synchronization or reset is in progress. Refresh and retry after it completes.');return false
    }
    return true
  }
  function change(patch:Partial<VistaPreferences>){
    edited.current=true;setPlan(null);setMessage('');setError('')
    setDraftPrefs(p=>({...p,...patch}))
  }
  function save(){
    if(!checkWrite())return
    if(draftPrefs.dailyMinutes<30 || draftPrefs.dailyMinutes>720 || draftPrefs.restDays.length===7 || ![1,2,3].includes(draftPrefs.subjectsPerDay)
      || draftPrefs.targetDate && !validDay(draftPrefs.targetDate) || draftPrefs.startDate && !validDay(draftPrefs.startDate)) {
      setError('Choose 30 minutes to 12 hours, one to three subjects per day, valid dates, and at least one study day.');return
    }
    if(exam==='css' && !cssOptionalValidation.valid){setError('Review the FPSC subject combination before saving: '+cssOptionalValidation.messages.join('; '));return}
    try {
      const key=preparationPhysicalKey(KEY+exam), value=JSON.stringify(draftPrefs)
      localStorage.setItem(key,value)
      if(localStorage.getItem(key)!==value)throw Error('Device preferences could not be saved')
      if(exam==='pms-punjab'){
        const legacy=readPmsSettings(null)
        const old=readPmsSettings(JSON.parse(localStorage.getItem(preparationPhysicalKey(PMS_SETTINGS_KEY))||'null'))
        const merged={...legacy,...old,selectedOptionals:draftPrefs.selectedOptionals,alternative:draftPrefs.alternative==='ethics'?'ethics' as const:'islamic-studies' as const,
          dailyMinutes:draftPrefs.dailyMinutes,restDays:draftPrefs.restDays,targetDate:draftPrefs.targetDate,
          sessionMinutes:Math.min(old.sessionMinutes,draftPrefs.dailyMinutes)}
        localStorage.setItem(preparationPhysicalKey(PMS_SETTINGS_KEY),JSON.stringify({version:1,settings:JSON.stringify(merged)}))
      }else{
        const state=getState().studyPlanner
        saveStudyPlanner({examDate:draftPrefs.targetDate || state?.examDate || '',dailyHours:draftPrefs.dailyMinutes/60,
          restDay:draftPrefs.restDays[0]??0,selectedOptionals:draftPrefs.selectedOptionals})
        if(user) {
          const workspaceKey='cssvista:workspace:v1:'+user.id
          const existingWorkspace=JSON.parse(localStorage.getItem(workspaceKey)||'{}')
          localStorage.setItem(workspaceKey,JSON.stringify({...existingWorkspace,comparative:draftPrefs.alternative==='comparative'}))
        }
      }
      setPrefs(draftPrefs); edited.current=false;setSettingsOpen(false);setPlan(null)
      setError('');setMessage('Your preparation choices have been saved. Existing sessions and progress are retained.')
      notifyProgressChanged();refresh()
    }catch(e){setError(e instanceof Error?e.message:'Could not save preferences')}
  }
  function preview(){
    if(!checkWrite() || !catalogue)return
    if(edited.current){setError('Save your changed subjects and routine first.');return}
    try {
      const next=generateVistaPlan(subjects,exam,prefs,getState().studyScheduleTasks.filter(t=>!isTaskArchived(t.id) || t.status==='completed'),getState().syllabusItemStatuses||{},prefs.startDate || today)
      setPlan(next);setError('');setMessage('')
    }catch(e){setPlan(null);setError(e instanceof Error?e.message:'Could not calculate the schedule')}
  }
  function commit(){
    if(!plan?.draft.length || !checkWrite())return
    try{
      const current=getState().studyScheduleTasks, taken=new Set(current.filter(t=>!isTaskArchived(t.id) || t.status==='completed').map(t=>t.syllabusItemId))
      if(plan.draft.some(t=>taken.has(t.syllabusItemId)))throw Error('The schedule changed since preview. Generate it again.')
      const created=addStudyScheduleTasks(plan.draft), saved=getState().studyScheduleTasks
      if(created.length!==plan.draft.length || created.some(t=>!saved.some(s=>s.id===t.id)))throw Error('The schedule was not fully saved. Review the daily planner before retrying.')
      setMessage('Your '+created.length+' syllabus sessions are ready. Open Today or My Week to follow the plan.')
      setPlan(null);setError('');refresh()
    }catch(e){setError(e instanceof Error?e.message:'Unable to save the plan')}
  }
  function mark(u:VistaUnit){
    if(!checkWrite())return
    const old=hasStatus(u), next=old?'in-progress':'completed'
    setSyllabusItemStatus(u.id,next)
    for(const task of getState().studyScheduleTasks.filter(t=>t.syllabusItemId===u.id && t.activity!=='revision')){
      updateStudyScheduleTask(task.id,{status:next})
    }
    if(getState().syllabusItemStatuses?.[u.id]!==next){setError('Completion could not be saved. Try again.');return}
    setMessage(old?'Chapter returned to in progress.':'Chapter marked complete by you.');refresh()
  }
  function scheduleRevision(u: VistaUnit) {
    if(!checkWrite())return
    if(!hasStatus(u)){setError('Mark the original chapter complete before scheduling its revision.');return}
    const sessionMinutes=Math.min(45,prefs.dailyMinutes)
    const all=getState().studyScheduleTasks
    let date=shiftDay(today,3), attempts=0
    while(attempts<3650) {
      const used=all.filter(t=>t.date===date).reduce((sum,t)=>sum+t.minutes,0)
      const rest=prefs.restDays.includes(new Date(date+'T12:00:00').getDay())
      const duplicate=all.some(t=>t.syllabusItemId===u.id && t.date===date)
      if(!rest && used+sessionMinutes<=prefs.dailyMinutes && !duplicate)break
      date=shiftDay(date,1);attempts++
    }
    if(attempts>=3650){setError('No available revision date could be found. Please revise your routine.');return}
    if(prefs.targetDate && date>prefs.targetDate){setError('Revision would fall after your target date. Extend your target to schedule it.');return}
    const added=addStudyScheduleTasks([{syllabusItemId:u.id,subject:u.subject,paper:u.paper,section:u.section,topic:u.title,date,minutes:sessionMinutes,activity:'revision'}])
    if(added.length!==1){setError('Revision was not saved. Check your schedule and try again.');return}
    setError('');setMessage('Revision scheduled for '+readableDay(date)+'. The original chapter remains complete.')
    refresh()
  }
  function recoverMissed(){
    if(!checkWrite())return
    const overdue=getState().studyScheduleTasks.filter(t=>taskExam(t)===exam && t.status!=='completed' && t.date<today && !isTaskArchived(t.id))
    if(!overdue.length){setMessage('No unfinished overdue sessions to move.');return}
    if(!window.confirm('Move '+overdue.length+' unfinished overdue sessions forward? Completed records will not change.'))return
    const occupied=getState().studyScheduleTasks.filter(t=>!overdue.some(old=>old.id===t.id) && !isTaskArchived(t.id))
    let date=today, moved=0
    try{
      for(const t of overdue.sort((a,b)=>a.date.localeCompare(b.date))){
        if(t.minutes>prefs.dailyMinutes)throw Error('A missed session exceeds your daily capacity; edit that session first.')
        let attempts=0
        while(prefs.restDays.includes(new Date(date+'T12:00:00').getDay())
          || occupied.filter(row=>row.date===date).reduce((n,row)=>n+row.minutes,0)+t.minutes>prefs.dailyMinutes
          || (!occupied.some(row=>row.date===date && taskExam(row)===exam && row.subject===t.subject)
            && new Set(occupied.filter(row=>row.date===date && taskExam(row)===exam).map(row=>row.subject)).size>=prefs.subjectsPerDay)){
          date=shiftDay(date,1)
          if(++attempts>3650)throw Error('Missed sessions exceed the available schedule.')
        }
        if(prefs.targetDate && date>prefs.targetDate)throw Error('Missed sessions exceed your chosen target; extend it before rescheduling.')
        occupied.push({...t,date})
        moved++
      }
      const changes=occupied.filter(t=>overdue.some(old=>old.id===t.id))
      for(const t of changes){updateStudyScheduleTask(t.id,{date:t.date})}
      setMessage(moved+' unfinished sessions have been moved to available study days.');refresh()
    }catch(e){setError(e instanceof Error?e.message:'Unable to reschedule sessions')}
  }
  if(loadError)return <section className="vg-panel" role="alert"><h2>Syllabus unavailable</h2><p>{loadError}. Your saved preparation records are safe.</p><button className="pl-primary" onClick={()=>setRetry(n=>n+1)}>Retry</button></section>
  if(!catalogue)return <div className="pl-panel-loading" role="status">Loading your syllabus and preparation guide…</div>
  return <div className="vg-root">
    <section className="vg-hero">
      <div><p className="pl-kicker">YOUR PERSONALIZED PREPARATION</p><h2>{exam==='pms-punjab'?'PMS Vista':'CSS Vista Planner'}</h2><p>One simple place for the complete syllabus, daily study tasks, revision and comprehensive chapter notes.</p></div>
      <button className="pl-secondary" onClick={()=>setSettingsOpen(open=>!open)}><Settings2 size={16}/>Subjects and routine</button>
    </section>
    {syncError && <p className="pl-warning" role="alert">Account sync needs attention. <Link to="/account/settings">Review account settings</Link>.</p>}
    <div className="vg-metrics">
      <div><strong>{chosen.length}</strong><span>Subjects in your plan</span></div>
      <div><strong>{prefs.subjectsPerDay}</strong><span>Parallel subjects daily</span></div>
      <div><strong>{completed}/{chosenUnits.length}</strong><span>Chapters marked complete</span></div>
      <div><strong>{remaining.length}</strong><span>Unscheduled chapters</span></div>
    </div>
    {(settingsOpen || mode==='settings') && <section className="vg-panel vg-settings">
      <div className="pl-section-heading"><div><p className="pl-kicker">STEP 1</p><h3>Choose your preparation routine</h3></div></div>
      <div className="vg-settings-grid">
        <fieldset className="vg-vertical"><legend>Subjects to study each day</legend>{([1,2,3] as const).map(n=><label key={n}><input type="radio" name={'vista-parallel-'+exam} checked={draftPrefs.subjectsPerDay===n} onChange={()=>change({subjectsPerDay:n})}/>{n} subject{n===1?'':'s'} per day</label>)}</fieldset>
        <fieldset className="vg-vertical"><legend>Study pattern</legend><label><input type="radio" name={'vista-mode-'+exam} checked={draftPrefs.mode==='rotate'} onChange={()=>change({mode:'rotate'})}/>Rotate subjects daily</label><label><input type="radio" name={'vista-mode-'+exam} checked={draftPrefs.mode==='focus'} onChange={()=>change({mode:'focus'})}/>Finish priority subjects first</label></fieldset>
        <label>Hours available each study day<input type="number" min={0.5} max={12} step={0.5} value={draftPrefs.dailyMinutes/60} onChange={e=>change({dailyMinutes:Math.round(Number(e.target.value)*60)})}/></label>
        <label>Start date<input type="date" value={draftPrefs.startDate || today} onChange={e=>change({startDate:e.target.value})}/></label>
        <label>Target completion date (optional)<input type="date" value={draftPrefs.targetDate} onChange={e=>change({targetDate:e.target.value})}/><small>Your personal preparation target, not an official examination date.</small></label>
        <label>Or set a number of days<select value="" onChange={e=>{if(e.target.value)change({targetDate:shiftDay(draftPrefs.startDate||today,Number(e.target.value))})}}><option value="">Select duration</option>{[30,45,60,90,120,180,240,365].map(n=><option value={n} key={n}>{n} days</option>)}</select></label>
      </div>
      <fieldset className="vg-days"><legend>Rest days</legend><div>{weekdayNames.map((day,i)=><label key={day}><input type="checkbox" checked={draftPrefs.restDays.includes(i)} onChange={()=>change({restDays:draftPrefs.restDays.includes(i)?draftPrefs.restDays.filter(x=>x!==i):[...draftPrefs.restDays,i]})}/>{day}</label>)}</div></fieldset>
      <fieldset className="vg-options"><legend>Subjects to prepare</legend>
        {exam==='pms-punjab'?<label className="vg-alt">Compulsory alternative<select value={draftPrefs.alternative==='ethics'?'ethics':'islamic-studies'} onChange={e=>change({alternative:e.target.value as 'ethics' | 'islamic-studies'})}><option value="islamic-studies">Islamic Studies</option><option value="ethics">Ethics (for eligible Non-Muslim candidates)</option></select></label>:<label className="vg-alt">Sixth compulsory paper<select value={draftPrefs.alternative==='comparative'?'comparative':'islamic-studies'} onChange={e=>change({alternative:e.target.value as 'comparative' | 'islamic-studies'})}><option value="islamic-studies">Islamic Studies</option><option value="comparative">Comparative Study of Major Religions (if eligible)</option></select></label>}
        <p className="pl-muted">Compulsory papers are included automatically. Choose the optional papers you intend to prepare. This planner does not validate your examination application.</p>
        {exam==='css' && <p className="pl-muted">CSS optional subjects must follow FPSC group and marks rules.</p>}
        <label className="vg-search"><Search size={15}/><input type="search" placeholder="Search optional subjects" value={optionalSearch} onChange={e=>setOptionalSearch(e.target.value)}/></label>
        <div className="vg-optional-grid">{subjects.filter(s=>s.designation==='optional' && s.title.toLowerCase().includes(optionalSearch.toLowerCase())).map(s=>{
          const value=exam==='css'?s.title:s.id,selected=draftPrefs.selectedOptionals.includes(value)
          return <label key={s.id}><input type="checkbox" checked={selected} onChange={()=>change({selectedOptionals:selected?draftPrefs.selectedOptionals.filter(v=>v!==value):[...draftPrefs.selectedOptionals,value]})}/>{s.title}</label>
        })}</div>
        {exam==='css' && !cssOptionalValidation.valid && <p role="alert" className="pl-warning">{cssOptionalValidation.messages.join('. ')}</p>}
      </fieldset>
      <div className="vg-actions"><button className="pl-primary" disabled={syncStatus==='syncing'} onClick={save}><Save size={16}/>Save my preparation choices</button><button className="pl-secondary" onClick={()=>{edited.current=false;setDraftPrefs(prefs);setSettingsOpen(false);setError('')}}>Cancel changes</button></div>
    </section>}
    {error && <p role="alert" className="pl-error vg-feedback">{error}</p>}
    {message && <p role="status" className="pl-success vg-feedback">{message}</p>}
    <section className="vg-panel">
      <div className="vg-section-head"><div><p className="pl-kicker">STEP 2</p><h3>Generate your full study schedule</h3><p>Your selected chapters are distributed over study days with {prefs.subjectsPerDay} subject{prefs.subjectsPerDay===1?'':'s'} per day. Existing tasks consume your available time.</p></div><button className="pl-primary" onClick={preview}><CalendarDays size={16}/>Generate my plan</button></div>
      {plan && <div className="vg-preview"><p><strong>{plan.draft.length} new sessions</strong> across {plan.scheduledSubjects} subjects. {plan.alreadyCovered} previously completed or scheduled chapters retained. {plan.draft.length>0?'Estimated final day: '+readableDay(plan.finishedOn):'Nothing new to schedule.'}</p><div className="vg-preview-rows">{plan.draft.slice(0,6).map(t=><div key={t.syllabusItemId}><span>{t.date}</span><strong>{t.subject}</strong><span>{t.topic}</span><small>{t.minutes} min</small></div>)}</div>{plan.draft.length>6&&<p className="pl-muted">Showing first six sessions. All {plan.draft.length} will be saved.</p>}{plan.draft.length>0&&<button className="pl-primary" onClick={commit}><CheckCircle2 size={16}/>Confirm and save all sessions</button>}</div>}
    </section>
    <section className="vg-panel">
      <div className="vg-section-head"><div><p className="pl-kicker">STEP 3</p><h3>Today's chapters</h3><p>{readableDay(today)} · Complete them yourself, or copy a notes command and study with ChatGPT.</p></div><button className="pl-secondary" onClick={recoverMissed}><RefreshCw size={15}/>Reschedule missed sessions</button></div>
      {todayRows.length?<div className="vg-today">{todayRows.map(t=><PlannerTask key={t.id} task={t} refresh={refresh}/>)}</div>:<p className="pl-note">No sessions assigned for today. Generate a plan or open your saved weekly schedule.</p>}
      {revisions.length>0&&<div className="vg-preview"><p><strong>Upcoming revision sessions</strong> · Review your completed chapters without changing the original coverage.</p><div className="vg-today">{revisions.map(t=><PlannerTask key={t.id} task={t} refresh={refresh}/>)}</div></div>}
      <div className="vg-actions"><Link className="pl-secondary" to={'/account/tasks?exam='+exam+'&view=today'}>Open Today</Link><Link className="pl-secondary" to={'/account/tasks?exam='+exam+'&view=week'}>View my week</Link></div>
    </section>
    <section className="vg-panel">
      <div className="vg-section-head"><div><p className="pl-kicker">COMPLETE SYLLABUS</p><h3>Study by subject, chapter and section</h3><p>Every prescribed part remains in the syllabus. Completion is always your decision.</p></div><button className="pl-secondary" onClick={()=>setShowAll(v=>!v)}>{showAll?'My selected subjects':'View all subjects'}</button></div>
      <label className="vg-search"><Search size={15}/><input value={subjectSearch} onChange={e=>setSubjectSearch(e.target.value)} placeholder="Search your subjects" /></label>
      <div className="vg-subjects">{filtered.map(s=><button type="button" key={s.id} aria-pressed={active?.id===s.id} onClick={()=>{setSubjectId(s.id);setShowCount(20)}}>{s.title}</button>)}</div>
      {active && <div className="vg-syllabus">
        <details className="vg-readings"><summary>View complete section structure ({active.sections.length} sections)</summary>
          <ol>{active.sections.map(section=><li key={section.id} dir="auto"><strong>{section.title}</strong> — {section.topics.length} syllabus item{section.topics.length===1?'':'s'}{!section.topics.length && ' (heading only in source)'}</li>)}</ol>
        </details>
        <div className="vg-section-head"><div><h3>{active.title}</h3><small>{allUnits.filter(hasStatus).length} of {allUnits.length} chapters complete</small></div>{active.file && <a className="pl-secondary" href={active.file} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Official PDF</a>}</div>
        <label className="vg-filter"><input type="checkbox" checked={showOnlyRemaining} onChange={e=>setShowOnlyRemaining(e.target.checked)}/>Show unfinished chapters only</label>
        {visibleUnits.slice(0,showCount).map(u=><article key={u.id} className="vg-unit"><div><small>{u.section}</small><h4 dir="auto">{u.title}</h4><details><summary>Read complete syllabus for this chapter</summary><pre dir="auto">{u.syllabus}</pre></details></div><div className="vg-unit-tools"><CopyNotes unit={u} compact/>{resourcePath(u) && <Link className="vg-inline-action" to={resourcePath(u)}>{u.resource==='precis'?'Open Précis Guide':'Open Essay Themes 2027'}</Link>}<button className="vg-inline-action" aria-pressed={hasStatus(u)} onClick={()=>mark(u)}><Check size={15}/>{hasStatus(u)?'Completed':'Mark complete'}</button>{hasStatus(u) && <button className="vg-inline-action" onClick={()=>scheduleRevision(u)}><RefreshCw size={15}/>Schedule revision</button>}</div></article>)}
        {visibleUnits.length>showCount&&<button className="pl-secondary" onClick={()=>setShowCount(n=>n+20)}>Show more chapters · {visibleUnits.length-showCount} remaining</button>}
        {(active.readings||[]).length>0&&<details className="vg-readings"><summary>Suggested readings ({(active.readings||[]).length})</summary><ol>{(active.readings||[]).map((r,i)=><li key={i}>{r}</li>)}</ol></details>}
        {(active.notes||[]).length>0&&<details className="vg-readings"><summary>Source instructions and notes</summary>{(active.notes||[]).map((n,i)=><p key={i}>{n}</p>)}</details>}
      </div>}
    </section>
    <section className="vg-resources"><Link to="/account/precis"><BookOpen size={19}/><span><strong>Précis Guide</strong><small>Handbook, writing lessons and practice</small></span></Link><Link to="/study-material/essay-themes"><Sparkles size={19}/><span><strong>Essay Themes 2027</strong><small>Research themes and preparation roadmap</small></span></Link><Link to="/account/practice"><CheckCircle2 size={19}/><span><strong>Practice and mocks</strong><small>Apply and test what you have studied</small></span></Link><Link to="/account/progress"><Clock3 size={19}/><span><strong>My performance</strong><small>Review your recorded practice progress</small></span></Link></section>
    {exam==='pms-punjab' && <p className="vg-note"><Link to="/account/tasks?exam=pms-punjab&view=pms">View previous PMS outline and historical checklist</Link></p>}
    <p className="vg-note"><Clock3 size={14}/> Personal schedules and chapter checks are self-reported. Your original tasks, syllabus history and account records are not deleted.</p>
  </div>
}
