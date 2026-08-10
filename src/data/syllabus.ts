// CSS syllabus structure based on the official FPSC CSS Competitive Examination rules & syllabus.
// Source: FPSC (fpsc.gov.pk) - CSS CE Rules & Syllabus. Verify the latest revision from FPSC.
export const syllabusSource = {
  name: 'FPSC - CSS Competitive Examination Rules & Syllabus',
  url: 'https://www.fpsc.gov.pk/',
  lastUpdated: '2026-07-17',
}

export interface CompulsorySubject {
  slug: string
  name: string
  marks: number
  passMarks: string
  time: string
  overview: string
  structure: { part: string; detail: string }[]
  topics: { title: string; points: string[] }[]
  sequence: string[]
  books: { title: string; author?: string; why: string; covers: string }[]
  answerTips: string[]
  checklist: string[]
}

export const compulsorySubjects: CompulsorySubject[] = [
  {
    slug: 'essay',
    name: 'English Essay',
    marks: 100,
    passMarks: '40%',
    time: '3 hours',
    overview:
      'Candidates write one essay from a wide choice of topics. The paper tests idea generation, organisation, argument, clarity and correctness of expression. It is historically the highest-failure paper in the written examination.',
    structure: [
      { part: 'One essay', detail: 'A single essay chosen from roughly 10 given topics spanning several themes.' },
      { part: 'Length', detail: 'A comprehensive essay - candidates are expected to develop a full-length, well-structured piece.' },
      { part: 'Assessment', detail: 'Relevance to the topic, thesis, outline, coherence, argument, language and presentation.' },
    ],
    topics: [
      { title: 'Core skill areas', points: ['Topic interpretation', 'Thesis statement', 'Outline writing', 'Paragraph unity and coherence', 'Argument and counterargument', 'Evidence and examples', 'Conclusion techniques'] },
      { title: 'Recurring themes', points: ['Education', 'Democracy and governance', 'Gender', 'Climate change', 'Globalisation', 'Technology and AI', 'Social media', 'Economy', 'Foreign policy', 'Populism'] },
    ],
    sequence: ['Master grammar and sentence control', 'Learn outline discipline', 'Study theme-wise content', 'Write one timed essay weekly', 'Get feedback and rewrite'],
    books: [
      { title: 'The Elements of Style', author: 'Strunk & White', why: 'Builds clarity, concision and correctness - the qualities examiners reward most.', covers: 'Sentence control, usage, style fundamentals' },
      { title: 'On Writing Well', author: 'William Zinsser', why: 'Practical guide to clear non-fiction writing and structure.', covers: 'Organisation, clarity, revision' },
      { title: 'A broad current-affairs reading habit (Dawn, The Economist)', why: 'Essays are won on content; reading builds the evidence base for every theme.', covers: 'Content for all recurring themes' },
    ],
    answerTips: ['Interpret the exact wording of the topic before writing', 'Prepare the outline on the answer sheet as required', 'One idea per paragraph with a clear topic sentence', 'Prefer simple, correct English over ornate, risky English'],
    checklist: ['Can write a focused thesis in one sentence', 'Can outline any common theme in 5 minutes', 'Can sustain 15–20 coherent paragraphs', 'Grammar errors are rare in timed writing'],
  },
  {
    slug: 'precis-composition',
    name: 'English (Precis & Composition)',
    marks: 100,
    passMarks: '40%',
    time: '3 hours',
    overview:
      'Tests precise command of English: precis writing, comprehension, grammar, sentence correction, vocabulary, punctuation, pair of words and translation-style usage. Alongside Essay, it is the other major hurdle for candidates.',
    structure: [
      { part: 'Precis with title', detail: 'Compress a long passage to roughly one-third with a suitable title.' },
      { part: 'Comprehension', detail: 'Questions on an unseen passage.' },
      { part: 'Grammar & usage', detail: 'Correction, punctuation, tenses, voice, narration-style items (pattern varies by year).' },
      { part: 'Vocabulary', detail: 'Idioms, pair of words, synonyms/antonyms, sentence making.' },
      { part: 'Paragraph / expansion', detail: 'A short structured writing task (pattern varies by year).' },
    ],
    topics: [
      { title: 'Precis skills', points: ['Identifying the main idea', 'Removing redundancy', 'Indirect speech and third person', 'Title selection'] },
      { title: 'Grammar core', points: ['Tenses', 'Articles', 'Prepositions', 'Subject-verb agreement', 'Active/passive voice', 'Punctuation'] },
      { title: 'Vocabulary core', points: ['Idioms and phrases', 'Pair of words', 'Synonyms & antonyms', 'One-word substitutions', 'Phrasal verbs'] },
    ],
    sequence: ['Repair grammar fundamentals', 'Practise one precis daily', 'Build vocabulary in themed lists', 'Attempt full past papers under time'],
    books: [
      { title: 'High School English Grammar & Composition', author: 'Wren & Martin', why: 'The standard reference for the exact grammar areas this paper tests.', covers: 'All grammar sections' },
      { title: 'Practical English Usage', author: 'Michael Swan', why: 'Resolves the usage doubts that appear in correction and sentence items.', covers: 'Usage, idiomatic English' },
      { title: "Owner-provided grammar book (CSS Vista grammar centre)", why: 'The authorised grammar-learning structure for this platform.', covers: 'Topic-wise lessons and exercises' },
    ],
    answerTips: ['Write the precis in your own words - never lift phrases', 'Count words; stay near the required limit', 'Attempt correction questions only when sure of the rule', 'Keep vocabulary sentences short and unmistakably correct'],
    checklist: ['Can precis 300 words to 100 in 35 minutes', 'Tenses/articles/prepositions errors eliminated', '300+ idioms and pairs revised', 'Two full past papers attempted under time'],
  },
  {
    slug: 'general-science-ability',
    name: 'General Science & Ability',
    marks: 100,
    passMarks: '40%',
    time: '3 hours',
    overview:
      'Two-part paper: General Science (physical, biological, environmental and everyday science, including IT) and General Ability (quantitative reasoning, basic arithmetic, logical and analytical reasoning, mental abilities).',
    structure: [
      { part: 'Section I - General Science', detail: 'Conceptual science questions drawn from the FPSC syllabus areas.' },
      { part: 'Section II - General Ability', detail: 'Quantitative and analytical reasoning; basic mathematics; logical puzzles.' },
    ],
    topics: [
      { title: 'General Science', points: ['Physical sciences basics', 'Biological sciences and human health', 'Environmental science and climate', 'Food, agriculture and biotechnology', 'Information technology and telecommunications', 'Energy and natural resources'] },
      { title: 'General Ability', points: ['Percentages, ratios, averages', 'Time, speed, work and distance', 'Basic algebra and geometry', 'Series and coding', 'Logical and analytical reasoning'] },
    ],
    sequence: ['Revise matric-level science concepts', 'Practise quantitative section daily in short sets', 'Drill past-paper reasoning questions', 'Take mixed timed tests'],
    books: [
      { title: 'NCERT-style secondary science textbooks', why: 'The syllabus is conceptual secondary-level science; school-level texts cover it faithfully.', covers: 'Section I science concepts' },
      { title: 'Quantitative aptitude practice book (e.g. R.S. Aggarwal)', why: 'The reasoning section mirrors standard aptitude tests; drills build speed.', covers: 'Section II quantitative & logical ability' },
    ],
    answerTips: ['Answer science questions with clear diagrams where useful', 'Show working in quantitative questions', 'Attempt the stronger section first within its own time discipline'],
    checklist: ['Science concepts revised topic-wise', '200+ quantitative questions practised', 'Past papers mapped to syllabus topics', 'Timed mixed test completed'],
  },
  {
    slug: 'current-affairs',
    name: 'Current Affairs',
    marks: 100,
    passMarks: '40%',
    time: '3 hours',
    overview:
      'Analytical questions on national and international developments, Pakistan’s foreign policy, regional issues, global economy, security and international organisations. Rewards structured analysis backed by credible facts.',
    structure: [{ part: 'Subjective paper', detail: 'A set of analytical questions; candidates answer the required number with structured, evidence-based responses.' }],
    topics: [
      { title: 'Pakistan-focused', points: ['Domestic politics and governance', 'Economy and federal budget issues', 'Foreign policy and major bilateral relationships', 'CPEC and regional connectivity'] },
      { title: 'Global', points: ['Great-power competition', 'Middle East and Afghan issues', 'Climate diplomacy', 'Global economy and institutions', 'International organisations (UN, SCO, OIC)'] },
    ],
    sequence: ['Build background notes per issue', 'Follow one quality newspaper daily', 'Maintain issue-wise timelines and statistics', 'Practise analytical answer writing'],
    books: [
      { title: 'Daily quality press (Dawn, Business Recorder; international: BBC, Al Jazeera)', why: 'Current Affairs is built from disciplined daily reading, not one book.', covers: 'All areas' },
      { title: 'Official reports (UN, World Bank, IMF, State Bank of Pakistan, Ministry of Finance)', why: 'Statistics and policy facts must come from primary sources to be credible in answers.', covers: 'Economy, governance, development data' },
    ],
    answerTips: ['Structure: background → actors → developments → implications for Pakistan → way forward', 'Use dated, sourced statistics', 'Present multiple viewpoints before your conclusion'],
    checklist: ['Issue files for 15–20 major topics', 'Statistics bank maintained', 'Timelines for major issues', '10+ timed analytical answers written'],
  },
  {
    slug: 'pakistan-affairs',
    name: 'Pakistan Affairs',
    marks: 100,
    passMarks: '40%',
    time: '3 hours',
    overview:
      'Covers the ideology and history of the Pakistan Movement, constitutional and political development since 1947, geography, economy, society, and contemporary national issues.',
    structure: [{ part: 'Subjective paper', detail: 'Analytical questions on pre- and post-independence history, constitutional development and contemporary affairs.' }],
    topics: [
      { title: 'Pre-1947', points: ['Ideology of Pakistan', 'Aligarh and reform movements', 'Pakistan Movement 1857–1947', 'Constitutional reforms under British rule'] },
      { title: 'Post-1947', points: ['Constitutional development (1956, 1962, 1973)', 'Political history and major eras', 'Economy and development', 'Foreign policy milestones', 'Federalism, provinces and society', 'Contemporary issues'] },
    ],
    sequence: ['Master the 1857–1947 narrative first', 'Build constitutional timeline notes', 'Add contemporary issue files', 'Practise past-paper questions topic-wise'],
    books: [
      { title: 'Pakistan: A Hard Country', author: 'Anatol Lieven', why: 'Widely respected analysis of Pakistan’s society, state and regions - useful for contemporary answers.', covers: 'Post-1947 society, state, regions' },
      { title: 'The Struggle for Pakistan', author: 'Ayesha Jalal', why: 'A standard academic account of the Pakistan Movement.', covers: 'Pre-1947 history' },
      { title: 'Constitution of Pakistan 1973 (official text)', why: 'Constitutional answers must cite accurate articles and amendments.', covers: 'Constitutional development' },
    ],
    answerTips: ['Anchor answers in dates, documents and events', 'Balance narrative with analysis', 'Link historical questions to present-day relevance'],
    checklist: ['Timeline 1857–1947 memorised', 'Constitutional development notes complete', 'Contemporary issue files ready', 'Past-paper themes mapped'],
  },
  {
    slug: 'islamic-studies',
    name: 'Islamic Studies / Comparative Religion',
    marks: 100,
    passMarks: '40%',
    time: '3 hours',
    overview:
      'Islamic Studies for Muslim candidates (Comparative Study of Major Religions for non-Muslim candidates): basic beliefs and pillars, Seerah, the Quran and Sunnah as sources of guidance, Islamic history, human rights and contemporary issues from an Islamic perspective.',
    structure: [{ part: 'Subjective paper', detail: 'Questions on beliefs, Seerah, Islamic thought, history and contemporary application; Ayat/Ahadith references strengthen answers.' }],
    topics: [
      { title: 'Foundations', points: ['Articles of faith and pillars of Islam', 'Quran and Sunnah as sources', 'Seerah of the Prophet (PBUH) - Makki and Madani periods'] },
      { title: 'Application & history', points: ['Khilafat-e-Rashida', 'Islamic social and economic principles', 'Human rights and minorities in Islam', 'Islam and the modern world'] },
    ],
    sequence: ['Consolidate beliefs/pillars with references', 'Build Seerah timeline', 'Prepare contemporary-issue answers', 'Practise referencing Ayat and Ahadith accurately'],
    books: [
      { title: 'The Sealed Nectar (Ar-Raheeq Al-Makhtum)', author: 'Safiur Rahman Mubarakpuri', why: 'Standard, authentic Seerah reference for Madki/Madani period answers.', covers: 'Seerah' },
      { title: 'The Noble Quran with translation', why: 'Accurate Ayat references are the backbone of strong answers.', covers: 'All sections' },
    ],
    answerTips: ['Reference Ayat and Ahadith accurately - never invent references', 'Address the contemporary dimension in every answer', 'Present balanced, respectful scholarly views'],
    checklist: ['Core references memorised with accurate citations', 'Seerah timeline ready', 'Contemporary topics prepared', 'Past-paper questions attempted'],
  },
]

export interface OptionalSubject {
  name: string
  marks: number
  group: number
  nature: string
  background: string
  overlap: string
  difficulty: 'Moderate' | 'Demanding' | 'High'
  prepTime: string
  suitedFor: string
  risks: string
}

export const optionalGroups: { group: number; rule: string; subjects: OptionalSubject[] }[] = [
  {
    group: 1,
    rule: 'Select one subject of 200 marks',
    subjects: [
      { name: 'Accounting & Auditing', marks: 200, group: 1, nature: 'Technical, numerical and conceptual', background: 'Strong for B.Com/BBA/ACCA candidates', overlap: 'Limited overlap with compulsory subjects', difficulty: 'Demanding', prepTime: '4–6 months', suitedFor: 'Commerce/accounts graduates', risks: 'Large syllabus; weak numerical base makes it costly' },
      { name: 'Economics', marks: 200, group: 1, nature: 'Analytical theory + applied economy', background: 'Economics/business background preferred', overlap: 'Strong overlap with Current Affairs and Essay (economy themes)', difficulty: 'Demanding', prepTime: '4–6 months', suitedFor: 'Economics graduates; candidates strong in analysis', risks: 'Theory depth; diagrams and models must be accurate' },
      { name: 'Computer Science', marks: 200, group: 1, nature: 'Technical and conceptual', background: 'CS/IT degree strongly preferred', overlap: 'Some overlap with General Science & Ability (IT portion)', difficulty: 'Demanding', prepTime: '4–6 months', suitedFor: 'CS/IT graduates', risks: 'Breadth of syllabus; dated resources can mislead' },
      { name: 'Political Science', marks: 200, group: 1, nature: 'Theoretical and analytical', background: 'No strict background needed; heavy reading', overlap: 'Excellent overlap with Current Affairs, Pakistan Affairs, Essay', difficulty: 'Moderate', prepTime: '3–5 months', suitedFor: 'Candidates with interest in theory, governance, IR', risks: 'Requires genuine understanding of thinkers and theories' },
      { name: 'International Relations', marks: 200, group: 1, nature: 'Analytical, current-linked', background: 'No strict background; reading-intensive', overlap: 'Very strong overlap with Current Affairs, Pakistan Affairs, Essay', difficulty: 'Moderate', prepTime: '3–5 months', suitedFor: 'Candidates strong in current affairs and analysis', risks: 'Popular choice - answers must stand out analytically' },
    ],
  },
  {
    group: 2,
    rule: 'Select one subject of 200 marks OR two subjects of 100 marks each',
    subjects: [
      { name: 'Physics', marks: 200, group: 2, nature: 'Technical, numerical', background: 'BSc/MSc Physics', overlap: 'Overlap with General Science & Ability', difficulty: 'High', prepTime: '5–7 months', suitedFor: 'Physics graduates', risks: 'Very demanding without degree-level command' },
      { name: 'Chemistry', marks: 200, group: 2, nature: 'Technical, numerical + theory', background: 'BSc/MSc Chemistry', overlap: 'Overlap with General Science & Ability', difficulty: 'High', prepTime: '5–7 months', suitedFor: 'Chemistry graduates', risks: 'Demanding; practical knowledge assumed' },
      { name: 'Applied Mathematics', marks: 100, group: 2, nature: 'Numerical', background: 'Mathematics background', overlap: 'Supports General Ability section', difficulty: 'High', prepTime: '4–6 months', suitedFor: 'Mathematics graduates', risks: 'Accuracy under time pressure' },
      { name: 'Pure Mathematics', marks: 100, group: 2, nature: 'Numerical, abstract', background: 'Mathematics background', overlap: 'Limited', difficulty: 'High', prepTime: '4–6 months', suitedFor: 'Mathematics graduates', risks: 'Abstract proof-based content' },
      { name: 'Statistics', marks: 100, group: 2, nature: 'Numerical, applied', background: 'Statistics/quant background', overlap: 'Useful for data-based answers elsewhere', difficulty: 'Demanding', prepTime: '3–5 months', suitedFor: 'Statistics/quant graduates', risks: 'Formula precision required' },
      { name: 'Geology', marks: 100, group: 2, nature: 'Scientific, factual', background: 'Geology background helpful', overlap: 'Some overlap with Environmental Sciences', difficulty: 'Demanding', prepTime: '3–5 months', suitedFor: 'Geology graduates', risks: 'Limited guidance material in market' },
    ],
  },
  {
    group: 3,
    rule: 'Select one subject of 100 marks',
    subjects: [
      { name: 'Business Administration', marks: 100, group: 3, nature: 'Applied management concepts', background: 'BBA/MBA helpful', overlap: 'Some overlap with Essay economy themes', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Business graduates', risks: 'Generic answers score poorly - needs applied examples' },
      { name: 'Public Administration', marks: 100, group: 3, nature: 'Conceptual, governance-focused', background: 'No strict background', overlap: 'Strong overlap with Governance themes in Essay and Pakistan Affairs', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Candidates interested in civil service work', risks: 'Theories must be applied, not just listed' },
      { name: 'Governance & Public Policies', marks: 100, group: 3, nature: 'Policy-oriented, current-linked', background: 'No strict background', overlap: 'Strong overlap with Current Affairs and Essay governance themes', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Candidates strong in current affairs', risks: 'Needs updated policy examples' },
      { name: 'Town Planning & Urban Management', marks: 100, group: 3, nature: 'Technical + policy', background: 'Architecture/planning helpful', overlap: 'Some overlap with governance themes', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Planning/architecture graduates', risks: 'Niche material; fewer resources' },
    ],
  },
  {
    group: 4,
    rule: 'Select one subject of 100 marks',
    subjects: [
      { name: 'History of Pakistan & India', marks: 100, group: 4, nature: 'Historical narrative + analysis', background: 'No strict background', overlap: 'Very strong overlap with Pakistan Affairs', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Candidates strong in Pakistan Affairs', risks: 'Dates and sources must be accurate' },
      { name: 'Islamic History & Culture', marks: 100, group: 4, nature: 'Historical narrative', background: 'No strict background', overlap: 'Strong overlap with Islamic Studies', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Candidates strong in Islamic Studies', risks: 'Breadth of periods covered' },
      { name: 'British History', marks: 100, group: 4, nature: 'Historical narrative', background: 'Interest in European history', overlap: 'Limited', difficulty: 'Moderate', prepTime: '3–4 months', suitedFor: 'History enthusiasts', risks: 'Long chronological span' },
      { name: 'European History', marks: 100, group: 4, nature: 'Historical narrative + analysis', background: 'Interest in European history', overlap: 'Some overlap with IR (historical context)', difficulty: 'Moderate', prepTime: '3–4 months', suitedFor: 'History enthusiasts', risks: 'Wide span (1789 onwards)' },
      { name: 'History of USA', marks: 100, group: 4, nature: 'Compact historical narrative', background: 'No strict background', overlap: 'Some overlap with Current Affairs (US relations)', difficulty: 'Moderate', prepTime: '2–3 months', suitedFor: 'Candidates wanting a shorter syllabus', risks: 'Popular; needs precise factual command' },
    ],
  },
  {
    group: 5,
    rule: 'Select one subject of 100 marks',
    subjects: [
      { name: 'Gender Studies', marks: 100, group: 5, nature: 'Conceptual + contemporary', background: 'No strict background', overlap: 'Strong overlap with Essay (gender themes) and Current Affairs', difficulty: 'Moderate', prepTime: '2–3 months', suitedFor: 'Candidates interested in social issues', risks: 'Needs balanced, academic treatment' },
      { name: 'Environmental Sciences', marks: 100, group: 5, nature: 'Scientific + policy', background: 'Science background helpful but not essential', overlap: 'Strong overlap with General Science & Ability and climate themes', difficulty: 'Moderate', prepTime: '2–3 months', suitedFor: 'Candidates interested in climate/environment', risks: 'Statistics must be current and sourced' },
      { name: 'Agriculture & Forestry', marks: 100, group: 5, nature: 'Scientific, applied', background: 'Agriculture background helpful', overlap: 'Some overlap with economy/food-security themes', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Agriculture graduates', risks: 'Niche resources' },
      { name: 'Botany', marks: 100, group: 5, nature: 'Scientific', background: 'BSc Botany', overlap: 'Overlap with General Science', difficulty: 'Demanding', prepTime: '3–5 months', suitedFor: 'Botany graduates', risks: 'Technical breadth' },
      { name: 'Zoology', marks: 100, group: 5, nature: 'Scientific', background: 'BSc Zoology', overlap: 'Overlap with General Science', difficulty: 'Demanding', prepTime: '3–5 months', suitedFor: 'Zoology graduates', risks: 'Technical breadth' },
      { name: 'English Literature', marks: 100, group: 5, nature: 'Literary, interpretive', background: 'Strong literary reading habit', overlap: 'Supports Essay expression', difficulty: 'Moderate', prepTime: '3–4 months', suitedFor: 'Literature graduates and avid readers', risks: 'Requires genuine familiarity with texts' },
      { name: 'Urdu Literature', marks: 100, group: 5, nature: 'Literary, interpretive', background: 'Strong Urdu literary background', overlap: 'Limited', difficulty: 'Moderate', prepTime: '3–4 months', suitedFor: 'Urdu literature graduates', risks: 'Answer quality depends on literary depth' },
    ],
  },
  {
    group: 6,
    rule: 'Select one subject of 100 marks',
    subjects: [
      { name: 'Law', marks: 100, group: 6, nature: 'Doctrinal + applied', background: 'LLB strongly preferred', overlap: 'Some overlap with constitutional topics', difficulty: 'Demanding', prepTime: '3–5 months', suitedFor: 'Law graduates', risks: 'Statutory precision required' },
      { name: 'Constitutional Law', marks: 100, group: 6, nature: 'Doctrinal, comparative', background: 'Law background helpful', overlap: 'Strong overlap with Pakistan Affairs (constitutional development)', difficulty: 'Demanding', prepTime: '3–4 months', suitedFor: 'Law/political science candidates', risks: 'Requires accurate citation of constitutions' },
      { name: 'International Law', marks: 100, group: 6, nature: 'Doctrinal + current-linked', background: 'Law background helpful', overlap: 'Strong overlap with International Relations and Current Affairs', difficulty: 'Demanding', prepTime: '3–4 months', suitedFor: 'Law/IR candidates', risks: 'Treaties and cases must be cited accurately' },
      { name: 'Muslim Law & Jurisprudence', marks: 100, group: 6, nature: 'Doctrinal', background: 'Law or Islamic studies background', overlap: 'Overlap with Islamic Studies', difficulty: 'Demanding', prepTime: '3–4 months', suitedFor: 'Law/Sharia candidates', risks: 'School-of-thought differences must be precise' },
      { name: 'Mercantile Law', marks: 100, group: 6, nature: 'Doctrinal, commercial', background: 'Law/commerce background', overlap: 'Limited', difficulty: 'Demanding', prepTime: '3–4 months', suitedFor: 'Law/commerce graduates', risks: 'Statute-heavy preparation' },
      { name: 'Criminology', marks: 100, group: 6, nature: 'Social-science, applied', background: 'No strict background', overlap: 'Overlap with Sociology and governance themes', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Candidates interested in policing/justice sectors', risks: 'Theories must be applied to Pakistan’s context' },
      { name: 'Philosophy', marks: 100, group: 6, nature: 'Abstract, conceptual', background: 'Strong reading background', overlap: 'Supports Essay argumentation', difficulty: 'Demanding', prepTime: '3–5 months', suitedFor: 'Candidates who enjoy abstract thought', risks: 'Abstract answers need exceptional clarity' },
    ],
  },
  {
    group: 7,
    rule: 'Select one subject of 100 marks',
    subjects: [
      { name: 'Journalism & Mass Communication', marks: 100, group: 7, nature: 'Conceptual + contemporary media', background: 'Media background helpful', overlap: 'Overlap with Essay media themes and Current Affairs', difficulty: 'Moderate', prepTime: '2–3 months', suitedFor: 'Media/communication candidates', risks: 'Needs updated media-landscape examples' },
      { name: 'Psychology', marks: 100, group: 7, nature: 'Scientific + applied', background: 'Psychology background helpful', overlap: 'Some overlap with interview/psychological assessment awareness', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Psychology graduates', risks: 'Experimental/theoretical precision' },
      { name: 'Geography', marks: 100, group: 7, nature: 'Scientific + human geography', background: 'No strict background', overlap: 'Overlap with General Science and regional affairs', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Candidates comfortable with maps and data', risks: 'Diagrams expected in answers' },
      { name: 'Sociology', marks: 100, group: 7, nature: 'Conceptual social science', background: 'No strict background', overlap: 'Strong overlap with Essay social themes and Gender Studies', difficulty: 'Moderate', prepTime: '2–3 months', suitedFor: 'Candidates interested in society and theory', risks: 'Thinkers and theories must be accurate' },
      { name: 'Anthropology', marks: 100, group: 7, nature: 'Conceptual social science', background: 'No strict background', overlap: 'Overlap with Sociology', difficulty: 'Moderate', prepTime: '2–3 months', suitedFor: 'Social-science candidates', risks: 'Fewer quality resources available' },
      { name: 'Punjabi', marks: 100, group: 7, nature: 'Regional language literature', background: 'Strong Punjabi literary background', overlap: 'Limited', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Native-level Punjabi candidates', risks: 'Requires literary command, not spoken fluency' },
      { name: 'Sindhi', marks: 100, group: 7, nature: 'Regional language literature', background: 'Strong Sindhi literary background', overlap: 'Limited', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Native-level Sindhi candidates', risks: 'Requires literary command' },
      { name: 'Pashto', marks: 100, group: 7, nature: 'Regional language literature', background: 'Strong Pashto literary background', overlap: 'Limited', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Native-level Pashto candidates', risks: 'Requires literary command' },
      { name: 'Balochi', marks: 100, group: 7, nature: 'Regional language literature', background: 'Strong Balochi literary background', overlap: 'Limited', difficulty: 'Moderate', prepTime: '2–4 months', suitedFor: 'Native-level Balochi candidates', risks: 'Requires literary command' },
      { name: 'Persian', marks: 100, group: 7, nature: 'Classical language literature', background: 'Persian language background', overlap: 'Cultural overlap with Islamic History', difficulty: 'Moderate', prepTime: '3–4 months', suitedFor: 'Persian-language candidates', risks: 'Classical texts require preparation' },
      { name: 'Arabic', marks: 100, group: 7, nature: 'Classical language literature', background: 'Arabic language background', overlap: 'Overlap with Islamic Studies', difficulty: 'Moderate', prepTime: '3–4 months', suitedFor: 'Arabic-language candidates', risks: 'Grammar and literature both tested' },
    ],
  },
]

export const examFacts = {
  writtenTotal: 1200,
  compulsoryTotal: 600,
  optionalTotal: 600,
  vivaMarks: 300,
  grandTotal: 1500,
  writtenPassRule: '40% in each compulsory subject, 33% in each optional subject, and 50% aggregate in the written examination (confirm current rule from FPSC).',
  attempts: 'A maximum of three attempts (confirm current rules from FPSC).',
  ageLimit: '21 to 30 years, calculated as of the cut-off date in the official advertisement; limited age relaxation exists for categories defined in the CSS Rules (confirm from FPSC).',
  qualification: 'Minimum a Bachelor degree (at least 2nd Division) from an HEC-recognised university (confirm current rules from FPSC).',
  nationality: 'Pakistani citizens; domicile determines the provincial/regional quota. Specific provisions exist in the CSS Rules for AJK/GB and others (confirm from FPSC).',
}

export const allocationQuotaNote =
  'Allocations to occupational groups are made on merit-cum-quota: provincial/regional shares (Punjab, Sindh Urban/Rural, Khyber Pakhtunkhwa, Balochistan, GB/FATA, AJK) plus a minorities quota, as defined in the CSS Rules and the Establishment Division policy. Verify current percentages from official sources.'
