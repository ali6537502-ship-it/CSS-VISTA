import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, Clock3, Gift, LockKeyhole, RefreshCcw, Trophy, Users } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { hostingerRequest } from '@/lib/hostingerApi'

type Entry = { name: string; number: string; applied_at: string }
type Winner = { position: number; name: string; number: string; selected_at: string }
type Campaign = { id: number; title: string; description: string; closes_at: string | null; published_at: string | null; drawn_at: string | null; winner_count: number }
type View = { ok: boolean; visible: boolean; campaign?: Campaign; accepting?: boolean; mine?: Entry | null; entries?: Entry[]; total?: number; page?: number; per_page?: number; winners?: Winner[] }
const formatTime = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value)) + ' PKT'
  : 'Not scheduled'

export default function LuckyDraw() {
  const { user, loading: accountLoading } = useAccount()
  const [view, setView] = useState<View | null>(null)
  const [page, setPage] = useState(1)
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async (requestedPage: number) => {
    const response = await hostingerRequest<View>(`lucky-draw.php?page=${requestedPage}`)
    setView(response)
  }, [])
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await hostingerRequest<View>(`lucky-draw.php?page=${page}`)
        if (active) { setView(response); setError('') }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load the lucky draw.')
      }
    }
    void load()
    const poll = window.setInterval(() => { if (!document.hidden) void load() }, 20000)
    return () => { active = false; window.clearInterval(poll) }
  }, [page, user?.id])
  useEffect(() => { if (user?.display_name && !name) setName(user.display_name) }, [user?.display_name, name])

  const apply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSending(true); setError(''); setNotice('')
    try {
      const response = await hostingerRequest<{ ok: boolean; number: string; message: string }>('lucky-draw.php', {
        method: 'POST', body: JSON.stringify({ name, number }),
      })
      setNotice(`Entry confirmed. Your personal number is ${response.number}.`)
      await refresh(page)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit your entry.')
    } finally { setSending(false) }
  }

  if (view && !view.visible) return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <LockKeyhole className="mx-auto h-10 w-10 text-slate-400" />
      <h1 className="mt-4 text-2xl font-bold text-pine">Lucky draw is not open</h1>
      <p className="mt-2 text-sm text-muted-foreground">The organiser has not published an active lucky draw.</p>
      <Link to="/" className="mt-5 inline-block rounded-lg bg-pine px-5 py-3 text-sm font-semibold text-white">Return home</Link>
    </main>
  )

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:py-12">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#102f30] via-[#163d39] to-[#204d45] px-6 py-10 text-white shadow-xl sm:px-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border-[38px] border-white/5" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider"><Gift className="h-4 w-4" /> CSS VISTA · Lucky Draw</span>
          <h1 className="mt-5 max-w-3xl font-display text-3xl font-black leading-tight sm:text-5xl">{view?.campaign?.title || 'Lucky Draw & Name Picker'}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">{view?.campaign?.description || 'One account. One entry. Every eligible participant gets an equal chance.'}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium">
            <span className="rounded-lg border border-white/20 bg-white/10 px-4 py-2"><Users className="mr-1.5 inline h-4 w-4" /> {view?.total ?? 0} applications</span>
            <span className="rounded-lg border border-white/20 bg-white/10 px-4 py-2"><Clock3 className="mr-1.5 inline h-4 w-4" /> {view?.campaign?.drawn_at ? 'Draw complete' : view?.accepting ? 'Applications open' : 'Entries closed'}</span>
          </div>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {!view && !error && <p role="status" className="py-12 text-center text-muted-foreground">Loading the current lucky draw…</p>}

      {view?.visible && (
        <>
          <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.1fr]">
            <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7" aria-labelledby="draw-apply-title">
              <h2 id="draw-apply-title" className="font-display text-2xl font-bold text-pine">Apply for this draw</h2>
              <p className="mt-2 text-sm text-muted-foreground">Only signed-in CSS VISTA account holders can apply. Your name, personal number and application time will appear on the public list.</p>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                <p><span className="font-semibold">Published:</span> {formatTime(view.campaign?.published_at)}</p>
                <p className="mt-1"><span className="font-semibold">Application deadline:</span> {view.campaign?.closes_at ? formatTime(view.campaign.closes_at) : 'Until the organiser closes the draw'}</p>
              </div>
              {view.mine ? (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <CheckCircle2 className="h-7 w-7 text-emerald-700" />
                  <h3 className="mt-2 text-lg font-bold text-emerald-900">Your application is confirmed</h3>
                  <p className="mt-2 font-semibold">{view.mine.name}</p>
                  <p className="mt-1 text-sm">Personal number: <strong className="font-mono">{view.mine.number}</strong></p>
                  <p className="mt-1 text-xs text-emerald-800">Applied {formatTime(view.mine.applied_at)}</p>
                </div>
              ) : !view.accepting ? (
                <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-900">Applications are closed for this draw.</p>
              ) : accountLoading ? (
                <p className="mt-5 text-sm text-muted-foreground">Checking your account…</p>
              ) : !user ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <LockKeyhole className="h-6 w-6 text-amber-800" />
                  <p className="mt-2 text-sm font-medium">Sign in or create your free account to apply.</p>
                  <Link to="/account" className="mt-3 inline-block rounded-lg bg-pine px-5 py-3 text-sm font-semibold text-white">Open my account</Link>
                </div>
              ) : (
                <form onSubmit={event => void apply(event)} className="mt-5 space-y-4">
                  <label className="block text-sm font-semibold text-pine">Your name
                    <input required maxLength={100} minLength={2} value={name} onChange={event => setName(event.target.value)} placeholder="Enter your name" className="mt-1.5 h-12 w-full rounded-lg border px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700" />
                  </label>
                  <label className="block text-sm font-semibold text-pine">Personal number <span className="font-normal text-muted-foreground">(optional)</span>
                    <input inputMode="numeric" maxLength={12} pattern="[0-9]*" value={number} onChange={event => setNumber(event.target.value.replace(/\D/g, ''))} placeholder="Any number, e.g. 98765" className="mt-1.5 h-12 w-full rounded-lg border px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-700" />
                  </label>
                  <p className="text-xs leading-relaxed text-muted-foreground">Leave the number blank and we will assign one for you. The number helps identify your entry; your signed-in account establishes eligibility. One application per account.</p>
                  <button type="submit" disabled={sending || !name.trim()} className="w-full rounded-xl bg-pine px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:opacity-50">{sending ? 'Submitting application…' : 'Apply for Lucky Draw'}</button>
                </form>
              )}
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7" aria-labelledby="draw-entries-title">
              <div className="flex items-center justify-between gap-2">
                <div><h2 id="draw-entries-title" className="font-display text-2xl font-bold text-pine">Application list</h2><p className="mt-1 text-sm text-muted-foreground">Every application has a recorded submission time (Pakistan time).</p></div>
                <button type="button" aria-label="Refresh application list" disabled={refreshing} onClick={() => { setRefreshing(true); void refresh(page).catch(reason => setError(reason instanceof Error ? reason.message : 'Refresh failed.')).finally(() => setRefreshing(false)) }} className="rounded-lg border p-2 text-pine disabled:opacity-50"><RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></button>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[340px] text-left text-sm">
                  <thead className="border-b bg-slate-50 text-xs text-slate-600"><tr><th className="p-3">Participant</th><th className="p-3">Number</th><th className="p-3">Application time</th></tr></thead>
                  <tbody>{(view.entries || []).map((entry, i) => (
                    <tr key={`${entry.number}-${i}`} className="border-b last:border-0"><td className="break-words p-3 font-medium">{entry.name}</td><td className="p-3 font-mono">{entry.number}</td><td className="p-3 text-xs text-muted-foreground">{formatTime(entry.applied_at)}</td></tr>
                  ))}</tbody>
                </table>
                {!view.entries?.length && <p className="p-6 text-center text-sm text-muted-foreground">No applications yet. Be the first to apply.</p>}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{view.total ?? 0} total entries · Page {view.page ?? page}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-40">Previous</button>
                  <button disabled={page * (view.per_page ?? 50) >= (view.total ?? 0)} onClick={() => setPage(p => p + 1)} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-40">Next</button>
                </div>
              </div>
            </section>
          </div>

          {!!view.winners?.length && <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-[#fff9e9] to-white p-6 text-center sm:p-10">
            <Trophy className="mx-auto h-10 w-10 text-amber-600" />
            <h2 className="mt-3 font-display text-3xl font-bold text-pine">Lucky draw winners</h2>
            <p className="mt-2 text-sm text-muted-foreground">The draw has been completed. Congratulations to our selected participants!</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">{view.winners.map(w => <div key={w.position} className="min-w-[200px] rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Winner {w.position}</p><h3 className="mt-2 text-xl font-black text-pine">{w.name}</h3><p className="mt-1 font-mono text-sm text-slate-500">#{w.number}</p></div>)}</div>
          </section>}
        </>
      )}
    </main>
  )
}
