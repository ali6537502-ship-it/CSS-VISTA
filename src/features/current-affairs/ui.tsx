import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, Bookmark, Check, Copy, RotateCcw } from 'lucide-react'
import { setReading, setSaved } from './api'
import { briefingRoot, displayDate, displayUpdated, factText, pakistanDate, type Fact, type Source, type StoryCard, type Summary } from './model'

export function Loading() {
  return <div className="ca-loading" role="status" aria-label="Loading your briefing">
    <span className="sr-only">Loading your briefing…</span>
    {[0, 1, 2].map((n) => <div key={n} className="ca-skeleton"><i /><i /><i /></div>)}
  </div>
}
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="ca-empty"><h2>{title}</h2>{children && <p>{children}</p>}{action}</div>
}
export function LoadError({ error, retry }: { error: string; retry: () => void }) {
  return <div className="ca-error" role="alert"><h2>We couldn’t load this briefing</h2><p>{error}</p><button className="ca-button" onClick={retry}><RotateCcw size={16} /> Try again</button></div>
}
export function Publication({ summary }: { summary: Summary }) {
  if (summary.published) return null
  return <Empty title={summary.date === pakistanDate() ? "Today's briefing is being prepared" : 'No briefing was published for this date'}
    action={summary.latest_date && <Link className="ca-button" to={briefingRoot + '?range=custom&from=' + summary.latest_date + '&to=' + summary.latest_date}>Open the latest briefing <ArrowUpRight size={16} /></Link>}>
    Please check again shortly, or explore the archive.
  </Empty>
}
export function EditionMeta({ summary }: { summary: Summary }) {
  return <div className="ca-edition-meta">
    <span>{displayDate(summary.date)}</span>
    {summary.updated_at && <span>Last updated: {displayUpdated(summary.updated_at)}</span>}
    {summary.published && <span>{summary.total} developments · {summary.unread} unfinished</span>}
  </div>
}
export function CategoryGlance({ summary, selected, select }: { summary: Summary; selected?: string; select: (category: string) => void }) {
  if (!summary.categories.length) return null
  return <section className="ca-glance" aria-label="Today at a glance"><h2>At a Glance</h2>
    <div className="ca-chips">
      <button aria-pressed={!selected} onClick={() => select('')}>All <b>{summary.total}</b></button>
      {summary.categories.map((c) => <button key={c.category} aria-pressed={selected === c.category} onClick={() => select(c.category)}>{c.category} <b>{c.count}</b></button>)}
    </div>
  </section>
}
export function StoryActions({ item, onChange, onStateChange }: { item: StoryCard; onChange?: () => void; onStateChange?: (state: Pick<StoryCard, 'saved' | 'reading_status'>) => void }) {
  const [localState, setState] = useState({ saved: item.saved, reading_status: item.reading_status })
  const state = onStateChange ? item : localState
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function change(kind: 'save' | 'read') {
    setBusy(true); setMessage('')
    try {
      const result = kind === 'save' ? await setSaved(item.id, !state.saved) : await setReading(item.id, state.reading_status === 'read' ? 'unread' : 'read')
      setState(result)
      onStateChange?.(result)
      setMessage(kind === 'save' ? (result.saved ? 'Saved to your account.' : 'Removed from saved items.') : (result.reading_status === 'read' ? 'Marked as read.' : 'Marked as unread.'))
      onChange?.()
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Your change could not be saved. Please try again.') }
    finally { setBusy(false) }
  }
  return <div className="ca-actions-wrap"><div className="ca-actions">
    <button className="ca-icon-button" disabled={busy} aria-pressed={state.saved} aria-label={(state.saved ? 'Unsave ' : 'Save ') + item.headline} onClick={() => void change('save')}>
      <Bookmark size={17} fill={state.saved ? 'currentColor' : 'none'} />{state.saved ? 'Saved' : 'Save'}
    </button>
    <button className="ca-icon-button" disabled={busy} aria-pressed={state.reading_status === 'read'} onClick={() => void change('read')}>
      <Check size={17} />{state.reading_status === 'read' ? 'Read' : 'Mark as read'}
    </button>
  </div><span className="ca-feedback" role="status">{message}</span></div>
}
export function StoryCardView({ item: initial, onChange }: { item: StoryCard; onChange?: () => void }) {
  const [item, setItem] = useState(initial)
  return <article className={'ca-story-card ' + (item.reading_status === 'read' ? 'ca-read' : '')}>
    <div className="ca-card-meta"><span className="ca-category">{item.category}</span>{item.importance && <span>{item.importance}</span>}
      <span className="ca-status">{item.reading_status === 'unread' ? 'New' : item.reading_status === 'opened' ? 'In progress' : 'Read'}</span>
    </div>
    <h2><Link to={briefingRoot + '/' + item.id}>{item.headline}</Link></h2>
    <p className="ca-card-summary">{item.summary}</p>
    <div className="ca-card-footer"><span>{displayDate(item.publication_date)} · {item.reading_minutes} min read</span>
      <Link className="ca-text-link" to={briefingRoot + '/' + item.id}>Open analysis <ArrowUpRight size={16} /></Link></div>
    <StoryActions item={item} onChange={onChange} onStateChange={(state) => setItem((old) => ({ ...old, ...state }))} />
  </article>
}
export function Sources({ sources }: { sources: Source[] }) {
  if (!sources.length) return null
  return <section className="ca-section" id="sources"><h2>Sources</h2><ol className="ca-sources">
    {sources.map((source, n) => <li key={source.url + n}>
      <div><strong>{source.publisher}</strong>{source.source_type && <span className="ca-source-label">{source.source_type}</span>}</div>
      <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <ArrowUpRight size={15} /></a>
      {source.published_at && <span>{source.published_at}</span>}
    </li>)}
  </ol></section>
}
export function CopyButton({ value }: { value: string }) {
  const [message, setMessage] = useState('')
  async function copy() {
    try { await navigator.clipboard.writeText(value); setMessage('Copied') }
    catch { setMessage('Select the text to copy it.') }
  }
  return <span className="ca-copy"><button aria-label="Copy this fact" onClick={() => void copy()}><Copy size={15} /></button><small role="status">{message}</small></span>
}
export function FactCard({ fact }: { fact: Fact }) {
  return <div className="ca-fact"><div>
    {typeof fact === 'string' ? <p>{fact}</p> : <><span>{fact.label}</span><p><strong>{fact.value}</strong></p>{(fact.source || fact.year) && <small>{[fact.source, fact.year].filter(Boolean).join(' · ')}</small>}</>}
  </div><CopyButton value={factText(fact)} /></div>
}
export function Pager({ page, more, change }: { page: number; more: boolean; change: (page: number) => void }) {
  if (page === 1 && !more) return null
  return <nav className="ca-pager" aria-label="Results pages"><button className="ca-button ca-button-light" disabled={page <= 1} onClick={() => change(page - 1)}>Previous</button><span>Page {page}</span><button className="ca-button ca-button-light" disabled={!more} onClick={() => change(page + 1)}>Next</button></nav>
}
