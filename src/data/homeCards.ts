// Default homepage dashboard cards - the admin can hide, reorder or add cards.
import type { HomeCard } from '@/lib/admin'
import { shippedMcqSummary } from '@/data/mcqMeta'

export const defaultHomeCards: HomeCard[] = [
  { id: 'all-subject-mcqs', title: 'ALL CSS SUBJECTS MCQs', desc: 'Compulsory and optional subjects · syllabus areas · topic practice', to: '/mcqs', icon: 'Target', visible: true, order: 0 },
  { id: 'mpt-grand-mock', title: 'CSS MPT Mock', desc: 'Official 200-question pattern · 200 minutes', to: '/gk/quiz?mode=mpt-mock', icon: 'Target', visible: true, order: 1 },
  { id: 'pms-grand-mock', title: 'Punjab PMS / PPSC GK Mock', desc: '100-question competitive one-paper practice', to: '/gk/quiz?mode=pms-mock', icon: 'ClipboardList', visible: true, order: 2 },
  { id: 'gk', title: 'Full-Paper / One-Paper Mocks', desc: shippedMcqSummary, to: '/gk', icon: 'Globe', visible: true, order: 3 },
  { id: 'past-papers', title: 'Past Papers', desc: 'CSS · PMS · PPSC archive', to: '/past-papers', icon: 'FileText', visible: true, order: 4 },
  { id: 'current-affairs', title: 'Recent Current & Pakistan Affairs', desc: 'Dated one-liners and MCQs with Details', to: '/current-affairs', icon: 'Newspaper', visible: true, order: 5 },
  { id: 'weekly-magazine', title: 'Weekly Current Affairs Magazine', desc: 'View, download and print the genuine supplied issue', to: '/current-affairs?tab=magazine', icon: 'Newspaper', visible: true, order: 6 },
  { id: 'games', title: 'CSS Games', desc: 'Subject-based matching and timelines', to: '/games', icon: 'Gamepad2', visible: true, order: 7 },
  { id: 'study-tools', title: 'Study Tools', desc: 'Planners, timers and trackers', to: '/study-tools', icon: 'Wrench', visible: true, order: 8 },
  { id: 'study-planner', title: 'FPSC Syllabus & Topic Planner', desc: 'Personal subjects, official checklist and My Topics to Do', to: '/study-planner', icon: 'CalendarRange', visible: true, order: 9 },
  { id: 'test-series', title: 'Test Series & Evaluation', desc: 'Evaluation with Miss Sadia Zahoor, PAS', to: '/test-series', icon: 'Megaphone', visible: true, order: 10 },
  { id: 'notes', title: 'Notes / Samples', desc: 'Genuine subject samples and inquiry', to: '/notes', icon: 'LibraryBig', visible: true, order: 11 },
  { id: 'vocab', title: 'Urdu & English Grammar', desc: 'Scrollable course topics and daily practice', to: '/language-grammar', icon: 'Languages', visible: true, order: 12 },
  { id: 'start-css', title: 'Start CSS', desc: 'Eligibility, stages and roadmap', to: '/start-css', icon: 'BookOpen', visible: true, order: 13 },
  { id: 'mpt', title: 'MPT Preparation', desc: 'Subject practice and official mock pattern', to: '/mpt', icon: 'ClipboardList', visible: true, order: 14 },
  { id: 'five-minute', title: 'Daily Five-Minute Challenge', desc: 'A quick mixed quiz - new every day', to: '/five-minute', icon: 'Zap', visible: true, order: 7 },
  { id: 'essay', title: 'Essay Preparation', desc: 'Learn with Miss Sadia Zahoor, PAS', to: '/essay', icon: 'PenLine', visible: true, order: 10 },
  { id: 'answer-evaluation', title: 'Answer Evaluation', desc: 'Request evaluation from Miss Sadia Zahoor, PAS', to: '/answer-evaluation', icon: 'FileCheck2', visible: true, order: 11 },
  { id: 'handwritten-notes', title: 'Handwritten Notes by Miss Sadia Zahoor, PAS', desc: 'Original handwritten notes for CSS preparation', to: '/handwritten-notes', icon: 'NotebookPen', visible: true, order: 14 },
  { id: 'lectures', title: 'Free CSS Vista Lectures', desc: 'Free lectures for compulsory and selected optional subjects', to: '/lectures', icon: 'Video', visible: true, order: 15 },
  { id: 'dates', title: 'CSS 2027 Important Dates', desc: 'Official, tentative and unannounced dates', to: '/fpsc-updates?tab=dates', icon: 'CalendarClock', visible: true, order: 18 },
  { id: 'fpsc', title: 'FPSC Notifications', desc: 'Official CSS 2027 notices', to: '/fpsc-updates', icon: 'Bell', visible: true, order: 19 },
  { id: 'checklists', title: 'Application Checklists', desc: 'MPT and written application steps', to: '/checklists', icon: 'ListChecks', visible: true, order: 20 },
  { id: 'book-summaries', title: 'Book Summaries', desc: '100 essential books explained clearly', to: '/book-summaries', icon: 'BookOpen', visible: true, order: 22 },
  { id: 'books', title: 'Books by Sir Ali', desc: 'Free PDF downloads', to: '/books', icon: 'BookMarked', visible: true, order: 23 },
  { id: 'psych-viva', title: 'Psychological Assessment & Viva', desc: 'The final stage explained', to: '/psych-viva', icon: 'Brain', visible: true, order: 24 },
  { id: 'mentors', title: 'Mentors', desc: 'Guidance and contact', to: '/mentors', icon: 'Users', visible: true, order: 25 },
  { id: 'opinions', title: 'Opinions by Authors', desc: 'Published analyses and commentary', to: '/opinions', icon: 'ScrollText', visible: true, order: 26 },
]
