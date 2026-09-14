import { Link } from 'react-router'
import { Archive, ArrowRight, Bookmark, BookOpen, Search } from 'lucide-react'
import MyCssVistaNav from '@/components/MyCssVistaNav'

const items = [
  {
    to: '/account/saved',
    title: 'Saved Items',
    description: 'Open Current Affairs developments you saved for later.',
    icon: Bookmark,
  },
  {
    to: '/account/factbook',
    title: 'Daily Factbook',
    description: 'Revise facts, statistics and Quick GK from Daily Affairs Brief.',
    icon: BookOpen,
  },
  {
    to: '/account/current-affairs/archive',
    title: 'Affairs Archive',
    description: 'Return to older Daily Affairs Brief editions by date.',
    icon: Archive,
  },
  {
    to: '/account/search',
    title: 'Search My Library',
    description: 'Find topics, reports, countries, facts and saved material.',
    icon: Search,
  },
]

export default function MyCssVistaLibraryPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <MyCssVistaNav />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-emerald-800">My CSS Vista</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">My Library</h1>
          <p className="mt-1 text-sm text-slate-600">Everything you saved or may want to revisit is organised here.</p>
        </header>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map(({ to, title, description, icon: Icon }) => (
            <Link key={to} to={to} className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-700 hover:shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50"><Icon className="h-5 w-5 text-emerald-800" /></span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-800" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-950">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
