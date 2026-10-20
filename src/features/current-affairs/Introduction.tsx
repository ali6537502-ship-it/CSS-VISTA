import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Search } from 'lucide-react'
import { z } from 'zod'
import { cardSchema, displayDate, displayUpdated, factText, storySchema, type Fact, type Story } from './model'
import { CopyButton, FactCard, LoadError, Loading, Sources } from './ui'
import './current-affairs.css'

const editionSchema = z.object({
  edition: z.object({
    date: z.string(), latest_date: z.string().nullable(), published: z.boolean(),
    title: z.string(), published_at: z.string().nullable(), updated_at: z.string().nullable(),
    story_count: z.number(),
  }),
  stories: z.array(cardSchema),
})
const archiveSchema = z.object({
  days: z.array(z.object({
    publication_date: z.string(), edition: z.string(), published_at: z.string(), story_count: z.number(),
  })),
})
const publicStorySchema = z.object({ story: storySchema })

// Unlike account reading, these requests do not send cookies or user identifiers.
function usePublicBriefing<T>(query: string, schema: z.ZodType<T>, enabled = true) {
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>({ key: '' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void fetch('/api/daily-briefing.php?' + query, { signal: controller.signal, credentials: 'omit' })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 404 ? 'This development is no longer published.' : 'The briefing could not be loaded. Please try again.')
        const parsed = schema.safeParse(await response.json())
        if (!parsed.success) throw new Error('The briefing response was incomplete. Please try again.')
        return parsed.data
      })
      .then(data => { if (!controller.signal.aborted) setResult({ key: query, data }) })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResult({ key: query, error: error instanceof Error ? error.message : 'Please try again.' })
      })
    return () => controller.abort()
  }, [query, schema, revision, enabled])
  return {
    data: result.key === query ? result.data : undefined,
    error: result.key === query ? result.error : undefined,
    loading: enabled && result.key !== query,
    retry: () => setRevision(value => value + 1),
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="ca-section"><h2>{title}</h2>{children}</section>
}
function Text({ value }: { value?: string }) {
  return value?.trim() ? <p className="ca-prose" style={{ whiteSpace: 'pre-line' }}>{value}</p> : null
}
function List({ values, ordered = false }: { values: string[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul'
  return <Tag className="ca-public-list">{values.map((item, index) => <li key={index}>{item}</li>)}</Tag>
}
function FactCollection({ facts }: { facts: Fact[] }) {
  return <div className="ca-fact-grid">{facts.map((fact, index) => <FactCard fact={fact} key={index} />)}</div>
}

function PublicArticle({ id }: { id: string }) {
  const query = 'view=story&id=' + encodeURIComponent(id)
  const result = usePublicBriefing(query, publicStorySchema)
  if (result.loading) return <Loading />
  if (!result.data) return <LoadError error={result.error || 'This development could not be loaded.'} retry={result.retry} />
  const story: Story = result.data.story
  const back = '/daily-briefing?date=' + story.publication_date
  return <article className="ca-reader ca-public-reader">
    <Link to={back} className="ca-text-link"><ArrowLeft size={17} /> Back to {displayDate(story.publication_date)}</Link>
    <header className="ca-reader-heading">
      <p className="ca-eyebrow">CSS VISTA · CURRENT AFFAIRS DAILY</p>
      <div className="ca-card-meta"><span className="ca-category">{story.category}</span>{story.importance && <span>{story.importance}</span>}</div>
      <h1>{story.headline}</h1>
      <p className="ca-standfirst">{story.summary}</p>
      <div className="ca-edition-meta"><span>{displayDate(story.publication_date)}</span><span>{story.reading_minutes} min read</span></div>
    </header>
    <div className="ca-reading-body">
      <Section title="What Happened?"><Text value={story.what_happened || story.summary} /></Section>
      {story.explanation?.trim() && <Section title="Explanation"><Text value={story.explanation} /></Section>}
      {(story.background?.trim() || story.timeline.length > 0) && <Section title="Background">
        <Text value={story.background} />
        {story.timeline.length > 0 && <ol className="ca-timeline">{story.timeline.map((event, index) => <li key={index}><strong>{event.date}</strong><p>{event.text}</p></li>)}</ol>}
      </Section>}
      {story.key_takeaways.length > 0 && <Section title="Key Takeaways"><List values={story.key_takeaways} ordered /></Section>}
      {story.facts.length > 0 && <Section title="Facts to Remember"><FactCollection facts={story.facts} /></Section>}
      {story.statistics.length > 0 && <Section title="Numbers That Matter"><div className="ca-fact-grid">{story.statistics.map((stat, index) => <div className="ca-stat" key={index}><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.source} · {stat.year || stat.date}</small><CopyButton value={stat.label + ': ' + stat.value + ' (' + (stat.year || stat.date) + '; ' + stat.source + ')'} /></div>)}</div></Section>}
      {story.why_it_matters?.trim() && <Section title="Why It Matters"><Text value={story.why_it_matters} /></Section>}
      {story.pakistan_perspective?.trim() && <Section title="Pakistan Perspective"><Text value={story.pakistan_perspective} /></Section>}
      {(story.regional_implications?.trim() || story.global_implications?.trim()) && <Section title="Regional and Global Implications">
        {story.regional_implications?.trim() && <><h3>Regional implications</h3><Text value={story.regional_implications} /></>}
        {story.global_implications?.trim() && <><h3>Global implications</h3><Text value={story.global_implications} /></>}
      </Section>}
      {story.what_to_watch.length > 0 && <Section title="What to Watch"><p className="ca-muted">These are possibilities to monitor, not established outcomes.</p><List values={story.what_to_watch} /></Section>}
      {story.question_angles.length > 0 && <Section title="Analytical Question Angles"><List values={story.question_angles} /></Section>}
      {story.quick_gk.length > 0 && <Section title="Quick GK"><FactCollection facts={story.quick_gk} /></Section>}
      <Sources sources={story.sources} />
      {story.topics.length > 0 && <div className="ca-chips">{story.topics.map(topic => <Link key={topic} to={'/daily-briefing?date=' + story.publication_date}>{topic}</Link>)}</div>}
      <p className="ca-public-end"><Link className="ca-button" to={back}><ArrowLeft size={16} /> Back to this edition</Link></p>
    </div>
  </article>
}

function PublicEdition() {
  const [params, setParams] = useSearchParams()
  const date = params.get('date') || 'latest'
  const query = 'view=edition&date=' + encodeURIComponent(date)
  const edition = usePublicBriefing(query, editionSchema)
  const archive = usePublicBriefing('view=archive', archiveSchema)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const stories = edition.data?.stories || []
  const categories = useMemo(() => [...new Set(stories.map(item => item.category))].sort(), [stories])
  const visible = stories.filter(item =>
    (!category || item.category === category) &&
    (!search.trim() || [item.headline, item.summary, item.category, ...item.topics].join(' ').toLowerCase().includes(search.trim().toLowerCase())),
  )
  function changeDate(value: string) {
    setCategory('')
    setSearch('')
    setParams(value ? { date: value } : {})
  }
  return <>
    <header className="ca-intro-hero ca-public-hero">
      <p className="ca-eyebrow">CSS VISTA · CURRENT AFFAIRS DAILY</p>
      <h1>Understand the day.<br />Remember what matters.</h1>
      <p className="ca-intro-lead">Read published daily developments with clear explanations, background, analytical implications, revision facts and original sources. Open to everyone, without an account.</p>
    </header>
    <section className="ca-public-toolbar" aria-label="Browse daily editions">
      <label><CalendarDays size={17} /> Edition
        <select aria-label="Choose an edition" value={date === 'latest' ? '' : date} onChange={event => changeDate(event.target.value)}>
          <option value="">Latest published edition</option>
          {archive.data?.days.map(day => <option key={day.publication_date} value={day.publication_date}>{displayDate(day.publication_date)} · {day.story_count} stories</option>)}
        </select>
      </label>
      <label><Search size={17} /> Find in this edition
        <input type="search" value={search} placeholder="Search topics or headlines" onChange={event => setSearch(event.target.value)} />
      </label>
    </section>
    {edition.loading ? <Loading /> : !edition.data ? <LoadError error={edition.error || 'This edition could not be loaded.'} retry={edition.retry} /> : <>
      <div className="ca-public-edition-heading">
        <div><p className="ca-eyebrow">PUBLISHED EDITION</p><h2>{displayDate(edition.data.edition.date)}</h2>
          <p>{edition.data.edition.title} · {edition.data.edition.story_count} developments</p>
          {edition.data.edition.updated_at && <small>Last updated {displayUpdated(edition.data.edition.updated_at)}</small>}
        </div>
        {edition.data.edition.latest_date && date !== 'latest' && <button className="ca-button ca-button-light" onClick={() => changeDate('')}>Latest edition <ArrowRight size={16} /></button>}
      </div>
      {!edition.data.edition.published ? <div className="ca-empty"><h2>No edition is published for this date</h2><p>Choose another date from the archive or open the latest available edition.</p>{edition.data.edition.latest_date && <button className="ca-button" onClick={() => changeDate('')}>Open latest edition</button>}</div> : <>
        <div className="ca-chips ca-public-categories" aria-label="Filter by category">
          <button aria-pressed={!category} onClick={() => setCategory('')}>All <b>{stories.length}</b></button>
          {categories.map(name => <button key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>{name} <b>{stories.filter(item => item.category === name).length}</b></button>)}
        </div>
        {visible.length === 0 ? <div className="ca-empty"><h2>No matching developments</h2><p>Try another keyword or category.</p></div> :
          <div className="ca-card-grid">{visible.map(item => <article className="ca-story-card" key={item.id}>
            <div className="ca-card-meta"><span className="ca-category">{item.category}</span>{item.importance && <span>{item.importance}</span>}</div>
            <h2><Link to={'/daily-briefing/' + encodeURIComponent(item.id)}>{item.headline}</Link></h2>
            <p className="ca-card-summary">{item.summary}</p>
            <div className="ca-card-footer"><span>{item.reading_minutes} min read</span><Link className="ca-text-link" to={'/daily-briefing/' + encodeURIComponent(item.id)}>Read full analysis <ArrowUpRight size={16} /></Link></div>
          </article>)}</div>}
      </>}
    </>}
    <p className="ca-public-note">Only published editions are shown. Private account records, bookmarks and reading history are not part of this public service.</p>
  </>
}

export default function Introduction() {
  const { storyId } = useParams()
  return <main className="ca-intro ca-public-briefing">
    {storyId ? <PublicArticle id={storyId} /> : <PublicEdition />}
  </main>
}
