import type { Block, Chapter, Overview, Question } from './api'

export type HandbookUnit = {
  id: string
  chapterId: string
  chapterTitle: string
  section: string
  blockIndex: number
  block: Exclude<Block, { type: 'heading' }>
  weight: number
}

export type StudyDay = {
  day: number
  units: HandbookUnit[]
  title: string
  chapters: string[]
  weight: number
}

export const paceChoices = [7, 14, 21, 30, 45] as const
export const minimumDays = 3
export const maximumDays = 60

/** Every source paragraph, bullet and table appears once, in handbook order. */
export function handbookUnits(chapters: Chapter[]): HandbookUnit[] {
  const units: HandbookUnit[] = []
  for (const chapter of chapters) {
    let section = chapter.title.replace(/^\d+\.\s*/, '')
    chapter.blocks.forEach((block, index) => {
      if (block.type === 'heading') {
        section = block.text
        return
      }
      const text =
        block.type === 'table'
          ? block.rows.flat().join(' ')
          : block.text
      const weight = Math.max(10, text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length || 0)
      units.push({
        id: `${chapter.id}:${index}`,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        section,
        blockIndex: index,
        block,
        weight,
      })
    })
  }
  return units
}

/**
 * Greedy contiguous weighted partition with a non-empty remainder invariant.
 * Balanced by actual handbook text rather than arbitrary chapter counts.
 * For D days every unit is scheduled once, with no invented repeat lessons.
 */
export function buildStudyDays(units: HandbookUnit[], days: number): StudyDay[] {
  if (!Number.isInteger(days) || days < 1 || days > units.length)
    throw new RangeError('Choose a valid number of course days.')
  const result: StudyDay[] = []
  let offset = 0
  for (let day = 1; day <= days; day++) {
    const remainingDays = days - day
    const lastAllowed = units.length - remainingDays
    const remainingWeight = units.slice(offset).reduce((sum, unit) => sum + unit.weight, 0)
    const target = remainingWeight / (remainingDays + 1)
    let takenWeight = 0
    let end = offset
    while (end < lastAllowed) {
      const weight = units[end].weight
      if (
        end > offset &&
        takenWeight + weight > target &&
        Math.abs(target - takenWeight) <= Math.abs(target - takenWeight - weight)
      ) break
      takenWeight += weight
      end += 1
      if (takenWeight >= target) break
    }
    const selected = units.slice(offset, end)
    const chapters = [...new Set(selected.map((unit) => unit.chapterId))]
    const first = selected[0].chapterTitle
    const last = selected[selected.length - 1].chapterTitle
    const title = first === last
      ? first.replace(/^\d+\.\s*/, '')
      : `${first.replace(/^\d+\.\s*/, '')} → ${last.replace(/^\d+\.\s*/, '')}`
    result.push({ day, units: selected, chapters, title, weight: takenWeight })
    offset = end
  }
  return result
}

export function firstPendingDay(plan: StudyDay[], completed: readonly string[]): number {
  const done = new Set(completed)
  const next = plan.find((day) => day.units.some((unit) => !done.has(unit.id)))
  return next?.day || plan.length
}

export function coveredCount(units: readonly HandbookUnit[], completed: readonly string[]) {
  const valid = new Set(units.map((unit) => unit.id))
  return new Set(completed.filter((id) => valid.has(id))).size
}

export function skillForChapter(chapterId: string): string {
  const id = Number(chapterId)
  if ([1, 2, 3, 4, 5, 21, 25].includes(id)) return 'central_idea'
  if ([6, 15, 20].includes(id)) return 'selection'
  if ([7, 17, 23].includes(id)) return 'compression'
  if ([8, 24].includes(id)) return 'paraphrasing'
  if (id === 9) return 'qualifications'
  if ([10, 14, 18].includes(id)) return 'coherence'
  if (id === 11) return 'grammar'
  if (id === 12) return 'title'
  if ([13, 16, 19, 22].includes(id)) return 'fidelity'
  return 'central_idea'
}

export function questionForDay(data: Overview, day: StudyDay): Question | undefined {
  const pool = data.catalog?.questions || []
  const selectedChapter = day.units[day.units.length - 1]?.chapterId
  const skill = skillForChapter(selectedChapter || '1')
  const candidates = pool.filter((item) => item.skill === skill)
  if (!candidates.length) return undefined
  return candidates[(day.day - 1) % candidates.length]
}

export function safeDay(value: string | null, max: number, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : fallback
}

export function safeUnitStep(value: string | null, max: number): number {
  const parsed = value === null ? 0 : Number(value)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : 0
}
