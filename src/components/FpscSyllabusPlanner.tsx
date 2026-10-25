import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  CalendarPlus, CheckSquare2, ChevronRight, Copy, ExternalLink,
  FileText, History, Loader2, Search, Square, X,
} from 'lucide-react'
import ScheduledSyllabusBoard from '@/components/ScheduledSyllabusBoard'
import { useAccountSnapshot } from '@/pages/account/shared'
import { validDay } from '@/features/planner/model'
import '@/features/planner/planner.css'
import {
  addStudyScheduleTasks, getState, setSyllabusItemStatus,
  type SyllabusItemStatus,
} from '@/lib/store'
import {
  loadPastPaperAnalysis,
  loadPastPaperAnalysisIndex,
  type PastPaperAnalysisData,
  type PastPaperAnalysisIndex,
} from '@/lib/pastPaperAnalysis'

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
export interface FpscSyllabusData {
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

const hiddenSyllabusSubjects = new Set(['essay'])

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

export default function FpscSyllabusPlanner({ embedded = false, showScheduleBoard = true, initialData }: { embedded?: boolean; showScheduleBoard?: boolean; initialData?: FpscSyllabusData }) {
  const { snapshot } = useAccountSnapshot()
  const [params, setParams] = useSearchParams()
  const requestedUnit = params.get('unit')
  const [data, setData] = useState<FpscSyllabusData | null>(() => initialData ? { ...initialData, subjects: initialData.subjects.filter(subject => !hiddenSyllabusSubjects.has(subject.slug)) } : null)
  const selectedSlug = params.get('subject') || ''
  function setSelectedSlug(slug: string) { const next = new URLSearchParams(params); next.set('subject', slug); setParams(next, { preventScrollReset: true }) }
  const [view, setView] = useState<SubjectView>('all')
  const [query, setQuery] = useState('')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [statuses, setStatuses] = useState(() => getState().syllabusItemStatuses ?? {})
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const scheduleBox = useRef<HTMLElement>(null)
  const scheduleTrigger = useRef<HTMLElement | null>(null)
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('today')
  const [specificDate, setSpecificDate] = useState(dateKey())
  const [weekStart, setWeekStart] = useState(mondayOfCurrentWeek())
  const [studyTime, setStudyTime] = useState('')
  const [minutes, setMinutes] = useState(45)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [boardVersion, setBoardVersion] = useState(0)
  const [analysisIndex, setAnalysisIndex] = useState<PastPaperAnalysisIndex | null>(null)
  const [analysisData, setAnalysisData] = useState<PastPaperAnalysisData | null>(null)
  const [evidenceKey, setEvidenceKey] = useState('')
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoadError('')
    fetch('/fpsc-syllabus.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Syllabus returned ${response.status}`)
        return response.json() as Promise<FpscSyllabusData>
      })
      .then((value) => {
        if (controller.signal.aborted) return
        const visibleData = {
          ...value,
          subjects: value.subjects.filter((subject) => !hiddenSyllabusSubjects.has(subject.slug)),
        }
        setData(visibleData)
        const parameters = new URLSearchParams(window.location.search)
        const requestedTopic = parameters.get('topic')
        if (requestedTopic) setQuery(requestedTopic)
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError('The official syllabus hierarchy could not be loaded.') })
    loadPastPaperAnalysisIndex().then(setAnalysisIndex).catch(() => undefined)
    return () => controller.abort()
  }, [retry])

  useEffect(() => { setStatuses(snapshot.state.syllabusItemStatuses ?? {}) }, [snapshot.state.syllabusItemStatuses])

  useEffect(() => {
    if (data && requestedUnit?.startsWith(`${selectedSlug}:section:`)) document.getElementById(requestedUnit)?.scrollIntoView({ block: 'center' })
  }, [data, selectedSlug, requestedUnit])

  useEffect(() => {
    if (scheduleOpen) { scheduleBox.current?.scrollIntoView({ block: 'nearest' }); scheduleBox.current?.querySelector<HTMLSelectElement>('select')?.focus({ preventScroll: true }) }
  }, [scheduleOpen])
  function closeSchedule() { setScheduleOpen(false); requestAnimationFrame(() => scheduleTrigger.current?.focus()) }

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
  const requestedMissing = Boolean(data && selectedSlug && !data.subjects.some(subject => subject.slug === selectedSlug))
  const selected = requestedMissing ? null : visibleSubjects.find((subject) => subject.slug === selectedSlug)
    ?? visibleSubjects[0] ?? null
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
  const analysisSubject = analysisIndex?.subjects.find((subject) => subject.slug === selected?.slug) ?? null
  const loadedAnalysisSubject = analysisData?.subjects.find((subject) => subject.slug === selected?.slug) ?? null

  function setStatus(topicId: string, status: SyllabusItemStatus) {
    setSyllabusItemStatus(topicId, status)
    const saved = getState().syllabusItemStatuses ?? {}
    if (saved[topicId] !== status) setError('Topic progress could not be saved. Please try again.')
    else { setError(''); setStatuses(saved) }
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
    try {
      await navigator.clipboard.writeText(text || 'No syllabus topic selected.')
      setMessage(`${rows.length} syllabus topic${rows.length === 1 ? '' : 's'} copied`)
    } catch { setError('Your browser could not copy these topics. Allow clipboard access and try again.') }
    window.setTimeout(() => setMessage(''), 1800)
  }

  function openSchedule(topics?: SyllabusTopic[]) {
    scheduleTrigger.current = document.activeElement as HTMLElement
    if (topics?.length) setChecked(new Set(topics.map((topic) => topic.id)))
    if (!topics?.length && !checked.size) setChecked(new Set(selectedTopics.map((topic) => topic.id)))
    setScheduleOpen(true)
  }

  function schedule() {
    setError('')
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
    if (dates.some(date => !validDay(date)) || !Number.isInteger(minutes) || minutes < 5 || minutes > 600) { setError('Choose a valid schedule date and 5–600 whole minutes per topic.'); return }
    if ((getState().studyScheduleTasks?.length || 0) + rows.length > 3000) { setError('Your saved task limit is reached. Existing tasks have been retained; contact support before adding more.'); return }
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
    const savedTasks = getState().studyScheduleTasks || []
    if (!added.every(task => savedTasks.some(saved => saved.id === task.id))) { setError('Planner tasks could not be saved. Your selections are retained; please try again.'); return }
    setStatuses(getState().syllabusItemStatuses ?? {})
    setScheduleOpen(false)
    setChecked(new Set())
    setBoardVersion((value) => value + 1)
    setMessage(added.length ? `${added.length} topic${added.length === 1 ? '' : 's'} added to the saved planner` : 'These topics are already scheduled for the chosen dates. No duplicates were added.')
    window.setTimeout(() => setMessage(''), 2200)
  }

  function toggleEvidence(key: string) {
    if (evidenceKey === key) {
      setEvidenceKey('')
      return
    }
    setEvidenceKey(key)
    if (analysisData || evidenceLoading) return
    setEvidenceLoading(true)
    setEvidenceError('')
    loadPastPaperAnalysis()
      .then(setAnalysisData)
      .catch(() => setEvidenceError('Past-paper evidence could not be loaded.'))
      .finally(() => setEvidenceLoading(false))
  }

  return (
    <section className={`planner-workspace pl-syllabus ${embedded ? 'pl-syllabus-embedded' : ''}`} aria-labelledby="fpsc-syllabus-planner-title">
      <div className="pl-syllabus-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="pl-kicker">THE SYLLABUS, ONE SESSION AT A TIME</p>
            <h2 id="fpsc-syllabus-planner-title">Turn a topic into a plan.</h2>
            <p className="pl-muted">Browse the source syllabus, track what you have covered and schedule your next session. Manual completion stays separate from assessed performance.</p>
          </div>
          <div className="grid min-w-[15rem] grid-cols-2 gap-2 text-center">
            <div className="pl-catalogue-stat"><strong>{data ? overallCompleted : '—'}</strong><span>Catalogue topic lines checked complete</span></div>
            <div className="pl-catalogue-stat"><strong>{data ? allTopics.length.toLocaleString() : '—'}</strong><span>Topic lines in this catalogue, across all subjects</span></div>
          </div>
        </div>
      </div>

      {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900">{message}</p>}
      {error && <p role="alert" className="pl-error">{error}</p>}
      {loadError && <div role="alert" className="pl-error">{loadError}<button className="pl-secondary" onClick={() => setRetry(value => value + 1)}>Retry syllabus</button></div>}
      {!data && !loadError && <div role="status" className="pl-panel-loading"><Loader2 className="h-6 w-6 animate-spin text-pine" />Loading syllabus topics…</div>}

      {data && (
        <div className="pl-syllabus-browser mt-4 grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="pl-syllabus-subjects rounded-xl border bg-white p-3 lg:sticky lg:top-24 lg:self-start" aria-label="FPSC syllabus subjects">
            <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Search the complete FPSC syllabus</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subject, chapter or keyword…" className="h-11 w-full rounded-lg border pl-9 pr-3 text-sm" /></label>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">{(['all', 'compulsory', 'optional'] as const).map((value) => <button key={value} type="button" onClick={() => setView(value)} className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${view === value ? 'bg-pine text-white' : 'bg-secondary text-slate-600'}`}>{value === 'all' ? 'All subjects' : value === 'compulsory' ? 'Compulsory' : 'Optional'}</button>)}</div>
            <select value={selected?.slug ?? ''} onChange={(event) => setSelectedSlug(event.target.value)} className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm lg:hidden" aria-label="Choose FPSC syllabus subject">{visibleSubjects.map((subject) => <option key={subject.slug} value={subject.slug}>{subject.name}</option>)}</select>
            <div className="mt-2 hidden max-h-[38rem] space-y-1 overflow-y-auto pr-1 lg:block">{visibleSubjects.map((subject) => {
              const topics = flattenSubject(subject)
              const done = topics.filter((topic) => statuses[topic.id] === 'completed').length
              const percent = topics.length ? Math.round((done / topics.length) * 100) : 0
              return <button key={subject.slug} type="button" onClick={() => setSelectedSlug(subject.slug)} className={`w-full rounded-lg px-3 py-2.5 text-left ${selected?.slug === subject.slug ? 'bg-emerald-50 text-emerald-950' : 'hover:bg-secondary/60'}`}><span className="block text-xs font-bold">{subject.name}</span><span className="mt-0.5 flex justify-between text-[10px] text-muted-foreground"><span>{subject.designation === 'optional' ? `Group ${subject.group} · ` : ''}{subject.marks} marks</span><span>{topics.length ? `${percent}%` : 'Detail unavailable'}</span></span></button>
            })}</div>
          </aside>

          <div className="min-w-0 space-y-4">
            {!selected && <div className="pl-empty"><Search size={30}/><h3>{requestedMissing ? 'Syllabus detail unavailable for this subject.' : 'No subjects match this search.'}</h3><p>{requestedMissing ? 'Your subject records are retained. Browse another subject or open the existing subject guide.' : 'Try another keyword or clear the filters.'}</p>{selectedSlug === 'essay' && <Link className="pl-primary" to="/subjects/compulsory/essay">Open English Essay guide</Link>}<button className="pl-secondary" onClick={() => { setQuery(''); setView('all'); setSelectedSlug('') }}>Browse syllabus subjects</button></div>}
            {selected && <article className="pl-syllabus-detail rounded-xl border bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">{selected.designation === 'optional' ? `Optional Group ${selected.group}` : 'Compulsory'} · {selected.marks} marks · PDF pages {selected.pages[0]}–{selected.pages[1]}</p><h3 className="mt-1 font-display text-2xl font-bold text-pine">{selected.name}</h3><p className="mt-1 text-xs text-muted-foreground">{selectedTopics.length ? `${selected.sections.length} source sections · ${subjectCompleted} of ${selectedTopics.length} topic lines completed` : 'Syllabus detail unavailable · use the source pages below'}</p></div>
                <div className="flex flex-wrap gap-2"><button type="button" disabled={!selectedTopics.length} onClick={() => toggleChecked(selectedTopics.map((topic) => topic.id))} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold text-pine">{selectedTopics.length && selectedTopics.every((topic) => checked.has(topic.id)) ? <CheckSquare2 className="h-4 w-4" /> : <Square className="h-4 w-4" />} Select subject</button><button type="button" disabled={!selectedTopics.length && !checkedTopics.length} onClick={copySelected} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold text-pine"><Copy className="h-4 w-4" /> Copy selected</button><button type="button" disabled={!selectedTopics.length && !checkedTopics.length} onClick={() => openSchedule()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-pine px-3 text-xs font-bold text-white"><CalendarPlus className="h-4 w-4" /> Add to Schedule</button></div>
              </div>
              {selectedTopics.length > 0 && <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Source topic lines completed for this subject" aria-valuemin={0} aria-valuemax={selectedTopics.length || 1} aria-valuenow={subjectCompleted}><span className="block h-full rounded-full bg-emerald-700" style={{ width: `${subjectPercent}%` }} /></div>}

              {selected.scanPages?.length ? <div className="mt-5"><p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">This paper is printed in a regional script in the official source. The exact FPSC pages are preserved below; no text has been guessed.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{selected.scanPages.map((page) => <a key={page} href={page} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border bg-white"><img src={page} alt={`${selected.name} official syllabus page`} className="h-auto w-full" /></a>)}</div></div> : null}

              <div className="mt-5 space-y-2">{displayedSections.map(({ section, sectionIndex }) => {
                const displayedItems = new Set(section.items.map(cleanOfficialText))
                const sectionTopics = selectedTopics.filter((topic) => topic.id.startsWith(`${selected.slug}:${sectionIndex}:`) && displayedItems.has(topic.topic))
                const key = `${selected.slug}:${sectionIndex}`
                const open = openSections[key] ?? (sectionIndex === 0 || Boolean(query.trim()) || requestedUnit === `${selected.slug}:section:${sectionIndex}`)
                const compactEvidenceTopics = analysisSubject?.sections.flatMap((item) => item.topics.filter((analysisTopic) => (analysisTopic.syllabusSectionIndex ?? item.syllabusSectionIndex) === sectionIndex)) ?? []
                const evidenceCount = compactEvidenceTopics.reduce((sum, item) => sum + item.questionCount, 0)
                const fullEvidenceTopics = loadedAnalysisSubject?.sections.flatMap((item) => item.topics.filter((analysisTopic) => (analysisTopic.syllabusSectionIndex ?? item.syllabusSectionIndex) === sectionIndex)) ?? []
                const evidenceRows = fullEvidenceTopics.flatMap((analysisTopic) => analysisTopic.questions.map((question) => ({ analysisTopic, question }))).sort((a, b) => b.question.year - a.question.year).slice(0, 8)
                return <section key={key} id={`${selected.slug}:section:${sectionIndex}`} className={`scroll-mt-32 overflow-hidden rounded-lg border ${requestedUnit === `${selected.slug}:section:${sectionIndex}` ? 'border-indigo-400 ring-2 ring-indigo-100' : ''}`}><div className="flex items-stretch"><button type="button" onClick={() => setOpenSections((current) => ({ ...current, [key]: !open }))} aria-expanded={open} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-3 text-left"><ChevronRight className={`h-4 w-4 shrink-0 text-emerald-700 transition-transform ${open ? 'rotate-90' : ''}`} /><span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-700">{sectionTopics[0]?.paper ?? 'Official heading'}</span><span className="block text-sm font-bold leading-snug text-pine">{section.title}</span></span></button>{evidenceCount > 0 && <button type="button" onClick={() => toggleEvidence(key)} className={`flex min-w-14 shrink-0 flex-col items-center justify-center border-l px-2 text-[9px] font-bold ${evidenceKey === key ? 'bg-amber-50 text-amber-900' : 'text-emerald-800 hover:bg-emerald-50'}`} aria-label={`Show ${evidenceCount} past-paper questions for ${section.title}`}><History className="h-3.5 w-3.5" /><span>{evidenceCount}</span></button>}{sectionTopics.length > 0 && <button type="button" onClick={() => toggleChecked(sectionTopics.map((topic) => topic.id))} className="grid w-12 shrink-0 place-items-center border-l text-emerald-800 hover:bg-emerald-50" aria-label={`Select ${section.title}`}>{sectionTopics.every((topic) => checked.has(topic.id)) ? <CheckSquare2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}</button>}</div>{evidenceKey === key && <div className="border-t border-amber-200 bg-amber-50/60 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[9px] font-bold uppercase tracking-wide text-amber-800">Past-paper evidence for this syllabus area</p><p className="mt-0.5 text-xs text-amber-950">{evidenceCount} original questions across {compactEvidenceTopics.length} mapped topic groups</p></div><Link to={`/css-past-paper-analysis?subject=${encodeURIComponent(selected.slug)}&section=${sectionIndex}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-[10px] font-bold text-amber-950">Open complete analysis <ExternalLink className="h-3.5 w-3.5" /></Link></div>{evidenceLoading && <p className="mt-3 flex items-center gap-2 text-xs text-amber-950"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading exact questions…</p>}{evidenceError && <p className="mt-3 text-xs text-red-700">{evidenceError}</p>}{evidenceRows.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{evidenceRows.map(({ analysisTopic, question }) => <article key={question.id} className="rounded-lg border bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700">{question.year} · {question.paper !== 'Single Paper' ? `${question.paper} · ` : ''}{question.number}</p><p className="mt-1 line-clamp-3 text-xs leading-relaxed text-foreground/80">{question.text}</p><Link to={`/css-past-paper-analysis?subject=${encodeURIComponent(selected.slug)}&topic=${encodeURIComponent(analysisTopic.id)}`} className="mt-2 inline-block text-[10px] font-bold text-emerald-800 underline underline-offset-2">{analysisTopic.title}</Link></article>)}</div>}</div>}{open && <div className="space-y-2 border-t bg-secondary/20 p-3">{sectionTopics.length ? sectionTopics.map((topic) => {
                  const status = statuses[topic.id] ?? 'not-started'
                  const itemIndex = Number(topic.id.split(':').at(-1))
                  const itemEvidence = compactEvidenceTopics.filter((item) => item.syllabusItemIndexes.includes(itemIndex))
                  const itemEvidenceCount = itemEvidence.reduce((sum, item) => sum + item.questionCount, 0)
                  return <div key={topic.id} className={`grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-[1.5rem_minmax(0,1fr)_8.5rem_auto] sm:items-start ${checked.has(topic.id) ? 'border-emerald-500 ring-1 ring-emerald-500/20' : ''}`}><input type="checkbox" checked={checked.has(topic.id)} onChange={() => toggleChecked([topic.id])} className="mt-1 h-4 w-4 accent-emerald-700" aria-label={`Select ${topic.topic}`} /><div><p className="text-xs leading-relaxed text-foreground/85">{topic.topic}</p>{itemEvidenceCount > 0 && <Link to={`/css-past-paper-analysis?subject=${encodeURIComponent(selected.slug)}&topic=${encodeURIComponent(itemEvidence[0].id)}`} className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 underline underline-offset-2"><History className="h-3 w-3" /> {itemEvidenceCount} past question{itemEvidenceCount === 1 ? '' : 's'} from this topic</Link>}</div><select value={status} onChange={(event) => setStatus(topic.id, event.target.value as SyllabusItemStatus)} className="h-9 rounded-md border bg-white px-2 text-[10px] font-bold text-slate-700" aria-label={`Progress for ${topic.topic}`}>{(Object.keys(statusLabel) as SyllabusItemStatus[]).map((value) => <option key={value} value={value}>{statusLabel[value]}</option>)}</select><button type="button" onClick={() => openSchedule([topic])} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border px-2 text-[10px] font-bold text-emerald-800 hover:bg-emerald-50"><CalendarPlus className="h-3.5 w-3.5" /> Add</button></div>
                }) : <p className="rounded-lg border border-dashed bg-white p-4 text-xs text-muted-foreground">The official PDF provides this heading without a separate machine-readable topic line.</p>}</div>}</section>
              })}</div>
              <a href={data.source.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 underline underline-offset-2">Open the supplied official FPSC PDF <ExternalLink className="h-3.5 w-3.5" /></a>
            </article>}

            {scheduleOpen && <section ref={scheduleBox} onKeyDown={event => { if (event.key === 'Escape') closeSchedule() }} className="rounded-xl border-2 border-emerald-600 bg-white p-4 shadow-lg" aria-label="Add selected syllabus topics to schedule"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">{checkedTopics.length} selected</p><h3 className="mt-1 font-display text-xl font-bold text-pine">Add to Daily/Weekly Schedule</h3></div><button type="button" onClick={closeSchedule} className="grid h-9 w-9 place-items-center rounded-full border" aria-label="Close scheduling options"><X className="h-4 w-4" /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-bold text-pine">When<select value={scheduleMode} onChange={(event) => setScheduleMode(event.target.value as ScheduleMode)} className="mt-1 h-11 w-full rounded-lg border bg-white px-3 text-sm font-normal text-foreground"><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="specific">Specific Date</option><option value="this-week">This Week</option><option value="custom-week">Custom Week</option></select></label>{scheduleMode === 'specific' && <label className="text-xs font-bold text-pine">Date<input type="date" min={dateKey()} value={specificDate} onChange={(event) => setSpecificDate(event.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3 text-sm font-normal" /></label>}{scheduleMode === 'custom-week' && <label className="text-xs font-bold text-pine">Week starts<input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3 text-sm font-normal" /></label>}<label className="text-xs font-bold text-pine">Study time (optional)<input type="time" value={studyTime} onChange={(event) => setStudyTime(event.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3 text-sm font-normal" /></label><label className="text-xs font-bold text-pine">Minutes per topic<input type="number" min={5} max={600} step={5} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} className="mt-1 h-11 w-full rounded-lg border px-3 text-sm font-normal" /></label></div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Week choices distribute selected topics across available days. You can move unfinished work to a new date in the saved planner.</p><button type="button" onClick={schedule} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-pine px-4 text-sm font-bold text-white"><CalendarPlus className="h-4 w-4" /> Save planner tasks</button></section>}
          </div>
        </div>
      )}

      {showScheduleBoard && <div className="mt-5" key={boardVersion}><ScheduledSyllabusBoard /></div>}
      <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-muted-foreground"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Official hierarchy source: {data?.source.publisher ?? 'Federal Public Service Commission'}. Text is retained from the supplied syllabus; scanned regional-language pages are shown intact where reliable searchable extraction is unavailable.</p>
    </section>
  )
}
