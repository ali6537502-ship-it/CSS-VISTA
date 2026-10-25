import { useState } from 'react'
import { Link } from 'react-router'
import { Search, Pin, PinOff } from 'lucide-react'
import { useProReleasePaused } from '@/features/membership/proReleaseContext'
import { features, searchFeatures, featureState, type Feature } from './registry'
import { useWorkspacePreferences } from './preferences'
export function FeatureCard({ feature, pin = false }: { feature: Feature; pin?: boolean }) {
  const paused = useProReleasePaused()
  const { preferences, update, error } = useWorkspacePreferences()
  const state = featureState(feature, paused), pinned = preferences.pins.includes(feature.id)
  return <article className="ws-panel ws-feature"><span className="ws-badge">{state === 'paused' ? 'Temporarily unavailable' : state === 'pro' ? 'Pro · membership required' : 'Free'}</span><h3>{feature.title}</h3><p>{feature.description}</p><div className="mt-auto flex flex-wrap items-center gap-3">{state !== 'paused' && <Link className="min-h-11 inline-flex items-center font-semibold text-sm underline" to={feature.to}>Open {feature.title}</Link>}{pin && state !== 'paused' && <button className="min-h-11 px-2" aria-label={`${pinned ? 'Unpin' : 'Pin'} ${feature.title}`} aria-pressed={pinned} onClick={() => update({pins:pinned ? preferences.pins.filter(id => id !== feature.id) : [...preferences.pins,feature.id]})}>{pinned ? <PinOff size={18} /> : <Pin size={18} />}</button>}</div>{error && <p role="alert">{error}</p>}</article>
}
export default function FeatureFinder({ practice = false }: { practice?: boolean }) {
  const [query,setQuery] = useState('')
  const results = searchFeatures(query).filter(f => !practice || f.category === 'Practice' || f.category === 'Preparation')
  return <section aria-label={practice ? 'Practice tools' : 'Feature finder'}><label className="block font-semibold" htmlFor="feature-search"><Search size={18} className="inline mr-2" />Find {practice ? 'practice tools' : 'a feature or resource'}</label><div className="flex gap-2 my-4"><input id="feature-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search titles, topics or tools" className="min-h-11 border rounded-lg px-3 w-full min-w-0 bg-white" /><button onClick={() => setQuery('')} className="min-h-11 px-3 border rounded-lg bg-white">Clear</button></div><p role="status" className="ws-muted mb-4">{results.length} destinations</p><div className="ws-card-grid">{results.map(f => <FeatureCard key={f.id} feature={f} pin />)}</div>{!results.length && <p className="ws-panel">No matches. Try a subject name or a shorter search.</p>}</section>
}
export function QuickActions() {
  const { preferences } = useWorkspacePreferences()
  const paused = useProReleasePaused()
  return <section className="ws-panel"><div className="ws-section-head"><h2>Quick actions</h2><Link to="/account/directory">Customize</Link></div><div className="grid gap-1">{preferences.pins.map(id => features.find(f => f.id === id)).filter((f): f is Feature => !!f && featureState(f,paused) !== 'paused').map(f => <Link key={f.id} to={f.to} className="min-h-11 py-3 border-b text-sm font-semibold">{f.title} <span className="ws-badge ml-1">{featureState(f,paused) === 'pro' ? 'Pro' : 'Free'}</span></Link>)}</div><p className="ws-muted mt-4 text-xs">Shortcuts are saved on this device for your account.</p></section>
}
