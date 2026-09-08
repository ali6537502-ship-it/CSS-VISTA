export const CANONICAL_ORIGIN = 'https://www.css-vista.com'

const publicPage = (path, title, description, h1, options = {}) => ({
  path,
  match: 'exact',
  title: `${title} | CSS Vista`,
  description,
  h1,
  intro: description,
  robots: 'index, follow',
  indexable: true,
  schemaType: 'WebPage',
  adMode: 'content',
  placementType: 'pre-footer',
  minimumHeight: 250,
  ...options,
})

const protectedPage = (path, title, description, options = {}) => ({
  path,
  match: 'exact',
  title: `${title} | CSS Vista`,
  description,
  h1: title,
  intro: description,
  robots: 'noindex, follow',
  indexable: false,
  schemaType: 'WebPage',
  adMode: 'none',
  placementType: 'pre-footer',
  minimumHeight: 0,
  ...options,
})

/**
 * The authoritative inventory for metadata, prerendering, sitemap membership,
 * server routing and advertising eligibility. Unknown routes fail closed.
 */
export const ROUTE_REGISTRY = [
  publicPage('/', 'CSS and PMS Competitive Exam Preparation', 'Free CSS and PMS preparation resources including MCQs, past papers, current affairs, notes, syllabus guidance and study tools.', 'CSS Vista competitive examination preparation', { adMode: 'none', minimumHeight: 0, schemaType: 'WebSite' }),
  publicPage('/start-css', 'How to Start CSS Preparation', 'A practical guide to CSS eligibility, examination stages, subject selection and an effective preparation roadmap.', 'How to start CSS preparation'),
  publicPage('/subjects/compulsory', 'CSS Compulsory Subjects', 'Explore the compulsory CSS subjects, syllabus coverage and study resources for the written examination.', 'CSS compulsory subjects'),
  publicPage('/subjects/compulsory/essay', 'CSS English Essay', 'Study the CSS English Essay syllabus, preparation approach and relevant learning resources.', 'CSS English Essay'),
  publicPage('/subjects/compulsory/precis-composition', 'CSS English Precis and Composition', 'Study the CSS English Precis and Composition syllabus, preparation approach and learning resources.', 'CSS English Precis and Composition'),
  publicPage('/subjects/compulsory/general-science-ability', 'CSS General Science and Ability', 'Study the CSS General Science and Ability syllabus, topics and preparation resources.', 'CSS General Science and Ability'),
  publicPage('/subjects/compulsory/current-affairs', 'CSS Current Affairs Compulsory Subject', 'Study the CSS Current Affairs syllabus, analytical themes and preparation resources.', 'CSS Current Affairs compulsory subject'),
  publicPage('/subjects/compulsory/pakistan-affairs', 'CSS Pakistan Affairs', 'Study the CSS Pakistan Affairs syllabus, historical themes and contemporary issues.', 'CSS Pakistan Affairs'),
  publicPage('/subjects/compulsory/islamic-studies', 'CSS Islamic Studies', 'Study the CSS Islamic Studies syllabus, core themes and preparation resources.', 'CSS Islamic Studies'),
  publicPage('/subjects/optional', 'CSS Optional Subjects', 'Browse CSS optional subjects and subject-selection information organised by FPSC groups.', 'CSS optional subjects'),
  publicPage('/subjects/selector', 'CSS Subject Selection Tool', 'Compare CSS optional subjects by FPSC group and use the interactive selection tool to build a valid subject combination.', 'CSS subject selection tool', { adMode: 'none', minimumHeight: 0 }),
  publicPage('/notes', 'CSS Notes by Sir Ali Hassan Sargana', 'Browse CSS notes topics, authorised samples and subject packages for Current Affairs, Pakistan Affairs, Political Science and Criminology.' , 'CSS notes by Sir Ali Hassan Sargana'),
  protectedPage('/notes/view/:productId/:documentId', 'CSS Notes Viewer', 'View an authorised CSS notes sample.', { match: 'pattern' }),
  publicPage('/past-papers', 'CSS Past Papers 2016–2026', 'Browse CSS past papers from 2016 to 2026 by year and subject, with downloadable FPSC paper PDFs plus related PMS, PPSC and MPT archives.', 'CSS past papers 2016–2026'),
  publicPage('/past-papers/:exam/:year', 'Past Papers by Year', 'Browse the available past-paper collection for this examination and year.', 'Past papers by year', { match: 'pattern' }),
  publicPage('/past-papers/view/:id', 'Past Paper PDF Viewer', 'View and download an available past-paper PDF from the CSS Vista archive.', 'Past paper PDF viewer', { match: 'pattern', adMode: 'none', minimumHeight: 0, schemaType: 'DigitalDocument' }),
  publicPage('/css-mcqs', 'CSS Subject MCQs', 'Browse and practise compulsory and optional CSS subject MCQ banks with topic filters, answer review, bookmarks and progress tracking.', 'CSS subject MCQ banks', { adMode: 'none', minimumHeight: 0 }),
  publicPage('/essay', 'CSS Essay Preparation', 'Learn CSS English Essay through structured skill guides, theme-wise preparation, practice topics, thesis and outline guidance, and self-assessment.', 'CSS English Essay preparation', { adMode: 'none', minimumHeight: 0 }),
  publicPage('/mpt', 'CSS MPT Preparation', 'Explore CSS MPT preparation resources, question-bank subjects and mock-test information.', 'CSS MPT preparation', { adMode: 'none', minimumHeight: 0 }),
  protectedPage('/mpt/bank/:bankId', 'MPT Question Bank', 'Interactive CSS MPT question-bank practice.', { match: 'pattern' }),
  publicPage('/current-affairs', 'CSS Current Affairs', 'Read CSS-focused current-affairs analysis and access the CSS Vista Weekly current-affairs journal.', 'CSS current affairs'),
  publicPage('/answer-writing', 'Answer-Writing Practice', 'Practise timed competitive-examination answers with an outline, structured sections, word count, local saving and a self-assessment rubric.', 'Answer-writing practice', { adMode: 'none', minimumHeight: 0 }),
  publicPage('/test-series', 'Customized Test Series', 'Build a personalised written-test schedule, divide selected syllabi across tests, review checked-paper samples and prepare a printable plan.', 'Customized written test series', { adMode: 'none', minimumHeight: 0 }),
  publicPage('/study-tools', 'CSS Study Tools', 'Use planners, timers, trackers, revision organisers and preparation utilities designed for focused daily competitive-examination study.', 'CSS study tools', { adMode: 'none', minimumHeight: 0 }),
  publicPage('/games', 'Interactive Practice', 'Use academic matching activities and interactive practice tools for quick revision and recall.', 'Interactive academic practice', { adMode: 'none', minimumHeight: 0 }),
  publicPage('/psych-viva', 'CSS Psychological Assessment and Viva Guidance', 'Prepare for the CSS psychological assessment and viva with structured guidance and resources.', 'CSS psychological assessment and viva guidance'),
  publicPage('/fpsc-updates', 'FPSC Updates and CSS Results', 'Read important FPSC notices, CSS examination updates and result information.', 'FPSC updates and CSS results'),
  publicPage('/mentors', 'About CSS Vista and Its Mentors', 'Learn about CSS Vista and the mentors behind its free competitive-examination preparation resources.', 'About CSS Vista'),
  publicPage('/services', 'CSS Occupational Groups and Services', 'Explore CSS occupational groups, service profiles and career information.', 'CSS occupational groups and services'),
  publicPage('/analysis', 'CSS Exam Analysis', 'Read examination-focused analysis and preparation insights for CSS aspirants.', 'CSS exam analysis'),
  publicPage('/grammar-vocabulary', 'Grammar and Vocabulary Practice', 'Study source-backed vocabulary, commonly confused words, phrasal verbs, idioms, substitutions, grammar lessons, quizzes and a daily challenge.', 'Grammar and vocabulary practice', { adMode: 'none', minimumHeight: 0 }),
  protectedPage('/dashboard', 'Student Dashboard', 'Private CSS Vista study dashboard.'),
  protectedPage('/daily-challenge', 'Daily Challenge', 'Interactive daily question challenge.'),
  publicPage('/gk', 'General Knowledge and PMS Preparation', 'Explore general-knowledge subject banks, reference material and PMS mock information.', 'General knowledge preparation', { adMode: 'none', minimumHeight: 0 }),
  publicPage('/one-liner-gk', '4,800 One-Liner GK Questions', 'Browse searchable general-knowledge fact cards organised by subject and topic for quick revision.', '4,800 one-liner GK questions'),
  publicPage('/language-grammar', 'Urdu and English Grammar Resources', 'Browse Urdu and English grammar reference material for competitive examinations.', 'Urdu and English grammar resources'),
  publicPage('/book-summaries', '100 Book Summaries for CSS Aspirants', 'Browse searchable book summaries and reading guidance for CSS and competitive-examination preparation.', 'Book summaries for CSS aspirants'),
  publicPage('/lectures', 'Free CSS Lectures', 'Access free CSS Vista lectures and examination-preparation guidance.', 'Free CSS lectures'),
  publicPage('/handwritten-notes', 'CSS Handwritten Notes', 'Browse information about CSS handwritten notes and authorised study resources.', 'CSS handwritten notes'),
  protectedPage('/study-planner', 'Study Planner', 'Private interactive study planner.'),
  protectedPage('/answer-evaluation', 'Answer Evaluation', 'Private answer-evaluation request workflow.'),
  protectedPage('/live-theme-demos', 'Theme Preview', 'Development theme preview.', { robots: 'noindex, nofollow' }),
  publicPage('/fpsc-syllabus', 'FPSC CSS Syllabus and Topic Planner', 'Browse the official CSS syllabus by subject and organise topic-wise preparation.', 'FPSC CSS syllabus'),
  publicPage('/css-past-paper-analysis', 'CSS Past Paper Analysis', 'Explore topic-wise CSS past-paper trends mapped to the FPSC syllabus.', 'CSS past-paper analysis'),
  publicPage('/gk/cat/:slug', 'GK Question Bank', 'Browse a complete general-knowledge category bank with searchable questions, topic filters and answer review.', 'General knowledge question bank', { match: 'pattern', adMode: 'none', minimumHeight: 0 }),
  protectedPage('/gk/quiz', 'GK Quiz', 'Active general-knowledge quiz and mock-test questions.'),
  protectedPage('/five-minute', 'Five-Minute GK Challenge', 'Timed general-knowledge practice.'),
  protectedPage('/mistakes', 'Mistake Notebook', 'Private saved-question review.'),
  publicPage('/answer-timer', 'Answer Timer', 'Use a structured answer-writing timer with timed alerts for competitive-examination practice.', 'Answer-writing timer', { adMode: 'none', minimumHeight: 0 }),
  protectedPage('/checklists', 'Study Checklists', 'Private interactive study checklists.'),
  publicPage('/books', 'CSS Books by Sir Ali Hassan Sargana', 'Explore CSS preparation books and publication information by Sir Ali Hassan Sargana.', 'CSS preparation books', { adMode: 'none', minimumHeight: 0 }),
  publicPage('/opinions', 'CSS Vista Opinions and Analysis', 'Read long-form opinions and analysis relevant to CSS preparation.', 'CSS Vista opinions and analysis'),
  protectedPage('/account', 'CSS Vista Account', 'Sign in, register or manage a CSS Vista account.', { robots: 'noindex, nofollow' }),
  protectedPage('/factbook', 'My Factbook', 'Private personal knowledge library.'),
  publicPage('/consultation', 'One-to-One CSS Consultation', 'Learn about one-to-one CSS consultation, preparation guidance and booking information.', 'One-to-one CSS consultation', { adMode: 'none', minimumHeight: 0 }),
  protectedPage('/exam-intelligence', 'Vista Exam Intelligence', 'Private examination-planning and performance dashboard.'),
  publicPage('/css-2026-written-result', 'CSS 2026 Written Result - Qualified Candidates List', 'View and download the CSS Competitive Examination 2026 written result and qualified-candidate list.', 'CSS 2026 written result', { adMode: 'none', minimumHeight: 0, schemaType: 'NewsArticle' }),
  publicPage('/privacy', 'Privacy, Cookies and Advertising', 'Read how CSS Vista handles account data, local study preferences, cookies, advertising technology and consent.', 'Privacy, cookies and advertising', { adMode: 'none', minimumHeight: 0 }),
  protectedPage('/admin', 'Administration', 'Private administration area.', { robots: 'noindex, nofollow' }),
]

export function normalizeRoutePath(pathname) {
  const path = String(pathname || '/').split(/[?#]/, 1)[0] || '/'
  return path === '/' ? '/' : (path.replace(/\/+$/, '') || '/')
}

function matches(pathname, route) {
  if (route.match === 'exact') return pathname === route.path
  if (route.match === 'prefix') return pathname === route.path || pathname.startsWith(`${route.path}/`)
  const parts = pathname.split('/').filter(Boolean)
  const patterns = route.path.split('/').filter(Boolean)
  return parts.length === patterns.length && patterns.every((part, index) => part.startsWith(':') || part === parts[index])
}

export function findRouteDefinition(pathname) {
  const normalized = normalizeRoutePath(pathname)
  return ROUTE_REGISTRY
    .filter((route) => matches(normalized, route))
    .sort((left, right) => {
      if (left.match === 'exact' && right.match !== 'exact') return -1
      if (right.match === 'exact' && left.match !== 'exact') return 1
      const leftLiterals = left.path.split('/').filter((part) => part && !part.startsWith(':')).length
      const rightLiterals = right.path.split('/').filter((part) => part && !part.startsWith(':')).length
      return rightLiterals - leftLiterals
    })[0] || null
}

export function canonicalForPath(pathname) {
  return `${CANONICAL_ORIGIN}${normalizeRoutePath(pathname) === '/' ? '/' : normalizeRoutePath(pathname)}`
}

export const INDEXABLE_STATIC_ROUTES = ROUTE_REGISTRY.filter((route) => route.indexable && route.match === 'exact')
