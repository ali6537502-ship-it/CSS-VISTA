import { Link, useSearchParams } from 'react-router'
import { BookOpen, FilePenLine, FolderOpen, RefreshCw } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { useLearning } from '@/features/learning/api'
import { panelStyle, inputStyle, primaryStyle, secondaryStyle } from '@/features/handwriting/styles'
import { pakistanTime } from '@/features/membership/api'
import { AccountPage } from './shared'
import Handbook from '@/features/precis/Handbook'
import Composer from '@/features/precis/Composer'
import History from '@/features/precis/History'
import Practice from '@/features/precis/Practice'
import { precisHref, precisView } from '@/features/precis/bookModel'
import type { Detail, Overview, Progress } from '@/features/precis/api'
import '@/features/precis/book.css'

function PrecisWorkspace() {
  const [params, setParams] = useSearchParams()
  const view = precisView(params)
  const writing = params.get('writing'), version = params.get('version')
  const rawOffset = Number(params.get('offset') || 0)
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0
  const overview = useLearning<Overview>(`precis.php?offset=${offset}`)
  const detail = useLearning<Detail>(writing ? `precis.php?writing_id=${encodeURIComponent(writing)}${version ? `&version_id=${encodeURIComponent(version)}` : ''}` : undefined)
  const attempt = detail.data?.writing.attempt_id || params.get('attempt') || ''
  const progress = useLearning<Progress>(attempt ? `precis.php?attempt_id=${encodeURIComponent(attempt)}` : undefined)
  const data = overview.data
  function navigate(mode: 'book' | 'write' | 'history', fields: Record<string, string> = {}) {
    setParams(new URLSearchParams(precisHref(params, mode, fields).split('?')[1]))
  }
  function saved(id: string, selectedVersion: string) {
    navigate('history', { writing: id, version: selectedVersion, attempt })
    overview.refresh(); detail.refresh()
  }
  if (!data) return <div className={panelStyle} role={overview.error ? 'alert' : 'status'}><p>{overview.error || 'Opening your Précis handbook…'}</p>{overview.error && <button className={secondaryStyle} type="button" onClick={overview.refresh}><RefreshCw size={16} aria-hidden="true"/>Retry handbook</button>}</div>
  const selected = detail.data
  const source = selected?.source || data.catalog?.passages.find(passage => passage.id === params.get('passage')) || data.catalog?.passages[0]
  const outdated = !!selected && selected.version.version !== selected.writing.version
  return <div className="pb-root">
    <header className="pb-intro"><div><p className="pb-kicker">MASTER PRÉCIS WRITING STEP-BY-STEP HANDBOOK</p><h2>Your book. Your writing. One workspace.</h2><p>Read a chapter, examine its examples, practise in your own words and return to your saved revisions.</p></div><span className="pb-free">Free · No external AI</span></header>
    <p className="pb-source-note">Source review in progress: some worked-example commentary and exercise answers are missing from the stored edition. The complete text must be checked against the original book. Available chapters, examples and your saved work remain accessible.</p>
    <nav className="pb-tabs" aria-label="Précis workspace"><Link aria-current={view === 'book' ? 'page' : undefined} to={precisHref(params, 'book', { attempt })}><BookOpen size={17} aria-hidden="true"/>Read the handbook</Link><Link aria-current={view === 'write' ? 'page' : undefined} to={precisHref(params, 'write', { attempt })}><FilePenLine size={17} aria-hidden="true"/>Write and revise</Link><Link aria-current={view === 'history' ? 'page' : undefined} to={precisHref(params, 'history', { attempt })}><FolderOpen size={17} aria-hidden="true"/>My drafts and revisions</Link></nav>
    <section className="pb-save-context" aria-label="Preparation attempt for saving">
      <label htmlFor="precis-attempt">Save my work under</label><select id="precis-attempt" value={attempt} disabled={!!writing} onChange={event => navigate(view, { attempt: event.target.value, passage: params.get('passage') || '' })} className={inputStyle}><option value="">Choose a preparation attempt</option>{data.attempts.map(item => <option key={item.id} value={item.id}>CSS {item.target_year} attempt</option>)}</select>
      <p>{writing ? 'This saved record keeps its original preparation attempt.' : 'Reading needs no schedule or attempt. Select an attempt before saving a draft or chapter position.'} <Link to="/account/preparation?new=attempt">Create an attempt</Link></p>
      {data.has_more_attempts && <p>The most recent 1,000 attempts are listed.</p>}
      {progress.error && <p role="alert">{progress.error} <button type="button" className="underline" onClick={progress.refresh}>Retry saved position</button></p>}
    </section>
    {view === 'book' && <Handbook key={attempt} data={data} attempt={attempt} progress={progress.data} refresh={progress.refresh}/>}
    {(view === 'history' || view === 'write') && writing && !selected && <div className={panelStyle} role={detail.error ? 'alert' : 'status'}><p>{detail.error || 'Opening your saved Précis…'}</p>{detail.error && <button type="button" className={secondaryStyle} onClick={detail.refresh}>Retry saved writing</button>}<Link className={`${secondaryStyle} mt-3`} to={precisHref(params, 'history')}>All my drafts</Link></div>}
    {view === 'history' && !writing && <section className={`${panelStyle} space-y-5`}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">My drafts and revisions</h2><Link className={primaryStyle} to={precisHref(params, 'write')}>Start a new draft</Link></div><p className="text-sm leading-7 text-slate-600">Your original passages, saved versions and revision history remain together. Open a draft to continue the same record.</p>{data.writing.length ? <ul className="space-y-3">{data.writing.map(item => <li key={item.id}><Link className="pb-draft-row" to={precisHref(params, 'history', { writing: item.id, attempt: item.attempt_id })}><strong>{item.title || 'Untitled Précis'}</strong><span>{item.version} saved version{item.version === 1 ? '' : 's'} · {pakistanTime(item.updated_at)}</span><span>Open draft and revisions →</span></Link></li>)}</ul> : <p>No saved Précis on this page yet. Start a draft and save it to your account.</p>}<div className="flex flex-wrap gap-3"><button className={secondaryStyle} type="button" disabled={offset === 0} onClick={() => navigate('history', { offset: String(Math.max(0, offset - 50)) })}>Previous page</button><button className={secondaryStyle} type="button" disabled={!data.has_more} onClick={() => navigate('history', { offset: String(offset + 50) })}>Next page</button><button className={secondaryStyle} type="button" onClick={overview.refresh}>Refresh drafts</button></div></section>}
    {view === 'history' && selected && <div className="space-y-5"><div className="flex flex-wrap gap-3"><Link className={secondaryStyle} to={precisHref(params, 'history')}>All my drafts</Link><Link className={primaryStyle} to={precisHref(params, 'write', { writing: selected.writing.id, attempt: selected.writing.attempt_id })}>Revise latest version</Link></div><History key={selected.version.id} detail={selected} rubric={data.rubric} skills={data.skills} active={true} feedbackAvailable={data.evaluation_enabled} refresh={detail.refresh} onVersion={id => navigate('history', { writing: selected.writing.id, version: id, attempt: selected.writing.attempt_id })}/></div>}
    {view === 'write' && (!writing || selected) && <div className="space-y-5">
      <section className={panelStyle}><h2 className="text-xl font-semibold">{selected ? 'Revise your saved Précis' : 'Write a Précis'}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{selected ? 'Saving creates a new version of this same writing record. Earlier versions stay readable.' : 'Choose one of the retained handbook passages. Your writing is saved to your own account; the local checker offers limited review prompts, not a mark.'}</p>{!writing && <label className="mt-4 grid gap-2 text-sm font-semibold">Practice passage<select className={inputStyle} value={source?.id || ''} onChange={event => navigate('write', { passage: event.target.value })}>{data.catalog?.passages.map(passage => <option key={passage.id} value={passage.id || ''}>{passage.label}</option>)}</select></label>}</section>
      {!attempt ? <p className={panelStyle}>Choose a preparation attempt above before drafting, so your writing has a clear save location. You can read chapters and worked examples without one.</p> : outdated && selected ? <div className={panelStyle}><p>You are viewing an earlier version. Open the latest saved version before adding a revision.</p><Link className={`${primaryStyle} mt-4`} to={precisHref(params, 'write', { writing: selected.writing.id, attempt: selected.writing.attempt_id })}>Open latest version to revise</Link></div> : source && <Composer key={`${attempt}:${source.id || 'custom'}:${selected?.version.id || 'new'}`} data={data} attempt={attempt} source={source} detail={selected} timed={params.get('view') === 'timed'} onSaved={saved}/>}
      <details className={panelStyle}><summary className="min-h-11 cursor-pointer font-semibold">Supplementary skill checks</summary><p className="my-3 text-sm leading-7 text-slate-600">These authored recognition questions supplement the handbook. They are not its missing answer key and do not assess your written précis.</p><Practice data={data} attempt={attempt} progress={progress.data} refresh={progress.refresh} review={false}/></details>
    </div>}
  </div>
}
export default function PrecisPage() {
  const { user } = useAccount()
  return <AccountPage title="CSS Vista Preci Mentor" intro="The handbook, worked examples and your saved writing in one place."><PrecisWorkspace key={user?.id}/></AccountPage>
}
