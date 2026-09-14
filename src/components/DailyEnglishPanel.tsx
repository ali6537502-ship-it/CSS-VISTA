import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Languages } from 'lucide-react'
import { Link } from 'react-router'
import { idioms, pairOfWords } from '@/data/grammar'
import { loadFullVocabulary, type VocabWord } from '@/data/vocab'
import { useAccount } from '@/lib/accountContext'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'

const STORAGE_KEY = 'cssvista:tool:daily-english:v1'
const VOCAB_PER_DAY = 20
const IDIOMS_PER_DAY = 5
const PAIRS_PER_DAY = 5

type EnglishSection = 'vocab' | 'idioms' | 'pairs'
type DailyAssignments = Partial<Record<EnglishSection, string[]>>

interface DailyEnglishState {
  version: 2
  startedOn: string
  completed: Record<string, Partial<Record<EnglishSection, boolean>>>
  assignments: Record<string, DailyAssignments>
  seen: Record<EnglishSection, string[]>
  legacySeeded: boolean
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

function cleanKey(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function vocabId(item: VocabWord) {
  return `v:${cleanKey(item.word)}`
}

function idiomId(item: { idiom: string }) {
  const key = cleanKey(item.idiom)
    .replace(/^to\s+/, '')
    .replace(/^(?:a|an|the)\s+/, '')
    .replace(/\b(?:one'?s|your|his|her|their|our|my)\b/g, "one's")
  return `i:${key}`
}

function pairId(item: { a: string; b: string }) {
  const sides = [cleanKey(item.a), cleanKey(item.b)].sort()
  return `p:${sides[0]}|${sides[1]}`
}

function uniqueBy<T>(items: T[], identify: (item: T) => string) {
  const result: T[] = []
  const used = new Set<string>()
  for (const item of items) {
    const id = identify(item)
    if (!id || used.has(id)) continue
    used.add(id)
    result.push(item)
  }
  return result
}

function uniqueStrings(values: unknown) {
  if (!Array.isArray(values)) return []
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))]
}

function freshState(today: string): DailyEnglishState {
  return {
    version: 2,
    startedOn: today,
    completed: {},
    assignments: {},
    seen: { vocab: [], idioms: [], pairs: [] },
    legacySeeded: true,
  }
}

function readState(today: string): DailyEnglishState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState(today)
    const parsed = JSON.parse(raw) as {
      version?: number
      startedOn?: string
      completed?: Record<string, Partial<Record<EnglishSection, boolean>>>
      assignments?: Record<string, DailyAssignments>
      seen?: Partial<Record<EnglishSection, unknown>>
      legacySeeded?: boolean
    }
    if (typeof parsed.startedOn !== 'string' || !parsed.startedOn) return freshState(today)
    if (parsed.version === 2) {
      return {
        version: 2,
        startedOn: parsed.startedOn,
        completed: parsed.completed ?? {},
        assignments: parsed.assignments ?? {},
        seen: {
          vocab: uniqueStrings(parsed.seen?.vocab),
          idioms: uniqueStrings(parsed.seen?.idioms),
          pairs: uniqueStrings(parsed.seen?.pairs),
        },
        legacySeeded: parsed.legacySeeded !== false,
      }
    }
    return {
      version: 2,
      startedOn: parsed.startedOn,
      completed: parsed.completed ?? {},
      assignments: {},
      seen: { vocab: [], idioms: [], pairs: [] },
      legacySeeded: false,
    }
  } catch {
    return freshState(today)
  }
}

function writeState(state: DailyEnglishState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new Event(PROGRESS_CHANGED_EVENT))
  } catch {
    /* account remains usable if storage is blocked */
  }
}

function sameState(left: DailyEnglishState, right: DailyEnglishState) {
  return JSON.stringify(left) === JSON.stringify(right)
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
  const { user, syncStatus } = useAccount()
  const [state, setState] = useState<DailyEnglishState>(() => readState(today))
  const [historyLoaded, setHistoryLoaded] = useState(!user)
  const [vocabulary, setVocabulary] = useState<VocabWord[]>([])
  const syncReady = !user || syncStatus === 'synced' || syncStatus === 'error'

  const vocabBank = useMemo(() => uniqueBy(vocabulary, vocabId), [vocabulary])
  const idiomBank = useMemo(() => uniqueBy(idioms, idiomId), [])
  const pairBank = useMemo(() => uniqueBy(pairOfWords, pairId), [])

  useEffect(() => {
    let active = true
    void loadFullVocabulary().then((rows) => { if (active) setVocabulary(rows) })
    return () => { active = false }
  }, [])

  // Initial account sync applies its merged snapshot directly to localStorage.
  // Re-read only after that sync settles, before assigning any unseen items.
  useEffect(() => {
    if (!syncReady) {
      setHistoryLoaded(false)
      return
    }
    const stored = readState(today)
    setState((current) => sameState(current, stored) ? current : stored)
    setHistoryLoaded(true)
  }, [syncReady, today, user?.id])

  useEffect(() => {
    const refresh = () => {
      const stored = readState(today)
      setState((current) => sameState(current, stored) ? current : stored)
    }
    window.addEventListener(PROGRESS_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PROGRESS_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [today])

  useEffect(() => {
    if (!syncReady || !historyLoaded) return
    writeState(state)
  }, [historyLoaded, state, syncReady])

  useEffect(() => {
    if (!syncReady || !historyLoaded || vocabBank.length === 0) return
    setState((current) => {
      const seen: Record<EnglishSection, string[]> = {
        vocab: [...current.seen.vocab],
        idioms: [...current.seen.idioms],
        pairs: [...current.seen.pairs],
      }
      let legacySeeded = current.legacySeeded

      if (!legacySeeded) {
        const priorDays = dayDistance(current.startedOn, today)
        seen.vocab = [...new Set([...seen.vocab, ...vocabBank.slice(0, priorDays * VOCAB_PER_DAY).map(vocabId)])]
        seen.idioms = [...new Set([...seen.idioms, ...idiomBank.slice(0, priorDays * IDIOMS_PER_DAY).map(idiomId)])]
        seen.pairs = [...new Set([...seen.pairs, ...pairBank.slice(0, priorDays * PAIRS_PER_DAY).map(pairId)])]
        legacySeeded = true
      }

      const assignments: Record<string, DailyAssignments> = { ...current.assignments }
      const todayAssignments: DailyAssignments = { ...(assignments[today] ?? {}) }

      function ensure<T>(section: EnglishSection, bank: T[], quota: number, identify: (item: T) => string) {
        const bankMap = new Map(bank.map((item) => [identify(item), item]))
        const existing = uniqueStrings(todayAssignments[section]).filter((id) => bankMap.has(id)).slice(0, quota)
        const seenSet = new Set(seen[section])
        for (const id of existing) seenSet.add(id)
        const assigned = [...existing]
        for (const item of bank) {
          if (assigned.length >= quota) break
          const id = identify(item)
          if (seenSet.has(id)) continue
          assigned.push(id)
          seenSet.add(id)
        }
        todayAssignments[section] = assigned
        seen[section] = [...seenSet]
      }

      ensure('vocab', vocabBank, VOCAB_PER_DAY, vocabId)
      ensure('idioms', idiomBank, IDIOMS_PER_DAY, idiomId)
      ensure('pairs', pairBank, PAIRS_PER_DAY, pairId)
      assignments[today] = todayAssignments

      const next: DailyEnglishState = { ...current, version: 2, assignments, seen, legacySeeded }
      return sameState(current, next) ? current : next
    })
  }, [historyLoaded, idiomBank, pairBank, syncReady, today, vocabBank])

  const vocabMap = useMemo(() => new Map(vocabBank.map((item) => [vocabId(item), item])), [vocabBank])
  const idiomMap = useMemo(() => new Map(idiomBank.map((item) => [idiomId(item), item])), [idiomBank])
  const pairMap = useMemo(() => new Map(pairBank.map((item) => [pairId(item), item])), [pairBank])
  const assignment = state.assignments[today] ?? {}
  const dailyWords = (assignment.vocab ?? []).map((id) => vocabMap.get(id)).filter((item): item is VocabWord => Boolean(item))
  const dailyIdioms = (assignment.idioms ?? []).map((id) => idiomMap.get(id)).filter((item): item is (typeof idiomBank)[number] => Boolean(item))
  const dailyPairs = (assignment.pairs ?? []).map((id) => pairMap.get(id)).filter((item): item is (typeof pairBank)[number] => Boolean(item))
  const completed = state.completed[today] ?? {}
  const completedCount = Number(Boolean(completed.vocab)) + Number(Boolean(completed.idioms)) + Number(Boolean(completed.pairs))
  const dayIndex = dayDistance(state.startedOn, today)

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
        <div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-800">Daily English</p><h2 className="mt-1 text-xl font-bold text-slate-950">Vocabulary, idioms & pairs for today</h2><p className="mt-1 text-xs leading-5 text-slate-500">Every item has a permanent seen record. Once shown, it is excluded from future daily sets.</p></div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"><Languages className="h-4 w-4 text-emerald-800" />{completedCount}/3 tasks done</div>
      </div>

      {!syncReady || !historyLoaded ? <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">Syncing your Daily English history before assigning today&apos;s unseen items…</div> : <>
        <div className="mt-5 rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold text-slate-950">20 Vocabulary Words</h3><p className="text-xs text-slate-500">Day {dayIndex + 1} · unseen words from the CSS Vista English bank</p></div><SectionTick done={Boolean(completed.vocab)} label="Mark vocabulary done" onClick={() => toggle('vocab')} /></div>
          {dailyWords.length > 0 ? <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{dailyWords.map((item, index) => <VocabCard key={vocabId(item)} item={item} index={index} />)}</div> : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-xs font-semibold text-slate-600">You have reached the end of the current vocabulary bank. CSS Vista will not repeat earlier words.</p>}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold text-slate-950">5 Idioms</h3><p className="text-xs text-slate-500">Unseen idioms from the central CSS Vista idiom bank</p></div><SectionTick done={Boolean(completed.idioms)} label="Mark idioms done" onClick={() => toggle('idioms')} /></div>
            {dailyIdioms.length > 0 ? <div className="mt-3 space-y-2">{dailyIdioms.map((item, index) => <div key={idiomId(item)} className="rounded-lg bg-slate-50 p-3"><strong className="text-sm text-slate-900">{index + 1}. {item.idiom}</strong><p className="mt-1 text-xs leading-5 text-slate-600">{item.meaning}</p>{item.sentence && <p className="mt-1 text-[11px] italic text-slate-500">{item.sentence}</p>}</div>)}</div> : <p className="mt-3 rounded-lg bg-slate-50 p-4 text-xs font-semibold text-slate-600">You have reached the end of the current idiom bank. Earlier idioms will not be recycled.</p>}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold text-slate-950">5 Pairs of Words</h3><p className="text-xs text-slate-500">Unseen pairs from English Precis & Composition</p></div><SectionTick done={Boolean(completed.pairs)} label="Mark pairs done" onClick={() => toggle('pairs')} /></div>
            {dailyPairs.length > 0 ? <div className="mt-3 space-y-2">{dailyPairs.map((item, index) => <div key={pairId(item)} className="rounded-lg bg-slate-50 p-3"><strong className="text-sm text-slate-900">{index + 1}. {item.a} / {item.b}</strong><div className="mt-1 grid gap-1 text-xs leading-5 text-slate-600 sm:grid-cols-2"><p><b>{item.a}:</b> {item.aMeaning}</p><p><b>{item.b}:</b> {item.bMeaning}</p></div><div className="mt-1 grid gap-1 text-[11px] italic text-slate-500 sm:grid-cols-2"><p>{item.aSentence}</p><p>{item.bSentence}</p></div></div>)}</div> : <p className="mt-3 rounded-lg bg-slate-50 p-4 text-xs font-semibold text-slate-600">You have completed the current Pairs-of-Words bank. CSS Vista will not repeat old pairs; new verified pairs can be added to the English section later.</p>}
          </div>
        </div>
      </>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-[11px] text-slate-500">Seen-item history and completion are saved with your CSS Vista study data.</p><Link to="/grammar-vocabulary" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">Open full English section <ChevronRight className="h-4 w-4" /></Link></div>
    </section>
  )
}
