import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BookOpenText } from 'lucide-react'
import { loadVistagramIndex } from './api'
import type { VistagramPostSummary } from './types'

export default function VistagramHomePreview() {
  const [posts, setPosts] = useState<VistagramPostSummary[]>([])

  useEffect(() => {
    const controller = new AbortController()
    loadVistagramIndex(controller.signal)
      .then((index) => setPosts(index.posts.slice(0, 3)))
      .catch(() => setPosts([]))
    return () => controller.abort()
  }, [])

  if (!posts.length) return null

  return (
    <section className="cssv-reveal mt-5" aria-labelledby="vistagram-home-title">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Fresh from Vistagram</p>
          <h2 id="vistagram-home-title" className="mt-0.5 text-[17px] font-bold tracking-[-0.02em] text-slate-900 sm:text-lg">Read something worth remembering</h2>
        </div>
        <Link to="/vistagram" className="cssv-tap inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-emerald-800">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.id} to={`/vistagram/${post.slug}`} className="cssv-glass-panel cssv-tap group flex min-h-[118px] flex-col rounded-xl border p-3.5">
            <span className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[.12em] text-emerald-700">
              <BookOpenText className="h-3.5 w-3.5" /> {post.type} · {post.category}
            </span>
            <span className="mt-2 line-clamp-2 text-[14px] font-bold leading-snug text-slate-900 group-hover:text-emerald-800">{post.title}</span>
            <span className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">{post.excerpt}</span>
            <span className="mt-auto pt-2 text-[9px] font-semibold text-slate-400">{post.readingMinutes} min read · {post.topic}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
