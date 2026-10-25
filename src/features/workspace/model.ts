import { optionalGroups } from '../../data/syllabus.ts'
export type SyllabusSubject = { slug: string; name: string; marks: number; sections: { title: string; items: string[] }[] }
export const compulsorySlots = [
  ['essay','English Essay'], ['precis-composition','English (Precis & Composition)'],
  ['general-science-ability','General Science & Ability'], ['current-affairs','Current Affairs'],
  ['pakistan-affairs','Pakistan Affairs'], ['islamic-studies','Islamic Studies'],
] as const
export function compulsoryCatalogue(comparative = false) {
  return compulsorySlots.map(([slug,name],i) => ({ slug: i === 5 && comparative ? 'comparative-religions' : slug, name: i === 5 && comparative ? 'Comparative Study of Major Religions (For Non-Muslims)' : name, marks:100 }))
}
export const optionalCatalogue = optionalGroups.flatMap(g => g.subjects)
export function topicCoverage(subject: SyllabusSubject | undefined, statuses: Record<string,string>) {
  const ids = subject?.sections.flatMap((s,i) => s.items.map((_,j) => `${subject.slug}:${i}:${j}`)) ?? []
  const completed = ids.filter(id => statuses[id] === 'completed').length
  return { total: ids.length, completed, percent: ids.length ? Math.round(completed / ids.length * 100) : null }
}
export function targetDays(value: string | undefined, today: string) {
  function day(key: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
    const date = new Date(`${key}T00:00:00Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === key ? date.getTime() / 86400000 : null
  }
  const target = day(value || ''), current = day(today)
  return target === null || current === null ? null : target - current
}
