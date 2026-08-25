import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  Pause, Play, RotateCcw, Target, Timer, Coffee, Plus, Trash2,
  AlertTriangle, BookMarked, PenLine, CalendarDays, Printer, FileText, Zap, Globe,
  Settings2, LibraryBig,
} from 'lucide-react'
import { PageHeader, Section, Badge } from '@/components/shared'
import { compulsorySubjects } from '@/data/syllabus'
import { vocabulary } from '@/data/vocab'
import { getState, setSubjectProgress, setGoal, getStats, setVistaShortcut } from '@/lib/store'
import { shippedMcqSummary } from '@/data/mcqMeta'
import { notifyProgressChanged } from '@/lib/progressEvents'
import { printPage } from '@/components/PrintMenu'
import ScheduledSyllabusBoard from '@/components/ScheduledSyllabusBoard'
import { useAccurateCountdown } from '@/hooks/useAccurateCountdown'

const quotationsSeed = [
  { text: 'With faith, discipline and selfless devotion to duty, there is nothing worthwhile that you cannot achieve.', source: 'Muhammad Ali Jinnah' },
  { text: 'Education is the most powerful weapon which you can use to change the world.', source: 'Nelson Mandela' },
  { text: 'Read, in the name of your Lord who created.', source: 'The Holy Quran (96:1)' },
  { text: 'The heights by great men reached and kept were not attained by sudden flight.', source: 'Henry Wadsworth Longfellow' },
]

const statsSeed = [
  { figure: 'Pakistan’s tax-to-GDP ratio has hovered around 9–11% in recent years.', source: 'FBR / IMF' },
  { figure: 'The 2022 floods affected ~33 million people; losses above $30 billion.', source: 'PDNA 2022' },
  { figure: 'Worker remittances exceed $30 billion annually.', source: 'SBP' },
  { figure: 'Per-capita water availability has fallen near the 1,000 m³ scarcity threshold.', source: 'PCRWR' },
]

// ---- Generic list tool with localStorage ----
function useList<T extends { id: string }>(key: string, seed: T[] = []) {
  const fullKey = `cssvista:tool:${key}`
  const [items, setItems] = useState<T[]>(() => {
    try {
      const raw = localStorage.getItem(fullKey)
      return raw ? JSON.parse(raw) : seed
    } catch { return seed }
  })
  function save(next: T[]) {
    setItems(next)
    try {
      localStorage.setItem(fullKey, JSON.stringify(next))
      notifyProgressChanged()
    } catch { /* ignore */ }
  }
  return { items, save }
}
const uid = () => Math.random().toString(36).slice(2, 9)

function SimpleList({ toolKey, title, placeholder, addLabel, itemPrefix }: { toolKey: string; title: string; placeholder: string; addLabel: string; itemPrefix?: string }) {
  const { items, save } = useList<{ id: string; text: string }>(toolKey)
  const [text, setText] = useState('')
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="text-sm font-semibold text-pine">{title}</h3>
      <div className="mt-2 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { save([{ id: uid(), text: text.trim() }, ...items]); setText('') } }} placeholder={placeholder} className="h-9 w-full rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={() => { if (text.trim()) { save([{ id: uid(), text: text.trim() }, ...items]); setText('') } }} className="shrink-0 rounded-md bg-pine px-3 text-emerald-50 hover:bg-emerald-900" aria-label={addLabel}><Plus className="h-4 w-4" /></button>
      </div>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 rounded bg-secondary/60 px-3 py-1.5 text-sm">
            <span className="min-w-0 truncate">{itemPrefix}{i.text}</span>
            <button onClick={() => save(items.filter((x) => x.id !== i.id))} aria-label="Delete" className="shrink-0 text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-muted-foreground">Nothing added yet.</li>}
      </ul>
    </div>
  )
}

function MistakeLog() {
  const { items, save } = useList<{ id: string; subject: string; mistake: string; fix: string }>('mistakes')
  const [form, setForm] = useState({ subject: 'Essay', mistake: '', fix: '' })
  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-pine"><AlertTriangle className="h-4 w-4" /> Mistake log & weak-topic tracker</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="h-9 rounded-md border border-input px-2 text-sm">
          {[...compulsorySubjects.map((s) => s.name), 'Optional subjects', 'MPT'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <input value={form.mistake} onChange={(e) => setForm({ ...form, mistake: e.target.value })} placeholder="The mistake / weak topic" className="h-9 rounded-md border border-input px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <div className="flex gap-2">
          <input value={form.fix} onChange={(e) => setForm({ ...form, fix: e.target.value })} placeholder="How you’ll fix it" className="h-9 w-full rounded-md border border-input px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={() => { if (form.mistake.trim()) { save([{ id: uid(), ...form }, ...items]); setForm({ ...form, mistake: '', fix: '' }) } }} className="shrink-0 rounded-md bg-pine px-3 text-emerald-50 hover:bg-emerald-900" aria-label="Add mistake"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
        {items.map((i) => (
          <li key={i.id} className="flex items-start justify-between gap-2 rounded-md border-l-2 border-amber-400 bg-amber-50/60 px-3 py-2 text-sm">
            <span><Badge tone="gray">{i.subject}</Badge> <strong>{i.mistake}</strong>{i.fix && <span className="text-muted-foreground"> → {i.fix}</span>}</span>
            <button onClick={() => save(items.filter((x) => x.id !== i.id))} aria-label="Delete" className="shrink-0 text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-muted-foreground">Log your mock mistakes - review them weekly.</li>}
      </ul>
    </div>
  )
}

function CountdownTimer({ defaultMinutes, label, presets = [10, 20, 30] }: { defaultMinutes: number; label: string; presets?: number[] }) {
  const timer = useAccurateCountdown(defaultMinutes * 60)
  const { remaining: left, running } = timer
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return (
    <div className="rounded-lg border bg-white p-4 text-center">
      <div className="text-sm font-semibold text-pine">{label}</div>
      <div className={`mt-2 font-display text-3xl font-bold tabular-nums ${left < 60 ? 'text-red-600' : 'text-pine'}`}>{fmt(left)}</div>
      <div className="mt-3 flex items-center justify-center gap-2">
        {presets.map((m) => (
          <button key={m} onClick={() => timer.reset(m * 60)} className="rounded bg-secondary px-2 py-1 text-xs font-medium">{m}m</button>
        ))}
        <button onClick={timer.toggle} className="rounded-md bg-pine p-2 text-emerald-50 hover:bg-emerald-900" aria-label={running ? 'Pause' : 'Start'}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
        <button onClick={() => timer.reset(defaultMinutes * 60)} className="rounded-md border p-2 hover:bg-secondary" aria-label="Reset"><RotateCcw className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

function PomodoroTimer() {
  const [mode, setMode] = useState<'study' | 'break'>('study')
  const [cycles, setCycles] = useState(0)
  const timer = useAccurateCountdown(25 * 60)
  const { remaining: left, running, startFrom } = timer

  useEffect(() => {
    if (left !== 0 || running) return
    if (mode === 'study') {
      setMode('break')
      setCycles((current) => current + 1)
      startFrom(5 * 60)
    } else {
      setMode('study')
      startFrom(25 * 60)
    }
  }, [left, mode, running, startFrom])

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return (
    <div className="rounded-lg border bg-white p-5 text-center">
      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-pine">
        {mode === 'study' ? <Timer className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
        Pomodoro - {mode === 'study' ? 'Study (25 min)' : 'Break (5 min)'}
      </div>
      <div className="mt-3 font-display text-4xl font-bold tabular-nums text-pine">{fmt(left)}</div>
      <div className="mt-4 flex justify-center gap-2">
        <button onClick={timer.toggle} className="rounded-md bg-pine p-2.5 text-emerald-50 hover:bg-emerald-900" aria-label={running ? 'Pause' : 'Start'}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
        <button onClick={() => { setMode('study'); timer.reset(25 * 60) }} className="rounded-md border p-2.5 hover:bg-secondary" aria-label="Reset"><RotateCcw className="h-4 w-4" /></button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Completed cycles: {cycles}</p>
    </div>
  )
}

export default function StudyTools() {
  const [state, setState] = useState(() => getState())
  const [goal, setGoalInput] = useState(state.goalText)
  const [wordIdx, setWordIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const stats = getStats()
  const [quoteIdx] = useState(() => new Date().getDate() % quotationsSeed.length)
  const [shortcutSettings, setShortcutSettings] = useState(state.vistaShortcut)

  const reminders = useList<{ id: string; text: string }>('reminders')
  const [remText, setRemText] = useState('')
  const [remDate, setRemDate] = useState('')

  const plannerRows = useMemo(() => ['Morning block', 'Midday block', 'Evening block', 'Night review'], [])
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dailyPlan = useList<{ id: string; text: string; done: boolean }>('daily-planner-blocks', plannerRows.map((id) => ({ id, text: '', done: false })))
  const weeklyPlan = useList<{ id: string; text: string }>('weekly-planner-focus', weekDays.map((id) => ({ id, text: '' })))
  const lockedShortcuts = new Set(['factbook', 'exam-intelligence'])

  return (
    <div>
      <PageHeader title="Study Tools" description="Planners, timers, trackers and organisers for focused daily preparation." />
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10">
        {/* Featured tool shortcuts */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { to: '/factbook', icon: LibraryBig, t: 'My Factbook', d: 'Your private, searchable evidence library' },
            { to: '/answer-timer', icon: PenLine, t: 'Handwritten Answer Timer', d: '5/10/20/35-minute structure alerts' },
            { to: '/five-minute', icon: Zap, t: 'Daily Five-Minute Challenge', d: 'A quick mixed quiz against the clock' },
            { to: '/mistakes', icon: AlertTriangle, t: 'Mistake Notebook', d: 'Every wrong answer, ready to revise' },
            { to: '/gk', icon: Globe, t: 'GK World', d: shippedMcqSummary },
            { to: '/css-past-paper-analysis', icon: FileText, t: 'CSS Past Paper Analysis', d: 'Topic-wise questions linked to the official syllabus' },
          ].map((c) => (
            <Link key={c.to} to={c.to} className="group rounded-xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-700/40 hover:shadow-md">
              <c.icon className="h-5 w-5 text-emerald-800" />
              <p className="mt-2 text-sm font-bold group-hover:text-pine">{c.t}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.d}</p>
            </Link>
          ))}
        </div>

        <section id="vista-shortcut-settings" className="rounded-xl border bg-white p-4 sm:p-5" aria-labelledby="vista-shortcut-settings-title">
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pine text-white"><Settings2 className="h-5 w-5" /></span><div><h2 id="vista-shortcut-settings-title" className="font-display text-xl font-bold text-pine">VISTA SHORTCUT settings</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Choose the website tools that appear in the floating AssistiveTouch-style menu. Your choice is saved with your study data.</p></div></div>
          <label className="mt-4 flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm font-bold text-pine"><input type="checkbox" checked={shortcutSettings.enabled} onChange={(event) => { const next = { ...shortcutSettings, enabled: event.target.checked }; setShortcutSettings(next); setVistaShortcut(next) }} className="h-4 w-4 accent-emerald-700" /> Show VISTA SHORTCUT</label>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[
            ['goals', 'Goal checklist'], ['note', 'Quick note'], ['syllabus', 'FPSC syllabus'], ['planner', 'Study planner'],
            ['timer', 'Answer timer'], ['search', 'Website search'], ['factbook', 'My Factbook'], ['gk', 'GK World'], ['mistakes', 'Mistake notebook'],
            ['current-affairs', 'Current affairs'], ['css-mcqs', 'CSS subject MCQs'], ['mpt', 'MPT practice'], ['games', 'CSS games'],
            ['grammar', 'Grammar & vocabulary'], ['papers', 'Past papers'], ['notes', 'Notes library'], ['dashboard', 'Dashboard'],
            ['paper-analysis', 'Past paper analysis'], ['exam-intelligence', 'Exam Intelligence'],
          ].map(([id, label]) => <label key={id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${lockedShortcuts.has(id) ? 'bg-emerald-50 text-emerald-900' : 'cursor-pointer'}`}><input type="checkbox" checked={shortcutSettings.shortcutIds.includes(id)} disabled={lockedShortcuts.has(id)} onChange={() => { const ids = shortcutSettings.shortcutIds.includes(id) ? shortcutSettings.shortcutIds.filter((value) => value !== id) : [...shortcutSettings.shortcutIds, id]; const next = { ...shortcutSettings, shortcutIds: ids }; setShortcutSettings(next); setVistaShortcut(next) }} className="h-4 w-4 accent-emerald-700" /> {label}{lockedShortcuts.has(id) && <span className="ml-auto text-[9px] uppercase tracking-wide">Always shown</span>}</label>)}</div>
        </section>

        <ScheduledSyllabusBoard />

        {/* Timers row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PomodoroTimer />
          <CountdownTimer defaultMinutes={20} label="Answer-writing timer" presets={[10, 20, 30]} />
          <CountdownTimer defaultMinutes={180} label="Essay-writing timer" presets={[60, 120, 180]} />
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-pine"><Target className="h-4 w-4" /> Goal setting</div>
            <textarea value={goal} onChange={(e) => setGoalInput(e.target.value)} rows={3} placeholder="e.g. Clear MPT in first attempt…" className="mt-2 w-full rounded-md border border-input p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={() => { setGoal(goal); setState(getState()) }} className="mt-2 w-full rounded-md bg-pine py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">Save goal</button>
          </div>
        </div>

        <div className="study-tools-plan-print-area space-y-12">
          {/* Planners */}
          <Section title="Daily, weekly & monthly planner">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-2.5">Daily blocks</th><th className="px-4 py-2.5">Task</th><th className="px-4 py-2.5">Done</th></tr>
                </thead>
                <tbody>
                  {dailyPlan.items.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-2.5 font-medium text-pine">{row.id}</td>
                      <td className="px-4 py-2"><input value={row.text} onChange={(event) => dailyPlan.save(dailyPlan.items.map((item) => item.id === row.id ? { ...item, text: event.target.value.slice(0, 300) } : item))} className="h-9 w-full rounded-md border border-input px-2 text-sm" placeholder="Task…" aria-label={`${row.id} task`} /></td>
                      <td className="px-4 py-2"><input type="checkbox" checked={row.done} onChange={(event) => dailyPlan.save(dailyPlan.items.map((item) => item.id === row.id ? { ...item, done: event.target.checked } : item))} className="h-4 w-4 accent-emerald-800" aria-label={`${row.id} done`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-2.5">Weekly plan</th><th className="px-4 py-2.5">Focus subject / task</th></tr>
                </thead>
                <tbody>
                  {weeklyPlan.items.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-2.5 font-medium text-pine">{row.id}</td>
                      <td className="px-4 py-2"><input value={row.text} onChange={(event) => weeklyPlan.save(weeklyPlan.items.map((item) => item.id === row.id ? { ...item, text: event.target.value.slice(0, 300) } : item))} className="h-9 w-full rounded-md border border-input px-2 text-sm" placeholder="Focus…" aria-label={`${row.id} focus`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SimpleList toolKey="daily-targets" title="Daily targets" placeholder="e.g. 1 precis + 20 MCQs + editorial" addLabel="Add daily target" />
            <SimpleList toolKey="weekly-targets" title="Weekly targets" placeholder="e.g. Finish PA notes ch. 4–6 + 1 essay" addLabel="Add weekly target" />
          </div>
          </Section>

          {/* Trackers */}
          <Section title="Syllabus & subject-progress tracker">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {compulsorySubjects.map((s) => {
              const pct = state.subjectProgress[s.slug] ?? 0
              return (
                <div key={s.slug} className="rounded-lg border bg-white p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="font-semibold text-pine">{pct}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-emerald-700 transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                  <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => { setSubjectProgress(s.slug, Number(e.target.value)); setState(getState()) }} className="mt-2 w-full accent-emerald-800" aria-label={`Set progress for ${s.name}`} />
                </div>
              )
            })}
          </div>
          </Section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <MistakeLog />
          <div className="rounded-lg border bg-white p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-pine"><FileText className="h-4 w-4" /> Past-paper tracker</h3>
            <p className="mt-1 text-xs text-muted-foreground">Track which papers you’ve attempted. Exact papers are added to the archive gradually.</p>
            <SimpleList toolKey="pp-tracker" title="" placeholder="e.g. CSS 2023 Essay - attempted 15 Mar" addLabel="Add paper" itemPrefix="✓ " />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SimpleList toolKey="vocab-notebook" title="Vocabulary notebook" placeholder="New word + meaning" addLabel="Add word" />
          <SimpleList toolKey="saved-quotes" title="Saved quotations" placeholder="Quotation + source" addLabel="Save quotation" />
          <SimpleList toolKey="facts-organiser" title="Facts & statistics organiser" placeholder="Figure + source" addLabel="Add fact" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SimpleList toolKey="ca-tracker" title="Current Affairs topic tracker" placeholder="e.g. Water crisis - notes done" addLabel="Add CA topic" />
          <div className="rounded-lg border bg-white p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-pine"><CalendarDays className="h-4 w-4" /> Important-date reminders</h3>
            <div className="mt-2 flex gap-2">
              <input type="date" value={remDate} onChange={(e) => setRemDate(e.target.value)} className="h-9 rounded-md border border-input px-2 text-sm" aria-label="Reminder date" />
              <input value={remText} onChange={(e) => setRemText(e.target.value)} placeholder="e.g. MPT form deadline" className="h-9 w-full rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={() => { if (remText.trim() && remDate) { reminders.save([{ id: uid(), text: `${remDate} - ${remText}` }, ...reminders.items]); setRemText(''); setRemDate('') } }} className="shrink-0 rounded-md bg-pine px-3 text-emerald-50 hover:bg-emerald-900" aria-label="Add reminder"><Plus className="h-4 w-4" /></button>
            </div>
            <ul className="mt-2 space-y-1">
              {reminders.items.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded bg-secondary/60 px-3 py-1.5 text-sm">
                  <span>{r.text}</span>
                  <button onClick={() => reminders.save(reminders.items.filter((x) => x.id !== r.id))} aria-label="Delete" className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Verify all binding dates in the FPSC advertisement - reminders are your personal notes.</p>
          </div>
        </div>

        {/* Flashcards + quotes + stats */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Section title="Vocabulary flashcards" description="Click to flip.">
            <div className="cursor-pointer rounded-lg border bg-white p-6 text-center transition-shadow hover:shadow-md" onClick={() => setFlipped(!flipped)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setFlipped(!flipped)}>
              {!flipped ? (
                <div className="font-display text-2xl font-bold text-pine">{vocabulary[wordIdx].word}</div>
              ) : (
                <div>
                  <div className="text-sm font-semibold">{vocabulary[wordIdx].meaning}</div>
                  <p className="mt-2 text-xs text-muted-foreground">{vocabulary[wordIdx].sentence}</p>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">{wordIdx + 1}/{vocabulary.length}</p>
            </div>
            <div className="mt-2 flex justify-center gap-2">
              <button onClick={() => { setWordIdx((i) => (i - 1 + vocabulary.length) % vocabulary.length); setFlipped(false) }} className="rounded-md border px-3 py-1.5 text-sm hover:bg-secondary">Prev</button>
              <button onClick={() => { setWordIdx((i) => (i + 1) % vocabulary.length); setFlipped(false) }} className="rounded-md bg-pine px-3 py-1.5 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">Next</button>
            </div>
          </Section>
          <Section title="Quotation bank">
            <blockquote className="rounded-lg border bg-white p-5 font-display text-[15px] italic leading-relaxed">“{quotationsSeed[quoteIdx].text}”</blockquote>
            <p className="mt-1.5 text-sm text-muted-foreground">- {quotationsSeed[quoteIdx].source}</p>
          </Section>
          <Section title="Statistics bank">
            <ul className="space-y-1.5">
              {statsSeed.map((s) => (
                <li key={s.figure} className="rounded-md border bg-white px-3.5 py-2.5 text-[13px]">{s.figure} <span className="text-xs text-muted-foreground">- {s.source}</span></li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Performance snapshot + printable */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-white p-5">
            <h3 className="flex items-center gap-1.5 font-semibold text-pine"><PenLine className="h-4 w-4" /> Test-performance snapshot</h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-secondary p-2.5"><div className="font-display text-xl font-bold text-pine">{stats.totalQuizzes}</div><div className="text-[11px] text-muted-foreground">Tests</div></div>
              <div className="rounded-md bg-secondary p-2.5"><div className="font-display text-xl font-bold text-pine">{stats.accuracy}%</div><div className="text-[11px] text-muted-foreground">Accuracy</div></div>
              <div className="rounded-md bg-secondary p-2.5"><div className="font-display text-xl font-bold text-pine">{stats.streak}d</div><div className="text-[11px] text-muted-foreground">Streak</div></div>
            </div>
            <Link to="/dashboard" className="mt-3 inline-block text-sm font-semibold text-emerald-800 hover:underline">Full dashboard →</Link>
          </div>
          <div className="rounded-lg border bg-white p-5">
            <h3 className="flex items-center gap-1.5 font-semibold text-pine"><Printer className="h-4 w-4" /> Printable study plan</h3>
            <p className="mt-1 text-sm text-muted-foreground">Print your planners, targets and trackers for your study wall.</p>
            <button onClick={() => printPage(true, '.study-tools-plan-print-area')} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"><Printer className="h-4 w-4" /> Print this plan</button>
          </div>
        </div>

        <div className="rounded-lg border bg-secondary/50 p-5 text-sm text-muted-foreground">
          <BookMarked className="mr-1.5 inline h-4 w-4 text-emerald-800" />
          Sign in to sync these tools across devices, or reset your progress from the{' '}
          <Link to="/dashboard" className="font-medium text-emerald-800 underline underline-offset-2">Performance Dashboard</Link>.
        </div>
      </div>
    </div>
  )
}
