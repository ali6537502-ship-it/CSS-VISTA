import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Bookmark, Check, Clock3, Copy, ExternalLink, FolderPlus, Share2, UserRound } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import {
  copyVistagramUrl,
  formatVistagramDate,
  loadVistagramIndex,
  loadVistagramPost,
  shareVistagramPost,
} from '@/features/vistagram/api'
import {
  createVistagramCollection,
  markVistagramRead,
  recordVistagramView,
  setVistagramNote,
  toggleVistagramCollectionPost,
  toggleVistagramSaved,
  toggleVistagramTopic,
  useVistagramMemberState,
} from '@/features/vistagram/member'
import type { VistagramPost, VistagramPostSummary } from '@/features/vistagram/types'

export default function VistagramArticle() {
  const { slug = '' } = useParams()
  const { user } = useAccount()
  const memberState = useVistagramMemberState()
  const [post, setPost] = useState<VistagramPost | null>(null)
  const [indexPosts, setIndexPosts] = useState<VistagramPostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [collectionName, setCollectionName] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    loadVistagramIndex(controller.signal)
      .then(async (index) => {
        setIndexPosts(index.posts)
        const summary = index.posts.find((item) => item.slug === slug)
        if (!summary) throw new Error('This Vistagram article could not be found.')
        const full = await loadVistagramPost(summary, controller.signal)
        setPost(full)
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'This Vistagram article is unavailable.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [slug])

  useEffect(() => {
    if (!post) return
    document.title = `${post.title} | CSS Vistagram`
    if (user) recordVistagramView(post.id)
  }, [post, user])

  useEffect(() => {
    if (post) setNote(memberState.notes[post.id] ?? '')
  }, [memberState.notes, post])

  const related = useMemo(() => {
    if (!post) return []
    const explicit = new Set(post.relatedSlugs ?? [])
    const scored = indexPosts
      .filter((item) => item.id !== post.id)
      .map((item) => ({
        item,
        score: (explicit.has(item.slug) ? 10 : 0)
          + (item.topic === post.topic ? 4 : 0)
          + (item.category === post.category ? 2 : 0)
          + item.tags.filter((tag) => post.tags.includes(tag)).length,
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
    return scored.slice(0, 4).map((entry) => entry.item)
  }, [indexPosts, post])

  if (loading) return <main className="mx-auto min-h-screen max-w-4xl px-4 py-12"><div className="h-10 w-2/3 animate-pulse rounded bg-slate-100" /><div className="mt-4 h-5 w-full animate-pulse rounded bg-slate-100" /><div className="mt-10 space-y-3">{[1,2,3,4,5].map((item) => <div key={item} className="h-4 animate-pulse rounded bg-slate-100" />)}</div></main>
  if (error || !post) return <main className="mx-auto min-h-screen max-w-3xl px-4 py-14"><Link to="/vistagram" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800"><ArrowLeft className="h-4 w-4" /> Back to Vistagram</Link><div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">{error || 'Article unavailable.'}</div></main>

  const saved = memberState.saved.includes(post.id)
  const read = Boolean(memberState.read[post.id])
  const followed = memberState.followedTopics.includes(post.topic)

  async function copy() {
    try {
      await copyVistagramUrl(post.slug)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch { setCopied(false) }
  }

  function addCollection() {
    const created = createVistagramCollection(collectionName)
    if (!created) return
    toggleVistagramCollectionPost(created.id, post.id)
    setCollectionName('')
  }

  return (
    <main className="min-h-screen bg-white">
      <article>
        <header className="border-b bg-slate-50/80">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <Link to="/vistagram" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-emerald-800"><ArrowLeft className="h-4 w-4" /> CSS Vistagram</Link>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.14em]">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-900">{post.type}</span>
              <span className="text-slate-500">{post.category}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500">{post.topic}</span>
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">{post.title}</h1>
            {post.subtitle && <p className="mt-4 text-lg leading-8 text-slate-600">{post.subtitle}</p>}
            <p className="mt-4 text-base leading-7 text-slate-600">{post.excerpt}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> {post.readingMinutes} min read</span>
              <time dateTime={post.publishedAt}>{formatVistagramDate(post.publishedAt)}</time>
              {post.updatedAt && post.updatedAt !== post.publishedAt && <span>Updated {formatVistagramDate(post.updatedAt)}</span>}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => void copy()} className="inline-flex min-h-10 items-center gap-2 rounded-full border bg-white px-3.5 text-xs font-bold text-slate-700 hover:text-emerald-800">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy link'}</button>
              <button type="button" onClick={() => void shareVistagramPost(post).catch(() => undefined)} className="inline-flex min-h-10 items-center gap-2 rounded-full border bg-white px-3.5 text-xs font-bold text-slate-700 hover:text-emerald-800"><Share2 className="h-4 w-4" /> Share</button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:py-12">
          <div className="min-w-0">
            {post.image && <img src={post.image} alt="" className="mb-8 aspect-[16/8] w-full rounded-2xl border object-cover" />}

            {post.keyPoints && post.keyPoints.length > 0 && (
              <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                <h2 className="font-bold text-emerald-950">At a glance</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-950/85">{post.keyPoints.map((point) => <li key={point} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{point}</li>)}</ul>
              </section>
            )}

            <div className="space-y-9">
              {post.sections.map((section, sectionIndex) => (
                <section key={`${section.heading || 'section'}-${sectionIndex}`}>
                  {section.heading && <h2 className="font-display text-2xl font-bold text-slate-950 sm:text-3xl">{section.heading}</h2>}
                  <div className={section.heading ? 'mt-4 space-y-4' : 'space-y-4'}>
                    {(section.paragraphs ?? []).map((paragraph, index) => <p key={index} className="text-[15px] leading-7 text-slate-700 sm:text-base sm:leading-8">{paragraph}</p>)}
                    {(section.bullets ?? []).length > 0 && <ul className="space-y-2 pl-1">{section.bullets!.map((item) => <li key={item} className="flex gap-3 text-[15px] leading-7 text-slate-700"><span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" />{item}</li>)}</ul>}
                    {section.callout && <blockquote className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50 px-5 py-4 text-sm font-medium leading-7 text-amber-950">{section.callout}</blockquote>}
                  </div>
                </section>
              ))}
            </div>

            {post.examRelevance && post.examRelevance.length > 0 && (
              <section className="mt-10 rounded-2xl border bg-slate-50 p-5 sm:p-6">
                <h2 className="text-xl font-bold text-slate-950">Exam relevance</h2>
                <ul className="mt-3 space-y-2">{post.examRelevance.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />{item}</li>)}</ul>
              </section>
            )}

            {post.sources.length > 0 && (
              <section className="mt-10 border-t pt-8">
                <h2 className="text-xl font-bold text-slate-950">Sources & further reading</h2>
                <div className="mt-4 space-y-2">
                  {post.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-start justify-between gap-3 rounded-xl border p-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"><span>{source.label}{source.date ? <span className="ml-2 text-xs font-normal text-slate-400">{source.date}</span> : null}</span><ExternalLink className="h-4 w-4 shrink-0" /></a>)}
                </div>
              </section>
            )}

            {related.length > 0 && (
              <section className="mt-12 border-t pt-8">
                <h2 className="text-xl font-bold text-slate-950">Explore more on this topic</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">{related.map((item) => <Link key={item.id} to={`/vistagram/${item.slug}`} className="rounded-xl border p-4 hover:border-emerald-300 hover:bg-emerald-50/40"><span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-emerald-700">{item.type} · {item.topic}</span><span className="mt-2 block font-bold leading-snug text-slate-900">{item.title}</span></Link>)}</div>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            {user ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-[.13em] text-emerald-700">My CSS Vistagram</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => toggleVistagramSaved(post.id)} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold ${saved ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'text-slate-700'}`}><Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} /> {saved ? 'Saved' : 'Save'}</button>
                  <button type="button" onClick={() => markVistagramRead(post.id)} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold ${read ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'text-slate-700'}`}><Check className="h-4 w-4" /> {read ? 'Read' : 'Mark read'}</button>
                </div>
                <button type="button" onClick={() => toggleVistagramTopic(post.topic)} className={`mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-xl border text-xs font-bold ${followed ? 'border-amber-400 bg-amber-50 text-amber-900' : 'text-slate-700'}`}>{followed ? `Following ${post.topic}` : `Follow ${post.topic}`}</button>

                <div className="mt-5 border-t pt-4">
                  <label className="text-xs font-bold text-slate-700">Private note<textarea value={note} onChange={(event) => setNote(event.target.value)} onBlur={() => setVistagramNote(post.id, note)} placeholder="e.g. Use this argument in an essay..." className="mt-2 min-h-24 w-full resize-y rounded-xl border bg-slate-50 p-3 text-sm font-normal outline-none focus:border-emerald-700" /></label>
                  <button type="button" onClick={() => setVistagramNote(post.id, note)} className="mt-2 min-h-9 rounded-lg bg-emerald-900 px-3 text-xs font-bold text-white">Save note</button>
                </div>

                <div className="mt-5 border-t pt-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-slate-700"><FolderPlus className="h-4 w-4" /> Add to collection</p>
                  <div className="mt-2 space-y-1">
                    {memberState.collections.map((collection) => {
                      const included = collection.postIds.includes(post.id)
                      return <button key={collection.id} type="button" onClick={() => toggleVistagramCollectionPost(collection.id, post.id)} className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-left text-xs font-semibold ${included ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}><span className="truncate">{collection.name}</span>{included && <Check className="h-3.5 w-3.5" />}</button>
                    })}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input value={collectionName} onChange={(event) => setCollectionName(event.target.value)} placeholder="New collection" className="h-9 min-w-0 flex-1 rounded-lg border px-2.5 text-xs outline-none focus:border-emerald-700" />
                    <button type="button" onClick={addCollection} className="h-9 rounded-lg border px-3 text-xs font-bold text-emerald-800">Add</button>
                  </div>
                </div>
                <Link to="/account/vistagram" className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white">Open My CSS Vistagram</Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-emerald-800"><UserRound className="h-5 w-5" /></span>
                <h2 className="mt-3 font-bold text-emerald-950">Make this useful later.</h2>
                <p className="mt-2 text-sm leading-6 text-emerald-950/75">Sign in to save this article, mark it as read, add private notes, follow topics and organise posts into your own collections.</p>
                <Link to={`/account?returnTo=${encodeURIComponent(`/vistagram/${post.slug}`)}`} className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-emerald-900 px-4 text-xs font-bold text-white">Sign in or create account</Link>
              </div>
            )}
          </aside>
        </div>
      </article>
    </main>
  )
}
