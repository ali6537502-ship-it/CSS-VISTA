import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

/** A compact completion dial. Purely decorative: the figure is also in text. */
export function ProgressRing({ percent, size = 44, label }: { percent: number; size?: number; label?: string }) {
  const stroke = size >= 40 ? 4 : 3
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const complete = percent >= 100
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-emerald-100" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeLinecap="round"
          className={complete ? 'stroke-emerald-600' : 'stroke-amber-500'}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(100, Math.max(0, percent)) / 100)}
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums text-pine">{percent}</span>
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}

/** A horizontal bar for wider contexts. */
export function ProgressBar({ percent }: { percent: number }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-emerald-100" aria-hidden="true">
      <span
        className={`block h-full rounded-full transition-[width] duration-300 ${percent >= 100 ? 'bg-emerald-600' : 'bg-amber-500'}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </span>
  )
}

/**
 * One tickable research direction.
 *
 * A real checkbox rather than a styled div, so it is reachable by keyboard and
 * announced correctly. `variant` matches the density each section needs: a
 * 22-term glossary reads as chips, a six-sentence direction list as rows.
 */
export function TickItem({
  checked, onToggle, children, variant = 'row', id,
}: {
  checked: boolean
  onToggle: () => void
  children: ReactNode
  variant?: 'row' | 'chip'
  id?: string
}) {
  const base = 'group flex cursor-pointer gap-2.5 text-left transition-colors'
  const shape = variant === 'chip'
    ? `items-center rounded-full border px-3 py-1.5 text-[13px] ${checked ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-input bg-white hover:border-emerald-700/50 hover:bg-emerald-50/40'}`
    : `items-start rounded-lg border px-3 py-2.5 text-sm ${checked ? 'border-emerald-600 bg-emerald-50/70' : 'border-input bg-white hover:border-emerald-700/40 hover:bg-emerald-50/30'}`

  return (
    <label className={`${base} ${shape}`} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground/40 bg-white group-hover:border-emerald-700/60'
        }`}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className={checked ? 'text-emerald-950/80' : 'text-foreground/90'}>{children}</span>
    </label>
  )
}

export function TierBadge({ tier }: { tier: string }) {
  if (!tier) return null
  const priority = tier === 'A'
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${priority ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'}`}>
      Tier {tier}
    </span>
  )
}
