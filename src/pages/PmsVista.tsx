import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, GraduationCap, Search } from 'lucide-react'
import { pmsVistaSubjects } from '@/data/pmsVistaPublic.generated.mjs'

type Subject = {
  id: string; title: string; designation: 'compulsory' | 'optional'; marks?: number | null
  sections: Array<{ title: string; detail?: string; topics: Array<{ title: string }> }>
}
const subjects = pmsVistaSubjects as Subject[]
const compulsory = subjects.filter(subject => subject.designation === 'compulsory')
const optional = subjects.filter(subject => subject.designation === 'optional')

function SubjectCard({ subject }: { subject: Subject }) {
  const previews = subject.sections.flatMap(section => section.topics.slice(0, 1).map(topic => topic.title)).slice(0, 2)
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
        {subject.designation === 'compulsory' ? 'Compulsory paper' : 'Optional subject'} · {subject.marks ?? 100} marks
      </p>
      <h3 dir="auto" className="mt-2 text-[17px] font-bold leading-snug text-slate-900">{subject.title}</h3>
      <p className="mt-2 text-[12px] leading-6 text-slate-600" dir="auto">
        {subject.sections.map(section => section.title).slice(0, 3).join(' · ')}
      </p>
      {previews.length > 0 && <p dir="auto" className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-500">{previews.join(' · ')}</p>}
      <Link to={'/pms-vista/syllabus/' + subject.id} className="mt-4 inline-flex min-h-10 items-center gap-2 text-[13px] font-bold text-emerald-800 underline-offset-4 hover:underline">
        Read subject syllabus <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  )
}

export default function PmsVista() {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase()
    if (!needle) return { compulsory, optional }
    const matches = (subject: Subject) => subject.title.toLocaleLowerCase().includes(needle)
      || subject.sections.some(section =>
        section.title.toLocaleLowerCase().includes(needle)
        || section.topics.some(topic => topic.title.toLocaleLowerCase().includes(needle)))
    return { compulsory: compulsory.filter(matches), optional: optional.filter(matches) }
  }, [search])

  return <main className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6">
    <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500"><Link to="/" className="hover:underline">Home</Link><span aria-hidden="true"> / </span><span>PMS Vista</span></nav>
    <header className="overflow-hidden rounded-[28px] border border-emerald-900/15 bg-gradient-to-br from-[#113d2e] via-[#215b43] to-[#36775c] px-5 py-8 text-white sm:px-9 sm:py-11">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-100">PMS Vista · Punjab competitive examination</p>
      <h1 className="mt-3 max-w-4xl font-[Georgia,serif] text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">Free PMS preparation in Punjab — PMS Vista</h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-7 text-emerald-50">
        Prepare for the Punjab Provincial Management Service examination with the updated PPSC subject syllabus, a free chapter-by-chapter preparation guide, optional-subject selection, personalized study schedules and revision tracking. Explore syllabus subjects below without signing in.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/account/tasks?exam=pms-punjab&view=syllabus" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-50">
          Open free PMS study planner <ArrowRight size={17} aria-hidden="true"/>
        </Link>
        <a href="#pms-syllabus" className="inline-flex min-h-11 items-center rounded-xl border border-white/50 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">
          Browse the updated PMS syllabus
        </a>
      </div>
      <p className="mt-4 text-[12px] text-emerald-100">No payment required. A free account is used only to save your personal schedule and completion records.</p>
    </header>

    <section aria-label="Syllabus coverage" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[['40', 'Subjects available'], ['10', 'Compulsory syllabus entries'], ['30', 'Optional subjects'], ['1', 'Optional subject to select']].map(([value,label]) =>
        <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <strong className="block text-2xl font-bold tabular-nums text-emerald-800">{value}</strong>
          <span className="mt-1 block text-[12px] leading-5 text-slate-600">{label}</span>
        </div>)}
    </section>

    <section aria-labelledby="how-pms-vista-works" className="mt-10">
      <h2 id="how-pms-vista-works" className="font-[Georgia,serif] text-2xl font-semibold text-slate-900">Prepare from the new PMS syllabus, one chapter at a time</h2>
      <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-700">
        PMS Vista is a free preparation workspace, not a collection of PDF redirects. The public subject guides show the prescribed topic structure; inside the planner, you choose your compulsory and optional papers, allocate study hours and create a daily chapter schedule.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <BookOpen className="h-6 w-6 text-emerald-800" aria-hidden="true"/>
          <h3 className="mt-3 font-bold text-slate-900">Read every subject outline</h3>
          <p className="mt-2 text-[13px] leading-6 text-slate-600">Browse compulsory and optional syllabus sections directly on the website, including subject-specific chapters, authors and topic headings.</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <CalendarDays className="h-6 w-6 text-emerald-800" aria-hidden="true"/>
          <h3 className="mt-3 font-bold text-slate-900">Build your daily PMS plan</h3>
          <p className="mt-2 text-[13px] leading-6 text-slate-600">Choose one, two or three concurrent subjects, set available hours and rest days, and preview chapter assignments before saving them.</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <CheckCircle2 className="h-6 w-6 text-emerald-800" aria-hidden="true"/>
          <h3 className="mt-3 font-bold text-slate-900">Make notes and revise</h3>
          <p className="mt-2 text-[13px] leading-6 text-slate-600">Study using your own materials or copy a topic-specific analytical notes command. Mark chapters complete yourself and schedule follow-up revision.</p>
        </article>
      </div>
    </section>

    <section id="pms-syllabus" aria-labelledby="pms-syllabus-title" className="mt-12 scroll-mt-20">
      <h2 id="pms-syllabus-title" className="font-[Georgia,serif] text-2xl font-semibold text-slate-900">Updated Punjab PMS syllabus — compulsory and optional subjects</h2>
      <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-700">
        Open a subject to read its syllabus sections and topics in a searchable text format. These guides are based on the supplied revised PPSC subject outlines; official commission notifications and original syllabus documents remain the final authority for examination rules and amendments.
      </p>
      <label className="mt-5 flex max-w-xl items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-emerald-800">
        <Search size={18} aria-hidden="true"/>
        <span className="sr-only">Search PMS subjects and syllabus topics</span>
        <input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search PMS subjects or syllabus topics" className="w-full border-none bg-transparent text-sm text-slate-900 outline-none" />
      </label>
      <div className="mt-7">
        <h3 className="text-lg font-bold text-slate-900">Compulsory papers ({filtered.compulsory.length})</h3>
        <p className="mt-1 text-[12px] text-slate-600">The revised catalogue retains separate syllabus entries for English, Urdu, Pakistan Studies and other compulsory papers.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.compulsory.map(s => <SubjectCard subject={s} key={s.id}/>)}</div>
      </div>
      <div className="mt-9">
        <h3 className="text-lg font-bold text-slate-900">Optional subjects ({filtered.optional.length})</h3>
        <p className="mt-1 text-[12px] text-slate-600">The revised scheme lists 30 optional subjects. Select your eligible optional paper according to the applicable PPSC rules.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.optional.map(s => <SubjectCard subject={s} key={s.id}/>)}</div>
      </div>
      {filtered.compulsory.length + filtered.optional.length === 0 &&
        <p role="status" className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">No matching subjects. Try another topic or subject name.</p>}
    </section>

    <section aria-labelledby="pms-preparation-questions" className="mt-12 rounded-2xl border border-slate-200 bg-white px-5 py-7 sm:px-8">
      <h2 id="pms-preparation-questions" className="font-[Georgia,serif] text-2xl font-semibold text-slate-900">Questions about free PMS preparation</h2>
      <div className="mt-4 divide-y divide-slate-200">
        {[
          ['Is PMS Vista free to use?', 'Yes. You can browse these PMS syllabus pages without an account. Creating a free account lets you save a personal study schedule, chapter completion and revisions; payment is not required.'],
          ['Does PMS Vista cover the updated Punjab PMS syllabus?', 'The public library contains 40 subject entries from the revised syllabus collection: ten compulsory syllabus entries and thirty optional choices. Each subject guide preserves the headings and topics of its source transcription.'],
          ['Can I prepare for PMS without buying notes?', 'PMS Vista helps you organize independent study. For each chapter you can use your own resources or copy a detailed notes command to prepare explanations and analytical material. Verify citations, legislation and current facts before relying on generated notes.'],
          ['How are English Essay and Précis prepared?', 'Inside Vista Mentor, English Essay connects to Essay Themes 2027 and English Précis connects to the existing Précis Guide. The English papers remain separate in the syllabus.'],
          ['How should I check examination rules and dates?', 'Refer to the current Punjab Public Service Commission advertisement, instructions and downloadable syllabus. This independent learning website does not set eligibility requirements, dates or examination policy.'],
        ].map(([question,answer]) => <details key={question} className="group py-4">
          <summary className="cursor-pointer text-[15px] font-bold text-slate-900">{question}</summary>
          <p className="mt-2 max-w-4xl text-[13px] leading-7 text-slate-700">{answer}</p>
        </details>)}
      </div>
    </section>

    <section className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-7 sm:px-8">
      <div className="max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Vista Mentor</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Begin your free PMS preparation today</h2>
        <p className="mt-2 text-[13px] leading-6 text-slate-700">Select a subject, set your target and prepare the revised PMS syllabus chapter by chapter. Your progress stays yours.</p>
      </div>
      <Link to="/account/tasks?exam=pms-punjab&view=syllabus" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-900 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"><GraduationCap size={18}/> Open PMS Vista <ArrowRight size={17}/></Link>
    </section>
    <p className="mt-6 text-[12px] leading-6 text-slate-500">Independent educational service. PMS Vista is not affiliated with PPSC. Consult <a href="https://www.ppsc.gop.pk/" rel="noopener noreferrer" target="_blank" className="font-semibold text-emerald-800 underline">the official Punjab Public Service Commission website</a> for authoritative examination notices, syllabus revisions and eligibility.</p>
  </main>
}
