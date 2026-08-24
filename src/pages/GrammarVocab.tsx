import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, Flame, Zap } from 'lucide-react'
import { PageHeader, Badge } from '@/components/shared'
import { grammarTopics, pairOfWords, idioms, oneWordSubstitutions } from '@/data/grammar'
import { vocabulary } from '@/data/vocab'
import { getDailyChallenge } from '@/data/challenges'
import { questions } from '@/data/quiz'
import type { Question } from '@/data/quiz'
import QuizEngine from '@/components/QuizEngine'
import { completeChallenge, getState, recordQuizResult } from '@/lib/store'
import { isRtlText } from '@/lib/utils'

const tabs = ['Daily Challenge', 'Word Bank', 'Commonly Confused', 'Phrasal Verbs', 'Idioms & Phrases', 'One-Word Substitutions', 'Grammar Lessons', 'Quizzes'] as const

const phrasalVerbs: { verb: string; meaning: string; sentence: string }[] = [
  { verb: 'Account for', meaning: 'to explain; to make up (a proportion)', sentence: 'Remittances account for a significant share of foreign exchange.' },
  { verb: 'Bring about', meaning: 'to cause to happen', sentence: 'Land reforms brought about a visible change in rural incomes.' },
  { verb: 'Call for', meaning: 'to demand or require', sentence: 'The water crisis calls for immediate policy action.' },
  { verb: 'Carry out', meaning: 'to conduct or execute', sentence: 'The commission carried out a detailed inquiry.' },
  { verb: 'Come across', meaning: 'to find by chance', sentence: 'She came across a rare document in the archives.' },
  { verb: 'Cut down on', meaning: 'to reduce', sentence: 'The budget aims to cut down on non-development spending.' },
  { verb: 'Give rise to', meaning: 'to cause or produce', sentence: 'Load-shedding gave rise to widespread protests.' },
  { verb: 'Look into', meaning: 'to investigate', sentence: 'The committee promised to look into the irregularities.' },
  { verb: 'Put forward', meaning: 'to propose', sentence: 'He put forward a pragmatic reform plan.' },
  { verb: 'Rule out', meaning: 'to exclude as impossible', sentence: 'The minister ruled out early elections.' },
]

const confusedWords: { pair: string; explanation: string }[] = [
  { pair: 'Economic / Economical', explanation: 'Economic = relating to the economy (economic policy). Economical = saving money/resources (an economical car).' },
  { pair: 'Historic / Historical', explanation: 'Historic = famous or important in history (a historic verdict). Historical = belonging to the past (historical records).' },
  { pair: 'Continuous / Continual', explanation: 'Continuous = without interruption (continuous rain). Continual = repeated with breaks (continual interruptions).' },
  { pair: 'Principal / Principle', explanation: 'Principal = head/main. Principle = a rule or belief.' },
  { pair: 'Credible / Creditable', explanation: 'Credible = believable (a credible source). Creditable = deserving praise (a creditable attempt).' },
  { pair: 'Prescribe / Proscribe', explanation: 'Prescribe = to recommend/order (prescribe medicine). Proscribe = to forbid (a proscribed organisation).' },
  { pair: 'Averse / Adverse', explanation: 'Averse = opposed to (averse to risk). Adverse = unfavourable (adverse effects).' },
  { pair: 'Comprise / Compose', explanation: 'The whole comprises its parts; the parts compose the whole. “Comprised of” is widely considered incorrect in formal writing.' },
]

export default function GrammarVocab() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Daily Challenge')
  const [topic, setTopic] = useState(grammarTopics[0].slug)
  const [quiz, setQuiz] = useState<null | { title: string; qs: Question[] }>(null)
  const [search, setSearch] = useState('')
  const [partOfSpeech, setPartOfSpeech] = useState('All')
  const [wordPage, setWordPage] = useState(0)
  const active = grammarTopics.find((t) => t.slug === topic)!

  // Daily challenge state
  const today = new Date().toISOString().slice(0, 10)
  const challenge = useMemo(() => getDailyChallenge(new Date()), [])
  const mcq = questions.find((q) => q.id === challenge.mcqId) ?? questions[0]
  const mcqRtl = isRtlText(mcq.question)
  const word = vocabulary[challenge.vocabIndex]
  const [selected, setSelected] = useState<number | null>(null)
  const [done, setDone] = useState(() => getState().completedChallenges.includes(today))
  const streak = getState().streakDays

  const partsOfSpeech = useMemo(() => ['All', ...new Set(vocabulary.map((word) => word.pos).filter(Boolean))].sort(), [])
  const filteredVocab = vocabulary.filter((v) => (partOfSpeech === 'All' || v.pos === partOfSpeech) && (!search || v.word.toLowerCase().includes(search.toLowerCase()) || v.meaning.toLowerCase().includes(search.toLowerCase())))
  const wordPageCount = Math.max(1, Math.ceil(filteredVocab.length / 60))
  const visibleVocab = filteredVocab.slice(wordPage * 60, wordPage * 60 + 60)
  const englishQs = questions.filter((q) => q.category === 'english')
  const grammarQs = questions.filter((q) => ['english', 'grammar', 'correction'].includes(q.category))

  function submitDaily() {
    if (selected === null) return
    setDone(true)
    completeChallenge(today)
    recordQuizResult({ type: 'challenge', category: 'Daily Challenge', score: selected === mcq.answer ? 1 : 0, total: 1 })
  }

  return (
    <div>
      <PageHeader
        title="Vocabulary and Daily Challenge"
        description={`${vocabulary.length.toLocaleString()} source-backed vocabulary records with usage, confused words, idioms, phrasal verbs, substitutions, grammar lessons and quizzes.`}
      />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap gap-1.5 border-b pb-3">
          {tabs.map((t) => (
            <button key={t} onClick={() => { setTab(t); setQuiz(null) }} className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${tab === t ? 'bg-pine text-emerald-50' : 'bg-secondary hover:bg-emerald-100'}`}>{t}</button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'Daily Challenge' && (
            <div className="mx-auto max-w-3xl space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                {streak > 0 && <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700"><Flame className="h-4 w-4" /> {streak}-day streak</span>}
                {done && <Badge>Today completed</Badge>}
                <Link to="/five-minute" className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-pine px-3 py-1.5 text-xs font-bold text-emerald-50 hover:bg-emerald-900">
                  <Zap className="h-3.5 w-3.5" /> Daily Five-Minute Challenge
                </Link>
                <Link to="/gk/quiz?mode=daily" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold text-pine hover:bg-secondary">
                  Daily GK Challenge
                </Link>
              </div>
              {/* Word of the Day */}
              <div className="rounded-lg border bg-white p-5">
                <div className="text-sm font-semibold text-pine">Word of the Day</div>
                <div className="mt-2 font-display text-3xl font-bold text-pine">{word.word} <span className="font-sans text-sm font-normal text-muted-foreground">({word.pos})</span></div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div><dt className="inline font-semibold">Meaning: </dt><dd className="inline">{word.meaning}</dd></div>
                  <div><dt className="inline font-semibold">Synonyms: </dt><dd className="inline">{word.synonyms.join(', ')}</dd></div>
                  <div><dt className="inline font-semibold">Antonyms: </dt><dd className="inline">{word.antonyms.join(', ')}</dd></div>
                </dl>
                <p className="mt-2 rounded bg-secondary/70 px-3 py-2 text-sm italic">CSS-style sentence: “{word.sentence}”</p>
              </div>
              {/* Daily MCQ */}
              <div className="rounded-lg border bg-white p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-pine">Today’s MCQ <Badge tone="gray">{mcq.difficulty}</Badge></div>
                <p
                  dir={mcqRtl ? 'rtl' : undefined}
                  lang={mcqRtl ? 'ur' : undefined}
                  className={`mt-3 text-[15px] font-medium ${mcqRtl ? 'urdu-text text-right' : ''}`}
                >
                  {mcq.question}
                </p>
                <div className="mt-3 grid gap-2">
                  {mcq.options.map((o, oi) => {
                    const optionRtl = isRtlText(o)
                    const isAns = oi === mcq.answer
                    const isSel = oi === selected
                    return (
                      <button
                        key={oi} disabled={done} onClick={() => setSelected(oi)}
                        dir={optionRtl ? 'rtl' : undefined}
                        lang={optionRtl ? 'ur' : undefined}
                        className={`rounded-md border px-4 py-2.5 text-sm transition-colors ${optionRtl ? 'urdu-text text-right' : 'text-left'} ${
                          done && isAns ? 'border-emerald-700 bg-emerald-100 font-medium text-emerald-900'
                          : done && isSel && !isAns ? 'border-red-400 bg-red-50 text-red-900'
                          : isSel ? 'border-emerald-700 bg-emerald-50' : 'hover:bg-secondary/60'
                        }`}
                      >
                        {o}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Analytical */}
              <div className="rounded-lg border bg-white p-5">
                <div className="text-sm font-semibold text-pine">Analytical question <Badge tone="gray">{challenge.analyticalSubject}</Badge></div>
                <p className="mt-2 text-[15px]">{challenge.analyticalQuestion}</p>
              </div>
              {!done && (
                <button onClick={submitDaily} disabled={selected === null} className="inline-flex items-center gap-2 rounded-md bg-pine px-6 py-2.5 text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-900 disabled:opacity-50">
                  <CheckCircle2 className="h-4 w-4" /> Submit today’s challenge
                </button>
              )}
            </div>
          )}

          {tab === 'Word Bank' && (
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><input value={search} onChange={(e) => { setSearch(e.target.value); setWordPage(0) }} placeholder="Search words or meanings…" className="h-10 w-full max-w-md rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-ring" aria-label="Search vocabulary" /><select value={partOfSpeech} onChange={(e) => { setPartOfSpeech(e.target.value); setWordPage(0) }} className="h-10 rounded-md border bg-white px-3 text-sm" aria-label="Filter vocabulary by part of speech">{partsOfSpeech.map((value) => <option key={value}>{value}</option>)}</select><span className="text-xs font-bold text-emerald-800">{filteredVocab.length.toLocaleString()} verified entries</span></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleVocab.map((v) => (
                  <div key={v.word} className="rounded-lg border bg-white p-4">
                    <div className="font-display text-lg font-bold text-pine">{v.word} <span className="font-sans text-xs font-normal text-muted-foreground">({v.pos})</span></div>
                    <p className="mt-1 text-sm">{v.meaning}</p>
                    {v.synonyms.length > 0 && <p className="mt-2 text-xs text-muted-foreground"><strong>Synonyms:</strong> {v.synonyms.join(', ')}</p>}
                    {v.antonyms.length > 0 && <p className="mt-1 text-xs text-muted-foreground"><strong>Antonyms:</strong> {v.antonyms.join(', ')}</p>}
                    {v.sentence && <p className="mt-2 text-[13px] italic text-foreground/80">“{v.sentence}”</p>}
                    {v.source && <p className="mt-2 text-[9px] leading-relaxed text-slate-400">Source: {v.source}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-center gap-3"><button type="button" disabled={wordPage === 0} onClick={() => setWordPage((value) => Math.max(0, value - 1))} className="rounded-md border px-3 py-2 text-xs font-bold disabled:opacity-40">Previous</button><span className="text-xs text-muted-foreground">Page {wordPage + 1} of {wordPageCount}</span><button type="button" disabled={wordPage >= wordPageCount - 1} onClick={() => setWordPage((value) => Math.min(wordPageCount - 1, value + 1))} className="rounded-md bg-pine px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Next</button></div>
            </div>
          )}

          {tab === 'Commonly Confused' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-lg font-bold text-pine">Pair of words (with usage)</h3>
                <div className="mt-3 space-y-3">
                  {pairOfWords.map((p) => (
                    <div key={p.a} className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2">
                      {[p.a, p.b].map((w, i) => (
                        <div key={w}>
                          <div className="font-semibold text-pine">{w}</div>
                          <p className="text-sm text-muted-foreground">{i === 0 ? p.aMeaning : p.bMeaning}</p>
                          <p className="mt-1 text-[13px] italic">“{i === 0 ? p.aSentence : p.bSentence}”</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-pine">Commonly confused words</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {confusedWords.map((c) => (
                    <div key={c.pair} className="rounded-lg border bg-white p-4">
                      <div className="font-semibold text-pine">{c.pair}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{c.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'Phrasal Verbs' && (
            <div className="grid gap-2 sm:grid-cols-2">
              {phrasalVerbs.map((p) => <div key={p.verb} className="rounded-lg border bg-white p-4"><div className="font-semibold text-pine">{p.verb}</div><p className="text-sm text-muted-foreground">{p.meaning}</p><p className="mt-1 text-[13px] italic">“{p.sentence}”</p></div>)}
            </div>
          )}

          {tab === 'Idioms & Phrases' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {idioms.map((i) => (
                <div key={i.idiom} className="rounded-lg border bg-white p-4">
                  <div className="font-semibold text-pine">{i.idiom}</div>
                  <p className="mt-1 text-sm">{i.meaning}</p>
                  <p className="mt-2 text-[13px] italic text-muted-foreground">“{i.sentence}”</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'One-Word Substitutions' && (
            <div className="grid gap-2 sm:grid-cols-2">
              {oneWordSubstitutions.map((o) => (
                <div key={o.word} className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm">
                  <span>{o.phrase}</span>
                  <Badge>{o.word}</Badge>
                </div>
              ))}
            </div>
          )}

          {tab === 'Grammar Lessons' && (
            <div className="grid gap-6 lg:grid-cols-4">
              <div className="space-y-1.5">
                {grammarTopics.map((t) => (
                  <button key={t.slug} onClick={() => setTopic(t.slug)} className={`block w-full rounded-md px-3.5 py-2.5 text-left text-sm ${topic === t.slug ? 'bg-pine font-medium text-emerald-50' : 'bg-secondary hover:bg-emerald-100'}`}>{t.name}</button>
                ))}
              </div>
              <div className="space-y-5 lg:col-span-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold text-pine">{active.name}</h2>
                  <Badge tone="green">{active.source}</Badge>
                </div>
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{active.summary}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-white p-4">
                    <h3 className="text-sm font-semibold text-pine">Rules</h3>
                    <ul className="mt-2 space-y-3">
                      {active.rules.map((r) => (
                        <li key={r.rule} className="text-sm">
                          {r.rule}
                          <div className="mt-0.5 rounded bg-secondary/70 px-2 py-1 text-[13px] italic text-foreground/80">{r.example}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <h3 className="text-sm font-semibold text-pine">Sentence correction</h3>
                    <ul className="mt-2 space-y-3">
                      {active.commonErrors.map((e) => (
                        <li key={e.wrong} className="text-sm">
                          <div className="text-red-700 line-through decoration-red-400/60">{e.wrong}</div>
                          <div className="font-medium text-emerald-800">{e.right}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{e.note}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'Quizzes' && (
            <div className="max-w-3xl">
              {quiz ? (
                <div>
                  <button onClick={() => setQuiz(null)} className="mb-4 text-sm font-medium text-emerald-800 hover:underline">← All quizzes</button>
                  <QuizEngine questions={quiz.qs} mode="quiz" category={quiz.title} timePerQuestion={60} />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { title: 'Weekly vocabulary quiz', desc: `${englishQs.length} questions - synonyms, antonyms, usage`, qs: englishQs },
                    { title: 'Daily grammar quiz', desc: `${grammarQs.length} questions - correction, tenses, agreement`, qs: grammarQs },
                  ].map((q) => (
                    <button key={q.title} onClick={() => setQuiz({ title: q.title, qs: q.qs })} className="rounded-lg border bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className="font-semibold text-pine">{q.title}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{q.desc}</p>
                      <span className="mt-3 inline-block rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50">Start</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
