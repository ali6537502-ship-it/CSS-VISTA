import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, BookOpen, Check, ChevronRight, ClipboardCopy } from 'lucide-react'
import { cssVistaOptionals, cssVistaSource, findCssVistaOptional } from '@/data/cssVistaPublic'
import {
  buildMissingCssOptionalSourceCommand, buildVistaNotesCommand, cssGuideSubjects, cssOptionalFocusUnits,
  guideUnits, type VistaUnit,
} from '@/features/planner/vistaGuideModel'

function CopyCommand({ label, command }: { label: string; command: string }) {
  const [feedback, setFeedback] = useState('')
  const [manual, setManual] = useState('')
  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setManual('')
      setFeedback('Copied. Paste the command into your notes conversation.')
    } catch {
      setManual(command)
      setFeedback('Clipboard is unavailable. Select and copy the text below.')
    }
  }
  return <div className="min-w-0">
    <button type="button" onClick={copy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50">
      {feedback.startsWith('Copied')?<Check size={15}/>:<ClipboardCopy size={15}/>} {label}
    </button>
    {feedback && <p role="status" className="mt-1 text-xs text-emerald-900">{feedback}</p>}
    {manual && <textarea aria-label="Copy notes command manually" readOnly value={manual} onFocus={event=>event.currentTarget.select()} rows={5} className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-xs"/>}
  </div>
}

function StudyUnit({ unit, index }: { unit: VistaUnit; index: number }) {
  return <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Study unit {index+1} · Source-based preparation block</p>
    <h4 className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-900" dir="auto">{unit.title}</h4>
    <details className="mt-2 text-xs leading-6 text-slate-700">
      <summary className="cursor-pointer font-semibold text-emerald-800">View prescribed section and study scope</summary>
      <pre dir="auto" className="mt-2 whitespace-pre-wrap break-words font-sans">{unit.syllabus}</pre>
    </details>
    <div className="mt-3"><CopyCommand label="Copy study-unit notes command" command={buildVistaNotesCommand(unit)}/></div>
  </article>
}

export default function CssVistaSubject() {
  const { subject: slug } = useParams()
  const item = findCssVistaOptional(slug)
  const [showEntries, setShowEntries] = useState<Record<number, boolean>>({})
  const [only, setOnly] = useState('')
  const paper = useMemo(() => item ? cssGuideSubjects({ subjects: [item] })[0] : undefined, [item])
  const units = useMemo(() => paper ? guideUnits(paper,'css') : [], [paper])
  if (!item || !paper) return <main className="mx-auto max-w-4xl px-4 py-12">
    <h1 className="text-2xl font-bold">Optional subject not found</h1>
    <Link to="/css-vista" className="mt-4 inline-block font-semibold text-emerald-800 underline">Browse CSS optional subjects</Link>
  </main>
  const idx = cssVistaOptionals.findIndex(p=>p.slug===item.slug)
  const previous = cssVistaOptionals[idx-1]
  const next = cssVistaOptionals[idx+1]
  const plannerUrl = '/account/tasks?exam=css&view=syllabus&subject='+encodeURIComponent(item.slug)
  const configUrl = '/account/tasks?exam=css&view=settings'
  const hasTranscription = item.sections.length>0
  return <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <Link to="/">Home</Link><ChevronRight size={12}/><Link to="/css-vista" className="text-emerald-800">CSS Vista</Link><ChevronRight size={12}/><span dir="auto">{item.name}</span>
    </nav>
    <header className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">FPSC CSS · Optional group {item.group} · {item.marks} marks</p>
      <h1 className="mt-2 font-[Georgia,serif] text-3xl font-semibold leading-tight text-slate-900">{item.name} — syllabus and preparation commands</h1>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        {hasTranscription
          ? 'Read the original syllabus in order. Copy comprehensive textbook-depth study commands for specific source-based units, with smaller source entries available under each section. Unit boundaries are study aids, not separately prescribed FPSC topics.'
          : 'This paper is listed in the official syllabus, but the available extract is in scanned script. Original scans are available below; no unverified chapter list has been generated.'}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to={plannerUrl} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-900 px-4 py-3 text-sm font-bold text-white">
          Open in CSS Vista Mentor <ArrowRight size={16}/>
        </Link>
        <Link to={configUrl} className="inline-flex min-h-11 items-center rounded-lg border border-emerald-800 px-4 py-3 text-sm font-semibold text-emerald-900">
          Set up my daily timetable
        </Link>
      </div>
    </header>
    {hasTranscription ? <>
      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Syllabus totals">
        {[[String(item.sections.length),'Source sections'],[String(units.length),'Schedulable study units'],[String(item.sections.reduce((n,s)=>n+s.items.filter(Boolean).length,0)),'Original source entries']].map(([count,label]) =>
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><strong className="block text-2xl font-bold text-emerald-800">{count}</strong><span className="text-xs text-slate-600">{label}</span></div>)}
      </section>
      <section className="mt-9">
        <h2 className="font-[Georgia,serif] text-2xl font-semibold">Sections and topic-wise notes commands</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">Preserve the wording of the source. For a long OCR-wrapped passage, copy its study block instead of treating each line as an unrelated topic.</p>
        <label className="mt-4 block text-sm font-semibold text-slate-700">Find a topic within this paper
          <input type="search" value={only} onChange={e=>setOnly(e.target.value)} placeholder="Search topic or section text" className="mt-2 block w-full max-w-xl rounded-xl border border-slate-300 bg-white p-3 text-sm outline-emerald-700"/>
        </label>
        <nav aria-label="Jump to syllabus section" className="mt-5 flex flex-wrap gap-2">
          {item.sections.map((s,i)=><a href={'#css-optional-section-'+(i+1)} key={i} className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-emerald-800">{s.title}</a>)}
        </nav>
        <div className="mt-7 space-y-5">
          {item.sections.map((section,i)=>{
            const matches = !only.trim() || (section.title+' '+section.items.join(' ')).toLocaleLowerCase().includes(only.trim().toLocaleLowerCase())
            if(!matches) return null
            const prefix = 'vista-css:'+item.slug+':s'+(i+1)
            const chapterUnits = units.filter(unit => unit.id===prefix || unit.id.startsWith(prefix+':'))
            const focus = cssOptionalFocusUnits(paper,paper.sections[i])
            return <section key={i} id={'css-optional-section-'+(i+1)} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Section {i+1} of {item.sections.length}</p>
              <h3 className="mt-1 text-xl font-bold" dir="auto">{section.title}</h3>
              <div className="mt-4 grid gap-3">{chapterUnits.map((unit,j)=><StudyUnit unit={unit} index={j} key={unit.id}/>)}</div>
              {!chapterUnits.length && <p className="mt-3 text-xs text-slate-600">This is a paper or part divider in the source, not a separate lesson.</p>}
              {focus.length>0 && <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <button type="button" className="text-left text-sm font-bold text-emerald-800 underline" aria-expanded={!!showEntries[i]} onClick={()=>setShowEntries(old=>({...old,[i]:!old[i]}))}>
                  {showEntries[i]?'Hide':'Show'} {focus.length} original syllabus entries and individual copy commands
                </button>
                {showEntries[i] && <div className="mt-4 grid gap-3">
                  <p className="text-xs leading-6 text-slate-600">These are exact transcribed source entries. Some are continuation lines, so the command includes the complete section for context.</p>
                  {focus.map((unit,j)=><div key={unit.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p dir="auto" className="mb-2 whitespace-pre-wrap text-sm leading-6">{j+1}. {unit.title}</p>
                    <CopyCommand label="Copy this source-entry command" command={buildVistaNotesCommand(unit)}/>
                  </div>)}
                </div>}
              </div>}
            </section>
          })}
        </div>
      </section>
    </> : <section className="mt-9 rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
      <h2 className="text-xl font-bold">Official syllabus scans — transcription required</h2>
      <p className="mt-2 text-sm leading-7">The source pages are supplied as scans. The website cannot safely divide these into examinable topics without a verified transcription in the original script. Use the source pages rather than an invented syllabus.</p>
      <div className="mt-4 flex flex-wrap gap-3">{(item.scanPages||[]).map((path,i)=>
        <a key={path} href={path} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-lg border border-amber-700 px-4 text-sm font-semibold text-amber-900">Open scanned page {i+1}</a>)}</div>
      <div className="mt-5"><CopyCommand label="Copy official-syllabus research command" command={buildMissingCssOptionalSourceCommand(item.name)}/></div>
    </section>}
    <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <BookOpen className="text-emerald-800" size={25}/>
      <h2 className="mt-3 text-xl font-bold">Put {item.name} on your CSS daily plan</h2>
      <p className="mt-2 text-sm leading-7 text-slate-700">Choose this optional paper in Subjects and routine, set your study hours and priorities, generate a plan and confirm it. Existing completed tasks and historical study records are kept.</p>
      <Link to={configUrl} className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-emerald-900 underline">Choose subjects and create timetable <ArrowRight size={16}/></Link>
    </section>
    <nav aria-label="Other CSS optional papers" className="mt-8 flex flex-wrap justify-between gap-4 text-sm font-semibold text-emerald-800">
      {previous && <Link to={'/css-vista/syllabus/'+previous.slug} className="underline">Previous: {previous.name}</Link>}
      {next && <Link to={'/css-vista/syllabus/'+next.slug} className="ml-auto underline">Next: {next.name}</Link>}
    </nav>
    <p className="mt-8 text-xs leading-6 text-slate-600">Source: {cssVistaSource.title}, {cssVistaSource.publisher}. <a href={cssVistaSource.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline">Original FPSC syllabus PDF</a>. The original official syllabus remains authoritative.</p>
  </main>
}
