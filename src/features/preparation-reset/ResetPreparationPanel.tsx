import { useRef, useState } from 'react'
import { Download, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAccount } from '@/lib/accountContext'
import { captureProgressSnapshot } from '@/lib/accountSync'
import { currentHostingerAccountUser, hostingerRequest } from '@/lib/hostingerApi'
import { getState } from '@/lib/store'
import { reconcileProgressReset } from './reconcile'
import type { ResetControl, ResetScope, ResetSelection } from './model'
import './reset.css'
type Preview = { token: string; counts: Record<string, number>; selection: ResetSelection }
type Receipt = { accepted: boolean; control?: ResetControl }
const descriptions: Record<ResetScope, { title: string; text: string }> = {
  timetable: { title: 'Personal timetable', text: 'Remove personal CSS and PMS timetable tasks, or narrow this to a subject and date range. Syllabus coverage, notes, goals and account-linked preparation plans stay.' },
  planner: { title: 'Schedules & study goals', text: 'Remove all personal timetable tasks, daily suggestion checks, study goals, planner notes and account-linked daily plans. Syllabus coverage, bookmarks and practice results stay.' },
  preparation: { title: 'Start preparation again', text: 'Clear preparation progress, personal quizzes and mistakes, saved answers and bookmarks, study notes, GSA and free Précis course progress, reading history, personal Current Affairs, Factbook and schedules. Active device study sessions are cleared after confirmation.' },
  'attempt-plan': { title: 'This account-linked schedule', text: 'Remove this preparation attempt’s daily plan and tasks. Other attempts, syllabus coverage, bookmarks and assessed answers stay.' },
}
const countLabels: Record<string,string> = { attempt_daily_plans:'Account-linked daily plans', attempt_plan_tasks:'Account-linked tasks', attempt_planner_events:'Planner history entries', attempt_unit_progress:'Tracked syllabus units', attempt_evidence_links:'Evidence links', attempt_reading_records:'Reading records', grammar_progress:'Grammar progress records', precis_guide_plans:'Précis course schedules', precis_progress:'Précis course progress', precis_responses:'Précis practice responses', current_affairs_user_items:'Personal Current Affairs items', student_activity:'Activity records', quiz_attempts:'Saved quiz records', question_attempts:'Question attempts', factbook_entries:'Factbook entries', factbook_media:'Factbook media' }
export default function ResetPreparationPanel({ attemptId, date }: { attemptId?: string; date?: string }) {
  const { user, syncNow, syncStatus, loading } = useAccount()
  const owner = user?.id
  const [open,setOpen] = useState(false), [scope,setScope] = useState<ResetScope>(attemptId ? 'attempt-plan' : 'timetable')
  const [subject,setSubject] = useState(''), [start,setStart] = useState(''), [end,setEnd] = useState(''), [keep,setKeep] = useState(true)
  const [preview,setPreview] = useState<Preview|null>(null), [password,setPassword] = useState(''), [confirmation,setConfirmation] = useState(''), [busy,setBusy] = useState(false), [unknown,setUnknown] = useState(false), [error,setError] = useState(''), [message,setMessage] = useState('')
  const inFlight = useRef(false)
  const subjects = [...new Set(getState().studyScheduleTasks.map(t => t.subject))].sort()
  const selected = descriptions[scope]
  function owned() { return !!owner && currentHostingerAccountUser() === owner }
  function close(value: boolean) { if (busy) return; setOpen(value); if (!value) { setPassword(''); setConfirmation(''); setPreview(null); setUnknown(false); setError('') } }
  async function review() {
    if (!owned() || inFlight.current) return
    inFlight.current = true; setBusy(true); setError(''); setMessage('')
    try {
      const synced = await syncNow(); if (synced.error) throw new Error(`Synchronize before resetting: ${synced.error}`)
      if (!owned()) return
      const selection: ResetSelection = { scope, keep_settings: keep, ...(attemptId ? { attempt_id:attemptId, ...(date ? { date } : {}) } : scope === 'timetable' ? { ...(subject ? { subject } : {}), ...(start ? { start } : {}), ...(end ? { end } : {}) } : {}) }
      const result = await hostingerRequest<Preview>('student/preparation-reset.php', { method:'POST', body:JSON.stringify({ action:'preview', selection }) })
      if (owned()) { setPreview(result); setUnknown(false) }
    } catch (e) { if (owned()) setError(e instanceof Error ? e.message : 'The reset could not be reviewed. Your records are retained.') } finally { inFlight.current=false; if (owned()) setBusy(false) }
  }
  async function accept(receipt: Receipt) {
    if (!owned() || !receipt.accepted || !receipt.control) return false
    await reconcileProgressReset(owner!, receipt.control)
    const synced = await syncNow()
    if (owned()) { setOpen(false); setPreview(null); setPassword(''); setConfirmation(''); setUnknown(false); setMessage(synced.error ? 'Reset saved. Account synchronization needs attention; reopen sync settings to finish updating this device.' : 'Reset saved. Your login, profile and membership are retained.') }
    return true
  }
  async function reset(checkOnly = false) {
    if (!preview || !owned() || inFlight.current) return
    inFlight.current=true; setBusy(true); setError('')
    try {
      const receipt = await hostingerRequest<Receipt>('student/preparation-reset.php', { method:'POST', body:JSON.stringify({ action:checkOnly ? 'status' : 'reset', token:preview.token, ...(!checkOnly ? { confirmation, current_password:password } : {}) }) })
      if (!await accept(receipt) && owned()) { setUnknown(false); setError('No completed reset was found. Review the current records before trying again.'); setPreview(null) }
    } catch(e) {
      if (!owned()) return
      try {
        const receipt = await hostingerRequest<Receipt>('student/preparation-reset.php', { method:'POST', body:JSON.stringify({ action:'status', token:preview.token }) })
        if (!await accept(receipt)) { setUnknown(false); setError(e instanceof Error ? e.message : 'Reset was not completed. Your records are retained.') }
      } catch { setUnknown(true); setPassword(''); setError('The outcome could not be confirmed. Check reset status before taking another action. Your next successful sync will also retrieve the current records.') }
    } finally { inFlight.current=false; if (owned()) setBusy(false) }
  }
  function backup() {
    if (!owned()) return
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version:1, exportedAt:new Date().toISOString(), payload:captureProgressSnapshot() },null,2)],{ type:'application/json' }))
    const link=document.createElement('a'); link.href=url; link.download='css-vista-device-progress-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000)
  }
  if (!user || loading) return null
  return <section className="preparation-reset-panel" aria-label="Preparation reset options"><div className="reset-panel-copy"><RotateCcw size={22}/><div><h2>{attemptId ? 'Reset this schedule' : 'A fresh start, on your terms'}</h2><p>{attemptId ? 'Clear this account-linked plan without losing the rest of your preparation.' : 'Clear a timetable, rebuild your study plan or start preparation again. You choose the scope.'}</p></div></div>
    <Dialog open={open} onOpenChange={close}><DialogTrigger asChild><button className="reset-open" disabled={syncStatus === 'syncing'}><RotateCcw size={16}/>Review reset options</button></DialogTrigger><DialogContent className="reset-dialog" showCloseButton={!busy} onEscapeKeyDown={e => { if(busy) e.preventDefault() }} onInteractOutside={e => { if(busy) e.preventDefault() }}><DialogTitle>Reset preparation records</DialogTitle><DialogDescription>Your login, password, profile, photo and membership remain intact. A reset cannot be undone here.</DialogDescription>
      {!preview ? <><label>What would you like to reset?<select value={scope} onChange={e => { setScope(e.target.value as ResetScope); setError('') }}>{(attemptId ? ['attempt-plan'] : ['timetable','planner','preparation']).map(id => <option key={id} value={id}>{descriptions[id as ResetScope].title}</option>)}</select></label><p className="reset-scope-copy">{selected.text}</p>
        {scope === 'timetable' && <div className="reset-filter-grid"><label>Subject<select value={subject} onChange={e => setSubject(e.target.value)}><option value="">All subjects</option>{subjects.map(s => <option key={s}>{s}</option>)}</select></label><label>From date (optional)<input type="date" value={start} onChange={e => setStart(e.target.value)}/></label><label>Through date (optional)<input type="date" value={end} onChange={e => setEnd(e.target.value)}/></label></div>}
        {['planner','preparation'].includes(scope) && <label className="reset-checkbox"><input type="checkbox" checked={keep} onChange={e => setKeep(e.target.checked)}/>Keep my CSS/PMS subject choices and timetable settings</label>}
        <button className="reset-backup" onClick={backup}><Download size={16}/>Download device progress backup</button><p className="reset-small">This backup contains device progress only. Native reading and Factbook records are not included. Formal exam registrations/results, account-linked writing and evaluations, account-linked attempt settings and security/payment history are retained by a reset. Shared browser PDF bookmarks and unassigned legacy drafts are also retained.</p>
        <button className="reset-review" disabled={busy} onClick={() => void review()}>{busy ? 'Checking saved records…' : 'Review affected records'}</button></> : <><h3>{selected.title}</h3><p className="reset-scope-copy">{selected.text}</p><dl className="reset-counts">{Object.entries(preview.counts).filter(([key,count]) => count > 0 && (!key.startsWith('factbook_') || ['factbook_entries','factbook_media'].includes(key))).map(([key,count]) => <div key={key}><dt>{countLabels[key] || key}</dt><dd>{count}</dd></div>)}</dl><p className="reset-small">These counts describe saved records, not every individual field. {scope === 'timetable' && `Subject: ${subject || 'all'}; ${start || 'any start'} to ${end || 'any end'}.`} {scope !== 'timetable' && (keep ? 'Subject choices and timetable settings will be kept.' : 'Personal timetable settings will also be cleared.')} Your identity and protected assessment history remain intact.</p>
        <label>Current password<input type="password" autoComplete="current-password" value={password} disabled={busy || unknown} onChange={e => setPassword(e.target.value)}/></label><label>Type RESET to confirm<input autoComplete="off" value={confirmation} disabled={busy || unknown} onChange={e => setConfirmation(e.target.value)}/></label>
        {unknown ? <button className="reset-review" disabled={busy} onClick={() => void reset(true)}>{busy ? 'Checking…' : 'Check reset status'}</button> : <button className="reset-confirm" disabled={busy || confirmation !== 'RESET' || !password} onClick={() => void reset()}><Trash2 size={16}/>{busy ? 'Applying reset…' : 'Confirm reset'}</button>}
        {!busy && !unknown && <button className="reset-backup" onClick={() => { setPreview(null); setPassword(''); setConfirmation(''); setError('') }}>Change reset options</button>}</>}
      {error && <p role="alert" className="reset-error">{error}</p>}<p className="reset-safety"><ShieldCheck size={16}/>Only your signed-in account can be changed.</p>
    </DialogContent></Dialog>{message && <p role="status" className="reset-message">{message}</p>}</section>
}
