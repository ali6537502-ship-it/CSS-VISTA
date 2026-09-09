import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Award, BookOpen, Brain, CalendarDays, ClipboardList, Coins, Compass, Cpu, Flag,
  Globe, History, Landmark, Layers, MapPin, Medal, Microscope, Moon, Mountain, Shuffle,
  Star, Sun, Target, Timer, TrendingUp, Trophy, Users, Waves, Zap, Bookmark, AlertTriangle,
  CircleHelp, Sparkles, Dices, SlidersHorizontal, Search, Building2, Scroll, HeartPulse,
  Languages, LockKeyhole, RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/shared'
import { getBankIndex, type BankIndex } from '@/data/mcq'
import { getMistakes, getRevisionStats, savedMcqIds } from '@/lib/progress'
import { mergedCategoryOverrides } from '@/lib/admin'
import { DAILY_MOCK_TIME_LABELS, getMockAvailability } from '@/lib/store'

const catIcons: Record<string, LucideIcon> = {
  'world-geography': Globe, 'pakistan-geography': MapPin, mountains: Mountain, rivers: Waves,
  'oceans-seas': Waves, deserts: Sun, islands: Compass, 'straits-canals': Waves,
  capitals: Landmark, currencies: Coins, 'countries-continents': Globe, flags: Flag,
  'international-borders': MapPin, 'important-cities': Building2, 'famous-places': Landmark,
  'world-history': History, 'pakistan-history': History, 'pakistan-affairs': Flag,
  'first-world': Star, 'first-pakistan': Star,
  'largest-longest': TrendingUp, 'important-personalities': Users, 'discoveries-inventions': Sparkles,
  'books-authors': BookOpen, 'awards-honours': Award, 'international-organisations': Globe,
  'united-nations': Globe, science: Microscope, 'everyday-science': HeartPulse,
  'solar-system': Moon, environment: Sun, economics: Coins, 'constitutions-political': Scroll,
  'national-symbols': Medal, sports: Trophy, 'important-days': CalendarDays, 'islamic-gk': Moon,
  'computer-basics': Cpu, 'misc-gk': Layers, 'current-affairs': CalendarDays,
  'english-grammar': BookOpen, 'urdu-language': Languages,
}

const modes = [
  { id: 'one-liner', icon: BookOpen, title: '30,491 One-Liner GK Questions', desc: 'Clear fact cards organised by subject', to: '/one-liner-gk' },
  { id: 'daily', icon: CalendarDays, title: 'Daily GK Challenge', desc: '10 fresh questions every day', to: '/gk/quiz?mode=daily' },
  { id: 'five', icon: Zap, title: 'Five-Minute Challenge', desc: '10 questions against the clock', to: '/five-minute' },
  { id: 'random', icon: Shuffle, title: 'Random GK Quiz', desc: 'A shuffled mix from the whole bank', to: '/gk/quiz?mode=random' },
  { id: 'timed', icon: Timer, title: 'Timed Quiz', desc: 'Set your pace, race the clock', to: '/gk/quiz?mode=timed' },
  { id: 'pms-mock', icon: ClipboardList, title: 'PMS GK Grand Mock', desc: '100 questions · daily entry 8–10 PM', to: '/gk/quiz?mode=pms-mock' },
  { id: 'one-paper', icon: Target, title: 'One-Paper Competitive Mock', desc: '100 curated MCQs · 90 minutes', to: '/gk/quiz?mode=one-paper' },
  { id: 'revision', icon: RefreshCw, title: 'Smart Revision Queue', desc: 'Due questions selected by spaced revision', to: '/gk/quiz?mode=revision' },
  { id: 'weak', icon: Target, title: 'Weak-Area Practice', desc: 'Built from your mistake history', to: '/gk/quiz?mode=weak' },
  { id: 'saved', icon: Bookmark, title: 'Saved Questions', desc: 'Your bookmarked MCQs', to: '/gk/quiz?mode=saved' },
  { id: 'wrong', icon: AlertTriangle, title: 'Wrong Answers', desc: 'Retry what you got wrong', to: '/gk/quiz?mode=wrong' },
  { id: 'unattempted', icon: CircleHelp, title: 'Unattempted Questions', desc: 'Questions you have not tried yet', to: '/gk/quiz?mode=unattempted' },
  { id: 'recent', icon: Sparkles, title: 'Recently Added', desc: 'The newest questions in the bank', to: '/gk/quiz?mode=recent' },
  { id: 'difficult', icon: Brain, title: 'Difficult Questions', desc: 'Advanced-level only', to: '/gk/quiz?mode=difficult' },
  { id: 'mixed', icon: Dices, title: 'Mixed Category Quiz', desc: 'Several categories together', to: '/gk/quiz?mode=mixed' },
  { id: 'custom', icon: SlidersHorizontal, title: 'Custom Quiz Generator', desc: 'You choose everything', to: '/gk/quiz?mode=custom' },
]

export default function GKWorld() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [idx, setIdx] = useState<BankIndex | null>(null)
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [now, setNow] = useState(() => new Date())
  const mistakes = getMistakes().length
  const saved = savedMcqIds().length
  const revisionStats = getRevisionStats()
  const pmsMock = getMockAvailability('gk', now)

  useEffect(() => {
    getBankIndex().then(setIdx)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const next = new URLSearchParams()
    if (query.trim()) next.set('q', query.trim())
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [query, searchParams, setSearchParams])

  const cats = useMemo(() => {
    if (!idx) return []
    const overrides = mergedCategoryOverrides()
    return idx.categories
      .map((c) => {
        const o = overrides.find((x) => x.slug === c.slug)
        return { ...c, name: o?.name || c.name, hidden: o?.hidden ?? false }
      })
      .filter((c) => !c.hidden)
  }, [idx])

  const filtered = useMemo(() => {
    if (!query.trim()) return cats
    const q = query.toLowerCase()
    return cats.filter((c) => c.name.toLowerCase().includes(q))
  }, [cats, query])

  return (
    <div>
      <PageHeader
        title="GK World"
        description={`A complete general-knowledge practice portal - ${idx ? idx.total.toLocaleString() : '…'} verified MCQs across ${cats.length} categories, with daily challenges, timed quizzes, a mistake notebook and smart practice modes.`}
      />
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Practice modes */}
        <h2 className="font-display text-xl font-bold text-pine">Practice modes</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {modes.map((m) => {
            if (m.id === 'pms-mock' && !pmsMock.available) {
              return (
                <div key={m.id} className="rounded-xl border bg-secondary/40 p-4">
                  <LockKeyhole className="h-5 w-5 text-amber-700" />
                  <p className="mt-2 text-sm font-bold text-foreground">{m.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Opens {new Date(pmsMock.nextAvailableAt!).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <span className="mt-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    Daily Grand Mock · {DAILY_MOCK_TIME_LABELS.gk}
                  </span>
                </div>
              )
            }
            return (
              <Link
                key={m.id}
                to={m.to}
                data-google-vignette="false"
                className="group rounded-xl border bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-700/40 hover:shadow-md active:scale-[0.98]"
              >
                <m.icon className="h-5 w-5 text-emerald-800" />
                <p className="mt-2 text-sm font-bold text-foreground group-hover:text-pine">{m.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {m.desc}
                </p>
                {m.id === 'weak' && mistakes > 0 && <span className="mt-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{mistakes} mistakes logged</span>}
                {m.id === 'saved' && saved > 0 && <span className="mt-1.5 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">{saved} saved</span>}
                {m.id === 'revision' && (
                  <span className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    revisionStats.due ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {revisionStats.due ? `${revisionStats.due} due now` : 'Nothing due'}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Category browser */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-pine">Browse by category</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="h-9 w-56 rounded-md border bg-white pl-8 pr-3 text-sm"
            />
          </div>
        </div>
        {!idx && <p className="mt-6 text-sm text-muted-foreground">Loading the question bank…</p>}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((c) => {
            const Icon = catIcons[c.slug] ?? Layers
            return (
              <Link
                key={c.slug}
                to={`/gk/cat/${c.slug}`}
                className="group rounded-xl border bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-700/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-emerald-800" />
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-pine">{c.count.toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm font-bold leading-snug text-foreground group-hover:text-pine">{c.name}</p>
              </Link>
            )
          })}
        </div>
        {idx && filtered.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">No category matches “{query}”.</p>
        )}

        <p className="mt-8 rounded-lg border bg-secondary/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          One central question bank powers GK World, the daily challenges, MPT practice, mocks, the mistake notebook and
          performance reports - the same question is never duplicated across features. Answers stay hidden until you
          attempt a question or choose “Reveal Answer”.
        </p>
      </div>
    </div>
  )
}
