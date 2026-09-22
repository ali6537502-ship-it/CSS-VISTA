export const CANONICAL_ORIGIN = 'https://www.css-vista.com'

/**
 * Five INDEPENDENT policy dimensions describe every route. Collapsing any of
 * them into another is what previously produced both thin indexable pages and
 * blanket "authenticated means no advertising" behaviour.
 *
 *   access         who may reach the route: public | authenticated | admin
 *   contentQuality what the primary content actually is:
 *                    substantial  real, page-specific, crawlable content
 *                    legal        real policy/identity content
 *                    document     document access with limited prose
 *                    interactive  a tool whose value requires interaction
 *                    utility      a hub/chooser with little standalone prose
 *                    private      personal data
 *                    incomplete   not ready to be published to search
 *   indexable      whether search engines may index it (FAIL-CLOSED)
 *   sitemap        whether it belongs in the sitemap
 *   adMode         advertising eligibility: enabled | disabled | auto
 *
 * `adMode` is deliberately NOT derived from `access` or `indexable`. An
 * authenticated content page may be `noindex` and still carry advertising; an
 * indexable legal page may carry none.
 */

export const CONTENT_QUALITY = /** @type {const} */ ([
  'substantial', 'legal', 'document', 'interactive', 'utility', 'private', 'incomplete',
])

/** Content classes whose pages can carry enough real content to be indexed. */
const INDEXABLE_CONTENT_QUALITY = new Set(['substantial', 'legal', 'document'])

function defineRoute({
  path,
  title,
  description,
  h1,
  access = 'public',
  contentQuality = 'incomplete',
  indexable,
  sitemap,
  adMode = 'auto',
  robots,
  match = 'exact',
  schemaType = 'WebPage',
  manualAdPlacement = false,
  placementType = 'pre-footer',
  minimumHeight = 0,
  intro,
  titleIsComplete = false,
}) {
  // Fail closed: a route is indexable only when it is public AND its content
  // class is one that can actually carry crawlable primary content.
  const resolvedIndexable = indexable ?? (access === 'public' && INDEXABLE_CONTENT_QUALITY.has(contentQuality))
  const resolvedSitemap = sitemap ?? (resolvedIndexable && match === 'exact')
  return {
    path,
    match,
    title: titleIsComplete ? title : `${title} | CSS Vista`,
    description,
    h1: h1 ?? title,
    intro: intro ?? description,
    access,
    contentQuality,
    indexable: resolvedIndexable,
    sitemap: resolvedSitemap,
    robots: robots ?? (resolvedIndexable ? 'index, follow' : 'noindex, follow'),
    schemaType,
    adMode,
    manualAdPlacement,
    placementType,
    minimumHeight,
  }
}

/**
 * A public page. `contentQuality` decides indexability, so a public route that
 * is only a chooser or an interactive tool stays out of search while remaining
 * completely usable.
 */
const publicPage = (path, title, description, h1, options = {}) =>
  defineRoute({ path, title, description, h1, access: 'public', contentQuality: 'substantial', adMode: 'enabled', ...options })

/**
 * An authenticated page. It is never indexable, but its advertising is decided
 * separately through `adMode`.
 */
const protectedPage = (path, title, description, options = {}) =>
  defineRoute({ path, title, description, access: 'authenticated', contentQuality: 'private', adMode: 'disabled', robots: 'noindex, follow', ...options })

/**
 * The authoritative inventory for metadata, prerendering, sitemap membership,
 * server routing and advertising eligibility. Unknown routes fail closed.
 */
export const ROUTE_REGISTRY = [
  publicPage('/', 'Free CSS, PMS and One-Paper Exam Preparation', 'CSS Vista is a free CSS, PMS and one-paper competitive exam preparation platform in Pakistan with MCQs, past papers, notes, current affairs and study tools.', 'CSS Vista', { titleIsComplete: true, contentQuality: 'substantial', adMode: 'enabled', title: 'CSS Vista | Free CSS, PMS & One-Paper Preparation Platform', minimumHeight: 0, schemaType: 'WebSite' }),
  publicPage('/start-css', 'How to Start CSS Preparation', 'A practical guide to CSS eligibility, examination stages, subject selection and an effective preparation roadmap.', 'How to start CSS preparation', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/subjects/compulsory', 'CSS Compulsory Subjects', 'Explore the compulsory CSS subjects, syllabus coverage and study resources for the written examination.', 'CSS compulsory subjects', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/subjects/compulsory/essay', 'CSS English Essay', 'Study the CSS English Essay syllabus, preparation approach and relevant learning resources.', 'CSS English Essay', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/subjects/compulsory/precis-composition', 'CSS English Precis and Composition', 'Study the CSS English Precis and Composition syllabus, preparation approach and learning resources.', 'CSS English Precis and Composition', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/subjects/compulsory/general-science-ability', 'CSS General Science and Ability', 'Study the CSS General Science and Ability syllabus, topics and preparation resources.', 'CSS General Science and Ability', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/subjects/compulsory/current-affairs', 'CSS Current Affairs Compulsory Subject', 'Study the CSS Current Affairs syllabus, analytical themes and preparation resources.', 'CSS Current Affairs compulsory subject', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/subjects/compulsory/pakistan-affairs', 'CSS Pakistan Affairs', 'Study the CSS Pakistan Affairs syllabus, historical themes and contemporary issues.', 'CSS Pakistan Affairs', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/subjects/compulsory/islamic-studies', 'CSS Islamic Studies', 'Study the CSS Islamic Studies syllabus, core themes and preparation resources.', 'CSS Islamic Studies', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/subjects/optional', 'CSS Optional Subjects', 'Browse CSS optional subjects and subject-selection information organised by FPSC groups.', 'CSS optional subjects', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/subjects/selector', 'CSS Subject Selection Tool', 'Compare CSS optional subjects by FPSC group and use the interactive selection tool to build a valid subject combination.', 'CSS subject selection tool', { contentQuality: 'interactive', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/notes', 'Free CSS Notes (PDF) by Sir Ali Hassan Sargana', 'Browse CSS notes topics, authorised samples and subject packages for Current Affairs, Pakistan Affairs, Political Science and Criminology.' , 'CSS notes by Sir Ali Hassan Sargana', { contentQuality: 'substantial', adMode: 'enabled' }),
  protectedPage('/notes/view/:productId/:documentId', 'CSS Notes Viewer', 'View an authorised CSS notes sample.', { match: 'pattern' }),
  publicPage('/past-papers', 'CSS Past Papers 2016–2026', 'Browse CSS past papers from 2016 to 2026 by year and subject, with downloadable FPSC paper PDFs plus related PMS, PPSC and MPT archives.', 'CSS past papers 2016–2026', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/past-papers/:exam/:year', 'Past Papers by Year', 'Browse the available past-paper collection for this examination and year.', 'Past papers by year', { contentQuality: 'substantial', adMode: 'enabled', match: 'pattern' }),
  publicPage('/past-papers/view/:id', 'Past Paper PDF Viewer', 'View and download an available past-paper PDF from the CSS Vista archive.', 'Past paper PDF viewer', { contentQuality: 'document', adMode: 'disabled', match: 'pattern', minimumHeight: 0, schemaType: 'DigitalDocument' }),
  publicPage('/css-mcqs', 'CSS Subject MCQs', 'Browse and practise compulsory and optional CSS subject MCQ banks with topic filters, answer review, bookmarks and progress tracking.', 'CSS subject MCQ banks', { contentQuality: 'utility', adMode: 'disabled', minimumHeight: 0 }),
  // Signed-in study material. Noindex because it is account content, but
  // ad-eligible: authentication does not disable advertising.
  protectedPage('/study-material/essay-themes', 'Essay Themes 2027 Research Roadmap', 'Track your research progress across the twenty-five priority CSS essay themes.', { adMode: 'enabled' }),
  protectedPage('/study-material/essay-themes/:slug', 'Essay Theme Research Roadmap', 'Work through one essay theme stage by stage and tick each research direction as you complete it.', { match: 'pattern', adMode: 'enabled' }),
  // The study-material section root, so the parent URL resolves rather than
  // 404ing when a student truncates a deeper link.
  publicPage('/study-material', 'CSS Study Material — Notes, References and Essay Roadmap', 'Topic-wise CSS optional subject notes, the bilingual Islamic Studies reference bank and the essay theme research roadmap, in one place.', 'CSS study material', { contentQuality: 'substantial', adMode: 'enabled' }),
  // Topic-wise optional-subject notes. Real study content, so indexable.
  publicPage('/study-material/optional', 'CSS Optional Subject Notes (All 7 Groups)', 'Topic-wise CSS optional subject notes across all seven FPSC groups, organised by group, subject and topic.', 'CSS optional subject notes', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/study-material/optional/:subject', 'CSS Optional Subject Notes', 'Topic-wise study notes for this CSS optional subject, following the FPSC syllabus.', 'CSS optional subject notes', { contentQuality: 'substantial', adMode: 'enabled', match: 'pattern' }),
  publicPage('/study-material/optional/:subject/:topic', 'CSS Optional Subject Topic Notes', 'Detailed study notes for this CSS optional subject topic, following the FPSC syllabus.', 'CSS optional subject topic notes', { contentQuality: 'substantial', adMode: 'enabled', match: 'pattern' }),
  // Public study material. Real, source-checked, bilingual content, so the
  // chapter and topic pages are indexable on their own merits.
  publicPage('/study-material/islamic-studies', 'CSS Islamic Studies Reference Bank (English & Urdu)', 'Browse source-checked Islamic Studies references for all seven CSS chapters, with Arabic source passages and parallel English and Urdu.', 'CSS Islamic Studies reference bank', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/study-material/islamic-studies/:chapter', 'Islamic Studies Chapter References', 'Browse the topics and source-checked references for this CSS Islamic Studies chapter in English and Urdu.', 'Islamic Studies chapter references', { contentQuality: 'substantial', adMode: 'enabled', match: 'pattern' }),
  publicPage('/study-material/islamic-studies/:chapter/:topic', 'Islamic Studies Topic References', 'Source-checked Qur\'anic, Hadith and scholarly references for this CSS Islamic Studies topic, with Arabic passages and parallel English and Urdu.', 'Islamic Studies topic references', { contentQuality: 'substantial', adMode: 'enabled', match: 'pattern' }),
  publicPage('/essay', 'CSS Essay Preparation', 'Learn CSS English Essay through structured skill guides, theme-wise preparation, practice topics, thesis and outline guidance, and self-assessment.', 'CSS English Essay preparation', { contentQuality: 'substantial', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/mpt', 'CSS MPT Preparation', 'Explore CSS MPT preparation resources, question-bank subjects and mock-test information.', 'CSS MPT preparation', { contentQuality: 'substantial', adMode: 'disabled', minimumHeight: 0 }),
  protectedPage('/mpt/bank/:bankId', 'MPT Question Bank', 'Interactive CSS MPT question-bank practice.', { match: 'pattern' }),
  publicPage('/current-affairs', 'CSS Current Affairs', 'Read CSS-focused current-affairs analysis and access the CSS Vista Weekly current-affairs journal.', 'CSS current affairs', { contentQuality: 'utility', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/vistagram', 'CSS Vistagram — Concepts, Articles and Explainers', 'Explore the public CSS Vistagram learning feed with concepts, articles, explainers, data, case studies and exam-relevant ideas.', 'CSS Vistagram', { contentQuality: 'utility', adMode: 'enabled' }),
  publicPage('/vistagram/:slug', 'CSS Vistagram Article', 'Read a complete CSS Vistagram concept, article or explainer with sources and related learning material.', 'CSS Vistagram article', { contentQuality: 'utility', adMode: 'enabled', match: 'pattern', schemaType: 'Article' }),
  publicPage('/answer-writing', 'Answer-Writing Practice', 'Practise timed competitive-examination answers with an outline, structured sections, word count, local saving and a self-assessment rubric.', 'Answer-writing practice', { contentQuality: 'interactive', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/test-series', 'Customized Test Series', 'Build a personalised written-test schedule, divide selected syllabi across tests, review checked-paper samples and prepare a printable plan.', 'Customized written test series', { contentQuality: 'interactive', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/study-tools', 'CSS Study Tools', 'Use planners, timers, trackers, revision organisers and preparation utilities designed for focused daily competitive-examination study.', 'CSS study tools', { contentQuality: 'interactive', adMode: 'disabled', minimumHeight: 0 }),
  protectedPage('/photo-compressor', 'Photo Compressor', 'Interactive photo-compression utility.', { adMode: 'enabled' }),
  publicPage('/games', 'Interactive Practice', 'Use academic matching activities and interactive practice tools for quick revision and recall.', 'Interactive academic practice', { contentQuality: 'interactive', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/psych-viva', 'CSS Psychological Assessment and Viva Guidance', 'Prepare for the CSS psychological assessment and viva with structured guidance and resources.', 'CSS psychological assessment and viva guidance', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/fpsc-updates', 'FPSC Updates and CSS Results', 'Read important FPSC notices, CSS examination updates and result information.', 'FPSC updates and CSS results', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/mentors', 'About CSS Vista and Its Mentors', 'Learn about CSS Vista and the mentors behind its free competitive-examination preparation resources.', 'About CSS Vista', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/services', 'CSS Occupational Groups and Services', 'Explore CSS occupational groups, service profiles and career information.', 'CSS occupational groups and services', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/analysis', 'CSS Exam Analysis', 'Read examination-focused analysis and preparation insights for CSS aspirants.', 'CSS exam analysis', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/grammar-vocabulary', 'Grammar and Vocabulary Practice', 'Study source-backed vocabulary, commonly confused words, phrasal verbs, idioms, substitutions, grammar lessons, quizzes and a daily challenge.', 'Grammar and vocabulary practice', { contentQuality: 'interactive', adMode: 'disabled', minimumHeight: 0 }),
  protectedPage('/dashboard', 'Student Dashboard', 'Private CSS Vista study dashboard.', { adMode: 'enabled' }),
  protectedPage('/daily-challenge', 'Daily Challenge', 'Interactive daily question challenge.'),
  publicPage('/gk', 'General Knowledge and PMS Preparation', 'Explore general-knowledge subject banks, reference material and PMS mock information.', 'General knowledge preparation', { contentQuality: 'utility', adMode: 'enabled' }),
  publicPage('/one-liner-gk', 'One-Liner GK', 'Browse searchable general-knowledge fact cards organised by subject and topic for quick revision.', 'one-liner GK questions', { contentQuality: 'utility', adMode: 'enabled' }),
  publicPage('/language-grammar', 'Urdu and English Grammar Resources', 'Browse Urdu and English grammar reference material for competitive examinations.', 'Urdu and English grammar resources', { contentQuality: 'utility', adMode: 'enabled' }),
  publicPage('/grammar-course', '30-Day Grammar Course', 'Follow a beginner-first, practice-heavy 30-day grammar course with clear explanations, worked examples and daily drills.', '30-day grammar course', { contentQuality: 'interactive', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/book-summaries', '100 Book Summaries for CSS Aspirants', 'Browse searchable book summaries and reading guidance for CSS and competitive-examination preparation.', 'Book summaries for CSS aspirants', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/book-summaries/:slug', 'Book Summary for CSS Aspirants', 'Read a complete exam-focused book summary with key ideas, lessons and quotations for CSS preparation.', 'Book summary for CSS aspirants', { contentQuality: 'substantial', adMode: 'enabled', match: 'pattern', schemaType: 'Article' }),
  protectedPage('/lectures', 'Free CSS Lectures', 'The CSS Vista lecture library is still in preparation and is not yet an indexable content resource.', { adMode: 'enabled' }),
  publicPage('/handwritten-notes', 'CSS Handwritten Notes', 'Browse information about CSS handwritten notes and authorised study resources.', 'CSS handwritten notes', { contentQuality: 'substantial', adMode: 'disabled', minimumHeight: 0 }),
  protectedPage('/study-planner', 'Study Planner', 'Private interactive study planner.', { adMode: 'enabled' }),
  protectedPage('/answer-evaluation', 'Answer Evaluation', 'Private answer-evaluation request workflow.'),
  protectedPage('/live-theme-demos', 'Theme Preview', 'Development theme preview.', { robots: 'noindex, nofollow' }),
  publicPage('/fpsc-syllabus', 'FPSC CSS Syllabus and Topic Planner', 'Browse the official CSS syllabus by subject and organise topic-wise preparation.', 'FPSC CSS syllabus', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/css-past-paper-analysis', 'CSS Past Paper Analysis', 'Explore topic-wise CSS past-paper trends mapped to the FPSC syllabus.', 'CSS past-paper analysis', { contentQuality: 'utility', adMode: 'enabled' }),
  publicPage('/gk/cat/:slug', 'GK Question Bank', 'Browse a complete general-knowledge category bank with searchable questions, topic filters and answer review.', 'General knowledge question bank', { contentQuality: 'substantial', adMode: 'disabled', match: 'pattern', minimumHeight: 0 }),
  protectedPage('/gk/quiz', 'GK Quiz', 'Active general-knowledge quiz and mock-test questions.'),
  protectedPage('/five-minute', 'Five-Minute GK Challenge', 'Timed general-knowledge practice.'),
  protectedPage('/mistakes', 'Mistake Notebook', 'Private saved-question review.', { adMode: 'enabled' }),
  publicPage('/answer-timer', 'Answer Timer', 'Use a structured answer-writing timer with timed alerts for competitive-examination practice.', 'Answer-writing timer', { contentQuality: 'interactive', adMode: 'disabled', minimumHeight: 0 }),
  protectedPage('/checklists', 'Study Checklists', 'Private interactive study checklists.', { adMode: 'enabled' }),
  publicPage('/books', 'CSS Books by Sir Ali Hassan Sargana', 'Explore CSS preparation books and publication information by Sir Ali Hassan Sargana.', 'CSS preparation books', { contentQuality: 'substantial', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/journal', 'VISTA Journal - Articles, Analysis and Perspectives', 'Read selected original writing, informed analysis and serious perspectives on Pakistan and the wider world.', 'VISTA Journal', { contentQuality: 'substantial', adMode: 'enabled' }),
  publicPage('/daily-briefing', 'CSS Vista Current Affairs', 'Read the daily CSS Vista Current Affairs brief with explanations, sourced facts, statistics, archives and personal bookmarks.', 'Understand the day. Remember what matters.', { contentQuality: 'utility', adMode: 'disabled', minimumHeight: 0 }),
  protectedPage('/account/dashboard', 'My CSS Vista', 'Your simple personal preparation home for tasks, Daily English, Current Affairs and progress.', { adMode: 'enabled', robots: 'noindex, nofollow' }),
  protectedPage('/account/tasks', 'My Tasks', 'View, complete, import and manage your personal study schedule.', { adMode: 'enabled', robots: 'noindex, nofollow' }),
  protectedPage('/account/progress', 'My Progress', 'View syllabus, MCQ, mock, revision and study progress.', { adMode: 'enabled', robots: 'noindex, nofollow' }),
  protectedPage('/account/english', 'Daily English', 'Complete your daily vocabulary, idioms and pairs of words.', { adMode: 'enabled', robots: 'noindex, nofollow' }),
  protectedPage('/account/library', 'My Library', 'Open saved items, factbook, archives and personal study material.', { adMode: 'enabled', robots: 'noindex, nofollow' }),
  protectedPage('/account/vistagram', 'My CSS Vistagram', 'Your private Vistagram saves, collections, reading history, followed topics and notes.', { adMode: 'enabled', robots: 'noindex, nofollow' }),
  protectedPage('/account/current-affairs', 'Current Affairs', 'Your protected CSS Vista Current Affairs daily edition.', { adMode: 'enabled', robots: 'noindex, nofollow' }),
  protectedPage('/account/current-affairs/archive', 'Current Affairs Archive', 'Browse protected Current Affairs editions by date and topic.', { adMode: 'enabled', robots: 'noindex, nofollow' }),
  protectedPage('/account/current-affairs/:storyId', 'Current Affairs Analysis', 'Read a sourced current affairs development.', { adMode: 'enabled', match: 'pattern', robots: 'noindex, nofollow' }),
  protectedPage('/account/factbook', 'Daily Factbook', 'Revise the facts and statistics from daily developments.', { adMode: 'enabled', robots: 'noindex, nofollow' }),
  protectedPage('/account/saved', 'My Saved Items', 'Your private saved reading.', { adMode: 'enabled', robots: 'noindex, nofollow' }),
  protectedPage('/account/search', 'Search My Library', 'Search your protected Current Affairs and saved material.', { robots: 'noindex, nofollow' }),
  protectedPage('/account/settings', 'Profile & Settings', 'Manage your profile, preferences and account.', { robots: 'noindex, nofollow' }),
  // The signed-in overview is ordinary account content. Advertising is allowed
  // at route level; the sign-in, registration, reset and verification states are
  // suppressed by the component through the shared ad-state flags.
  protectedPage('/account', 'CSS Vista Account', 'Sign in, register or manage a CSS Vista account.', { adMode: 'enabled', robots: 'noindex, nofollow' }),
  protectedPage('/factbook', 'My Factbook', 'Private personal knowledge library.', { adMode: 'enabled' }),
  publicPage('/consultation', 'One-to-One CSS Consultation', 'Learn about one-to-one CSS consultation, preparation guidance and booking information.', 'One-to-one CSS consultation', { contentQuality: 'substantial', adMode: 'disabled', minimumHeight: 0 }),
  protectedPage('/exam-intelligence', 'Vista Exam Intelligence', 'Private examination-planning and performance dashboard.', { adMode: 'enabled' }),
  publicPage('/css-2026-written-result', 'CSS 2026 Written Result - Qualified Candidates List', 'View and download the CSS Competitive Examination 2026 written result and qualified-candidate list.', 'CSS 2026 written result', { contentQuality: 'substantial', adMode: 'disabled', minimumHeight: 0, schemaType: 'NewsArticle' }),
  publicPage('/legal', 'Legal & Trust Centre', 'Access CSS Vista privacy, cookie, terms, copyright, editorial, identity and contact information.', 'Legal & Trust Centre', { contentQuality: 'utility', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/privacy-policy', 'Privacy Policy', 'Read how CSS Vista handles account information, study progress, security data, browser storage, advertising and service providers.', 'Privacy Policy', { contentQuality: 'legal', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/cookie-policy', 'Cookie Policy', 'Read about the cookies, local storage, session storage and advertising technologies used by CSS Vista.', 'Cookie Policy', { contentQuality: 'legal', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/terms-and-conditions', 'Terms & Conditions', 'Read the terms governing use of CSS Vista educational resources, accounts, study tools and public content.', 'Terms & Conditions', { contentQuality: 'legal', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/disclaimer', 'Disclaimer', 'Read CSS Vista\'s independent educational disclaimer and guidance on verifying official examination information.', 'Disclaimer', { contentQuality: 'legal', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/copyright', 'Copyright Policy', 'Read how CSS Vista distinguishes its original material from official, public and third-party works.', 'Copyright & Intellectual Property', { contentQuality: 'legal', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/editorial-policy', 'Editorial & Corrections Policy', 'Read CSS Vista standards for accuracy, sourcing, updates, corrections and official examination information.', 'Editorial & Corrections Policy', { contentQuality: 'legal', adMode: 'disabled', minimumHeight: 0 }),
  publicPage('/about', 'About CSS Vista', 'Learn what CSS Vista is, what it provides and its independent educational mission for competitive-examination preparation.', 'About CSS Vista', { titleIsComplete: true, contentQuality: 'legal', adMode: 'enabled', title: 'About CSS Vista' }),
  publicPage('/contact', 'Contact CSS Vista', 'Use CSS Vista verified public channels for general enquiries, technical issues, corrections, privacy and copyright concerns.', 'Contact CSS Vista', { titleIsComplete: true, contentQuality: 'legal', adMode: 'disabled', title: 'Contact CSS Vista', minimumHeight: 0 }),
  protectedPage('/sadiaali', 'Administration', 'Private administration area.', { access: 'admin', robots: 'noindex, nofollow' }),
  protectedPage('/sadiaali/login', 'Administration Sign In', 'Private administration sign-in page.', { access: 'admin', robots: 'noindex, nofollow' }),
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

/**
 * The single authoritative redirect table. Server rewrite rules, the client
 * router and the link audit all read it, so an old URL can never be silently
 * destroyed or left pointing at a route that no longer exists.
 */
export const ROUTE_REDIRECTS = [
  { from: '/privacy', to: '/privacy-policy', status: 301, reason: 'Retired generic privacy URL consolidated on the published policy.' },
  { from: '/opinions', to: '/journal', status: 301, reason: 'Opinions was replaced by the canonical VISTA Journal publication.' },
  { from: '/admin', to: '/sadiaali', status: 301, reason: 'Administration area moved off the guessable /admin path.' },
  { from: '/admin/login', to: '/sadiaali/login', status: 301, reason: 'Administration sign-in moved off the guessable /admin path.' },
]

export function findRedirect(pathname) {
  const normalized = normalizeRoutePath(pathname)
  return ROUTE_REDIRECTS.find((redirect) => redirect.from === normalized) || null
}

/**
 * The complete policy for a path, with every dimension resolved. Unknown paths
 * fail closed on all five dimensions.
 */
export function getRoutePolicy(pathname) {
  const route = findRouteDefinition(pathname)
  if (!route) {
    return {
      path: normalizeRoutePath(pathname),
      known: false,
      access: 'public',
      contentQuality: 'incomplete',
      indexable: false,
      sitemap: false,
      adMode: 'disabled',
      robots: 'noindex, nofollow',
      canonical: null,
    }
  }
  return {
    path: normalizeRoutePath(pathname),
    known: true,
    access: route.access,
    contentQuality: route.contentQuality,
    indexable: route.indexable,
    sitemap: route.sitemap,
    adMode: route.adMode,
    robots: route.robots,
    canonical: canonicalForPath(pathname),
  }
}

export const INDEXABLE_STATIC_ROUTES = ROUTE_REGISTRY.filter((route) => route.indexable && route.match === 'exact')

/** Routes that must stay reachable even though they are deliberately not indexed. */
export const FUNCTIONAL_NOINDEX_ROUTES = ROUTE_REGISTRY.filter((route) => !route.indexable && route.match === 'exact')
