import { useState } from 'react'
import { Link } from 'react-router'
import { Search, Pin, PinOff, Newspaper, Languages, Sparkles, BookOpen, ArrowUpRight, FolderOpen, ClipboardCheck, Timer, PenLine } from 'lucide-react'
import { useProReleasePaused } from '@/features/membership/proReleaseContext'
import { features, discoverFeatures, featureState, type Feature } from './registry'
import { useWorkspacePreferences } from './preferences'

function featureIcon(feature: Feature) {
  const value = `${feature.id} ${feature.title}`
  if (/timer/i.test(value)) return Timer
  if (/mcq|quiz|mock|test/i.test(value)) return ClipboardCheck
  if (/writing|essay|precis|expression|argument/i.test(value)) return PenLine
  if (/english|grammar/i.test(value)) return Languages
  if (/vista/i.test(value)) return Sparkles
  if (/affairs|briefing|pdf/i.test(value)) return Newspaper
  return BookOpen
}

const featureIcons = Object.fromEntries(features.map(feature => [feature.id,featureIcon(feature)]))

export function FeatureCard({ feature, pin = false }: { feature: Feature; pin?: boolean }) {
  const paused = useProReleasePaused()
  const { preferences, update, error } = useWorkspacePreferences()
  const Icon = featureIcons[feature.id] ?? BookOpen
  const state = featureState(feature, paused), pinned = preferences.pins.includes(feature.id)
  if (state === 'paused') return null
  return <article className="ws-panel ws-feature"><div className="ws-feature-symbol" aria-hidden="true"><Icon size={25}/></div><span className="ws-badge">{state === 'pro' ? 'Pro · membership required' : 'Free'}</span><h3>{feature.title}</h3><p>{feature.description}</p><div className="mt-auto flex flex-wrap items-center gap-3"><Link className="min-h-11 inline-flex items-center font-semibold text-sm underline" to={feature.to}>Open {feature.title}</Link>{pin && <button className="min-h-11 px-2" aria-label={`${pinned ? 'Unpin' : 'Pin'} ${feature.title}`} aria-pressed={pinned} onClick={() => update({pins:pinned ? preferences.pins.filter(id => id !== feature.id) : [...preferences.pins,feature.id]})}>{pinned ? <PinOff size={18} /> : <Pin size={18} />}</button>}</div>{error && <p role="alert">{error}</p>}</article>
}
export default function FeatureFinder({ practice = false }: { practice?: boolean }) {
  const [query,setQuery] = useState('')
  const paused = useProReleasePaused()
  const rank = { free:0, pro:1, paused:2 }
  const results = discoverFeatures(query, paused).filter(f => !practice || f.category === 'Practice' || f.category === 'Preparation').sort((a,b) => rank[featureState(a,paused)] - rank[featureState(b,paused)])
  return <section aria-label={practice ? 'Practice tools' : 'Feature finder'}><label className="block font-semibold" htmlFor="feature-search"><Search size={18} className="inline mr-2" />Find {practice ? 'practice tools' : 'a feature or resource'}</label><div className="flex gap-2 my-4"><input id="feature-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search titles, topics or tools" className="min-h-11 border rounded-lg px-3 w-full min-w-0 bg-white" /><button onClick={() => setQuery('')} className="min-h-11 px-3 border rounded-lg bg-white">Clear</button></div><p role="status" className="ws-muted mb-4">{results.length} destinations</p><div className="ws-card-grid">{results.map(f => <FeatureCard key={f.id} feature={f} pin />)}</div>{!results.length && <p className="ws-panel">No matches. Try a subject name or a shorter search.</p>}</section>
}
export function QuickActions() {
  const { preferences } = useWorkspacePreferences()
  const paused = useProReleasePaused()
  return <section className="ws-panel"><div className="ws-section-head"><h2>Quick actions</h2><Link to="/account/directory">Customize</Link></div><div className="ws-shortcut-grid">{preferences.pins.map(id => features.find(f => f.id === id)).filter((f): f is Feature => !!f && featureState(f,paused) !== 'paused').map((f,index) => { const Icon = /english|grammar/.test(f.id) ? Languages : /vista/.test(f.id) ? Sparkles : /daily|affairs/.test(f.id) ? Newspaper : FolderOpen; return <Link key={f.id} to={f.to} className={`ws-shortcut ws-tone-${["peach","blue","lavender","mint"][index%4]}`}><span className="ws-shortcut-icon"><Icon size={23}/></span><span className="ws-shortcut-title">{f.title}</span><ArrowUpRight className="ws-shortcut-arrow" size={16}/> <span className="ws-badge ml-1">{featureState(f,paused) === 'pro' ? 'Pro' : 'Free'}</span></Link> })}</div><p className="ws-muted mt-4 text-xs">Shortcuts are saved on this device for your account.</p></section>
}
