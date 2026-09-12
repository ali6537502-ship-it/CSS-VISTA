import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link } from 'react-router'
import {
  BookOpen, Brain, Calculator, Clock, FileText, Globe2, Languages, Layers,
  LockKeyhole, MoonStar, Shuffle, Upload,
} from 'lucide-react'
import { PageHeader, Section, OfficialNotice, Badge } from '@/components/shared'
import { questions as seedQuestions, quizCategories } from '@/data/quiz'
import QuizEngine from '@/components/QuizEngine'
import { DAILY_MOCK_TIME_LABELS, getMockAvailability, getState } from '@/lib/store'
import { mergedMcqs } from '@/lib/admin'
import { shippedMcqSummary } from '@/data/mcqMeta'
import { getBankIndex, type BankIndex } from '@/data/mcq'
import { usePageBack } from '@/lib/backNavigation'
import { mptQuestionBanks, mptQuestionBankPath } from '@/data/mptQuestionBanks'

type Mode = 'subject' | 'topic' | 'random' | 'mock' | null

interface MptStudyUnit {
  label: string
  bankId: string
  slugs: string[]
}

interface MptStudyArea {
  title: string
  bankId: string
  marks: number
  description: string
  icon: ComponentType<{ className?: string }>
  units: MptStudyUnit[]
  curatedCategories?: string[]
}

const mptStudyAreas: MptStudyArea[] = [
  {
    title: 'Islamic Studies / Civics & Ethics',
    bankId: 'islamiat',
    marks: 20,
    description: 'Islamic Studies for Muslim candidates; the official Civics & Ethics alternative applies to non-Muslim candidates.',
    icon: MoonStar,
    units: [{ label: 'Islamic Studies', bankId: 'islamiat', slugs: ['islamic-gk'] }],
  },
  {
    title: 'Urdu',
    bankId: 'urdu',
    marks: 20,
    description: 'Urdu grammar usage, vocabulary and translation practice.',
    icon: Languages,
    units: [{ label: 'Urdu Language', bankId: 'urdu', slugs: ['urdu-language'] }],
  },
  {
    title: 'English',
    bankId: 'english',
    marks: 50,
    description: 'Vocabulary, grammar usage, sentence correction and comprehension.',
    icon: BookOpen,
    units: [{ label: 'English Grammar', bankId: 'english', slugs: ['english-grammar'] }],
  },
  {
    title: 'General Abilities',
    bankId: 'abilities',
    marks: 60,
    description: 'SSC-level quantitative ability plus logical, analytical and mental ability.',
    icon: Calculator,
    units: [],
    curatedCategories: ['abilities', 'reasoning'],
  },
  {
    title: 'General Knowledge',
    bankId: 'mpt-gk',
    marks: 50,
    description: 'Only the three General Knowledge areas named in the FPSC MPT syllabus.',
    icon: Globe2,
    units: [
      { label: 'Everyday Science', bankId: 'science', slugs: ['everyday-science'] },
      { label: 'Current Affairs', bankId: 'current', slugs: ['current-affairs'] },
      { label: 'Pakistan Affairs', bankId: 'pakistan', slugs: ['pakistan-affairs', 'pakistan-history', 'pakistan-geography'] },
    ],
  },
]

export default function MPTPrep() {
  const allQuestions = useMemo(() => mergedMcqs(seedQuestions), [])
  const [bankIndex, setBankIndex] = useState<BankIndex | null>(null)
  const [mode, setMode] = useState<Mode>(null)
  usePageBack(Boolean(mode), () => setMode(null))
  const [category, setCategory] = useState('mixed')
  const [topic, setTopic] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [count, setCount] = useState(10)
  const [timed, setTimed] = useState(true)
  const [negative, setNegative] = useState(false)
  const [randomQuestions, setRandomQuestions] = useState<typeof allQuestions>([])
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    getBankIndex().then(setBankIndex)
  }, [])

  useEffect(() => {
    // `now` only gates mock availability and a minute-precision "opens at"
    // label, so a one-second tick re-rendered the whole page for nothing.
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    const resync = () => setNow(new Date())
    document.addEventListener('visibilitychange', resync)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', resync)
    }
  }, [])

  const bankCount = (slugs: string[]) => (
    bankIndex?.categories
      .filter((bankCategory) => slugs.includes(bankCategory.slug))
      .reduce((total, bankCategory) => total + bankCategory.count, 0) ?? 0
  )

  const topicsForCategory = useMemo(() => {
    const pool = category === 'mixed' ? allQuestions : allQuestions.filter((q) => q.category === category)
    return [...new Set(pool.map((q) => q.topic).filter(Boolean))] as string[]
  }, [category, allQuestions])

  const pool = useMemo(() => {
    let p = allQuestions
    if (category !== 'mixed') p = p.filter((q) => q.category === category)
    if (topic !== 'all') p = p.filter((q) => q.topic === topic)
    if (difficulty !== 'all') p = p.filter((q) => q.difficulty === difficulty)
    return p
  }, [category, topic, difficulty, allQuestions])

  const history = getState().quizResults.filter((r) => r.type === 'mpt' || r.type === 'quiz').slice(0, 8)
  const bookmarked = getState().bookmarks.filter((b) => b.startsWith('q-')).length
  const mptMock = getMockAvailability('mpt', now)

  function startMode(nextMode: Mode) {
    if (nextMode === 'random' || nextMode === 'mock') {
      const limit = nextMode === 'mock' ? Math.min(50, allQuestions.length) : count
      setRandomQuestions([...allQuestions].sort(() => Math.random() - 0.5).slice(0, limit))
    }
    setMode(nextMode)
  }

  const activeQuestions = mode === 'random' || mode === 'mock'
    ? randomQuestions
    : pool.slice(0, count)

  return (
    <div>
      <PageHeader
        title="MPT Preparation"
        description={`Subject-wise and topic-wise MCQ practice, timed quizzes and full mock tests. The curated MPT bank contains ${allQuestions.length} hand-checked questions, and every subject below also draws from the central GK World bank of ${shippedMcqSummary} wherever the FPSC MPT syllabus reaches.`}
      />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
        <OfficialNotice />

        {!mode ? (
          <>
            {/* Mode cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { id: 'subject' as Mode, icon: Layers, title: 'Subject / topic-wise quiz', desc: 'Choose a subject, then narrow to a topic' },
                { id: 'random' as Mode, icon: Shuffle, title: 'Random quiz', desc: 'A shuffled mix from the whole bank' },
                { id: 'mock' as Mode, icon: Clock, title: 'Full MPT mock test', desc: '200 questions in official section order' },
              ].map((m) => {
                if (m.id === 'mock') {
                  return mptMock.available ? (
                    <Link
                      key={m.title}
                      to="/gk/quiz?mode=mpt-mock"
                      data-google-vignette="false"
                      className="group rounded-lg border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-800/40 hover:shadow-md"
                    >
                      <m.icon className="h-5 w-5 text-emerald-800" />
                      <div className="mt-2 font-semibold group-hover:text-pine">{m.title}</div>
                      <div className="mt-0.5 text-[13px] text-muted-foreground">200 questions · 200 minutes · official FPSC sequence. Daily entry from {DAILY_MOCK_TIME_LABELS.mpt}.</div>
                    </Link>
                  ) : (
                    <div key={m.title} className="rounded-lg border bg-secondary/45 p-4 text-left">
                      <LockKeyhole className="h-5 w-5 text-amber-700" />
                      <div className="mt-2 font-semibold">{m.title}</div>
                      <div className="mt-0.5 text-[13px] text-muted-foreground">
                        Opens {new Date(mptMock.nextAvailableAt!).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                  )
                }
                return (
                  <button key={m.title} onClick={() => startMode(m.id)} className="group rounded-lg border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-800/40 hover:shadow-md">
                    <m.icon className="h-5 w-5 text-emerald-800" />
                    <div className="mt-2 font-semibold group-hover:text-pine">{m.title}</div>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">{m.desc}</div>
                  </button>
                )
              })}
              <div className="rounded-lg border bg-secondary/60 p-4">
                <FileText className="h-5 w-5 text-emerald-800" />
                <div className="mt-2 font-semibold">Daily MCQ challenge</div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">
                  One fresh challenge every day - inside{' '}
                  <Link to="/grammar-vocabulary" className="font-medium text-emerald-800 underline underline-offset-2">Vocabulary and Daily Challenge</Link>.
                </div>
              </div>
            </div>

            {/* Official MPT paper areas backed by the central GK bank */}
            <Section
              title="Prepare MPT"
              description={`Study only the five official MPT paper areas. Available MCQs are fetched from the same central GK World bank of ${shippedMcqSummary}, so progress and corrections stay consistent across both sections.`}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {mptStudyAreas.map((area) => {
                  const Icon = area.icon
                  const allSlugs = area.units.flatMap((unit) => unit.slugs)
                  const total = area.curatedCategories
                    ? allQuestions.filter((question) => area.curatedCategories?.includes(question.category)).length
                    : bankCount(allSlugs)

                  return (
                    <article key={area.title} className="flex min-h-full flex-col rounded-xl border bg-white p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-800">
                            <Icon className="h-5 w-5" />
                          </span>
                          <h3 className="font-display text-lg font-bold leading-tight text-pine">{area.title}</h3>
                        </div>
                        <Badge tone="gold">{area.marks} marks</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{area.description}</p>

                      {area.units.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {area.units.map((unit) => {
                            const countForUnit = bankCount(unit.slugs)
                            return (
                              <Link
                                key={unit.label}
                                to={mptQuestionBankPath(unit.bankId)}
                                className="flex items-center justify-between gap-3 rounded-lg border bg-secondary/35 px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-emerald-700/40 hover:bg-emerald-50"
                              >
                                <span>{unit.label}</span>
                                <span className="shrink-0 text-xs font-bold text-emerald-800">
                                  {bankIndex ? `${countForUnit.toLocaleString()} MCQs` : 'Loading…'}
                                </span>
                              </Link>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {[
                            { label: 'Quantitative Ability', category: 'abilities', icon: Calculator },
                            { label: 'Logical & Analytical', category: 'reasoning', icon: Brain },
                          ].map((unit) => {
                            const UnitIcon = unit.icon
                            const unitCount = mptQuestionBanks[unit.category]?.expectedCount
                              ?? allQuestions.filter((question) => question.category === unit.category).length
                            return (
                              <Link
                                key={unit.category}
                                to={mptQuestionBankPath(unit.category)}
                                className="rounded-lg border bg-secondary/35 p-3 text-left transition-colors hover:border-emerald-700/40 hover:bg-emerald-50"
                              >
                                <UnitIcon className="h-4 w-4 text-emerald-800" />
                                <span className="mt-2 block text-xs font-semibold leading-snug">{unit.label}</span>
                                <span className="mt-1 block text-[11px] font-bold text-emerald-800">{unitCount} MCQs</span>
                              </Link>
                            )
                          })}
                        </div>
                      )}

                      <div className="mt-auto pt-4">
                        {area.curatedCategories ? (
                          <p className="text-xs font-medium text-emerald-800">
                            Choose Quantitative Ability or Logical &amp; Analytical practice above.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to={mptQuestionBankPath(area.bankId)}
                              className="inline-flex h-9 items-center rounded-md bg-pine px-4 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"
                            >
                              Practise {area.units.length === 1 ? area.units[0].label : area.title}
                            </Link>
                            {(area.title === 'Urdu' || area.title === 'English') && (
                              <Link
                                to={`/language-grammar?lang=${area.title.toLowerCase()}`}
                                className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-semibold text-pine hover:bg-secondary"
                              >
                                Study grammar rules
                              </Link>
                            )}
                          </div>
                        )}
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {!area.curatedCategories && !bankIndex
                            ? 'Loading available question count…'
                            : `${total.toLocaleString()} available question${total === 1 ? '' : 's'}`}
                        </p>
                      </div>
                    </article>
                  )
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {mptMock.available ? (
                  <Link
                    to="/gk/quiz?mode=mpt-mock"
                    data-google-vignette="false"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-pine px-4 text-sm font-semibold text-emerald-50 hover:bg-emerald-900"
                  >
                    <Clock className="h-4 w-4" /> Start the scheduled MPT mock
                  </Link>
                ) : (
                  <span className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-secondary px-4 text-sm font-semibold text-muted-foreground">
                    <LockKeyhole className="h-4 w-4" /> MPT mock opens {new Date(mptMock.nextAvailableAt!).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                )}
                <Link to="/gk" className="inline-flex h-9 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-pine hover:bg-secondary">
                  Open GK World
                </Link>
              </div>
            </Section>

            {/* Category counts */}
            <Section title="Question bank by subject" description={`Open the complete source question bank for each subject—not a short random quiz. Central categories use the shipped ${shippedMcqSummary} bank, while General Science & Ability uses its verified owner-supplied bank.`}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {quizCategories.map((c) => {
                  const definition = mptQuestionBanks[c.id]
                  if (!definition) return null
                  const centralCount = bankCount(definition.centralSlugs ?? [])
                  const n = definition.expectedCount || centralCount || allQuestions.filter((q) => q.category === c.id).length
                  return (
                    <Link
                      key={c.id}
                      to={mptQuestionBankPath(c.id)}
                      className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-left text-sm transition-colors hover:bg-secondary/60"
                    >
                      <span>{c.icon} {c.name}</span>
                      <Badge tone="gray">{definition.centralSlugs && !bankIndex ? '…' : n.toLocaleString()}</Badge>
                    </Link>
                  )
                })}
              </div>
            </Section>

            {/* Filters (visible pre-selection for subject mode) */}
            <Section title="Custom test settings" description="Used for subject/topic quizzes; the mock test mixes everything automatically.">
              <div className="rounded-lg border bg-white p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block text-sm font-medium">Subject
                    <select value={category} onChange={(e) => { setCategory(e.target.value); setTopic('all') }} className="mt-1.5 h-10 w-full rounded-md border border-input px-3 text-sm">
                      <option value="mixed">Mixed (all subjects)</option>
                      {quizCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">Topic
                    <select value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-input px-3 text-sm">
                      <option value="all">All topics</option>
                      {topicsForCategory.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">Difficulty
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-input px-3 text-sm">
                      <option value="all">All levels</option><option>Easy</option><option>Medium</option><option>Hard</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium">Questions: <span className="font-bold text-pine">{count}</span>
                    <input type="range" min={5} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-2 w-full accent-emerald-800" />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-4 w-4 accent-emerald-800" />
                    Timed (60s per question)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={negative} onChange={(e) => setNegative(e.target.checked)} className="h-4 w-4 accent-emerald-800" />
                    Negative marking practice (−0.25)
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => setMode('subject')} disabled={pool.length === 0} className="h-11 rounded-md bg-pine px-6 text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-900 disabled:opacity-50">
                    Start quiz ({pool.length} in pool)
                  </button>
                  <button onClick={() => startMode('random')} className="h-11 rounded-md border px-6 text-sm font-semibold hover:bg-secondary">Random quiz</button>
                  {mptMock.available ? (
                    <Link
                      to="/gk/quiz?mode=mpt-mock"
                      data-google-vignette="false"
                      className="inline-flex h-11 items-center rounded-md border px-6 text-sm font-semibold hover:bg-secondary"
                    >
                      Full mock test
                    </Link>
                  ) : (
                    <button type="button" disabled className="h-11 rounded-md border px-6 text-sm font-semibold opacity-50">Mock locked</button>
                  )}
                </div>
              </div>
            </Section>

            <div className="rounded-lg border bg-secondary/50 p-5 text-sm">
              <span className="font-semibold text-pine">{bookmarked}</span> saved questions for revision · Wrong answers can be retried after every test · All scores feed the{' '}
              <Link to="/dashboard" className="font-medium text-emerald-800 underline underline-offset-2">Performance Dashboard</Link>.
              <span className="mt-1 block text-xs text-muted-foreground">
                Site owner: upload thousands of MCQs at once via Admin → MCQ Bulk Upload (Excel/CSV). <Upload className="inline h-3 w-3" />
              </span>
            </div>

            {history.length > 0 && (
              <Section title="Recent attempts" description="Saved locally in your browser.">
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr><th className="px-4 py-2.5">Test</th><th className="px-4 py-2.5">Score</th><th className="px-4 py-2.5">Date</th></tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id} className="border-t">
                          <td className="px-4 py-2.5">{h.category}</td>
                          <td className="px-4 py-2.5 font-semibold text-pine">{h.score}/{h.total} ({Math.round((h.score / h.total) * 100)}%)</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{new Date(h.date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}
          </>
        ) : (
          <div>
            <button onClick={() => setMode(null)} className="mb-4 text-sm font-medium text-emerald-800 hover:underline">← Back to MPT menu</button>
            <QuizEngine
              questions={activeQuestions}
              mode="mpt"
              category={
                mode === 'mock' ? 'Full MPT Mock'
                : mode === 'random' ? 'Random Quiz'
                : category === 'mixed' ? (topic !== 'all' ? `Topic: ${topic}` : 'Mixed MPT')
                : `${quizCategories.find((c) => c.id === category)?.name ?? 'MPT'}${topic !== 'all' ? ` - ${topic}` : ''}`
              }
              timePerQuestion={mode === 'mock' ? 60 : timed ? 60 : 0}
              negativeMarking={negative}
            />
          </div>
        )}
      </div>
    </div>
  )
}
