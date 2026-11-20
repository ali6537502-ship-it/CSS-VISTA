import type { StudyScheduleTask, SyllabusItemStatus } from '@/lib/store'
import { shiftDay, validDay } from './model.ts'
import { pmsMentalAbilitySubject } from '../../data/pmsMentalAbility.ts'

export type VistaExam = 'css' | 'pms-punjab'
export interface VistaNode { id: string; title: string; detail: string; section?: string; children?: VistaNode[] }
export interface VistaSection { id: string; title: string; detail?: string; topics: VistaNode[]; sourceItems?: string[] }
export interface VistaSubject {
  id: string; title: string; designation: 'compulsory' | 'optional'; marks: number | null
  file?: string; sourceUrl?: string; sections: VistaSection[]
  readings?: string[]; notes?: string[]; provenance?: string; officialGuidance?: string[]
}
export interface VistaUnit {
  id: string; subjectId: string; subject: string; section: string; title: string
  syllabus: string; paper: string; resource?: 'precis' | 'essay'; resourceSlug?: string; excerptFocus?: boolean
  sourceBlock?: boolean; sourceFocus?: string; legacySectionId?: string
}
export interface VistaPreferences {
  version: 1
  subjectsPerDay: 1 | 2 | 3
  dailyMinutes: number
  restDays: number[]
  targetDate: string
  startDate: string
  mode: 'rotate' | 'focus'
  selectedOptionals: string[]
  alternative: 'islamic-studies' | 'ethics' | 'comparative'
  studySubjects: string[] | null // null preserves legacy all-selected behavior
  prioritySubjects: string[]
  selectedEssayThemes: string[] | null // null includes the entire supplementary roadmap
}
export const defaultVistaPreferences: VistaPreferences = {
  version: 1, subjectsPerDay: 2, dailyMinutes: 240, restDays: [0], targetDate: '',
  startDate: '', mode: 'rotate', selectedOptionals: [], alternative: 'islamic-studies',
  studySubjects: null, prioritySubjects: [], selectedEssayThemes: null,
}
export function serializeVistaPreferences(prefs: VistaPreferences): string {
  // The progress cloud merges object arrays by union. An atomic string prevents
  // removed optionals, themes or study subjects from silently reappearing.
  return JSON.stringify({version: 1, settings: JSON.stringify(prefs)})
}
export function readVistaPreferences(raw: unknown, fallback: Partial<VistaPreferences> = {}): VistaPreferences {
  let value = raw
  if (value && typeof value === 'object' && !Array.isArray(value) && typeof (value as {settings?:unknown}).settings === 'string') {
    try { value = JSON.parse((value as {settings:string}).settings) } catch { value = null }
  }
  const x = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<VistaPreferences> : {}
  const base = { ...defaultVistaPreferences, ...fallback }
  return {
    version: 1,
    subjectsPerDay: x.subjectsPerDay === 1 || x.subjectsPerDay === 2 || x.subjectsPerDay === 3 ? x.subjectsPerDay : base.subjectsPerDay,
    dailyMinutes: Number.isInteger(x.dailyMinutes) && x.dailyMinutes! >= 30 && x.dailyMinutes! <= 720 ? x.dailyMinutes! : base.dailyMinutes,
    restDays: Array.isArray(x.restDays) ? [...new Set(x.restDays.filter((v): v is number => Number.isInteger(v) && v >= 0 && v <= 6))] : base.restDays,
    targetDate: typeof x.targetDate === 'string' && (x.targetDate === '' || validDay(x.targetDate)) ? x.targetDate : base.targetDate,
    startDate: typeof x.startDate === 'string' && (x.startDate === '' || validDay(x.startDate)) ? x.startDate : base.startDate,
    mode: x.mode === 'focus' || x.mode === 'rotate' ? x.mode : base.mode,
    selectedOptionals: Array.isArray(x.selectedOptionals) ? [...new Set(x.selectedOptionals.filter((v): v is string => typeof v === 'string'))] : base.selectedOptionals,
    alternative: x.alternative === 'ethics' || x.alternative === 'comparative' || x.alternative === 'islamic-studies' ? x.alternative : base.alternative,
    studySubjects: Array.isArray(x.studySubjects) ? [...new Set(x.studySubjects.filter((v): v is string => typeof v === 'string'))] : base.studySubjects,
    prioritySubjects: Array.isArray(x.prioritySubjects) ? [...new Set(x.prioritySubjects.filter((v): v is string => typeof v === 'string'))] : base.prioritySubjects,
    selectedEssayThemes: Array.isArray(x.selectedEssayThemes) ? [...new Set(x.selectedEssayThemes.filter((v): v is string => typeof v === 'string'))] : base.selectedEssayThemes,
  }
}
function outline(node: VistaNode, depth = 0): string {
  const title = '  '.repeat(depth) + node.title
  const detail = node.detail?.trim() && node.detail.trim() !== node.title.trim() ? '\n' + node.detail : ''
  const children = (node.children || []).map(n => outline(n, depth + 1)).join('\n')
  return title + detail + (children ? '\n' + children : '')
}
export type VistaEssayTheme = { slug: string; name: string; brief: string; sections: Array<{letter: string; title: string}> }
function essayThemeTopics(prefix: string, themes: VistaEssayTheme[]): VistaNode[] {
  const writingGuidance = prefix.startsWith('pms-punjab:')
    ? 'Write a coherent essay of about 1,500 words, following the prescribed PMS Punjab requirement.'
    : 'Write a full coherent practice essay, following the applicable CSS English Essay paper requirements.'
  // Essay paper instructions describe assessment, not lessons. Each genuine
  // research-roadmap theme produces four actionable preparation sessions.
  return themes.map(theme => ({
    id: prefix + theme.slug + ':overview',
    title: theme.name,
    detail: theme.brief + '\nRoadmap sections: ' + theme.sections.map(s=>s.letter+'. '+s.title).join('; '),
    children: [
      { id: prefix + theme.slug, title: 'Research the theme: ' + theme.name, detail: 'Define the theme, explore its dimensions and collect verifiable evidence using the existing research roadmap.' },
      { id: prefix + theme.slug + ':outline', title: 'Build arguments and outline: ' + theme.name, detail: 'Frame a clear thesis, develop balanced arguments and counterarguments, and construct a logical essay outline.' },
      { id: prefix + theme.slug + ':draft', title: 'Write a full essay: ' + theme.name, detail: writingGuidance },
      { id: prefix + theme.slug + ':review', title: 'Evaluate and improve: ' + theme.name, detail: 'Review conceptual clarity, organisation, reasoning, expression, grammar and evidence; then rewrite weak passages.' },
    ],
  }))
}
export function pmsGuideSubjects(data: { subjects: VistaSubject[] }, themes: VistaEssayTheme[] = []): VistaSubject[] {
  const updated = data.subjects.map(subject=>{
    if(subject.id !== 'compulsory-english-essay')return subject
    // Retain every official PPSC requirement verbatim as guidance. Do not turn
    // the two examination instructions into scheduled chapters.
    const officialGuidance = subject.sections.flatMap(section =>
      section.topics.map(topic=>topic.detail?.trim() || topic.title.trim()))
    return {
      ...subject, officialGuidance,
      sections: [{
        id: 'essay-themes-2027',
        title: 'Essay Themes 2027 — supplementary preparation roadmap (not prescribed PPSC syllabus topics)',
        detail: 'Select and prepare research themes through evidence gathering, outlines, full essays and editorial review. The official PPSC essay requirements are displayed separately.',
        topics: essayThemeTopics('pms-punjab:vista:compulsory-english-essay:theme:', themes),
      }],
    }
  })
  if (!updated.some(subject=>subject.id===pmsMentalAbilitySubject.id)) updated.splice(1,0,pmsMentalAbilitySubject)
  return updated
}
/**
 * Group adjacent source lines only when the previous line visibly continues.
 * The resulting units are PRACTICE STUDY BLOCKS, not invented FPSC headings.
 * Preserve every actual source line and its original order, including OCR spelling.
 */
export function cssOptionalStudyBlocks(items: string[]): Array<{ start: number; text: string }> {
  const blocks: Array<{ start: number; text: string }> = []
  let current: string[] = []
  let start = 0
  const flush = () => {
    if (current.length) blocks.push({ start, text: current.join('\n') })
    current = []
  }
  for (let i = 0; i < items.length; i++) {
    const line = items[i]?.trim()
    if (!line) continue
    const previous = current[current.length - 1]
    const followsPrevious = !!previous && (
      /[,;:([\-–]$/.test(previous) ||
      /\b(?:and|or|the|a|of|to|from|in|with|for|by|including|between)\s*$/i.test(previous) ||
      /^[a-z]/.test(line) ||
      (previous.length > 75 && previous.includes(',') && !/[.!?]$/.test(previous))
    )
    if (current.length && !followsPrevious) flush()
    if (!current.length) start = i
    current.push(line)
  }
  flush()
  return blocks
}
export function cssGuideSubjects(data: { subjects: Array<{ slug: string; name: string; designation: 'compulsory' | 'optional'; marks: number; sections: Array<{ title: string; items: string[] }> }> }, themes: VistaEssayTheme[] = []): VistaSubject[] {
  const papers: VistaSubject[] = data.subjects.map(s => ({
    id: s.slug, title: s.name, designation: s.designation, marks: s.marks,
    sections: s.sections.map((section, i) => ({
      id: 's' + (i + 1), title: section.title, detail: '',
      // Raw source wording remains untouched and is available for exact focus commands.
      sourceItems: s.designation === 'optional' ? section.items : undefined,
      topics: (() => {
        const rootId='vista-css:' + s.slug + ':s' + (i + 1)
        const originalText=section.items.map((item,index)=>(index+1)+'. '+item.trim()).join('\n')
        const blocks=s.designation==='optional' ? cssOptionalStudyBlocks(section.items) : []
        return [{
          id:rootId,title:section.title,detail:originalText,
          // Keep the old root ID as a real syllabus container for historical tasks.
          // New optional schedules cover all readable entries in focused blocks.
          ...(blocks.length>1 ? {children:blocks.map((block,index)=>({
            id:rootId+':block:'+block.start,
            title:'Study block '+(index+1)+' of '+blocks.length+' — '+block.text.replace(/\s+/g,' ').slice(0,90),
            detail:'SELECTED OFFICIAL SOURCE LINES (not necessarily standalone syllabus headings):\n'+block.text,
          }))} : {}),
        }]
      })(),
    })),
  }))
  // The distributed FPSC JSON omits the separate Essay paper. This is a
  // clearly labelled preparation activity linking to the existing roadmap,
  // not a fabricated transcription of an FPSC syllabus section.
  if (!papers.some(s => s.id === 'essay')) papers.unshift({
    id: 'essay', title: 'English Essay', designation: 'compulsory', marks: 100,
    sections: [{ id: 's1', title: 'Essay Themes 2027 — preparation resource (not an FPSC syllabus extract)', detail: 'Follow the existing twenty-five-theme research roadmap and practise essay writing.',
      topics: essayThemeTopics('vista-css:essay:theme:',themes).length ? essayThemeTopics('vista-css:essay:theme:',themes) : [{id:'vista-css:essay:resource',title:'Open Essay Themes 2027 research roadmap',detail:'Follow the existing roadmap for essay research and timed practice.'}],
    }],
  })
  return papers
}
/**
 * Optional papers include OCR-wrapped source lines, not consistently separated
 * syllabus topics. Offer focused commands for exact original entries with the
 * whole section as context; never treat a line fragment as an invented chapter.
 * These units are copy-only and are deliberately absent from scheduled units.
 */
export function cssOptionalFocusUnits(subject: VistaSubject, section: VistaSection): VistaUnit[] {
  if (subject.designation !== 'optional' || !section.sourceItems?.length) return []
  const allLines = section.sourceItems.map(line => line.trim())
  return allLines.flatMap((excerpt, index) => excerpt ? [{
    id: 'vista-css:' + subject.id + ':' + section.id + ':source:' + index,
    subjectId: subject.id,
    subject: subject.title,
    section: section.title,
    title: excerpt,
    paper: 'CSS',
    excerptFocus: true,
    syllabus: [
      'OFFICIAL FPSC SECTION: ' + section.title,
      'SELECTED SOURCE EXCERPT (may be part of a line-wrapped passage):',
      excerpt,
      '',
      'COMPLETE SECTION TEXT FOR CONTEXT ONLY (original source order):',
      allLines.filter(Boolean).join('\n'),
    ].join('\n'),
  }] : [])
}
export function guideUnits(subject: VistaSubject, exam: VistaExam): VistaUnit[] {
  const isEssay = exam === 'css' ? subject.id === 'essay' : subject.id === 'compulsory-english-essay'
  const isPrecis = exam === 'css' ? subject.id === 'precis-composition' : subject.id === 'compulsory-english-precis-comprehension-grammar-and-translation-etc'
  const result: VistaUnit[] = []
  for (const section of subject.sections) {
    // Some official outlines include a whole examinable section only as text
    // under its heading. Keep that material schedulable without inventing subtopics.
    const topics = section.topics.length ? section.topics : section.detail?.trim() ? [{
      id: (exam==='css' ? 'vista-css:' : 'pms-punjab:vista:') + subject.id + ':' + section.id + ':overview',
      title: section.title,
      detail: section.detail,
    }] : []
    for (const root of topics) {
    function walk(node: VistaNode, parents: VistaNode[]) {
      // A chapter with real child topics is a syllabus container, not one
      // enormous day's task. Use its leaves without losing parent context.
      if (node.children?.length) {
        for (const child of node.children) walk(child, [...parents, node])
        return
      }
      if (!node.title.trim() && !node.detail.trim()) return
      const ancestors = parents.map(parent =>
        parent.title + (parent.detail?.trim() && parent.detail.trim() !== parent.title.trim() ? '\n' + parent.detail : '')
      )
      const sectionName = node.section || parents.slice().reverse().find(p => p.section)?.section || section.title
      result.push({
        id: node.id, subjectId: subject.id, subject: subject.title,
        section: sectionName, title: node.title,
        ...(exam==='css' && subject.designation==='optional' && node.id.includes(':block:') ? {
          sourceBlock:true, legacySectionId:node.id.split(':block:')[0], sourceFocus:node.detail.replace(/^SELECTED OFFICIAL SOURCE LINES[^\n]*\n/,'')
        } : {}),
        syllabus: [section.title, section.detail, ...ancestors, outline(node)]
          .filter(Boolean).join('\n'),
        paper: exam === 'css' ? 'CSS' : 'PMS Punjab',
        ...(isEssay ? { resource: 'essay' as const, ...(node.id.includes(':theme:') ? { resourceSlug: node.id.split(':theme:')[1].split(':')[0] } : {}) }
          : isPrecis ? { resource: 'precis' as const } : {}),
      })
    }
    walk(root, [])
    }
  }
  return result
}
export function findGuideUnit(subjects: VistaSubject[], exam: VistaExam, id: string): VistaUnit | null {
  for (const subject of subjects) {
    const result = guideUnits(subject, exam).find(u => u.id === id || id.startsWith(u.id + '-'))
    if (result) return result
    if(exam==='css' && subject.designation==='optional') {
      // A historical section-level task must remain resolvable after it gains
      // source-backed children. Do not change or delete its saved task ID.
      const section=subject.sections.find(s=>'vista-css:'+subject.id+':'+s.id===id)
      if(section)return {
        id,subjectId:subject.id,subject:subject.title,section:section.title,
        title:section.title,paper:'CSS',
        syllabus:[section.title,...(section.sourceItems||[])].join('\n'),
      }
    }
  }
  return null
}
export function selectedVistaSubjects(subjects: VistaSubject[], exam: VistaExam, prefs: VistaPreferences) {
  const eligible = subjects.filter(s => {
    if (s.designation === 'optional') return prefs.selectedOptionals.includes(exam === 'css' ? s.title : s.id)
    if (exam === 'pms-punjab') return s.id !== (prefs.alternative === 'ethics' ? 'compulsory-islamic-studies' : 'compulsory-ethics-for-non-muslim-candidates')
    if (s.id === 'islamic-studies') return prefs.alternative !== 'comparative'
    if (s.id === 'comparative-religions') return prefs.alternative === 'comparative'
    return true
  }).filter(s => prefs.studySubjects === null || prefs.studySubjects.includes(s.id))
  const priorities = new Map(prefs.prioritySubjects.map((id, index) => [id, index]))
  // A student-defined order controls both focused schedules and the starting
  // point for rotation. Unranked subjects keep their original syllabus order.
  return eligible.sort((a,b) =>
    (priorities.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (priorities.get(b.id) ?? Number.MAX_SAFE_INTEGER))
}
export function plannedVistaUnits(subject: VistaSubject, exam: VistaExam, prefs: VistaPreferences): VistaUnit[] {
  return guideUnits(subject, exam).filter(unit =>
    unit.resource !== 'essay' || prefs.selectedEssayThemes === null
      || !!unit.resourceSlug && prefs.selectedEssayThemes.includes(unit.resourceSlug))
}
/**
 * Original FPSC topic tasks use slug:sectionIndex:itemIndex, unlike Vista's
 * section-level tasks. Resolve the old task only from its exact source index;
 * never turn manual tasks or imported prose into alleged FPSC syllabus text.
 */
export function resolveLegacyCssNotesUnit(
  data: { subjects: Array<{ slug: string; name: string; sections: Array<{ title: string; items: string[] }> }> },
  syllabusItemId: string,
): VistaUnit | null {
  const match = /^([^:]+):(\d+):(\d+)$/.exec(syllabusItemId)
  if (!match) return null
  const subject = data.subjects.find(row => row.slug === match[1])
  if (!subject) return null
  const section = subject.sections[Number(match[2])]
  const topic = section?.items[Number(match[3])]
  if (!section || typeof topic !== 'string' || !topic.trim()) return null
  return {
    id: syllabusItemId,
    subjectId: subject.slug,
    subject: subject.name,
    section: section.title,
    title: topic.trim(),
    syllabus: section.title + '\n' + topic.trim(),
    paper: 'CSS',
  }
}

/**
 * One shared source-grounded notes command for CSS and PMS, including older
 * CSS schedule items. Its instructions are deliberately discipline-aware but
 * cannot guarantee a model's factual accuracy or that browser/image tools
 * will be available in the user's chosen ChatGPT conversation.
 */
export function buildVistaNotesCommand(unit: VistaUnit, depth: 'comprehensive' | 'revision' = 'comprehensive') {
  const isEssay = unit.resource === 'essay'
  const isMentalGuidebook = unit.paper === 'PMS Punjab' && unit.subjectId === 'compulsory-mental-ability-and-reasoning-test'
  const kind = unit.excerptFocus || unit.sourceBlock
    ? 'FPSC OPTIONAL SYLLABUS STUDY BLOCK — SOURCE LINES MAY BE WRAPPED'
    : isEssay
    ? 'SUPPLEMENTARY ESSAY RESEARCH ROADMAP — NOT AN OFFICIAL SYLLABUS'
    : isMentalGuidebook
      ? 'PPSC MENTAL ABILITY GUIDEBOOK TOPIC — THE GUIDEBOOK IS NON-EXHAUSTIVE'
      : unit.paper === 'CSS'
        ? 'FPSC SYLLABUS TOPIC OR SECTION (SOURCE TRANSCRIPTION)'
        : 'PPSC SYLLABUS TOPIC OR SECTION (SOURCE TRANSCRIPTION)'
  const scope = depth === 'revision' ? 'focused but complete revision notes' : 'comprehensive, textbook-depth learning notes'
  return [
    'EXAMINATION NOTES — SOURCE-LED STUDY COMMAND',
    'You are an expert teacher, subject specialist, examiner and careful academic researcher.',
    'Produce ' + scope + ' for independent examination preparation. Do not make the answer generic, superficial, or a collection of one-paragraph headings.',
    '',
    'EXAMINATION: ' + unit.paper,
    'SUBJECT: ' + unit.subject,
    'PAPER / SECTION: ' + unit.section,
    'ASSIGNED TOPIC: ' + unit.title,
    'SOURCE CLASSIFICATION: ' + kind,
    '',
    isEssay ? 'SUPPLEMENTARY ESSAY RESEARCH ROADMAP (not prescribed examination content):' :
      isMentalGuidebook ? 'PPSC GUIDEBOOK MATERIAL (non-exhaustive):' : 'Exact prescribed content as supplied (verify against the official source when possible):',
    unit.syllabus,
    '',
    'MANDATORY WORKING RULES:',
    ...(unit.excerptFocus || unit.sourceBlock ? ['FOCUS RULE: Explain the selected source lines and their natural continuation. The complete section text is reference context, not an instruction to generate notes for every neighboring topic. FPSC line breaks do not define official chapter boundaries. Do not claim this study block is a standalone official syllabus chapter.'] : []),
    unit.excerptFocus || unit.sourceBlock ? '1. Identify the selected source passage and its complete meaning using adjacent lines as context. Preserve original terms, wording and prescribed names; never confuse document line breaks with official topic boundaries. Organize focused teaching material logically, distinguishing explanatory subheadings from official syllabus text.' : '1. First identify the subject, examination, requested scope and every heading/subheading/individual topic visible above. Treat the supplied wording as the coverage checklist; retain its order, names, important quotations, prescribed authors and original-language terms. If the source is a flat list, preserve it as distinct items rather than merging or losing entries. Reconstruct a clear numbered teaching hierarchy, explicitly marking any explanatory subheadings you add as your own organization, not as official syllabus entries.',
    unit.excerptFocus || unit.sourceBlock ? '2. Cover the focused passage and any necessary continuation in meaningful textbook depth. Explain definitions, background, mechanisms, competing views, examples and examination relevance as appropriate. Do not drift into unrelated topics from the surrounding section. Avoid repetitive padding and superficial summaries.' : '2. Cover every distinct syllabus item, including nested points, in meaningful depth. Under each substantive heading explain definitions, background, mechanisms, competing interpretations, causes, consequences, objections, applications and examination relevance wherever appropriate. Explain fundamentals before difficult analysis, in clear language, and connect arguments logically. Avoid vague padding, repeated introductory paragraphs and unsupported sweeping claims.',
    '3. Adapt the method to the subject instead of forcing one template: for history use accurate chronology, actors, causes, historiography and consequences; for political science, governance and international relations examine thinkers, institutions, theories and competing views; for economics and current affairs explain indicators, official figures, trade-offs, policy options and implications; for law identify jurisdiction, instruments, precise provisions and holdings; for science and environment explain processes, mechanisms and experiments; for mathematics, statistics and ability provide definitions, correct formulas and worked problems; for languages and literature use the prescribed original script and analyse the specified texts; for Islamic Studies cite Qur’an by surah and verse and hadith only when their exact references can be verified. Omit discipline-specific requirements that do not fit.',
    '4. When a claim depends on recent events, law, statistics, exact quotations, historical dates, treaty provisions or named cases, use web research if the conversation supports it. Prioritize primary authorities (official commission syllabi, constitutions, statutes, court judgments, official statistics, recognised institutions and original works), then reputable scholarship. Cross-check material claims with independent credible sources when possible. Cite the actual source title, institution, date/year and working link beside the relevant claim or in that section’s references. Do not cite a source you have not accessed. Distinguish official source text from extra explanatory material.',
    '5. Never invent citations or statistics. Do not fabricate case names, dates, articles, books, page numbers, treaties, quotations, source URLs, numerical values, author attributions or supposed expert consensus. If verification is unavailable, explicitly label the claim as needing verification or omit it. Do not pretend to have browsed, inspected a PDF or seen a source when you have not. If two trustworthy accounts disagree, explain the disagreement rather than silently choosing one.',
    '6. Include helpful ORIGINAL labelled diagrams, flowcharts, timelines, comparison tables, maps, scientific sketches or mathematical illustrations when they clarify a difficult concept. Keep proportions/geography accurate; do not fabricate labels or datasets. If drawing or diagram tools are unavailable, use a readable text or Mermaid diagram where supported, otherwise describe the diagram precisely; do not claim that a diagram was rendered when it was not.',
    '7. Include relevant REAL photographs, maps, institutional illustrations, archival visuals or charts when their evidentiary and teaching value is clear. If image/web search is available, locate suitable trustworthy sources, attribute the source and explain what each image shows. Use actual images only if the interface supports displaying them; otherwise give verified source links and descriptive captions. Do not invent image URLs, depict fabricated images as documentary photographs, or add decorative/unrelated photos. For abstract topics with no useful genuine image, omit photographs.',
    '8. Include verified, specific examples, suitable comparative cases, counterarguments and genuine illustrations for each major conceptual dimension. Mark a teaching example as hypothetical when it is not a historical or real-world fact. For numerical topics, show steps, units, assumptions and checks. For essays distinguish the optional theme roadmap from any officially prescribed topic and prioritise argument building, evidence and structured writing practice.',
    '9. Write cohesive textbook-style explanations under exact logical headings (e.g., 1, 1.1, 1.1.1 where useful); use tables only for real comparisons. Do not replace detailed explanations with lists, unsupported slogans, motivational filler, prompts for the student to research everything, or an excessive number of tiny bullet points. Use easy-to-understand language without sacrificing accuracy or analytical depth.',
    '10. Add exam-relevant analytical questions with substantial answer outlines, common misconceptions and a concise revision recap after the teaching sections. Separate substantiated facts, analytical interpretation and recommendations; never imply that your original practice questions are past examination questions.',
    unit.excerptFocus ? '11. Check that the selected excerpt and its necessary continuation were explained, naming any uncertain reference. If the answer must continue, identify exactly which aspects of the focused excerpt remain. Do not silently broaden the assignment to the complete syllabus section.' : '11. Before finishing, check coverage against every supplied heading/subheading and state any genuinely uncovered items or uncertain references. If the full chapter cannot fit in one reply, provide as much continuous, substantial content as possible in Part 1, stop at a natural section boundary, and state exactly which topics remain for continuation. Do not compress or silently omit sections to fit.',
    '12. Deliver the actual notes in this ChatGPT conversation. Do not substitute a PDF, promise later background research, or ask unnecessary setup questions. If a tool required for visuals or current verification is unavailable, acknowledge that limitation briefly and complete the text notes using only reliable information.',
    '',
    'START NOW with the first supplied heading. Do not begin with an explanation of what this command does.',
  ].join('\n')
}
export interface VistaDraftTask { syllabusItemId: string; subject: string; paper: string; section: string; topic: string; date: string; minutes: number }
export interface VistaPlan { draft: VistaDraftTask[]; finishedOn: string; scheduledSubjects: number; alreadyCovered: number }
/** Suggested study minutes reflect reading load, not official exam time guidance. */
export function suggestedVistaMinutes(unit: VistaUnit) {
  if (unit.resource === 'essay') {
    if (unit.id.endsWith(':draft')) return unit.paper === 'CSS' ? 180 : 150
    if (unit.id.endsWith(':outline') || unit.id.endsWith(':review')) return 60
    return 90
  }
  const size=unit.sourceBlock ? (unit.sourceFocus||'').length : unit.syllabus.length
  return Math.max(45, Math.min(150, 45 + 15 * Math.floor(size / 260)))
}
export function generateVistaPlan(subjects: VistaSubject[], exam: VistaExam, preferences: VistaPreferences, existing: StudyScheduleTask[], statuses: Record<string,SyllabusItemStatus>, starting: string): VistaPlan {
  if (!validDay(starting) || preferences.restDays.length === 7 || preferences.dailyMinutes < 30 || preferences.dailyMinutes > 720) throw Error('Choose a valid start date, 30 minutes to 12 hours, and at least one study day.')
  if (preferences.targetDate && preferences.targetDate < starting) throw Error('The target completion date must be on or after the start date.')
  const chosen = selectedVistaSubjects(subjects, exam, preferences)
  if (!chosen.length) throw Error('Choose your subjects first.')
  if (exam === 'pms-punjab' && preferences.selectedOptionals.length > 1)
    throw Error('The revised PMS scheme allows one optional subject. Choose one optional paper in Subjects and routine.')
  if (chosen.some(subject => subject.id === (exam === 'css' ? 'essay' : 'compulsory-english-essay')) && preferences.selectedEssayThemes?.length === 0)
    throw Error('Select at least one essay theme or remove English Essay from the subjects you want to study now.')
  if(exam==='css') {
    const unavailable=chosen.filter(subject=>subject.designation==='optional' && !subject.sections.length)
    if(unavailable.length)throw Error('The current FPSC syllabus extract has no transcribed sections for '+unavailable.map(s=>s.title).join(', ')+'. No source-based schedule can be invented. Choose another paper or supply an official complete outline.')
  }
  const previouslyScheduled = new Set(existing.map(task => task.syllabusItemId))
  const accountedFor=(unit: VistaUnit) =>
    statuses[unit.id]==='completed' || previouslyScheduled.has(unit.id) ||
    !!unit.legacySectionId && (statuses[unit.legacySectionId]==='completed' || previouslyScheduled.has(unit.legacySectionId))
  const rows = chosen.map(subject => ({
    subject,
    items: plannedVistaUnits(subject,exam,preferences).filter(unit=>!accountedFor(unit)),
  })).filter(row=>row.items.length)
  const alreadyCovered = chosen.reduce((sum,subject) =>
    sum+plannedVistaUnits(subject,exam,preferences).filter(accountedFor).length,0)
  const draft: VistaDraftTask[] = []
  if(!rows.length)return {draft,finishedOn:starting,scheduledSubjects:chosen.length,alreadyCovered}
  // Existing CSS and PMS sessions share a student's available hours.
  // Index those hours once, rather than rebuilding the full schedule every day.
  const workload=new Map<string,number>()
  const existingSubjects=new Map<string,Set<string>>()
  for(const task of existing){
    workload.set(task.date,(workload.get(task.date)||0)+task.minutes)
    const sameExam=exam==='pms-punjab' ? task.syllabusItemId.startsWith('pms-punjab:') : !task.syllabusItemId.startsWith('pms-punjab:')
    if(sameExam){
      if(!existingSubjects.has(task.date))existingSubjects.set(task.date,new Set())
      existingSubjects.get(task.date)!.add(task.subject)
    }
  }
  let day=starting,cursor=0,scans=0
  while(rows.some(row=>row.items.length)) {
    if(++scans>3650)throw Error('The selected workload cannot fit into ten years. Revise the subject selection or availability.')
    const weekday=new Date(day+'T12:00:00').getDay()
    const available=preferences.dailyMinutes-(workload.get(day)||0)
    if(!preferences.restDays.includes(weekday)&&available>=30) {
      const target=Math.min(preferences.subjectsPerDay,Math.floor(available/30),rows.filter(row=>row.items.length).length)
      const today:typeof rows=[]
      const covered=new Set(existingSubjects.get(day)||[])
      const candidates=preferences.mode==='focus'?rows:rows.map((_,i)=>rows[(cursor+i)%rows.length])
      for(const row of candidates){
        if(!row.items.length || today.length>=target)continue
        if(!covered.has(row.subject.title)&&covered.size>=preferences.subjectsPerDay)continue
        covered.add(row.subject.title)
        today.push(row)
      }
      if(preferences.mode==='rotate')cursor=(cursor+Math.max(1,today.length))%rows.length
      let consumed=0
      for(const row of today) {
        const budget=Math.floor(available/Math.max(1,today.length))
        let spent=0
        // Several manageable chapters of the same subject can share a study
        // day. The number of DISTINCT subjects never exceeds the student's choice.
        while(row.items.length&&budget-spent>=30) {
          const unit=row.items[0],estimate=suggestedVistaMinutes(unit)
          const duration=Math.min(600,estimate,budget-spent)
          if(duration<30)break
          row.items.shift()
          draft.push({syllabusItemId:unit.id,subject:unit.subject,paper:unit.paper,section:unit.section,topic:unit.title,date:day,minutes:duration})
          spent+=duration
        }
        consumed+=spent
      }
      workload.set(day,(workload.get(day)||0)+consumed)
    }
    if(rows.some(row=>row.items.length))day=shiftDay(day,1)
    if(preferences.targetDate&&day>preferences.targetDate&&rows.some(row=>row.items.length))
      throw Error('The remaining chapters will not fit before your chosen target. Increase the time available or extend your target.')
  }
  return {draft,finishedOn:day,scheduledSubjects:chosen.length,alreadyCovered}
}
