import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpDown, Check, CheckCircle2, Loader2, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { PageHeader, Badge } from '@/components/shared'
import QuizEngine from '@/components/QuizEngine'
import { pakistanGeography, worldGeography, internationalOrgs, constitutionTimeline, pakistanMovementTimeline, matchConcepts, type MatchPair } from '@/data/games'
import { questions as mcqBank, quizCategories } from '@/data/quiz'
import type { Question } from '@/data/quiz'
import { optionalGroups } from '@/data/syllabus'
import { getState, recordGameScore } from '@/lib/store'
import { getBankIndex, sampleQuestions, type BankQuestion } from '@/data/mcq'

const gid = 10000
function toQuestions(items: { question: string; options: string[]; answer: number; explanation: string }[], category: string): Question[] {
  return items.map((i, n) => ({ id: gid + n, category, difficulty: 'Medium' as const, ...i }))
}

function seedFrom(value: string) {
  return [...value].reduce((seed, char) => ((seed * 31) + char.charCodeAt(0)) >>> 0, 2166136261)
}

function shuffled<T>(items: T[], seed: number): T[] {
  const result = [...items]
  let state = seed >>> 0
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0
    const j = state % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

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
function TimelineGame({ items, title, gameId }: { items: { event: string; year: number }[]; title: string; gameId: string }) {
  const initialOrder = useMemo(() => shuffled(items, seedFrom(gameId)), [gameId, items])
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
        <h3 className="flex items-center gap-2 font-semibold text-pine"><ArrowUpDown className="h-4 w-4" /> {title}</h3>
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
            <button onClick={() => { setOrder(shuffled(items, Date.now())); setResult(null) }} className="rounded-md border px-4 py-2 text-sm hover:bg-secondary">Play again</button>
          </>
        )}
      </div>
    </div>
  )
}

// ---- Match the concept game ----
function MatchGame({ title, pairs, gameId }: { title: string; pairs: MatchPair[]; gameId: string }) {
  const [round, setRound] = useState(0)
  const roundPairs = useMemo(
    () => shuffled(pairs, seedFrom(`${gameId}-${round}`)).slice(0, Math.min(10, pairs.length)),
    [gameId, pairs, round],
  )
  const answerOptions = useMemo(
    () => shuffled(
      roundPairs.map((pair, pairIndex) => ({ id: `${pairIndex}-${pair.match}`, pairIndex, label: pair.match })),
      seedFrom(`${gameId}-answers-${round}`),
    ),
    [gameId, round, roundPairs],
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

  function playAgain() {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    setRound((value) => value + 1)
    setCurrentIndex(0)
    setWrong(0)
    setFeedback(null)
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b bg-gradient-to-r from-emerald-950 to-emerald-800 p-4 text-white sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">Matching page {(round % 10) + 1} of 10 · refresh for new pairs</p>
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
            <button onClick={playAgain} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-pine px-4 text-sm font-semibold text-white hover:bg-emerald-900">
              <RotateCcw className="h-4 w-4" /> New round
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
    </div>
  )
}

function bankQuestionToQuiz(question: BankQuestion, index: number): Question {
  return {
    id: 500000 + index,
    category: 'gk',
    difficulty: question.d === 'Basic' ? 'Easy' : question.d === 'Advanced' ? 'Hard' : 'Medium',
    question: question.q,
    options: question.o,
    answer: question.a,
    explanation: question.e ?? `Topic: ${question.s ?? 'General Knowledge'}`,
  }
}

function BankMarathonGame() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    getBankIndex()
      .then((index) => sampleQuestions(index.categories.filter((category) => category.mpt).map((category) => category.slug), 100))
      .then((rows) => { if (active) { setQuestions(rows.map(bankQuestionToQuiz)); setPage(0) } })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [refresh])

  if (loading) return <div className="grid place-items-center rounded-xl border bg-white py-20"><Loader2 className="h-7 w-7 animate-spin text-pine" /><p className="mt-2 text-sm text-muted-foreground">Building a fresh 100-question game…</p></div>
  const pageQuestions = questions.slice(page * 10, page * 10 + 10)
  return <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">10 pages · 10 questions each</p><p className="text-sm font-bold text-pine">Page {page + 1} of 10</p></div><button type="button" onClick={() => setRefresh((value) => value + 1)} className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold text-emerald-800"><RotateCcw className="h-4 w-4" /> Refresh all questions</button><div className="flex flex-wrap gap-1">{Array.from({ length: 10 }, (_, index) => <button key={index} type="button" onClick={() => setPage(index)} className={`grid h-8 w-8 place-items-center rounded-md text-xs font-bold ${page === index ? 'bg-pine text-white' : 'bg-secondary text-pine'}`}>{index + 1}</button>)}</div></div>{pageQuestions.length ? <QuizEngine key={`${refresh}-${page}`} questions={pageQuestions} mode="game" category={`Bank Marathon · Page ${page + 1}`} timePerQuestion={30} /> : <p className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">This page could not be loaded. Refresh the bank.</p>}</div>
}

type ActiveGame = { kind: 'quiz'; title: string; qs: Question[] } | { kind: 'timeline'; title: string; items: { event: string; year: number }[]; id: string } | { kind: 'match'; title: string; pairs: { concept: string; match: string }[]; id: string } | { kind: 'bank'; title: string } | null

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
  const [active, setActive] = useState<ActiveGame>(null)
  const mcqMatchSets = useMemo(() => buildMcqMatchSets(mcqBank), [])

  const mcqMatchingCards: GameCard[] = mcqMatchSets.map((game) => ({
    title: game.title,
    desc: `A fresh ${Math.min(6, game.pairs.length)}-pair round drawn directly from the ${game.title.replace(' MCQ Match', '')} question bank.`,
    badge: 'MCQ bank',
    play: () => setActive({ kind: 'match', title: game.title, pairs: game.pairs, id: game.id }),
  }))
  const conceptMatchingCards: GameCard[] = matchConcepts.map((game, index) => ({
    title: `Match: ${game.title}`,
    desc: `${game.pairs.length} syllabus-focused concepts and their correct matches.`,
    badge: 'Subject concepts',
    play: () => setActive({ kind: 'match', title: `Match: ${game.title}`, pairs: game.pairs, id: `match-${index}` }),
  }))
  const optionalSubjectCards: GameCard[] = optionalGroups.map((group) => {
    const pairs = group.subjects.map((subject) => ({
      concept: subject.name,
      match: `${subject.marks} marks · ${subject.nature} · Best suited to ${subject.suitedFor}`,
    }))
    return {
      title: `Optional Group ${group.group}: Subject Profiles`,
      desc: `${group.subjects.length} official subject choices matched with marks, nature and suitable background.`,
      badge: `Optional Group ${group.group}`,
      play: () => setActive({ kind: 'match', title: `Optional Group ${group.group}: Subject Profiles`, pairs, id: `optional-group-${group.group}` }),
    }
  })
  const otherCards: GameCard[] = [
    { title: '10-Page MCQ Bank Marathon', desc: '100 fresh questions from the full shipped bank, split into ten pages with a one-tap refresh mode', badge: '100 questions', play: () => setActive({ kind: 'bank', title: '10-Page MCQ Bank Marathon' }) },
    { title: 'Pakistan Map Challenge', desc: 'Provinces, passes, rivers, deserts and borders', badge: 'Geography', play: () => setActive({ kind: 'quiz', title: 'Pakistan Map Challenge', qs: toQuestions(pakistanGeography, 'Pakistan Geography') }) },
    { title: 'World Map Challenge', desc: 'Straits, seas, regions and borders that matter for CSS', badge: 'Geography', play: () => setActive({ kind: 'quiz', title: 'World Map Challenge', qs: toQuestions(worldGeography, 'World Geography') }) },
    { title: 'International Organisations', desc: 'UN, IMF, SCO, OIC, SAARC, WTO - members, seats, roles', badge: 'IR', play: () => setActive({ kind: 'quiz', title: 'International Organisations', qs: toQuestions(internationalOrgs, 'International Organisations') }) },
    { title: 'Subject-wise MCQ Challenge', desc: 'A random ten-question round from the mixed preparation bank', badge: 'Mixed', play: () => setActive({ kind: 'quiz', title: 'MCQ Challenge', qs: [...mcqBank].sort(() => Math.random() - 0.5).slice(0, 10) }) },
    { title: 'Constitutional History Timeline', desc: 'Order the milestones of Pakistan’s constitutional development', badge: 'Timeline', play: () => setActive({ kind: 'timeline', title: 'Constitutional History Timeline', items: constitutionTimeline, id: 'tl-constitution' }) },
    { title: 'Pakistan Movement Timeline', desc: 'Order the events from 1857 to 1947', badge: 'Timeline', play: () => setActive({ kind: 'timeline', title: 'Pakistan Movement Timeline', items: pakistanMovementTimeline, id: 'tl-movement' }) },
  ]

  return (
    <div>
      <PageHeader title="CSS Games" description="Subject-focused matching rounds, timed challenges and score tracking. Matching rounds now use the question bank wherever suitable and load one clear pair at a time." />
      <div className="mx-auto max-w-7xl px-4 py-10">
        {active ? (
          <div>
            <button onClick={() => setActive(null)} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline"><ArrowLeft className="h-4 w-4" /> All games</button>
            <h2 className="mb-4 font-display text-xl font-bold text-pine">{active.title}</h2>
            {active.kind === 'quiz' && <QuizEngine questions={active.qs} mode="game" category={active.title} timePerQuestion={30} />}
            {active.kind === 'timeline' && <TimelineGame items={active.items} title={active.title} gameId={active.id} />}
            {active.kind === 'match' && <MatchGame title={active.title} pairs={active.pairs} gameId={active.id} />}
            {active.kind === 'bank' && <BankMarathonGame />}
          </div>
        ) : (
          <div className="space-y-10">
            <section aria-labelledby="mcq-bank-matching-games">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Question-bank powered</p>
                  <h2 id="mcq-bank-matching-games" className="mt-1 font-display text-xl font-bold text-pine">MCQ matching games</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Prompts and correct matches are taken from the existing subject question bank.</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900"><Sparkles className="h-3.5 w-3.5" /> {mcqMatchingCards.length} subjects</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mcqMatchingCards.map((card) => <GameCardButton key={card.title} card={card} />)}
              </div>
            </section>

            <section aria-labelledby="optional-subject-matching-games">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Complete optional-subject coverage</p>
                <h2 id="optional-subject-matching-games" className="mt-1 font-display text-xl font-bold text-pine">All optional groups</h2>
                <p className="mt-1 text-sm text-muted-foreground">Match every official optional subject with its marks, academic nature and preparation background.</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {optionalSubjectCards.map((card) => <GameCardButton key={card.title} card={card} />)}
              </div>
            </section>

            <section aria-labelledby="concept-matching-games">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Written-subject foundations</p>
                <h2 id="concept-matching-games" className="mt-1 font-display text-xl font-bold text-pine">Syllabus concept matching</h2>
                <p className="mt-1 text-sm text-muted-foreground">Key terms, thinkers, theories, instruments and subject fundamentals.</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {conceptMatchingCards.map((card) => <GameCardButton key={card.title} card={card} />)}
              </div>
            </section>

            <section aria-labelledby="other-study-games">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">More practice</p>
                <h2 id="other-study-games" className="mt-1 font-display text-xl font-bold text-pine">Quizzes and timelines</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {otherCards.map((card) => <GameCardButton key={card.title} card={card} />)}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
