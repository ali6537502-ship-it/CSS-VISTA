import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ExternalLink, Printer, RotateCcw, Save } from 'lucide-react'
import { PageHeader, OfficialNotice } from '@/components/shared'
import { mptChecklist, writtenChecklist } from '@/data/checklists'
import { getChecklist, recordActivity, setChecklist } from '@/lib/progress'

const LAST_UPDATED = '17 July 2026'
const FPSC_URL = 'https://www.fpsc.gov.pk/'

export default function Checklists() {
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') === 'written' ? 'written' : 'mpt'
  return (
    <div>
      <PageHeader
        title={tab === 'mpt' ? 'CSS MPT Application Checklist' : 'CSS Written Application Method and Document Checklist'}
        description="Tick each step as you complete it. Always follow the latest official FPSC advertisement; requirements can change."
      />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <OfficialNotice />

        <div className="no-print mt-5 flex flex-wrap items-center gap-2">
          <button onClick={() => setSp({ tab: 'mpt' })} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === 'mpt' ? 'bg-pine text-emerald-50' : 'bg-secondary'}`}>
            MPT Application
          </button>
          <button onClick={() => setSp({ tab: 'written' })} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === 'written' ? 'bg-pine text-emerald-50' : 'bg-secondary'}`}>
            Written Application &amp; Documents
          </button>
        </div>

        {tab === 'mpt' ? (
          <ChecklistBlock id="mpt" groups={mptChecklist} title="CSS MPT Application Checklist" />
        ) : (
          <ChecklistBlock id="written" groups={writtenChecklist} title="CSS Written Application & Documents Checklist" />
        )}
      </div>
    </div>
  )
}

function ChecklistBlock({ id, groups, title }: { id: string; groups: { group: string; steps: { id: string; label: string; hint?: string }[] }[]; title: string }) {
  const allSteps = useMemo(() => groups.flatMap((g) => g.steps), [groups])
  const [checks, setChecks] = useState<boolean[]>(() => getChecklist(id, allSteps.length))
  const [savedFlash, setSavedFlash] = useState(false)
  const done = checks.filter(Boolean).length

  function toggle(i: number) {
    const next = checks.map((c, j) => (j === i ? !c : c))
    setChecks(next)
    setChecklist(id, next)
    recordActivity({ type: 'checklist', label: `${title} - ${next.filter(Boolean).length}/${allSteps.length} steps`, path: `/checklists?tab=${id}` })
  }

  function reset() {
    if (!confirm('Reset all ticks on this checklist?')) return
    const next = Array(allSteps.length).fill(false)
    setChecks(next)
    setChecklist(id, next)
  }

  return (
    <div className="mt-6">
      <div className="print-area rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-pine">{title}</h2>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-pine">{done}/{allSteps.length} done</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${(done / allSteps.length) * 100}%` }} />
        </div>

        {groups.map((g, groupIndex) => {
          const groupOffset = groups
            .slice(0, groupIndex)
            .reduce((total, item) => total + item.steps.length, 0)
          return (
          <div key={g.group} className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{g.group}</p>
            <div className="mt-2 space-y-2">
              {g.steps.map((s, stepIndex) => {
                const i = groupOffset + stepIndex
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(i)}
                    className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${checks[i] ? 'border-emerald-500 bg-emerald-50/60' : 'bg-white hover:border-emerald-700/40'}`}
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${checks[i] ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'}`}>
                      {checks[i] ? '✓' : ''}
                    </span>
                    <span>
                      <span className={`font-medium ${checks[i] ? 'text-emerald-900 line-through' : ''}`}>{s.label}</span>
                      {s.hint && <span className="block text-xs text-muted-foreground">{s.hint}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          )
        })}
      </div>

      <div className="no-print mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setChecklist(id, checks); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500) }}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-pine px-4 text-sm font-semibold text-emerald-50"
        >
          <Save className="h-4 w-4" /> {savedFlash ? 'Saved ✓' : 'Save progress'}
        </button>
        <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-1.5 rounded-md border bg-white px-4 text-sm font-semibold text-pine">
          <Printer className="h-4 w-4" /> Print checklist
        </button>
        <button onClick={reset} className="inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm font-semibold text-red-600">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
        <a href={FPSC_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-md border border-emerald-700/40 bg-emerald-50 px-4 text-sm font-semibold text-emerald-900">
          <ExternalLink className="h-4 w-4" /> Official FPSC source
        </a>
        <span className="ml-auto text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</span>
      </div>
    </div>
  )
}
