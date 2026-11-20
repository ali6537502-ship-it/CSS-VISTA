import { ArrowUpRight, ClipboardCopy } from 'lucide-react'
import { subjectVisual } from '@/features/workspace/Visuals'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { AccountPage, useAccountSnapshot } from './shared'
import type { StudyScheduleTask, SyllabusItemStatus } from '@/lib/store'
import { compulsoryCatalogue, optionalCatalogue, topicCoverage, type SyllabusSubject } from '@/features/workspace/model'
import { useWorkspacePreferences } from '@/features/workspace/preferences'
import { validateSubjectCombination, validateStudySelection } from '@/lib/subjectSelection'
import { buildVistaNotesCommand, cssGuideSubjects, cssOptionalStudyProgress, guideUnits } from '@/features/planner/vistaGuideModel'
import MissingOptionalSyllabusCommand from '@/features/planner/MissingOptionalSyllabusCommand'
function CopyNextSubjectCommand({ subject, optional, statuses, tasks }: {
  subject: SyllabusSubject
  optional: boolean
  statuses: Record<string, SyllabusItemStatus>
  tasks: Pick<StudyScheduleTask, 'syllabusItemId' | 'status'>[]
}) {
  const [feedback,setFeedback]=useState('')
  const [manual,setManual]=useState('')
  const unit=useMemo(()=>{
    const paper=cssGuideSubjects({subjects:[{...subject,designation:optional?'optional' as const:'compulsory' as const}]})
      .find(item=>item.id===subject.slug)
    if(!paper)return null
    const items=guideUnits(paper,'css')
    const done=new Set(tasks.filter(task=>task.status==='completed').map(task=>task.syllabusItemId))
    return items.find(item=>{
      const ids=item.legacySectionId ? [item.id,item.legacySectionId] : [item.id]
      const completedByCurrent=ids.some(id=>statuses[id]==='completed'||done.has(id))
      const completedByOldLines=!!item.sourceItemIds?.length &&
        item.sourceItemIds.every(id=>statuses[id]==='completed'||done.has(id))
      return !completedByCurrent && !completedByOldLines
    }) || items[0] || null
  },[subject,optional,statuses,tasks])
  if(!unit)return null
  async function copy() {
    const command=buildVistaNotesCommand(unit!)
    try {
      await navigator.clipboard.writeText(command)
      setManual('')
      setFeedback('Command copied. Paste it into ChatGPT for source-led chapter notes.')
    }catch {
      setManual(command)
      setFeedback('Clipboard unavailable. Select and copy the command below.')
    }
  }
  return <div className="mt-3 grid gap-1.5">
    <button type="button" onClick={copy}
      aria-label={'Copy next chapter notes command for '+subject.name}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-700 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-50">
      <ClipboardCopy size={15}/>Copy next chapter command
    </button>
    <span className="text-xs text-muted-foreground">Chapter: {unit.title}</span>
    {feedback&&<span role="status" className="text-xs text-emerald-900">{feedback}</span>}
    {manual&&<textarea aria-label={'Copy notes command manually for '+subject.name} readOnly rows={5} value={manual} onFocus={event=>event.currentTarget.select()} className="w-full rounded-lg border p-2 text-xs"/>}
  </div>
}
export function SubjectOverview({ compact = false }: { compact?: boolean }) {
  const { snapshot } = useAccountSnapshot()
  const { syncStatus } = useAccount()
  const { preferences, update, error } = useWorkspacePreferences()
  const [data,setData] = useState<SyllabusSubject[] | null>(null)
  const [failure,setFailure] = useState(false)
  const [retry,setRetry] = useState(0)
  useEffect(() => { const controller = new AbortController(); fetch('/fpsc-syllabus.json',{signal:controller.signal}).then(r => { if (!r.ok) throw Error(); return r.json() }).then(d => { if (!controller.signal.aborted) { setData(d.subjects); setFailure(false) } }).catch(() => { if (!controller.signal.aborted) setFailure(true) }); return () => controller.abort() },[retry])
  const names = snapshot.state.studyPlanner?.selectedOptionals ?? []
  const selected = names.map(name => optionalCatalogue.find(s => s.name === name))
  const validation = validateSubjectCombination(selected.filter((s): s is NonNullable<typeof s> => !!s))
  const studyValidation = validateStudySelection(selected.filter((s): s is NonNullable<typeof s> => !!s))
  const optionals = names.map(name => ({name, marks:optionalCatalogue.find(s => s.name === name)?.marks, slug:data?.find(s => s.name === name)?.slug}))
  const compulsory = compulsoryCatalogue(preferences.comparative)
  return <div className="ws-stack">
    {!compact && <label className="ws-subject-choice text-sm"><span className="block font-semibold">Sixth compulsory paper</span><select className="min-h-11 border rounded-lg p-2 w-full" value={preferences.comparative ? 'comparative' : 'islamic'} onChange={e => update({comparative:e.target.value === 'comparative'})}><option value="islamic">Islamic Studies</option><option value="comparative">Comparative Study of Major Religions (For Non-Muslims)</option></select><span className="ws-muted block mt-3">Choose the alternative only if eligible. This preference is saved on this device.</span>{error && <span role="alert">{error}</span>}</label>}
    {failure && <p role="alert" className="ws-panel">Syllabus details could not be loaded. <button className="underline min-h-11 px-2" onClick={() => setRetry(v => v+1)}>Retry</button></p>}
    {!data && !failure && <p role="status">Loading topic coverage…</p>}
    {[{title:'Compulsory · 600 marks',subjects:compulsory},{title:'Your optional subjects',subjects:optionals}].map(group => <section key={group.title}><h2 className="font-bold mb-4">{group.title}</h2><div className="ws-card-grid ws-subject-grid">{group.subjects.map(s => { const source = data?.find(d => d.slug === s.slug);
      const isOptional=group.title==='Your optional subjects'
      const syllabusStatuses=snapshot.state.syllabusItemStatuses ?? {}
      const vistaPaper=isOptional && source
        ? cssGuideSubjects({subjects:[{...source,designation:'optional' as const}]}).find(paper=>paper.id===source.slug)
        : null
      const coverage=vistaPaper
        ? cssOptionalStudyProgress(vistaPaper,syllabusStatuses,snapshot.state.studyScheduleTasks)
        : topicCoverage(source,syllabusStatuses)
      const oldCoverage=isOptional ? topicCoverage(source,syllabusStatuses) : null
      const visual = subjectVisual(s.name); const Icon = visual.icon; return <article key={s.name} className={`ws-subject-card ws-tone-${visual.tone}`}><div className="ws-subject-art" aria-hidden="true"><Icon size={34} strokeWidth={1.4}/><span/><i/></div><div className="ws-subject-meta"><span>{s.marks === 200 ? "Paper I + Paper II" : "Single paper"}</span><span>{s.marks ? `${s.marks} marks` : "Review subject"}</span></div><h3 className="font-semibold">{s.name}</h3><p className="ws-subject-caption">{visual.label}</p><p className="ws-muted mt-3">{!data ? failure ? 'Coverage unavailable' : 'Loading coverage…' : coverage.total ? `${coverage.completed} / ${coverage.total} ${isOptional?'scheduled study blocks':'tracked syllabus items'} completed` : 'Syllabus detail unavailable'}</p>{isOptional && oldCoverage && oldCoverage.completed>0 && <p className="ws-muted mt-2 text-xs">Earlier source-item checks: {oldCoverage.completed} / {oldCoverage.total} retained</p>}{isOptional && source && !source.sections.length && <p className="ws-muted mt-2 text-xs">The current syllabus extract has no transcribed sections for this paper; a source-based timetable cannot be generated until the official outline is supplied.</p>}{coverage.percent !== null && <progress className="w-full mt-2 accent-emerald-800" max={100} value={coverage.percent} aria-label={`${s.name} tracked item completion`} />}<div className="flex flex-wrap gap-3 mt-3 text-sm font-semibold">{s.slug && <Link className="min-h-11 inline-flex items-center underline" to={`/account/tasks?exam=css&view=syllabus&subject=${encodeURIComponent(s.slug)}`}>Study subject <ArrowUpRight size={16}/></Link>}{!compact && s.slug && <Link className="min-h-11 inline-flex items-center underline" to={`/past-papers?subject=${encodeURIComponent(s.name)}`}>Past papers</Link>}</div>
      {source && s.slug !== 'essay' && <CopyNextSubjectCommand key={source.slug} subject={source} optional={isOptional} statuses={syllabusStatuses} tasks={snapshot.state.studyScheduleTasks}/>}
      {source && isOptional && !source.sections.length && <MissingOptionalSyllabusCommand subject={source.name}/>}
      {s.slug==='essay' && <Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline" to="/study-material/essay-themes">Build essay themes and outlines</Link>}
      </article> })}</div>{!group.subjects.length && <p className="ws-panel ws-muted">{syncStatus === 'syncing' ? 'Loading saved subject choices…' : <>No optional subjects selected. <Link to="/account/tasks?exam=css&view=settings" className="underline">Choose your subjects</Link>.</>}</p>}</section>)}
    {names.length > 0 && (!studyValidation.valid || selected.some(s => !s)) && <p className="ws-panel ws-muted">Your saved selection needs review. {studyValidation.violations.join('. ')}{selected.some(s => !s) && ' An existing subject is not recognized.'} Your records are retained. <Link className="underline" to="/account/tasks?exam=css&view=settings">Review selection</Link>.</p>}
    {names.length>0 && studyValidation.valid && !validation.valid && <p className="ws-panel ws-muted">You have selected {studyValidation.total} of the required 600 optional marks for preparation. You can study these papers now; the final examination combination must total 600 marks and satisfy FPSC group rules. <Link className="underline" to="/account/tasks?exam=css&view=settings">Choose the remaining papers</Link>.</p>}
  </div>
}
import '@/features/planner/planner.css'
const PmsVista = lazy(() => import('@/features/planner/VistaStudyGuide'))
export default function Subjects() {
  const [params] = useSearchParams(), pms = params.get('exam') === 'pms-punjab'
  return <AccountPage title="My Subjects" intro={pms ? 'Your PMS Vista syllabus, selected papers and personalized preparation progress.' : 'Compulsory and selected optional papers share the same daily timetable, study-block notes commands, revision and self-reported progress. Earlier records remain available.'} action={<Link className="ws-action" to={pms ? '/account/tasks?exam=pms-punjab&view=settings' : '/account/tasks?exam=css&view=settings'}>Edit subject choices</Link>}>
    <div className="pl-exam-switch" aria-label="Subject examination"><Link className={!pms ? 'is-selected' : ''} aria-current={!pms ? 'page' : undefined} to="/account/subjects">CSS subjects</Link><Link className={pms ? 'is-selected' : ''} aria-current={pms ? 'page' : undefined} to="/account/subjects?exam=pms-punjab">PMS Punjab subjects</Link></div>
    {pms ? <Suspense fallback={<p role="status">Loading PMS subjects…</p>}><PmsVista exam="pms-punjab"/></Suspense> : <SubjectOverview/>}
  </AccountPage>
}
