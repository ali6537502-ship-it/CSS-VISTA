import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  QUESTIONS_PER_PAGE,
  clampQuestionPage,
  questionPageCount,
  questionPageRange,
  smartQuestionPages,
} from '@/lib/questionPagination'

interface Props {
  currentPage: number
  totalItems: number
  onPageChange: (page: number) => void
  itemLabel?: string
  pageSize?: number
  className?: string
}

export default function QuestionPagination({
  currentPage,
  totalItems,
  onPageChange,
  itemLabel = 'Questions',
  pageSize = QUESTIONS_PER_PAGE,
  className = '',
}: Props) {
  if (totalItems <= 0) return null
  const pages = questionPageCount(totalItems, pageSize)
  const page = clampQuestionPage(currentPage, totalItems, pageSize)
  const range = questionPageRange(page, totalItems, pageSize)
  const progress = Math.max(1, Math.round((range.end / totalItems) * 100))

  return (
    <nav className={`no-print ${className}`} aria-label={`${itemLabel} pages`}>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
        <span>{itemLabel} {range.start + 1}–{range.end} of {totalItems}</span>
        <span>Page {page} of {pages} · {progress}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
        <div className="h-full rounded-full bg-emerald-700 transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      {pages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {page > 1 && (
            <button type="button" onClick={() => onPageChange(page - 1)} className="inline-flex min-h-10 items-center gap-1 rounded-lg border bg-white px-3 text-xs font-bold text-pine hover:bg-secondary sm:text-sm">
              <ChevronLeft className="h-4 w-4" /> Previous 10 Questions
            </button>
          )}
          <div className="flex items-center gap-1" aria-label="Choose a page">
            {smartQuestionPages(page, pages).map((item) => item === 'ellipsis-start' || item === 'ellipsis-end' ? (
              <span key={item} className="grid h-10 min-w-6 place-items-center text-sm text-muted-foreground" aria-hidden="true">…</span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-label={`Go to page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={`grid h-10 min-w-10 place-items-center rounded-lg border px-2 text-sm font-bold ${item === page ? 'border-pine bg-pine text-white' : 'bg-white text-pine hover:bg-secondary'}`}
              >
                {item}
              </button>
            ))}
          </div>
          {page < pages && (
            <button type="button" onClick={() => onPageChange(page + 1)} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-pine px-3 text-xs font-bold text-white hover:bg-emerald-900 sm:text-sm">
              Next 10 Questions <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
