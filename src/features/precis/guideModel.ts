import type { Block, Chapter, Overview } from './api'

/**
 * Editorial routing only. Chapter text and fixed-answer questions always come
 * from the existing access-controlled, owner-imported handbook catalogue.
 * No model service, external search or generated answer is involved.
 */
export const guidePaths = [
  {
    id: 'start',
    title: 'Start from the beginning',
    description: 'What a précis is, the essential rules and how to read a passage.',
    chapters: ['1', '3', '4', '5'],
    skill: 'central_idea',
    prompt: 'Explain the distinction between a topic and the writer\'s controlling idea.',
  },
  {
    id: 'idea',
    title: 'Find the main argument',
    description: 'Identify the central idea and map how the passage develops it.',
    chapters: ['4', '5'],
    skill: 'central_idea',
    prompt: 'State the writer\'s controlling claim without adding an opinion.',
  },
  {
    id: 'selection',
    title: 'Choose what matters',
    description: 'Separate major claims from illustration and minor detail.',
    chapters: ['5', '6'],
    skill: 'selection',
    prompt: 'Identify what must survive compression, and explain why.',
  },
  {
    id: 'compression',
    title: 'Compress without distortion',
    description: 'Generalise carefully, paraphrase and protect the original meaning.',
    chapters: ['7', '8', '17'],
    skill: 'compression',
    prompt: 'Describe how you would shorten an idea without changing its strength.',
  },
  {
    id: 'logic',
    title: 'Preserve the logic',
    description: 'Keep causes, contrasts, conditions and links between ideas.',
    chapters: ['9', '10'],
    skill: 'qualifications',
    prompt: 'Which logical relationship in this explanation must not be lost?',
  },
  {
    id: 'writing',
    title: 'Build and revise a précis',
    description: 'Work on language, title, length, drafting and checking your work.',
    chapters: ['10', '11', '12', '13', '14', '16', '19', '22'],
    skill: 'coherence',
    prompt: 'Describe one specific revision check you will apply to your own work.',
  },
] as const

export type GuidePath = (typeof guidePaths)[number]
export type GuideCard = { label: string; block: Exclude<Block, { type: 'heading' }> }

export function guidePath(id: string | null): GuidePath {
  return guidePaths.find((item) => item.id === id) || guidePaths[0]
}

export function availableGuideChapters(
  path: GuidePath,
  chapters: Chapter[],
): Chapter[] {
  return path.chapters
    .map((id) => chapters.find((chapter) => chapter.id === id))
    .filter((chapter): chapter is Chapter => !!chapter)
}

/**
 * Display one original content block at a time. Headings become card labels;
 * source paragraphs, lists and tables are never rephrased or synthesized.
 */
export function guideCards(chapter: Chapter): GuideCard[] {
  let label = chapter.title
  const cards: GuideCard[] = []
  for (const block of chapter.blocks) {
    if (block.type === 'heading') {
      label = block.text
    } else if (block.type === 'table') {
      if (block.rows.length > 0)
        cards.push({ label, block })
    } else if (block.text.trim()) {
      cards.push({ label, block })
    }
  }
  return cards
}

/** The answer index stays on the server; the catalogue exposes prompts only. */
export function guideQuestion(
  data: Overview,
  path: GuidePath,
  chapterId: string,
) {
  const questions =
    data.catalog?.questions.filter((question) => question.skill === path.skill) || []
  const chapterIndex = path.chapters.indexOf(chapterId as never)
  return questions.length
    ? questions[(Math.max(0, chapterIndex)) % questions.length]
    : undefined
}

export function guideStep(value: string | null, maximum: number): number {
  const number = value === null ? 0 : Number(value)
  return Number.isInteger(number) && number >= 0 && number <= maximum ? number : 0
}
