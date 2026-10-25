import { ArrowUpRight } from 'lucide-react'
import { subjectVisual } from '@/features/workspace/Visuals'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { AccountPage, useAccountSnapshot } from './shared'
import { compulsoryCatalogue, optionalCatalogue, topicCoverage, type SyllabusSubject } from '@/features/workspace/model'
import { useWorkspacePreferences } from '@/features/workspace/preferences'
import { validateSubjectCombination } from '@/lib/subjectSelection'
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
  const optionals = names.map(name => ({name, marks:optionalCatalogue.find(s => s.name === name)?.marks, slug:data?.find(s => s.name === name)?.slug}))
  const compulsory = compulsoryCatalogue(preferences.comparative)
  return <div className="ws-stack">
    {!compact && <label className="ws-subject-choice text-sm"><span className="block font-semibold">Sixth compulsory paper</span><select className="min-h-11 border rounded-lg p-2 w-full" value={preferences.comparative ? 'comparative' : 'islamic'} onChange={e => update({comparative:e.target.value === 'comparative'})}><option value="islamic">Islamic Studies</option><option value="comparative">Comparative Study of Major Religions (For Non-Muslims)</option></select><span className="ws-muted block mt-3">Choose the alternative only if eligible. This preference is saved on this device.</span>{error && <span role="alert">{error}</span>}</label>}
    {failure && <p role="alert" className="ws-panel">Syllabus details could not be loaded. <button className="underline min-h-11 px-2" onClick={() => setRetry(v => v+1)}>Retry</button></p>}
    {!data && !failure && <p role="status">Loading topic coverage…</p>}
    {[{title:'Compulsory · 600 marks',subjects:compulsory},{title:'Your optional subjects',subjects:optionals}].map(group => <section key={group.title}><h2 className="font-bold mb-4">{group.title}</h2><div className="ws-card-grid ws-subject-grid">{group.subjects.map(s => { const source = data?.find(d => d.slug === s.slug); const coverage = topicCoverage(source,snapshot.state.syllabusItemStatuses ?? {}); const visual = subjectVisual(s.name); const Icon = visual.icon; return <article key={s.name} className={`ws-subject-card ws-tone-${visual.tone}`}><div className="ws-subject-art" aria-hidden="true"><Icon size={34} strokeWidth={1.4}/><span/><i/></div><div className="ws-subject-meta"><span>{s.marks === 200 ? "Paper I + Paper II" : "Single paper"}</span><span>{s.marks ? `${s.marks} marks` : "Review subject"}</span></div><h3 className="font-semibold">{s.name}</h3><p className="ws-subject-caption">{visual.label}</p><p className="ws-muted mt-3">{!data ? failure ? 'Coverage unavailable' : 'Loading coverage…' : coverage.total ? `${coverage.completed} / ${coverage.total} tracked syllabus items completed` : 'Syllabus detail unavailable'}</p>{coverage.percent !== null && <progress className="w-full mt-2 accent-emerald-800" max={100} value={coverage.percent} aria-label={`${s.name} tracked item completion`} />}<div className="flex flex-wrap gap-3 mt-3 text-sm font-semibold">{s.slug && <Link className="min-h-11 inline-flex items-center underline" to={s.slug === 'essay' ? '/subjects/compulsory/essay' : `/fpsc-syllabus?subject=${s.slug}`}>Study subject <ArrowUpRight size={16}/></Link>}{!compact && s.slug && <Link className="min-h-11 inline-flex items-center underline" to={`/past-papers?subject=${encodeURIComponent(s.name)}`}>Past papers</Link>}</div></article> })}</div>{!group.subjects.length && <p className="ws-panel ws-muted">{syncStatus === 'syncing' ? 'Loading saved subject choices…' : <>No optional subjects selected. <Link to="/account/plan" className="underline">Choose your subjects</Link>.</>}</p>}</section>)}
    {names.length > 0 && (!validation.valid || selected.some(s => !s)) && <p className="ws-panel ws-muted">Your saved selection needs review. {validation.violations.join('. ')}{selected.some(s => !s) && ' An existing subject is not recognized.'} Your records are retained. <Link className="underline" to="/account/plan">Review selection</Link>.</p>}
  </div>
}
export default function Subjects() { return <AccountPage title="My Subjects" intro="Six compulsory papers and your saved optional selection. Coverage reflects manually tracked syllabus items, not assessed mastery." action={<Link className="ws-action" to="/account/plan">Edit optional subjects</Link>}><SubjectOverview /></AccountPage> }
