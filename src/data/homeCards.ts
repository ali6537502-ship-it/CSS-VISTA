// Default homepage dashboard cards - the admin can hide, reorder or add cards.
import type { HomeCard } from '@/lib/admin'
import { shippedMcqSummary } from '@/data/mcqMeta'

// Student-facing priority: core preparation first, supporting and occasional
// tools later. This intentionally wins over stale locally saved card order.
export const homeFeaturePriority = [
  'css-subject-mcqs',
  'css-past-paper-analysis',
  'start-css',
  'mpt',
  'gk',
  'test-series',
  'pms-grand-mock',
  'mpt-grand-mock',
  'five-minute',
  'past-papers',
  'notes',
  'handwritten-notes',
  'essay',
  'answer-evaluation',
  'answer-writing',
  'study-planner',
  'study-tools',
  'fpsc-syllabus',
  'games',
  'one-liner-gk',
  'language-grammar',
  'vocab',
  'mistakes',
  'answer-timer',
  'dashboard',
  'subject-selector',
  'book-summaries',
  'books',
  'lectures',
  'checklists',
  'dates',
  'fpsc',
  'psych-viva',
  'mentors',
  'opinions',
] as const

const homeFeatureRank = new Map<string, number>(homeFeaturePriority.map((id, index) => [id, index]))

export function sortHomeCardsByPriority<T extends HomeCard>(cards: T[]): T[] {
  return [...cards].sort((a, b) => {
    const aRank = homeFeatureRank.get(a.id)
    const bRank = homeFeatureRank.get(b.id)
    if (aRank !== undefined || bRank !== undefined) {
      return (aRank ?? Number.MAX_SAFE_INTEGER) - (bRank ?? Number.MAX_SAFE_INTEGER)
    }
    return a.order - b.order
  })
}

export const defaultHomeCards: HomeCard[] = [
  { id: 'start-css', title: 'Start CSS', desc: 'Eligibility, stages and roadmap', to: '/start-css', icon: 'BookOpen', visible: true, order: 1 },
  { id: 'mpt', title: 'CSS MPT', desc: 'Timed MCQ tests and mocks', to: '/mpt', icon: 'ClipboardList', visible: true, order: 2 },
  { id: 'gk', title: 'GK World', desc: shippedMcqSummary, to: '/gk', icon: 'Globe', visible: true, order: 3 },
  { id: 'css-subject-mcqs', title: 'All CSS Subject MCQs', desc: 'Compulsory and optional subject banks', to: '/css-mcqs', icon: 'LibraryBig', visible: true, order: 5 },
  { id: 'pms-grand-mock', title: 'PMS GK Grand Mock', desc: 'Daily entry · 8:00–10:00 PM', to: '/gk/quiz?mode=pms-mock', icon: 'ClipboardList', visible: true, order: 4 },
  { id: 'mpt-grand-mock', title: 'CSS MPT Grand Mock', desc: 'Daily entry · 10:30 PM–midnight', to: '/gk/quiz?mode=mpt-mock', icon: 'Target', visible: true, order: 6 },
  { id: 'five-minute', title: 'Daily Five-Minute Challenge', desc: 'A quick mixed quiz - new every day', to: '/five-minute', icon: 'Zap', visible: true, order: 7 },
  { id: 'current-affairs', title: 'Current Affairs', desc: 'Structured, sourced issue files', to: '/current-affairs', icon: 'Newspaper', visible: true, order: 8 },
  { id: 'essay', title: 'Essay Preparation', desc: 'Learn with Miss Sadia Zahoor, PAS', to: '/essay', icon: 'PenLine', visible: true, order: 10 },
  { id: 'answer-evaluation', title: 'Answer Evaluation', desc: 'Request evaluation from Miss Sadia Zahoor, PAS', to: '/answer-evaluation', icon: 'FileCheck2', visible: true, order: 11 },
  { id: 'past-papers', title: 'Past Papers', desc: 'CSS · PMS · PPSC archive', to: '/past-papers', icon: 'FileText', visible: true, order: 12 },
  { id: 'css-past-paper-analysis', title: 'CSS Past Paper Analysis', desc: '3,277 questions mapped topic-wise to the FPSC syllabus', to: '/css-past-paper-analysis', icon: 'ChartNoAxesCombined', visible: true, order: 12.5 },
  { id: 'notes', title: 'Notes Library', desc: 'Samples and complete notes', to: '/notes', icon: 'LibraryBig', visible: true, order: 13 },
  { id: 'handwritten-notes', title: 'Handwritten Notes by Miss Sadia Zahoor, PAS', desc: 'Original handwritten notes for CSS preparation', to: '/handwritten-notes', icon: 'NotebookPen', visible: true, order: 14 },
  { id: 'lectures', title: 'Free CSS Vista Lectures', desc: 'Free lectures for compulsory and selected optional subjects', to: '/lectures', icon: 'Video', visible: true, order: 15 },
  { id: 'vocab', title: 'Vocabulary and Daily Challenge', desc: 'Word of the day, idioms, quizzes', to: '/grammar-vocabulary', icon: 'Languages', visible: true, order: 16 },
  { id: 'study-tools', title: 'Study Tools', desc: 'Planners, timers and trackers', to: '/study-tools', icon: 'Wrench', visible: true, order: 17 },
  { id: 'fpsc-syllabus', title: 'FPSC Syllabus & Topic Planner', desc: 'Official paper-wise checklists', to: '/fpsc-syllabus', icon: 'ListChecks', visible: true, order: 17.5 },
  { id: 'dates', title: 'CSS 2027 Important Dates', desc: 'Official, tentative and unannounced dates', to: '/fpsc-updates?tab=dates', icon: 'CalendarClock', visible: true, order: 18 },
  { id: 'fpsc', title: 'FPSC Notifications', desc: 'Official CSS 2027 notices', to: '/fpsc-updates', icon: 'Bell', visible: true, order: 19 },
  { id: 'checklists', title: 'Application Checklists', desc: 'MPT and written application steps', to: '/checklists', icon: 'ListChecks', visible: true, order: 20 },
  { id: 'test-series', title: 'Customized Test Series', desc: 'Personalized schedule with Miss Sadia Zahoor, PAS', to: '/test-series', icon: 'Megaphone', visible: true, order: 21 },
  { id: 'book-summaries', title: 'Book Summaries', desc: '100 essential books explained clearly', to: '/book-summaries', icon: 'BookOpen', visible: true, order: 22 },
  { id: 'books', title: 'Books by Sir Ali', desc: 'Free PDF downloads', to: '/books', icon: 'BookMarked', visible: true, order: 23 },
  { id: 'psych-viva', title: 'Psychological Assessment & Viva', desc: 'The final stage explained', to: '/psych-viva', icon: 'Brain', visible: true, order: 24 },
  { id: 'mentors', title: 'Mentors', desc: 'Guidance and contact', to: '/mentors', icon: 'Users', visible: true, order: 25 },
  { id: 'opinions', title: 'Opinions by Authors', desc: 'Published analyses and commentary', to: '/opinions', icon: 'ScrollText', visible: true, order: 26 },
  { id: 'games', title: 'CSS Games', desc: 'Fast, interactive exam-prep games', to: '/games', icon: 'Gamepad2', visible: true, order: 27 },
  { id: 'answer-timer', title: 'Answer Timer', desc: 'Practice answers against the clock', to: '/answer-timer', icon: 'Timer', visible: true, order: 28 },
  { id: 'mistakes', title: 'Mistake Notebook', desc: 'Revisit weak areas and wrong answers', to: '/mistakes', icon: 'TriangleAlert', visible: true, order: 29 },
  { id: 'one-liner-gk', title: 'One-Liner GK', desc: 'Quick facts for rapid revision', to: '/one-liner-gk', icon: 'ListTree', visible: true, order: 30 },
  { id: 'language-grammar', title: 'Urdu & English Grammar', desc: 'Grammar practice and language rules', to: '/language-grammar', icon: 'Languages', visible: true, order: 31 },
  { id: 'answer-writing', title: 'Answer-Writing Practice', desc: 'Plan, structure and improve answers', to: '/answer-writing', icon: 'FilePenLine', visible: true, order: 32 },
  { id: 'subject-selector', title: 'Subject Selection Tool', desc: 'Compare optional subjects smartly', to: '/subjects/selector', icon: 'SlidersHorizontal', visible: true, order: 35 },
  { id: 'dashboard', title: 'Performance Dashboard', desc: 'Study time, accuracy and improvement', to: '/dashboard', icon: 'ChartNoAxesCombined', visible: true, order: 36 },
  { id: 'study-planner', title: 'My CSS Study Planner', desc: 'A personal daily plan that adapts to your progress', to: '/study-planner', icon: 'CalendarRange', visible: true, order: 0 },
]
