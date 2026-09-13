import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRight, BookOpen, ChevronRight, ClipboardCheck, FileText, Globe2,
  LibraryBig, Newspaper, Search, Sparkles, Timer, Calculator, Percent,
  CalendarCheck2, ListChecks, Landmark, FlaskConical, Languages, Users2,
  BookMarked, Layers, type LucideIcon,
} from 'lucide-react'
import { SHIPPED_MCQ_TOTAL, SHIPPED_MCQ_CATEGORY_COUNT } from '@/data/mcqMeta'
import { weeklyMagazines } from '@/data/weeklyMagazine'
import { searchSite, type SearchResult } from '@/lib/search'
import TutorialAnnouncement from '@/components/TutorialAnnouncement'
import NotesDiscountAnnouncement from '@/components/NotesDiscountAnnouncement'

/* ---------------------------------------------------------------- content ---
   Counts below are measured from the shipped data, not estimated:
   past papers from public/past-papers, MCQs from public/css-subject-mcqs and
   public/mcq. Nothing here is a marketing figure. */

const SUBJECT_MCQ_TOTAL = 42_730
const SUBJECT_BANK_COUNT = 46
const PAST_PAPER_TOTAL = 782
const CSS_PAPER_TOTAL = 467
const PPSC_PAPER_TOTAL = 173
const PMS_PAPER_TOTAL = 138
const MPT_PAPER_TOTAL = 4

type Tone = 'blue' | 'rose' | 'green' | 'amber' | 'teal' | 'violet'

interface Gateway {
  title: string
  description: string
  to: string
  icon: LucideIcon
  tone: Tone
}

const gateways: Gateway[] = [
  { title: 'Subjects & Resources', description: 'Complete notes, books, strategies and more', to: '/subjects/compulsory', icon: LibraryBig, tone: 'blue' },
  { title: 'Magazine', description: 'Weekly current affairs and in-depth analysis', to: '/current-affairs', icon: Newspaper, tone: 'rose' },
  { title: 'Free Online Mocks', description: 'Practice with subject and topic-wise tests', to: '/mpt', icon: ClipboardCheck, tone: 'green' },
  { title: 'Past Papers', description: 'Explore past papers by subject and year', to: '/past-papers', icon: FileText, tone: 'blue' },
  { title: 'GK World', description: 'Facts, concepts and essential knowledge', to: '/gk', icon: Globe2, tone: 'teal' },
  { title: 'Study Tools', description: 'Smart tools for your preparation', to: '/study-tools', icon: Sparkles, tone: 'amber' },
]

const compulsory: { title: string; meta: string; to: string; icon: LucideIcon; tone: Tone }[] = [
  { title: 'Essay', meta: 'Notes · Past Papers · Guidance', to: '/essay', icon: BookOpen, tone: 'amber' },
  { title: 'English Précis & Composition', meta: 'Notes · Practice · Guidance', to: '/grammar-vocabulary', icon: Languages, tone: 'blue' },
  { title: 'General Science & Ability', meta: '478 questions · Notes · Concepts', to: '/subjects/compulsory', icon: FlaskConical, tone: 'green' },
  { title: 'Current Affairs', meta: '499 questions · Topics · Analysis', to: '/current-affairs', icon: Newspaper, tone: 'rose' },
  { title: 'Pakistan Affairs', meta: 'Notes · Past Papers · Maps', to: '/subjects/compulsory', icon: Landmark, tone: 'teal' },
  { title: 'Islamic Studies', meta: '433 questions · Key Concepts', to: '/subjects/compulsory', icon: BookMarked, tone: 'violet' },
]

/* GK World's 39 categories, grouped into eight themes. Totals are the sum of
   the real per-category counts in public/mcq/index.json. */
const gkThemes: { title: string; count: number; icon: LucideIcon; tone: Tone }[] = [
  { title: 'Pakistan', count: 4_731, icon: Landmark, tone: 'green' },
  { title: 'World & Geography', count: 5_248, icon: Globe2, tone: 'blue' },
  { title: 'Science & Technology', count: 9_102, icon: FlaskConical, tone: 'violet' },
  { title: 'Islamic Knowledge', count: 6_047, icon: BookMarked, tone: 'teal' },
  { title: 'Institutions & Affairs', count: 2_222, icon: Landmark, tone: 'amber' },
  { title: 'People & Culture', count: 1_018, icon: Users2, tone: 'rose' },
  { title: 'Language & Ability', count: 4_544, icon: Languages, tone: 'blue' },
  { title: 'Miscellaneous', count: 5_174, icon: Layers, tone: 'green' },
]

const mocks: { title: string; questions: number; minutes: number; to: string; tone: Tone; icon: LucideIcon }[] = [
  { title: 'CSS MPT Mock Test', questions: 100, minutes: 120, to: '/mpt', tone: 'green', icon: ClipboardCheck },
  { title: 'PMS General Knowledge Mock', questions: 100, minutes: 120, to: '/gk/quiz', tone: 'blue', icon: Globe2 },
  { title: 'Pakistan Affairs Topic-wise Mock', questions: 50, minutes: 60, to: '/css-mcqs', tone: 'teal', icon: Landmark },
  { title: 'Current Affairs MCQs', questions: 50, minutes: 60, to: '/css-mcqs', tone: 'amber', icon: Newspaper },
]

const tools: { title: string; meta: string; to: string; icon: LucideIcon; tone: Tone }[] = [
  { title: 'Study Planner', meta: 'Plan your preparation', to: '/study-planner', icon: CalendarCheck2, tone: 'blue' },
  { title: 'Syllabus Tracker', meta: 'Track your progress', to: '/fpsc-syllabus', icon: ListChecks, tone: 'green' },
  { title: 'Answer Timer', meta: 'Write to exam timing', to: '/answer-timer', icon: Timer, tone: 'amber' },
  { title: 'Marks Calculator', meta: 'Calculate your marks', to: '/study-tools', icon: Calculator, tone: 'violet' },
  { title: 'Percentage Calculator', meta: 'Quick calculations', to: '/study-tools', icon: Percent, tone: 'teal' },
  { title: 'Mistake Log', meta: 'Revisit what you got wrong', to: '/mistakes', icon: ListChecks, tone: 'rose' },
]

const accountAreas = ['Dashboard', 'Current Affairs', 'My Subjects', 'My Mocks', 'Saved', 'Progress', 'Planner', 'Settings']

/* ------------------------------------------------------------------ pieces --- */

function Tile({ tone, icon: Icon, small = false }: { tone: Tone; icon: LucideIcon; small?: boolean }) {
  return (
    <span className={`cv-tile cv-tile--${tone}${small ? ' cv-tile--sm' : ''}`} aria-hidden="true">
      <Icon strokeWidth={1.7} />
    </span>
  )
}

/** Minar-e-Pakistan, drawn as geometry so the hero carries an image with no
 *  image asset - no photograph, no WebGL, about a kilobyte of markup. */
function HeroArt() {
  return (
    <div className="cv-visual-art" aria-hidden="true">
      <svg viewBox="0 0 260 340" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cv-m1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#BBD6EE" /><stop offset="1" stopColor="#8FB6DA" /></linearGradient>
          <linearGradient id="cv-m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D3E6F6" /><stop offset="1" stopColor="#A8C8E6" /></linearGradient>
          <linearGradient id="cv-m3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#C9E0F3" /><stop offset="1" stopColor="#9CC0DF" /></linearGradient>
        </defs>
        <circle cx="150" cy="120" r="86" fill="#CFE4F5" opacity=".5" />
        <path d="M40 316h180l-14-20H54z" fill="url(#cv-m1)" />
        <path d="M54 296h152l-11-15H65z" fill="url(#cv-m2)" />
        <path d="M66 281h128l-9-13H75z" fill="url(#cv-m3)" />
        <path d="M86 268c0-26 8-42 20-52 4 22 4 38 0 52z" fill="url(#cv-m2)" />
        <path d="M174 268c0-26-8-42-20-52-4 22-4 38 0 52z" fill="url(#cv-m2)" />
        <path d="M108 268c0-34 6-54 14-66 4 26 4 46 0 66z" fill="url(#cv-m3)" />
        <path d="M152 268c0-34-6-54-14-66-4 26-4 46 0 66z" fill="url(#cv-m3)" />
        <path d="M118 206h24l-5-128h-14z" fill="url(#cv-m1)" />
        <path d="M123 78h14l-3-38h-8z" fill="url(#cv-m2)" />
        <rect x="112" y="150" width="36" height="7" rx="3" fill="#A9CAE7" />
        <rect x="115" y="112" width="30" height="6" rx="3" fill="#A9CAE7" />
        <rect x="118" y="76" width="24" height="6" rx="3" fill="#A9CAE7" />
        <path d="M130 40l6 10h-12z" fill="#8FB6DA" />
        <circle cx="130" cy="34" r="4.5" fill="#7FA9D0" />
        <rect x="24" y="316" width="212" height="5" rx="2.5" fill="#BBD6EE" opacity=".8" />
      </svg>
    </div>
  )
}

/** Universal search. Reads the existing client-side corpus, so it searches
 *  subjects, notes, past papers, GK, magazine and mocks from day one. */
function HeroSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) { setResults([]); return }
    let cancelled = false
    const timer = window.setTimeout(() => {
      searchSite(term, 6)
        .then((found) => { if (!cancelled) { setResults(found); setOpen(true) } })
        .catch(() => { if (!cancelled) setResults([]) })
    }, 160)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query])

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const submit = useCallback((event: React.FormEvent) => {
    event.preventDefault()
    if (results[0]) navigate(results[0].link)
  }, [navigate, results])

  return (
    <div ref={boxRef} style={{ position: 'relative', maxWidth: 530, marginTop: 'var(--cv-s-6)' }}>
      <form className="cv-search" onSubmit={submit} role="search">
        <Search aria-hidden="true" />
        <input
          id="cv-home-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => { if (results.length) setOpen(true) }}
          placeholder="Search subjects, topics, past papers, GK, magazine, mocks…"
          aria-label="Search CSS Vista"
          autoComplete="off"
        />
        <span className="cv-kbd">Ctrl K</span>
        <button className="cv-search-go" type="submit" aria-label="Search"><Search aria-hidden="true" /></button>
      </form>

      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 30,
            background: 'var(--cv-white)', border: '1px solid var(--cv-hairline)',
            borderRadius: 'var(--cv-r-md)', boxShadow: 'var(--cv-shadow-3)', overflow: 'hidden',
          }}
        >
          {results.map((result) => (
            <Link key={result.link + result.title} to={result.link} className="cv-listrow" onClick={() => setOpen(false)}>
              <Tile tone="blue" icon={Search} small />
              <span style={{ minWidth: 0 }}>
                <span className="cv-listrow-t" style={{ display: 'block' }}>{result.title}</span>
                <span className="cv-listrow-m">{result.category}</span>
              </span>
              <ChevronRight style={{ marginLeft: 'auto', width: 15, height: 15, color: 'var(--cv-ink-400)', flex: 'none' }} aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-2)', marginBottom: 'var(--cv-s-6)', maxWidth: '62ch' }}>
      <h2 className="cv-head">{title}</h2>
      {sub ? <p className="cv-body cv-body--sm">{sub}</p> : null}
      {children}
    </div>
  )
}

function Block({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <section style={{ paddingBlock: 'var(--cv-s-16)', ...style }}>{children}</section>
}

/* -------------------------------------------------------------------- page --- */

export default function Home() {
  const latestIssue = useMemo(() => weeklyMagazines[0], [])
  const [mockTab, setMockTab] = useState('mpt')

  return (
    <>
      <TutorialAnnouncement />
      <NotesDiscountAnnouncement />

      {/* ---------------- hero ---------------- */}
      <div className="cv-hero">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <div className="cv-hero-in">
            <div>
              <p className="cv-eyebrow">Prepare · Practice · Progress · Succeed</p>
              <h1 className="cv-hero-title" style={{ marginTop: 'var(--cv-s-4)' }}>
                CSS Vista<span>Your Preparation Partner.</span>
              </h1>
              <p className="cv-body cv-body--lg" style={{ marginTop: 'var(--cv-s-4)', maxWidth: '44ch' }}>
                Everything you need to prepare — organised in one place. Completely free.
              </p>
              <HeroSearch />
            </div>

            <div className="cv-visual">
              <div style={{ position: 'relative', zIndex: 2 }}>
                <p className="cv-visual-title">Same<br />Aspirations<br />A Brighter<br />Tomorrow</p>
                <div style={{ marginTop: 'var(--cv-s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-2)' }}>
                  {['Knowledge', 'Preparation', 'Progress'].map((item) => (
                    <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--cv-s-2)', fontSize: 'var(--cv-small)', color: 'var(--cv-ink-700)' }}>
                      <i style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cv-blue-600)', flex: 'none' }} />{item}
                    </span>
                  ))}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--cv-s-2)', fontSize: 'var(--cv-small)', color: 'var(--cv-brand)', fontFamily: 'var(--cv-font-head)', fontWeight: 700 }}>
                    <i style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cv-brand)', flex: 'none' }} />A Better Pakistan
                  </span>
                </div>
              </div>
              <HeroArt />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-6">
        {/* ---------------- gateway ---------------- */}
        <div className="cv-cards">
          {gateways.map((item) => (
            <Link key={item.title} to={item.to} className="cv-card">
              <Tile tone={item.tone} icon={item.icon} />
              <span className="cv-card-t">{item.title}</span>
              <span className="cv-card-d">{item.description}</span>
              <span className="cv-card-arrow"><ArrowRight aria-hidden="true" /></span>
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--cv-s-6)', flexWrap: 'wrap', paddingBlock: 'var(--cv-s-12) var(--cv-s-2)' }}>
          <div>
            <p className="cv-head" style={{ fontSize: 'clamp(22px, 2.8vw, 30px)' }}>Discover. Learn. Practice. Grow.</p>
            <p className="cv-body cv-body--sm" style={{ marginTop: 'var(--cv-s-1)' }}>A complete ecosystem for CSS and PMS preparation.</p>
          </div>
        </div>

        {/* This slot keeps the homepage's top region free of automatic ad
            placement; the advertising policy reads the data attribute. */}
        <div id="cssv-home-ad-free-top" data-cssv-auto-ad-exclusion="home-top" />

        {/* ---------------- subjects ---------------- */}
        <Block>
          <SectionHead title="Subjects & Resources" sub="Comprehensive study material, notes, books and guidance for CSS and PMS." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(232px, 1fr))', gap: 'var(--cv-s-3)' }}>
            {compulsory.map((subject) => (
              <Link key={subject.title} to={subject.to} className="cv-card" style={{ minHeight: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 'var(--cv-s-3)' }}>
                <Tile tone={subject.tone} icon={subject.icon} small />
                <span style={{ minWidth: 0 }}>
                  <span className="cv-card-t" style={{ display: 'block' }}>{subject.title}</span>
                  <span className="cv-listrow-m">{subject.meta}</span>
                </span>
                <ChevronRight style={{ marginLeft: 'auto', width: 15, height: 15, color: 'var(--cv-ink-400)', alignSelf: 'center', flex: 'none' }} aria-hidden="true" />
              </Link>
            ))}
          </div>
          <p className="cv-body cv-body--sm" style={{ marginTop: 'var(--cv-s-4)', color: 'var(--cv-ink-500)' }}>
            Optional subjects follow the seven official FPSC groups — Group I selects one 200-mark subject,
            Group II one of 200 or two of 100, and Groups III–VII one of 100 each.
          </p>
          <div style={{ display: 'flex', gap: 'var(--cv-s-3)', flexWrap: 'wrap', marginTop: 'var(--cv-s-4)' }}>
            <Link to="/subjects/optional" className="cv-btn cv-btn--primary">All optional subjects</Link>
            <Link to="/fpsc-syllabus" className="cv-btn cv-btn--secondary">Official FPSC syllabus</Link>
          </div>
        </Block>

        {/* ---------------- mocks + past papers ---------------- */}
        <Block style={{ paddingTop: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, .75fr)', gap: 'var(--cv-s-5)' }} className="cv-split">
            <div>
              <SectionHead title="CSS Vista Free Online Mocks" sub="Practice smarter. Build confidence. Track your progress." />
              <div className="cv-rtabs" role="tablist" aria-label="Mock type" style={{ marginBottom: 'var(--cv-s-4)' }}>
                {[['mpt', 'CSS MPT Mocks'], ['pms', 'PMS GK Mocks'], ['subject', 'Subject-wise'], ['topic', 'Topic-wise'], ['daily', 'Daily MCQs']].map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={mockTab === id} className="cv-rtab" onClick={() => setMockTab(id)}>{label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-3)' }}>
                {mocks.map((mock) => (
                  <div key={mock.title} className="cv-card" style={{ minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 'var(--cv-s-3)' }}>
                    <Tile tone={mock.tone} icon={mock.icon} small />
                    <span style={{ minWidth: 0 }}>
                      <span className="cv-card-t" style={{ display: 'block' }}>{mock.title}</span>
                      <span className="cv-listrow-m">{mock.questions} questions · {mock.minutes} minutes</span>
                    </span>
                    <Link to={mock.to} className="cv-btn cv-btn--primary" style={{ marginLeft: 'auto', flex: 'none' }}>Start Mock</Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="cv-card" style={{ minHeight: 0, gap: 'var(--cv-s-4)', padding: 'var(--cv-s-6)' }}>
              <div>
                <h2 className="cv-head cv-head--h3">Past Papers</h2>
                <p className="cv-body cv-body--sm" style={{ marginTop: 'var(--cv-s-1)' }}>Search. Solve. Learn. Repeat.</p>
              </div>
              <div style={{ border: '1px solid var(--cv-hairline)', borderRadius: 'var(--cv-r-md)', overflow: 'hidden' }}>
                <Link to="/past-papers" className="cv-listrow"><Tile tone="blue" icon={FileText} small />
                  <span><span className="cv-listrow-t" style={{ display: 'block' }}>CSS · by year</span><span className="cv-listrow-m">2016–2026 · {CSS_PAPER_TOTAL} papers</span></span></Link>
                <Link to="/past-papers" className="cv-listrow"><Tile tone="green" icon={FileText} small />
                  <span><span className="cv-listrow-t" style={{ display: 'block' }}>PPSC</span><span className="cv-listrow-m">{PPSC_PAPER_TOTAL} papers</span></span></Link>
                <Link to="/past-papers" className="cv-listrow"><Tile tone="amber" icon={FileText} small />
                  <span><span className="cv-listrow-t" style={{ display: 'block' }}>PMS · Groups A–D</span><span className="cv-listrow-m">{PMS_PAPER_TOTAL} papers</span></span></Link>
                <Link to="/past-papers" className="cv-listrow"><Tile tone="rose" icon={FileText} small />
                  <span><span className="cv-listrow-t" style={{ display: 'block' }}>MPT screening</span><span className="cv-listrow-m">{MPT_PAPER_TOTAL} papers</span></span></Link>
              </div>
              <p className="cv-caption">{PAST_PAPER_TOTAL} papers in total. No CSS examination was held in 2020.</p>
              <Link to="/past-papers" className="cv-btn cv-btn--secondary" style={{ justifyContent: 'center' }}>Browse all papers</Link>
            </div>
          </div>
        </Block>

        {/* ---------------- GK World ---------------- */}
        <Block style={{ paddingTop: 0 }}>
          <SectionHead
            title="GK World"
            sub={`Explore. Learn. Remember. ${SHIPPED_MCQ_TOTAL.toLocaleString('en-US')} verified questions across ${SHIPPED_MCQ_CATEGORY_COUNT} categories.`}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(178px, 1fr))', gap: 'var(--cv-s-3)' }}>
            {gkThemes.map((theme) => (
              <Link key={theme.title} to="/gk" className="cv-card" style={{ minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 'var(--cv-s-3)' }}>
                <Tile tone={theme.tone} icon={theme.icon} small />
                <span style={{ minWidth: 0 }}>
                  <span className="cv-card-t" style={{ display: 'block' }}>{theme.title}</span>
                  <span className="cv-listrow-m" style={{ fontVariantNumeric: 'tabular-nums' }}>{theme.count.toLocaleString('en-US')}</span>
                </span>
              </Link>
            ))}
          </div>
        </Block>

        {/* ---------------- magazine + tools ---------------- */}
        <Block style={{ paddingTop: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, .85fr) minmax(0, 1.15fr)', gap: 'var(--cv-s-5)' }} className="cv-split">
            <div className="cv-card" style={{ minHeight: 0, gap: 'var(--cv-s-4)', padding: 'var(--cv-s-6)' }}>
              <div>
                <h2 className="cv-head cv-head--h3">CSS Vista Magazine</h2>
                <p className="cv-body cv-body--sm" style={{ marginTop: 'var(--cv-s-1)' }}>In-depth analysis. A wider perspective. A more informed you.</p>
              </div>
              <div style={{ border: '1px solid var(--cv-hairline)', borderRadius: 'var(--cv-r-md)', overflow: 'hidden' }}>
                {weeklyMagazines.slice(0, 3).map((issue, index) => (
                  <Link key={issue.issue} to="/current-affairs" className="cv-listrow">
                    <Tile tone={index === 0 ? 'rose' : 'blue'} icon={Newspaper} small />
                    <span style={{ minWidth: 0 }}>
                      <span className="cv-listrow-t" style={{ display: 'block' }}>{issue.issue}</span>
                      <span className="cv-listrow-m">
                        {index === 0 ? 'Latest' : 'Archive'}
                        {issue.pageCount ? ` · ${issue.pageCount} pages` : ''}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
              <Link to="/current-affairs" className="cv-btn cv-btn--primary" style={{ justifyContent: 'center' }}>
                {latestIssue ? 'Read latest issue' : 'Open the magazine'}
              </Link>
            </div>

            <div>
              <SectionHead title="Study Tools" sub="Smart study helpers designed to make your preparation easier." />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(198px, 1fr))', gap: 'var(--cv-s-3)' }}>
                {tools.map((tool) => (
                  <Link key={tool.title} to={tool.to} className="cv-card" style={{ minHeight: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 'var(--cv-s-3)' }}>
                    <Tile tone={tool.tone} icon={tool.icon} small />
                    <span style={{ minWidth: 0 }}>
                      <span className="cv-card-t" style={{ display: 'block' }}>{tool.title}</span>
                      <span className="cv-listrow-m">{tool.meta}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Block>

        {/* ---------------- My CSS Vista ---------------- */}
        <Block style={{ paddingTop: 0 }}>
          <div
            style={{
              background: 'linear-gradient(150deg, #16375C 0%, #12294A 55%, #0F3B32 100%)',
              borderRadius: 'var(--cv-r-xl)', padding: 'var(--cv-s-10) var(--cv-s-8)',
              display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 'var(--cv-s-8)',
              alignItems: 'center', boxShadow: 'var(--cv-shadow-3)',
            }}
            className="cv-split"
          >
            <div>
              <p className="cv-eyebrow" style={{ color: '#6FE3B0' }}>My CSS Vista</p>
              <h2 className="cv-head" style={{ color: 'var(--cv-white)', marginTop: 'var(--cv-s-3)' }}>Your preparation, kept in one place</h2>
              <p className="cv-body" style={{ color: '#B7C9DC', marginTop: 'var(--cv-s-3)', maxWidth: '52ch' }}>
                Everything works signed out. Create an account and your mock results, saved questions,
                syllabus progress and planner follow you between devices.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 'var(--cv-s-2)', marginTop: 'var(--cv-s-4)', maxWidth: 540 }}>
                {accountAreas.map((area) => (
                  <span key={area} style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 'var(--cv-r-sm)', padding: 'var(--cv-s-2) var(--cv-s-3)', fontFamily: 'var(--cv-font-head)', fontWeight: 700, fontSize: 'var(--cv-meta)', color: '#E6EEF6' }}>{area}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-2)', minWidth: 200 }}>
              <Link to="/account" className="cv-btn" style={{ background: 'var(--cv-white)', color: 'var(--cv-ink-deep)', borderColor: 'transparent', justifyContent: 'center' }}>Create a free account</Link>
              <Link to="/account" className="cv-btn" style={{ background: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.26)', color: 'var(--cv-white)', justifyContent: 'center' }}>Sign in</Link>
            </div>
          </div>
        </Block>

        {/* Crawler-visible summary. The static SEO layer renders its own copy of
            this for no-JavaScript clients; this keeps parity once React mounts. */}
        <Block style={{ paddingTop: 0 }}>
          <div style={{ maxWidth: '62ch' }}>
            <p className="cv-eyebrow">About this platform</p>
            <p className="cv-body" style={{ marginTop: 'var(--cv-s-3)' }}>
              CSS Vista is a free preparation platform for the CSS, PMS and one-paper competitive
              examinations in Pakistan, offering {PAST_PAPER_TOTAL} past papers,
              {' '}{SUBJECT_MCQ_TOTAL.toLocaleString('en-US')} subject questions across {SUBJECT_BANK_COUNT} banks,
              {' '}{SHIPPED_MCQ_TOTAL.toLocaleString('en-US')} general-knowledge questions, notes, a weekly
              current-affairs magazine and study tools. It is independent of the FPSC and every provincial
              commission; official rules, deadlines and notices should be verified with the relevant
              examining authority.
            </p>
          </div>
        </Block>
      </div>
    </>
  )
}
