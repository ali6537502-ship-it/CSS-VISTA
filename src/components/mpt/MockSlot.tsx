import { Clock3, MoonStar, Sun, Sunrise } from 'lucide-react'
import { mockSlot, mockSlotLabel, mockTimeWindow, pktDate } from '@/lib/mpt/copy'

const ICONS = { Morning: Sunrise, Afternoon: Sun, Evening: MoonStar }

/**
 * The sitting a mock belongs to, always shown next to its name:
 * "Afternoon MPT Mock · 3:00 PM PKT", with the date and full time window.
 */
export function MockSlot({ mock, withDate = true, withWindow = false, tone = 'default' }: {
  mock: { exam_open_at: string; exam_end_at?: string }
  withDate?: boolean
  withWindow?: boolean
  tone?: 'default' | 'inverse'
}) {
  const Icon = ICONS[mockSlot(mock.exam_open_at)] ?? Clock3
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold ${tone === 'inverse' ? 'text-amber-200' : 'text-emerald-900'}`}>
      <span className="inline-flex items-center gap-1.5"><Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{mockSlotLabel(mock)}</span>
      {withDate && <span className={`font-semibold ${tone === 'inverse' ? 'text-emerald-100' : 'text-slate-600'}`}>· {pktDate(mock.exam_open_at)}</span>}
      {withWindow && mock.exam_end_at && <span className={`font-semibold ${tone === 'inverse' ? 'text-emerald-100' : 'text-slate-600'}`}>· {mockTimeWindow({ exam_open_at: mock.exam_open_at, exam_end_at: mock.exam_end_at })}</span>}
    </p>
  )
}
