import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Layers3, Loader2, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import PrintMenu from '@/components/PrintMenu'
import { getChecklist, setChecklist } from '@/lib/progress'

interface SyllabusSection { title: string; items: string[] }
interface SyllabusSubject { slug: string; name: string; designation: 'compulsory' | 'optional'; group: number | null; marks: number; pages: [number, number]; sections: SyllabusSection[] }
interface SyllabusData { source: { title: string; publisher: string; updated: string; url: string }; subjects: SyllabusSubject[] }

export default function FpscSyllabus() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedSlug = searchParams.get('subject')
  const [data, setData] = useState<SyllabusData | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'all' | 'compulsory' | 'optional'>('all')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    fetch('/fpsc-syllabus.json')
      .then((response) => { if (!response.ok) throw new Error('Syllabus unavailable'); return response.json() as Promise<SyllabusData> })
      .then(setData)
      .catch(() => setError(true))
  }, [])

  const selected = data?.subjects.find((subject) => subject.slug === selectedSlug) ?? null
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data?.subjects.filter((subject) => {
      if (view !== 'all' && subject.designation !== view) return false
      return !needle || `${subject.name} ${subject.sections.map((section) => `${section.title} ${section.items.join(' ')}`).join(' ')}`.toLowerCase().includes(needle)
    }) ?? []
  }, [data, query, view])

  const items = selected?.sections.flatMap((section) => section.items.map((item) => ({ section: section.title, item }))) ?? []
  const checklist = selected ? getChecklist(`fpsc-syllabus:${selected.slug}`, items.length) : []
  const completed = checklist.filter(Boolean).length

  function toggleItem(index: number) {
    if (!selected) return
    const next = [...checklist]
    next[index] = !next[index]
    setChecklist(`fpsc-syllabus:${selected.slug}`, next)
    setVersion((value) => value + 1)
  }
  void version

  return (
    <div>
      <PageHeader title="FPSC Syllabus & Topic Planner" description="The complete CE-2016-and-onwards subject syllabus, organised into printable paper checklists for preparation tracking." />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {!data && !error && <div className="grid place-items-center py-20"><Loader2 className="h-7 w-7 animate-spin text-pine" /><p className="mt-2 text-sm text-muted-foreground">Loading the FPSC syllabus…</p></div>}
        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">The syllabus file could not be loaded.</p>}

        {data && !selected && <>
          <section className="rounded-2xl bg-pine p-5 text-white sm:p-7"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-amber-300">Official source collection</p><h2 className="mt-2 font-display text-2xl font-bold">{data.source.title}</h2><p className="mt-2 text-sm text-emerald-100">{data.subjects.length} compulsory and optional papers · choose a paper to view, track and print its detailed syllabus.</p><a href={data.source.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-pine">Open FPSC source <ExternalLink className="h-3.5 w-3.5" /></a></section>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2 overflow-x-auto">{(['all', 'compulsory', 'optional'] as const).map((filter) => <button key={filter} type="button" onClick={() => setView(filter)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${view === filter ? 'bg-pine text-white' : 'border bg-white text-pine'}`}>{filter === 'all' ? 'All papers' : filter === 'compulsory' ? 'Compulsory' : 'Optional'}</button>)}</div><label className="relative block sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Search syllabus</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search papers or topics…" className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm" /></label></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visible.map((subject) => <button key={subject.slug} type="button" onClick={() => setSearchParams({ subject: subject.slug })} className="group flex min-h-[86px] items-center gap-3 rounded-xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-sm"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><Layers3 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">{subject.designation === 'optional' ? `Optional · Group ${subject.group}` : 'Compulsory'} · {subject.marks} marks</span><span className="mt-0.5 block text-sm font-bold text-pine">{subject.name}</span><span className="mt-1 block text-[10px] text-muted-foreground">{subject.sections.length} sections · official pages {subject.pages[0]}–{subject.pages[1]}</span></span><ChevronRight className="h-4 w-4 text-emerald-700" /></button>)}</div>
        </>}

        {data && selected && <>
          <button type="button" onClick={() => setSearchParams({})} className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-emerald-800 hover:underline"><ChevronLeft className="h-4 w-4" /> All syllabus papers</button>
          <section className="syllabus-print-area print-area mt-3 rounded-xl border bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-amber-700">{selected.designation === 'optional' ? `Optional Group ${selected.group}` : 'Compulsory'} · {selected.marks} marks</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">{selected.name}</h2><p className="mt-1 text-sm text-muted-foreground">Official FPSC pages {selected.pages[0]}–{selected.pages[1]} · {completed} of {items.length} topics completed</p></div><PrintMenu answersAvailable={false} label="Print syllabus" targetSelector=".syllabus-print-area" /></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-emerald-700 transition-[width] duration-300" style={{ width: `${items.length ? Math.round((completed / items.length) * 100) : 0}%` }} /></div>
            <div className="mt-6 space-y-6">{selected.sections.map((section) => {
              const before = selected.sections.slice(0, selected.sections.indexOf(section)).reduce((sum, current) => sum + current.items.length, 0)
              return <section key={`${section.title}-${before}`}><h3 className="font-display text-lg font-bold text-pine">{section.title}</h3>{section.items.length ? <ul className="mt-3 space-y-2">{section.items.map((item, itemIndex) => { const index = before + itemIndex; return <li key={`${index}-${item}`}><label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-secondary/25 p-3 text-sm leading-relaxed hover:bg-emerald-50/50"><input type="checkbox" checked={checklist[index] ?? false} onChange={() => toggleItem(index)} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span className={checklist[index] ? 'text-muted-foreground line-through' : ''}>{item}</span></label></li>})}</ul> : <p className="mt-2 text-sm text-muted-foreground">Section heading in the official document.</p>}</section>
            })}</div>
            <div className="mt-7 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><p>Checklist progress is included in your study record. For binding requirements, consult the linked FPSC syllabus document.</p></div>
          </section>
        </>}
      </main>
    </div>
  )
}
