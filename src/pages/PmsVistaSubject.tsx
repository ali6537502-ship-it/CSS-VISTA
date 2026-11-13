import { Link, useParams } from 'react-router'
import { ArrowRight, BookOpen, ChevronRight } from 'lucide-react'
import { pmsVistaSubjects } from '@/data/pmsVistaPublic.generated.mjs'
import { PMS_MENTAL_ID, PMS_MENTAL_SOURCE, pmsMentalAbilitySubject } from '@/data/pmsMentalAbility'

type Topic = { title: string; detail?: string; children?: Topic[] }
type Section = { title: string; detail?: string; topics: Topic[] }
type Subject = {
  id: string; title: string; designation: 'compulsory' | 'optional'; marks?: number | null
  sections: Section[]; readings: readonly string[]; notes: readonly string[]
}
const originalSubjects = pmsVistaSubjects as Subject[]
const allSubjects: Subject[] = [originalSubjects[0], pmsMentalAbilitySubject, ...originalSubjects.slice(1)]
const byId = new Map(allSubjects.map(subject=>[subject.id,subject]))

function TopicTree({ nodes, depth = 0 }: { nodes: Topic[]; depth?: number }) {
  if (depth > 12) return null
  return <ol className={depth ? 'ml-3 mt-2 space-y-2 border-l border-slate-200 pl-4' : 'mt-4 space-y-3'}>
    {nodes.map((node, i) => <li key={i} dir="auto" className="text-[13px] leading-6 text-slate-700">
      <p className="font-semibold text-slate-900">{node.title}</p>
      {node.detail && node.detail.trim() !== node.title.trim() && <p className="mt-1 whitespace-pre-wrap text-slate-600">{node.detail}</p>}
      {node.children?.length ? <TopicTree nodes={node.children} depth={depth + 1} /> : null}
    </li>)}
  </ol>
}

export default function PmsVistaSubject() {
  const { subject: id } = useParams()
  const paper = byId.get(id || '')
  if (!paper) {
    return <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">PMS syllabus subject not found</h1>
      <p className="mt-3 text-sm text-slate-700">This subject is not part of the currently published PMS Vista syllabus collection.</p>
      <Link to="/pms-vista" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline">Browse the published PMS subjects</Link>
    </main>
  }
  const pos = allSubjects.findIndex(s => s.id === paper.id)
  const previous = allSubjects[pos - 1]
  const next = allSubjects[pos + 1]
  const studyUrl = '/account/tasks?exam=pms-punjab&view=syllabus&subject=' + encodeURIComponent(paper.id)
  return <main className="mx-auto max-w-5xl px-4 pb-14 pt-6 sm:px-6">
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
      <Link to="/" className="hover:underline">Home</Link><ChevronRight size={12} aria-hidden="true"/>
      <Link to="/pms-vista" className="text-emerald-800 hover:underline">PMS Vista — free preparation</Link><ChevronRight size={12} aria-hidden="true"/>
      <span dir="auto">{paper.title}</span>
    </nav>
    <header className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-5 py-7 sm:px-8">
      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Punjab PMS · {paper.designation === 'optional' ? 'Optional subject' : 'Compulsory paper'}</p>
      <h1 dir="auto" className="mt-2 font-[Georgia,serif] text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">PMS {paper.title} syllabus — free study guide</h1>
      <p className="mt-4 max-w-3xl text-[14px] leading-7 text-slate-700">
        {paper.id===PMS_MENTAL_ID?'Study the four competency areas named in PPSC’s published Mental Ability and Reasoning Test guidebook. The guidebook is non-exhaustive; the sample questions are illustrations rather than a prescribed question bank.':'Browse the Punjab Public Service Commission syllabus outline, including source section headings, study topics and available suggested readings.'} Your personal timetable is kept separately in Vista Mentor.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link to={studyUrl} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-900 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800">Plan these PMS topics <ArrowRight size={16} aria-hidden="true"/></Link>
        <Link to="/pms-vista#pms-syllabus" className="inline-flex min-h-11 items-center text-sm font-bold text-emerald-800 underline">All PMS subject guides</Link>
      </div>
      <p className="mt-4 text-xs text-slate-600">100-mark paper · Free to read · No account required to browse</p>
      {paper.id===PMS_MENTAL_ID&&<a href={PMS_MENTAL_SOURCE} rel="noopener noreferrer" target="_blank" className="mt-3 inline-flex text-sm font-semibold text-emerald-800 underline">Open PPSC original Mental Ability guidebook</a>}
    </header>
    <section aria-labelledby="subject-syllabus-structure" className="mt-10">
      <h2 id="subject-syllabus-structure" className="text-2xl font-bold text-slate-900" dir="auto">{paper.title}: syllabus sections and topics</h2>
      <p className="mt-2 text-[13px] leading-6 text-slate-600">
        This guide preserves the source outline headings and available topics. For the Mental Ability paper, the listed skills are from PPSC's later guidebook; other subject outlines come from the published syllabus files. The original PPSC documents remain authoritative.
      </p>
      <nav aria-label="Jump to a section" className="mt-5 flex flex-wrap gap-2">
        {paper.sections.map((section,i)=><a key={i} href={'#pms-section-' + (i+1)} dir="auto" className="inline-flex min-h-9 items-center rounded-full border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50">{section.title}</a>)}
      </nav>
      <div className="mt-7 space-y-5">
        {paper.sections.map((section,i)=><section key={i} id={'pms-section-' + (i+1)} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Section {i+1} of {paper.sections.length}</p>
          <h3 dir="auto" className="mt-1 text-xl font-bold text-slate-900">{section.title}</h3>
          {section.detail && <p dir="auto" className="mt-3 whitespace-pre-wrap text-[13px] leading-7 text-slate-700">{section.detail}</p>}
          {section.topics.length ? <TopicTree nodes={section.topics} /> :
            <p className="mt-3 text-[13px] text-slate-500">This entry appears as a heading in the source; no additional topics were supplied.</p>}
        </section>)}
      </div>
    </section>

    {paper.readings.length > 0 && <section aria-labelledby="subject-pms-reading" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 id="subject-pms-reading" className="text-xl font-bold text-slate-900">Suggested readings for PMS {paper.title}</h2>
      <p className="mt-2 text-[13px] leading-6 text-slate-600">These titles come from the supplied subject reference lists. They are study suggestions, not a compulsory purchase list. Check exact editions and citations before use.</p>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-emerald-800">Show {paper.readings.length} suggested readings</summary>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-[13px] leading-6 text-slate-700" dir="auto">{paper.readings.map((reading,i)=><li key={i}>{reading}</li>)}</ol>
      </details>
    </section>}
    {paper.notes.length > 0 && <section aria-labelledby="subject-pms-instructions" className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 id="subject-pms-instructions" className="text-lg font-bold text-slate-900">Additional source instructions</h2>
      {paper.notes.map((note,i)=><p key={i} dir="auto" className="mt-3 text-[13px] leading-7 text-slate-700">{note}</p>)}
    </section>}
    <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
      <BookOpen size={28} className="text-emerald-800" aria-hidden="true"/>
      <h2 className="mt-3 text-xl font-bold text-slate-900">Prepare this subject in PMS Vista</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">Select a daily study routine, read the original topic hierarchy, copy an analytical notes command and mark chapters complete only after studying. Save your personal work with a free account.</p>
      <Link to={studyUrl} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-900 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800">Open {paper.title} in Vista Mentor <ArrowRight size={16}/></Link>
    </section>
    <nav aria-label="Other PMS subjects" className="mt-7 flex flex-wrap justify-between gap-4 text-sm font-semibold text-emerald-800">
      {previous && <Link to={'/pms-vista/syllabus/' + previous.id} dir="auto" className="underline underline-offset-4">Previous: {previous.title}</Link>}
      {next && <Link to={'/pms-vista/syllabus/' + next.id} dir="auto" className="ml-auto underline underline-offset-4">Next: {next.title}</Link>}
    </nav>
    <p className="mt-8 text-[12px] leading-6 text-slate-500">PMS Vista is independent of PPSC. Always confirm examination dates, compulsory/optional rules and the latest syllabus from the <a href="https://www.ppsc.gop.pk/" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline">Punjab Public Service Commission</a>.</p>
  </main>
}
