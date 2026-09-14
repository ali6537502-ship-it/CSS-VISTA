/**
 * Failure-mode analysis for each CSS paper, and the habits that separate
 * candidates who clear it. Held here rather than inside the page component so
 * the prerendered /analysis page can publish the same material the application
 * shows — the page is advertising-eligible, and an ad-bearing page has to
 * carry its content in the HTML.
 */
export interface AnalysisTool { label: string; to: string }

export const examAnalyses: { title: string; causes: string[]; fixes: string[]; tools: AnalysisTool[] }[] = [
  {
    title: 'Why candidates fail Essay',
    causes: ['Misinterpreting the topic and writing a memorised essay instead', 'No thesis - descriptive narration without a position', 'Weak outlines that examiners cannot follow', 'Error-prone ornamental English', 'No counterargument or evidence'],
    fixes: ['Interpret the exact wording; test your thesis on rough paper', 'Practise 5-minute outlines weekly across themes', 'Write simple, correct English under time', 'Study examiner feedback themes in official reports when published'],
    tools: [{ label: 'Essay module', to: '/essay' }, { label: 'Timed answer practice', to: '/answer-writing' }, { label: 'Request an evaluation', to: '/answer-evaluation' }],
  },
  {
    title: 'Why candidates fail Precis & Composition',
    causes: ['Unrepaired grammar fundamentals (tenses, articles, prepositions)', 'Precis that copies sentences instead of compressing ideas', 'Weak vocabulary repertoire - idioms and pairs guessed wrong', 'No timed practice of the full paper'],
    fixes: ['One precis daily from editorials; count words honestly', 'Work through a standard grammar reference topic-wise', 'Maintain idiom/pair lists and revise weekly'],
    tools: [{ label: 'Grammar reference', to: '/language-grammar' }, { label: 'Vocabulary & idioms', to: '/grammar-vocabulary' }, { label: '30-day grammar course', to: '/language-grammar?lang=english&view=master-course' }],
  },
  {
    title: 'Why candidates underperform in General Science & Ability',
    causes: ['Treating it as trivial and under-preparing', 'Slow quantitative section eating the paper’s time', 'Outdated science concepts'],
    fixes: ['Drill quantitative questions daily in 20-minute sets', 'Revise secondary-level science concepts topic-wise', 'Take mixed timed tests from the MPT bank'],
    tools: [{ label: 'MPT practice', to: '/mpt' }, { label: 'Subject MCQ banks', to: '/css-mcqs' }, { label: 'Answer timer', to: '/answer-timer' }],
  },
  {
    title: 'Why candidates fail Current Affairs',
    causes: ['Headline knowledge without background, causes or policy options', 'Unsourced or invented statistics', 'One-sided opinions presented as analysis'],
    fixes: ['Build issue files: background → actors → developments → implications → policy options', 'Keep a dated statistics bank from official sources', 'Present multiple viewpoints before concluding'],
    tools: [{ label: 'Current affairs dossier', to: '/current-affairs' }, { label: 'One-liner GK facts', to: '/one-liner-gk' }],
  },
  {
    title: 'Why candidates fail Pakistan Affairs',
    causes: ['Confused chronology of 1857–1947 and constitutional development', 'Narrative answers with no analysis or present-day linkage', 'Inaccurate dates, articles and document names'],
    fixes: ['Master the timeline first, then themes', 'Anchor every answer in documents, dates and events', 'Link history questions to contemporary relevance'],
    tools: [{ label: 'What has been asked before', to: '/css-past-paper-analysis?subject=pakistan-affairs' }, { label: 'Official syllabus & planner', to: '/fpsc-syllabus?subject=pakistan-affairs' }, { label: 'Subject guide', to: '/subjects/compulsory/pakistan-affairs' }],
  },
  {
    title: 'Why candidates fail Islamic Studies',
    causes: ['Invented or inaccurate Ayat/Hadith references', 'Ignoring the contemporary-application dimension', 'Disorganised presentation of well-known material'],
    fixes: ['Memorise fewer references but cite them accurately', 'Add a present-day section to every prepared topic', 'Practise structured answers from past papers'],
    tools: [{ label: 'What has been asked before', to: '/css-past-paper-analysis?subject=islamic-studies' }, { label: 'Official syllabus & planner', to: '/fpsc-syllabus?subject=islamic-studies' }, { label: 'Practice questions', to: '/css-mcqs' }],
  },
  {
    title: 'Why subject selection fails',
    causes: ['Choosing by rumoured “scoring trends”', 'Ignoring background and interest', 'Underestimating 200-mark syllabi', 'Group-rule violations discovered late'],
    fixes: ['Use the selector tool; validate group rules early', 'Prefer background alignment over trends', 'Read the actual syllabus before committing'],
    tools: [{ label: 'Subject selection tool', to: '/subjects/selector' }, { label: 'Optional subject directory', to: '/subjects/optional' }],
  },
  {
    title: 'Why preparation plans collapse',
    causes: ['Plans with no revision or rest days', 'Perfectionist first subjects consuming all months', 'No measurement - weeks pass without a single timed test'],
    fixes: ['Generate a realistic schedule with built-in revision', 'Time-box every subject and move on', 'Measure weekly: one test, one essay, tracked on the dashboard'],
    tools: [{ label: 'Build a study plan', to: '/study-planner' }, { label: 'Track your progress', to: '/dashboard' }, { label: 'Exam Intelligence', to: '/exam-intelligence' }],
  },
]

export const successHabits = [
  'They write daily - reading alone never cleared CSS',
  'They verify every date and rule from FPSC, not from groups',
  'They keep error logs and re-attempt what they got wrong',
  'They protect sleep and treat rest as part of the plan',
  'They finish the syllabus early and spend the last phase only revising and testing',
  'They choose subjects by background and interest, not by herd behaviour',
]
