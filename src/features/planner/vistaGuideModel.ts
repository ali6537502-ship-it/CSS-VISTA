import type { StudyScheduleTask, SyllabusItemStatus } from '@/lib/store'
import { dayWorkload, shiftDay, validDay } from './model.ts'

export type VistaExam = 'css' | 'pms-punjab'
export interface VistaNode { id: string; title: string; detail: string; section?: string; children?: VistaNode[] }
export interface VistaSection { id: string; title: string; detail?: string; topics: VistaNode[] }
export interface VistaSubject {
  id: string; title: string; designation: 'compulsory' | 'optional'; marks: number | null
  file?: string; sourceUrl?: string; sections: VistaSection[]
  readings?: string[]; notes?: string[]; provenance?: string
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
}
export const defaultVistaPreferences: VistaPreferences = {
  version: 1, subjectsPerDay: 2, dailyMinutes: 240, restDays: [0], targetDate: '',
  startDate: '', mode: 'rotate', selectedOptionals: [], alternative: 'islamic-studies',
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
  return themes.map(theme => ({
    id: prefix + theme.slug,
    title: theme.name,
    detail: theme.brief + '\nResearch stages: ' + theme.sections.map(s=>s.letter+'. '+s.title).join('; '),
  }))
}
export function pmsGuideSubjects(data: { subjects: VistaSubject[] }, themes: VistaEssayTheme[] = []): VistaSubject[] {
  return data.subjects.map(subject=>subject.id==='compulsory-english-essay' ? {
    ...subject,sections:[...subject.sections,{
      id:'essay-themes-2027',
      title:'Essay Themes 2027 — additional preparation resource, not prescribed PPSC syllabus content',
      detail:'The existing research roadmap offers twenty-five themes for structured essay practice.',
      topics:essayThemeTopics('pms-punjab:vista:compulsory-english-essay:theme:',themes),
    }],
  }:subject)
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
        ...(isEssay ? { resource: 'essay' as const, ...(node.id.includes(':theme:') ? { resourceSlug: node.id.split(':theme:')[1] } : {}) }
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
  return subjects.filter(s => {
    if (s.designation === 'optional') return prefs.selectedOptionals.includes(exam === 'css' ? s.title : s.id)
    if (exam === 'pms-punjab') return s.id !== (prefs.alternative === 'ethics' ? 'compulsory-islamic-studies' : 'compulsory-ethics-for-non-muslim-candidates')
    if (s.id === 'islamic-studies') return prefs.alternative !== 'comparative'
    if (s.id === 'comparative-religions') return prefs.alternative === 'comparative'
    return true
  })
}
export function buildVistaNotesCommand(unit: VistaUnit, depth: 'comprehensive' | 'revision' = 'comprehensive') {
  const level = depth === 'revision' ? 'focused revision notes while retaining all syllabus headings' : 'comprehensive, textbook-depth notes for independent preparation'
  return [
    'VISTA NOTES COMMAND — EXAMINATION PREPARATION',
    'Act as a specialist teacher, examiner and academic researcher for the subject and examination below.',
    'Prepare ' + level + ' strictly grounded in the exact supplied syllabus.',
    '',
    'EXAMINATION: ' + unit.paper,
    'SUBJECT: ' + unit.subject,
    'PAPER / SECTION: ' + unit.section,
    'ASSIGNED CHAPTER OR TOPIC: ' + unit.title,
    '',
    'EXACT PRESCRIBED SYLLABUS:',
    unit.syllabus,
    '',
    'INSTRUCTIONS:',
    '1. Cover every supplied heading, concept, author, work and subtopic without omission. Preserve all meaningful sections and their hierarchy.',
    '2. Explain the background and fundamental concepts in clear language. Develop analytical arguments, competing interpretations, objections, comparative dimensions, implications and genuine examples appropriate to this subject.',
    '3. For legal topics cite the applicable law and provisions accurately; for quantitative subjects provide formulas and worked solutions; for literary topics analyze prescribed texts and interpretations; for languages use the required script.',
    '4. Use only verifiable facts, quotations, case law and current data. If browsing is available, check authoritative sources and give traceable references; otherwise clearly state which claims require verification. Never invent citations or statistics.',
    '5. Include original examination-style analytical questions with structured model answer frameworks and a revision summary.',
    '6. Make notes substantial enough to support independent preparation. If too long for one reply, label the output Part 1 and enumerate exactly which remaining syllabus subtopics still need coverage.',
    '7. Clearly distinguish additional analytical background from the supplied official syllabus. Do not silently add or omit prescribed material.',
    '',
    'Begin with the first syllabus heading.',
  ].join('\n')
}
export interface VistaDraftTask { syllabusItemId: string; subject: string; paper: string; section: string; topic: string; date: string; minutes: number }
export interface VistaPlan { draft: VistaDraftTask[]; finishedOn: string; scheduledSubjects: number; alreadyCovered: number }
export function generateVistaPlan(subjects: VistaSubject[], exam: VistaExam, preferences: VistaPreferences, existing: StudyScheduleTask[], statuses: Record<string,SyllabusItemStatus>, starting: string): VistaPlan {
  if (!validDay(starting) || preferences.restDays.length === 7 || preferences.dailyMinutes < 30) throw Error('Choose a valid start date, available study time and at least one study day.')
  if (preferences.targetDate && preferences.targetDate < starting) throw Error('The target completion date must be on or after the start date.')
  const chosen = selectedVistaSubjects(subjects, exam, preferences)
  if (!chosen.length) throw Error('Choose your subjects first.')
  const previouslyScheduled = new Set(existing.map(t => t.syllabusItemId))
  const rows = chosen.map(s => ({
    subject: s, items: guideUnits(s, exam).filter(u => statuses[u.id] !== 'completed' && !previouslyScheduled.has(u.id)),
  })).filter(r => r.items.length)
  const alreadyCovered = chosen.reduce((sum,s) => sum + guideUnits(s,exam).filter(u=>statuses[u.id]==='completed'||previouslyScheduled.has(u.id)).length,0)
  const drafts: VistaDraftTask[] = []
  if (!rows.length) return { draft: [], finishedOn: starting, scheduledSubjects: chosen.length, alreadyCovered }
  let day = starting, cursor = 0, dayGuard = 0
  while (rows.some(row => row.items.length)) {
    if (++dayGuard > 3650) throw Error('This plan cannot fit within ten years; reduce the selection or revise your schedule.')
    const weekday = new Date(day + 'T12:00:00').getDay()
    const reserved = dayWorkload([...existing, ...drafts.map((d,i)=>({...d,id:'vista-preview-'+i,status:'not-started' as const,createdAt:''}))],day).minutes
    const available = preferences.dailyMinutes - reserved
    if (!preferences.restDays.includes(weekday) && available >= 30) {
      const target = Math.min(preferences.subjectsPerDay, Math.floor(available / 30), rows.filter(x=>x.items.length>0).length)
      const today: typeof rows = []
      if (preferences.mode === 'focus') {
        for(const row of rows) { if(row.items.length && today.length < target) today.push(row) }
      } else {
        let seen=0
        while(today.length < target && seen < rows.length) {
          const row=rows[(cursor+seen)%rows.length]
          if(row.items.length) today.push(row)
          seen++
        }
        cursor=(cursor+seen)%rows.length
      }
      const perSubject=Math.min(600,Math.floor(available/Math.max(1,today.length)))
      for(const row of today) {
        const u=row.items.shift()
        if(!u)continue
        drafts.push({syllabusItemId:u.id,subject:u.subject,paper:u.paper,section:u.section,topic:u.title,date:day,minutes:perSubject})
      }
    }
    if(rows.some(x=>x.items.length))day=shiftDay(day,1)
    if(preferences.targetDate && day>preferences.targetDate && rows.some(x=>x.items.length)) throw Error('The remaining chapters will not fit before your chosen target. Increase the time available, select up to three subjects daily, or extend your target.')
  }
  return {draft:drafts,finishedOn:day,scheduledSubjects:chosen.length,alreadyCovered}
}
