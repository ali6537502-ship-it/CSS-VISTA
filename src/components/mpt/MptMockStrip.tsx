import { Link } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { copy, pktDate, pktTime } from '@/lib/mpt/copy'
import { formatRollNumber } from '@/lib/mpt/rollNumber'
import { useMptSpotlight, type MptSpotlight } from '@/lib/mpt/useMptSpotlight'
import { actionHref } from './MptHeroCard'
import { MockSlot } from './MockSlot'
import { EnterExamButton } from './EnterExamButton'

/** Text and link for the one mock to point at (shared by the strip and the site notice bar). */
export function spotlightMessage(spotlight: MptSpotlight, signedIn: boolean) {
  const { card, kind } = spotlight
  const { mock } = card
  const roll = card.application?.roll_number
  switch (kind) {
    case 'mine-live':
      return {
        label: 'Your MPT Mock is live',
        text: `${mock.title} · ${card.state.phase === 'IN_PROGRESS' ? `continue until ${pktTime(mock.exam_end_at)}` : `enter until ${pktTime(mock.entry_close_at)}`}`,
        cta: card.state.phase === 'IN_PROGRESS' ? 'Continue Exam' : 'Enter Exam',
        to: `/account/mpt/entrance/${mock.slug}`,
        live: true,
      }
    case 'live':
      return {
        label: 'MPT Mock live now',
        text: `${mock.title} is being held until ${pktTime(mock.exam_end_at)} · applicants enter from My CSS Vista`,
        cta: 'See MPT Mocks',
        to: signedIn ? '/account/mpt' : '/mpt',
        live: true,
      }
    case 'mine':
      return {
        label: 'Your MPT Mock',
        text: `${mock.title} · ${pktDate(mock.exam_open_at)}, ${pktTime(mock.exam_open_at)}${roll ? ` · Roll No. ${formatRollNumber(roll)}` : ' · slot reserved'}`,
        cta: 'View Application',
        to: actionHref(card) ?? '/account/mpt',
        live: false,
      }
    default:
      return {
        label: 'Next MPT Mock',
        text: `${mock.title} · ${pktDate(mock.exam_open_at)}, ${pktTime(mock.exam_open_at)} · free · apply any time before it starts`,
        cta: 'Apply Now',
        to: actionHref(card) ?? '/mpt',
        live: false,
      }
  }
}

/** A compact MPT Mock notice for pages that talk about the MPT (D-52). Renders nothing until data arrives. */
export function MptMockStrip({ className = '' }: { className?: string }) {
  const spotlight = useMptSpotlight()
  const { user } = useAccount()
  if (!spotlight) return null
  const message = spotlightMessage(spotlight, Boolean(user))
  return (
    <aside aria-label={copy.hub.title}
      className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${message.live ? 'border-red-200 bg-red-50' : 'border-emerald-900/15 bg-emerald-50/60'} ${className}`}>
      <div className="min-w-0">
        <p className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] ${message.live ? 'text-red-700' : 'text-emerald-900'}`}>
          {message.live && <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-red-600" />}
          {message.label}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-950">{message.text}</p>
        <div className="mt-0.5"><MockSlot mock={spotlight.card.mock} withDate={false} withWindow /></div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-stretch">
        {spotlight.kind !== 'mine-live' && (
          <Link to={message.to} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-900 px-5 text-sm font-bold text-white hover:bg-emerald-950">
            {message.cta}
          </Link>
        )}
        <EnterExamButton card={spotlight.card} />
      </div>
    </aside>
  )
}
