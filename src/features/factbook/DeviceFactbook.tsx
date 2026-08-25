import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookMarked, Bookmark, Download, Edit3, FileUp, Plus, RefreshCw,
  Search, ShieldCheck, Trash2, X,
} from 'lucide-react'

type DeviceSubject = {
  id: string
  name: string
  colour: string
  createdAt: string
}

type DeviceEntry = {
  id: string
  subjectId: string
  title: string
  body: string
  tags: string[]
  bookmarked: boolean
  createdAt: string
  updatedAt: string
}

type DeviceFactbookData = {
  version: 1
  subjects: DeviceSubject[]
  entries: DeviceEntry[]
}

type EntryDraft = Pick<DeviceEntry, 'title' | 'body' | 'tags' | 'subjectId'> & { id?: string }

const colours = ['#0f6b4f', '#145c75', '#7b4f2d', '#5f4b8b', '#9b3f48', '#3f6f45']
const emptyData: DeviceFactbookData = { version: 1, subjects: [], entries: [] }
const inputClass = 'h-11 w-full rounded-xl border border-emerald-900/15 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `fact-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function storageKey(userId: string) {
  return `css-vista-device-factbook:${userId}`
}

function readData(userId: string): DeviceFactbookData {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return emptyData
    const parsed = JSON.parse(raw) as Partial<DeviceFactbookData>
    if (parsed.version !== 1 || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.entries)) return emptyData
    return { version: 1, subjects: parsed.subjects, entries: parsed.entries }
  } catch {
    return emptyData
  }
}

function downloadBackup(userId: string, data: DeviceFactbookData) {
  const blob = new Blob([JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `css-vista-factbook-device-${userId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function cleanImport(value: unknown): DeviceFactbookData | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (record.version !== 1 || !Array.isArray(record.subjects) || !Array.isArray(record.entries)) return null
  const subjects = record.subjects.filter((item): item is DeviceSubject => Boolean(item && typeof item === 'object' && typeof (item as DeviceSubject).id === 'string' && typeof (item as DeviceSubject).name === 'string'))
  const subjectIds = new Set(subjects.map((item) => item.id))
  const entries = record.entries.filter((item): item is DeviceEntry => Boolean(
    item && typeof item === 'object' && typeof (item as DeviceEntry).id === 'string'
    && typeof (item as DeviceEntry).title === 'string' && typeof (item as DeviceEntry).body === 'string'
    && subjectIds.has((item as DeviceEntry).subjectId) && Array.isArray((item as DeviceEntry).tags),
  ))
  return { version: 1, subjects, entries }
}

export default function DeviceFactbook({ userId, onRetryCloud, retrying }: { userId: string; onRetryCloud(): void; retrying: boolean }) {
  const [data, setData] = useState<DeviceFactbookData>(() => readData(userId))
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [bookmarksOnly, setBookmarksOnly] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [editor, setEditor] = useState<EntryDraft | null>(null)
  const [notice, setNotice] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem(storageKey(userId), JSON.stringify(data))
  }, [data, userId])

  useEffect(() => {
    setData(readData(userId))
    setSelectedSubjectId('all')
  }, [userId])

  const entries = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return data.entries
      .filter((entry) => selectedSubjectId === 'all' || entry.subjectId === selectedSubjectId)
      .filter((entry) => !bookmarksOnly || entry.bookmarked)
      .filter((entry) => !term || `${entry.title} ${entry.body} ${entry.tags.join(' ')}`.toLocaleLowerCase().includes(term))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [bookmarksOnly, data.entries, query, selectedSubjectId])

  const createSubject = () => {
    const name = newSubject.trim()
    if (!name) return
    const exists = data.subjects.some((subject) => subject.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    if (exists) { setNotice('That subject already exists.'); return }
    const subject: DeviceSubject = { id: makeId(), name, colour: colours[data.subjects.length % colours.length]!, createdAt: new Date().toISOString() }
    setData((current) => ({ ...current, subjects: [...current.subjects, subject] }))
    setSelectedSubjectId(subject.id)
    setNewSubject('')
    setNotice('Subject created on this device.')
  }

  const openNewEntry = () => {
    const subjectId = selectedSubjectId !== 'all' ? selectedSubjectId : data.subjects[0]?.id
    if (!subjectId) { setNotice('Create a subject before adding an entry.'); return }
    setEditor({ subjectId, title: '', body: '', tags: [] })
  }

  const saveEntry = () => {
    if (!editor?.title.trim() || !editor.body.trim()) { setNotice('Add both a title and content.'); return }
    const now = new Date().toISOString()
    setData((current) => {
      if (editor.id) return {
        ...current,
        entries: current.entries.map((entry) => entry.id === editor.id ? { ...entry, subjectId: editor.subjectId, title: editor.title.trim(), body: editor.body.trim(), tags: editor.tags, updatedAt: now } : entry),
      }
      return {
        ...current,
        entries: [{ id: makeId(), subjectId: editor.subjectId, title: editor.title.trim(), body: editor.body.trim(), tags: editor.tags, bookmarked: false, createdAt: now, updatedAt: now }, ...current.entries],
      }
    })
    setEditor(null)
    setNotice('Entry saved privately on this device.')
  }

  const removeSubject = (subject: DeviceSubject) => {
    const count = data.entries.filter((entry) => entry.subjectId === subject.id).length
    if (!window.confirm(`Delete “${subject.name}” and its ${count} ${count === 1 ? 'entry' : 'entries'} from this device?`)) return
    setData((current) => ({ ...current, subjects: current.subjects.filter((item) => item.id !== subject.id), entries: current.entries.filter((entry) => entry.subjectId !== subject.id) }))
    setSelectedSubjectId('all')
  }

  const importBackup = async (file?: File) => {
    if (!file || file.size > 25 * 1024 * 1024) { setNotice('Choose a valid Factbook JSON backup smaller than 25 MB.'); return }
    try {
      const imported = cleanImport(JSON.parse(await file.text()))
      if (!imported) throw new Error('invalid')
      if (!window.confirm('Replace this device’s current Factbook with the selected backup?')) return
      setData(imported)
      setSelectedSubjectId('all')
      setNotice('Factbook backup restored on this device.')
    } catch {
      setNotice('That file is not a valid CSS VISTA device Factbook backup.')
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  return <main className="factbook-shell min-h-screen pb-28">
    <section className="border-b border-amber-300 bg-amber-50"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" /><div><p className="text-sm font-bold text-amber-950">Factbook is working in private device mode</p><p className="mt-1 max-w-3xl text-xs leading-5 text-amber-900">Your cloud Factbook tables are not active yet, so entries are stored only in this browser. Export a backup before clearing browser data or changing devices.</p></div></div><button type="button" disabled={retrying} onClick={onRetryCloud} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-400 bg-white px-3 text-xs font-bold text-amber-950 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} /> Retry cloud sync</button></div></section>

    <section className="border-b bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-700">Your private knowledge library</p><h1 className="mt-2 font-display text-3xl font-bold text-pine sm:text-4xl">My Factbook</h1><p className="mt-2 text-sm text-muted-foreground">Organize facts, arguments, quotations and revision notes by subject.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => downloadBackup(userId, data)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold"><Download className="h-4 w-4" /> Export backup</button><button type="button" onClick={() => importRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold"><FileUp className="h-4 w-4" /> Restore backup</button><input ref={importRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void importBackup(event.target.files?.[0])} /><button type="button" onClick={openNewEntry} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-pine px-4 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Add Entry</button></div></div></section>

    {notice && <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between gap-3 px-4"><p className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900" role="status">{notice}</p><button type="button" onClick={() => setNotice('')} className="rounded-full border bg-white p-2" aria-label="Dismiss message"><X className="h-4 w-4" /></button></div>}

    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="rounded-2xl border bg-white p-4 lg:sticky lg:top-28 lg:self-start">
        <h2 className="font-display text-lg font-bold text-pine">Subjects</h2>
        <div className="mt-3 flex gap-2"><input value={newSubject} onChange={(event) => setNewSubject(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') createSubject() }} className={inputClass} maxLength={80} placeholder="New subject" aria-label="New subject name" /><button type="button" onClick={createSubject} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pine text-white" aria-label="Create subject"><Plus className="h-4 w-4" /></button></div>
        <div className="mt-4 space-y-1"><button type="button" onClick={() => setSelectedSubjectId('all')} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-semibold ${selectedSubjectId === 'all' ? 'bg-pine text-white' : 'hover:bg-secondary'}`}><span>All subjects</span><span>{data.entries.length}</span></button>{data.subjects.map((subject) => <div key={subject.id} className={`group flex items-center rounded-lg ${selectedSubjectId === subject.id ? 'bg-emerald-50' : 'hover:bg-secondary'}`}><button type="button" onClick={() => setSelectedSubjectId(subject.id)} className="flex min-h-10 min-w-0 flex-1 items-center gap-2 px-3 text-left text-sm font-semibold"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: subject.colour }} /><span className="min-w-0 flex-1 truncate">{subject.name}</span><span className="text-xs text-muted-foreground">{data.entries.filter((entry) => entry.subjectId === subject.id).length}</span></button><button type="button" onClick={() => removeSubject(subject)} className="mr-1 rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-700" aria-label={`Delete ${subject.name}`}><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>
      </aside>

      <section className="min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-10`} placeholder="Search titles, notes and tags…" /></label><button type="button" onClick={() => setBookmarksOnly((current) => !current)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold ${bookmarksOnly ? 'border-amber-300 bg-amber-100 text-amber-900' : 'bg-white text-slate-700'}`}><Bookmark className={`h-4 w-4 ${bookmarksOnly ? 'fill-current' : ''}`} /> Bookmarks</button></div>
        {data.subjects.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed bg-white px-6 py-14 text-center"><BookMarked className="mx-auto h-9 w-9 text-emerald-700" /><h2 className="mt-4 font-display text-xl font-bold text-pine">Create your first subject</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Use subjects to organize facts, quotations, case studies and revision material. Everything stays private in this browser.</p></div> : entries.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed bg-white px-6 py-12 text-center"><p className="font-bold text-pine">No matching entries</p><p className="mt-1 text-xs text-muted-foreground">Add an entry or adjust the current search and subject filters.</p><button type="button" onClick={openNewEntry} className="mt-4 rounded-lg bg-pine px-4 py-2 text-xs font-bold text-white">Add Entry</button></div> : <div className="mt-5 grid gap-4 xl:grid-cols-2">{entries.map((entry) => <article key={entry.id} className="rounded-2xl border bg-white p-5 shadow-sm"><header className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">{data.subjects.find((subject) => subject.id === entry.subjectId)?.name ?? 'Subject'}</p><h2 className="mt-1 break-words font-display text-lg font-bold text-pine">{entry.title}</h2><p className="mt-1 text-[10px] text-muted-foreground">Updated {new Date(entry.updatedAt).toLocaleString()}</p></div><button type="button" onClick={() => setData((current) => ({ ...current, entries: current.entries.map((item) => item.id === entry.id ? { ...item, bookmarked: !item.bookmarked, updatedAt: new Date().toISOString() } : item) }))} className={`rounded-lg p-2 ${entry.bookmarked ? 'bg-amber-100 text-amber-800' : 'text-slate-500'}`} aria-label={entry.bookmarked ? 'Remove bookmark' : 'Bookmark entry'}><Bookmark className={`h-4 w-4 ${entry.bookmarked ? 'fill-current' : ''}`} /></button></header><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{entry.body}</p>{entry.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{entry.tags.map((tag) => <span key={tag} className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-slate-600">#{tag}</span>)}</div>}<footer className="mt-4 flex gap-2 border-t pt-3"><button type="button" onClick={() => setEditor({ id: entry.id, subjectId: entry.subjectId, title: entry.title, body: entry.body, tags: entry.tags })} className="inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 text-xs font-bold"><Edit3 className="h-3.5 w-3.5" /> Edit</button><button type="button" onClick={() => { if (window.confirm(`Delete “${entry.title}” from this device?`)) setData((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) })) }} className="inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 text-xs font-bold text-red-700"><Trash2 className="h-3.5 w-3.5" /> Delete</button></footer></article>)}</div>}
      </section>
    </div>

    {editor && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-emerald-950/60 p-3" role="dialog" aria-modal="true" aria-labelledby="device-factbook-editor-title"><section className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b px-5 py-4"><h2 id="device-factbook-editor-title" className="font-display text-xl font-bold text-pine">{editor.id ? 'Edit entry' : 'New Factbook entry'}</h2><button type="button" onClick={() => setEditor(null)} className="rounded-full border p-2" aria-label="Close editor"><X className="h-4 w-4" /></button></header><div className="space-y-4 p-5"><label className="block text-xs font-bold text-pine">Subject<select value={editor.subjectId} onChange={(event) => setEditor({ ...editor, subjectId: event.target.value })} className={`${inputClass} mt-1`}>{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label className="block text-xs font-bold text-pine">Title<input value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} maxLength={240} className={`${inputClass} mt-1`} placeholder="Entry title" /></label><label className="block text-xs font-bold text-pine">Content<textarea value={editor.body} onChange={(event) => setEditor({ ...editor, body: event.target.value })} maxLength={50_000} rows={10} className="mt-1 w-full resize-y rounded-xl border border-emerald-900/15 bg-white p-3 text-sm leading-6 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" placeholder="Facts, arguments, quotations, sources and revision notes…" /></label><label className="block text-xs font-bold text-pine">Tags<input value={editor.tags.join(', ')} onChange={(event) => setEditor({ ...editor, tags: [...new Set(event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 30) })} className={`${inputClass} mt-1`} placeholder="Pakistan, economy, revision" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditor(null)} className="min-h-10 rounded-lg border px-4 text-xs font-bold">Cancel</button><button type="button" onClick={saveEntry} className="min-h-10 rounded-lg bg-pine px-5 text-xs font-bold text-white">Save Entry</button></div></div></section></div>}
  </main>
}
