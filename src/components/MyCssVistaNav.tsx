import { Link, useLocation } from 'react-router'
import { BookOpen, ChartNoAxesColumnIncreasing, CheckSquare2, FolderHeart, Home, Languages, Settings } from 'lucide-react'

const items = [
  { to: '/account/dashboard', label: 'Home', icon: Home },
  { to: '/account/tasks', label: 'My Tasks', icon: CheckSquare2 },
  { to: '/account/progress', label: 'My Progress', icon: ChartNoAxesColumnIncreasing },
  { to: '/account/english', label: 'Daily English', icon: Languages },
  { to: '/account/current-affairs', label: 'Daily Affairs Brief', icon: BookOpen },
  { to: '/account/library', label: 'My Library', icon: FolderHeart },
  { to: '/account/settings', label: 'Profile & Settings', icon: Settings },
]

export default function MyCssVistaNav() {
  const location = useLocation()
  return (
    <nav aria-label="My CSS Vista" className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3">
        {items.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== '/account/dashboard' && location.pathname.startsWith(`${to}/`))
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition ${active ? 'bg-emerald-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-700 hover:text-emerald-800'}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
