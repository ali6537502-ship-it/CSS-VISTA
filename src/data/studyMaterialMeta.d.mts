export interface PageMeta {
  title: string
  description: string
}

export function islamicChapterName(chapter: { titleEn: string }): string

export function optionalSubjectMeta(
  group: { group: number },
  subject: { subject: string; topicCount: number; marks: number; topics: Array<{ words: number }> },
): PageMeta

export function optionalTopicMeta(
  subject: { subject: string },
  topic: { title: string; words: number },
): PageMeta

export function islamicChapterMeta(
  chapter: { titleEn: string; referenceCount: number; topics: unknown[] },
): PageMeta

export function islamicTopicMeta(
  chapter: { titleEn: string },
  topic: { titleEn: string; count: number },
): PageMeta

export function studyMaterialMetaForPath(pathname: string): PageMeta | null
