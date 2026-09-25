import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { formatRollNumber } from '@/lib/mpt/rollNumber'
import { copy } from '@/lib/mpt/copy'

/** Large, monospaced, never truncated. Highlights once when it first appears. */
export function RollNumber({ roll, highlight = false, size = 'lg' }: { roll: string; highlight?: boolean; size?: 'lg' | 'md' }) {
  const [copied, setCopied] = useState(false)
  const [flash, setFlash] = useState(highlight)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!highlight) return
    const id = window.setTimeout(() => setFlash(false), 2400)
    return () => window.clearTimeout(id)
  }, [highlight])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const copyRoll = async () => {
    try {
      await navigator.clipboard.writeText(roll)
      setCopied(true)
      timer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className={`rounded-2xl border p-4 transition-colors duration-700 sm:p-5 ${flash ? 'border-amber-400 bg-amber-50' : 'border-emerald-900/15 bg-white'}`}>
      <p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-500">{copy.confirmation.yourRoll}</p>
      <p className={`mt-1 break-all font-mono font-bold tracking-[.12em] text-slate-950 ${size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-2xl'}`} aria-label={`Roll Number ${roll.split('').join(' ')}`}>
        {formatRollNumber(roll)}
      </p>
      <button type="button" onClick={copyRoll} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:border-emerald-700 hover:text-emerald-800">
        {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
        <span aria-live="polite">{copied ? copy.confirmation.copied : copy.confirmation.copy}</span>
      </button>
    </div>
  )
}
