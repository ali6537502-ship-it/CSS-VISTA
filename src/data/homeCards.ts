// Default homepage dashboard cards - the admin can hide, reorder or add cards.
import type { HomeCard } from '@/lib/admin'

// Student-facing priority: core preparation first, supporting and occasional
// tools later. This intentionally wins over stale locally saved card order.
export const homeFeaturePriority = [
  'start-css',
  'exam-intelligence',
  'study-planner',
  'css-subject-mcqs',
  'gk',
  'mpt',
  'past-papers',
  'css-past-paper-analysis',
  'fpsc-syllabus',
  'notes',
  'handwritten-notes',
  'book-summaries',
  'lectures',
  'test-series',
  'answer-writing',
  'answer-evaluation',
  'essay',
  'essay-themes',
  'study-material',
  'optional-notes',
  'islamic-references',
  'factbook',
  'study-tools',
  'dashboard',
  'mistakes',
  'language-grammar',
  'grammar-course',
  'vocab',
  'five-minute',
  'pms-grand-mock',
  'mpt-grand-mock',
  'answer-timer',
  'subject-selector',
  'checklists',
  'dates',
  'fpsc',
  'photo-compressor',
  'games',
  'books',
  'psych-viva',
  'consultation',
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
  { id: 'exam-intelligence', title: 'VISTA Exam Intelligence', desc: 'Your personal preparation command center', to: '/exam-intelligence', icon: 'ChartNoAxesCombined', visible: true, order: 0.25 },
  { id: 'start-css', title: 'Start CSS', desc: 'Eligibility, stages and roadmap', to: '/start-css', icon: 'BookOpen', visible: true, order: 1 },
  { id: 'mpt', title: 'CSS MPT', desc: 'Timed MCQ tests and mocks', to: '/mpt', icon: 'ClipboardList', visible: true, order: 2 },
  { id: 'gk', title: 'GK World', desc: 'One-liners and category-wise MCQ practice', to: '/gk', icon: 'Globe', visible: true, order: 3 },
  { id: 'css-subject-mcqs', title: 'All CSS Subject MCQs', desc: 'Compulsory and optional subject banks', to: '/css-mcqs', icon: 'LibraryBig', visible: true, order: 5 },
  { id: 'pms-grand-mock', title: 'PMS GK Grand Mock', desc: 'Daily entry · 8:00–10:00 PM', to: '/gk/quiz?mode=pms-mock', icon: 'ClipboardList', visible: true, order: 4 },
  { id: 'mpt-grand-mock', title: 'MPT Grand Mocks', desc: 'Two fresh papers daily · 3 PM & 10:30 PM', to: '/mpt', icon: 'Target', visible: true, order: 6 },
  { id: 'five-minute', title: 'Daily Five-Minute Challenge', desc: 'A quick mixed quiz - new every day', to: '/five-minute', icon: 'Zap', visible: true, order: 7 },
  { id: 'current-affairs', title: 'Current Affairs', desc: 'Structured, sourced issue files', to: '/current-affairs', icon: 'Newspaper', visible: true, order: 8 },
  { id: 'essay', title: 'Essay Preparation', desc: 'Learn with Miss Sadia Zahoor, PAS', to: '/essay', icon: 'PenLine', visible: true, order: 10 },
  { id: 'study-material', title: 'CSS Study Material', desc: 'Optional notes, Islamic references and essay themes', to: '/study-material', icon: 'LibraryBig', visible: true, order: 13.3 },
  { id: 'optional-notes', title: 'Optional Subject Notes', desc: '34 subjects, 339 topics - all seven FPSC groups', to: '/study-material/optional', icon: 'LibraryBig', visible: true, order: 13.4 },
  { id: 'islamic-references', title: 'Islamic Studies Reference Bank', desc: '1,382 source-checked references - English & Urdu', to: '/study-material/islamic-studies', icon: 'BookMarked', visible: true, order: 13.5 },
  { id: 'essay-themes', title: 'Essay Themes 2027', desc: '25 themes, 13 research stages each - tick your progress', to: '/study-material/essay-themes', icon: 'ListTree', visible: true, order: 10.5 },
  { id: 'answer-evaluation', title: 'Answer Evaluation', desc: 'Request evaluation from Miss Sadia Zahoor, PAS', to: '/answer-evaluation', icon: 'FileCheck2', visible: true, order: 11 },
  { id: 'past-papers', title: 'Past Papers', desc: 'CSS · PMS · PPSC archive', to: '/past-papers', icon: 'FileText', visible: true, order: 12 },
  { id: 'css-past-paper-analysis', title: 'CSS Past Paper Analysis', desc: '3,277 questions mapped topic-wise to the FPSC syllabus', to: '/css-past-paper-analysis', icon: 'ChartNoAxesCombined', visible: true, order: 12.5 },
  { id: 'notes', title: 'Notes Library', desc: 'Samples and complete notes', to: '/notes', icon: 'LibraryBig', visible: true, order: 13 },
  { id: 'handwritten-notes', title: 'Handwritten Notes by Miss Sadia Zahoor, PAS', desc: 'Original handwritten notes for CSS preparation', to: '/handwritten-notes', icon: 'NotebookPen', visible: true, order: 14 },
  { id: 'lectures', title: 'Free CSS Vista Lectures', desc: 'Free lectures for compulsory and selected optional subjects', to: '/lectures', icon: 'Video', visible: true, order: 15 },
  { id: 'vocab', title: 'Vocabulary and Daily Challenge', desc: 'Word of the day, idioms, quizzes', to: '/grammar-vocabulary', icon: 'Languages', visible: true, order: 16 },
  { id: 'study-tools', title: 'Study Tools', desc: 'Planners, timers and trackers', to: '/study-tools', icon: 'Wrench', visible: true, order: 17 },
  { id: 'photo-compressor', title: 'Photo Size Reducer', desc: 'Compress photos to any size from 10 KB to 60 KB', to: '/photo-compressor', icon: 'Wrench', visible: true, order: 17.1 },
  { id: 'factbook', title: 'My Factbook', desc: 'Build a private, searchable CSS knowledge library', to: '/factbook', icon: 'BookMarked', visible: true, order: 17.25 },
  { id: 'fpsc-syllabus', title: 'FPSC Syllabus & Topic Planner', desc: 'Official paper-wise checklists', to: '/fpsc-syllabus', icon: 'ListChecks', visible: true, order: 17.5 },
  { id: 'dates', title: 'CSS 2027 Important Dates', desc: 'Official, tentative and unannounced dates', to: '/fpsc-updates?tab=dates', icon: 'CalendarClock', visible: true, order: 18 },
  { id: 'fpsc', title: 'FPSC Notifications', desc: 'Official CSS 2027 notices', to: '/fpsc-updates', icon: 'Bell', visible: true, order: 19 },
  { id: 'checklists', title: 'Application Checklists', desc: 'MPT and written application steps', to: '/checklists', icon: 'ListChecks', visible: true, order: 20 },
  { id: 'test-series', title: 'Customized Test Series', desc: 'Personalized schedule with Miss Sadia Zahoor, PAS', to: '/test-series', icon: 'Megaphone', visible: true, order: 21 },
  { id: 'book-summaries', title: 'Book Summaries', desc: '100 essential books explained clearly', to: '/book-summaries', icon: 'BookOpen', visible: true, order: 22 },
  { id: 'books', title: 'Books by Sir Ali', desc: 'Free PDF downloads', to: '/books', icon: 'BookMarked', visible: true, order: 23 },
  { id: 'psych-viva', title: 'Psychological Assessment & Viva', desc: 'The final stage explained', to: '/psych-viva', icon: 'Brain', visible: true, order: 24 },
  { id: 'consultation', title: '1-on-1 CSS Consultation', desc: 'Paid private guidance with Sir Ali Hassan or Ms. Sadia Zahoor', to: '/consultation', icon: 'Users', visible: true, order: 24.5 },
  { id: 'mentors', title: 'About Us', desc: 'Meet the CSS Vista mentors', to: '/mentors', icon: 'Users', visible: true, order: 25 },
  { id: 'opinions', title: 'Opinions by Authors', desc: 'Published analyses and commentary', to: '/opinions', icon: 'ScrollText', visible: true, order: 26 },
  { id: 'games', title: 'Interactive Practice', desc: 'Academic matching and timelines', to: '/games', icon: 'Gamepad2', visible: true, order: 27 },
  { id: 'answer-timer', title: 'Answer Timer', desc: 'Practice answers against the clock', to: '/answer-timer', icon: 'Timer', visible: true, order: 28 },
  { id: 'mistakes', title: 'Mistake Notebook', desc: 'Revisit weak areas and wrong answers', to: '/mistakes', icon: 'TriangleAlert', visible: true, order: 29 },
  { id: 'one-liner-gk', title: 'One-Liner GK', desc: 'Clear fact cards for rapid revision', to: '/one-liner-gk', icon: 'ListTree', visible: true, order: 30 },
  { id: 'language-grammar', title: 'Urdu & English Grammar', desc: 'Grammar practice and language rules', to: '/language-grammar', icon: 'Languages', visible: true, order: 31 },
  { id: 'grammar-course', title: '30-Day Grammar Course', desc: 'Easy lessons, examples and daily practice', to: '/grammar-course', icon: 'BookOpen', visible: true, order: 30.5 },
  { id: 'answer-writing', title: 'Answer-Writing Practice', desc: 'Plan, structure and improve answers', to: '/answer-writing', icon: 'FilePenLine', visible: true, order: 32 },
  { id: 'subject-selector', title: 'Subject Selection Tool', desc: 'Compare optional subjects smartly', to: '/subjects/selector', icon: 'SlidersHorizontal', visible: true, order: 35 },
  { id: 'dashboard', title: 'Performance Dashboard', desc: 'Study time, accuracy and improvement', to: '/dashboard', icon: 'ChartNoAxesCombined', visible: true, order: 36 },
  { id: 'study-planner', title: 'My Study Dashboard', desc: 'Today, overdue, completed and upcoming tasks with editable schedule controls', to: '/study-planner', icon: 'CalendarRange', visible: true, order: 0 },
]
