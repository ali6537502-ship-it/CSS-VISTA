import { useMemo } from 'react'
import { Printer, X } from 'lucide-react'
import EntryContent from './EntryContent'
import type { FactbookCategory, FactbookEntry, FactbookSubject, PrintSettings } from './types'

interface FactbookPrintProps {
  open: boolean
  settings: PrintSettings
  entries: FactbookEntry[]
  subjects: FactbookSubject[]
  categories: FactbookCategory[]
  onSettings(settings: PrintSettings): void
  onClose(): void
}

const checkboxSettings: { key: keyof PrintSettings; label: string }[] = [
  { key: 'includeDescriptions', label: 'Descriptions' },
  { key: 'includeSources', label: 'Sources' },
  { key: 'includeImages', label: 'Images' },
  { key: 'includeTags', label: 'Tags' },
  { key: 'includeRevisionLabels', label: 'Revision labels' },
  { key: 'includeTableOfContents', label: 'Table of contents' },
  { key: 'includeNoteSpace', label: 'Blank note space' },
  { key: 'inkSaving', label: 'Ink-saving mode' },
  { key: 'pageNumbers', label: 'Page numbers' },
]

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  title: 'MY FACTBOOK', subtitle: '', studentName: '', includeDescriptions: true,
  includeSources: true, includeImages: true, includeTags: true, includeRevisionLabels: true,
  includeTableOfContents: true, includeNoteSpace: false, layout: 'standard', inkSaving: false,
  pageSize: 'A4', orientation: 'portrait', pageNumbers: true,
}

export default function FactbookPrint({ open, settings, entries, subjects, categories, onSettings, onClose }: FactbookPrintProps) {
  const generated = useMemo(() => new Intl.DateTimeFormat('en-PK', { dateStyle: 'long' }).format(new Date()), [])
  if (!open) return null
  const print = () => {
    document.body.classList.add('factbook-printing')
    const cleanup = () => { document.body.classList.remove('factbook-printing'); window.removeEventListener('afterprint', cleanup) }
    window.addEventListener('afterprint', cleanup)
    window.setTimeout(cleanup, 60_000)
    window.requestAnimationFrame(() => window.print())
  }
  return <>
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-emerald-950/65 px-3 py-6 backdrop-blur-sm no-print" role="dialog" aria-modal="true" aria-labelledby="factbook-print-title">
      <section className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-[#f5f2e8] shadow-2xl"><header className="flex items-center justify-between border-b bg-white px-4 py-3 sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-amber-700">Print settings and genuine preview</p><h2 id="factbook-print-title" className="font-display text-xl font-bold text-pine">Prepare Factbook document</h2></div><button type="button" onClick={onClose} className="rounded-full border p-2" aria-label="Close print settings"><X className="h-5 w-5" /></button></header><div className="grid max-h-[78vh] lg:grid-cols-[340px_1fr]"><aside className="overflow-y-auto border-r bg-white p-4"><div className="space-y-3"><label className="block text-xs font-bold text-pine">Document title<input value={settings.title} onChange={(e) => onSettings({ ...settings, title: e.target.value })} className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><label className="block text-xs font-bold text-pine">Subtitle<input value={settings.subtitle} onChange={(e) => onSettings({ ...settings, subtitle: e.target.value })} className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><label className="block text-xs font-bold text-pine">Student name<input value={settings.studentName} onChange={(e) => onSettings({ ...settings, studentName: e.target.value })} className="mt-1 h-10 w-full rounded-lg border px-3 text-sm" /></label><div className="grid grid-cols-2 gap-2">{checkboxSettings.map((item) => <label key={item.key} className="flex min-h-10 items-center gap-2 rounded-lg border px-2 text-[11px] font-semibold"><input type="checkbox" checked={Boolean(settings[item.key])} onChange={(e) => onSettings({ ...settings, [item.key]: e.target.checked })} className="accent-emerald-700" />{item.label}</label>)}</div><div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-pine">Layout<select value={settings.layout} onChange={(e) => onSettings({ ...settings, layout: e.target.value as PrintSettings['layout'] })} className="mt-1 h-10 w-full rounded-lg border px-2"><option value="compact">Compact</option><option value="standard">Standard</option><option value="spacious">Spacious</option></select></label><label className="text-xs font-bold text-pine">Page size<select value={settings.pageSize} onChange={(e) => onSettings({ ...settings, pageSize: e.target.value as PrintSettings['pageSize'] })} className="mt-1 h-10 w-full rounded-lg border px-2"><option>A4</option><option>Letter</option></select></label><label className="text-xs font-bold text-pine">Orientation<select value={settings.orientation} onChange={(e) => onSettings({ ...settings, orientation: e.target.value as PrintSettings['orientation'] })} className="mt-1 h-10 w-full rounded-lg border px-2"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label></div><button type="button" onClick={print} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-pine text-sm font-bold text-white"><Printer className="h-4 w-4" /> Open browser print / Save PDF</button><p className="text-[11px] leading-5 text-muted-foreground">The preview reflects your content choices. In the browser dialog, select “Save as PDF” for a print-ready PDF.</p></div></aside><div className="overflow-y-auto p-4 sm:p-6"><div className="mx-auto max-w-[780px] bg-white shadow-xl"><PrintDocument settings={settings} entries={entries} subjects={subjects} categories={categories} generated={generated} /></div></div></div></section>
    </div>
    <div className={`factbook-print-document factbook-print-${settings.layout} ${settings.inkSaving ? 'factbook-print-ink' : ''} ${settings.orientation === 'landscape' ? 'factbook-print-landscape' : ''}`} aria-hidden="true"><PrintDocument settings={settings} entries={entries} subjects={subjects} categories={categories} generated={generated} /></div>
  </>
}

function PrintDocument({ settings, entries, subjects, categories, generated }: Omit<FactbookPrintProps, 'open' | 'onSettings' | 'onClose'> & { generated: string }) {
  const grouped = subjects.map((subject) => ({ subject, entries: entries.filter((entry) => entry.subject_id === subject.id) })).filter((group) => group.entries.length)
  const categoryName = (id: string | null) => categories.find((category) => category.id === id)?.name ?? 'Uncategorised'
  return <article className="factbook-paper text-slate-900"><section className="factbook-cover flex min-h-[270mm] flex-col items-center justify-center px-12 text-center"><img src="/images/logo.png" alt="CSS VISTA" className="h-auto w-28 object-contain" /><p className="mt-8 text-xs font-bold uppercase tracking-[.32em] text-amber-700">CSS VISTA</p><h1 className="mt-4 font-display text-4xl font-bold text-pine">{settings.title || 'MY FACTBOOK'}</h1>{settings.subtitle && <p className="mt-3 text-lg text-slate-600">{settings.subtitle}</p>}{settings.studentName && <p className="mt-10 text-sm font-semibold">Prepared for {settings.studentName}</p>}<p className="mt-2 text-xs text-muted-foreground">Generated {generated}</p><p className="mt-auto pb-10 text-xs font-semibold text-emerald-800">www.css-vista.com</p></section>{settings.includeTableOfContents && <section className="factbook-print-section factbook-toc"><h2>Table of Contents</h2><ol>{grouped.map((group) => <li key={group.subject.id}><span>{group.subject.name}</span><span>{group.entries.length} entries</span></li>)}</ol></section>}{grouped.map((group) => <section key={group.subject.id} className="factbook-print-section"><header className="factbook-subject-heading" style={{ borderColor: group.subject.accent_color }}><p>MY FACTBOOK</p><h2>{group.subject.name}</h2>{settings.includeDescriptions && group.subject.description && <p>{group.subject.description}</p>}</header>{group.entries.map((entry) => <article key={entry.id} className="factbook-print-entry"><header><div><p className="factbook-print-category">{categoryName(entry.category_id)} · {entry.entry_type.replace('-', ' ')}</p><h3>{entry.title}</h3></div>{settings.includeRevisionLabels && <span>{entry.importance.replace('-', ' ')} · {entry.revision_status.replace('-', ' ')}</span>}</header><EntryContent entry={{ ...entry, media: settings.includeImages ? entry.media : [], sources: settings.includeSources ? entry.sources : [] }} />{settings.includeTags && entry.tags.length > 0 && <p className="factbook-print-tags">Tags: {entry.tags.join(', ')}</p>}{settings.includeNoteSpace && <div className="factbook-note-space" aria-label="Blank note space" />}</article>)}</section>)}<footer className="factbook-print-footer"><img src="/images/logo.png" alt="" /><span>{settings.title || 'MY FACTBOOK'} · www.css-vista.com · {generated}</span>{settings.pageNumbers && <span className="factbook-page-number">Page </span>}</footer></article>
}
