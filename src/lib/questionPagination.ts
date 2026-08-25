export const QUESTIONS_PER_PAGE = 10

export type QuestionPageItem = number | 'ellipsis-start' | 'ellipsis-end'

export function questionPageCount(totalItems: number, pageSize = QUESTIONS_PER_PAGE) {
  if (totalItems <= 0) return 1
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

export function clampQuestionPage(page: number, totalItems: number, pageSize = QUESTIONS_PER_PAGE) {
  return Math.min(Math.max(1, Math.trunc(page) || 1), questionPageCount(totalItems, pageSize))
}

export function questionPageForIndex(index: number, pageSize = QUESTIONS_PER_PAGE) {
  return Math.floor(Math.max(0, index) / pageSize) + 1
}

export function questionPageRange(page: number, totalItems: number, pageSize = QUESTIONS_PER_PAGE) {
  if (totalItems <= 0) return { page: 1, start: 0, end: 0 }
  const safePage = clampQuestionPage(page, totalItems, pageSize)
  const start = (safePage - 1) * pageSize
  return { page: safePage, start, end: Math.min(totalItems, start + pageSize) }
}

export function sliceQuestionPage<T>(items: readonly T[], page: number, pageSize = QUESTIONS_PER_PAGE) {
  const range = questionPageRange(page, items.length, pageSize)
  return items.slice(range.start, range.end)
}

export function smartQuestionPages(currentPage: number, totalPages: number): QuestionPageItem[] {
  const safeTotal = Math.max(1, Math.trunc(totalPages) || 1)
  const safeCurrent = Math.min(Math.max(1, Math.trunc(currentPage) || 1), safeTotal)
  if (safeTotal <= 7) return Array.from({ length: safeTotal }, (_, index) => index + 1)

  const pageSet = new Set([1, safeTotal])
  for (let page = safeCurrent - 1; page <= safeCurrent + 1; page += 1) {
    if (page > 1 && page < safeTotal) pageSet.add(page)
  }
  if (safeCurrent <= 3) [2, 3, 4].forEach((page) => pageSet.add(page))
  if (safeCurrent >= safeTotal - 2) [safeTotal - 3, safeTotal - 2, safeTotal - 1].forEach((page) => pageSet.add(page))

  const pages = [...pageSet].filter((page) => page >= 1 && page <= safeTotal).sort((a, b) => a - b)
  const result: QuestionPageItem[] = []
  pages.forEach((page, index) => {
    const previous = pages[index - 1]
    if (index > 0 && page - previous > 1) result.push(previous === 1 ? 'ellipsis-start' : 'ellipsis-end')
    result.push(page)
  })
  return result
}
