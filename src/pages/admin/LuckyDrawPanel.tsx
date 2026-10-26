import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Download, Eye, EyeOff, Gift, PlusCircle, RefreshCcw, Trophy, Users } from 'lucide-react'
import { ownerRequest } from '@/lib/hostingerApi'

type Entry = { name: string; number: string; email: string; user_id: string; applied_at: string }
type Winner = { position: number; name: string; number: string; selected_at: string }
type Campaign = { id: number; title: string; description: string; public: boolean; closes_at: string | null; published_at: string | null; drawn_at: string | null; winner_count: number }
type Response = { ok: boolean; current_id: number | null; campaign: Campaign | null; campaigns: { id: number; title: string; public: boolean; drawn_at: string | null }[]; entries: Entry[]; winners: Winner[]; total: number; page: number; per_page: number }
const dateTime = (iso: string | null) => iso ? new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)) + ' PKT' : 'Not set'
const pktInput = (iso: string | null) => iso ? new Date(new Date(iso).getTime() + 5 * 3600000).toISOString().slice(0, 16) : ''
const input = 'mt-1.5 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700'

export default function LuckyDrawPanel() {
  const [data, setData] = useState<Response | null>(null)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(0)
  const [title, setTitle] = useState('CSS VISTA Lucky Draw')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [winnerCount, setWinnerCount] = useState('1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [extraSpin, setExtraSpin] = useState(false)
  const [rollingName, setRollingName] = useState('')
  const [reveal, setReveal] = useState(true)

  const load = useCallback(async () => {
    const result = await ownerRequest<Response>(`admin/lucky-draw.php?page=${page}${selected ? `&campaign=${selected}` : ''}`)
    setData(result)
    if (result.campaign) {
      setTitle(result.campaign.title)
      setDescription(result.campaign.description)
      setDeadline(pktInput(result.campaign.closes_at))
      setWinnerCount(String(result.campaign.winner_count))
    }
  }, [page, selected])
  useEffect(() => { let active = true; void load().catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Cannot load lucky draw records.') }); return () => { active = false } }, [load])
  const act = async (body: Record<string, unknown>, success: string) => {
    setBusy(true); setError(''); setNotice('')
    try {
      await ownerRequest('admin/lucky-draw.php', { method: 'POST', body: JSON.stringify(body) })
      setNotice(success)
      await load()
      return true
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Operation failed.'); return false }
    finally { setBusy(false) }
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const iso = deadline ? new Date(`${deadline}:00+05:00`).toISOString() : null
    void act({ action: 'save', title, description, closes_at: iso, winner_count: Number(winnerCount) }, 'Lucky draw settings saved.')
  }
  const launch = async () => {
    if (!window.confirm('Start a new private draw? The current draw will be hidden and its applications/results kept in the history.')) return
    setBusy(true); setError(''); setNotice('')
    try {
      await ownerRequest('admin/lucky-draw.php', { method: 'POST', body: JSON.stringify({ action: 'new' }) })
      setSelected(0); setPage(1); setReveal(true)
      setNotice('New private draw created. Configure it and publish it when ready.')
      const result = await ownerRequest<Response>('admin/lucky-draw.php?page=1')
      setData(result)
      if (result.campaign) { setTitle(result.campaign.title); setDescription(result.campaign.description); setDeadline(''); setWinnerCount('1') }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create draw.') }
    finally { setBusy(false) }
  }
  const spin = async () => {
    if (!data?.campaign || !window.confirm('Close entries and select the winners now? Selection is permanent and cannot be rerun.')) return
    setBusy(true); setError(''); setNotice('')
    try {
      // A secure random selection is recorded on the server BEFORE the presentation starts.
      await ownerRequest('admin/lucky-draw.php', { method: 'POST', body: JSON.stringify({ action: 'draw' }) })
      setExtraSpin(false); setSpinning(true); setReveal(false)
      setNotice('The winners are securely recorded. Revealing results…')
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not select winners.') }
    finally { setBusy(false) }
  }
  const spinSecondWinner = async () => {
    if (!data?.campaign || !window.confirm('Choose one additional winner from the SAME applications? The existing winner stays unchanged and cannot be selected again. This one-time result is permanent.')) return
    setBusy(true); setError(''); setNotice('')
    try {
      await ownerRequest('admin/lucky-draw.php', { method: 'POST', body: JSON.stringify({ action: 'additional_winner' }) })
      setExtraSpin(true); setSpinning(true); setReveal(false)
      setNotice('Second winner securely recorded from the remaining original applicants. Revealing both winners…')
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not select the second winner.') }
    finally { setBusy(false) }
  }
  useEffect(() => {
    if (!spinning) return
    const firstWinnerNumber = extraSpin ? data?.winners.find(w => w.position === 1)?.number : undefined
    const pool = data?.entries.filter(entry => entry.number !== firstWinnerNumber).map(entry => entry.name) || []
    let at = 0
    const timer = window.setInterval(() => { if (pool.length) setRollingName(pool[(at++) % pool.length]) }, 90)
    const finish = window.setTimeout(() => { window.clearInterval(timer); setSpinning(false); setRollingName(''); setReveal(true) }, 3500)
    return () => { window.clearInterval(timer); window.clearTimeout(finish) }
  }, [spinning, extraSpin, data?.entries, data?.winners])

  const current = data?.campaign && data.campaign.id === data.current_id
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-8">
      <header className="rounded-2xl bg-gradient-to-r from-[#113732] to-[#23554a] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/70"><Gift className="h-4 w-4" /> CSS VISTA · Owner Studio</p><h1 className="mt-2 font-display text-3xl font-bold">Lucky Draw Manager</h1><p className="mt-2 text-sm text-white/80">Publish only when ready, review every account-backed application, and select winners fairly.</p></div>
          <button onClick={() => void launch()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-pine disabled:opacity-50"><PlusCircle className="h-4 w-4" /> New draw</button>
        </div>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
      {!data && <p className="py-8 text-center">Loading draw manager…</p>}
      {data && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-semibold">Draw history
              <select value={selected} onChange={event => { setSelected(Number(event.target.value)); setPage(1); setReveal(true) }} className="ml-2 rounded-lg border bg-white px-3 py-2 text-sm">
                <option value={0}>Current draw</option>
                {data.campaigns.map(draw => <option key={draw.id} value={draw.id}>#{draw.id} · {draw.title}{draw.drawn_at ? ' · completed' : ''}</option>)}
              </select>
            </label>
            <button className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold" onClick={() => void load()}><RefreshCcw className="h-4 w-4" /> Refresh</button>
          </div>
          {!data.campaign ? (
            <section className="rounded-2xl border bg-white p-8 text-center"><Gift className="mx-auto h-10 w-10 text-pine" /><h2 className="mt-3 text-xl font-bold">No draw yet</h2><p className="mt-2 text-sm text-muted-foreground">Create your first private lucky draw to begin.</p><button disabled={busy} onClick={() => void launch()} className="mt-4 rounded-lg bg-pine px-5 py-3 text-sm font-bold text-white">Create draw</button></section>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold text-pine">Draw settings</h2><span className={`rounded-full px-3 py-1 text-xs font-bold ${data.campaign.public ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{data.campaign.public ? 'PUBLIC' : 'HIDDEN'}</span></div>
                  <form onSubmit={save} className="mt-4 space-y-3">
                    <label className="block text-sm font-semibold">Draw name<input required maxLength={140} value={title} onChange={event => setTitle(event.target.value)} className={input} disabled={!current || !!data.campaign.drawn_at} /></label>
                    <label className="block text-sm font-semibold">Description<textarea rows={2} maxLength={500} value={description} onChange={event => setDescription(event.target.value)} className="mt-1.5 w-full rounded-lg border p-3 text-sm" disabled={!current || !!data.campaign.drawn_at} /></label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-semibold">Application closing time (PKT)<input type="datetime-local" value={deadline} onChange={event => setDeadline(event.target.value)} className={input} disabled={!current || !!data.campaign.drawn_at} /></label>
                      <label className="block text-sm font-semibold">Number of winners<input type="number" min={1} max={100} value={winnerCount} onChange={event => setWinnerCount(event.target.value)} className={input} disabled={!current || !!data.campaign.drawn_at} /></label>
                    </div>
                    <p className="text-xs text-muted-foreground">Leave the deadline blank to accept applications until you manually run the draw. The publishing switch is separate from these settings.</p>
                    {current && !data.campaign.drawn_at && <button disabled={busy} type="submit" className="w-full rounded-lg border border-pine px-4 py-3 text-sm font-bold text-pine disabled:opacity-50">Save settings</button>}
                  </form>
                  {current && <div className="mt-4 rounded-xl border border-dashed p-4">
                    <h3 className="text-sm font-bold text-pine">Public visibility control</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Switch OFF to remove the draw from the homepage and deny public access immediately. Records remain saved.</p>
                    <button disabled={busy} onClick={() => void act({ action: 'visibility', public: !data.campaign?.public }, !data.campaign?.public ? 'Lucky draw is now public.' : 'Lucky draw is hidden from the website.')} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white disabled:opacity-50 ${data.campaign.public ? 'bg-slate-700' : 'bg-emerald-800'}`}>
                      {data.campaign.public ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {data.campaign.public ? 'Switch OFF — Hide draw' : 'Switch ON — Publish draw'}
                    </button>
                  </div>}
                </section>

                <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold text-pine">Winner selection</h2><Trophy className="h-6 w-6 text-amber-600" /></div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-slate-50 p-4"><Users className="mx-auto h-5 w-5 text-pine" /><p className="mt-1 text-2xl font-black text-pine">{data.total}</p><p className="text-xs text-muted-foreground">Applications</p></div>
                    <div className="rounded-xl bg-slate-50 p-4"><Trophy className="mx-auto h-5 w-5 text-amber-600" /><p className="mt-1 text-2xl font-black text-pine">{data.campaign.winner_count}</p><p className="text-xs text-muted-foreground">Winner slots</p></div>
                  </div>
                  <div className="mt-5 flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-6 text-center">
                    {spinning ? <><Gift className="h-9 w-9 animate-bounce text-amber-600" /><p className="mt-2 text-xs font-bold uppercase tracking-widest text-amber-700">{extraSpin ? 'Selecting the second winner' : 'Selecting lucky names'}</p><h3 className="mt-3 break-words text-2xl font-black text-pine" aria-live="off">{rollingName || 'Good luck!'}</h3></> : data.winners.length && reveal ? <><Trophy className="h-9 w-9 text-amber-600" /><p className="mt-2 text-xs font-bold uppercase tracking-widest text-amber-700">Winners · permanent result</p>{data.winners.map(w => <p key={w.position} className="mt-2 text-xl font-black text-pine">{w.position}. {w.name} <span className="text-sm font-normal text-slate-500">#{w.number}</span></p>)}</> : <><Gift className="h-10 w-10 text-amber-600" /><h3 className="mt-3 text-xl font-bold text-pine">Ready for the draw?</h3><p className="mt-2 text-sm text-muted-foreground">Winners are chosen uniformly at random on the server, without repeats.</p></>}
                  </div>
                  {current && !data.campaign.drawn_at && <button disabled={busy || spinning || data.total < data.campaign.winner_count} onClick={() => void spin()} className="mt-4 w-full rounded-xl bg-amber-500 px-5 py-3.5 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-40">Run Lucky Draw · Select {data.campaign.winner_count} winner{data.campaign.winner_count === 1 ? '' : 's'}</button>}
                  {current && !!data.campaign.drawn_at && data.campaign.winner_count === 1 && data.winners.length === 1 && data.total > 1 && (
                    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-950">Need one more winner from this draw?</p>
                      <p className="mt-1 text-xs text-amber-900">Select one additional winner from the original applications, excluding the first winner. No new entries or replacement of the first result.</p>
                      <button type="button" disabled={busy || spinning} onClick={() => void spinSecondWinner()} className="mt-3 w-full rounded-xl bg-amber-500 px-5 py-3.5 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-40">Draw Second Winner · One Time</button>
                    </div>
                  )}
                  {data.campaign.drawn_at && <p className="mt-3 text-center text-xs text-muted-foreground">Selected {dateTime(data.campaign.drawn_at)}. This result cannot be redrawn.</p>}
                </section>
              </div>

              <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-pine">All applications</h2><p className="mt-1 text-sm text-muted-foreground">{data.total} recorded entries · Names, personal numbers, verified account links and submission times</p></div>
                  <button type="button" onClick={() => window.open(`/api/admin/lucky-draw.php?campaign=${data.campaign?.id}&format=csv`, '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-pine"><Download className="h-4 w-4" /> Export all CSV</button></div>
                <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="p-3">Applicant</th><th className="p-3">Personal no.</th><th className="p-3">Account email</th><th className="p-3">Applied (PKT)</th></tr></thead><tbody>{data.entries.map((e, i) => <tr key={`${e.user_id}-${i}`} className="border-b last:border-0"><td className="p-3 font-semibold">{e.name}</td><td className="p-3 font-mono">{e.number}</td><td className="p-3">{e.email}</td><td className="p-3 text-xs">{dateTime(e.applied_at)}</td></tr>)}</tbody></table>{!data.entries.length && <p className="py-8 text-center text-sm text-muted-foreground">No applications yet.</p>}</div>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs"><p>{data.total} total · Page {data.page}</p><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(x => x - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button><button disabled={page * data.per_page >= data.total} onClick={() => setPage(x => x + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button></div></div>
              </section>
            </>
          )}
        </>
      )}
    </main>
  )
}
