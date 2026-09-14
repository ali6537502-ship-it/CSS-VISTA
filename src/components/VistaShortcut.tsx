import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  BookMarked, BrainCircuit, CalendarCheck2, Check, CheckSquare2, Clock3, ExternalLink, FileCheck2, Globe2, Grid2X2,
  NotebookPen, Pause, Play, Plus, RotateCcw, Search, Settings2, StickyNote,
  Trash2, X,
} from 'lucide-react'
import WhatsAppIcon from '@/components/WhatsAppIcon'
import type { SearchResult } from '@/lib/search'
import { getState, setGoalChecklist, setQuickNotes, updateStudyScheduleTask } from '@/lib/store'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'
import { activeStudyTasks, dueStudyTasks, localTaskDateKey } from '@/lib/myTasks'
import { useAccount } from '@/lib/accountContext'
import { site } from '@/data/site'

const shortcutDefinitions = [
  { id: 'tasks', label: 'My Tasks', description: 'See today’s tasks and tick them complete from anywhere.', icon: CalendarCheck2, to: '/study-planner' },
  { id: 'goals', label: 'Goal checklist', description: 'Add, complete and remove today’s goals.', icon: CheckSquare2 },
  { id: 'note', label: 'Quick note', description: 'Keep a saved preparation note without leaving the page.', icon: StickyNote },
  { id: 'syllabus', label: 'FPSC syllabus', description: 'Search, select and schedule official syllabus topics.', icon: FileCheck2, to: '/fpsc-syllabus' },
  { id: 'planner', label: 'Study planner', description: 'Review saved syllabus tasks and open the full planner.', icon: NotebookPen, to: '/study-planner' },
  { id: 'factbook', label: 'My Factbook', description: 'Open your private, searchable CSS knowledge library.', icon: BookMarked, to: '/factbook' },
  { id: 'exam-intelligence', label: 'Exam Intelligence', description: 'See what to study next from your real preparation activity.', icon: BrainCircuit, to: '/exam-intelligence' },
  { id: 'timer', label: 'Answer timer', description: 'Run a focused answer-writing countdown here.', icon: Clock3, to: '/answer-timer' },
  { id: 'search', label: 'Website search', description: 'Find any CSS Vista page, topic or study resource.', icon: Search },
  { id: 'gk', label: 'GK World', description: 'Open the complete GK preparation bank.', icon: Globe2, to: '/gk' },
  { id: 'mistakes', label: 'Mistake notebook', description: 'Review questions you previously answered incorrectly.', icon: NotebookPen, to: '/mistakes' },
  { id: 'current-affairs', label: 'Current affairs', description: 'Open dated one-liners, MCQs and issue files.', icon: Globe2, to: '/current-affairs' },
  { id: 'css-mcqs', label: 'CSS subject MCQs', description: 'Practice the supplied compulsory and optional banks.', icon: CheckSquare2, to: '/css-mcqs' },
  { id: 'mpt', label: 'MPT practice', description: 'Open the connected MPT question bank and mocks.', icon: CheckSquare2, to: '/mpt' },
  { id: 'games', label: 'Interactive practice', description: 'Revise through academic matching and timelines.', icon: Globe2, to: '/games' },
  { id: 'grammar', label: 'Grammar & vocabulary', description: 'Open vocabulary, grammar, idioms and practice.', icon: FileCheck2, to: '/grammar-vocabulary' },
  { id: 'papers', label: 'Past papers', description: 'Search the CSS, PMS and PPSC paper archive.', icon: FileCheck2, to: '/past-papers' },
  { id: 'paper-analysis', label: 'Past paper analysis', description: 'See 3,277 questions mapped to FPSC syllabus areas.', icon: FileCheck2, to: '/css-past-paper-analysis' },
  { id: 'notes', label: 'Notes library', description: 'Open the available CSS Vista study notes.', icon: NotebookPen, to: '/notes' },
  { id: 'dashboard', label: 'Dashboard', description: 'See progress, streaks and preparation activity.', icon: CheckSquare2, to: '/dashboard' },
] as const

type ShortcutDefinition = (typeof shortcutDefinitions)[number]

function formatCountdown(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function readableShortDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function VistaShortcut() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAccount()
  const [state, setState] = useState(() => getState())
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dailyPopupOpen, setDailyPopupOpen] = useState(false)
  const accountEntryUser = useRef<string | null>(null)
  const [goalText, setGoalText] = useState('')
  const [note, setNote] = useState(state.quickNotes ?? '')
  const [noteSaved, setNoteSaved] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [timerMinutes, setTimerMinutes] = useState(10)
  const [timerSeconds, setTimerSeconds] = useState(10 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const settings = state.vistaShortcut

  useEffect(() => {
    const refresh = () => setState(getState())
    window.addEventListener(PROGRESS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PROGRESS_CHANGED_EVENT, refresh)
  }, [])

  useEffect(() => {
    const inAccount = location.pathname === '/account' || location.pathname.startsWith('/account/')
    if (!inAccount) {
      accountEntryUser.current = null
      setDailyPopupOpen(false)
      return
    }
    if (!user || location.pathname === '/account/settings' || accountEntryUser.current === user.id) return
    accountEntryUser.current = user.id
    const due = dueStudyTasks(getState().studyScheduleTasks ?? [])
    if (due.today.length > 0 || due.overdue.length > 0) setDailyPopupOpen(true)
  }, [location.pathname, user?.id])

  useEffect(() => {
    if (!timerRunning) return
    const interval = window.setInterval(() => {
      setTimerSeconds((value) => {
        if (value <= 1) {
          setTimerRunning(false)
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [timerRunning])

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (dailyPopupOpen) setDailyPopupOpen(false)
      else if (activeId) setActiveId(null)
      else setMenuOpen(false)
    }
    window.addEventListener('keydown', closeWithEscape)
    return () => window.removeEventListener('keydown', closeWithEscape)
  }, [activeId, dailyPopupOpen])

  useEffect(() => {
    setMenuOpen(false)
    setActiveId(null)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    let active = true
    const timeout = window.setTimeout(() => {
      void import('@/lib/search')
        .then(({ searchSite }) => searchSite(query, 8))
        .then((rows) => {
          if (active) setResults(rows)
        })
        .catch(() => {
          if (active) setResults([])
        })
    }, 160)
    return () => { active = false; window.clearTimeout(timeout) }
  }, [query])

  const shortcuts = useMemo(
    () => shortcutDefinitions.filter((item) => item.id === 'tasks' || settings.shortcutIds.includes(item.id)),
    [settings.shortcutIds],
  )
  const activeTool = shortcutDefinitions.find((item) => item.id === activeId) ?? null
  const activeTasks = useMemo(() => activeStudyTasks(state.studyScheduleTasks ?? []), [state])
  const dueTasks = useMemo(() => dueStudyTasks(activeTasks), [activeTasks])
  const shortcutTasks = useMemo(
    () => [...dueTasks.overdue, ...dueTasks.today].filter((task, index, rows) => rows.findIndex((candidate) => candidate.id === task.id) === index),
    [dueTasks],
  )
  const upcomingTasks = useMemo(
    () => [...activeTasks]
      .filter((task) => task.status !== 'completed')
      .sort((left, right) => `${left.date} ${left.time ?? ''}`.localeCompare(`${right.date} ${right.time ?? ''}`))
      .slice(0, 4),
    [activeTasks],
  )

  if (!settings.enabled) return null

  function closeEverything() {
    setMenuOpen(false)
    setActiveId(null)
  }

  function addGoal() {
    const text = goalText.trim()
    if (!text) return
    setGoalChecklist([{ id: `goal-${Date.now()}`, text, completed: false }, ...(getState().goalChecklist ?? [])])
    setGoalText('')
    setState(getState())
  }

  function updateGoals(items: typeof state.goalChecklist) {
    setGoalChecklist(items)
    setState(getState())
  }

  function toggleTask(id: string, completed: boolean) {
    updateStudyScheduleTask(id, { status: completed ? 'in-progress' : 'completed' })
    setState(getState())
  }

  function openTool(item: ShortcutDefinition) {
    setMenuOpen(false)
    setActiveId(item.id)
  }

  function openRoute(to: string) {
    closeEverything()
    setDailyPopupOpen(false)
    navigate(to)
  }

  function chooseTimerPreset(minutes: number) {
    setTimerMinutes(minutes)
    setTimerSeconds(minutes * 60)
    setTimerRunning(false)
  }

  const today = localTaskDateKey()

  return (
    <>
      {dailyPopupOpen && (
        <div className="no-print fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Today's CSS Vista tasks">
          <section className="w-full max-w-xl overflow-hidden rounded-2xl border bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b bg-emerald-50/80 p-4 sm:p-5">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-700">My CSS Vista · Today</p>
                <h2 className="mt-1 font-display text-xl font-bold text-pine">Your tasks for today</h2>
                <p className="mt-1 text-xs text-muted-foreground">Tick a task here and it is completed everywhere in My CSS Vista.</p>
              </div>
              <button type="button" onClick={() => setDailyPopupOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-white text-pine" aria-label="Close today's tasks"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-4 sm:p-5">
              {dueTasks.overdue.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">Left from before · {dueTasks.overdue.length}</p>
                  <div className="space-y-2">{dueTasks.overdue.map((task) => (
                    <article key={task.id} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                      <button type="button" onClick={() => toggleTask(task.id, task.status === 'completed')} className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border bg-white text-pine" aria-label={`Complete ${task.topic}`}><Check className="h-4 w-4 opacity-30" /></button>
                      <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-wide text-amber-800">{task.subject} · {readableShortDate(task.date)}{task.time ? ` · ${task.time}` : ''}</p><p className="mt-1 text-sm font-semibold text-pine">{task.topic}</p><p className="mt-1 text-[10px] text-muted-foreground">{task.minutes} min</p></div>
                    </article>
                  ))}</div>
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">Today · {dueTasks.today.length}</p>
                {dueTasks.today.length ? <div className="space-y-2">{dueTasks.today.map((task) => {
                  const done = task.status === 'completed'
                  return <article key={task.id} className={`flex items-start gap-3 rounded-xl border p-3 ${done ? 'border-emerald-200 bg-emerald-50/60' : 'bg-white'}`}>
                    <button type="button" onClick={() => toggleTask(task.id, done)} className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${done ? 'border-emerald-700 bg-emerald-700 text-white' : 'bg-white text-pine'}`} aria-label={done ? `Mark ${task.topic} incomplete` : `Complete ${task.topic}`}>{done && <Check className="h-4 w-4" />}</button>
                    <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700">{task.subject}{task.time ? ` · ${task.time}` : ''}</p><p className={`mt-1 text-sm font-semibold ${done ? 'text-emerald-900 line-through' : 'text-pine'}`}>{task.topic}</p><p className="mt-1 text-[10px] text-muted-foreground">{task.minutes} min</p></div>
                  </article>
                })}</div> : <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">No tasks are scheduled for {today}.</p>}
              </div>
            </div>
            <div className="grid gap-2 border-t p-4 sm:grid-cols-2">
              <button type="button" onClick={() => setDailyPopupOpen(false)} className="min-h-11 rounded-lg border text-xs font-bold text-pine">Continue to My CSS Vista</button>
              <button type="button" onClick={() => openRoute('/study-planner')} className="min-h-11 rounded-lg bg-pine text-xs font-bold text-white">Open full My Tasks</button>
            </div>
          </section>
        </div>
      )}

      <div className="no-print fixed bottom-[calc(78px+env(safe-area-inset-bottom))] right-3 z-50 md:bottom-6 md:right-5">
        {menuOpen && (
          <section className="cssv-vista-shortcut-panel mb-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.35rem] border border-white/90 bg-white/95 p-3 shadow-2xl backdrop-blur-xl" aria-label="VISTA SHORTCUT menu">
            <div className="flex items-center justify-between gap-3 border-b px-1 pb-3">
              <div className="flex items-center gap-2">
                <img src="/images/logo.webp?v=20260909" alt="" width="480" height="157" loading="lazy" decoding="async" className="h-7 w-auto max-w-[110px] object-contain" />
                <span className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">VISTA SHORTCUT</span>
              </div>
              <button type="button" onClick={closeEverything} className="grid h-8 w-8 place-items-center rounded-full border bg-white text-pine" aria-label="Close VISTA SHORTCUT"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-3 grid max-h-[min(62vh,31rem)] grid-cols-2 gap-2 overflow-y-auto pr-0.5">
              {shortcuts.map((item, index) => (
                <button key={item.id} type="button" onClick={() => openTool(item)} className="cssv-vista-shortcut-tile flex min-h-[84px] flex-col items-start justify-between rounded-xl border bg-white/80 p-3 text-left shadow-sm" style={{ '--shortcut-index': index } as CSSProperties}>
                  <item.icon className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-bold leading-tight text-pine">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 flex justify-end border-t pt-3">
              <button type="button" onClick={() => openRoute('/study-tools#vista-shortcut-settings')} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-emerald-800 hover:bg-emerald-50"><Settings2 className="h-3.5 w-3.5" /> Customize</button>
            </div>
          </section>
        )}

        {activeTool && (
          <section key={activeTool.id} className="cssv-vista-shortcut-tool-panel mb-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.35rem] border border-white/90 bg-white/95 p-3 shadow-2xl backdrop-blur-xl" aria-label={`${activeTool.label} shortcut tool`}>
            <div className="flex items-center gap-2 border-b px-1 pb-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><activeTool.icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-pine">{activeTool.label}</p><p className="truncate text-[9px] text-muted-foreground">VISTA SHORTCUT</p></div>
              <button type="button" onClick={() => { setActiveId(null); setMenuOpen(true) }} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/80 px-2.5 text-[10px] font-bold text-emerald-800 transition-colors hover:bg-emerald-100" aria-label="Show all shortcuts"><Grid2X2 className="h-3.5 w-3.5" /> All</button>
              <button type="button" onClick={closeEverything} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-white text-pine" aria-label={`Close ${activeTool.label}`}><X className="h-4 w-4" /></button>
            </div>

            {activeTool.id === 'tasks' && (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-pine">Today & unfinished</p><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-800">{shortcutTasks.filter((task) => task.status !== 'completed').length} left</span></div>
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                  {shortcutTasks.length ? shortcutTasks.map((task) => {
                    const done = task.status === 'completed'
                    const overdue = task.date < today && !done
                    return <article key={task.id} className={`flex items-start gap-2 rounded-lg border p-2.5 ${done ? 'border-emerald-200 bg-emerald-50/60' : overdue ? 'border-amber-200 bg-amber-50/40' : 'bg-white'}`}>
                      <button type="button" onClick={() => toggleTask(task.id, done)} className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${done ? 'border-emerald-700 bg-emerald-700 text-white' : 'bg-white text-pine'}`} aria-label={done ? `Mark ${task.topic} incomplete` : `Complete ${task.topic}`}>{done && <Check className="h-3.5 w-3.5" />}</button>
                      <div className="min-w-0 flex-1"><p className={`text-[9px] font-bold uppercase tracking-wide ${overdue ? 'text-amber-700' : 'text-emerald-700'}`}>{overdue ? `${readableShortDate(task.date)} · overdue` : task.date === today ? 'Today' : readableShortDate(task.date)}{task.time ? ` · ${task.time}` : ''}</p><p className={`mt-0.5 text-xs font-semibold leading-relaxed ${done ? 'text-muted-foreground line-through' : 'text-pine'}`}>{task.subject}: {task.topic}</p></div>
                    </article>
                  }) : <p className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">Nothing due right now.</p>}
                </div>
                <button type="button" onClick={() => openRoute('/study-planner')} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-pine text-xs font-bold text-white">Open full My Tasks <ExternalLink className="h-3.5 w-3.5" /></button>
              </div>
            )}

            {activeTool.id === 'goals' && (
              <div className="mt-3"><div className="flex gap-2"><input autoFocus value={goalText} onChange={(event) => setGoalText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addGoal()} placeholder="Add today’s goal…" className="h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm" /><button type="button" onClick={addGoal} className="grid h-10 w-10 place-items-center rounded-lg bg-pine text-white" aria-label="Add goal"><Plus className="h-4 w-4" /></button></div><ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">{state.goalChecklist.map((goal) => <li key={goal.id} className="flex items-start gap-2 rounded-lg border bg-white p-2"><button type="button" onClick={() => updateGoals(state.goalChecklist.map((item) => item.id === goal.id ? { ...item, completed: !item.completed } : item))} className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${goal.completed ? 'bg-emerald-700 text-white' : ''}`} aria-label="Toggle goal">{goal.completed && <Check className="h-3.5 w-3.5" />}</button><span className={`min-w-0 flex-1 text-xs leading-relaxed ${goal.completed ? 'text-muted-foreground line-through' : ''}`}>{goal.text}</span><button type="button" onClick={() => updateGoals(state.goalChecklist.filter((item) => item.id !== goal.id))} className="text-muted-foreground hover:text-red-700" aria-label="Delete goal"><Trash2 className="h-3.5 w-3.5" /></button></li>)}</ul></div>
            )}

            {activeTool.id === 'note' && (
              <div className="mt-3"><textarea autoFocus value={note} onChange={(event) => { setNote(event.target.value); setNoteSaved(false) }} rows={8} placeholder="Write anything you need to remember…" className="w-full rounded-xl border p-3 text-sm leading-relaxed" /><button type="button" onClick={() => { setQuickNotes(note); setState(getState()); setNoteSaved(true) }} className="mt-2 w-full rounded-lg bg-pine py-2.5 text-xs font-bold text-white">{noteSaved ? 'Saved' : 'Save note'}</button></div>
            )}

            {activeTool.id === 'search' && (
              <div className="mt-3"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the website…" className="h-11 w-full rounded-lg border pl-9 pr-3 text-sm" /></label><ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">{results.map((result) => <li key={`${result.category}-${result.id}`}><button type="button" onClick={() => openRoute(result.link)} className="w-full rounded-lg px-3 py-2 text-left hover:bg-secondary"><span className="block text-[9px] font-bold uppercase tracking-wide text-emerald-700">{result.category}</span><span className="line-clamp-2 text-xs font-semibold text-pine">{result.title}</span></button></li>)}</ul>{query.trim().length >= 2 && results.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No matching item found.</p>}</div>
            )}

            {activeTool.id === 'timer' && (
              <div className="mt-3 text-center"><div className="rounded-2xl bg-pine px-4 py-6 text-white"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-amber-300">Answer countdown</p><p className="mt-2 font-mono text-5xl font-bold tabular-nums">{formatCountdown(timerSeconds)}</p></div><div className="mt-3 flex justify-center gap-2">{[10, 20, 35].map((minutes) => <button key={minutes} type="button" onClick={() => chooseTimerPreset(minutes)} className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${timerMinutes === minutes ? 'bg-emerald-100 text-emerald-900' : 'border text-slate-600'}`}>{minutes} min</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setTimerRunning((value) => !value)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-pine text-xs font-bold text-white">{timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{timerRunning ? 'Pause' : 'Start'}</button><button type="button" onClick={() => { setTimerRunning(false); setTimerSeconds(timerMinutes * 60) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border text-xs font-bold text-pine"><RotateCcw className="h-4 w-4" /> Reset</button></div><button type="button" onClick={() => openRoute('/answer-timer')} className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800">Open full answer timer <ExternalLink className="h-3 w-3" /></button></div>
            )}

            {activeTool.id === 'planner' && (
              <div className="mt-3"><p className="text-xs leading-relaxed text-muted-foreground">Your next unfinished syllabus tasks are available here without leaving the current page.</p><div className="mt-3 max-h-60 space-y-2 overflow-y-auto">{upcomingTasks.length ? upcomingTasks.map((task) => <article key={task.id} className="rounded-lg border bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700">{task.date}{task.time ? ` · ${task.time}` : ''} · {task.minutes} min</p><p className="mt-1 line-clamp-2 text-xs font-semibold text-pine">{task.subject}: {task.topic}</p></article>) : <p className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">No unfinished syllabus tasks yet.</p>}</div><button type="button" onClick={() => openRoute('/study-planner')} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-pine text-xs font-bold text-white">Open full study planner <ExternalLink className="h-3.5 w-3.5" /></button></div>
            )}

            {activeTool.id === 'syllabus' && (
              <div className="mt-3"><div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4"><p className="text-xs font-bold text-pine">Official FPSC syllabus tracker</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Search all available subjects, select individual or bulk topics, update progress, and add them to a day or week.</p><p className="mt-3 text-[10px] font-bold text-emerald-800">{Object.values(state.syllabusItemStatuses ?? {}).filter((status) => status === 'completed').length} topics completed</p></div><button type="button" onClick={() => openRoute('/fpsc-syllabus')} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-pine text-xs font-bold text-white">Open syllabus workspace <ExternalLink className="h-3.5 w-3.5" /></button></div>
            )}

            {!['tasks', 'goals', 'note', 'search', 'timer', 'planner', 'syllabus'].includes(activeTool.id) && 'to' in activeTool && (
              <div className="mt-3"><div className="rounded-xl border bg-secondary/40 p-4"><activeTool.icon className="h-6 w-6 text-emerald-700" /><p className="mt-3 text-sm font-bold text-pine">{activeTool.label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activeTool.description}</p></div><button type="button" onClick={() => openRoute(activeTool.to)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-pine text-xs font-bold text-white">Open {activeTool.label} <ExternalLink className="h-3.5 w-3.5" /></button></div>
            )}
          </section>
        )}

        <div className="flex flex-col items-end gap-2">
          <a href={site.cssGroupLink} target="_blank" rel="noopener noreferrer" data-google-vignette="false" className="cssv-tap grid h-12 w-12 place-items-center rounded-2xl border border-emerald-500/30 bg-emerald-600 text-white shadow-lg" aria-label="Join the CSS Vista WhatsApp group" title="Join the CSS Vista WhatsApp group"><WhatsAppIcon className="h-6 w-6" aria-hidden="true" /></a>
          <button type="button" onClick={() => { if (menuOpen || activeId) closeEverything(); else setMenuOpen(true) }} className={`cssv-vista-shortcut grid h-[58px] w-[58px] place-items-center rounded-[1.15rem] border border-white/95 bg-white/90 shadow-xl backdrop-blur-lg ${menuOpen || activeId ? 'is-open' : ''}`} aria-label={menuOpen || activeId ? 'Close VISTA SHORTCUT' : 'Open VISTA SHORTCUT'} aria-expanded={menuOpen || Boolean(activeId)}><img src="/images/logo.webp?v=20260909" alt="" width="480" height="157" loading="lazy" decoding="async" className="h-8 w-12 object-contain" /></button>
        </div>
      </div>
    </>
  )
}
