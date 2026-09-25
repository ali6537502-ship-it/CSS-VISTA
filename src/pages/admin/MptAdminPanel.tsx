import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ownerRequest, HostingerApiError } from '@/lib/hostingerApi'
import type { MptMock } from '@/lib/mpt/api'
import { pktDateTime, pktTime } from '@/lib/mpt/copy'

// Owner workspace for the MPT examination system (Section 18). Every rule is
// enforced by /api/admin/mpt.php; this screen only collects input and reasons.

type Stats = { applications: number; appeared: number; started: number; in_progress: number; completed: number; absent: number | null; average_score: number | null; completion_rate: number | null; distribution: Array<{ from: number; to: number; count: number }> }
type AdminMock = MptMock & { results_delay_minutes: number; id: string; schedule_key: string | null; capacity: number | null; reserved_count: number; rank_min_candidates: number; scoring_version: number; cancel_reason: string | null; created_by: string; stats: Stats }
type Overview = { flag: string; auto_schedule: boolean; runway: { available: number; total: number; publishable: boolean; generated_at?: string | null; exhausted_at: string | null; daily_slots_remaining?: number }; last_maintenance_at: string | null; mocks: AdminMock[] }
type AppRow = { candidate: string; email: string; candidate_code: string | null; roll_number: string; application_code: string; applied_at: string; status: string; phase: string; appeared: boolean; score: number | null }
type AttemptRow = { candidate: string; email: string; roll_number: string; application_code: string; status: string; started_at: string; submitted_at: string | null; submit_reason: string | null; score: number | null; visibility_changes: number; device_takeovers: number; void_reason: string | null }

const post = <T,>(body: Record<string, unknown>) => ownerRequest<T>('admin/mpt.php', { method: 'POST', body: JSON.stringify(body) })
const get = <T,>(query: string) => ownerRequest<T>(`admin/mpt.php${query}`)
const toLocalInput = (iso: string) => {
  const date = new Date(iso)
  const pkt = new Date(date.getTime() + 5 * 3600_000)
  return pkt.toISOString().slice(0, 16)
}
const fromPktInput = (value: string) => new Date(`${value}:00+05:00`).toISOString()
const button = 'min-h-10 rounded-md border bg-white px-3 text-sm font-semibold text-pine hover:bg-secondary disabled:opacity-50'

function useAction(onDone: () => void) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const run = async (body: Record<string, unknown>, success: string) => {
    setBusy(true)
    setMessage(null)
    try {
      await post(body)
      setMessage(success)
      onDone()
    } catch (reason) {
      setMessage(reason instanceof HostingerApiError ? reason.message : 'The request failed.')
    } finally {
      setBusy(false)
    }
  }
  return { busy, message, run }
}

function askReason(prompt: string) {
  const reason = window.prompt(`${prompt}\n\nWrite a reason (kept in the audit log):`)
  return reason && reason.trim().length >= 5 ? reason.trim() : null
}

function MockDetail({ mock, onChanged }: { mock: AdminMock; onChanged: () => void }) {
  const [tab, setTab] = useState<'settings' | 'applications' | 'attempts' | 'rescore'>('applications')
  const [apps, setApps] = useState<{ rows: AppRow[]; total: number } | null>(null)
  const [attempts, setAttempts] = useState<{ rows: AttemptRow[]; total: number } | null>(null)
  const [search, setSearch] = useState('')
  const [appeared, setAppeared] = useState<'' | 'yes' | 'no'>('')
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => { setVersion((v) => v + 1); onChanged() }, [onChanged])
  const action = useAction(refresh)
  useEffect(() => {
    if (tab === 'applications') get<{ rows: AppRow[]; total: number }>(`?view=applications&slug=${mock.slug}&q=${encodeURIComponent(search)}${appeared ? `&appeared=${appeared}` : ''}`).then(setApps).catch(() => setApps(null))
    if (tab === 'attempts') get<{ rows: AttemptRow[]; total: number }>(`?view=attempts&slug=${mock.slug}`).then(setAttempts).catch(() => setAttempts(null))
  }, [tab, mock.slug, search, appeared, version])
  const [form, setForm] = useState(() => ({
    exam_open_at: toLocalInput(mock.exam_open_at), application_open_at: toLocalInput(mock.application_open_at),
    duration_minutes: String(mock.duration_minutes), close_offset_minutes: String(Math.round((Date.parse(mock.application_close_at) - Date.parse(mock.exam_open_at)) / 60000)),
    entry_close_offset_minutes: String(Math.round((Date.parse(mock.entry_close_at) - Date.parse(mock.exam_open_at)) / 60000)),
    roll_issue_delay_minutes: String(mock.roll_issue_delay_minutes), capacity: mock.capacity === null ? '' : String(mock.capacity),
    results_release_policy: mock.results_release_policy, answer_review_policy: mock.answer_review_policy,
    pass_percentage: mock.pass_percentage === null ? '' : String(mock.pass_percentage), negative_marking: String(mock.negative_marking), rank_min_candidates: String(mock.rank_min_candidates),
    results_delay_minutes: String(mock.results_delay_minutes),
  }))
  const [corrections, setCorrections] = useState('')
  const save = async (event: FormEvent) => {
    event.preventDefault()
    const reason = askReason('Save these settings?')
    if (!reason) return
    const running = Date.now() >= Date.parse(mock.exam_open_at) && Date.now() < Date.parse(mock.exam_end_at)
    const confirm = running ? window.confirm('This mock is running. Changes affect candidates sitting now. Continue?') : false
    await action.run({
      action: 'update_mock', slug: mock.slug, reason, confirm,
      exam_open_at: fromPktInput(form.exam_open_at), application_open_at: fromPktInput(form.application_open_at),
      duration_minutes: Number(form.duration_minutes), close_offset_minutes: Number(form.close_offset_minutes), entry_close_offset_minutes: Number(form.entry_close_offset_minutes),
      roll_issue_delay_minutes: Number(form.roll_issue_delay_minutes), capacity: form.capacity === '' ? null : Number(form.capacity),
      results_release_policy: form.results_release_policy, answer_review_policy: form.answer_review_policy,
      pass_percentage: form.pass_percentage === '' ? null : Number(form.pass_percentage), negative_marking: Number(form.negative_marking), rank_min_candidates: Number(form.rank_min_candidates),
      results_delay_minutes: Number(form.results_delay_minutes),
    }, 'Settings saved. Every candidate’s reveal time and countdown now follows the new schedule.')
  }
  const field = (key: keyof typeof form, label: string, type = 'number') => (
    <label className="block text-sm font-semibold text-pine">{label}
      <input type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 h-10 w-full rounded-md border px-2 font-normal" />
    </label>
  )
  const s = mock.stats
  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-pine">{mock.title} <span className="text-sm font-normal text-muted-foreground">({mock.slug}, {mock.status})</span></h3>
          <p className="text-sm text-muted-foreground">Exam {pktDateTime(mock.exam_open_at)} · applications close at start · late entry until {pktTime(mock.entry_close_at)} · ends {pktDateTime(mock.exam_end_at)}</p>
          {mock.cancel_reason && <p className="text-sm text-amber-800">Cancelled: {mock.cancel_reason}</p>}
        </div>
        {mock.status !== 'CANCELLED' && (
          <button type="button" className={button} disabled={action.busy} onClick={() => { const reason = askReason(`Cancel ${mock.title}? Candidates will see it as cancelled.`); if (reason) void action.run({ action: 'cancel_mock', slug: mock.slug, reason }, 'Mock cancelled.') }}>Cancel mock</button>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-7">
        {[['Applied', s.applications], ['Appeared', s.appeared], ['In progress', s.in_progress], ['Completed', s.completed], ['Absent', s.absent ?? '—'], ['Average score', s.average_score ?? '—'], ['Completion', s.completion_rate === null ? '—' : `${s.completion_rate}%`]].map(([label, value]) => (
          <div key={String(label)} className="rounded-md border p-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-bold">{value}</dd></div>
        ))}
      </dl>
      {s.completed > 0 && (
        <table className="mt-3 text-xs"><caption className="text-left font-semibold text-pine">Score distribution (%)</caption>
          <tbody><tr>{s.distribution.map((bucket) => <td key={bucket.from} className="border px-2 py-1 text-center">{bucket.from}–{bucket.to}<br /><strong>{bucket.count}</strong></td>)}</tr></tbody>
        </table>
      )}
      {action.message && <p role="status" className="mt-3 rounded-md border bg-secondary/40 p-2 text-sm">{action.message}</p>}
      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {(['applications', 'attempts', 'settings', 'rescore'] as const).map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`${button} ${tab === key ? 'bg-pine text-white hover:bg-pine' : ''}`}>{key[0].toUpperCase() + key.slice(1)}</button>
        ))}
      </div>

      {tab === 'applications' && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roll number, application ID, name or email" className="h-10 min-w-[16rem] flex-1 rounded-md border px-2 text-sm" />
            <div role="group" aria-label="Show" className="flex gap-1">
              {([['', 'All applied'], ['yes', 'Appeared'], ['no', 'Absent / not yet']] as const).map(([value, label]) => (
                <button key={label} type="button" aria-pressed={appeared === value} onClick={() => setAppeared(value)} className={`${button} ${appeared === value ? 'bg-pine text-white hover:bg-pine' : ''}`}>{label}</button>
              ))}
            </div>
            <a href={`/api/admin/mpt.php?view=applications&slug=${mock.slug}&format=csv${appeared ? `&appeared=${appeared}` : ''}`} className={`${button} inline-flex items-center`}>Export CSV</a>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-1">Candidate</th><th>Roll No.</th><th>Application ID</th><th>Applied</th><th>Appeared</th><th>State</th><th>Score</th><th /></tr></thead>
              <tbody className="divide-y">
                {apps?.rows.map((row) => (
                  <tr key={row.application_code}>
                    <td className="py-1.5">{row.candidate}<br /><span className="text-xs text-muted-foreground">{row.email}</span></td>
                    <td className="font-mono">{row.roll_number}</td><td className="font-mono text-xs">{row.application_code}</td>
                    <td className="text-xs">{pktDateTime(row.applied_at)}</td><td className="text-xs font-semibold">{row.appeared ? 'Yes' : 'No'}</td><td className="text-xs">{row.phase}</td><td>{row.score ?? '—'}</td>
                    <td className="space-x-1 whitespace-nowrap text-right">
                      {row.status === 'ACTIVE' && <button type="button" className={button} disabled={action.busy} onClick={() => { const reason = askReason(`Cancel ${row.application_code}?`); if (reason) void action.run({ action: 'cancel_application', code: row.application_code, reason }, 'Application cancelled.') }}>Cancel</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {apps && <p className="mt-1 text-xs text-muted-foreground">{apps.total} application(s)</p>}
          </div>
        </div>
      )}

      {tab === 'attempts' && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-1">Candidate</th><th>Roll No.</th><th>Started</th><th>Submitted</th><th>Reason</th><th>Score</th><th>Tab switches</th><th>Takeovers</th><th /></tr></thead>
            <tbody className="divide-y">
              {attempts?.rows.map((row) => (
                <tr key={`${row.application_code}-${row.started_at}`}>
                  <td className="py-1.5">{row.candidate}<br /><span className="text-xs text-muted-foreground">{row.status}{row.void_reason ? ` — ${row.void_reason}` : ''}</span></td>
                  <td className="font-mono">{row.roll_number}</td><td className="text-xs">{pktDateTime(row.started_at)}</td><td className="text-xs">{pktDateTime(row.submitted_at)}</td>
                  <td className="text-xs">{row.submit_reason ?? '—'}</td><td>{row.score ?? '—'}</td><td>{row.visibility_changes}</td><td>{row.device_takeovers}</td>
                  <td className="space-x-1 whitespace-nowrap text-right">
                    {row.status !== 'VOIDED' && <button type="button" className={button} disabled={action.busy} onClick={() => { const reason = askReason('Void this attempt? It will stop counting in results, stats and rank.'); if (reason) void action.run({ action: 'void_attempt', code: row.application_code, reason }, 'Attempt voided.') }}>Void</button>}
                    {row.status === 'VOIDED' && <button type="button" className={button} disabled={action.busy} onClick={() => { const reason = askReason('Grant this candidate one re-sit?'); if (reason) void action.run({ action: 'grant_resit', code: row.application_code, reason }, 'Re-sit granted.') }}>Grant re-sit</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-muted-foreground">Integrity signals are recorded for review only; nothing is penalised automatically.</p>
        </div>
      )}

      {tab === 'settings' && (
        <form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {field('exam_open_at', 'Exam starts (PKT)', 'datetime-local')}
          {field('application_open_at', 'Applications open (PKT)', 'datetime-local')}
          {field('duration_minutes', 'Duration (minutes)')}
          {field('close_offset_minutes', 'Applications close (minutes after start; 0 = at start)')}
          {field('entry_close_offset_minutes', 'Late entry allowed until (minutes after start)')}
          {field('results_delay_minutes', 'Result card (minutes after the exam ends)')}
          {field('roll_issue_delay_minutes', 'Roll Number delay (minutes)')}
          {field('capacity', 'Capacity (blank = unlimited)')}
          {field('pass_percentage', 'Pass percentage (blank = hidden)')}
          {field('negative_marking', 'Negative marking per wrong answer')}
          {field('rank_min_candidates', 'Minimum candidates for rank')}
          <label className="block text-sm font-semibold text-pine">Results release
            <select value={form.results_release_policy} onChange={(event) => setForm({ ...form, results_release_policy: event.target.value })} className="mt-1 h-10 w-full rounded-md border px-2 font-normal">
              <option value="IMMEDIATE_SCORE">Score immediately</option><option value="AFTER_WINDOW">After the exam ends</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-pine">Answer review
            <select value={form.answer_review_policy} onChange={(event) => setForm({ ...form, answer_review_policy: event.target.value })} className="mt-1 h-10 w-full rounded-md border px-2 font-normal">
              <option value="AFTER_WINDOW">After the exam ends</option><option value="IMMEDIATE">Immediately</option><option value="NEVER">Never</option>
            </select>
          </label>
          <div className="sm:col-span-2 lg:col-span-3"><button type="submit" disabled={action.busy || mock.status === 'CANCELLED'} className={button}>Save settings</button></div>
        </form>
      )}

      {tab === 'rescore' && (
        <form className="mt-3 space-y-2" onSubmit={(event) => {
          event.preventDefault()
          const parsed = corrections.split(/[\n,]+/).map((line) => line.trim()).filter(Boolean).map((line) => {
            const [position, letter] = line.split(/[:=\s]+/)
            return { position: Number(position), correct_index: 'ABCD'.indexOf((letter ?? '').toUpperCase()) }
          })
          if (!parsed.length || parsed.some((c) => !Number.isInteger(c.position) || c.correct_index < 0)) { window.alert('Use one correction per line, e.g. "37: C".'); return }
          const reason = askReason(`Correct ${parsed.length} answer(s) and rescore every finished attempt?`)
          if (reason) void action.run({ action: 'rescore', slug: mock.slug, reason, corrections: parsed }, 'Answer key corrected and attempts rescored. Candidates see a note on their result.')
        }}>
          <p className="text-sm text-muted-foreground">Scoring version {mock.scoring_version}. Enter corrections as <code>question number: correct option</code>, one per line.</p>
          <textarea value={corrections} onChange={(event) => setCorrections(event.target.value)} rows={4} className="w-full rounded-md border p-2 font-mono text-sm" placeholder={'37: C\n112: A'} />
          <button type="submit" disabled={action.busy} className={button}>Correct key and rescore</button>
        </form>
      )}
    </section>
  )
}

export default function MptAdminPanel() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const [openAt, setOpenAt] = useState('')
  const [capacity, setCapacity] = useState('')
  const create = useAction(reload)
  useEffect(() => {
    get<Overview>('?view=overview').then((data) => { setOverview(data); setError(null) }).catch((reason) => setError(reason instanceof HostingerApiError ? reason.message : 'Could not load MPT administration.'))
  }, [version])
  const current = overview?.mocks.find((mock) => mock.slug === selected) ?? null
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <h2 className="font-display text-2xl font-bold text-pine">MPT examinations</h2>
      {error && <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">{error}</p>}
      {overview && (
        <>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-3"><p className="text-xs text-muted-foreground">Application flow</p><p className="font-bold">{overview.flag.toUpperCase()}</p><p className="text-xs text-muted-foreground">Automatic daily mocks: {overview.auto_schedule ? 'on (15:00 & 22:30 PKT)' : 'off'}</p></div>
            <div className={`rounded-xl border p-3 ${overview.runway.available <= 4 ? 'border-amber-300 bg-amber-50' : 'bg-white'}`}>
              <p className="text-xs text-muted-foreground">Official paper runway</p>
              <p className="font-bold">{overview.runway.available} of {overview.runway.total} papers left{overview.runway.daily_slots_remaining !== undefined ? ` · ≈${overview.runway.daily_slots_remaining} days` : ''}</p>
              <p className="text-xs text-muted-foreground">The 40 release-audited papers, used in order, never repeated.</p>
              {overview.runway.exhausted_at && <p className="text-xs text-amber-800">Scheduling stopped for lack of papers at {pktDateTime(overview.runway.exhausted_at)}.</p>}
            </div>
            <div className="rounded-xl border bg-white p-3"><p className="text-xs text-muted-foreground">Last maintenance run</p><p className="font-bold">{overview.last_maintenance_at ? pktDateTime(overview.last_maintenance_at) : 'never'}</p></div>
          </div>

          <form className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-3" onSubmit={(event) => {
            event.preventDefault()
            if (!openAt) return
            void create.run({ action: 'create_mock', exam_open_at: fromPktInput(openAt), capacity: capacity === '' ? null : Number(capacity) }, 'Mock created and published with a fresh paper.')
          }}>
            <label className="text-sm font-semibold text-pine">New mock — exam starts (PKT)<input type="datetime-local" value={openAt} onChange={(event) => setOpenAt(event.target.value)} className="mt-1 block h-10 rounded-md border px-2 font-normal" /></label>
            <label className="text-sm font-semibold text-pine">Capacity<input type="number" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="unlimited" className="mt-1 block h-10 w-32 rounded-md border px-2 font-normal" /></label>
            <button type="submit" disabled={create.busy} className={button}>Create mock</button>
            <p className="w-full text-xs text-muted-foreground">Defaults: applications open now and close when the exam starts; late entry for 10 minutes; 200 minutes; Roll Number 10 minutes after applying; result card 30 minutes after the exam ends.</p>
            {create.message && <p role="status" className="w-full text-sm">{create.message}</p>}
          </form>

          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2">Mock</th><th>Exam (PKT)</th><th>Status</th><th>Applied</th><th>Appeared</th><th>Completed</th><th>Avg</th><th /></tr></thead>
              <tbody className="divide-y">
                {overview.mocks.map((mock) => (
                  <tr key={mock.slug} className={selected === mock.slug ? 'bg-emerald-50' : ''}>
                    <td className="px-3 py-2 font-semibold">{mock.title}</td><td>{pktDateTime(mock.exam_open_at)}</td><td>{mock.status}</td>
                    <td>{mock.stats.applications}{mock.capacity !== null ? ` / ${mock.capacity}` : ''}</td><td>{mock.stats.appeared}</td><td>{mock.stats.completed}</td><td>{mock.stats.average_score ?? '—'}</td>
                    <td className="pr-3 text-right"><button type="button" className={button} onClick={() => setSelected(mock.slug)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {overview.mocks.length === 0 && <p className="p-4 text-sm text-muted-foreground">No mocks yet.</p>}
          </div>
          {current && <MockDetail key={`${current.slug}-${current.scoring_version}-${current.exam_open_at}`} mock={current} onChanged={reload} />}
        </>
      )}
    </div>
  )
}
