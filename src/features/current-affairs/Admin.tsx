import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { LoaderCircle } from 'lucide-react'
import './current-affairs.css'

type Day = { publication_date: string; story_count: number; is_published: number; ingested_at: string }
type Run = { publication_date: string | null; status: string; story_count: number; error_code: string | null; created_at: string }
type Token = { id: string; label: string; expires_at: string; last_used_at: string | null; revoked_at: string | null }
type Health = { today: string; days: Day[]; runs: Run[]; tokens: Token[] }
async function adminRequest<T>(query = '', body?: unknown): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })
  if (body) {
    headers.set('Content-Type', 'application/json')
    const csrf = document.cookie.match(/(?:^|;\s*)cssv_owner_csrf=([^;]+)/)?.[1]
    if (csrf) headers.set('X-CSRF-Token', decodeURIComponent(csrf))
  }
  const response = await fetch('/api/admin/current-affairs.php' + query, {
    headers, credentials: 'same-origin', cache: 'no-store',
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'The publishing service could not be reached.')
  return data as T
}
export default function CurrentAffairsAdmin() {
  const [health, setHealth] = useState<Health | null>(null)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dataset, setDataset] = useState('')
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState('')
  const [newToken, setNewToken] = useState('')
  useEffect(() => {
    let active = true
    void adminRequest<Health>().then((data) => { if (active) { setHealth(data); setError('') } }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Publication status could not be loaded.') })
    return () => { active = false }
  }, [revision])
  async function action(body: unknown, success: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await adminRequest<{ token?: string; status?: string }>('', body)
      if (result.token) setNewToken(result.token)
      setNotice(result.status === 'unchanged' ? 'This exact edition is already published. No duplicates were created.' : success)
      setRevision((n) => n + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'The publishing action failed. Please try again.') }
    finally { setBusy(false) }
  }
  async function view(date: string) {
    setBusy(true); setError('')
    try { const data = await adminRequest<{ dataset: unknown }>('?date=' + date); setDataset(JSON.stringify(data.dataset, null, 2)); setNotice('Edition loaded in the editor below.') }
    catch (e) { setError(e instanceof Error ? e.message : 'The edition could not be loaded.') }
    finally { setBusy(false) }
  }
  function publish() {
    try {
      const parsed: unknown = JSON.parse(dataset)
      void action({ action: 'publish', dataset: parsed }, 'The edition was published. Every account can now access it.')
    } catch { setError('The editor must contain valid JSON before publishing.') }
  }
  return <div className="ca-admin">
    <p className="ca-eyebrow">EXISTING PRIVATE ADMIN · CURRENT AFFAIRS</p><h1>Daily briefing publications</h1>
    <p>Add a dated JSON file under <code>content/current-affairs/YYYY/MM/</code> and push it through the existing production workflow. The deployed edition is imported for every student automatically when the briefing service is opened.</p>
    <div className="ca-admin-actions"><button className="ca-button ca-button-light" onClick={() => setRevision((n) => n + 1)}>Refresh publication status</button><Link className="ca-text-link" to="/account/dashboard">Open student dashboard</Link></div>
    {error && <div className="ca-error" role="alert">{error} <Link to="/admin/login">Admin sign in</Link></div>}
    <p role="status">{notice}</p>
    {!health && !error && <p><LoaderCircle className="inline animate-spin" size={16} /> Loading publication status…</p>}
    {health && <>
      <section><h2>Edition status</h2><p>{health.days.some((d) => d.publication_date === health.today && Number(d.is_published) === 1) ? "Today's edition is published or scheduled for its publication time." : "Today's briefing has not been published yet."}</p>
        {!health.days.length && <p>No editions have been ingested. Push the first verified daily dataset to begin.</p>}
        {health.days.map((day) => <div className="ca-admin-row" key={day.publication_date}><div><strong>{day.publication_date}</strong><small>{day.story_count} stories · {Number(day.is_published) === 1 ? 'Published / scheduled' : 'Unpublished'} · Imported {day.ingested_at} UTC</small></div>
          <div className="ca-admin-actions"><button className="ca-button ca-button-light" disabled={busy} onClick={() => void view(day.publication_date)}>View dataset</button>{Number(day.is_published) === 1 && <button className="ca-button ca-button-light" disabled={busy} onClick={() => { if (window.confirm('Unpublish the ' + day.publication_date + ' briefing for all students? Saved and reading states will be preserved.')) void action({ action: 'unpublish', date: day.publication_date }, 'The edition is now unpublished.') }}>Unpublish</button>}</div>
        </div>)}
      </section>
      <section><h2>Publication health</h2>{!health.runs.length && <p>No publication attempts yet.</p>}{health.runs.map((run, i) => <div className="ca-admin-row" key={run.created_at + i}><strong>{run.publication_date || 'Validation'} · {run.status}</strong><small>{run.created_at} UTC · {run.story_count} stories{run.error_code ? ' · ' + run.error_code : ''}</small></div>)}</section>
    </>}
    <section><h2>Review or publish an edition</h2><p>For routine publishing, push the JSON file. This editor supports an urgent correction or a dataset uploaded by a trusted publishing process. Source validation still applies.</p>
      <label htmlFor="ca-edition-json">Edition JSON</label><textarea id="ca-edition-json" spellCheck={false} value={dataset} onChange={(e) => setDataset(e.target.value)} />
      <button className="ca-button" disabled={busy || !dataset.trim()} onClick={publish}>{busy ? 'Working…' : 'Validate & publish for all students'}</button>
    </section>
    <details><summary className="ca-text-link">Optional direct publishing API</summary><section><h2>Publishing tokens</h2><p>Repository pushes do not need a token. Create one only for a trusted process that publishes directly to the API. Tokens expire after one year and can be revoked here.</p>
      <label>Process name <input value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} /></label><div className="ca-admin-actions"><button className="ca-button" disabled={busy || !label.trim()} onClick={() => { setNewToken(''); void action({ action: 'create_token', label: label.trim() }, 'Token created. Save it in your publishing process secret store; it will only be shown once.') }}>Create publishing token</button></div>
      {newToken && <><code className="ca-admin-token">{newToken}</code><button className="ca-button ca-button-light" onClick={() => setNewToken('')}>I have saved it · Hide token</button></>}
      {health?.tokens.map((token) => <div className="ca-admin-row" key={token.id}><div><strong>{token.label}</strong><small>Expires {token.expires_at} UTC · {token.revoked_at ? 'Revoked' : 'Active'} · Last used: {token.last_used_at || 'Never'}</small></div>{!token.revoked_at && <button className="ca-button ca-button-light" disabled={busy} onClick={() => { if (window.confirm('Revoke this publishing token?')) void action({ action: 'revoke_token', id: token.id }, 'The publishing token was revoked.') }}>Revoke</button>}</div>)}
    </section></details>
  </div>
}
