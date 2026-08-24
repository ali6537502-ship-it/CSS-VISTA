import { ExternalLink, ImageOff, Quote } from 'lucide-react'
import { ENTRY_TYPE_MAP } from './entryTypes'
import { safeWebUrl, sanitizeRichText } from './safety'
import type { FactbookEntry } from './types'

function text(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function Highlight({ children, query }: { children: string; query?: string }) {
  if (!query?.trim()) return children
  const needle = query.trim()
  const index = children.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase())
  if (index < 0) return children
  return <>{children.slice(0, index)}<mark className="rounded bg-amber-200 px-0.5">{children.slice(index, index + needle.length)}</mark>{children.slice(index + needle.length)}</>
}

function DefaultFields({ entry, query }: { entry: FactbookEntry; query?: string }) {
  const definition = ENTRY_TYPE_MAP.get(entry.entry_type)
  const visible = definition?.fields.map((field) => ({ ...field, value: text(entry.content[field.key]) })).filter((field) => field.value) ?? []
  return <dl className="space-y-3">{visible.map((field) => <div key={field.key}><dt className="text-[10px] font-bold uppercase tracking-[.12em] text-emerald-800">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700"><Highlight query={query}>{field.value}</Highlight></dd></div>)}</dl>
}

function TimelineView({ content, query }: { content: Record<string, unknown>; query?: string }) {
  const events = Array.isArray(content.timeline) ? content.timeline : []
  return <ol className="factbook-timeline space-y-0">{events.map((event, index) => {
    const item = event && typeof event === 'object' ? event as Record<string, unknown> : {}
    return <li key={`${text(item.date)}-${index}`} className="relative border-l-2 border-amber-300 pb-5 pl-5 last:pb-0"><span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-700" /><p className="text-xs font-bold text-amber-800"><Highlight query={query}>{text(item.date)}</Highlight></p><h4 className="mt-1 font-bold text-pine"><Highlight query={query}>{text(item.title)}</Highlight></h4>{text(item.description) && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700"><Highlight query={query}>{text(item.description)}</Highlight></p>}{text(item.source) && <p className="mt-1 text-xs text-muted-foreground">Source: <Highlight query={query}>{text(item.source)}</Highlight></p>}</li>
  })}</ol>
}

function TableView({ content, comparison = false }: { content: Record<string, unknown>; comparison?: boolean }) {
  if (comparison) {
    const comparisonData = content.comparison && typeof content.comparison === 'object' ? content.comparison as Record<string, unknown> : {}
    const items = Array.isArray(comparisonData.items) ? comparisonData.items.map(text) : []
    const criteria = Array.isArray(comparisonData.criteria) ? comparisonData.criteria : []
    return <div className="factbook-table-wrap overflow-x-auto"><table className="factbook-data-table w-full min-w-[520px] border-collapse text-sm"><thead><tr><th>Criterion</th>{items.map((item, index) => <th key={`${item}-${index}`}>{item || `Item ${index + 1}`}</th>)}</tr></thead><tbody>{criteria.map((criterion, rowIndex) => { const row = criterion && typeof criterion === 'object' ? criterion as Record<string, unknown> : {}; const values = Array.isArray(row.values) ? row.values : []; return <tr key={rowIndex}><th>{text(row.criterion)}</th>{items.map((_, columnIndex) => <td key={columnIndex}>{text(values[columnIndex])}</td>)}</tr> })}</tbody></table></div>
  }
  const table = content.table && typeof content.table === 'object' ? content.table as Record<string, unknown> : {}
  const columns = Array.isArray(table.columns) ? table.columns.map(text) : []
  const rows = Array.isArray(table.rows) ? table.rows : []
  const alignments = Array.isArray(table.alignments) ? table.alignments.map(text) : []
  return <div className="factbook-table-wrap overflow-x-auto"><table className="factbook-data-table w-full min-w-[480px] border-collapse text-sm"><thead style={{ backgroundColor: text(table.headerColor) || undefined }}><tr>{columns.map((column, index) => <th key={index} style={{ textAlign: alignments[index] === 'center' || alignments[index] === 'right' ? alignments[index] : 'left' }}>{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => { const values = Array.isArray(row) ? row : []; return <tr key={rowIndex}>{columns.map((_, columnIndex) => <td key={columnIndex} style={{ textAlign: alignments[columnIndex] === 'center' || alignments[columnIndex] === 'right' ? alignments[columnIndex] : 'left' }}>{text(values[columnIndex])}</td>)}</tr> })}</tbody></table></div>
}

export default function EntryContent({ entry, query, compact = false }: { entry: FactbookEntry; query?: string; compact?: boolean }) {
  const content = entry.content
  return (
    <div className={`factbook-entry-content ${compact ? 'text-sm' : ''}`}>
      {entry.entry_type === 'statistic' && <div className="mb-4 rounded-2xl border border-emerald-900/10 bg-emerald-50/70 p-4"><p className="font-display text-3xl font-bold text-pine"><Highlight query={query}>{text(content.value)}</Highlight> <span className="text-lg text-emerald-800"><Highlight query={query}>{text(content.unit)}</Highlight></span></p><p className="mt-1 text-xs font-semibold text-muted-foreground">{[text(content.period), text(content.geography)].filter(Boolean).join(' · ')}</p></div>}
      {entry.entry_type === 'quotation' && <blockquote className="relative mb-4 rounded-2xl border-l-4 border-amber-400 bg-amber-50/60 p-5 pl-10"><Quote className="absolute left-3 top-4 h-5 w-5 text-amber-700" /><p className="font-display text-lg italic leading-7 text-pine"><Highlight query={query}>{text(content.quotation)}</Highlight></p><footer className="mt-3 text-xs font-semibold text-slate-600">{[text(content.speaker), text(content.occasion), text(content.year)].filter(Boolean).join(' · ')}</footer></blockquote>}
      {entry.entry_type === 'timeline' && <TimelineView content={content} query={query} />}
      {entry.entry_type === 'comparison' && <TableView content={content} comparison />}
      {entry.entry_type === 'custom-table' && <TableView content={content} />}
      {entry.entry_type === 'cause-effect' && <div className="grid gap-3 sm:grid-cols-2"><section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"><h4 className="font-bold text-amber-900">Causes</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{(Array.isArray(content.causes) ? content.causes : []).map((item, index) => <li key={index}>{text(item)}</li>)}</ul></section><section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"><h4 className="font-bold text-emerald-900">Effects</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{(Array.isArray(content.effects) ? content.effects : []).map((item, index) => <li key={index}>{text(item)}</li>)}</ul></section>{text(content.explanation) && <p className="sm:col-span-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{text(content.explanation)}</p>}</div>}
      {entry.entry_type === 'rich-note' && <div className="factbook-rich prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeRichText(text(content.html)) }} />}
      {!['statistic', 'quotation', 'timeline', 'comparison', 'custom-table', 'cause-effect', 'rich-note'].includes(entry.entry_type) && <DefaultFields entry={entry} query={query} />}
      {entry.media.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2">{entry.media.map((media) => <figure key={media.id} className="overflow-hidden rounded-xl border bg-white">{media.signed_url ? <img src={media.signed_url} alt={media.alt_text} className="max-h-[32rem] w-full object-contain" /> : <div className="grid h-40 place-items-center bg-secondary text-muted-foreground"><ImageOff className="h-6 w-6" /></div>}<figcaption className="p-3 text-xs text-slate-600"><strong>{media.caption}</strong>{media.source && <span className="block text-muted-foreground">Source: {media.source}</span>}</figcaption></figure>)}</div>}
      {entry.personal_remarks && !compact && <div className="mt-5 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-amber-800">Personal remarks</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{entry.personal_remarks}</p></div>}
      {entry.sources.length > 0 && !compact && <section className="mt-5 border-t pt-4"><h4 className="text-xs font-bold uppercase tracking-[.12em] text-emerald-800">Sources</h4><ol className="mt-2 space-y-2 text-xs text-slate-600">{entry.sources.map((source, index) => <li key={source.id ?? index}>{[source.title, source.author_organization, source.publication_year, source.page_number && `p. ${source.page_number}`].filter(Boolean).join(' · ')}{safeWebUrl(source.web_address) && <a href={safeWebUrl(source.web_address)} target="_blank" rel="noopener noreferrer nofollow" className="ml-2 inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline">Open source <ExternalLink className="h-3 w-3" /></a>}{source.verification_note && <span className="block text-muted-foreground">{source.verification_note}</span>}</li>)}</ol></section>}
    </div>
  )
}
