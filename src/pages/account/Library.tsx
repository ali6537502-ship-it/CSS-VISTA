import { Link } from 'react-router'
import { Archive, ArrowRight, Bookmark, Newspaper, Search, Sparkles } from 'lucide-react'
import { briefingRoot } from '@/features/current-affairs/model'
import { AccountPage, SectionTitle, useAccountSnapshot } from './shared'

const destinations = [
  { to: '/account/saved', icon: Bookmark, title: 'Saved items', detail: 'Developments and material you kept for revision.' },
  { to: '/account/factbook', icon: Sparkles, title: 'Daily Factbook', detail: 'Facts, statistics and quick GK, ready to revise.' },
  { to: briefingRoot + '/archive', icon: Archive, title: 'Current Affairs archive', detail: 'Return to any earlier day’s edition.' },
  { to: '/account/search', icon: Search, title: 'Search your library', detail: 'Find a topic across headlines, facts and sources.' },
]

export default function AccountLibrary() {
  const { snapshot } = useAccountSnapshot()

  return (
    <AccountPage
      title="My Library"
      intro="Your saved reading, revision facts and every past edition, kept in one place."
      action={
        <Link to={briefingRoot} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-800">
          <Newspaper className="h-4 w-4" /> Current Affairs
        </Link>
      }
    >
      <div className="rounded-2xl border border-slate-200 p-5 sm:p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-500">Saved on this device</p>
        <p className="mt-2 text-3xl font-bold text-slate-950">{snapshot.savedResources}</p>
        <p className="mt-1 text-sm text-slate-500">Bookmarks and saved answers from across CSS Vista.</p>
      </div>

      <section className="mt-12">
        <SectionTitle>Open your library</SectionTitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {destinations.map(({ to, icon: Icon, title, detail }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 p-5 transition-colors hover:border-emerald-700"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-bold text-slate-950">
                  {title}
                  <ArrowRight className="h-4 w-4 text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                <span className="mt-1 block text-sm text-slate-500">{detail}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </AccountPage>
  )
}
