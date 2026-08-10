import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CalendarDays, ExternalLink } from 'lucide-react'
import { getCountdownConfig } from '@/lib/admin'

const FPSC_NOTICE_URL = 'https://www.fpsc.gov.pk/uploads/content/1783075774884_Advance_Public_Notice_-_CSS_Competitive_Examination-2027.pdf'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function LiveCountdown({ compact = false }: { compact?: boolean }) {
  const [cfg, setCfg] = useState(getCountdownConfig())
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const updateClock = () => setNow(Date.now())
    const firstTick = window.setTimeout(updateClock, 0)
    const clock = window.setInterval(updateClock, 1000)
    const onStorage = () => setCfg(getCountdownConfig())
    window.addEventListener('storage', onStorage)
    const poll = window.setInterval(onStorage, 5000) // pick up admin edits on same tab
    return () => {
      window.clearTimeout(firstTick)
      window.clearInterval(clock)
      window.clearInterval(poll)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const target = useMemo(() => {
    // FPSC has announced the commencement date, but not the reporting/start time.
    // Count down to the beginning of that calendar date in Pakistan Standard Time.
    const d = new Date(`${cfg.date}T00:00:00+05:00`)
    return isNaN(d.getTime()) ? null : d
  }, [cfg.date])

  if (!cfg.visible || !target) return null

  const diff = now === null ? null : target.getTime() - now

  if (diff !== null && diff <= 0) {
    return (
      <div className={`vista-card border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/70 to-white text-center ${compact ? 'p-3' : 'p-4'}`}>
        <p className="text-sm font-semibold text-pine">CSS 2027 Written Examination Has Commenced.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          The FPSC advance notice scheduled the examination to commence from 27 January 2027. Check{' '}
          <Link to="/fpsc-updates" className="font-semibold text-emerald-800 underline underline-offset-2">
            FPSC updates
          </Link>{' '}
          for the latest official information.
        </p>
      </div>
    )
  }

  const remaining = Math.max(0, diff ?? 0)
  const days = Math.floor(remaining / 86400000)
  const hours = Math.floor((remaining % 86400000) / 3600000)
  const mins = Math.floor((remaining % 3600000) / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)

  return (
    <div className={`vista-card border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/70 to-white ${compact ? 'p-3' : 'p-3 sm:p-4'}`}>
      <div className={`flex items-center ${compact ? 'gap-3' : 'gap-3 sm:gap-4'}`}>
        <span className={`flex shrink-0 items-center justify-center rounded-full bg-amber-100/80 text-amber-700 ${compact ? 'h-11 w-11' : 'h-12 w-12 sm:h-14 sm:w-14'}`}>
          <CalendarDays className={compact ? 'h-5 w-5' : 'h-6 w-6 sm:h-7 sm:w-7'} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-bold text-amber-700 sm:text-base">{cfg.eventName}</div>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
          </div>
          <div className={`${compact ? 'mt-1' : 'mt-1.5'} grid grid-cols-4 text-center`}>
            {[
              [now === null ? null : days, 'Days'],
              [now === null ? null : hours, 'Hrs'],
              [now === null ? null : mins, 'Mins'],
              [now === null ? null : secs, 'Secs'],
            ].map(([v, label]) => (
              <div key={label as string} className="relative px-1 after:absolute after:right-[-2px] after:top-0 after:text-xl after:font-semibold after:text-foreground/60 after:content-[':'] last:after:hidden sm:after:text-2xl">
                <div className={`font-bold tabular-nums text-foreground ${compact ? 'text-xl' : 'text-lg sm:text-2xl'}`}>{v === null ? '--' : pad(v as number)}</div>
                <div className="text-[8px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[9px]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className={`${compact ? 'mt-1 text-[9px]' : 'mt-2 text-[10px] sm:text-[11px]'} text-center leading-relaxed text-muted-foreground`}>
        Target: 27 January 2027 · tentative FPSC schedule · Pakistan Standard Time (UTC+5).{' '}
        <a href={FPSC_NOTICE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-emerald-800 underline underline-offset-2">
          Official notice <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  )
}
