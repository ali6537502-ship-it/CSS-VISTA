import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { ChevronDown, Download, ExternalLink } from 'lucide-react'
import { PageHeader, Badge, SourceNote } from '@/components/shared'
import { caIssues } from '@/data/currentAffairs'
import { mergedCaTopics, type CaTopic } from '@/lib/admin'

function TopicCard({ topic, defaultOpen }: { topic: CaTopic; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <article id={topic.id} className="scroll-mt-24 rounded-lg border bg-white">
      <button className="flex w-full items-center justify-between gap-3 p-5 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {topic.important && <Badge tone="gold">Important / New</Badge>}
            {topic.date && <span className="text-xs text-muted-foreground">{topic.date}</span>}
          </div>
          <h2 className="mt-1.5 font-display text-lg font-bold text-pine">{topic.title}</h2>
          {topic.summary && !open && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{topic.summary}</p>}
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="space-y-4 border-t px-5 py-5">
            {topic.summary && <p className="text-sm font-medium text-foreground/90">{topic.summary}</p>}
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{topic.content}</p>
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {topic.fileData && (
                <a href={topic.fileData} download={topic.fileName || 'attachment'} className="inline-flex items-center gap-1.5 rounded-md bg-pine px-3.5 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
                  <Download className="h-4 w-4" /> {topic.fileName || 'Download attachment'}
                </a>
              )}
              {topic.sourceUrl && (
                <a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-3.5 py-2 text-sm font-medium hover:bg-secondary">
                  Source <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function CurrentAffairs() {
  const location = useLocation()
  const hash = location.hash.slice(1)

  const topics = useMemo(() => {
    const seed: CaTopic[] = caIssues.map((c, i) => ({
      id: `seed-${c.slug}`,
      title: c.title,
      date: c.lastUpdated,
      summary: c.background.slice(0, 160),
      content: `${c.background}\n\nMajor actors: ${c.actors.join('; ')}.\n\nImplications for Pakistan: ${c.pakistanImplications.join('; ')}.\n\nPolicy options: ${c.policyOptions.join('; ')}.\n\nKey statistics: ${c.statistics.map((s) => `${s.figure} (${s.source})`).join(' | ')}`,
      important: false,
      published: true,
      order: i,
    }))
    return mergedCaTopics(seed).filter((t) => t.published)
  }, [])

  useEffect(() => {
    if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <div>
      <PageHeader
        title="Current Affairs"
        description="Structured issue files and the latest topic updates - each dated and sourced. Analysis is clearly separated from breaking news."
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="space-y-4">
          {topics.map((t) => <TopicCard key={t.id} topic={t} defaultOpen={hash === t.id} />)}
          {topics.length === 0 && (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No topics published yet.</p>
          )}
        </div>
        <SourceNote source="Compiled from official and multilateral sources; each update shows its date and source link" date="2026-07-17" />
      </div>
    </div>
  )
}
