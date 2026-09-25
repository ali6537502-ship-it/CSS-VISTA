import { useId, useState } from 'react'

// Single-series percentage-over-time chart. One hue (validated emerald-700 light /
// emerald-600 dark), 2px line, 8px markers, recessive grid, one y-axis 0–100 %,
// hover/focus tooltip per point and a table view, so value is never colour-alone.
export type ScorePoint = { label: string; value: number | null; detail?: string }

export function ScoreChart({ points, title, compact = false }: { points: ScorePoint[]; title: string; compact?: boolean }) {
  const [active, setActive] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const titleId = useId()
  const width = 640
  const height = compact ? 72 : 220
  const pad = compact ? { l: 4, r: 4, t: 8, b: 8 } : { l: 36, r: 12, t: 12, b: 28 }
  const plotted = points.map((point, index) => ({ ...point, index })).filter((point) => point.value !== null) as Array<ScorePoint & { index: number; value: number }>
  if (plotted.length === 0) return null
  const x = (index: number) => pad.l + (points.length === 1 ? (width - pad.l - pad.r) / 2 : (index / (points.length - 1)) * (width - pad.l - pad.r))
  const y = (value: number) => pad.t + (1 - value / 100) * (height - pad.t - pad.b)
  const path = plotted.map((point, i) => `${i ? 'L' : 'M'}${x(point.index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ')
  const focus = active === null ? null : plotted.find((point) => point.index === active) ?? null

  if (table && !compact) {
    return (
      <figure aria-labelledby={titleId}>
        <figcaption id={titleId} className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
          {title}
          <button type="button" onClick={() => setTable(false)} className="min-h-11 text-xs font-semibold text-emerald-800 underline-offset-4 hover:underline">Show chart</button>
        </figcaption>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[.08em] text-slate-500"><tr><th scope="col" className="py-1">Mock</th><th scope="col" className="py-1">Score</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {points.map((point) => <tr key={point.label}><th scope="row" className="py-1.5 font-medium">{point.label}</th><td className="py-1.5 tabular-nums">{point.value === null ? '—' : `${point.value}%`}{point.detail ? ` · ${point.detail}` : ''}</td></tr>)}
          </tbody>
        </table>
      </figure>
    )
  }

  return (
    <figure aria-labelledby={titleId} className="relative">
      <figcaption id={titleId} className={compact ? 'sr-only' : 'mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700'}>
        {title}
        {!compact && <button type="button" onClick={() => setTable(true)} className="min-h-11 text-xs font-semibold text-emerald-800 underline-offset-4 hover:underline">Show table</button>}
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label={`${title}: ${plotted.map((point) => `${point.label} ${point.value}%`).join(', ')}`}
        onMouseLeave={() => setActive(null)}>
        {!compact && [0, 50, 100].map((tick) => (
          <g key={tick}>
            <line x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={1} />
            <text x={pad.l - 6} y={y(tick) + 4} textAnchor="end" className="fill-slate-500 text-[11px]">{tick}%</text>
          </g>
        ))}
        {focus && !compact && <line x1={x(focus.index)} x2={x(focus.index)} y1={pad.t} y2={height - pad.b} className="stroke-slate-300" strokeWidth={1} />}
        <path d={path} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-emerald-700 dark:stroke-emerald-600" />
        {plotted.map((point) => (
          <g key={point.index}>
            <circle cx={x(point.index)} cy={y(point.value)} r={compact ? 3 : 4} strokeWidth={2} className="fill-emerald-700 stroke-white dark:fill-emerald-600 dark:stroke-slate-900" />
            {/* Hit target larger than the mark; keyboard reachable. */}
            {!compact && (
              <circle cx={x(point.index)} cy={y(point.value)} r={14} fill="transparent" tabIndex={0} role="button"
                aria-label={`${point.label}: ${point.value}%${point.detail ? `, ${point.detail}` : ''}`}
                onMouseEnter={() => setActive(point.index)} onFocus={() => setActive(point.index)} onBlur={() => setActive(null)} className="cursor-pointer outline-none focus-visible:stroke-emerald-800 focus-visible:[stroke-width:2]" />
            )}
          </g>
        ))}
        {!compact && points.length <= 12 && points.map((point, index) => (
          <text key={point.label} x={x(index)} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">{point.label}</text>
        ))}
      </svg>
      {focus && !compact && (
        <div className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm" style={{ left: `${(x(focus.index) / width) * 100}%`, top: 0 }}>
          <p className="font-semibold text-slate-900">{focus.label}</p>
          <p className="tabular-nums text-slate-700">{focus.value}%{focus.detail ? ` · ${focus.detail}` : ''}</p>
        </div>
      )}
    </figure>
  )
}
