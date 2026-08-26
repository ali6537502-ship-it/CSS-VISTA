import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpDown, Check, CheckCircle2, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { PageHeader, Badge } from '@/components/shared'
import { constitutionTimeline, pakistanMovementTimeline, matchConcepts, type MatchPair } from '@/data/games'
import { questions as mcqBank, quizCategories } from '@/data/quiz'
import type { Question } from '@/data/quiz'
import { getState, recordGameScore } from '@/lib/store'
import { usePageBack } from '@/lib/backNavigation'
import {
  MATCHES_PER_GAME_SET,
  gameSeed,
  seededGameShuffle,
  unlimitedMatchingSet,
} from '@/lib/unlimitedGames'

const mcqMatchCategoryOrder = [
  'english', 'abilities', 'reasoning', 'science', 'gk', 'pakistan',
  'islamiat', 'urdu', 'geography', 'history', 'organisations',
]

const mcqCategoryLabels = new Map(quizCategories.map((category) => [category.id, category.name]))

function buildMcqMatchSets(bank: Question[]) {
  return mcqMatchCategoryOrder.flatMap((category) => {
    const seenQuestions = new Set<string>()
    const seenAnswers = new Set<string>()
    const pairs: MatchPair[] = []

    for (const item of bank) {
      if (item.category !== category) continue
      const correct = item.options[item.answer]?.trim()
      const question = item.question.trim()
      if (!correct || !question) continue
      const questionKey = question.toLocaleLowerCase()
      const answerKey = correct.toLocaleLowerCase()
      if (seenQuestions.has(questionKey) || seenAnswers.has(answerKey)) continue
      seenQuestions.add(questionKey)
      seenAnswers.add(answerKey)
      pairs.push({ concept: question, match: correct })
    }

    if (pairs.length < 4) return []
    return [{
      id: `mcq-${category}`,
      title: `${mcqCategoryLabels.get(category) ?? category} MCQ Match`,
      pairs,
    }]
  })
}

// ---- Timeline ordering game ----
function TimelineGame({ items, title, gameId, page, onPage }: { items: { event: string; year: number }[]; title: string; gameId: string; page: number; onPage(page: number): void }) {
  const initialOrder = useMemo(() => seededGameShuffle(items, gameSeed(`${gameId}-page-${page}`)), [gameId, items, page])
  const [order, setOrder] = useState(initialOrder)
  const [result, setResult] = useState<null | { correct: number }>(null)
  const high = getState().gameHighScores[gameId] ?? 0

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    setOrder(next)
    setResult(null)
  }
  function check() {
    const correct = order.filter((it, i) => [...items].sort((a, b) => a.year - b.year)[i].event === it.event).length
    setResult({ correct })
    recordGameScore(gameId, correct)
  }

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Academic timeline practice · Set {page + 1}</p><h3 className="mt-1 flex items-center gap-2 font-semibold text-pine"><ArrowUpDown className="h-4 w-4" /> {title}</h3></div>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Trophy className="h-3.5 w-3.5 text-amber-600" /> Best: {high}/{items.length}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Arrange from earliest to latest using the arrows.</p>
      <ol className="mt-4 space-y-2">
        {order.map((it, i) => (
          <li key={it.event} className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm ${result ? ([...items].sort((a, b) => a.year - b.year)[i].event === it.event ? 'border-emerald-600 bg-emerald-50' : 'border-red-300 bg-red-50') : ''}`}>
            <span className="w-5 text-center font-display font-bold text-pine">{i + 1}</span>
            <span className="flex-1">{it.event}{result && <span className="ml-2 text-xs text-muted-foreground">({it.year})</span>}</span>
            {!result && (
              <span className="flex gap-1">
                <button onClick={() => move(i, -1)} aria-label="Move up" className="rounded border px-2 py-1 hover:bg-secondary">↑</button>
                <button onClick={() => move(i, 1)} aria-label="Move down" className="rounded border px-2 py-1 hover:bg-secondary">↓</button>
              </span>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex gap-2">
        {!result ? (
          <button onClick={check} className="inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"><Check className="h-4 w-4" /> Check order</button>
        ) : (
          <>
            <Badge tone={result.correct === items.length ? 'green' : 'gold'}>{result.correct}/{items.length} in correct position</Badge>
            <button onClick={() => { setOrder(seededGameShuffle(items, Date.now())); setResult(null) }} className="rounded-md border px-4 py-2 text-sm hover:bg-secondary">Try another order</button>
          </>
        )}
      </div>
      <nav className="mt-5 flex items-center justify-between gap-3 border-t pt-4" aria-label="Timeline practice sets">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page === 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold text-pine disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous set</button>
        <span className="text-xs font-bold text-slate-600">Set {page + 1}</span>
        <button type="button" onClick={() => onPage(page + 1)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold text-pine">Next fresh set <ArrowLeft className="h-4 w-4 rotate-180" /></button>
      </nav>
    </div>
  )
}

// ---- Match the concept game ----
function MatchGame({ title, pairs, gameId, page, onPage }: { title: string; pairs: MatchPair[]; gameId: string; page: number; onPage(page: number): void }) {
  const roundPairs = useMemo(() => unlimitedMatchingSet(pairs, gameId, page), [gameId, page, pairs])
  const answerOptions = useMemo(
    () => seededGameShuffle(
      roundPairs.map((pair, pairIndex) => ({ id: `${pairIndex}-${pair.match}`, pairIndex, label: pair.match })),
      gameSeed(`${gameId}-answers-${page}`),
    ),
    [gameId, page, roundPairs],
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [best, setBest] = useState(() => getState().gameHighScores[gameId] ?? 0)
  const [feedback, setFeedback] = useState<null | { kind: 'correct' | 'wrong'; optionId: string }>(null)
  const advanceTimer = useRef<number | null>(null)
  const done = currentIndex >= roundPairs.length
  const currentPair = roundPairs[currentIndex]
  const score = Math.max(0, roundPairs.length * 10 - wrong * 2)

  useEffect(() => () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
  }, [])

  function pickMatch(option: { id: string; pairIndex: number }) {
    if (!currentPair || feedback?.kind === 'correct' || option.pairIndex < currentIndex) return
    if (option.pairIndex !== currentIndex) {
      setWrong((value) => value + 1)
      setFeedback({ kind: 'wrong', optionId: option.id })
      return
    }

    setFeedback({ kind: 'correct', optionId: option.id })
    advanceTimer.current = window.setTimeout(() => {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setFeedback(null)
      if (nextIndex >= roundPairs.length) {
        const finalScore = Math.max(0, roundPairs.length * 10 - wrong * 2)
        recordGameScore(gameId, finalScore)
        setBest((value) => Math.max(value, finalScore))
      }
    }, 420)
  }

  function openPage(nextPage: number) {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    onPage(Math.max(0, nextPage))
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b bg-gradient-to-r from-emerald-950 to-emerald-800 p-4 text-white sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">Unlimited matching sets · Set {page + 1} · up to {MATCHES_PER_GAME_SET} pairs</p>
            <h3 className="mt-1 font-display text-lg font-bold">{title}</h3>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs"><Trophy className="h-3.5 w-3.5 text-amber-300" /> Best {best}</span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <span className="block h-full rounded-full bg-amber-300 transition-[width] duration-300" style={{ width: `${roundPairs.length ? (currentIndex / roundPairs.length) * 100 : 0}%` }} />
          </div>
          <span className="text-[10px] font-semibold text-emerald-100">{Math.min(currentIndex, roundPairs.length)} / {roundPairs.length}</span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {done ? (
          <div className="py-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-6 w-6" /></span>
            <h4 className="mt-3 font-display text-xl font-bold text-pine">Round complete</h4>
            <p className="mt-1 text-sm text-muted-foreground">Score {score} · {wrong} wrong {wrong === 1 ? 'attempt' : 'attempts'}</p>
            <button onClick={() => openPage(page + 1)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-pine px-4 text-sm font-semibold text-white hover:bg-emerald-900">
              <RotateCcw className="h-4 w-4" /> Next fresh matching set
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Match {currentIndex + 1} of {roundPairs.length}</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900 sm:text-base">{currentPair?.concept}</p>
            </div>

            <p className="mt-4 text-xs font-semibold text-slate-600">Choose the correct answer</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {answerOptions.map((option) => {
                const used = option.pairIndex < currentIndex
                const correct = feedback?.kind === 'correct' && feedback.optionId === option.id
                const incorrect = feedback?.kind === 'wrong' && feedback.optionId === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={used || feedback?.kind === 'correct'}
                    onClick={() => pickMatch(option)}
                    className={`min-h-12 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                      used
                        ? 'border-emerald-100 bg-emerald-50/60 text-emerald-700 opacity-60'
                        : correct
                          ? 'border-emerald-600 bg-emerald-100 text-emerald-950'
                          : incorrect
                            ? 'border-red-400 bg-red-50 text-red-800'
                            : 'bg-white text-slate-800 hover:border-amber-400 hover:bg-amber-50 active:scale-[0.99]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {used && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                      <span>{option.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 min-h-5 text-xs" aria-live="polite">
              {feedback?.kind === 'correct' && <p className="font-semibold text-emerald-700">Correct. Loading the next pair…</p>}
              {feedback?.kind === 'wrong' && <p className="font-semibold text-red-700">Not this one. Try again.</p>}
              {!feedback && <p className="text-muted-foreground">Each wrong attempt costs 2 points.</p>}
            </div>
          </>
        )}
      </div>
      <nav className="flex items-center justify-between gap-3 border-t bg-slate-50 px-4 py-3" aria-label="Matching practice sets">
        <button type="button" onClick={() => openPage(page - 1)} disabled={page === 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold text-pine disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous page</button>
        <span className="text-xs font-bold text-slate-600">Set {page + 1}</span>
        <button type="button" onClick={() => openPage(page + 1)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold text-pine">Next fresh set <ArrowLeft className="h-4 w-4 rotate-180" /></button>
      </nav>
    </div>
  )
}

type ActivePractice = { kind: 'timeline'; title: string; items: { event: string; year: number }[]; id: string; page: number } | { kind: 'match'; title: string; pairs: { concept: string; match: string }[]; id: string; page: number } | null

interface GameCard {
  title: string
  desc: string
  badge: string
  play: () => void
}

function GameCardButton({ card }: { card: GameCard }) {
  return (
    <button onClick={card.play} className="group rounded-xl border bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-800/40 hover:shadow-md sm:p-5">
      <Badge tone="gray">{card.badge}</Badge>
      <h2 className="mt-2 font-semibold text-foreground group-hover:text-pine">{card.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{card.desc}</p>
    </button>
  )
}

export default function Games() {
  const [active, setActive] = useState<ActivePractice>(null)
  const goBack = () => {
    setActive((current) => (current?.kind === 'match' || current?.kind === 'timeline') && current.page > 0
      ? { ...current, page: current.page - 1 }
      : null)
  }
  usePageBack(Boolean(active), goBack)
  const mcqMatchSets = useMemo(() => buildMcqMatchSets(mcqBank), [])

  const mcqMatchingCards: GameCard[] = mcqMatchSets.map((game) => ({
    title: game.title,
    desc: `Unlimited matching sets drawn directly from the ${game.title.replace(' MCQ Match', '')} question bank.`,
    badge: 'MCQ bank',
    play: () => setActive({ kind: 'match', title: game.title, pairs: game.pairs, id: game.id, page: 0 }),
  }))
  const conceptMatchingCards: GameCard[] = matchConcepts.map((game, index) => ({
    title: `Match: ${game.title}`,
    desc: `Unlimited syllabus-focused sets using concepts, definitions and reverse matching.`,
    badge: 'Subject concepts',
    play: () => setActive({ kind: 'match', title: `Match: ${game.title}`, pairs: game.pairs, id: `match-${index}`, page: 0 }),
  }))
  const timelineCards: GameCard[] = [
    { title: 'Constitutional History Timeline', desc: 'Order Pakistan’s constitutional milestones from earliest to latest.', badge: 'History practice', play: () => setActive({ kind: 'timeline', title: 'Constitutional History Timeline', items: constitutionTimeline, id: 'tl-constitution', page: 0 }) },
    { title: 'Pakistan Movement Timeline', desc: 'Order the major Pakistan Movement events from 1857 to 1947.', badge: 'History practice', play: () => setActive({ kind: 'timeline', title: 'Pakistan Movement Timeline', items: pakistanMovementTimeline, id: 'tl-movement', page: 0 }) },
  ]

  return (
    <div>
      <PageHeader title="Interactive Practice" description="Focused academic matching and timeline activities built from CSS subject concepts and examination material." />
      <div className="mx-auto max-w-7xl px-4 py-10">
        {active ? (
          <div>
            <button onClick={goBack} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline"><ArrowLeft className="h-4 w-4" /> {active.page > 0 ? 'Previous practice set' : 'All activities'}</button>
            <h2 className="mb-4 font-display text-xl font-bold text-pine">{active.title}</h2>
            {active.kind === 'timeline' && <TimelineGame key={`${active.id}-${active.page}`} items={active.items} title={active.title} gameId={active.id} page={active.page} onPage={(page) => setActive({ ...active, page: Math.max(0, page) })} />}
            {active.kind === 'match' && <MatchGame key={`${active.id}-${active.page}`} title={active.title} pairs={active.pairs} gameId={active.id} page={active.page} onPage={(page) => setActive({ ...active, page })} />}
          </div>
        ) : (
          <div className="space-y-10">
            <section aria-labelledby="mcq-bank-matching-practice">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Question-bank powered</p>
                  <h2 id="mcq-bank-matching-practice" className="mt-1 font-display text-xl font-bold text-pine">MCQ matching practice</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Prompts and correct matches are taken from the existing subject question bank.</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900"><Sparkles className="h-3.5 w-3.5" /> {mcqMatchingCards.length} subjects</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mcqMatchingCards.map((card) => <GameCardButton key={card.title} card={card} />)}
              </div>
            </section>

            <section aria-labelledby="concept-matching-practice">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Written-subject foundations</p>
                <h2 id="concept-matching-practice" className="mt-1 font-display text-xl font-bold text-pine">Syllabus concept matching</h2>
                <p className="mt-1 text-sm text-muted-foreground">Key terms, thinkers, theories, instruments and subject fundamentals.</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {conceptMatchingCards.map((card) => <GameCardButton key={card.title} card={card} />)}
              </div>
            </section>

            <section aria-labelledby="timeline-practice">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Chronology revision</p>
                <h2 id="timeline-practice" className="mt-1 font-display text-xl font-bold text-pine">Academic timelines</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {timelineCards.map((card) => <GameCardButton key={card.title} card={card} />)}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
