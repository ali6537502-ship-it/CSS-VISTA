import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import DailyEnglishPanel from '@/components/DailyEnglishPanel'
import { AccountPage } from './shared'

export default function AccountEnglish() {
  return (
    <AccountPage
      title="Daily English"
      intro="Today’s vocabulary, idioms and pairs of words. A short set each day, kept in order for you."
      action={
        <Link to="/grammar-vocabulary" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:border-emerald-700 hover:text-emerald-800">
          Grammar & Vocabulary <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <DailyEnglishPanel />
    </AccountPage>
  )
}
