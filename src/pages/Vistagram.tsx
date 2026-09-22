import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BookOpenText, Search, Sparkles, UserRound, X } from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import { loadVistagramIndex } from '@/features/vistagram/api'
import VistagramPostCard from '@/features/vistagram/PostCard'
import type { VistagramPostSummary } from '@/features/vistagram/types'

export default function Vistagram() {
  const { user } = useAccount()
  const [params, setParams] = useSearchParams()
  const [posts, setPosts] = useState<VistagramPostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const query = params.get('q') ?? ''
  const category = params.get('category') ?? ''

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    loadVistagramIndex(controller.signal)
      .then((index) => {
        setPosts(index.posts)
        setError('')
      })
      .catch((loadError) => {
        if (controller.signal.aborted) return
        setError(loadError instanceof Error ? loadError.message : 'Vistagram could not be loaded.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const categories = useMemo(() => [...new Set(posts.map((post) => post.category))].sort(), [posts])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return posts.filter((post) => {
      if (category && post.category !== category) return false
      if (!needle) return true
      return [post.title, post.excerpt, post.category, post.topic, ...post.tags]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [category, posts, query])

  function patchParam(key: 'q' | 'category', value: string) {
    const next = new URLSearchParams(params)
    if (value.trim()) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <main className="min-h-screen bg-slate-50/60">
      <section className="border-b border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.18em] text-amber-300"><Sparkles className="h-4 w-4" /> CSS Vistagram</p>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">Read something worth remembering.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/85 sm:text-base">A public stream of concepts, explainers, articles, data and exam-relevant ideas published by CSS VISTA. Read freely, then use a free account to save, organise and revisit what matters to you.</p>
            </div>
            <Link
              to={user ? '/account/vistagram' : '/account?returnTo=%2Faccount%2Fvistagram'}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur hover:bg-white/15"
            >
              <UserRound className="h-4 w-4" /> {user ? 'Open My CSS Vistagram' : 'Sign in for My Vistagram'}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" aria-label="Search and filter Vistagram">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <span className="sr-only">Search Vistagram</span>
            <input
              value={query}
              onChange={(event) => patchParam('q', event.target.value)}
              placeholder="Search concepts, topics, articles, data..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-10 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            />
            {query && <button type="button" onClick={() => patchParam('q', '')} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </label>
          {categories.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Vistagram categories">
              <button type="button" onClick={() => patchParam('category', '')} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${!category ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'}`}>All</button>
              {categories.map((item) => (
                <button key={item} type="button" onClick={() => patchParam('category', item)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${category === item ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'}`}>{item}</button>
              ))}
            </div>
          )}
        </section>

        {loading && <div className="mt-6 grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl border bg-white" />)}</div>}
        {!loading && error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">{error}</div>}

        {!loading && !error && filtered.length > 0 && (
          <section className="mt-6 grid items-start gap-4 lg:grid-cols-2" aria-label="Vistagram posts">
            {filtered.map((post) => <VistagramPostCard key={post.id} post={post} member={Boolean(user)} />)}
          </section>
        )}

        {!loading && !error && posts.length === 0 && (
          <section className="mt-8 rounded-3xl border border-dashed border-emerald-300 bg-white p-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><BookOpenText className="h-6 w-6" /></span>
            <h2 className="mt-4 text-xl font-bold text-slate-950">Vistagram is ready for publication.</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Verified concepts, articles, explainers and data will appear here as soon as the first publication batch is added.</p>
          </section>
        )}

        {!loading && !error && posts.length > 0 && filtered.length === 0 && (
          <section className="mt-8 rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">No Vistagram post matches this search or category.</section>
        )}
      </div>
    </main>
  )
}
