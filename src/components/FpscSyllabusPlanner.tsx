import { useEffect, useMemo, useState } from 'react'
import {
  CalendarPlus, CheckSquare2, ChevronRight, Copy, ExternalLink,
  FileText, Loader2, Search, Square, X,
} from 'lucide-react'
import ScheduledSyllabusBoard from '@/components/ScheduledSyllabusBoard'
import {
  addStudyScheduleTasks, getState, setSyllabusItemStatus,
  type SyllabusItemStatus,
} from '@/lib/store'

interface FpscSyllabusSection { title: string; items: string[] }
interface FpscSyllabusSubject {
  slug: string
  name: string
  designation: 'compulsory' | 'optional'
  group: number | null
  marks: number
  pages: [number, number]
  sections: FpscSyllabusSection[]
  scanPages?: string[]
}
interface FpscSyllabusData {
  source: { title: string; publisher: string; updated: string; url: string }
  subjects: FpscSyllabusSubject[]
}
interface SyllabusTopic {
  id: string
  subjectSlug: string
  subject: string
  paper: string
  section: string
  topic: string
}
type SubjectView = 'all' | 'compulsory' | 'optional'
type ScheduleMode = 'today' | 'tomorrow' | 'specific' | 'this-week' | 'custom-week'

const statusLabel: Record<SyllabusItemStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(value: string, amount: number) {
  const [year, month, day] = value.split('-').map(Number)
  return dateKey(new Date(year, month - 1, day + amount, 12))
}

function mondayOfCurrentWeek() {
  const now = new Date()
  const offset = now.getDay() === 0 ? -6 : 1 - now.getDay()
  return dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12))
}

function cleanOfficialText(value: string) {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim()
}

function paperFromTitle(title: string, current: string) {
  const match = title.match(/\bPaper\s+(I{1,3}|IV|V|One|Two|1|2)\b/i)
  return match ? `Paper ${match[1]}` : current
}

function flattenSubject(subject: FpscSyllabusSubject): SyllabusTopic[] {
  let paper = subject.marks === 200 ? 'Paper I & II' : 'Single Paper'
  return subject.sections.flatMap((section, sectionIndex) => {
    paper = paperFromTitle(section.title, paper)
    return section.items.map((item, itemIndex) => ({
      id: `${subject.slug}:${sectionIndex}:${itemIndex}`,
      subjectSlug: subject.slug,
      subject: subject.name,
      paper,
      section: cleanOfficialText(section.title),
      topic: cleanOfficialText(item),
    }))
  })
}

export default function FpscSyllabusPlanner() {
  const [data, setData] = useState<FpscSyllabusData | null>(null)
  const [selectedSlug, setSelectedSlug] = useState('')
  const [view, setView] = useState<SubjectView>('all')
  const [query, setQuery] = useState('')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [statuses, setStatuses] = useState(() => getState().syllabusItemStatuses ?? {})
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('today')
  const [specificDate, setSpecificDate] = useState(dateKey())
  const [weekStart, setWeekStart] = useState(mondayOfCurrentWeek())
  const [studyTime, setStudyTime] = useState('')
  const [minutes, setMinutes] = useState(45)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [boardVersion, setBoardVersion] = useState(0)

  useEffect(() => {
    fetch('/fpsc-syllabus.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Syllabus returned ${response.status}`)
        return response.json() as Promise<FpscSyllabusData>
      })
      .then((value) => {
        setData(value)
        const requested = new URLSearchParams(window.location.search).get('subject')
        setSelectedSlug(value.subjects.some((subject) => subject.slug === requested) ? requested! : value.subjects[0]?.slug ?? '')
      })
      .catch(() => setError('The official syllabus hierarchy could not be loaded.'))
  }, [])

  const allTopics = useMemo(() => data?.subjects.flatMap(flattenSubject) ?? [], [data])
  const visibleSubjects = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return data?.subjects.filter((subject) => {
      if (view !== 'all' && subject.designation !== view) return false
      if (!needle) return true
      const haystack = [subject.name, ...subject.sections.flatMap((section) => [section.title, ...section.items])].join(' ').toLocaleLowerCase()
      return haystack.includes(needle)
    }) ?? []
  }, [data, query, view])
  const selected = visibleSubjects.find((subject) => subject.slug === selectedSlug)
    ?? visibleSubjects[0]
    ?? null
  const selectedTopics = useMemo(() => selected ? flattenSubject(selected) : [], [selected])
  const displayedSections = useMemo(() => {
    if (!selected) return []
    const needle = query.trim().toLocaleLowerCase()
    if (!needle || selected.name.toLocaleLowerCase().includes(needle)) {
      return selected.sections.map((section, sectionIndex) => ({ section, sectionIndex }))
    }
    return selected.sections.flatMap((section, sectionIndex) => {
      const sectionMatch = section.title.toLocaleLowerCase().includes(needle)
      const items = sectionMatch ? section.items : section.items.filter((item) => item.toLocaleLowerCase().includes(needle))
      return items.length ? [{ section: { ...section, items }, sectionIndex }] : []
    })
  }, [query, selected])
  const checkedTopics = allTopics.filter((topic) => checked.has(topic.id))
  const subjectCompleted = selectedTopics.filter((topic) => statuses[topic.id] === 'completed').length
  const overallCompleted = allTopics.filter((topic) => statuses[topic.id] === 'completed').length
  const subjectPercent = selectedTopics.length ? Math.round((subjectCompleted / selectedTopics.length) * 100) : 0
  const overallPercent = allTopics.length ? Math.round((overallCompleted / allTopics.length) * 100) : 0

  function setStatus(topicId: string, status: SyllabusItemStatus) {
    setSyllabusItemStatus(topicId, status)
    setStatuses(getState().syllabusItemStatuses ?? {})
  }

  function toggleChecked(ids: string[]) {
    setChecked((current) => {
      const next = new Set(current)
      const shouldAdd = ids.some((id) => !next.has(id))
      ids.forEach((id) => shouldAdd ? next.add(id) : next.delete(id))
      return next
    })
  }

  async function copySelected() {
    const rows = checkedTopics.length ? checkedTopics : selectedTopics
    const text = rows.map((topic) => `${topic.subject} → ${topic.paper} → ${topic.section} → ${topic.topic}`).join('\n')
    await navigator.clipboard.writeText(text || 'No syllabus topic selected.')
    setMessage(`${rows.length} syllabus topic${rows.length === 1 ? '' : 's'} copied`)
    window.setTimeout(() => setMessage(''), 1800)
  }

  function openSchedule(topics?: SyllabusTopic[]) {
    if (topics?.length) setChecked(new Set(topics.map((topic) => topic.id)))
    if (!topics?.length && !checked.size) setChecked(new Set(selectedTopics.map((topic) => topic.id)))
    setScheduleOpen(true)
  }

  function schedule() {
    const rows = allTopics.filter((topic) => checked.has(topic.id))
    if (!rows.length) return
    const today = dateKey()
    let dates: string[] = []
    if (scheduleMode === 'today') dates = [today]
    if (scheduleMode === 'tomorrow') dates = [addDays(today, 1)]
    if (scheduleMode === 'specific') dates = [specificDate]
    if (scheduleMode === 'this-week') {
      const remaining = Math.max(1, 7 - (new Date().getDay() || 7) + 1)
      dates = Array.from({ length: remaining }, (_, index) => addDays(today, index))
    }
    if (scheduleMode === 'custom-week') dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
    const added = addStudyScheduleTasks(rows.map((topic, index) => ({
      syllabusItemId: topic.id,
      subject: topic.subject,
      paper: topic.paper,
      section: topic.section,
      topic: topic.topic,
      date: dates[index % dates.length],
      time: studyTime || undefined,
      minutes,
    })))
    setStatuses(getState().syllabusItemStatuses ?? {})
    setScheduleOpen(false)
    setChecked(new Set())
    setBoardVersion((value) => value + 1)
    setMessage(`${added.length} topic${added.length === 1 ? '' : 's'} added to the saved planner`)
    window.setTimeout(() => setMessage(''), 2200)
  }

  return (
    <section aria-labelledby="fpsc-syllabus-planner-title">
      <div className="rounded-2xl bg-pine p-5 text-white sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-amber-300">Official FPSC syllabus · connected planner</p>
            <h2 id="fpsc-syllabus-planner-title" className="mt-2 font-display text-2xl font-bold sm:text-3xl">Select a topic. Schedule it. Finish it. Track it.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-emerald-100">The official subject hierarchy stays linked to every saved planner task, so completing a task updates syllabus progress automatically.</p>
          </div>
          <div className="grid min-w-[15rem] grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-white/10 p-3"><strong className="block text-xl">{overallPercent}%</strong><span className="text-[10px] text-emerald-100">Overall complete</span></div>
            <div className="rounded-xl bg-white/10 p-3"><strong className="block text-xl">{allTopics.length.toLocaleString()}</strong><span className="text-[10px] text-emerald-100">Official topic lines</span></div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-amber-300 transition-[width]" style={{ width: `${overallPercent}%` }} /></div>
      </div>

      {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900">{message}</p>}
      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</p>}
      {!data && !error && <div className="mt-4 grid place-items-center rounded-xl border bg-white py-14"><Loader2 className="h-6 w-6 animate-spin text-pine" /></div>}

      {data && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="rounded-xl border bg-white p-3 lg:sticky lg:top-24 lg:self-start" aria-label="FPSC syllabus subjects">
            <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Search the complete FPSC syllabus</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subject, chapter or keyword…" className="h-11 w-full rounded-lg border pl-9 pr-3 text-sm" /></label>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">{(['all', 'compulsory', 'optional'] as const).map((value) => <button key={value} type="button" onClick={() => setView(value)} className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${view === value ? 'bg-pine text-white' : 'bg-secondary text-slate-600'}`}>{value === 'all' ? 'All subjects' : value === 'compulsory' ? 'Compulsory' : 'Optional'}</button>)}</div>
            <select value={selected?.slug ?? ''} onChange={(event) => setSelectedSlug(event.target.value)} className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm lg:hidden" aria-label="Choose FPSC syllabus subject">{visibleSubjects.map((subject) => <option key={subject.slug} value={subject.slug}>{subject.name}</option>)}</select>
            <div className="mt-2 hidden max-h-[38rem] space-y-1 overflow-y-auto pr-1 lg:block">{visibleSubjects.map((subject) => {
              const topics = flattenSubject(subject)
              const done = topics.filter((topic) => statuses[topic.id] === 'completed').length
              const percent = topics.length ? Math.round((done / topics.length) * 100) : 0
              return <button key={subject.slug} type="button" onClick={() => setSelectedSlug(subject.slug)} className={`w-full rounded-lg px-3 py-2.5 text-left ${selected?.slug === subject.slug ? 'bg-emerald-50 text-emerald-950' : 'hover:bg-secondary/60'}`}><span className="block text-xs font-bold">{subject.name}</span><span className="mt-0.5 flex justify-between text-[10px] text-muted-foreground"><span>{subject.designation === 'optional' ? `Group ${subject.group} · ` : ''}{subject.marks} marks</span><span>{percent}%</span></span></button>
            })}</div>
          </aside>

          <div className="min-w-0 space-y-4">
            {selected && <article className="rounded-xl border bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">{selected.designation === 'optional' ? `Optional Group ${selected.group}` : 'Compulsory'} · {selected.marks} marks · PDF pages {selected.pages[0]}–{selected.pages[1]}</p><h3 className="mt-1 font-display text-2xl font-bold text-pine">{selected.name}</h3><p className="mt-1 text-xs text-muted-foreground">{selected.sections.length} official sections · {subjectCompleted} of {selectedTopics.length} topics completed</p></div>
                <div className="flex flex-wrap gap-2"><button type="button" onClick={() => toggleChecked(selectedTopics.map((topic) => topic.id))} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold text-pine">{selectedTopics.length && selectedTopics.every((topic) => checked.has(topic.id)) ? <CheckSquare2 className="h-4 w-4" /> : <Square className="h-4 w-4" />} Select subject</button><button type="button" onClick={copySelected} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold text-pine"><Copy className="h-4 w-4" /> Copy selected</button><button type="button" onClick={() => openSchedule()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-pine px-3 text-xs font-bold text-white"><CalendarPlus className="h-4 w-4" /> Add to Schedule</button></div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-emerald-700" style={{ width: `${subjectPercent}%` }} /></div>

              {selected.scanPages?.length ? <div className="mt-5"><p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">This paper is printed in a regional script in the official source. The exact FPSC pages are preserved below; no text has been guessed.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{selected.scanPages.map((page) => <a key={page} href={page} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border bg-white"><img src={page} alt={`${selected.name} official syllabus page`} className="h-auto w-full" /></a>)}</div></div> : null}

              <div className="mt-5 space-y-2">{displayedSections.map(({ section, sectionIndex }) => {
                const displayedItems = new Set(section.items.map(cleanOfficialText))
                const sectionTopics = selectedTopics.filter((topic) => topic.id.startsWith(`${selected.slug}:${sectionIndex}:`) && displayedItems.has(topic.topic))
                const key = `${selected.slug}:${sectionIndex}`
                const open = openSections[key] ?? (sectionIndex === 0 || Boolean(query.trim()))
                return <section key={key} className="overflow-hidden rounded-lg border"><div className="flex items-stretch"><button type="button" onClick={() => setOpenSections((current) => ({ ...current, [key]: !open }))} aria-expanded={open} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-3 text-left"><ChevronRight className={`h-4 w-4 shrink-0 text-emerald-700 transition-transform ${open ? 'rotate-90' : ''}`} /><span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-700">{sectionTopics[0]?.paper ?? 'Official heading'}</span><span className="block text-sm font-bold leading-snug text-pine">{section.title}</span></span></button>{sectionTopics.length > 0 && <button type="button" onClick={() => toggleChecked(sectionTopics.map((topic) => topic.id))} className="grid w-12 shrink-0 place-items-center border-l text-emerald-800 hover:bg-emerald-50" aria-label={`Select ${section.title}`}>{sectionTopics.every((topic) => checked.has(topic.id)) ? <CheckSquare2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}</button>}</div>{open && <div className="space-y-2 border-t bg-secondary/20 p-3">{sectionTopics.length ? sectionTopics.map((topic) => {
                  const status = statuses[topic.id] ?? 'not-started'
                  return <div key={topic.id} className={`grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-[1.5rem_minmax(0,1fr)_8.5rem_auto] sm:items-start ${checked.has(topic.id) ? 'border-emerald-500 ring-1 ring-emerald-500/20' : ''}`}><input type="checkbox" checked={checked.has(topic.id)} onChange={() => toggleChecked([topic.id])} className="mt-1 h-4 w-4 accent-emerald-700" aria-label={`Select ${topic.topic}`} /><p className="text-xs leading-relaxed text-foreground/85">{topic.topic}</p><select value={status} onChange={(event) => setStatus(topic.id, event.target.value as SyllabusItemStatus)} className="h-9 rounded-md border bg-white px-2 text-[10px] font-bold text-slate-700" aria-label={`Progress for ${topic.topic}`}>{(Object.keys(statusLabel) as SyllabusItemStatus[]).map((value) => <option key={value} value={value}>{statusLabel[value]}</option>)}</select><button type="button" onClick={() => openSchedule([topic])} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border px-2 text-[10px] font-bold text-emerald-800 hover:bg-emerald-50"><CalendarPlus className="h-3.5 w-3.5" /> Add</button></div>
                }) : <p className="rounded-lg border border-dashed bg-white p-4 text-xs text-muted-foreground">The official PDF provides this heading without a separate machine-readable topic line.</p>}</div>}</section>
              })}</div>
              <a href={data.source.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 underline underline-offset-2">Open the supplied official FPSC PDF <ExternalLink className="h-3.5 w-3.5" /></a>
            </article>}

            {scheduleOpen && <section className="rounded-xl border-2 border-emerald-600 bg-white p-4 shadow-lg" aria-label="Add selected syllabus topics to schedule"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">{checkedTopics.length} selected</p><h3 className="mt-1 font-display text-xl font-bold text-pine">Add to Daily/Weekly Schedule</h3></div><button type="button" onClick={() => setScheduleOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border" aria-label="Close scheduling options"><X className="h-4 w-4" /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-bold text-pine">When<select value={scheduleMode} onChange={(event) => setScheduleMode(event.target.value as ScheduleMode)} className="mt-1 h-11 w-full rounded-lg border bg-white px-3 text-sm font-normal text-foreground"><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="specific">Specific Date</option><option value="this-week">This Week</option><option value="custom-week">Custom Week</option></select></label>{scheduleMode === 'specific' && <label className="text-xs font-bold text-pine">Date<input type="date" min={dateKey()} value={specificDate} onChange={(event) => setSpecificDate(event.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3 text-sm font-normal" /></label>}{scheduleMode === 'custom-week' && <label className="text-xs font-bold text-pine">Week starts<input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3 text-sm font-normal" /></label>}<label className="text-xs font-bold text-pine">Study time (optional)<input type="time" value={studyTime} onChange={(event) => setStudyTime(event.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3 text-sm font-normal" /></label><label className="text-xs font-bold text-pine">Minutes per topic<input type="number" min={5} max={600} step={5} value={minutes} onChange={(event) => setMinutes(Math.max(5, Number(event.target.value) || 45))} className="mt-1 h-11 w-full rounded-lg border px-3 text-sm font-normal" /></label></div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Week choices distribute selected topics across available days. You can move unfinished work to a new date in the saved planner.</p><button type="button" onClick={schedule} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-pine px-4 text-sm font-bold text-white"><CalendarPlus className="h-4 w-4" /> Save planner tasks</button></section>}
          </div>
        </div>
      )}

      <div className="mt-5" key={boardVersion}><ScheduledSyllabusBoard /></div>
      <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-muted-foreground"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Official hierarchy source: {data?.source.publisher ?? 'Federal Public Service Commission'}. Text is retained from the supplied syllabus; scanned regional-language pages are shown intact where reliable searchable extraction is unavailable.</p>
    </section>
  )
}
