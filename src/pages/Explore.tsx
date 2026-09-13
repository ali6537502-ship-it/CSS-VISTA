import { Link } from 'react-router'
import {
  BookOpen, ClipboardList, FileText, Globe2, Newspaper, Wrench, UserRound,
  ChevronRight, type LucideIcon,
} from 'lucide-react'

/* Explore is the directory for people who know what they want but not where it
   lives. It groups by what someone is trying to do, not by how the site is
   built, and it is deliberately the last item in the navigation. */

type Tone = 'blue' | 'rose' | 'green' | 'amber' | 'teal' | 'violet'

interface Entry { label: string; to: string; hint?: string }
interface Group { title: string; blurb: string; icon: LucideIcon; tone: Tone; entries: Entry[] }

const groups: Group[] = [
  {
    title: 'Subjects & Resources',
    blurb: 'Notes, books and guidance for every compulsory and optional paper.',
    icon: BookOpen, tone: 'blue',
    entries: [
      { label: 'New to CSS? Start here', to: '/start-css', hint: 'What the exam is and what to do first' },
      { label: 'Compulsory Subjects', to: '/subjects/compulsory' },
      { label: 'Optional Subjects', to: '/subjects/optional', hint: 'The seven official FPSC groups' },
      { label: 'Subject Selection Tool', to: '/subjects/selector' },
      { label: 'Notes Library', to: '/notes' },
      { label: 'Handwritten Notes', to: '/handwritten-notes' },
      { label: 'Book Summaries', to: '/book-summaries' },
      { label: 'Books by Sir Ali', to: '/books' },
      { label: 'Free Lectures', to: '/lectures' },
      { label: 'Official FPSC Syllabus', to: '/fpsc-syllabus' },
    ],
  },
  {
    title: 'Writing practice',
    blurb: 'Essay, précis and answer writing — the papers that decide the result.',
    icon: FileText, tone: 'amber',
    entries: [
      { label: 'Essay', to: '/essay' },
      { label: 'Answer-Writing Practice', to: '/answer-writing' },
      { label: 'Answer Evaluation', to: '/answer-evaluation' },
      { label: 'Answer Timer', to: '/answer-timer', hint: 'Write to real exam timing' },
      { label: 'Urdu & English Grammar', to: '/language-grammar' },
      { label: '30-Day Master Grammar Course', to: '/language-grammar?lang=english&view=master-course' },
    ],
  },
  {
    title: 'Practice & mocks',
    blurb: 'Timed screening-test practice, subject banks and daily questions.',
    icon: ClipboardList, tone: 'green',
    entries: [
      { label: 'CSS MPT Mocks', to: '/mpt' },
      { label: 'Subject MCQs', to: '/css-mcqs' },
      { label: 'PMS GK Mocks', to: '/gk/quiz' },
      { label: 'Daily Five-Minute Challenge', to: '/five-minute' },
      { label: 'Customized Test Series', to: '/test-series' },
      { label: 'Mistake Notebook', to: '/mistakes' },
      { label: 'Interactive Practice', to: '/games' },
    ],
  },
  {
    title: 'Past Papers',
    blurb: 'Every CSS, PMS and PPSC paper since 2016, and what they repeat.',
    icon: FileText, tone: 'violet',
    entries: [
      { label: 'All Past Papers', to: '/past-papers', hint: '782 papers' },
      { label: 'CSS Past Paper Analysis', to: '/css-past-paper-analysis' },
      { label: 'CSS 2026 Written Result', to: '/css-2026-written-result' },
    ],
  },
  {
    title: 'GK World',
    blurb: 'General knowledge, verified and quizzable.',
    icon: Globe2, tone: 'teal',
    entries: [
      { label: 'GK World', to: '/gk', hint: '39 categories' },
      { label: 'One-Liner GK Questions', to: '/one-liner-gk' },
      { label: 'My Factbook', to: '/factbook' },
      { label: 'Vocabulary & Daily Challenge', to: '/grammar-vocabulary' },
    ],
  },
  {
    title: 'Magazine',
    blurb: 'Weekly current affairs written for the exam.',
    icon: Newspaper, tone: 'rose',
    entries: [
      { label: 'Weekly Current Affairs Magazine', to: '/current-affairs' },
      { label: 'Opinions & Analysis', to: '/opinions' },
    ],
  },
  {
    title: 'Study Tools',
    blurb: 'Planners, trackers and calculators that solve a real problem.',
    icon: Wrench, tone: 'blue',
    entries: [
      { label: 'All Study Tools', to: '/study-tools' },
      { label: 'My CSS Study Planner', to: '/study-planner' },
      { label: 'Application Checklists', to: '/checklists' },
      { label: 'Application Photo Compressor', to: '/photo-compressor' },
      { label: 'Performance Dashboard', to: '/dashboard' },
      { label: 'VISTA Exam Intelligence', to: '/exam-intelligence' },
    ],
  },
  {
    title: 'After the written exam',
    blurb: 'What comes next, and who to ask.',
    icon: UserRound, tone: 'amber',
    entries: [
      { label: 'Psychological Assessment & Viva', to: '/psych-viva' },
      { label: 'Occupational Groups', to: '/services' },
      { label: 'Success & Failure Analysis', to: '/analysis' },
      { label: 'FPSC Updates & Important Dates', to: '/fpsc-updates' },
      { label: 'One-on-One Consultation', to: '/consultation' },
      { label: 'About CSS Vista and Its Mentors', to: '/mentors' },
    ],
  },
  {
    title: 'Policies & contact',
    blurb: 'How the platform operates, and how to reach us.',
    icon: FileText, tone: 'teal',
    entries: [
      { label: 'Legal & Trust Centre', to: '/legal' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Cookie Policy', to: '/cookie-policy' },
      { label: 'Terms & Conditions', to: '/terms-and-conditions' },
      { label: 'Disclaimer', to: '/disclaimer' },
      { label: 'Copyright Policy', to: '/copyright' },
      { label: 'Editorial & Corrections Policy', to: '/editorial-policy' },
      { label: 'Contact CSS Vista', to: '/contact' },
    ],
  },
]

export default function Explore() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-6" style={{ paddingBlock: 'var(--cv-s-12) var(--cv-s-20)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cv-s-3)', maxWidth: '62ch' }}>
        <p className="cv-eyebrow">Explore</p>
        <h1 className="cv-head" style={{ fontSize: 'clamp(28px, 3.6vw, 40px)' }}>Everything on CSS Vista</h1>
        <p className="cv-body">
          Grouped by what you are trying to do, rather than how the site is built.
          Everything here is free and works without an account.
        </p>
      </div>

      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--cv-s-4)', marginTop: 'var(--cv-s-10)',
        }}
      >
        {groups.map((group) => {
          const Icon = group.icon
          return (
            <section
              key={group.title}
              style={{
                background: 'var(--cv-white)', border: '1px solid var(--cv-hairline)',
                borderRadius: 'var(--cv-r-lg)', boxShadow: 'var(--cv-shadow-1)', overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', gap: 'var(--cv-s-3)', alignItems: 'flex-start', padding: 'var(--cv-s-5) var(--cv-s-5) var(--cv-s-3)' }}>
                <span className={`cv-tile cv-tile--${group.tone}`} aria-hidden="true"><Icon strokeWidth={1.7} /></span>
                <span style={{ minWidth: 0 }}>
                  <h2 className="cv-head cv-head--h4" style={{ display: 'block' }}>{group.title}</h2>
                  <p className="cv-listrow-m">{group.blurb}</p>
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--cv-hairline-2)' }}>
                {group.entries.map((entry) => (
                  <Link key={entry.to + entry.label} to={entry.to} className="cv-listrow">
                    <span style={{ minWidth: 0 }}>
                      <span className="cv-listrow-t" style={{ display: 'block' }}>{entry.label}</span>
                      {entry.hint ? <span className="cv-listrow-m">{entry.hint}</span> : null}
                    </span>
                    <ChevronRight style={{ marginLeft: 'auto', width: 15, height: 15, color: 'var(--cv-ink-400)', flex: 'none' }} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
