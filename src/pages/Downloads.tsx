import { useMemo, useState } from 'react'
import { Download, FileText, Search } from 'lucide-react'
import { PageHeader, Badge, EmptyState } from '@/components/shared'
import { libraryItems, type LibraryItem } from '@/data/library'

const types = ['All', 'Notes', 'Past Paper', 'Planner', 'Worksheet', 'Revision Sheet', 'Syllabus Guide', 'Outline', 'Grammar Exercise']

function DownloadCard({ item }: { item: LibraryItem }) {
  const available = item.status === 'available' && item.fileUrl
  return (
    <div className="flex flex-col rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <Badge tone="gray">{item.type}</Badge>
        <Badge tone={item.source === 'Owner-provided' ? 'gold' : item.source.startsWith('Official') ? 'red' : 'green'}>{item.source}</Badge>
      </div>
      <h3 className="mt-2.5 font-semibold text-foreground">{item.title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{item.description}</p>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <div>Subject: {item.subject} · Topic: {item.topic}</div>
        {item.pages && <div>Pages: {item.pages}</div>}
        <div>Updated: {item.lastUpdated}</div>
      </div>
      <div className="mt-3 border-t pt-3">
        {available ? (
          <a href={item.fileUrl} className="inline-flex items-center gap-1.5 rounded-md bg-pine px-3.5 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-900">
            <Download className="h-4 w-4" /> Download
          </a>
        ) : item.status === 'awaiting-owner-file' ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3.5 py-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" /> File pending owner upload
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3.5 py-2 text-sm text-muted-foreground">
            Available on-page - see {item.type === 'Syllabus Guide' ? 'subject guides' : 'related section'}
          </span>
        )}
      </div>
    </div>
  )
}

export default function Downloads() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('All')
  const [subject, setSubject] = useState('All')
  const subjects = ['All', ...new Set(libraryItems.map((i) => i.subject))]

  const items = useMemo(
    () =>
      libraryItems.filter(
        (i) =>
          (type === 'All' || i.type === type) &&
          (subject === 'All' || i.subject === subject) &&
          (!q || `${i.title} ${i.description}`.toLowerCase().includes(q.toLowerCase()))
      ),
    [q, type, subject]
  )

  return (
    <div>
      <PageHeader title="Download Centre" description="One library for notes, past papers, planners, worksheets, revision sheets and syllabi. Every file shows its source and last-updated date - no broken or fake download buttons." />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search downloads…" className="h-10 w-full rounded-md border border-input pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" aria-label="Search downloads" />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 rounded-md border border-input px-3 text-sm" aria-label="Filter by file type">
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 rounded-md border border-input px-3 text-sm" aria-label="Filter by subject">
            {subjects.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => <DownloadCard key={i.id} item={i} />)}
        </div>
        {items.length === 0 && <div className="mt-6"><EmptyState title="No downloads match" hint="Try clearing a filter." /></div>}
      </div>
    </div>
  )
}
