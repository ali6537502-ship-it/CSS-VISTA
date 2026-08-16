import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronDown, EyeOff, Plus, Printer, RotateCcw, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { compulsorySubjects, optionalGroups } from '@/data/syllabus'

type IndexSubject = { slug: string; name: string; designation: string; group: number | null; topics: string[] }
type CustomTopic = { id: string; text: string; done: boolean }
type PlannerState = { selected: string[]; hidden: string[]; complete: string[]; custom: Record<string, CustomTopic[]> }
const key = 'cssvista:fpsc-personal-syllabus:v1'
const emptyState: PlannerState = { selected: [], hidden: [], complete: [], custom: {} }

function load(): PlannerState {
  try { return { ...emptyState, ...JSON.parse(localStorage.getItem(key) ?? '{}') } } catch { return emptyState }
}
function slugify(value: string) { return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }

export default function StudyPlanner() {
  const [state, setState] = useState<PlannerState>(load)
  const [indexSubjects, setIndexSubjects] = useState<IndexSubject[]>([])
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => { fetch('/css-subject-mcqs/index.json').then((response) => response.json()).then((value) => setIndexSubjects(value.subjects ?? [])) }, [])
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)) }, [state])

  const subjectTopics = useMemo(() => {
    const map: Record<string, string[]> = {}
    compulsorySubjects.forEach((subject) => {
      map[subject.slug] = subject.topics.flatMap((section) => [section.title, ...section.points.map((point) => `${section.title} — ${point}`)])
    })
    indexSubjects.forEach((subject) => { if (subject.topics.length) map[subject.slug] = subject.topics.filter((topic) => topic !== 'General') })
    return map
  }, [indexSubjects])

  const master = useMemo(() => [
    ...compulsorySubjects.map((subject) => ({ slug: subject.slug, name: subject.name, kind: 'Compulsory', group: null as number | null })),
    ...optionalGroups.flatMap((group) => group.subjects.map((subject) => ({ slug: indexSubjects.find((item) => item.name === subject.name)?.slug ?? slugify(subject.name), name: subject.name, kind: 'Optional', group: group.group }))),
  ], [indexSubjects])
  const selectedSubjects = master.filter((subject) => state.selected.includes(subject.slug) && !state.hidden.includes(subject.slug))

  function select(slug: string) {
    setState((current) => ({ ...current, selected: current.selected.includes(slug) ? current.selected.filter((value) => value !== slug) : [...current.selected, slug], hidden: current.hidden.filter((value) => value !== slug) }))
  }
  function toggleOfficial(id: string) {
    setState((current) => ({ ...current, complete: current.complete.includes(id) ? current.complete.filter((value) => value !== id) : [...current.complete, id] }))
  }
  function addCustom(slug: string) {
    const text = drafts[slug]?.trim(); if (!text) return
    const item: CustomTopic = { id: `${slug}-${Date.now()}`, text, done: false }
    setState((current) => ({ ...current, custom: { ...current.custom, [slug]: [...(current.custom[slug] ?? []), item] } }))
    setDrafts((current) => ({ ...current, [slug]: '' }))
  }
  function updateCustom(slug: string, id: string, patchValue: Partial<CustomTopic>) {
    setState((current) => ({ ...current, custom: { ...current.custom, [slug]: (current.custom[slug] ?? []).map((item) => item.id === id ? { ...item, ...patchValue } : item) } }))
  }
  function deleteCustom(slug: string, id: string) {
    setState((current) => ({ ...current, custom: { ...current.custom, [slug]: (current.custom[slug] ?? []).filter((item) => item.id !== id) } }))
  }
  function moveCustom(slug: string, index: number, direction: -1 | 1) {
    const items = [...(state.custom[slug] ?? [])]; const next = index + direction
    if (next < 0 || next >= items.length) return
    ;[items[index], items[next]] = [items[next], items[index]]
    setState((current) => ({ ...current, custom: { ...current.custom, [slug]: items } }))
  }

  return (
    <div>
      <PageHeader title="FPSC Syllabus & Topic Planner" description="Choose your own CSS combination, track verified syllabus areas, and keep personal preparation tasks clearly separate from the official outline." />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="rounded-xl border bg-white p-5 print:hidden">
          <h2 className="font-display text-xl font-bold text-pine">Configure my subjects</h2>
          <p className="mt-1 text-sm text-muted-foreground">Selecting or hiding a subject changes only your personal view; the master FPSC subject list remains intact.</p>
          <div className="mt-5"><h3 className="text-sm font-bold uppercase tracking-wide text-emerald-800">Compulsory</h3><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{master.filter((subject) => subject.kind === 'Compulsory').map((subject) => <SubjectToggle key={subject.slug} subject={subject} checked={state.selected.includes(subject.slug)} onChange={() => select(subject.slug)} />)}</div></div>
          {optionalGroups.map((group) => <details key={group.group} className="mt-4 rounded-lg border" open={group.group === 1}><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-pine">Optional Group {group.group} · {group.rule}</summary><div className="grid gap-2 border-t p-3 sm:grid-cols-2 lg:grid-cols-3">{master.filter((subject) => subject.group === group.group).map((subject) => <SubjectToggle key={subject.slug} subject={subject} checked={state.selected.includes(subject.slug)} onChange={() => select(subject.slug)} />)}</div></details>)}
        </section>

        {state.hidden.length > 0 && <button type="button" onClick={() => setState((current) => ({ ...current, hidden: [] }))} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-bold text-pine print:hidden"><RotateCcw className="h-4 w-4" /> Restore hidden selected subjects</button>}

        {selectedSubjects.length === 0 ? (
          <section className="mt-6 rounded-xl border border-dashed bg-white p-10 text-center"><h2 className="font-display text-xl font-bold text-pine">Build your personal syllabus first</h2><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Select compulsory and optional subjects above. The personalized checklist remains hidden until you choose what you are preparing.</p></section>
        ) : (
          <div className="print-area mt-6">
            <div className="mb-4 flex items-center justify-between gap-3 print:hidden"><div><h2 className="font-display text-2xl font-bold text-pine">My personal syllabus</h2><p className="text-sm text-muted-foreground">{selectedSubjects.length} selected subjects</p></div><button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-pine px-4 text-sm font-bold text-white"><Printer className="h-4 w-4" /> Print personal syllabus</button></div>
            <div className="space-y-4">
              {selectedSubjects.map((subject) => {
                const topics = subjectTopics[subject.slug] ?? []
                const complete = topics.filter((topic) => state.complete.includes(`${subject.slug}::${topic}`)).length
                const percent = topics.length ? Math.round(complete / topics.length * 100) : 0
                const expanded = open[subject.slug] ?? true
                return <article key={subject.slug} className="rounded-xl border bg-white p-5 break-inside-avoid">
                  <div className="flex flex-wrap items-start justify-between gap-3"><button type="button" onClick={() => setOpen((current) => ({ ...current, [subject.slug]: !expanded }))} className="min-w-0 flex-1 text-left"><p className="text-xs font-bold uppercase tracking-wide text-amber-700">{subject.kind}{subject.group ? ` · Group ${subject.group}` : ''}</p><h3 className="mt-1 font-display text-xl font-bold text-pine">{subject.name}</h3><p className="mt-1 text-xs text-muted-foreground">{topics.length ? `${complete}/${topics.length} official areas complete · ${percent}%` : 'Detailed outline not published from the verified source batch'}</p></button><div className="flex gap-2 print:hidden"><button type="button" onClick={() => setState((current) => ({ ...current, hidden: [...current.hidden, subject.slug] }))} className="grid h-10 w-10 place-items-center rounded-lg border" aria-label={`Hide ${subject.name}`}><EyeOff className="h-4 w-4" /></button><ChevronDown className={`mt-2 h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} /></div></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-emerald-700" style={{ width: `${percent}%` }} /></div>
                  {expanded && <div className="mt-5 grid gap-6 lg:grid-cols-2">
                    <section><h4 className="font-bold text-pine">Official FPSC syllabus checklist</h4>{topics.length ? <div className="mt-3 max-h-[30rem] space-y-2 overflow-y-auto pr-1 print:max-h-none print:overflow-visible">{topics.map((topic) => { const id = `${subject.slug}::${topic}`; const done = state.complete.includes(id); return <label key={id} className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 text-sm ${done ? 'border-emerald-300 bg-emerald-50' : ''}`}><input type="checkbox" checked={done} onChange={() => toggleOfficial(id)} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span className={done ? 'text-emerald-950 line-through' : ''}>{topic}</span></label>})}</div> : <p className="mt-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No detailed, reliably extracted topic hierarchy was available for this subject in the present source batch. The subject remains selectable without fabricated headings.</p>}</section>
                    <section className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-4"><h4 className="font-bold text-pine">My Topics to Do</h4><p className="mt-1 text-xs text-muted-foreground">Personal preparation layer — not part of the official FPSC syllabus.</p><div className="mt-3 flex gap-2 print:hidden"><input value={drafts[subject.slug] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [subject.slug]: event.target.value }))} onKeyDown={(event) => event.key === 'Enter' && addCustom(subject.slug)} placeholder="Add a personal topic…" className="h-10 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm" /><button type="button" onClick={() => addCustom(subject.slug)} className="grid h-10 w-10 place-items-center rounded-lg bg-pine text-white" aria-label="Add personal topic"><Plus className="h-4 w-4" /></button></div><ol className="mt-3 space-y-2">{(state.custom[subject.slug] ?? []).map((item, indexValue) => <li key={item.id} className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm"><button type="button" onClick={() => updateCustom(subject.slug, item.id, { done: !item.done })} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${item.done ? 'bg-emerald-700 text-white' : ''}`} aria-label={item.done ? 'Mark incomplete' : 'Mark complete'}>{item.done && <Check className="h-4 w-4" />}</button>{editing === item.id ? <input autoFocus defaultValue={item.text} onBlur={(event) => { updateCustom(subject.slug, item.id, { text: event.target.value.trim() || item.text }); setEditing(null) }} onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()} className="h-8 min-w-0 flex-1 rounded border px-2" /> : <button type="button" onClick={() => setEditing(item.id)} className={`min-w-0 flex-1 text-left ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.text}</button>}<span className="flex print:hidden"><button type="button" disabled={indexValue === 0} onClick={() => moveCustom(subject.slug, indexValue, -1)} className="grid h-8 w-7 place-items-center disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" disabled={indexValue === (state.custom[subject.slug]?.length ?? 0) - 1} onClick={() => moveCustom(subject.slug, indexValue, 1)} className="grid h-8 w-7 place-items-center disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" onClick={() => deleteCustom(subject.slug, item.id)} className="grid h-8 w-7 place-items-center text-red-600" aria-label="Delete personal topic"><Trash2 className="h-3.5 w-3.5" /></button></span></li>)}</ol></section>
                  </div>}
                </article>
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function SubjectToggle({ subject, checked, onChange }: { subject: { slug: string; name: string }; checked: boolean; onChange: () => void }) {
  return <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${checked ? 'border-emerald-700 bg-emerald-50' : 'hover:bg-secondary'}`}><input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-emerald-700" />{subject.name}</label>
}
