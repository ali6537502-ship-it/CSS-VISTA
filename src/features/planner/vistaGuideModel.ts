import type { StudyScheduleTask, SyllabusItemStatus } from '@/lib/store'
import { shiftDay, validDay } from './model.ts'

export type VistaExam = 'css' | 'pms-punjab'
export interface VistaNode { id: string; title: string; detail: string; section?: string; children?: VistaNode[] }
export interface VistaSection { id: string; title: string; detail?: string; topics: VistaNode[] }
export interface VistaSubject {
  id: string; title: string; designation: 'compulsory' | 'optional'; marks: number | null
  file?: string; sourceUrl?: string; sections: VistaSection[]
  readings?: string[]; notes?: string[]; provenance?: string; officialGuidance?: string[]
}
export interface VistaUnit {
  id: string; subjectId: string; subject: string; section: string; title: string
  syllabus: string; paper: string; resource?: 'precis' | 'essay'; resourceSlug?: string
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
export function readVistaPreferences(raw: unknown, fallback: Partial<VistaPreferences> = {}): VistaPreferences {
  const x = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Partial<VistaPreferences> : {}
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
  return data.subjects.map(subject=>{
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
}
export function cssGuideSubjects(data: { subjects: Array<{ slug: string; name: string; designation: 'compulsory' | 'optional'; marks: number; sections: Array<{ title: string; items: string[] }> }> }, themes: VistaEssayTheme[] = []): VistaSubject[] {
  const papers = data.subjects.map(s => ({
    id: s.slug, title: s.name, designation: s.designation, marks: s.marks,
    sections: s.sections.map((section, i) => ({
      id: 's' + (i + 1), title: section.title, detail: '',
      topics: [{ id: 'vista-css:' + s.slug + ':s' + (i + 1), title: section.title, detail: section.items.join(' ').replace(/\s+/g, ' ').trim() }],
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
export function guideUnits(subject: VistaSubject, exam: VistaExam): VistaUnit[] {
  const isEssay = exam === 'css' ? subject.id === 'essay' : subject.id === 'compulsory-english-essay'
  const isPrecis = exam === 'css' ? subject.id === 'precis-composition' : subject.id === 'compulsory-english-precis-comprehension-grammar-and-translation-etc'
  const result: VistaUnit[] = []
  for (const section of subject.sections) for (const root of section.topics) {
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
        syllabus: [section.title, section.detail, ...ancestors, outline(node)]
          .filter(Boolean).join('\n'),
        paper: exam === 'css' ? 'CSS' : 'PMS Punjab',
        ...(isEssay ? { resource: 'essay' as const, ...(node.id.includes(':theme:') ? { resourceSlug: node.id.split(':theme:')[1].split(':')[0] } : {}) }
          : isPrecis ? { resource: 'precis' as const } : {}),
      })
    }
    walk(root, [])
  }
  return result
}
export function findGuideUnit(subjects: VistaSubject[], exam: VistaExam, id: string): VistaUnit | null {
  for (const subject of subjects) {
    const result = guideUnits(subject, exam).find(u => u.id === id || id.startsWith(u.id + '-'))
    if (result) return result
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
export function buildVistaNotesCommand(unit: VistaUnit, depth: 'comprehensive' | 'revision' = 'comprehensive') {
  const level = depth === 'revision' ? 'focused revision notes while retaining all syllabus headings' : 'comprehensive, textbook-depth notes for independent preparation'
  const supplemental = unit.resource === 'essay' && (unit.id.includes(':theme:') || unit.id.endsWith(':resource'))
  return [
    'VISTA NOTES COMMAND — EXAMINATION PREPARATION',
    'Act as a specialist teacher, examiner and academic researcher for the subject and examination below.',
    'Prepare ' + level + ' strictly grounded in the supplied ' + (supplemental ? 'supplementary essay-preparation roadmap, which is not an official syllabus extract.' : 'official syllabus extract.'),
    '',
    'EXAMINATION: ' + unit.paper,
    'SUBJECT: ' + unit.subject,
    'PAPER / SECTION: ' + unit.section,
    'ASSIGNED CHAPTER OR TOPIC: ' + unit.title,
    '',
    supplemental ? 'SUPPLEMENTARY ESSAY RESEARCH ROADMAP (NOT AN OFFICIAL SYLLABUS EXTRACT):' : 'EXACT PRESCRIBED SYLLABUS:',
    unit.syllabus,
    '',
    'INSTRUCTIONS:',
    '1. Cover every supplied heading, concept, author, work and subtopic without omission. Preserve all meaningful sections and their hierarchy.',
    '2. Explain the background and fundamental concepts in clear language. Develop analytical arguments, competing interpretations, objections, comparative dimensions, implications and genuine examples appropriate to this subject.',
    '3. For legal topics cite the applicable law and provisions accurately; for quantitative subjects provide formulas and worked solutions; for literary topics analyze prescribed texts and interpretations; for languages use the required script.',
    '4. Use only verifiable facts, quotations, case law and current data. If browsing is available, check authoritative sources and give traceable references; otherwise clearly state which claims require verification. Never invent citations or statistics.',
    '5. Include original examination-style analytical questions with structured model answer frameworks and a revision summary.',
    '6. Make notes substantial enough to support independent preparation. If too long for one reply, label the output Part 1 and enumerate exactly which remaining syllabus subtopics still need coverage.',
    '7. Clearly distinguish additional analytical background from official syllabus requirements. Never claim that supplementary essay themes are officially prescribed. Do not silently add or omit supplied material.',
    '',
    'Begin with the first syllabus heading.',
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
  return Math.max(45, Math.min(150, 45 + 15 * Math.floor(unit.syllabus.length / 260)))
}
export function generateVistaPlan(subjects: VistaSubject[], exam: VistaExam, preferences: VistaPreferences, existing: StudyScheduleTask[], statuses: Record<string,SyllabusItemStatus>, starting: string): VistaPlan {
  if (!validDay(starting) || preferences.restDays.length === 7 || preferences.dailyMinutes < 30 || preferences.dailyMinutes > 720) throw Error('Choose a valid start date, 30 minutes to 12 hours, and at least one study day.')
  if (preferences.targetDate && preferences.targetDate < starting) throw Error('The target completion date must be on or after the start date.')
  const chosen = selectedVistaSubjects(subjects, exam, preferences)
  if (!chosen.length) throw Error('Choose your subjects first.')
  if (chosen.some(subject => subject.id === (exam === 'css' ? 'essay' : 'compulsory-english-essay')) && preferences.selectedEssayThemes?.length === 0)
    throw Error('Select at least one essay theme or remove English Essay from the subjects you want to study now.')
  const previouslyScheduled = new Set(existing.map(task => task.syllabusItemId))
  const rows = chosen.map(subject => ({
    subject,
    items: plannedVistaUnits(subject,exam,preferences).filter(unit=>statuses[unit.id]!=='completed' && !previouslyScheduled.has(unit.id)),
  })).filter(row=>row.items.length)
  const alreadyCovered = chosen.reduce((sum,subject) =>
    sum+plannedVistaUnits(subject,exam,preferences).filter(unit=>statuses[unit.id]==='completed'||previouslyScheduled.has(unit.id)).length,0)
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
