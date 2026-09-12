import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { z } from 'zod'
import { ArrowLeft, ArrowUp, Check, Clock } from 'lucide-react'
import { briefingRequest, preferencesBody, setReading } from './api'
import { briefingRoot, displayDate, preferencesSchema, storySchema, type Preferences, type Story } from './model'
import { useBriefing } from './useBriefing'
import { CopyButton, FactCard, LoadError, Loading, Sources, StoryActions } from './ui'

const readerSchema = z.object({ story: storySchema, preferences: preferencesSchema })
const preferenceResponse = z.object({ preferences: preferencesSchema })
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section className="ca-section" id={id}><h2>{title}</h2>{children}</section>
}
function Prose({ text }: { text?: string }) { return text?.trim() ? <p className="ca-prose">{text}</p> : null }
export default function Reader() {
  const { storyId } = useParams()
  const result = useBriefing('view=story&id=' + encodeURIComponent(storyId || ''), readerSchema)
  if (result.loading) return <Loading />
  if (result.error || !result.data) return <LoadError error={result.error || 'This development is unavailable.'} retry={result.retry} />
  return <ReadingDesk key={result.data.story.id} story={result.data.story} preferences={result.data.preferences} />
}
function ReadingDesk({ story, preferences }: { story: Story; preferences: Preferences }) {
  const [personal, setPersonal] = useState({ saved: story.saved, reading_status: story.reading_status })
  const [mode, setMode] = useState(preferences.reading_mode)
  const [savingMode, setSavingMode] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    void setReading(story.id, 'opened').catch(() => {
      if (active) setNotice('We could not update your reading history. You can still read this development and mark it as read below.')
    })
    return () => { active = false }
  }, [story.id])
  async function changeMode(next: Preferences['reading_mode']) {
    setMode(next); setSavingMode(true); setNotice('')
    try { await briefingRequest('', preferenceResponse, undefined, preferencesBody({ ...preferences, reading_mode: next })) }
    catch { setNotice('Reading mode changed for this page, but your preference could not be saved. Please try again.') }
    finally { setSavingMode(false) }
  }
  const full = mode === 'full'
  const contents = [
    ['happened', 'What Happened?', true], ['explanation', 'Easy Explanation', full && Boolean(story.explanation?.trim())],
    ['background', 'Background', full && Boolean(story.background?.trim() || story.timeline.length)],
    ['takeaways', 'Key Takeaways', story.key_takeaways.length > 0], ['facts', 'Facts to Remember', story.facts.length > 0],
    ['statistics', 'Numbers That Matter', story.statistics.length > 0], ['significance', 'Why It Matters', full && Boolean(story.why_it_matters?.trim())],
    ['pakistan', 'Pakistan Perspective', full && Boolean(story.pakistan_perspective?.trim())],
    ['implications', 'Regional / Global Implications', full && Boolean(story.regional_implications?.trim() || story.global_implications?.trim())],
    ['watch', 'What to Watch', full && story.what_to_watch.length > 0],
    ['questions', 'Written Question Angles', full && story.question_angles.length > 0],
    ['gk', 'Quick GK', full && story.quick_gk.length > 0], ['sources', 'Sources', true],
  ] as const
  return <article className="ca-reader" id="reading-top">
    <Link className="ca-text-link" to={briefingRoot + '?range=custom&from=' + story.publication_date + '&to=' + story.publication_date}><ArrowLeft size={16} /> Back to this edition</Link>
    <header className="ca-reader-heading"><div className="ca-card-meta"><span className="ca-category">{story.category}</span>{story.importance && <span>{story.importance}</span>}</div>
      <h1>{story.headline}</h1><p className="ca-standfirst">{story.summary}</p>
      <div className="ca-edition-meta"><span>{displayDate(story.publication_date)}</span><span><Clock size={14} /> {story.reading_minutes} min read</span></div>
      <StoryActions item={{ ...story, ...personal }} onStateChange={setPersonal} />
    </header>
    <div className="ca-mode" role="group" aria-label="Reading mode">
      <button aria-pressed={!full} disabled={savingMode} onClick={() => void changeMode('quick')}>Quick Read</button>
      <button aria-pressed={full} disabled={savingMode} onClick={() => void changeMode('full')}>Full Analysis</button>
      <span>{full ? 'The context, implications and analytical angles' : 'The event, key points, facts and figures'}</span>
    </div>
    {notice && <p className="ca-notice" role="status">{notice}</p>}
    <div className="ca-reading-layout"><div className="ca-reading-body">
      <Section id="happened" title="What Happened?"><span className="ca-eyebrow">CONFIRMED FACTS</span><Prose text={story.what_happened || story.summary} /></Section>
      {full && story.explanation?.trim() && <Section id="explanation" title="Easy Explanation"><Prose text={story.explanation} /></Section>}
      {full && (story.background?.trim() || story.timeline.length > 0) && <Section id="background" title="Background"><Prose text={story.background} />{story.timeline.length > 0 && <ol className="ca-timeline">{story.timeline.map((event, i) => <li key={i}><strong>{event.date}</strong><p>{event.text}</p></li>)}</ol>}</Section>}
      {story.key_takeaways.length > 0 && <Section id="takeaways" title="Key Takeaways"><ol className="ca-takeaways">{story.key_takeaways.map((point, i) => <li key={i}><span>{String(i + 1).padStart(2, '0')}</span><p>{point}</p></li>)}</ol></Section>}
      {story.facts.length > 0 && <Section id="facts" title="Facts to Remember"><div className="ca-fact-grid">{story.facts.map((fact, i) => <FactCard key={i} fact={fact} />)}</div></Section>}
      {story.statistics.length > 0 && <Section id="statistics" title="Numbers That Matter"><div className="ca-fact-grid">{story.statistics.map((stat, i) => <div className="ca-stat" key={i}><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.source} · {stat.year || stat.date}</small><CopyButton value={stat.label + ': ' + stat.value + ' (' + (stat.year || stat.date) + '; ' + stat.source + ')'} /></div>)}</div></Section>}
      {full && story.why_it_matters?.trim() && <Section id="significance" title="Why It Matters"><Prose text={story.why_it_matters} /></Section>}
      {full && story.pakistan_perspective?.trim() && <Section id="pakistan" title="Pakistan Perspective"><Prose text={story.pakistan_perspective} /></Section>}
      {full && (story.regional_implications?.trim() || story.global_implications?.trim()) && <Section id="implications" title="Regional / Global Implications">
        {story.regional_implications?.trim() && <><h3>Regional implications</h3><Prose text={story.regional_implications} /></>}
        {story.global_implications?.trim() && <><h3>Global implications</h3><Prose text={story.global_implications} /></>}
      </Section>}
      {full && story.what_to_watch.length > 0 && <Section id="watch" title="Possible Developments / What to Watch"><p className="ca-muted">These are possibilities to follow, not established outcomes.</p><ul className="ca-bullets">{story.what_to_watch.map((point, i) => <li key={i}>{point}</li>)}</ul></Section>}
      {full && story.question_angles.length > 0 && <Section id="questions" title="Possible Written Question Angles"><p className="ca-muted">Analytical directions for practice, without predicting examination questions.</p><ul className="ca-question-angles">{story.question_angles.map((point, i) => <li key={i}><span>Possible analytical angle</span><p>{point}</p></li>)}</ul></Section>}
      {full && story.quick_gk.length > 0 && <Section id="gk" title="Quick GK"><div className="ca-fact-grid">{story.quick_gk.map((fact, i) => <FactCard key={i} fact={fact} />)}</div></Section>}
      {!full && <button className="ca-expand-analysis" disabled={savingMode} onClick={() => void changeMode('full')}>Read the background, implications and analytical angles <ArrowUp size={16} className="ca-rotate" /></button>}
      <Sources sources={story.sources} />
      {story.topics.length > 0 && <div className="ca-chips" aria-label="Explore related topics">{story.topics.map((topic) => <Link key={topic} to={'/account/search?q=' + encodeURIComponent(topic)}>{topic}</Link>)}</div>}
      <div className="ca-reading-end"><Check size={20} /><p>Finished reading? Mark this development as read to keep your briefing organised.</p><StoryActions item={{ ...story, ...personal }} onStateChange={setPersonal} /><a className="ca-text-link" href="#reading-top"><ArrowUp size={15} /> Back to top</a></div>
    </div><nav className="ca-contents" aria-label="On this page"><strong>In this development</strong>{contents.filter(([, , shown]) => shown).map(([id, title]) => <a key={id} href={'#' + id}>{title}</a>)}</nav></div>
  </article>
}
