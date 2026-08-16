import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, RotateCcw, Target } from 'lucide-react'
import { PageHeader, Badge } from '@/components/shared'
import { optionalGroups, type OptionalSubject } from '@/data/syllabus'

const backgrounds = ['Commerce / Business', 'Computer Science / IT', 'Engineering', 'Natural Sciences (Bio/Chem/Physics)', 'Social Sciences / Arts', 'Law', 'Languages / Literature', 'Medical']
const interests = ['Politics & governance', 'Economy & finance', 'History', 'Society & gender', 'Science & environment', 'Law & justice', 'Media & psychology', 'Languages & literature']

interface Wizard {
  background: string
  prepMonths: number
  dailyHours: number
  readingSpeed: 'Slow' | 'Average' | 'Fast'
  writing: 'Needs work' | 'Average' | 'Strong'
  interests: string[]
  theoryComfort: 'Prefer facts' | 'Mixed' | 'Prefer theory'
  statsComfort: 'Avoid numbers' | 'Comfortable with numbers'
  syllabusPref: 'Shorter syllabi' | 'No preference' | 'Depth over length'
  overlapPref: 'Maximise overlap' | 'No preference'
}

const initial: Wizard = {
  background: '', prepMonths: 6, dailyHours: 4, readingSpeed: 'Average', writing: 'Average',
  interests: [], theoryComfort: 'Mixed', statsComfort: 'Comfortable with numbers',
  syllabusPref: 'No preference', overlapPref: 'Maximise overlap',
}

function scoreSubject(s: OptionalSubject, w: Wizard): number {
  let score = 0
  const bg = w.background
  const suited = s.suitedFor.toLowerCase() + ' ' + s.background.toLowerCase() + ' ' + s.nature.toLowerCase()
  if (bg.includes('Commerce') && /commerce|business|account|b\.com|bba|mba/.test(suited)) score += 3
  if (bg.includes('Computer') && /cs|it|computer/.test(suited)) score += 3
  if (bg.includes('Engineering') && /technical|numerical|science|math/.test(suited)) score += 2
  if (bg.includes('Natural') && /science|botany|zoology|geology|physics|chemistry/.test(suited)) score += 3
  if (bg.includes('Social') && /social|politic|sociolog|history|governance/.test(suited)) score += 2
  if (bg.includes('Law') && /law/.test(suited)) score += 3
  if (bg.includes('Languages') && /literature|punjabi|sindhi|pashto|balochi|persian|arabic|urdu/.test(suited)) score += 3
  if (w.interests.some((i) => suited.includes(i.split(' ')[0].toLowerCase()))) score += 2
  if (s.overlap.toLowerCase().includes('strong overlap') || s.overlap.toLowerCase().includes('very strong')) score += w.overlapPref === 'Maximise overlap' ? 2 : 0
  if (s.difficulty === 'Moderate') score += w.prepMonths <= 6 ? 2 : 1
  if (s.difficulty === 'High' && w.prepMonths <= 5) score -= 3
  if (s.prepTime.startsWith('2') || s.prepTime.startsWith('3')) score += w.prepMonths <= 6 ? 1 : 0
  if (w.statsComfort === 'Avoid numbers' && /numerical|technical/.test(s.nature.toLowerCase())) score -= 3
  if (w.theoryComfort === 'Prefer facts' && /theoretical|abstract/.test(s.nature.toLowerCase())) score -= 2
  if (w.syllabusPref === 'Shorter syllabi' && (s.prepTime.startsWith('2') || s.name === 'History of USA')) score += 1
  if (w.readingSpeed === 'Slow' && s.difficulty === 'High') score -= 2
  if (w.writing === 'Strong' && /analytical/.test(s.nature.toLowerCase())) score += 1
  return score
}

interface Combo { subjects: OptionalSubject[]; total: number; valid: boolean; violations: string[] }

function buildCombo(ranked: OptionalSubject[]): Combo {
  const chosen: OptionalSubject[] = []
  const usedGroups = new Set<number>()
  const violations: string[] = []
  // Group I: one 200-mark subject
  const g1 = ranked.find((s) => s.group === 1 && !usedGroups.has(1))
  if (g1) { chosen.push(g1); usedGroups.add(1) }
  // Group II: prefer one 200-mark or two 100-mark
  const g2twoHundred = ranked.find((s) => s.group === 2 && s.marks === 200)
  const g2hundreds = ranked.filter((s) => s.group === 2 && s.marks === 100).slice(0, 2)
  if (g2twoHundred && g2twoHundred !== undefined) { chosen.push(g2twoHundred); usedGroups.add(2) }
  else if (g2hundreds.length === 2) { chosen.push(...g2hundreds); usedGroups.add(2) }
  // Groups III–VII: one 100-mark each
  for (const g of [3, 4, 5, 6, 7]) {
    const pick = ranked.find((s) => s.group === g && !chosen.includes(s))
    if (pick) chosen.push(pick)
    else violations.push(`No subject selected from Group ${g}`)
  }
  const total = chosen.reduce((a, s) => a + s.marks, 0)
  if (total !== 600) violations.push(`Total is ${total}, must be exactly 600`)
  return { subjects: chosen, total, valid: violations.length === 0, violations }
}

export default function SubjectSelector() {
  const [step, setStep] = useState(0)
  const [w, setW] = useState<Wizard>(initial)

  const result = useMemo(() => {
    if (step < 4) return null
    const all = optionalGroups.flatMap((g) => g.subjects)
    const ranked = [...all].sort((a, b) => scoreSubject(b, w) - scoreSubject(a, w))
    const primary = buildCombo(ranked)
    const altRanked = ranked.filter((s) => !primary.subjects.includes(s))
    const alt = buildCombo([...altRanked, ...primary.subjects]) // alternatives ranked next
    return { primary, alt, ranked }
  }, [step, w])

  const steps = ['Background', 'Time & skills', 'Interests', 'Preferences', 'Results']

  return (
    <div>
      <PageHeader
        title="Optional Subject Selection Tool"
        description="Answer honestly about your background, time and preferences. The tool validates FPSC grouping rules and suggests combinations with reasons and risks - it does not predict scores."
      />
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Stepper */}
        <ol className="flex flex-wrap items-center gap-2">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= step ? 'bg-pine text-emerald-50' : 'bg-secondary text-muted-foreground'}`}>{i + 1}</span>
              <span className={`text-sm ${i === step ? 'font-semibold text-pine' : 'text-muted-foreground'}`}>{s}</span>
              {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-lg border bg-white p-6">
          {step === 0 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium">Your academic background
                <select value={w.background} onChange={(e) => setW({ ...w, background: e.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-input px-3 text-sm">
                  <option value="">Select…</option>
                  {backgrounds.map((b) => <option key={b}>{b}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Have you attempted CSS before?
                <select className="mt-1.5 h-10 w-full rounded-md border border-input px-3 text-sm" defaultValue="No">
                  <option>No - first attempt</option>
                  <option>Yes - one attempt</option>
                  <option>Yes - multiple attempts</option>
                </select>
              </label>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium">Months available for preparation: <span className="text-pine font-bold">{w.prepMonths}</span>
                <input type="range" min={3} max={18} value={w.prepMonths} onChange={(e) => setW({ ...w, prepMonths: Number(e.target.value) })} className="mt-1.5 w-full accent-emerald-800" />
              </label>
              <label className="block text-sm font-medium">Daily study hours: <span className="text-pine font-bold">{w.dailyHours}</span>
                <input type="range" min={1} max={12} value={w.dailyHours} onChange={(e) => setW({ ...w, dailyHours: Number(e.target.value) })} className="mt-1.5 w-full accent-emerald-800" />
              </label>
              {[
                { key: 'readingSpeed', label: 'Reading speed', opts: ['Slow', 'Average', 'Fast'] },
                { key: 'writing', label: 'Writing ability', opts: ['Needs work', 'Average', 'Strong'] },
                { key: 'theoryComfort', label: 'Comfort with theory', opts: ['Prefer facts', 'Mixed', 'Prefer theory'] },
                { key: 'statsComfort', label: 'Facts & statistics', opts: ['Avoid numbers', 'Comfortable with numbers'] },
              ].map((f) => (
                <div key={f.key}>
                  <span className="text-sm font-medium">{f.label}</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {f.opts.map((o) => (
                      <button key={o} onClick={() => setW({ ...w, [f.key]: o } as Wizard)} className={`rounded-md px-3 py-1.5 text-sm ${w[f.key as keyof Wizard] === o ? 'bg-pine text-emerald-50' : 'bg-secondary'}`}>{o}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {step === 2 && (
            <div>
              <span className="text-sm font-medium">Interest areas (pick 2–4)</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {interests.map((i) => {
                  const on = w.interests.includes(i)
                  return (
                    <button
                      key={i}
                      onClick={() => setW({ ...w, interests: on ? w.interests.filter((x) => x !== i) : [...w.interests, i] })}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'hover:bg-secondary'}`}
                      aria-pressed={on}
                    >
                      {i}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              {[
                { key: 'syllabusPref', label: 'Syllabus length preference', opts: ['Shorter syllabi', 'No preference', 'Depth over length'] },
                { key: 'overlapPref', label: 'Overlap with compulsory subjects', opts: ['Maximise overlap', 'No preference'] },
              ].map((f) => (
                <div key={f.key}>
                  <span className="text-sm font-medium">{f.label}</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {f.opts.map((o) => (
                      <button key={o} onClick={() => setW({ ...w, [f.key]: o } as Wizard)} className={`rounded-md px-3 py-1.5 text-sm ${w[f.key as keyof Wizard] === o ? 'bg-pine text-emerald-50' : 'bg-secondary'}`}>{o}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 4 && result && (
            <div className="space-y-6">
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Subject selection is a personal academic decision. Previous scoring trends do not guarantee future marks.
              </div>
              {[{ label: 'Suggested combination', c: result.primary }, { label: 'Alternative combination', c: result.alt }].map(({ label, c }) => (
                <div key={label} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-pine">{label}</h3>
                    {c.valid ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Valid - {c.total}/600 marks</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-red-700"><AlertTriangle className="h-4 w-4" /> {c.violations.join('; ')}</span>
                    )}
                  </div>
                  <ul className="mt-3 divide-y">
                    {c.subjects.map((s) => (
                      <li key={s.name} className="flex items-center justify-between py-2 text-sm">
                        <span>{s.name} <span className="text-muted-foreground">(Group {s.group})</span></span>
                        <Badge>{s.marks}</Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">
                    <strong className="text-foreground">Why these:</strong> chosen for alignment with your background and interests
                    {w.overlapPref === 'Maximise overlap' ? ', overlap with compulsory subjects' : ''}, your available {w.prepMonths} months, and your comfort profile.
                  </p>
                  <p className="mt-1.5 text-sm text-amber-800">
                    <strong>Risks:</strong> {c.subjects.filter((s) => s.difficulty !== 'Moderate').map((s) => `${s.name}: ${s.risks}`).join(' ') || 'Low structural risk; depth of preparation still decides the outcome.'}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-between border-t pt-4">
            <button
              onClick={() => { if (step === 0) { setW(initial) } else setStep(step - 1) }}
              className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              <RotateCcw className="h-4 w-4" /> {step === 0 ? 'Reset' : 'Back'}
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && !w.background}
                className="inline-flex items-center gap-1.5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Target className="h-4 w-4" /> {step === 3 ? 'Generate suggestions' : 'Next'}
              </button>
            ) : (
              <button onClick={() => setStep(0)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary">Start over</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
