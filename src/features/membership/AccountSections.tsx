import { Link } from 'react-router'
import { ArrowRight, Check, Star, UserRound } from 'lucide-react'

export type AccountSection = 'free' | 'pro'

export function ProBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
      <Star className="h-3 w-3 fill-current" aria-hidden="true" />
      Pro
    </span>
  )
}

/** These links choose a workspace view. Membership is checked by the existing APIs. */
export default function AccountSections({ selected }: { selected: AccountSection }) {
  return (
    <nav aria-label="Account sections" className="mt-7 grid gap-3 sm:grid-cols-2">
      {(['free', 'pro'] as const).map(section => {
        const current = selected === section
        const Icon = section === 'pro' ? Star : UserRound
        return (
          <Link
            key={section}
            to={`/account/dashboard?plan=${section}`}
            aria-current={current ? 'page' : undefined}
            className={`group flex min-h-28 items-start gap-4 rounded-2xl border p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 sm:p-6 ${current
              ? section === 'pro' ? 'border-amber-400 bg-amber-50/60' : 'border-emerald-700 bg-emerald-50/60'
              : 'border-slate-200 bg-white hover:border-slate-400'}`}
          >
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${section === 'pro' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              <Icon className={`h-5 w-5 ${section === 'pro' ? 'fill-current' : ''}`} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold text-slate-950">{section === 'free' ? 'Free account' : 'Pro account'}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                {section === 'free' ? 'Your free study tools and resources.' : 'Everything in Free, plus starred Pro features.'}
              </span>
            </span>
            {current
              ? <Check className="mt-1 h-5 w-5 shrink-0 text-slate-700" aria-hidden="true" />
              : <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-slate-400 group-hover:text-slate-700" aria-hidden="true" />}
          </Link>
        )
      })}
    </nav>
  )
}
