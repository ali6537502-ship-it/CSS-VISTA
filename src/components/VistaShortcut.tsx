import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Check, CheckSquare2, Clock3, FileCheck2, Globe2, NotebookPen, Plus,
  Search, Settings2, StickyNote, Trash2, X,
} from 'lucide-react'
import { searchSite, type SearchResult } from '@/lib/search'
import {
  getState, setGoalChecklist, setQuickNotes, setVistaShortcut,
} from '@/lib/store'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'

const shortcutDefinitions = [
  { id: 'goals', label: 'Goal checklist', icon: CheckSquare2, action: 'goals' },
  { id: 'note', label: 'Quick note', icon: StickyNote, action: 'note' },
  { id: 'syllabus', label: 'FPSC syllabus', icon: FileCheck2, to: '/fpsc-syllabus' },
  { id: 'planner', label: 'Study planner', icon: NotebookPen, to: '/study-planner' },
  { id: 'timer', label: 'Answer timer', icon: Clock3, to: '/answer-timer' },
  { id: 'search', label: 'Website search', icon: Search, action: 'search' },
  { id: 'gk', label: 'GK World', icon: Globe2, to: '/gk' },
  { id: 'mistakes', label: 'Mistake notebook', icon: NotebookPen, to: '/mistakes' },
  { id: 'current-affairs', label: 'Current affairs', icon: Globe2, to: '/current-affairs' },
  { id: 'css-mcqs', label: 'CSS subject MCQs', icon: CheckSquare2, to: '/css-mcqs' },
  { id: 'mpt', label: 'MPT practice', icon: CheckSquare2, to: '/mpt' },
  { id: 'games', label: 'CSS games', icon: Globe2, to: '/games' },
  { id: 'grammar', label: 'Grammar & vocabulary', icon: FileCheck2, to: '/grammar-vocabulary' },
  { id: 'papers', label: 'Past papers', icon: FileCheck2, to: '/past-papers' },
  { id: 'notes', label: 'Notes library', icon: NotebookPen, to: '/notes' },
  { id: 'dashboard', label: 'Dashboard', icon: CheckSquare2, to: '/dashboard' },
] as const

type Mode = 'menu' | 'goals' | 'note' | 'search'

export default function VistaShortcut() {
  const navigate = useNavigate()
  const [state, setState] = useState(() => getState())
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('menu')
  const [goalText, setGoalText] = useState('')
  const [note, setNote] = useState(state.quickNotes ?? '')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const settings = state.vistaShortcut

  useEffect(() => {
    const refresh = () => setState(getState())
    window.addEventListener(PROGRESS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PROGRESS_CHANGED_EVENT, refresh)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    let active = true
    const timer = window.setTimeout(() => searchSite(query, 8).then((rows) => active && setResults(rows)), 160)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query])

  const shortcuts = useMemo(() => shortcutDefinitions.filter((item) => settings.shortcutIds.includes(item.id)), [settings.shortcutIds])

  if (!settings.enabled) return null

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

  function choose(item: (typeof shortcutDefinitions)[number]) {
    if ('to' in item) {
      setOpen(false)
      navigate(item.to)
      return
    }
    setMode(item.action)
  }

  return (
    <div className="no-print fixed bottom-[78px] right-3 z-50 md:bottom-6 md:right-5">
      {open && <section className="cssv-vista-shortcut-panel mb-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.35rem] border border-white/90 bg-white/90 p-3 shadow-2xl backdrop-blur-xl" aria-label="VISTA SHORTCUT">
        <div className="flex items-center justify-between gap-3 border-b px-1 pb-3"><div className="flex items-center gap-2"><img src="/images/logo.png?v=20260810b" alt="" className="h-7 w-auto max-w-[110px] object-contain" /><span className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">VISTA SHORTCUT</span></div><button type="button" onClick={() => { setOpen(false); setMode('menu') }} className="grid h-8 w-8 place-items-center rounded-full border bg-white text-pine" aria-label="Close VISTA SHORTCUT"><X className="h-4 w-4" /></button></div>

        {mode !== 'menu' && <button type="button" onClick={() => setMode('menu')} className="mt-2 text-xs font-bold text-emerald-800">← All shortcuts</button>}

        {mode === 'menu' && <div className="mt-3 grid grid-cols-2 gap-2">{shortcuts.map((item) => <button key={item.id} type="button" onClick={() => choose(item)} className="cssv-vista-shortcut-tile flex min-h-[84px] flex-col items-start justify-between rounded-xl border bg-white/75 p-3 text-left shadow-sm"><item.icon className="h-4 w-4 text-emerald-700" /><span className="text-xs font-bold leading-tight text-pine">{item.label}</span></button>)}</div>}

        {mode === 'goals' && <div className="mt-3"><h3 className="font-display text-lg font-bold text-pine">Goal checklist</h3><div className="mt-2 flex gap-2"><input value={goalText} onChange={(event) => setGoalText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addGoal()} placeholder="Add today’s goal…" className="h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm" /><button type="button" onClick={addGoal} className="grid h-10 w-10 place-items-center rounded-lg bg-pine text-white" aria-label="Add goal"><Plus className="h-4 w-4" /></button></div><ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">{state.goalChecklist.map((goal) => <li key={goal.id} className="flex items-start gap-2 rounded-lg border bg-white p-2"><button type="button" onClick={() => updateGoals(state.goalChecklist.map((item) => item.id === goal.id ? { ...item, completed: !item.completed } : item))} className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${goal.completed ? 'bg-emerald-700 text-white' : ''}`} aria-label="Toggle goal">{goal.completed && <Check className="h-3.5 w-3.5" />}</button><span className={`min-w-0 flex-1 text-xs leading-relaxed ${goal.completed ? 'text-muted-foreground line-through' : ''}`}>{goal.text}</span><button type="button" onClick={() => updateGoals(state.goalChecklist.filter((item) => item.id !== goal.id))} className="text-muted-foreground hover:text-red-700" aria-label="Delete goal"><Trash2 className="h-3.5 w-3.5" /></button></li>)}</ul></div>}

        {mode === 'note' && <div className="mt-3"><h3 className="font-display text-lg font-bold text-pine">Quick note</h3><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={8} placeholder="Write anything you need to remember…" className="mt-2 w-full rounded-xl border p-3 text-sm leading-relaxed" /><button type="button" onClick={() => { setQuickNotes(note); setState(getState()) }} className="mt-2 w-full rounded-lg bg-pine py-2.5 text-xs font-bold text-white">Save note</button></div>}

        {mode === 'search' && <div className="mt-3"><h3 className="font-display text-lg font-bold text-pine">Search CSS Vista</h3><label className="relative mt-2 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the website…" className="h-11 w-full rounded-lg border pl-9 pr-3 text-sm" /></label><ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">{results.map((result) => <li key={`${result.category}-${result.id}`}><button type="button" onClick={() => { navigate(result.link); setOpen(false); setMode('menu') }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-secondary"><span className="block text-[9px] font-bold uppercase tracking-wide text-emerald-700">{result.category}</span><span className="line-clamp-2 text-xs font-semibold text-pine">{result.title}</span></button></li>)}</ul></div>}

        <div className="mt-3 flex items-center justify-between border-t pt-3"><button type="button" onClick={() => { setVistaShortcut({ ...settings, enabled: false }); setState(getState()) }} className="text-[10px] font-bold text-slate-500">Hide shortcut</button><button type="button" onClick={() => { setOpen(false); navigate('/study-tools#vista-shortcut-settings') }} className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800"><Settings2 className="h-3.5 w-3.5" /> Customize</button></div>
      </section>}

      <button type="button" onClick={() => { setOpen((value) => !value); if (open) setMode('menu') }} className={`cssv-vista-shortcut grid h-[58px] w-[58px] place-items-center rounded-[1.15rem] border border-white/95 bg-white/85 shadow-xl backdrop-blur-lg ${open ? 'is-open' : ''}`} aria-label={open ? 'Close VISTA SHORTCUT' : 'Open VISTA SHORTCUT'} aria-expanded={open}><img src="/images/logo.png?v=20260810b" alt="" className="h-8 w-12 object-contain" /></button>
    </div>
  )
}
