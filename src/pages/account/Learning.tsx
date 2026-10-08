import { Link, useSearchParams } from 'react-router'
import { useAccount } from '@/lib/accountContext'
import { AccountPage } from './shared'
import { pakistanTime } from '@/features/membership/api'
import { buttonStyle, secondaryStyle, useLearning, type Overview, type Attempt, type Writing, type WritingVersion } from '@/features/learning/api'
import AttemptForm from '@/features/learning/AttemptForm'
import WritingForm from '@/features/learning/WritingForm'
function LoadState({ error, retry }: { error?: string; retry: () => void }) {
  return <div role={error ? 'alert' : 'status'} className="rounded-xl border p-5">{error || 'Loading your preparation records…'}{error && <button onClick={retry} className={`${secondaryStyle} mt-3`}>Try again</button>}</div>
}
function WritingDetail({ id, versionId, overview, onVersion, onSaved }: { id: string; versionId: string | null; overview: Overview; onVersion: (id: string) => void; onSaved: (id: string) => void }) {
  const record = useLearning<{ writing: Writing }>(`learning.php?writing_id=${encodeURIComponent(id)}`)
  const chosen = versionId || record.data?.writing.versions[0]?.id
  const version = useLearning<{ writing_version: WritingVersion }>(chosen ? `learning.php?version_id=${encodeURIComponent(chosen)}` : undefined)
  if (!record.data) return <LoadState error={record.error} retry={record.refresh} />
  if (!version.data) return <LoadState error={version.error} retry={version.refresh} />
  if (version.data.writing_version.writing_id !== id) return <p role="alert">This version belongs to a different writing record. Open a version from the history below.</p>
  const writing = record.data.writing, text = version.data.writing_version
  return <div className="space-y-6">
    <section className="rounded-xl border p-5 sm:p-6"><h2 className="break-words text-xl font-semibold">{writing.title}</h2><p className="mt-2 text-sm text-slate-500">{writing.kind} · version {text.version} · {text.word_count} words · saved {pakistanTime(text.created_at)}</p><p className="mt-5 whitespace-pre-wrap break-words text-base leading-8">{text.text}</p>
      <label className="mt-6 grid gap-2 text-sm font-semibold">Saved version<select value={text.id} onChange={e => onVersion(e.target.value)} className="min-h-11 w-full rounded-lg border px-3">{writing.versions.map(v => <option key={v.id} value={v.id}>Version {v.version} · {pakistanTime(v.created_at)}</option>)}</select></label>
    </section>
    <WritingForm key={`${id}:${text.id}`} attempts={overview.attempts} writing={writing} version={text} onSaved={newId => { record.refresh(); onSaved(newId) }} />
  </div>
}
function LearningWorkspace() {
  const [params, setParams] = useSearchParams()
  const offset = Math.max(0, Number(params.get('offset')) || 0)
  const overview = useLearning<Overview>(`learning.php?offset=${offset}`)
  const attemptId = params.get('attempt'), writingId = params.get('writing'), mode = params.get('new')
  const attempt = useLearning<{ attempt: Attempt }>(attemptId ? `learning.php?attempt_id=${encodeURIComponent(attemptId)}` : undefined)
  function savedAttempt(id: string) { setParams({ attempt: id }); overview.refresh(); attempt.refresh() }
  function savedWriting(id: string) { setParams({ writing: id }); overview.refresh() }
  if (!overview.data) return <LoadState error={overview.error} retry={overview.refresh} />
  const data = overview.data
  return <div className="space-y-6">
    {(attemptId || writingId || mode) && <button onClick={() => setParams({})} className={secondaryStyle}>All preparation records</button>}
    {writingId ? <WritingDetail key={writingId} id={writingId} versionId={params.get('version')} overview={data} onVersion={id => setParams({ writing: writingId, version: id })} onSaved={savedWriting} />
      : mode === 'writing' ? <WritingForm attempts={data.attempts} onSaved={savedWriting} />
      : mode === 'attempt' ? <AttemptForm catalog={data.catalog} onSaved={savedAttempt} />
      : attemptId ? !attempt.data ? <LoadState error={attempt.error} retry={attempt.refresh} /> : <AttemptForm key={`${attemptId}:${attempt.data.attempt.version}`} attempt={attempt.data.attempt} catalog={data.catalog} onSaved={savedAttempt} />
      : <>
        <section><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">My CSS Attempts</h2><button onClick={() => setParams({ new: 'attempt' })} className={buttonStyle}>New preparation attempt</button></div><p className="mt-3 text-sm leading-7 text-slate-600">Your target, study time and saved writing stay linked to the same account. Existing planner and syllabus records remain available in their current tools.</p>{data.attempts.length === 0 ? <p className="mt-4 rounded-xl border border-dashed p-5 text-sm text-slate-500">No preparation attempt saved yet.</p> : <ul className="mt-4 divide-y rounded-xl border">{data.attempts.map(a => <li key={a.id}><button onClick={() => setParams({ attempt: a.id })} className="flex min-h-16 w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"><span><span className="block font-semibold">My CSS Attempt — CSS {a.target_year}</span><span className="mt-1 block text-sm text-slate-500">{a.daily_minutes} minutes/day · {a.target_date ? `Your target: ${a.target_date}` : 'Target date not set'}</span></span><span className="text-sm font-semibold text-pine">Settings</span></button></li>)}</ul>}</section>
        <section><Link to="/grammar-course?view=lab" className={`${secondaryStyle} mb-4 mr-3`}>Grammar Error Lab</Link><Link to="/account/expression" className={`${secondaryStyle} mb-4 mr-3`}>English Expression Lab</Link><Link to="/account/handwriting" className={`${secondaryStyle} mb-4`}>Handwritten paragraph</Link><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Writing history</h2><button disabled={data.attempts.length === 0} onClick={() => setParams({ new: 'writing' })} className={secondaryStyle}>Save writing</button></div><p className="mt-3 text-sm leading-7 text-slate-600">Saved versions remain readable after subscription expiry. Open the Expression Lab for sentence and typed-paragraph feedback when available.</p>{data.writing.length === 0 ? <p className="mt-4 rounded-xl border border-dashed p-5 text-sm text-slate-500">No saved writing. Create a preparation attempt first, then save a sentence, paragraph or précis.</p> : <ul className="mt-4 divide-y rounded-xl border">{data.writing.map(w => <li key={w.id}><button onClick={() => setParams({ writing: w.id })} className="min-h-16 w-full space-y-1 p-4 text-left hover:bg-slate-50"><span className="block break-words font-semibold">{w.title}</span><span className="block text-sm text-slate-500">{w.kind} · {w.version} saved version{w.version === 1 ? '' : 's'} · {pakistanTime(w.updated_at)}</span></button></li>)}</ul>}</section>
        <nav aria-label="Preparation history pages" className="flex flex-wrap gap-3"><button disabled={offset === 0} onClick={() => setParams({ offset: String(Math.max(0, offset - 50)) })} className={secondaryStyle}>Previous page</button><button disabled={!data.has_more_attempts && !data.has_more_writing} onClick={() => setParams({ offset: String(offset + 50) })} className={secondaryStyle}>Next page</button><button onClick={overview.refresh} className={secondaryStyle}>Refresh records</button></nav>
      </>}
  </div>
}
export default function LearningPage() {
  const { user } = useAccount()
  return <AccountPage title="My Preparation" intro="Preparation attempts and writing saved to your account."><LearningWorkspace key={user?.id} /></AccountPage>
}
