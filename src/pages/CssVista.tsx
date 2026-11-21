import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BookOpen, CalendarDays, ClipboardCopy, Search } from 'lucide-react'
import { cssVistaOptionals, cssVistaSearchMatches, cssVistaSourceEntryCount } from '@/data/cssVistaPublic'

export default function CssVista() {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState(0)
  const displayed = useMemo(() => cssVistaOptionals.filter(paper =>
    (!group || paper.group === group) && cssVistaSearchMatches(paper, search)), [search, group])
  const groups = Array.from(new Set(cssVistaOptionals.map(paper => paper.group))).sort((a,b) => a - b)

  return <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
    <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-600">
      <Link to="/" className="hover:underline">Home</Link><span aria-hidden="true"> / </span> CSS Vista
    </nav>
    <header className="overflow-hidden rounded-[28px] border border-emerald-900/15 bg-gradient-to-br from-[#113d2e] via-[#215b43] to-[#36775c] px-5 py-8 text-white sm:px-9 sm:py-11">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-100">CSS Vista · FPSC optional-paper preparation</p>
      <h1 className="mt-3 max-w-4xl font-[Georgia,serif] text-3xl font-semibold leading-tight sm:text-5xl">CSS optional subjects, organized for daily study</h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-7 text-emerald-50">Browse all 45 optional subjects across seven FPSC groups. Open any paper to explore its source-listed sections, copy detailed notes commands beside individual study units, and connect the paper to your personal daily schedule.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/account/tasks?exam=css&view=syllabus" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-50">
          Open CSS Vista Mentor <ArrowRight size={17} aria-hidden="true"/>
        </Link>
        <a href="#css-optional-syllabus" className="inline-flex min-h-11 items-center rounded-xl border border-white/50 px-5 py-3 text-sm font-bold hover:bg-white/10">Browse optional papers</a>
      </div>
      <p className="mt-4 text-xs text-emerald-100">Free syllabus browsing. A student account is needed only to save schedules and completion records.</p>
    </header>

    <section aria-label="CSS optional syllabus coverage" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        [String(cssVistaOptionals.length), 'Optional papers'],
        [String(groups.length), 'FPSC groups'],
        [String(cssVistaOptionals.reduce((n,p) => n+p.sections.length,0)), 'Source-listed sections'],
        [String(cssVistaOptionals.filter(p => p.sections.length).length), 'Papers with transcribed topics'],
      ].map(([value,label]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <strong className="block text-2xl font-bold tabular-nums text-emerald-800">{value}</strong><span className="text-xs text-slate-600">{label}</span>
      </div>)}
    </section>

    <section className="mt-10 grid gap-4 md:grid-cols-3">
      {[
        {Icon:BookOpen,title:'Browse the actual syllabus',body:'Every subject has a dedicated page with the original FPSC sections in order. Study blocks are labelled as preparation units, not invented official headings.'},
        {Icon:ClipboardCopy,title:'Copy individual notes commands',body:'Use a source-grounded command beside a study block or an original syllabus entry; your copied command carries the surrounding section as context.'},
        {Icon:CalendarDays,title:'Prepare day by day',body:'Choose optional papers, set your study hours and priorities, generate a daily timetable and record revisions inside CSS Vista Mentor.'},
      ].map(({Icon,title,body}) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
        <Icon className="h-6 w-6 text-emerald-800" aria-hidden="true"/><h2 className="mt-3 text-base font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      </article>)}
    </section>

    <section id="css-optional-syllabus" className="mt-12 scroll-mt-24">
      <h2 className="font-[Georgia,serif] text-2xl font-semibold">All CSS optional subjects</h2>
      <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
        Select any paper to read its source sections and copy topic-specific study commands. Three regional-language papers have original official scan pages but no reliable text transcription yet; these are clearly identified rather than filled with guessed content.
      </p>
      <label className="mt-5 flex max-w-xl items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3">
        <Search size={18} className="text-emerald-800"/><span className="sr-only">Search subject or syllabus text</span>
        <input value={search} type="search" onChange={event => setSearch(event.target.value)} placeholder="Search optional subjects and syllabus topics" className="w-full bg-transparent text-sm outline-none"/>
      </label>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter by optional group">
        <button type="button" onClick={()=>setGroup(0)} aria-pressed={group===0} className={`min-h-9 rounded-full px-4 text-xs font-semibold ${group===0?'bg-emerald-900 text-white':'border border-slate-300 text-slate-700'}`}>All groups</button>
        {groups.map(n=><button type="button" key={n} onClick={()=>setGroup(n)} aria-pressed={group===n} className={`min-h-9 rounded-full px-4 text-xs font-semibold ${group===n?'bg-emerald-900 text-white':'border border-slate-300 text-slate-700'}`}>Group {n}</button>)}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayed.map(paper => <article key={paper.slug} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Group {paper.group} · {paper.marks} marks</p>
          <h3 className="mt-2 text-lg font-bold leading-snug">{paper.name}</h3>
          <p className="mt-2 flex-1 text-xs leading-6 text-slate-600">
            {paper.sections.length ? `${paper.sections.length} sections · ${cssVistaSourceEntryCount(paper)} source entries` : 'Official syllabus scans available · transcription required'}
          </p>
          {paper.sections.length > 0 && <p className="mt-1 line-clamp-2 text-xs text-slate-500" dir="auto">{paper.sections.slice(0,2).map(s=>s.title).join(' · ')}</p>}
          <Link to={'/css-vista/syllabus/'+paper.slug} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-emerald-800 hover:underline">
            {paper.sections.length?'Explore topics and copy commands':'View official syllabus scans'} <ArrowRight size={16}/>
          </Link>
        </article>)}
      </div>
      {!displayed.length && <p role="status" className="mt-4 rounded-xl bg-slate-50 p-5 text-sm">No subjects match your search.</p>}
    </section>
    <p className="mt-10 text-xs leading-6 text-slate-600">Source: FPSC Revised Syllabus for CE-2016 and onwards. Always confirm the latest official syllabus and subject grouping rules at <a href="https://www.fpsc.gov.pk/" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline">fpsc.gov.pk</a>.</p>
  </main>
}
