import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Languages } from 'lucide-react'
import { Link } from 'react-router'
import { idioms, pairOfWords } from '@/data/grammar'
import { loadFullVocabulary, type VocabWord } from '@/data/vocab'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'

const STORAGE_KEY = 'cssvista:tool:daily-english:v1'
const VOCAB_PER_DAY = 20
const IDIOMS_PER_DAY = 5
const PAIRS_PER_DAY = 5

type EnglishSection = 'vocab' | 'idioms' | 'pairs'

interface DailyEnglishState {
  version: 1
  startedOn: string
  completed: Record<string, Partial<Record<EnglishSection, boolean>>>
}

function dateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

function dayDistance(from: string, to: string) {
  const start = new Date(`${from}T12:00:00+05:00`).getTime()
  const end = new Date(`${to}T12:00:00+05:00`).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.max(0, Math.floor((end - start) / 86400000))
}

function readState(today: string): DailyEnglishState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DailyEnglishState>
      if (parsed.version === 1 && typeof parsed.startedOn === 'string' && parsed.startedOn) {
        return { version: 1, startedOn: parsed.startedOn, completed: parsed.completed ?? {} }
      }
    }
  } catch {
    /* use a fresh local state when browser storage is unavailable */
  }
  return { version: 1, startedOn: today, completed: {} }
}

function writeState(state: DailyEnglishState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new Event(PROGRESS_CHANGED_EVENT))
  } catch {
    /* account remains usable if storage is blocked */
  }
}

function SectionTick({ done, label, onClick }: { done: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold ${done ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
      <span className={`grid h-4 w-4 place-items-center rounded border ${done ? 'border-white' : 'border-slate-400'}`}>{done && <Check className="h-3 w-3" />}</span>
      {done ? 'Completed' : label}
    </button>
  )
}

function VocabCard({ item, index }: { item: VocabWord; index: number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-2"><span className="mt-0.5 text-[10px] font-bold text-slate-400">{index + 1}</span><div><div className="flex flex-wrap items-baseline gap-2"><strong className="text-sm text-slate-950">{item.word}</strong><span className="text-[10px] italic text-slate-400">{item.pos}</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{item.meaning}</p>{item.synonyms.length > 0 && <p className="mt-1 text-[10px] text-slate-400">Synonyms: {item.synonyms.slice(0, 3).join(', ')}</p>}</div></div>
    </article>
  )
}

export default function DailyEnglishPanel() {
  const today = dateKey()
  const [state, setState] = useState<DailyEnglishState>(() => readState(today))
  const [vocabulary, setVocabulary] = useState<VocabWord[]>([])

  useEffect(() => {
    writeState(state)
  }, [state])

  useEffect(() => {
    let active = true
    void loadFullVocabulary().then((rows) => { if (active) setVocabulary(rows) })
    return () => { active = false }
  }, [])

  const dayIndex = dayDistance(state.startedOn, today)
  const dailyWords = useMemo(() => vocabulary.slice(dayIndex * VOCAB_PER_DAY, dayIndex * VOCAB_PER_DAY + VOCAB_PER_DAY), [dayIndex, vocabulary])
  const dailyIdioms = useMemo(() => idioms.slice(dayIndex * IDIOMS_PER_DAY, dayIndex * IDIOMS_PER_DAY + IDIOMS_PER_DAY), [dayIndex])
  const dailyPairs = useMemo(() => pairOfWords.slice(dayIndex * PAIRS_PER_DAY, dayIndex * PAIRS_PER_DAY + PAIRS_PER_DAY), [dayIndex])
  const completed = state.completed[today] ?? {}
  const completedCount = Number(Boolean(completed.vocab)) + Number(Boolean(completed.idioms)) + Number(Boolean(completed.pairs))

  function toggle(section: EnglishSection) {
    setState((current) => ({
      ...current,
      completed: {
        ...current.completed,
        [today]: { ...current.completed[today], [section]: !current.completed[today]?.[section] },
      },
    }))
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="Daily English">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Daily English</p><h2 className="mt-1 text-xl font-bold text-slate-950">Vocabulary, idioms & pairs for today</h2><p className="mt-1 text-xs leading-5 text-slate-500">New items only. Completed items never return to the daily unseen stream.</p></div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"><Languages className="h-4 w-4 text-emerald-800" />{completedCount}/3 tasks done</div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold text-slate-950">20 Vocabulary Words</h3><p className="text-xs text-slate-500">Day {dayIndex + 1} · from the CSS Vista English vocabulary bank</p></div><SectionTick done={Boolean(completed.vocab)} label="Mark vocabulary done" onClick={() => toggle('vocab')} /></div>
        {dailyWords.length > 0 ? <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{dailyWords.map((item, index) => <VocabCard key={`${item.word}-${index}`} item={item} index={index} />)}</div> : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-xs font-semibold text-slate-600">You have reached the end of the current vocabulary bank. CSS Vista will not repeat earlier words.</p>}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold text-slate-950">5 Idioms</h3><p className="text-xs text-slate-500">From the central CSS Vista idiom bank</p></div><SectionTick done={Boolean(completed.idioms)} label="Mark idioms done" onClick={() => toggle('idioms')} /></div>
          {dailyIdioms.length > 0 ? <div className="mt-3 space-y-2">{dailyIdioms.map((item, index) => <div key={`${item.idiom}-${index}`} className="rounded-lg bg-slate-50 p-3"><strong className="text-sm text-slate-900">{index + 1}. {item.idiom}</strong><p className="mt-1 text-xs leading-5 text-slate-600">{item.meaning}</p>{item.sentence && <p className="mt-1 text-[11px] italic text-slate-500">{item.sentence}</p>}</div>)}</div> : <p className="mt-3 rounded-lg bg-slate-50 p-4 text-xs font-semibold text-slate-600">You have reached the end of the current idiom bank. Earlier idioms will not be recycled.</p>}
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold text-slate-950">5 Pairs of Words</h3><p className="text-xs text-slate-500">From the English Precis & Composition section</p></div><SectionTick done={Boolean(completed.pairs)} label="Mark pairs done" onClick={() => toggle('pairs')} /></div>
          {dailyPairs.length > 0 ? <div className="mt-3 space-y-2">{dailyPairs.map((item, index) => <div key={`${item.a}-${item.b}-${index}`} className="rounded-lg bg-slate-50 p-3"><strong className="text-sm text-slate-900">{index + 1}. {item.a} / {item.b}</strong><div className="mt-1 grid gap-1 text-xs leading-5 text-slate-600 sm:grid-cols-2"><p><b>{item.a}:</b> {item.aMeaning}</p><p><b>{item.b}:</b> {item.bMeaning}</p></div><div className="mt-1 grid gap-1 text-[11px] italic text-slate-500 sm:grid-cols-2"><p>{item.aSentence}</p><p>{item.bSentence}</p></div></div>)}</div> : <p className="mt-3 rounded-lg bg-slate-50 p-4 text-xs font-semibold text-slate-600">You have completed the current Pairs-of-Words bank. CSS Vista will not repeat old pairs; new verified pairs can be added to the English section later.</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-[11px] text-slate-500">Your Daily English completion is saved with your CSS Vista study data.</p><Link to="/grammar-vocabulary" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">Open full English section <ChevronRight className="h-4 w-4" /></Link></div>
    </section>
  )
}
