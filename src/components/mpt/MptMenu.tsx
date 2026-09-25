import { Link } from 'react-router'
import { Award, CalendarClock, ClipboardList, TrendingUp, XCircle } from 'lucide-react'

/** The separate MPT options, each opening its own page (owner request: not mixed together). */
export const MPT_MENU = [
  { to: '/account/mpt', label: 'MPT Mocks', hint: 'Apply · Enter exam', Icon: CalendarClock },
  { to: '/account/mpt/history', label: 'My Applications', hint: 'Roll Numbers & status', Icon: ClipboardList },
  { to: '/account/mpt/history?status=completed', label: 'My Results', hint: 'Result cards & scores', Icon: Award },
  { to: '/account/mpt/mistakes', label: 'My Wrong MCQs', hint: 'Mistakes to revise', Icon: XCircle },
  { to: '/account/mpt/performance', label: 'My Performance', hint: 'Progress by subject', Icon: TrendingUp },
] as const

export function MptMenu({ current }: { current?: string }) {
  return (
    <nav aria-label="MPT options" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {MPT_MENU.map(({ to, label, hint, Icon }) => {
        const active = current === to
        return (
          <Link key={to} to={to} aria-current={active ? 'page' : undefined}
            className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left ${active ? 'border-emerald-800 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-700'}`}>
            <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-800" />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-950">{label}</span>
              <span className="block text-xs text-slate-500">{hint}</span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
