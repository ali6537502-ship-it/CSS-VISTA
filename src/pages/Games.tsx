import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowUpDown, Check, Trophy } from 'lucide-react'
import { PageHeader, Badge } from '@/components/shared'
import QuizEngine from '@/components/QuizEngine'
import { pakistanGeography, worldGeography, internationalOrgs, constitutionTimeline, pakistanMovementTimeline, matchConcepts } from '@/data/games'
import { questions as mcqBank } from '@/data/quiz'
import type { Question } from '@/data/quiz'
import { getState, recordGameScore } from '@/lib/store'

let gid = 10000
function toQuestions(items: { question: string; options: string[]; answer: number; explanation: string }[], category: string): Question[] {
  return items.map((i, n) => ({ id: gid + n, category, difficulty: 'Medium' as const, ...i }))
}

// ---- Timeline ordering game ----
function TimelineGame({ items, title, gameId }: { items: { event: string; year: number }[]; title: string; gameId: string }) {
  const shuffled = useMemo(() => [...items].sort(() => Math.random() - 0.5), [items])
  const [order, setOrder] = useState(shuffled)
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
            <button onClick={() => { setOrder([...items].sort(() => Math.random() - 0.5)); setResult(null) }} className="rounded-md border px-4 py-2 text-sm hover:bg-secondary">Play again</button>
          </>
        )}
      </div>
    </div>
  )
}

// ---- Match the concept game ----
function MatchGame({ title, pairs, gameId }: { title: string; pairs: { concept: string; match: string }[]; gameId: string }) {
  const matches = useMemo(() => [...pairs.map((p) => p.match)].sort(() => Math.random() - 0.5), [pairs])
  const [selConcept, setSelConcept] = useState<string | null>(null)
  const [solved, setSolved] = useState<Record<string, string>>({})
  const [wrong, setWrong] = useState(0)
  const done = Object.keys(solved).length === pairs.length
  const high = getState().gameHighScores[gameId] ?? 0
  const score = Math.max(0, pairs.length * 10 - wrong * 2)

  function pickMatch(m: string) {
    if (!selConcept || Object.values(solved).includes(m)) return
    const pair = pairs.find((p) => p.concept === selConcept)
    if (pair && pair.match === m) {
      const next = { ...solved, [selConcept]: m }
      setSolved(next)
      if (Object.keys(next).length === pairs.length) recordGameScore(gameId, Math.max(0, pairs.length * 10 - wrong * 2))
    } else setWrong((w) => w + 1)
    setSelConcept(null)
  }

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-pine">{title}</h3>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Trophy className="h-3.5 w-3.5 text-amber-600" /> Best: {high}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Select a concept, then its match. Wrong attempts cost 2 points.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          {pairs.map((p) => (
            <button
              key={p.concept}
              disabled={!!solved[p.concept]}
              onClick={() => setSelConcept(p.concept)}
              className={`block w-full rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${solved[p.concept] ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : selConcept === p.concept ? 'border-emerald-700 bg-emerald-100 font-medium' : 'hover:bg-secondary'}`}
            >
              {p.concept}
              {solved[p.concept] && <span className="ml-2 text-xs text-emerald-800">→ {solved[p.concept]}</span>}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {matches.map((m) => {
            const used = Object.values(solved).includes(m)
            return (
              <button key={m} disabled={used} onClick={() => pickMatch(m)} className={`block w-full rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${used ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : selConcept ? 'hover:bg-amber-50 hover:border-amber-400' : 'opacity-70'}`}>
                {m}
              </button>
            )
          })}
        </div>
      </div>
      {done && (
        <div className="mt-4 flex items-center gap-3">
          <Badge tone="green">Completed - score {score}</Badge>
          <button onClick={() => { setSolved({}); setWrong(0); setSelConcept(null) }} className="rounded-md border px-4 py-2 text-sm hover:bg-secondary">Play again</button>
        </div>
      )}
    </div>
  )
}

type ActiveGame = { kind: 'quiz'; title: string; qs: Question[] } | { kind: 'timeline'; title: string; items: { event: string; year: number }[]; id: string } | { kind: 'match'; title: string; pairs: { concept: string; match: string }[]; id: string } | null

export default function Games() {
  const [active, setActive] = useState<ActiveGame>(null)

  const cards = [
    { title: 'Pakistan Map Challenge', desc: 'Provinces, passes, rivers, deserts and borders', badge: 'Geography', play: () => setActive({ kind: 'quiz', title: 'Pakistan Map Challenge', qs: toQuestions(pakistanGeography, 'Pakistan Geography') }) },
    { title: 'World Map Challenge', desc: 'Straits, seas, regions and borders that matter for CSS', badge: 'Geography', play: () => setActive({ kind: 'quiz', title: 'World Map Challenge', qs: toQuestions(worldGeography, 'World Geography') }) },
    { title: 'International Organisations', desc: 'UN, IMF, SCO, OIC, SAARC, WTO - members, seats, roles', badge: 'IR', play: () => setActive({ kind: 'quiz', title: 'International Organisations', qs: toQuestions(internationalOrgs, 'International Organisations') }) },
    { title: 'Subject-wise MCQ Challenge', desc: 'Random 10 from the mixed bank - English, GK, Pak Affairs, Islamiat, CA', badge: 'Mixed', play: () => setActive({ kind: 'quiz', title: 'MCQ Challenge', qs: [...mcqBank].sort(() => Math.random() - 0.5).slice(0, 10) }) },
    { title: 'Constitutional History Timeline', desc: 'Order the milestones of Pakistan’s constitutional development', badge: 'Timeline', play: () => setActive({ kind: 'timeline', title: 'Constitutional History Timeline', items: constitutionTimeline, id: 'tl-constitution' }) },
    { title: 'Pakistan Movement Timeline', desc: 'Order the events from 1857 to 1947', badge: 'Timeline', play: () => setActive({ kind: 'timeline', title: 'Pakistan Movement Timeline', items: pakistanMovementTimeline, id: 'tl-movement' }) },
    ...matchConcepts.map((m, i) => ({ title: `Match: ${m.title}`, desc: 'Pair each concept with its correct match', badge: 'Matching', play: () => setActive({ kind: 'match' as const, title: `Match: ${m.title}`, pairs: m.pairs, id: `match-${i}` }) })),
  ]

  return (
    <div>
      <PageHeader title="CSS Games" description="Fact-checked educational games with timers, scores and locally saved high scores. No entertainment fluff - every game builds exam knowledge." />
      <div className="mx-auto max-w-7xl px-4 py-10">
        {active ? (
          <div>
            <button onClick={() => setActive(null)} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline"><ArrowLeft className="h-4 w-4" /> All games</button>
            <h2 className="mb-4 font-display text-xl font-bold text-pine">{active.title}</h2>
            {active.kind === 'quiz' && <QuizEngine questions={active.qs} mode="game" category={active.title} timePerQuestion={30} />}
            {active.kind === 'timeline' && <TimelineGame items={active.items} title={active.title} gameId={active.id} />}
            {active.kind === 'match' && <MatchGame title={active.title} pairs={active.pairs} gameId={active.id} />}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <button key={c.title} onClick={c.play} className="group rounded-lg border bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-800/40 hover:shadow-md">
                <Badge tone="gray">{c.badge}</Badge>
                <h2 className="mt-2 font-semibold text-foreground group-hover:text-pine">{c.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
