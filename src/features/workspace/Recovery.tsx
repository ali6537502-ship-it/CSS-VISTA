import { useState } from 'react'
import { AvailableStudyLink as Link } from '@/features/membership/ProRelease'
import { preparationRecovery } from './recovery'
export default function SaveRecovery({ user }: { user: string }) {
  const [links] = useState(() => { try { return preparationRecovery(sessionStorage, user) } catch { return [] } })
  if (!links.length) return null
  return <section className="rounded-xl border border-amber-300 bg-amber-50 p-5" aria-label="Unconfirmed saves"><h2 className="text-lg font-semibold">Confirm saved work first</h2><p className="mt-2 text-sm leading-7">This browser retained an unconfirmed request for your account. Open the original workspace to check its receipt before retrying. Its text has not been imported or replaced.</p><ul className="mt-3">{links.map(link => <li key={link.to}><Link className="inline-flex min-h-11 items-center font-semibold underline" to={link.to}>{link.label}</Link></li>)}</ul></section>
}
