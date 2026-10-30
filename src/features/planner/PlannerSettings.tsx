import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Save, Settings2 } from 'lucide-react'
import { optionalGroups } from '@/data/syllabus'
import { validateSubjectCombination } from '@/lib/subjectSelection'
import { defaultStudyPlannerSettings } from '@/lib/studyPlanner'
import { getState, saveStudyPlanner, type StudyPlannerSettings } from '@/lib/store'
import { useAccount } from '@/lib/accountContext'
import { useAccountSnapshot } from '@/pages/account/shared'
import { targetDays } from '@/features/workspace/model'
import { dayKey } from './model'

type Draft = Omit<StudyPlannerSettings, 'configuredAt'>
function settingsDraft(stored?: StudyPlannerSettings | null): Draft {
  return stored ? { examDate: stored.examDate, dailyHours: stored.dailyHours, restDay: stored.restDay, selectedOptionals: stored.selectedOptionals } : { ...defaultStudyPlannerSettings(), examDate: '' }
}
export default function PlannerSettings() {
  const { snapshot } = useAccountSnapshot()
  const { user, syncStatus } = useAccount()
  const stored = snapshot.state.studyPlanner
  const [draft, setDraft] = useState<Draft>(() => settingsDraft(stored))
  const [dirty, setDirty] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  const edited = useRef(false)
  const [search, setSearch] = useState('')
  // Hydration may finish after the form mounts. Never replace a student's edits.
  useEffect(() => { if (!edited.current) setDraft(settingsDraft(stored)) }, [stored])
  const recognized = optionalGroups.flatMap(group => group.subjects).filter(subject => draft.selectedOptionals.includes(subject.name))
  const validation = validateSubjectCombination(recognized)
  const unknown = draft.selectedOptionals.filter(name => !recognized.some(subject => subject.name === name))
  const violations = [...validation.violations, ...unknown.map(name => `Unrecognized saved subject: ${name}`)]
  const days = targetDays(draft.examDate, dayKey())
  const validHours = Number.isFinite(draft.dailyHours) && draft.dailyHours >= 1 && draft.dailyHours <= 12
  const pending = Boolean(user && syncStatus === 'syncing')
  function change(patch: Partial<Draft>) { edited.current = true; setDirty(true); setMessage(''); setDraft(current => ({ ...current, ...patch })) }
  function save(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    if (pending || violations.length || days === null || !validHours) return
    saveStudyPlanner(draft)
    const saved = getState().studyPlanner
    if (!saved || saved.examDate !== draft.examDate || saved.dailyHours !== draft.dailyHours || saved.restDay !== draft.restDay || JSON.stringify(saved.selectedOptionals) !== JSON.stringify(draft.selectedOptionals)) {
      setError('Settings could not be saved on this device. Your choices are retained; please try again.'); return
    }
    edited.current = false; setDirty(false); setMessage('Study settings saved on this device. Your existing tasks and progress are retained.')
  }
  return <form onSubmit={save} className="pl-settings">
    <section className="pl-settings-routine"><div className="pl-section-heading"><div><p className="pl-kicker">A ROUTINE THAT WORKS FOR YOU</p><h2>Schedule settings</h2></div><Settings2 size={22}/></div><p className="pl-muted">Set your own target and available time. These settings guide planning; they do not rewrite your saved schedule.</p>
      <div className="pl-routine-grid"><label>Target examination date<input type="date" value={draft.examDate} onChange={e => change({ examDate: e.target.value })} required/><small>Your chosen target, not an official FPSC date.</small></label><label>Study hours each day<input type="number" min={1} max={12} step={0.5} value={Number.isNaN(draft.dailyHours) ? '' : draft.dailyHours} onChange={e => change({ dailyHours: e.target.value === '' ? NaN : Number(e.target.value) })} required/><small>Used to highlight days above your availability.</small></label><label>Weekly light-study day<select value={draft.restDay} onChange={e => change({ restDay: Number(e.target.value) })}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day, i) => <option key={day} value={i}>{day}</option>)}</select><small>Kept consistent with the existing suggestion engine.</small></label></div>
      {days !== null && <p className="pl-note">{days < 0 ? 'Your saved target date has passed. Choose a new target when you are ready.' : days === 0 ? 'Your selected target is today.' : `${days} days to your selected target.`}</p>}
    </section>
    <section className="pl-subject-selection"><div className="pl-section-heading"><div><p className="pl-kicker">YOUR OPTIONAL PAPERS</p><h2>Choose your subjects</h2></div><span className={`pl-selection-total ${validation.valid ? 'is-valid' : ''}`}>{validation.total}<small> / 600 marks</small></span></div><p className="pl-muted">Choose 600 marks within the FPSC group limits. Changing this selection keeps the historical records for every subject.</p>
      <div className="pl-selected-subjects">{draft.selectedOptionals.length ? draft.selectedOptionals.map(name => <span key={name}>{name}</span>) : <p className="pl-muted">No optional subjects selected yet.</p>}</div>
      {unknown.map(name => <p key={name} className="pl-warning">Unrecognized saved subject: {name}. <button type="button" className="pl-text-button" onClick={() => change({ selectedOptionals: draft.selectedOptionals.filter(value => value !== name) })}>Remove from this selection</button></p>)}
      <label className="pl-subject-search">Find an optional subject<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by subject name"/></label>
      <div className="pl-optional-groups">{optionalGroups.map(group => {
        const subjects = group.subjects.filter(subject => subject.name.toLowerCase().includes(search.trim().toLowerCase()))
        if (!subjects.length) return null
        return <fieldset key={group.group}><legend>Group {group.group}</legend><p>{group.rule}</p><div>{subjects.map(subject => {
          const selected = draft.selectedOptionals.includes(subject.name)
          return <label key={subject.name} className={selected ? 'is-selected' : ''}><input type="checkbox" aria-label={subject.name} checked={selected} onChange={() => change({ selectedOptionals: selected ? draft.selectedOptionals.filter(name => name !== subject.name) : [...draft.selectedOptionals, subject.name] })}/><span>{subject.name}<small>{subject.marks === 200 ? 'Paper I + Paper II' : 'Single paper'}</small></span><strong>{subject.marks}</strong>{selected && <Check size={15} aria-hidden="true"/>}</label>
        })}</div></fieldset>
      })}</div>
      {!optionalGroups.some(group => group.subjects.some(subject => subject.name.toLowerCase().includes(search.trim().toLowerCase()))) && <p className="pl-note">No subjects match. Clear the search or try another name.</p>}
    </section>
    <div className="pl-settings-save">
      {violations.length > 0 && <div role="alert" className="pl-validation"><strong>Before saving:</strong><ul>{violations.map(value => <li key={value}>{value}</li>)}</ul></div>}
      {days === null && <p className="pl-muted">Choose a valid target date before saving your schedule settings.</p>}
      {pending && <p role="status" className="pl-note">Account settings are syncing. Your current edits are retained.</p>}
      <div className="pl-actions"><button className="pl-primary" type="submit" disabled={pending || violations.length > 0 || days === null || !validHours}><Save size={16}/>Save settings</button>{dirty && <span className="pl-muted">Unsaved changes</span>}<p className="pl-muted">{stored?.configuredAt ? `Last configured ${new Date(stored.configuredAt).toLocaleDateString()}.` : 'No schedule settings saved yet.'} {user ? 'Account synchronization uses your existing sync service.' : 'Sign in to synchronize your plan.'}</p></div>
      {message && <p className="pl-success" role="status">{message}</p>}{error && <p className="pl-error" role="alert">{error}</p>}
    </div>
  </form>
}
