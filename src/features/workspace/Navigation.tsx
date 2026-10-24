import { NavLink, useLocation } from 'react-router'
import { workspaceDestinations, workspaceHome } from './navigation'

export default function WorkspaceNavigation() {
  const { pathname } = useLocation()
  const home = workspaceHome(pathname)
  return <nav aria-label="Study workspace" className="grid grid-cols-3 gap-1 rounded-xl border border-[#D7E0DA] bg-white p-2 sm:grid-cols-6 lg:grid-cols-1">
    {workspaceDestinations.map(item => <NavLink key={item.id} to={item.to} aria-current={home?.id === item.id ? 'page' : undefined}
      className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#166A91] ${home?.id === item.id ? 'bg-[#14543D] text-white' : 'text-[#47564D] hover:bg-[#F6F8F7]'}`}>{item.title}</NavLink>)}
  </nav>
}
