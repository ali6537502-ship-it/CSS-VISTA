import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Bookmark, BookOpenText, Clock3, FolderPlus, Search, Sparkles, Tags, X } from 'lucide-react'
import { loadVistagramIndex } from '@/features/vistagram/api'
import {
  createVistagramCollection,
  markVistagramVisit,
  useVistagramMemberState,
} from '@/features/vistagram/member'
import VistagramPostCard from '@/features/vistagram/PostCard'
import type { VistagramPostSummary } from '@/features/vistagram/types'

type Tab = 'latest' | 'saved' | 'collections' | 'following' | 'history'
const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'latest', label: 'Latest' },
  { id: 'saved', label: 'Saved' },
  { id: 'collections', label: 'Collections' },
  { id: 'following', label: 'Following' },
  { id: 'history', label: 'History' },
]

export default function AccountVistagram() {
  const member = useVistagramMemberState()
  const [params, setParams] = useSearchParams()
  const requestedTab = params.get('tab') as Tab | null
  const tab: Tab = tabs.some((item) => item.id === requestedTab) ? requestedTab! : 'latest'
  const query = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const collectionId = params.get('collection') ?? ''
  const [posts, setPosts] = useState<VistagramPostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newCollection, setNewCollection] = useState('')
  const [previousVisit] = useState(() => member.lastVisit)

  useEffect(() => {
    const controller = new AbortController()
    loadVistagramIndex(controller.signal)
      .then((index) => {
        setPosts(index.posts)
        setError('')
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'My Vistagram could not be loaded.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    markVistagramVisit()
  }, [])

  const categories = useMemo(() => [...new Set(posts.map((post) => post.category))].sort(), [posts])
  const newCount = useMemo(() => {
    if (!previousVisit) return posts.length
    const since = new Date(previousVisit).getTime()
    return posts.filter((post) => new Date(post.publishedAt).getTime() > since).length
  }, [posts, previousVisit])

  const activeCollection = member.collections.find((item) => item.id === collectionId) ?? member.collections[0] ?? null

  const basePosts = useMemo(() => {
    if (tab === 'saved') return posts.filter((post) => member.saved.includes(post.id))
    if (tab === 'following') return posts.filter((post) => member.followedTopics.includes(post.topic))
    if (tab === 'history') {
      return posts
        .filter((post) => member.history[post.id])
        .sort((a, b) => new Date(member.history[b.id]).getTime() - new Date(member.history[a.id]).getTime())
    }
    if (tab === 'collections') return activeCollection ? posts.filter((post) => activeCollection.postIds.includes(post.id)) : []
    return posts
  }, [activeCollection, member.followedTopics, member.history, member.saved, posts, tab])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return basePosts.filter((post) => {
      if (category && post.category !== category) return false
      if (!needle) return true
      return [post.title, post.excerpt, post.category, post.topic, ...post.tags].join(' ').toLowerCase().includes(needle)
    })
  }, [basePosts, category, query])

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'tab' && value !== 'collections') next.delete('collection')
    setParams(next, { replace: true })
  }

  function addCollection() {
    const created = createVistagramCollection(newCollection)
    if (!created) return
    setNewCollection('')
    const next = new URLSearchParams(params)
    next.set('tab', 'collections')
    next.set('collection', created.id)
    setParams(next, { replace: true })
  }

  return (
    <main className="min-h-screen bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-11">
        <header className="rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-emerald-950 to-emerald-800 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-amber-300"><Sparkles className="h-4 w-4" /> Personal learning space</p>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">My CSS Vistagram</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">Discover the public Vistagram feed, then keep your saves, reading history, followed topics, collections and private notes organised in your account.</p>
            </div>
            <Link to="/vistagram" className="inline-flex min-h-10 items-center rounded-full border border-white/20 bg-white/10 px-4 text-xs font-bold text-white hover:bg-white/15">Open public Vistagram</Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/10 px-3 py-1.5">{newCount} new since last visit</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">{member.saved.length} saved</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">{member.followedTopics.length} followed topics</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">{member.collections.length} collections</span>
          </div>
        </header>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="My Vistagram sections">
          {tabs.map((item) => <button key={item.id} type="button" onClick={() => setParam('tab', item.id)} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-bold ${tab === item.id ? 'bg-slate-950 text-white' : 'border bg-white text-slate-600 hover:text-emerald-800'}`}>{item.label}</button>)}
        </nav>

        {tab === 'collections' && (
          <section className="mt-4 rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              {member.collections.map((collection) => <button key={collection.id} type="button" onClick={() => setParam('collection', collection.id)} className={`rounded-full px-3 py-2 text-xs font-bold ${activeCollection?.id === collection.id ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{collection.name} · {collection.postIds.length}</button>)}
            </div>
            <div className="mt-3 flex max-w-md gap-2">
              <input value={newCollection} onChange={(event) => setNewCollection(event.target.value)} placeholder="Create a collection" className="h-10 min-w-0 flex-1 rounded-xl border px-3 text-sm outline-none focus:border-emerald-700" />
              <button type="button" onClick={addCollection} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-900 px-3 text-xs font-bold text-white"><FolderPlus className="h-4 w-4" /> Create</button>
            </div>
          </section>
        )}

        <section className="mt-4 rounded-2xl border bg-white p-3 sm:p-4" aria-label="Filter My Vistagram">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <span className="sr-only">Search My Vistagram</span>
            <input value={query} onChange={(event) => setParam('q', event.target.value)} placeholder="Search your Vistagram..." className="h-11 w-full rounded-xl border bg-slate-50 pl-9 pr-10 text-sm outline-none focus:border-emerald-700" />
            {query && <button type="button" onClick={() => setParam('q', '')} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400" aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </label>
          {categories.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => setParam('category', '')} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${!category ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-600'}`}>All categories</button>{categories.map((item) => <button key={item} type="button" onClick={() => setParam('category', item)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${category === item ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{item}</button>)}</div>}
        </section>

        {tab === 'following' && member.followedTopics.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-4 text-xs"><Tags className="h-4 w-4 text-emerald-700" />{member.followedTopics.map((topic) => <span key={topic} className="rounded-full bg-emerald-50 px-3 py-1.5 font-bold text-emerald-900">{topic}</span>)}</div>}

        {loading && <div className="mt-5 grid gap-4 lg:grid-cols-2">{[1,2,3,4].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl border bg-white" />)}</div>}
        {!loading && error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">{error}</div>}
        {!loading && !error && filtered.length > 0 && <section className="mt-5 grid items-start gap-4 lg:grid-cols-2">{filtered.map((post) => <VistagramPostCard key={post.id} post={post} member />)}</section>}

        {!loading && !error && filtered.length === 0 && (
          <section className="mt-7 rounded-3xl border border-dashed bg-white p-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
              {tab === 'saved' ? <Bookmark className="h-6 w-6" /> : tab === 'history' ? <Clock3 className="h-6 w-6" /> : <BookOpenText className="h-6 w-6" />}
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-950">{posts.length === 0 ? 'Your Vistagram is ready.' : tab === 'saved' ? 'No saved posts yet.' : tab === 'collections' ? 'This collection is empty.' : tab === 'following' ? 'Follow a topic to build this feed.' : tab === 'history' ? 'Your reading history will appear here.' : 'No post matches these filters.'}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{posts.length === 0 ? 'The first verified publication batch has not been added yet.' : 'Open the public Vistagram feed to discover more material.'}</p>
            {posts.length > 0 && <Link to="/vistagram" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-emerald-900 px-4 text-xs font-bold text-white">Explore public Vistagram</Link>}
          </section>
        )}
      </div>
    </main>
  )
}
