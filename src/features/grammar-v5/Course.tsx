import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/shared'
import { attemptChoiceKey, readAttemptChoice } from '@/features/grammar/sync'
import { useAccount } from '@/lib/accountContext'
import { recordActivity } from '@/lib/progress'
import { useLearning, type Overview } from '@/features/learning/api'
import { conceptHref, dayHref, loadCatalog } from './content'
import { conceptProfile } from './state'
import { useStudyStore } from './useStudyStore'
import { action, primary, surface } from './Exercise'
import { DEPTHS, PHASES, type Catalog, type Depth } from './types'
import LessonView from './LessonView'
import Library, { RESOURCES } from './Library'
import Lab from './Lab'
import Reports from './Reports'
import { LEGACY_DAY_MAP } from './legacyMap'
const LegacyWork = lazy(() => import('./LegacyWork'))
import './grammar.css'

function rememberAttempt(user?: string) { try { return readAttemptChoice(localStorage, user) } catch { return undefined } }
export default function GrammarLearning({ initialCatalog }: { initialCatalog?: Catalog } = {}) {
  const { user, loading } = useAccount(), [params, setParams] = useSearchParams()
  const [data, setData] = useState<{ catalog?: Catalog; error?: string }>(() => initialCatalog ? { catalog: initialCatalog } : {}), [retry, setRetry] = useState(0)
  const attempts = useLearning<Overview>(user ? 'learning.php' : undefined)
  const [choice, setChoice] = useState<{ user: string; value: string }>()
  const remembered = choice?.user === user?.id ? choice?.value : rememberAttempt(user?.id)
  const chosen = params.get('attempt') ?? remembered, attempt = user && chosen && /^[a-f0-9-]{36}$/i.test(chosen) ? chosen : undefined
  useEffect(() => { let active = true; void loadCatalog().then(catalog => { if (active) setData({ catalog }) }).catch(e => { if (active) setData({ error: e.message }) }); return () => { active = false } }, [retry])
  const referenceParams = new URLSearchParams(params); referenceParams.set('lang', 'english'); if (params.has('day')) referenceParams.set('return_day', params.get('day')!)
  const panel = user && !loading ? <section className={`${surface} no-print mb-5`} aria-label="Account progress scope"><label className="text-sm font-semibold">Save to a preparation attempt<select value={attempt ?? ''} onChange={e => { const next = new URLSearchParams(params); const value = e.target.value || 'browser'; next.set('attempt', value); if (user) { setChoice({ user: user.id, value }); try { localStorage.setItem(attemptChoiceKey(user.id), value) } catch { /* Explicit URL scope remains available. */ } } setParams(next) }} className="mt-2 min-h-12 w-full rounded-xl border border-slate-400 bg-white px-3 font-normal"><option value="">This browser only, for my account</option>{attempt && !attempts.data?.attempts.some(a => a.id === attempt) && <option value={attempt}>Selected preparation attempt</option>}{attempts.data?.attempts.map((a, i) => <option value={a.id} key={a.id}>CSS {a.target_year} · {a.stage.replaceAll('_', ' ')} · attempt {i + 1}</option>)}</select></label><div className="mt-3 flex flex-wrap items-center gap-3"><Link className={action} to="/account/preparation">Manage preparation attempts</Link><p className="text-xs leading-6 text-slate-600">Guest work, each account and each preparation attempt stay separate.</p></div>{attempts.error && <p role="status" className="mt-3 text-sm leading-7 text-amber-950">{attempts.error} Public reading and browser practice remain available.</p>}</section> : null
  return <div className="grammar-v5 text-slate-900">
    <PageHeader title="English Grammar Master Course" description="A 30-day path from sentence foundations to advanced analysis, supported by a permanent grammar reference and continuing practice.">
      <div className="no-print mt-4 flex flex-wrap gap-3"><Link className={action} to={`/language-grammar?${referenceParams}`}>Existing grammar collection</Link><Link className={action} to="/grammar-vocabulary">Vocabulary practice</Link><Link className={action} to="/mistakes">Mistake Notebook</Link><Link className={action} to="/account/expression">English Expression Lab</Link></div>
    </PageHeader>
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      {panel}
      {data?.error ? <div className={surface} role="alert"><p>{data.error}</p><button className={`${action} mt-3`} onClick={() => setRetry(n => n + 1)}>Retry course</button></div> : data?.catalog ? loading && !initialCatalog ? <p role="status">Opening your learning workspace…</p> : <Workspace key={`${user?.id ?? 'guest'}:${attempt ?? 'browser'}`} catalog={data.catalog} user={user?.id} attempt={attempt} /> : <p role="status">Opening the course and reference index…</p>}
    </div>
  </div>
}
function Workspace({ catalog, user, attempt }: { catalog: Catalog; user?: string; attempt?: string }) {
  const [params, setParams] = useSearchParams(), store = useStudyStore(catalog, user, attempt)
  const [depth, setDepth] = useState<Depth>('Foundation'), [notice, setNotice] = useState('')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const refresh = () => setNow(Date.now()), timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  const originalView = params.get('view'), compatibleView = originalView === 'course' ? 'lesson' : originalView === 'toolkit' ? 'reference' : originalView === 'notebook' ? 'lab' : originalView
  const state = store.state, view = compatibleView ?? (params.has('day') ? 'lesson' : 'dashboard'), mode = params.get('mode') ?? (originalView === 'notebook' ? 'errors' : 'revision'), guide = params.get('guide') ?? 'encyclopedia'
  const requested = Number(params.get('day')), rawDay = Number.isInteger(requested) && requested >= 1 && requested <= 30 ? requested : state.cursor.day
  // Existing Expression/Précis links carry the previous syllabus's day numbering.
  const day = (['expression', 'precis'].includes(params.get('from') ?? '') || params.get('from') === 'lab' && ['expression', 'precis'].includes(params.get('origin') ?? '')) && params.get('edition') !== 'v5' ? LEGACY_DAY_MAP[rawDay]?.[0] ?? rawDay : rawDay
  const section = params.get('section') ?? (params.has('day') ? 'orientation' : state.cursor.section)
  const activityPath = `/grammar-course?${params}`
  useEffect(() => {
    try { recordActivity({ type: 'study-tool', label: view === 'lesson' ? `Grammar · Day ${day}: ${catalog.days[day - 1].title}` : `Grammar · ${view}`, path: activityPath }) } catch { /* Public reading remains available when browser storage is disabled. */ }
  }, [activityPath, catalog, day, view])
  const profile = conceptProfile(state, catalog, now), weak = profile.filter(r => r.unresolved), due = Object.values(state.reviews).filter(r => r.dueAt <= now).length
  const firstUnstudied = catalog.days.find(d => !state.completed.includes(d.id)) ?? catalog.days[29]
  const next = weak[0] ? { day: weak[0].day, section: weak[0].id } : { day: firstUnstudied.day, section: 'orientation' }
  const nav = [{ id: 'dashboard', title: 'Course path' }, { id: 'lesson', title: 'Your lesson' }, { id: 'reference', title: 'Reference library' }, { id: 'lab', title: 'Practice and revision' }, { id: 'profile', title: 'Learning profile' }, { id: 'saved', title: 'Bookmarks and notes' }, { id: 'legacy', title: 'Earlier work' }]
  const origin = ['expression', 'precis'].includes(params.get('from') ?? '') ? params.get('from') : ['expression', 'precis'].includes(params.get('origin') ?? '') ? params.get('origin') : undefined
  const back = new URLSearchParams(attempt ? { attempt } : {})
  for (const key of ['writing', 'version']) { const value = params.get(key); if (value && /^[a-f0-9-]{36}$/i.test(value)) back.set(key, value) }
  const returnTo = origin ? `/account/${origin}${back.size ? `?${back}` : ''}` : undefined
  function route(nextView: string, extras: Record<string, string> = {}) { const p = new URLSearchParams(attempt ? { attempt } : {}); p.set('view', nextView); if (origin) { p.set('from', origin); for (const [key, value] of back) if (key !== 'attempt') p.set(key, value) }; for (const [key, value] of Object.entries(extras)) if (value) p.set(key, value); setParams(p) }
  function navigate(d: number, s: string) {
    store.update(old => ({ ...old, cursor: { day: d, section: s, item: old.cursor.day === d && old.cursor.section === s ? old.cursor.item : '' } }))
    route('lesson', { day: String(d), section: s, edition: 'v5' })
    requestAnimationFrame(() => document.getElementById('grammar-workspace')?.focus({ preventScroll: true }))
  }
  const isLabResource = (id: string) => ['analysis', 'transformations', 'editing', 'revision'].includes(id)
  function chooseGuide(id: string) { if (isLabResource(id)) route('lab', { mode: id }); else route('reference', { guide: id }) }
  const syncMessage = store.error ?? (!store.ready ? 'Loading saved work for this preparation attempt…' : store.saving ? 'Saving your preparation attempt…' : attempt ? store.envelope.dirty || store.envelope.pending ? 'Browser copy retained; account saving is pending.' : store.envelope.version ? 'Saved to your account for this preparation attempt.' : 'Ready for account saving when you begin.' : user ? 'Saved in this browser for your account. Select a preparation attempt for cross-device saving.' : 'Guest work is saved in this browser. Export a copy to keep an independent backup.')
  return <div id="grammar-workspace" tabIndex={-1} className="space-y-6 focus:outline-none">
    {returnTo && <Link className={action} to={returnTo}>Return to your {origin === 'precis' ? 'précis' : 'Expression Lab'} work</Link>}
    <section className={`${surface} no-print`} aria-label="Learning workspace tools"><nav aria-label="Grammar workspace" className="flex flex-wrap gap-2">{nav.map(n => <button key={n.id} className={`${action} ${view === n.id ? '!border-indigo-700 !bg-indigo-700 !text-white' : ''}`} aria-current={view === n.id ? 'page' : undefined} onClick={() => n.id === 'lesson' ? navigate(state.cursor.day, state.cursor.section) : route(n.id)}>{n.title}</button>)}</nav><div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-4"><label className="text-sm font-semibold">Reading depth<select value={depth} onChange={e => setDepth(e.target.value as Depth)} className="ml-3 min-h-11 max-w-full rounded-lg border border-slate-400 bg-white px-3 font-normal">{DEPTHS.map(d => <option key={d}>{d}</option>)}</select></label><div className="flex flex-wrap gap-3"><button className={action} onClick={store.download}>Export my work</button><label className={`${action} cursor-pointer`}>Restore a backup<input className="sr-only" type="file" accept="application/json,.json" onChange={e => { const file = e.target.files?.[0]; if (!file) return; void file.text().then(text => { store.restore(text); setNotice('Backup restored in this scope; the previous browser copy was retained.') }).catch(error => setNotice(error.message)); e.target.value = '' }} /></label></div></div><p className="mt-4 text-xs leading-6" role={store.error ? 'alert' : 'status'}>{syncMessage}</p>{notice && <p role="status" className="mt-3 text-sm leading-7 text-indigo-900">{notice}</p>}{attempt && <div className="mt-3 flex flex-wrap gap-3"><button className={action} disabled={!store.ready || store.saving || store.conflict || store.storageError || !store.envelope.dirty && !store.envelope.pending} onClick={() => { void store.flush() }}>{store.error ? 'Retry account save' : 'Save to account now'}</button>{(store.conflict || store.error) && <button className={action} disabled={store.saving || store.storageError} onClick={() => { void store.reloadAccount() }}>Keep browser backup and load account copy</button>}</div>}</section>
    {!store.ready && attempt ? <p role="status">Opening this preparation attempt’s saved work…</p> : <>
      {view === 'dashboard' && <>
        <section className="grid overflow-hidden rounded-3xl bg-slate-950 text-white lg:grid-cols-[minmax(0,1fr)_320px]"><div className="p-6 sm:p-9"><p className="text-xs font-semibold uppercase tracking-[.18em] text-indigo-200">CSS VISTA · Grammar study and reference</p><h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">Understand the structure.<br />Use it in your own writing.</h2><p className="mt-5 max-w-2xl text-sm leading-8 text-slate-300">Thirty days organise the learning path. Study at your own pace, revisit lessons and continue with the advanced reference and practice banks afterward. The four reading layers describe depth, not CEFR certification or a guarantee of expert proficiency in 30 days.</p><div className="mt-6 flex flex-wrap gap-3"><button className={primary} onClick={() => weak[0]?.referenceFile ? route('reference', { concept: weak[0].id }) : navigate(next.day, next.section)}>{weak.length ? 'Review a weak area' : 'Open recommended lesson'}</button><button className={action} onClick={() => route('lab', { mode: 'diagnostic' })}>Initial diagnostic</button></div></div><div className="border-t border-white/15 bg-white/5 p-6 sm:p-9 lg:border-l lg:border-t-0"><h3 className="text-lg font-semibold">Your study record</h3><p className="mt-4 text-4xl font-semibold">{state.completed.length}<span className="text-lg text-slate-300"> / 30 days</span></p><p className="mt-3 text-sm leading-7 text-slate-300">{state.studied.length} sections studied<br />{weak.length} concepts with unresolved errors<br />{due} retrieval items due</p><button className={`${action} mt-5`} onClick={() => navigate(state.cursor.day, state.cursor.section)}>Resume saved section</button><p className="mt-3 text-xs leading-6 text-slate-300">Study completion, correctness, self-review and retention remain separate.</p></div></section>
        <section className="space-y-5" aria-label="Thirty-day learning path">{PHASES.map((p, i) => <div key={p.start} className={surface}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">Phase {i + 1} · Days {p.start}–{p.end}</p><h2 className="mt-2 text-xl font-semibold">{p.title}</h2></div>{i < 4 && <button className={action} onClick={() => route('lab', { mode: `phase-${i + 1}` })}>Cumulative assessment</button>}</div><ol className="mt-5 grid gap-3 md:grid-cols-2">{catalog.days.filter(d => d.day >= p.start && d.day <= p.end).map(d => <li key={d.day}><button className="flex min-h-20 w-full items-start gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-indigo-700" onClick={() => navigate(d.day, 'orientation')}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${state.completed.includes(d.id) ? 'bg-emerald-100 text-emerald-950' : 'bg-indigo-50 text-indigo-950'}`}>{state.completed.includes(d.id) ? '✓' : d.day}</span><span><span className="block text-sm font-semibold leading-7">{d.title}</span><span className="mt-1 block text-xs leading-6 text-slate-600">{d.essentialMinutes} min essential reading · {d.modules.length} sub-lessons{state.completed.includes(d.id) ? ' · Study complete' : ''}</span></span></button></li>)}</ol></div>)}</section>
        <section className={surface}><h2 className="text-xl font-semibold">Permanent learning resources</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{RESOURCES.map(r => <button className="rounded-xl border p-4 text-left hover:border-indigo-700" key={r.id} onClick={() => chooseGuide(r.id)}><span className="block text-sm font-semibold">{r.label}</span><span className="mt-2 block text-xs leading-6 text-slate-600">{r.description}</span></button>)}</div></section>
      </>}
      {view === 'lesson' && <LessonView {...{ day, section, catalog, state, depth, navigate, attempt }} update={store.update} requestedItem={params.get('item') ?? undefined} />}
      {view === 'reference' && <Library {...{ catalog, state, depth, guide, attempt }} conceptId={params.get('concept') ?? undefined} update={store.update} onChoose={id => route('reference', { guide, concept: id })} onGuide={chooseGuide} />}
      {view === 'lab' && <div className="space-y-5"><nav className="no-print flex flex-wrap gap-3" aria-label="Practice modes">{[{ id: 'revision', label: 'Topic practice' }, { id: 'due', label: `Due retrieval (${due})` }, { id: 'errors', label: 'Error notebook' }, { id: 'diagnostic', label: 'Initial diagnostic' }, { id: 'analysis', label: 'Analysis lab' }, { id: 'transformations', label: 'Transformations' }, { id: 'editing', label: 'Editing lab' }].map(m => <button className={action} aria-pressed={mode === m.id} key={m.id} onClick={() => route('lab', { mode: m.id })}>{m.label}</button>)}</nav><Lab key={mode} {...{ catalog, state, mode, attempt }} requestedItem={params.get('item') ?? undefined} update={store.update} /></div>}
      {view === 'profile' && <Reports {...{ catalog, state, attempt }} />}
      {view === 'saved' && <section className="space-y-4" aria-label="Bookmarked rules and notes"><div className={surface}><h2 className="text-2xl font-semibold">Bookmarked rules and personal notes</h2><p className="mt-3 text-sm leading-7">Open a rule to resume its full teaching and edit your note. Exports include notes, drafts and the learning evidence in this scope.</p></div>{catalog.concepts.filter(c => state.bookmarks.includes(c.id) || state.notes[c.id]).map(c => <article key={c.id} className={surface}><h3 className="text-lg font-semibold">{c.title}</h3>{state.notes[c.id] && <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{state.notes[c.id]}</p>}<div className="mt-4 flex flex-wrap gap-3"><Link className={action} to={conceptHref(c, attempt)}>Open rule and note</Link><button className={action} aria-pressed={state.bookmarks.includes(c.id)} onClick={() => store.update(s => ({ ...s, bookmarks: s.bookmarks.includes(c.id) ? s.bookmarks.filter(id => id !== c.id) : [...s.bookmarks, c.id] }))}>{state.bookmarks.includes(c.id) ? 'Remove bookmark' : 'Bookmark'}</button></div></article>)}{catalog.days.filter(d => state.notes[d.id]).map(d => <article className={surface} key={d.id}><h3 className="text-lg font-semibold">Day {d.day} reflection</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{state.notes[d.id]}</p><Link className={`${action} mt-4`} to={dayHref(d.day, 'finish', attempt)}>Open reflection</Link></article>)}{!state.bookmarks.length && !Object.keys(state.notes).length && <p className={surface}>No bookmarks or notes yet. Add either while reading a sub-lesson.</p>}</section>}
      {view === 'legacy' && <Suspense fallback={<p role="status">Opening earlier work…</p>}><LegacyWork user={user} attempt={attempt} /></Suspense>}
      {!nav.some(n => n.id === view) && <div className={surface}><p>This view is unavailable.</p><button className={`${action} mt-3`} onClick={() => route('dashboard')}>Open the course path</button></div>}
    </>}
  </div>
}
