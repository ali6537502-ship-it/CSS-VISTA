import type { MptCard } from '@/lib/mpt/api'
import { pktTime } from '@/lib/mpt/copy'
import { MockSlot } from './MockSlot'
import { EnterExamButton } from './EnterExamButton'

/** A running mock the viewer did not apply for (D-51): shown so the exam is never invisible. */
export function isLiveForOthers(card: MptCard) {
  return card.state.exam_in_progress && card.state.phase === 'APPLICATIONS_CLOSED'
}

export function LiveMockBanner({ cards }: { cards: MptCard[] }) {
  const live = cards.filter(isLiveForOthers)
  if (!live.length) return null
  return (
    <>
      {live.map((card) => (
        <section key={card.mock.slug} className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5" aria-labelledby={`live-${card.mock.slug}`}>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-red-700">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-red-600" /> Live now
          </p>
          <h3 id={`live-${card.mock.slug}`} className="mt-1 text-lg font-bold text-slate-950">{card.mock.title} is being held now</h3>
          <div className="mt-1"><MockSlot mock={card.mock} withWindow /></div>
          <p className="mt-2 text-sm text-slate-800">
            It started at {pktTime(card.mock.exam_open_at)} and ends at {pktTime(card.mock.exam_end_at)}. Only candidates who applied before it started can take it. They enter with the <strong>Enter Exam</strong> button on their My CSS Vista dashboard.
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Didn't apply for this one? Apply for the next mock below.</p>
          <EnterExamButton card={card} className="mt-3 w-full sm:w-auto" />
        </section>
      ))}
    </>
  )
}
