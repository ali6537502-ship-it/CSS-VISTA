import { Link, useLocation } from 'react-router'
import { workspaceHome } from './navigation'
/** Primary homes are explicit catalog/navigation relationships, never split path names. */
export default function WorkspaceBreadcrumbs({ title }: { title: string }) {
  const { pathname, search } = useLocation()
  const home = workspaceHome(pathname, search)
  return <nav aria-label="Breadcrumb" className="mb-4 text-sm text-[#47564D]"><ol className="flex flex-wrap items-center gap-2">
    <li><Link className="inline-flex min-h-11 items-center text-[#14543D] underline" to="/account/dashboard">Today</Link></li>
    {home && home.id !== 'today' && <li><span aria-hidden="true" className="mr-2">/</span>{home.title === title ? <span aria-current="page">{title}</span> : <Link className="inline-flex min-h-11 items-center text-[#14543D] underline" to={home.to}>{home.title}</Link>}</li>}
    {title !== home?.title && <li><span aria-hidden="true" className="mr-2">/</span><span aria-current="page">{title}</span></li>}
  </ol></nav>
}
