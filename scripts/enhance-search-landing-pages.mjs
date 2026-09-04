import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { INDEXABLE_STATIC_ROUTES, ROUTE_REGISTRY } from '../src/data/routeRegistry.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')
const siteUrl = new URL(process.env.SITE_ORIGIN || 'https://www.css-vista.com')
if (siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) {
  throw new Error(`SITE_ORIGIN must be an HTTPS origin without a path: ${siteUrl.href}`)
}
const siteOrigin = siteUrl.origin
const SEO_CONTENT_REFRESH = '2026-09-05'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function staticRouteFile(routePath) {
  const name = routePath.replace(/^\/+|\/+$/g, '').replaceAll('/', '--') || 'home'
  return `${name}.html`
}

const DETAILS = {
  '/': {
    points: [
      'Start with the CSS examination roadmap, compulsory and optional subject pages, then move into topic-wise preparation.',
      'Use subject MCQs, GK World, MPT preparation, past papers and the FPSC syllabus as connected parts of one revision system.',
      'Open notes, current affairs, book summaries, English support and answer-writing tools when the relevant part of your preparation needs depth.',
    ],
    guidance: 'A strong preparation sequence begins with the syllabus and subject plan, moves into concept building, then uses past papers and practice to test coverage. CSS Vista groups these steps so an aspirant can move from planning to study, practice, revision and examination review without searching across disconnected websites.',
    note: 'The platform contains both public information pages and personal interactive tools. Public subject, library and examination resources are intended to be discoverable and shareable; private dashboards, saved mistakes, account areas and active timed question screens remain separate because they depend on an individual student’s activity.',
  },
  '/start-css': {
    points: ['Understand the CSS preparation sequence before committing time to individual subjects.', 'Use the subject-selection and syllabus links to turn the examination structure into a practical study plan.', 'Continue from the roadmap into compulsory subjects, optional subjects, past papers and daily preparation tools.'],
    guidance: 'Use this page before building a detailed timetable. First understand the stages of CSS preparation and the role of compulsory and optional subjects. Then open the FPSC syllabus, identify the subjects you need to cover, and connect each subject with its past papers and available study resources. This prevents preparation from becoming a list of unrelated books or notes.',
    note: 'The page is preparation guidance rather than an official FPSC notice. Examination rules, dates and eligibility requirements can change, so official notices should be checked when making an application or other time-sensitive decision.',
  },
  '/subjects/compulsory': {
    points: ['Review the compulsory CSS subject structure before allocating study time.', 'Open the dedicated subject pages to move from the overview into subject-level preparation.', 'Connect each compulsory subject with its syllabus, past papers and relevant practice resources.'],
    guidance: 'Treat the compulsory subjects as a coordinated core rather than six isolated papers. Use the overview to identify each paper, then review the FPSC syllabus and previous questions to understand the breadth and style of examination. Your study plan should reserve time both for content-heavy subjects and for English writing skills that improve performance across the written examination.',
    note: 'Subject pages on CSS Vista are organised as preparation resources. They should be used alongside the official syllabus and authentic previous papers when deciding what to revise and how deeply to prepare a topic.',
  },
  '/subjects/optional': {
    points: ['Browse optional subjects within the FPSC grouping structure.', 'Compare subject choices before finalising a combination.', 'Use the selector, syllabus and past-paper resources to evaluate a subject beyond its name or popularity.'],
    guidance: 'Optional-subject selection should be based on a valid FPSC combination and a realistic assessment of syllabus size, prior background, available study time and your ability to answer previous questions. Use this page as the browsing layer, then open the subject-selection tool and official syllabus before committing to a final combination.',
    note: 'No single optional subject is automatically best for every aspirant. A sound choice is one that fits the rules and can be prepared, revised and expressed effectively within the time available to you.',
  },
  '/subjects/selector': {
    points: ['Build a combination within the FPSC optional-subject groups.', 'Compare selections before treating them as final.', 'Return to the syllabus and past papers to validate the academic workload of the selected subjects.'],
    guidance: 'Use the selector as a planning aid rather than as a substitute for the official FPSC rules. Build a valid combination, note the subjects you are considering, and then examine each syllabus and a representative set of past papers. This second step is important because two subjects with similar marks may differ substantially in breadth, technical demand and answer-writing style.',
    note: 'The selector is intentionally an interactive planning tool and is kept free of site-managed advertising so subject choices are not interrupted by ad placements.',
  },
  '/notes': {
    points: ['Browse the available CSS notes topics and authorised sample material.', 'Use notes to organise concepts, arguments and revision rather than replacing the syllabus.', 'Pair notes with previous questions so every prepared topic is connected to examination demand.'],
    guidance: 'A useful notes workflow is to begin with the relevant syllabus heading, study the concept or issue in sufficient depth, then condense it into arguments, evidence and examples that can be retrieved during answer writing. After studying a topic, compare it with past-paper questions and practise outlining at least one possible answer instead of only rereading the material.',
    note: 'CSS Vista keeps authorised samples and study resources clearly separated from private document views. Search-facing pages describe the available material while protected viewers are not treated as standalone public search pages.',
  },
  '/past-papers': {
    points: ['Browse CSS, PMS, PPSC and MPT papers by examination, year and subject.', 'Open individual paper pages with direct document access and related-paper links.', 'Compare the same subject across years to identify recurring areas and changes in emphasis.'],
    guidance: 'Past papers are most useful when they are analysed rather than memorised. Begin by grouping questions under syllabus headings, note the concepts that recur, and observe how the wording of questions changes from descriptive to analytical or applied forms. Use those observations to prioritise revision and to practise answers, while remembering that previous questions do not guarantee a future paper.',
    note: 'The archive identifies and organises available examination documents for preparation. Where an official source is relevant, use it to verify time-sensitive examination information rather than inferring current policy from an older paper.',
  },
  '/css-mcqs': {
    points: ['Browse compulsory and optional CSS subject MCQ banks.', 'Use topic filters, answer review, bookmarks and progress tools to focus practice.', 'Return to weak subjects and topics after reviewing incorrect or uncertain answers.'],
    guidance: 'Use MCQs as diagnostic practice, not as a substitute for subject study. Attempt a focused set after revising a topic, review the reasoning behind errors, and record recurring weaknesses for another revision cycle. Mixed practice is most useful after topic-level accuracy improves because it tests retrieval across subjects rather than recognition inside a single chapter.',
    note: 'Active question screens are deliberately treated differently from informational landing pages. Practice sessions prioritise concentration and answer review, while the public CSS MCQ hub explains the available banks and routes students to the appropriate practice area.',
  },
  '/essay': {
    points: ['Use structured skill guidance for CSS English Essay preparation.', 'Work on themes, thesis statements, outlines and argument development before full-length practice.', 'Use self-assessment and repeated writing to turn reading into examinable expression.'],
    guidance: 'Essay preparation improves when reading, thinking and writing are connected. Build a theme bank, practise framing a defensible thesis, organise arguments into a logical outline, and then write under realistic time constraints. After each attempt, review relevance, coherence, paragraph development, evidence and language rather than judging the essay only by its topic knowledge.',
    note: 'The objective is not to memorise a prefabricated essay. It is to build enough command over common themes and writing skills to respond directly to the wording and demand of the question set in the examination.',
  },
  '/mpt': {
    points: ['Review CSS MPT preparation resources and question-bank subjects.', 'Use the hub to understand available practice before opening timed or active question screens.', 'Combine topic revision with mixed recall so screening-test preparation remains broad.'],
    guidance: 'A screening-test plan should balance coverage and retrieval. Revise subject areas systematically, attempt questions without relying on answer recognition, and review errors soon after practice. As the examination approaches, increase mixed and timed practice while continuing to revisit topics that repeatedly produce mistakes.',
    note: 'Timed mocks and active question screens are kept separate from public informational pages and are not intended to be indexed as independent search results. This protects the practice experience and avoids exposing user-specific session states as public content.',
  },
  '/current-affairs': {
    points: ['Access CSS-focused current-affairs analysis and the CSS Vista Weekly journal.', 'Connect important developments with background, implications and examination themes.', 'Use current material to strengthen analytical answers rather than collecting disconnected news headlines.'],
    guidance: 'For CSS preparation, a current event becomes useful when you can explain what happened, why it matters, the relevant background, competing perspectives and its implications for Pakistan or the wider international system. Build short issue files around those dimensions, update them when material changes, and practise converting the information into arguments for Current Affairs, Pakistan Affairs and Essay questions.',
    note: 'Current affairs changes quickly. Dates, figures, official positions and legal or policy developments should be checked against reliable current sources when they are used in an examination answer or publication.',
  },
  '/answer-writing': {
    points: ['Practise timed competitive-examination answers with a structured workspace.', 'Use outlines, sections and word-count awareness to control the shape of an answer.', 'Review the self-assessment rubric after writing instead of treating completion as the final step.'],
    guidance: 'Answer writing should convert preparation into a repeatable examination method. Read the command word carefully, define the exact demand, build a short outline, and allocate space according to the marks and the importance of each argument. After writing, check relevance, structure, analytical balance, evidence, transitions and conclusion so the next attempt targets a specific weakness.',
    note: 'The writing workspace is a preparation tool. Saved or personal writing activity is not presented as public content, and students remain responsible for evaluating factual accuracy in the material they choose to include in an answer.',
  },
  '/test-series': {
    points: ['Build a personalised written-test schedule from selected subjects and syllabus divisions.', 'Review the planned sequence before printing or following the schedule.', 'Use checked-paper samples and repeated testing to identify weaknesses that ordinary reading may hide.'],
    guidance: 'A useful test series should make revision measurable. Divide the syllabus into manageable tests, preserve enough time between papers to review errors, and keep a record of weak topics and recurring writing problems. Full-length mocks are most valuable after enough divided-syllabus practice has been completed to make the result diagnostically meaningful.',
    note: 'Written-test planning and MPT practice serve different examination needs. CSS Vista keeps them distinct so a student can use the appropriate format without confusing screening-test MCQs with written-answer preparation.',
  },
  '/study-tools': {
    points: ['Use planners, timers, trackers and revision utilities for daily preparation.', 'Choose tools that solve a specific planning or revision problem rather than using every feature at once.', 'Connect daily activity with syllabus progress and repeated revision.'],
    guidance: 'Study tools are most effective when the underlying plan is simple. Decide what must be covered, break it into realistic daily work, track completion and schedule revision before material is forgotten. Use timers for focused work and examination practice, not as a measure of quality by themselves. Progress should ultimately be visible in recall, past-paper handling and answer quality.',
    note: 'Personal planning and progress data belongs to the individual student. Private planners and dashboards remain outside the public search index even though the public study-tools hub can be discovered and used as an entry point.',
  },
  '/psych-viva': {
    points: ['Review structured guidance for the CSS psychological assessment and viva stages.', 'Prepare to discuss your background, choices and issues with clarity rather than memorised performance.', 'Use the guidance to organise practice while checking current FPSC instructions separately.'],
    guidance: 'Later-stage preparation should focus on self-awareness, clear communication, composure and the ability to reason about issues under questioning. Review your own application information, academic and professional background, optional subjects and major contemporary issues. Practice concise answers and follow-up questions without turning the interview into a memorised speech.',
    note: 'Assessment formats and official instructions can change. CSS Vista provides preparation guidance; candidates should follow the latest FPSC communication for procedural requirements.',
  },
  '/fpsc-updates': {
    points: ['Review important FPSC notices, CSS examination updates and result information.', 'Use direct official links where available for time-sensitive decisions.', 'Separate current official updates from general preparation material.'],
    guidance: 'When an update affects an application, date, eligibility rule, result or examination procedure, verify the notice from the official FPSC source before acting. Use the CSS Vista update page as an organised preparation reference and follow the linked official source for the authoritative wording and any later correction or extension.',
    note: 'Time-sensitive information should not be treated as permanent. Always note the publication date and check whether a newer official notice has replaced an earlier one.',
  },
  '/mentors': {
    points: ['Learn what CSS Vista is and the people presented as mentors on the platform.', 'Understand the purpose of the free preparation resources and how the site is organised.', 'Use the About page together with the privacy page when you need transparency about the platform.'],
    guidance: 'A preparation platform is easier to use when students can identify who is presenting the material, what the platform is designed to provide and where its different resources fit. This page supplies that context and connects visitors back to the academic sections rather than functioning as a substitute for them.',
    note: 'CSS Vista is a competitive-examination preparation platform. Official examination rules, notices and decisions remain the responsibility of the relevant public authority and should be verified there when necessary.',
  },
  '/services': {
    points: ['Explore CSS occupational groups and service profiles.', 'Use career information to understand the broad nature of post-examination service choices.', 'Pair career exploration with current official rules when making preference decisions.'],
    guidance: 'Occupational-group research is most useful when it goes beyond prestige or hearsay. Compare the nature of work, institutional role, likely postings and the type of responsibilities associated with different services. When you reach the formal preference stage, rely on current official instructions because structures and procedures can change.',
    note: 'Service information on a preparation website is educational context. Formal allocations, vacancies, rules and cadre matters should be checked through the appropriate official channels.',
  },
  '/analysis': {
    points: ['Read examination-focused analysis and preparation insights.', 'Use analytical material to improve strategy rather than copying conclusions mechanically.', 'Connect insights with your own performance, syllabus coverage and past-paper evidence.'],
    guidance: 'Preparation analysis becomes valuable when it changes a concrete study decision. Identify the problem being discussed, compare it with your own preparation data or recent practice, and choose one adjustment that can be measured in the next test or writing attempt. Avoid repeatedly changing strategy without enough evidence from actual performance.',
    note: 'Analytical guidance is not a prediction of marks or allocation. Examination outcomes depend on performance and the applicable official process.',
  },
  '/grammar-vocabulary': {
    points: ['Study vocabulary, commonly confused words, phrasal verbs, idioms and grammar material.', 'Use quizzes and the daily challenge to test recall after learning a rule or word.', 'Move from recognition exercises into sentence-level and paragraph-level usage.'],
    guidance: 'Language improvement requires repeated production. Learn a manageable set of words or rules, use them in your own sentences, revisit mistakes and then apply the same material in précis, comprehension, correction and essay writing. A word is not fully learned merely because its definition looks familiar; it should be usable accurately in context.',
    note: 'The learning pages are public resources, while daily challenge states and saved practice data remain interactive student activity rather than standalone public content.',
  },
  '/gk': {
    points: ['Browse general-knowledge subject banks and reference categories.', 'Open dedicated category pages with searchable questions and topic filters.', 'Use PMS and screening-test practice to identify weak factual areas for revision.'],
    guidance: 'General knowledge is easier to retain when facts are grouped by topic and revisited through retrieval. Study a category, attempt questions without looking at the answer, review the explanation or correction, and return to mistakes after an interval. Once topic-level recall is stable, use mixed practice to test whether the information can be retrieved without a category cue.',
    note: 'CSS Vista separates the public GK category pages from active quiz sessions. Category pages can be discovered and shared; timed or personalised quiz states are intentionally not indexed as independent pages.',
  },
  '/one-liner-gk': {
    points: ['Browse searchable general-knowledge fact cards by subject and topic.', 'Use short facts for rapid revision after studying the broader topic.', 'Re-test facts later instead of relying on a single reading session.'],
    guidance: 'One-liners are useful for recall but should not become isolated memorisation. Group facts under meaningful headings, connect unfamiliar names or dates with their context, and regularly test yourself without seeing the answer. For important or time-sensitive facts, distinguish stable general knowledge from information that may need current verification.',
    note: 'Short-form revision works best as one layer of preparation alongside fuller explanations, past papers and question practice.',
  },
  '/language-grammar': {
    points: ['Browse structured Urdu and English grammar reference material.', 'Use topic-wise records for quick rule revision and examples.', 'Open the expanded 30-day English grammar course for deeper teaching, worked examples, exercises and daily quizzes.'],
    guidance: 'Choose the reference view when you need to review a particular rule quickly. For systematic English improvement, follow the 30-day course in sequence: study the explanation and examples, complete the practice set, attempt the daily quiz and keep track of recurring errors. Transfer the same rules into précis, composition, essay and answer-writing practice so grammar becomes part of normal written expression.',
    note: 'Language learning improves through application. Use the reference material to clarify rules, but rely on repeated sentence correction and original writing to make those rules automatic under examination conditions.',
  },
  '/book-summaries': {
    points: ['Browse searchable summaries and reading guidance for competitive-examination preparation.', 'Use summaries to identify the central argument, themes and useful concepts of a book.', 'Return to the original work or fuller sources when a topic requires deeper evidence or exact attribution.'],
    guidance: 'A summary is most useful as a map. Note the author’s central problem, main argument, supporting ideas and the CSS themes to which the book may contribute. Then decide which books deserve deeper reading. Avoid treating a condensed summary as a substitute for exact quotations, page references or the nuance required for specialist academic use.',
    note: 'Reading guidance helps prioritise limited preparation time. It should support, not replace, careful verification when you use a precise claim, quotation or citation in assessed work.',
  },
  '/lectures': {
    points: ['Access free CSS Vista lectures and preparation guidance.', 'Use lectures to clarify difficult areas and organise study priorities.', 'Convert lecture learning into notes, questions and written practice instead of passive viewing.'],
    guidance: 'Before a lecture, identify the topic and what you need to understand. During it, record the structure and key arguments rather than transcribing every sentence. Afterwards, close the lecture, reproduce the main points from memory and attempt a related question or short outline. This turns viewing time into retrieval and examination practice.',
    note: 'Video or lecture material is most effective when it is connected to the syllabus and followed by active revision.',
  },
  '/handwritten-notes': {
    points: ['Browse information about CSS handwritten notes and authorised study resources.', 'Use the page to understand the available material before opening any permitted sample.', 'Connect notes with the syllabus and past papers for exam-focused revision.'],
    guidance: 'Handwritten notes can compress a large topic, but the student should still understand the argument behind each heading. After studying a page, explain the main points without looking, add any necessary current evidence, and practise arranging the content under the demand of a past-paper question rather than reproducing the original layout mechanically.',
    note: 'Only authorised public information and samples should be treated as search-facing resources; private or restricted document views remain protected.',
  },
  '/fpsc-syllabus': {
    points: ['Browse the official CSS syllabus structure by subject.', 'Use topic-level planning to convert the syllabus into manageable preparation units.', 'Connect every syllabus area with notes, past papers, revision and practice.'],
    guidance: 'The syllabus should be the backbone of preparation. Break each subject into headings and subheadings, mark what is complete, attach relevant past-paper questions and schedule revision before moving too far ahead. When a topic is broad, define the concepts and dimensions that the official wording actually requires so reading remains purposeful instead of expanding without limit.',
    note: 'For any formal application or rule question, consult the latest official FPSC material. CSS Vista uses the syllabus as a preparation and planning resource.',
  },
  '/css-past-paper-analysis': {
    points: ['Explore CSS past-paper questions mapped to topics and syllabus areas.', 'Compare frequency and wording across years without treating recurrence as a prediction.', 'Use trend information to prioritise revision while maintaining complete syllabus coverage.'],
    guidance: 'Past-paper analysis should answer three questions: what areas have been examined, how the examiner has framed them, and what level of analysis the wording demands. Use those patterns to practise representative questions and improve prioritisation, but do not drop an official syllabus area only because it appears less often in the historical record.',
    note: 'Trend analysis describes the available past-paper record. It is evidence for preparation decisions, not a forecast of the next paper.',
  },
  '/answer-timer': {
    points: ['Use timed alerts to practise competitive-examination answer pacing.', 'Rehearse planning, writing and finishing within a chosen answer window.', 'Compare time management with answer quality after each attempt.'],
    guidance: 'A timer is useful only when it supports a realistic writing method. Reserve a short planning period, write according to the outline, and leave enough time to finish the conclusion and check obvious errors. If an answer repeatedly overruns, diagnose whether the problem is excessive planning, slow recall, overlong sections or weak prioritisation rather than simply trying to write faster.',
    note: 'The timer itself does not judge answer quality. Pair timed work with a rubric, teacher feedback or careful self-review.',
  },
  '/books': {
    points: ['Explore CSS preparation books and publication information presented by CSS Vista.', 'Use book descriptions to decide whether a resource matches the subject or preparation need.', 'Combine books with the official syllabus, current material and past-paper practice.'],
    guidance: 'A preparation book is most useful when its role is clear. Identify whether you need conceptual foundation, factual revision, contemporary analysis or question practice, then select material accordingly. Avoid collecting multiple books for the same purpose when one well-used source plus targeted supplementation would be more efficient.',
    note: 'Book information should help students choose and use resources deliberately rather than increasing the size of an unread reading list.',
  },
  '/opinions': {
    points: ['Read long-form opinions and analysis relevant to competitive-examination themes.', 'Separate the author’s argument from supporting facts and counterarguments.', 'Use opinion material to improve analytical range rather than copying a single viewpoint.'],
    guidance: 'When reading an opinion, identify the thesis, assumptions, evidence and strongest counterargument. Compare it with other credible perspectives and note which parts are fact, interpretation or recommendation. This habit is especially useful for Essay and Current Affairs because good answers normally require structured reasoning rather than a collection of quotations.',
    note: 'An opinion page represents analysis, not an official position. Verify factual claims that are time-sensitive or central to an examination answer.',
  },
  '/consultation': {
    points: ['Review information about one-to-one CSS consultation and preparation guidance.', 'Use the page to understand the purpose of a consultation before booking or making an inquiry.', 'Prepare specific questions about subjects, progress, weaknesses or attempt strategy so the session remains focused.'],
    guidance: 'A consultation is most useful when the student arrives with evidence: the subjects chosen, preparation completed, recent writing or mock performance and the exact decisions causing difficulty. List the highest-priority questions in advance and leave with a small number of concrete actions that can be tested during the following study period.',
    note: 'Consultation pages are informational and are kept free of site-managed advertising so inquiry and booking decisions are not mixed with ad interactions.',
  },
  '/privacy': {
    points: ['Read how CSS Vista handles browser-stored study preferences and signed-in progress.', 'Review the role of Google AdSense, advertising cookies and regional consent.', 'Understand which private or examination-focused areas are intentionally kept free of site-managed advertising.'],
    guidance: 'Use this page when you want to understand data handling, advertising technology, consent choices or the separation between public content and private study activity. CSS Vista’s advertising policy is designed so answers, scores, study plans and account details are not used by the site to decide when an advertisement is available.',
    note: 'Privacy and advertising practices can change as features or legal requirements change. Material changes should be reflected in the published policy rather than being left only in technical configuration.',
  },
}

function fallbackDetails(route) {
  return {
    points: [
      `Use ${route.h1} as the main entry point for the preparation resource described on this page.`,
      'Follow the page’s own subject, topic or resource links before moving into related practice and revision areas.',
      'Connect the material with the FPSC syllabus and relevant past papers so preparation remains tied to examination demand.',
    ],
    guidance: `Begin with the purpose of ${route.h1.toLowerCase()} and identify what you need from the resource before opening additional material. Work through the available information in a focused order, record areas that need revision, and then use related CSS Vista pages to connect the topic with subject preparation, previous questions or practice. This keeps the resource part of a deliberate study sequence rather than an isolated visit.`,
    note: 'For competitive examinations, effective preparation combines understanding, retrieval, previous-paper awareness and repeated revision. Use public information pages for study guidance and verify official, time-sensitive rules or notices with the relevant examining authority when necessary.',
  }
}

function relatedRoutes(route) {
  const candidates = INDEXABLE_STATIC_ROUTES.filter((candidate) => candidate.path !== route.path && candidate.path !== '/')
  const preferred = [
    '/start-css', '/subjects/compulsory', '/subjects/optional', '/fpsc-syllabus', '/past-papers',
    '/css-mcqs', '/gk', '/mpt', '/current-affairs', '/essay', '/answer-writing', '/notes',
    '/language-grammar', '/grammar-vocabulary', '/book-summaries', '/study-tools', '/mentors', '/privacy',
  ]
  return [...preferred.map((path) => candidates.find((candidate) => candidate.path === path)).filter(Boolean), ...candidates]
    .filter((candidate, index, all) => all.findIndex((entry) => entry.path === candidate.path) === index)
    .slice(0, 18)
}

function landingBody(route) {
  const details = DETAILS[route.path] || fallbackDetails(route)
  const points = details.points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')
  const links = relatedRoutes(route)
    .map((candidate) => `<li><a href="${escapeHtml(candidate.path)}" class="font-semibold text-emerald-800 underline underline-offset-2">${escapeHtml(candidate.h1)}</a></li>`)
    .join('')

  return `<main class="mx-auto max-w-5xl px-4 py-12"><p class="text-xs font-bold uppercase tracking-wide text-emerald-700">CSS Vista · Competitive examination preparation</p><h1 class="mt-2 font-display text-4xl font-bold text-pine">${escapeHtml(route.h1)}</h1><p class="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">${escapeHtml(route.intro)}</p><section class="mt-9 rounded-xl border bg-white p-5"><h2 class="font-display text-2xl font-bold text-pine">What you can do here</h2><ul class="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">${points}</ul></section><section class="mt-9"><h2 class="font-display text-2xl font-bold text-pine">How to use this resource for preparation</h2><p class="mt-3 max-w-4xl text-sm leading-7 text-slate-700">${escapeHtml(details.guidance)}</p><p class="mt-4 max-w-4xl text-sm leading-7 text-slate-700">${escapeHtml(details.note)}</p></section><nav class="mt-9 rounded-xl border bg-white p-5" aria-label="Related CSS Vista resources"><h2 class="font-display text-xl font-bold text-pine">Continue your preparation</h2><p class="mt-2 text-sm leading-relaxed text-muted-foreground">Move to a related subject, syllabus, practice or revision page when you are ready for the next step.</p><ul class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">${links}</ul></nav><aside class="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5"><h2 class="font-display text-lg font-bold text-pine">About this platform</h2><p class="mt-2 text-sm leading-7 text-slate-700">CSS Vista is an independent competitive-examination preparation platform. Public study resources are organised for learning and revision; private account areas, personal progress and active timed practice are kept separate. For official rules, deadlines and notices, use the relevant examining authority.</p><p class="mt-3 text-sm"><a href="/mentors" class="font-semibold text-emerald-800 underline underline-offset-2">About CSS Vista and its mentors</a> · <a href="/privacy" class="font-semibold text-emerald-800 underline underline-offset-2">Privacy, cookies and advertising</a></p></aside></main>`
}

function wordCount(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function replaceRootBody(html, body, label) {
  const next = html.replace(/<div id="root">[\s\S]*?<\/main><\/div>/, `<div id="root">${body}</div>`)
  if (next === html) throw new Error(`Could not replace prerender body for ${label}`)
  return next
}

for (const route of INDEXABLE_STATIC_ROUTES) {
  if (route.path === '/css-2026-written-result') continue
  const path = route.path === '/'
    ? join(clientDir, 'index.html')
    : join(clientDir, 'seo', 'routes', staticRouteFile(route.path))
  let html = await readFile(path, 'utf8')
  const body = landingBody(route)
  if (wordCount(body) < 250) throw new Error(`SEO landing content is too thin for ${route.path}: ${wordCount(body)} words`)
  html = replaceRootBody(html, body, route.path)
  if (!html.includes(`<link rel="canonical" href="${siteOrigin}${route.path === '/' ? '/' : route.path}"`)) {
    throw new Error(`Self-canonical missing from ${route.path}`)
  }
  if (!/<meta name="robots" content="index, follow(?:, max-image-preview:large)?" \/>/.test(html)) {
    throw new Error(`Indexable robots directive missing from ${route.path}`)
  }
  await writeFile(path, html)
}

const sitemapPath = join(clientDir, 'sitemap.xml')
let sitemap = await readFile(sitemapPath, 'utf8')
for (const route of INDEXABLE_STATIC_ROUTES) {
  const url = `${siteOrigin}${route.path === '/' ? '/' : route.path}`
  if (!sitemap.includes(`<loc>${url}</loc>`)) throw new Error(`Indexable public route missing from sitemap: ${route.path}`)
  const plain = `<url><loc>${url}</loc></url>`
  if (sitemap.includes(plain)) {
    sitemap = sitemap.replace(plain, `<url><loc>${url}</loc><lastmod>${SEO_CONTENT_REFRESH}</lastmod></url>`)
  }
}
for (const route of ROUTE_REGISTRY.filter((entry) => !entry.indexable && entry.match === 'exact')) {
  const url = `${siteOrigin}${route.path}`
  if (sitemap.includes(`<loc>${url}</loc>`)) throw new Error(`Protected route must not appear in sitemap: ${route.path}`)
}
await writeFile(sitemapPath, sitemap)

console.log(`Enhanced ${INDEXABLE_STATIC_ROUTES.length - 1} public search landing pages; protected exact routes remain excluded from the sitemap.`)
