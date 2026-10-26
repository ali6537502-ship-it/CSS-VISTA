import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Gift } from 'lucide-react'

/** Promoted only while the owner has explicitly made a draw public. */
export default function LuckyDrawDiscovery() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    let active = true
    const check = async () => {
      try {
        const response = await fetch('/api/lucky-draw.php?status=1', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } })
        if (!response.ok) throw new Error('Unavailable')
        const data = await response.json() as { visible?: boolean }
        if (active) setVisible(data.visible === true)
      } catch { if (active) setVisible(false) }
    }
    void check()
    const timer = window.setInterval(() => { if (!document.hidden) void check() }, 15000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])
  if (!visible) return null
  return (
    <section aria-label="Current lucky draw" className="mt-5">
      <Link to="/lucky-draw" className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-[#fff6de] to-white p-5 shadow-sm transition hover:shadow-md sm:px-7">
        <span className="flex min-w-0 flex-1 items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><Gift className="h-6 w-6" /></span>
          <span className="min-w-0"><span className="block text-xs font-black uppercase tracking-[0.14em] text-amber-700">Applications are open</span><span className="mt-1 block text-lg font-extrabold text-pine">CSS VISTA Lucky Draw</span><span className="mt-1 block text-xs text-slate-600">Signed-in account holders can apply. View the live application list and closing time.</span></span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-bold text-white">Apply now <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
      </Link>
    </section>
  )
}
