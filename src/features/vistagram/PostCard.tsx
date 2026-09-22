import { useState } from 'react'
import { Link } from 'react-router'
import { Bookmark, Check, CheckCircle2, Clock3, Copy, Share2 } from 'lucide-react'
import { copyVistagramUrl, formatVistagramDate, shareVistagramPost } from './api'
import {
  markVistagramRead,
  toggleVistagramSaved,
  useVistagramMemberState,
} from './member'
import type { VistagramPostSummary } from './types'

export default function VistagramPostCard({
  post,
  member = false,
}: {
  post: VistagramPostSummary
  member?: boolean
}) {
  const state = useVistagramMemberState()
  const [copied, setCopied] = useState(false)
  const saved = state.saved.includes(post.id)
  const read = Boolean(state.read[post.id])

  async function copy() {
    try {
      await copyVistagramUrl(post.slug)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  async function share() {
    try { await shareVistagramPost(post) } catch { /* The platform share sheet may be dismissed. */ }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {post.image && (
        <Link to={`/vistagram/${post.slug}`} className="block overflow-hidden border-b bg-slate-50">
          <img src={post.image} alt="" loading="lazy" className="aspect-[16/7] w-full object-cover transition-transform duration-300 hover:scale-[1.015]" />
        </Link>
      )}
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.13em]">
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800">{post.type}</span>
          <span className="text-slate-400">{post.category}</span>
          {read && member && <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Read</span>}
        </div>
        <Link to={`/vistagram/${post.slug}`} className="group mt-3 block">
          <h2 className="font-display text-xl font-bold leading-tight text-slate-950 group-hover:text-emerald-800 sm:text-2xl">{post.title}</h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
        </Link>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[post.topic, ...post.tags.slice(0, 3)].filter(Boolean).map((tag) => (
            <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{tag}</span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{post.readingMinutes} min</span>
            <span>{formatVistagramDate(post.publishedAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            {member && (
              <>
                <button
                  type="button"
                  onClick={() => toggleVistagramSaved(post.id)}
                  className={`grid h-9 w-9 place-items-center rounded-full border transition-colors ${saved ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500 hover:text-emerald-800'}`}
                  aria-label={saved ? 'Remove from saved posts' : 'Save post'}
                  title={saved ? 'Saved' : 'Save'}
                >
                  <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => markVistagramRead(post.id)}
                  className={`grid h-9 w-9 place-items-center rounded-full border transition-colors ${read ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500 hover:text-emerald-800'}`}
                  aria-label={read ? 'Marked as read' : 'Mark as read'}
                  title={read ? 'Read' : 'Mark as read'}
                >
                  <Check className="h-4 w-4" />
                </button>
              </>
            )}
            <button type="button" onClick={() => void copy()} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 hover:text-emerald-800" aria-label="Copy post link" title={copied ? 'Copied' : 'Copy link'}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => void share()} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 hover:text-emerald-800" aria-label="Share post" title="Share">
              <Share2 className="h-4 w-4" />
            </button>
            <Link to={`/vistagram/${post.slug}`} className="ml-1 inline-flex min-h-9 items-center rounded-full bg-emerald-900 px-3.5 text-xs font-bold text-white hover:bg-emerald-800">
              Read
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
