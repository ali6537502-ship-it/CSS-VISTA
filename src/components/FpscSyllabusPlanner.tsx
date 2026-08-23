import { useEffect, useMemo, useState } from 'react'
import {
  BookCopy, CalendarDays, Check, ChevronDown, ClipboardPaste, Copy, Loader2,
  Plus, Search, Trash2,
} from 'lucide-react'
import PrintMenu from '@/components/PrintMenu'

interface FpscSyllabusSection {
  title: string
  items: string[]
}

interface FpscSyllabusSubject {
  slug: string
  name: string
  designation: 'compulsory' | 'optional'
  group: number | null
  marks: number
  pages: [number, number]
  sections: FpscSyllabusSection[]
}

interface FpscSyllabusData {
  source: { title: string; publisher: string; updated: string; url: string }
  subjects: FpscSyllabusSubject[]
}

interface PlannedTopic {
  id: string
  subject: string
  text: string
  dueDate: string
  completed: boolean
}

type SubjectView = 'all' | 'compulsory' | 'optional'

const STORAGE_KEY = 'cssvista:tool:fpsc-syllabus-plan'

function cleanText(value: string) {
  return value
    .normalize('NFKC')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\b(enoug h|t opic|moder ate|s entence|Rotati on|Humidi ty|Gl obal|poll utants|Textu re|Fun damentals|Mo bile|pro cess|cons tructs)\b/gi, (match) => match.replace(/\s/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
}

function sectionLines(section: FpscSyllabusSection) {
  const raw = section.items.map(cleanText).filter(Boolean)
  if (raw.length <= 1) return raw
  // The source PDF extractor sometimes splits one sentence across several
  // physical lines. Rejoin those wraps while preserving genuine short lists.
  if (raw.every((item) => item.length < 90 && !/[,;:]$/.test(item))) return raw
  const joined: string[] = []
  let buffer = ''
  raw.forEach((item) => {
    const newSentence = buffer
      && /^[A-Z]/.test(item)
      && !/[,;:.!?-]$/.test(buffer)
      && !/\b(?:a|an|and|as|at|by|for|from|in|of|on|or|the|to|with)$/i.test(buffer)
    buffer = `${buffer}${newSentence ? '. ' : buffer ? ' ' : ''}${item}`.trim()
    if (/[.!?]$/.test(item)) {
      joined.push(buffer)
      buffer = ''
    }
  })
  if (buffer) joined.push(buffer)
  return joined
}

function subjectText(subject: FpscSyllabusSubject) {
  return [
    `${subject.name} — ${subject.marks} marks`,
    subject.designation === 'optional' ? `Optional Group ${subject.group}` : 'Compulsory subject',
    '',
    ...subject.sections.flatMap((section) => [
      section.title,
      ...sectionLines(section).map((item) => `• ${item}`),
      '',
    ]),
  ].join('\n').trim()
}

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function loadPlan(): PlannedTopic[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export default function FpscSyllabusPlanner() {
  const [data, setData] = useState<FpscSyllabusData | null>(null)
  const [selectedSlug, setSelectedSlug] = useState('')
  const [view, setView] = useState<SubjectView>('compulsory')
  const [query, setQuery] = useState('')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [plan, setPlan] = useState<PlannedTopic[]>(loadPlan)
  const [pastedText, setPastedText] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/fpsc-syllabus.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Syllabus returned ${response.status}`)
        return response.json() as Promise<FpscSyllabusData>
      })
      .then((value) => {
        setData(value)
        setSelectedSlug(value.subjects[0]?.slug ?? '')
      })
      .catch(() => setError('The official syllabus hierarchy could not be loaded.'))
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)) } catch { /* storage unavailable */ }
  }, [plan])

  const subjects = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return data?.subjects.filter((subject) => {
      if (view !== 'all' && subject.designation !== view) return false
      return !needle || `${subject.name} group ${subject.group ?? ''}`.toLocaleLowerCase().includes(needle)
    }) ?? []
  }, [data, query, view])

  const selected = data?.subjects.find((subject) => subject.slug === selectedSlug) ?? subjects[0] ?? null
  const completed = plan.filter((item) => item.completed).length
  const remaining = plan.length - completed

  function addRows(subject: FpscSyllabusSubject, lines: string[]) {
    const existing = new Set(plan.map((item) => `${item.subject}|${cleanText(item.text).toLocaleLowerCase()}`))
    const additions = lines
      .map(cleanText)
      .filter((line) => line.length > 2 && !existing.has(`${subject.name}|${line.toLocaleLowerCase()}`))
      .map((text) => ({ id: uid(), subject: subject.name, text, dueDate: '', completed: false }))
    if (additions.length) setPlan((current) => [...current, ...additions])
  }

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopyMessage(message)
      window.setTimeout(() => setCopyMessage(''), 1800)
    } catch {
      setCopyMessage('Copy was blocked by the browser')
    }
  }

  function addPastedTopics() {
    const lines = pastedText.split(/\r?\n/).map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean)
    if (!lines.length) return
    const subjectName = selected?.name || 'Custom syllabus'
    const existing = new Set(plan.map((item) => `${item.subject}|${cleanText(item.text).toLocaleLowerCase()}`))
    const additions = lines
      .filter((line) => !existing.has(`${subjectName}|${cleanText(line).toLocaleLowerCase()}`))
      .map((text) => ({ id: uid(), subject: subjectName, text: cleanText(text), dueDate: '', completed: false }))
    setPlan((current) => [...current, ...additions])
    setPastedText('')
  }

  const printablePlan = plan.map((item, index) => `${index + 1}. [${item.completed ? '✓' : ' '}] ${item.subject}${item.dueDate ? ` — ${item.dueDate}` : ''}\n   ${item.text}`).join('\n')

  return (
    <section aria-labelledby="fpsc-syllabus-planner-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-amber-700">Official FPSC hierarchy</p>
          <h2 id="fpsc-syllabus-planner-title" className="mt-1 font-display text-xl font-bold text-pine">Plan the complete CSS syllabus</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Browse compulsory papers and all seven optional groups, copy the official wording, paste your own topic list, set dates and tick each unit as you complete it.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selected && <button type="button" onClick={() => copy(subjectText(selected), `${selected.name} copied`)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold text-pine hover:bg-secondary"><Copy className="h-4 w-4" /> Copy subject</button>}
          <PrintMenu answersAvailable={false} label="Print syllabus plan" targetSelector=".fpsc-syllabus-print-area" />
        </div>
      </div>
      {copyMessage && <p role="status" className="mt-2 text-xs font-semibold text-emerald-800">{copyMessage}</p>}

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</p>}
      {!data && !error && <div className="mt-4 grid place-items-center rounded-xl border bg-white py-14"><Loader2 className="h-6 w-6 animate-spin text-pine" /></div>}

      {data && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="rounded-xl border bg-white p-3 lg:sticky lg:top-24 lg:self-start" aria-label="FPSC syllabus subjects">
            <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Search syllabus subjects</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subject…" className="h-10 w-full rounded-lg border pl-9 pr-3 text-sm" /></label>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">{(['all', 'compulsory', 'optional'] as const).map((value) => <button key={value} type="button" onClick={() => setView(value)} className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${view === value ? 'bg-pine text-white' : 'bg-secondary text-slate-600'}`}>{value === 'all' ? 'All' : value === 'compulsory' ? 'Compulsory' : 'Optional'}</button>)}</div>
            <select value={selected?.slug ?? ''} onChange={(event) => setSelectedSlug(event.target.value)} className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm lg:hidden" aria-label="Choose FPSC syllabus subject">
              {subjects.map((subject) => <option key={subject.slug} value={subject.slug}>{subject.name}</option>)}
            </select>
            <div className="mt-2 hidden max-h-[33rem] space-y-1 overflow-y-auto pr-1 lg:block">
              {subjects.map((subject) => <button key={subject.slug} type="button" onClick={() => setSelectedSlug(subject.slug)} className={`w-full rounded-lg px-3 py-2.5 text-left ${selected?.slug === subject.slug ? 'bg-emerald-50 text-emerald-950' : 'hover:bg-secondary/60'}`}><span className="block text-xs font-bold">{subject.name}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{subject.designation === 'optional' ? `Group ${subject.group} · ` : ''}{subject.marks} marks</span></button>)}
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            {selected && (
              <article className="rounded-xl border bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">{selected.designation === 'optional' ? `Optional Group ${selected.group}` : 'Compulsory'} · {selected.marks} marks · FPSC pages {selected.pages[0]}–{selected.pages[1]}</p><h3 className="mt-1 font-display text-xl font-bold text-pine">{selected.name}</h3><p className="mt-1 text-xs text-muted-foreground">{selected.sections.length} official syllabus sections</p></div>
                  <button type="button" onClick={() => addRows(selected, selected.sections.flatMap(sectionLines))} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-pine px-3 text-xs font-bold text-white hover:bg-emerald-900"><BookCopy className="h-4 w-4" /> Add whole subject</button>
                </div>
                <div className="mt-4 space-y-2">
                  {selected.sections.map((section, sectionIndex) => {
                    const sectionKey = `${selected.slug}-${sectionIndex}`
                    const open = openSections[sectionKey] ?? sectionIndex === 0
                    const lines = sectionLines(section)
                    return <div key={sectionKey} className="overflow-hidden rounded-lg border"><div className="flex items-stretch"><button type="button" onClick={() => setOpenSections((current) => ({ ...current, [sectionKey]: !open }))} aria-expanded={open} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 px-3 text-left text-sm font-bold text-pine"><span className="truncate">{section.title}</span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} /></button><button type="button" onClick={() => addRows(selected, lines)} className="grid w-11 shrink-0 place-items-center border-l text-emerald-800 hover:bg-emerald-50" aria-label={`Add ${section.title} to plan`}><Plus className="h-4 w-4" /></button></div>{open && <ul className="space-y-2 border-t bg-secondary/25 px-4 py-3">{lines.length ? lines.map((item, itemIndex) => <li key={`${sectionKey}-${itemIndex}`} className="text-xs leading-relaxed text-foreground/80">• {item}</li>) : <li className="text-xs text-muted-foreground">This heading contains no separate extracted line in the supplied official hierarchy.</li>}</ul>}</div>
                  })}
                </div>
                <a href={data.source.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-xs font-semibold text-emerald-800 underline underline-offset-2">Open the official FPSC syllabus PDF</a>
              </article>
            )}

            <section className="rounded-xl border bg-white p-4 sm:p-5" aria-label="Paste syllabus topics">
              <div className="flex items-center gap-2"><ClipboardPaste className="h-5 w-5 text-emerald-800" /><h3 className="font-display text-lg font-bold text-pine">Paste your own topics</h3></div>
              <p className="mt-1 text-xs text-muted-foreground">Paste one topic per line. It will be added under the currently selected subject and saved with your other study tools.</p>
              <textarea value={pastedText} onChange={(event) => setPastedText(event.target.value)} rows={4} placeholder="Paste syllabus or personal topics here…" className="mt-3 w-full rounded-lg border p-3 text-sm leading-relaxed" />
              <button type="button" onClick={addPastedTopics} disabled={!pastedText.trim()} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg bg-pine px-4 text-xs font-bold text-white disabled:opacity-45"><Plus className="h-4 w-4" /> Add pasted topics</button>
            </section>
          </div>
        </div>
      )}

      <section className="fpsc-syllabus-print-area mt-5 rounded-xl border bg-white p-4 sm:p-5" aria-label="Personal syllabus plan">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-amber-700">Personal syllabus board</p><h3 className="mt-1 font-display text-xl font-bold text-pine">Topics to do</h3><p className="mt-1 text-xs text-muted-foreground">{plan.length} planned · {completed} completed · {remaining} remaining</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => copy(printablePlan || 'No planned syllabus topics yet.', 'Plan copied')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold text-pine"><Copy className="h-4 w-4" /> Copy plan</button>{completed > 0 && <button type="button" onClick={() => setPlan((current) => current.filter((item) => !item.completed))} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold text-red-700"><Trash2 className="h-4 w-4" /> Clear completed</button>}</div>
        </div>
        {plan.length ? <div className="mt-4 max-h-[38rem] space-y-2 overflow-y-auto pr-1">{plan.map((item, index) => <article key={item.id} className={`grid gap-2 rounded-lg border p-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_9.5rem_2.5rem] sm:items-center ${item.completed ? 'border-emerald-200 bg-emerald-50/60' : ''}`}><button type="button" onClick={() => setPlan((current) => current.map((entry) => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry))} className={`grid h-9 w-9 place-items-center rounded-full border ${item.completed ? 'border-emerald-700 bg-emerald-700 text-white' : 'text-pine'}`} aria-label={item.completed ? `Mark topic ${index + 1} incomplete` : `Mark topic ${index + 1} complete`}>{item.completed ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}</button><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">{item.subject}</p><p className={`mt-0.5 text-sm leading-relaxed ${item.completed ? 'text-emerald-900 line-through' : 'text-foreground'}`}>{item.text}</p></div><label className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 shrink-0" /><span className="sr-only">Target date for topic {index + 1}</span><input type="date" value={item.dueDate} onChange={(event) => setPlan((current) => current.map((entry) => entry.id === item.id ? { ...entry, dueDate: event.target.value } : entry))} className="h-9 min-w-0 w-full rounded-md border bg-white px-2 text-xs" /></label><button type="button" onClick={() => setPlan((current) => current.filter((entry) => entry.id !== item.id))} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-700" aria-label={`Remove topic ${index + 1}`}><Trash2 className="h-4 w-4" /></button></article>)}</div> : <div className="mt-4 rounded-lg border border-dashed bg-secondary/30 px-4 py-8 text-center"><CalendarDays className="mx-auto h-6 w-6 text-emerald-800" /><p className="mt-2 text-sm font-semibold text-pine">No syllabus topics planned yet</p><p className="mt-1 text-xs text-muted-foreground">Add an official section, the whole subject, or paste your own list above.</p></div>}
        <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">Source: {data?.source.publisher ?? 'Federal Public Service Commission'} · official syllabus wording remains authoritative in the linked FPSC PDF.</p>
      </section>
    </section>
  )
}
