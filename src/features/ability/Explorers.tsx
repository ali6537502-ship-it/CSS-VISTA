import { useState } from 'react'

const frame =
  'rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 sm:p-6'
const field = 'grid gap-2 text-sm font-semibold text-slate-700'
const range = 'min-h-11 w-full accent-emerald-800'
function FractionExplorer() {
  const [parts, setParts] = useState(3)
  return (
    <section className={frame} aria-label="Fraction explorer">
      <h3 className="font-bold text-slate-950">
        Move the parts. Watch the value.
      </h3>
      <p className="mt-2 text-xs leading-6 text-slate-600">
        The whole has eight equal parts. A fraction, decimal and percentage can
        describe the same quantity.
      </p>
      <div className="mt-5 grid grid-cols-8 gap-1.5" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className={`h-12 rounded-md border ${i < parts ? 'border-emerald-800 bg-emerald-800' : 'border-emerald-200 bg-white'}`}
          />
        ))}
      </div>
      <label className={`${field} mt-5`}>
        Filled parts: {parts} of 8
        <input
          aria-label="Filled parts"
          type="range"
          min={0}
          max={8}
          value={parts}
          onChange={(e) => setParts(Number(e.target.value))}
          className={range}
        />
      </label>
      <output
        className="mt-3 block text-lg font-bold tabular-nums text-emerald-900"
        aria-live="polite"
      >
        {parts}/8 = {parts / 8} = {(parts / 8) * 100}%
      </output>
    </section>
  )
}
function CircleExplorer() {
  const [radius, setRadius] = useState(7)
  const scaled = radius * 4.5,
    pi = 22 / 7
  return (
    <section className={frame} aria-label="Circle explorer">
      <h3 className="font-bold text-slate-950">Change the radius.</h3>
      <p className="mt-2 text-xs leading-6 text-slate-600">
        Circumference grows with radius; area grows with its square. The
        calculations here use the approximation π = 22/7.
      </p>
      <div className="mt-4 grid items-center gap-4 sm:grid-cols-[180px_1fr]">
        <svg
          viewBox="0 0 180 180"
          className="mx-auto h-44 w-44 max-w-full"
          role="img"
          aria-label={`Circle with radius ${radius} centimetres`}
        >
          <circle
            cx="90"
            cy="90"
            r={scaled}
            fill="#d1fae5"
            stroke="#065f46"
            strokeWidth="2"
          />
          <path d={`M90 90 H${90 + scaled}`} stroke="#065f46" strokeWidth="2" />
          <circle cx="90" cy="90" r="3" fill="#065f46" />
        </svg>
        <div>
          <label className={field}>
            Radius: {radius} cm
            <input
              aria-label="Circle radius"
              type="range"
              min={1}
              max={14}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className={range}
            />
          </label>
          <output
            className="mt-3 grid gap-2 text-sm font-semibold text-emerald-900"
            aria-live="polite"
          >
            <span>Diameter: {radius * 2} cm</span>
            <span>Circumference: {(2 * pi * radius).toFixed(2)} cm</span>
            <span>Area: {(pi * radius * radius).toFixed(2)} cm²</span>
          </output>
        </div>
      </div>
    </section>
  )
}
function RectangleExplorer() {
  const [length, setLength] = useState(8),
    [width, setWidth] = useState(5)
  return (
    <section className={frame} aria-label="Rectangle explorer">
      <h3 className="font-bold text-slate-950">Compare area and perimeter.</h3>
      <p className="mt-2 text-xs leading-6 text-slate-600">
        Move one side at a time and compare the boundary length with the
        enclosed area.
      </p>
      <div className="mt-4 grid items-center gap-5 sm:grid-cols-[180px_1fr]">
        <svg
          viewBox="0 0 180 180"
          className="mx-auto h-44 w-44 max-w-full"
          role="img"
          aria-label={`Rectangle ${length} by ${width} centimetres`}
        >
          <rect
            x={(180 - length * 10) / 2}
            y={(180 - width * 10) / 2}
            width={length * 10}
            height={width * 10}
            fill="#d1fae5"
            stroke="#065f46"
            strokeWidth="2"
          />
        </svg>
        <div className="space-y-3">
          <label className={field}>
            Length: {length} cm
            <input
              aria-label="Rectangle length"
              type="range"
              min={1}
              max={14}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className={range}
            />
          </label>
          <label className={field}>
            Width: {width} cm
            <input
              aria-label="Rectangle width"
              type="range"
              min={1}
              max={14}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className={range}
            />
          </label>
          <output
            className="grid gap-2 text-sm font-semibold text-emerald-900"
            aria-live="polite"
          >
            <span>Area: {length * width} cm²</span>
            <span>Perimeter: {2 * (length + width)} cm</span>
          </output>
        </div>
      </div>
    </section>
  )
}
export default function Explorer({ unit }: { unit: string }) {
  if (['fractions', 'decimals', 'percentages'].includes(unit))
    return <FractionExplorer />
  if (unit === 'circles') return <CircleExplorer />
  if (unit === 'geometry-area') return <RectangleExplorer />
  return null
}
