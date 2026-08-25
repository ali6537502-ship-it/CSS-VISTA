import {
  useCallback, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookMarked, BookOpen,
  BookOpenCheck, Bookmark, ChevronRight, Cloud, Copy, Download,
  Edit3, FileJson, Filter, FolderPlus, FolderTree, Grid2X2,
  Import, LayoutList, LibraryBig, Menu, MoreHorizontal, Plus, Printer, RotateCcw,
  Search, Settings, ShieldCheck, Sparkles, Tag, Trash2, X,
} from 'lucide-react'
import { useAccount } from '@/lib/accountContext'
import CategoryTree from '@/features/factbook/CategoryTree'
import EntryContent from '@/features/factbook/EntryContent'
import EntryEditor from '@/features/factbook/EntryEditor'
import DeviceFactbook from '@/features/factbook/DeviceFactbook'
import FactbookPrint, { DEFAULT_PRINT_SETTINGS } from '@/features/factbook/FactbookPrint'
import { ENTRY_TYPE_DEFINITIONS, ENTRY_TYPE_MAP } from '@/features/factbook/entryTypes'
import { deleteFactbookImage, uploadFactbookImage } from '@/features/factbook/media'
import {
  clearLocalFactbookDraft, createFactbookCategory, createFactbookCollection,
  createFactbookSubject, deleteAllFactbookData, duplicateFactbookCategory,
  duplicateFactbookEntry, duplicateFactbookSubject, exportCompleteFactbook,
  importFactbookBackup, loadEntryRevisions, loadFactbookCategories, loadFactbookCategoriesForUser,
  loadFactbookCollections, loadFactbookEntries, loadFactbookEntriesByIds,
  loadFactbookPreferences, loadFactbookSubjects, loadLocalFactbookDraft,
  newEntryDraft, permanentlyDeleteFactbookItem, reorderFactbookEntries,
  restoreEntryRevision, restoreFactbookCategoryTree, saveFactbookEntry, saveFactbookPreferences,
  saveLocalFactbookDraft, setCollectionEntries, updateFactbookCategory,
  updateFactbookCollection, updateFactbookEntry, updateFactbookSubject, updateManyFactbookEntries,
  trashFactbookCategoryTree, validateFactbookBackup,
  isFactbookSchemaUnavailable,
} from '@/features/factbook/service'
import type {
  FactbookBackup, FactbookCategory, FactbookCollection, FactbookEntry,
  FactbookEntryDraft, FactbookEntryType, FactbookFilters, FactbookPreferences,
  FactbookRevision, FactbookSubject, FactbookView, PrintSettings, SaveState,
} from '@/features/factbook/types'

type FactbookTab = 'dashboard' | 'workspace' | 'bookmarks' | 'collections' | 'settings'
type Notice = { tone: 'success' | 'error' | 'info'; text: string } | null

const subjectIcons = ['book', 'globe', 'constitution', 'scales', 'economy', 'environment', 'science', 'history', 'international-relations', 'language', 'general-knowledge']
const accentColours = ['#0f6b4f', '#145c75', '#7b4f2d', '#7a5d0b', '#5f4b8b', '#9b3f48', '#3f6f45', '#334155']
const inputClass = 'h-11 w-full rounded-xl border border-emerald-900/15 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'factbook'
}

function entryToMarkdown(entry: FactbookEntry) {
  const details = Object.entries(entry.content).map(([key, value]) => `**${key.replace(/([A-Z])/g, ' $1')}**\n\n${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}`).join('\n\n')
  const sources = entry.sources.map((source) => `- ${[source.title, source.author_organization, source.publication_year, source.web_address].filter(Boolean).join(' — ')}`).join('\n')
  return `# ${entry.title}\n\n_Type: ${entry.entry_type} · Importance: ${entry.importance} · Revision: ${entry.revision_status}_\n\n${details}${sources ? `\n\n## Sources\n\n${sources}` : ''}\n`
}

function exportEntry(entry: FactbookEntry) {
  if (entry.entry_type === 'custom-table') {
    const table = entry.content.table && typeof entry.content.table === 'object' ? entry.content.table as Record<string, unknown> : {}
    const columns = Array.isArray(table.columns) ? table.columns.map(String) : []
    const rows = Array.isArray(table.rows) ? table.rows.filter(Array.isArray).map((row) => row.map(String)) : []
    const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`
    downloadFile(`${slug(entry.title)}.csv`, [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8')
    return
  }
  downloadFile(`${slug(entry.title)}.md`, entryToMarkdown(entry), 'text/markdown;charset=utf-8')
}

function EntryCard({ entry, selected, selectable, view, query, revealed, showSourceReminder, onSelect, onReveal, onEdit, onDuplicate, onHistory, onBookmark, onArchive, onDelete, onPrint, onExport, onMove, onDrag, onDrop }: {
  entry: FactbookEntry; selected: boolean; selectable: boolean; view: FactbookView; query: string; revealed: boolean; showSourceReminder: boolean
  onSelect(): void; onReveal(): void; onEdit(): void; onDuplicate(): void; onHistory(): void; onBookmark(): void
  onArchive(): void; onDelete(): void; onPrint(): void; onExport(): void; onMove(direction: -1 | 1): void
  onDrag(): void; onDrop(): void
}) {
  const compact = view === 'compact'
  const revision = view === 'revision'
  return <article draggable={selectable} onDragStart={onDrag} onDragOver={(e) => { if (selectable) e.preventDefault() }} onDrop={onDrop} className={`factbook-entry-card break-inside-avoid rounded-2xl border bg-white shadow-sm transition ${selected ? 'border-emerald-600 ring-2 ring-emerald-600/10' : 'border-emerald-900/10'} ${compact ? 'p-3' : 'p-4 sm:p-5'}`}>
    <header className="flex items-start gap-3">{selectable && <input type="checkbox" checked={selected} onChange={onSelect} className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" aria-label={`Select ${entry.title}`} />}<div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-emerald-800">{ENTRY_TYPE_MAP.get(entry.entry_type)?.shortLabel} · {entry.importance.replaceAll('-', ' ')}</p><h3 className={`${compact ? 'mt-0.5 text-sm' : 'mt-1 text-lg'} font-bold text-pine`}>{entry.title}</h3>{!compact && <p className="mt-1 text-[11px] text-muted-foreground">Edited {new Date(entry.updated_at).toLocaleDateString()} · {entry.revision_status.replaceAll('-', ' ')}</p>}</div><button type="button" onClick={onBookmark} className={`rounded-lg p-2 ${entry.bookmarked ? 'bg-amber-100 text-amber-800' : 'text-muted-foreground hover:bg-secondary'}`} aria-label={entry.bookmarked ? 'Remove bookmark' : 'Bookmark entry'}><Bookmark className={`h-4 w-4 ${entry.bookmarked ? 'fill-current' : ''}`} /></button><details className="relative no-print"><summary className="list-none rounded-lg border p-2 text-muted-foreground" aria-label={`Actions for ${entry.title}`}><MoreHorizontal className="h-4 w-4" /></summary><div className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border bg-white p-1 shadow-xl">{[
      { label: 'Edit', icon: Edit3, action: onEdit }, { label: 'Revision history', icon: RotateCcw, action: onHistory }, { label: 'Duplicate', icon: Copy, action: onDuplicate },
      { label: 'Print', icon: Printer, action: onPrint }, { label: 'Export', icon: Download, action: onExport }, { label: 'Move up', icon: ArrowUp, action: () => onMove(-1) },
      { label: 'Move down', icon: ArrowDown, action: () => onMove(1) }, { label: 'Archive', icon: Archive, action: onArchive },
      { label: 'Move to Trash', icon: Trash2, action: onDelete, danger: true },
    ].map((item) => <button key={item.label} type="button" onClick={(event) => { item.action(); event.currentTarget.closest('details')?.removeAttribute('open') }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-secondary ${item.danger ? 'text-red-700' : 'text-slate-700'}`}><item.icon className="h-3.5 w-3.5" /> {item.label}</button>)}</div></details></header>
    {!compact && (!revision || revealed) && <div className="mt-5"><EntryContent entry={entry} query={query} /></div>}
    {revision && !revealed && <button type="button" onClick={onReveal} className="mt-4 min-h-10 w-full rounded-xl border border-dashed text-xs font-bold text-pine hover:bg-emerald-50">Reveal explanation and sources</button>}
    {entry.tags.length > 0 && !compact && <div className="mt-4 flex flex-wrap gap-1.5">{entry.tags.map((tagName) => <span key={tagName} className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-slate-600">#{tagName}</span>)}</div>}
    {showSourceReminder && entry.sources.length === 0 && !compact && <p className="mt-3 text-[10px] font-semibold text-amber-800">Source Missing · add one when verification matters</p>}
  </article>
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose(): void }) {
  return <div className="fixed inset-0 z-[92] grid place-items-center overflow-y-auto bg-emerald-950/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="factbook-modal-title" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><section className="w-full max-w-xl rounded-2xl bg-[#fbfaf6] shadow-2xl"><header className="flex items-center justify-between border-b bg-white px-5 py-4"><h2 id="factbook-modal-title" className="font-display text-xl font-bold text-pine">{title}</h2><button type="button" onClick={onClose} className="rounded-full border p-2" aria-label="Close"><X className="h-4 w-4" /></button></header>{children}</section></div>
}

export default function Factbook() {
  const { configured, loading: accountLoading, user } = useAccount()
  const [routeParams, setRouteParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [cloudUnavailable, setCloudUnavailable] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [tab, setTab] = useState<FactbookTab>('dashboard')
  const [subjects, setSubjects] = useState<FactbookSubject[]>([])
  const [categories, setCategories] = useState<FactbookCategory[]>([])
  const [entries, setEntries] = useState<FactbookEntry[]>([])
  const [collections, setCollections] = useState<FactbookCollection[]>([])
  const [preferences, setPreferences] = useState<FactbookPreferences | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<FactbookFilters>({})
  const [query, setQuery] = useState('')
  const [view, setView] = useState<FactbookView>('cards')
  const [editorDraft, setEditorDraft] = useState<FactbookEntryDraft | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [subjectModal, setSubjectModal] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '', icon: 'book', cover_style: 'classic' as FactbookSubject['cover_style'], accent_color: '#0f6b4f', exam_label: '', target_date: '' })
  const [dashboardRecent, setDashboardRecent] = useState<FactbookEntry[]>([])
  const [bookmarkedCount, setBookmarkedCount] = useState(0)
  const [revealIds, setRevealIds] = useState<Set<string>>(new Set())
  const [mobileTree, setMobileTree] = useState(false)
  const [draggedEntry, setDraggedEntry] = useState<string | null>(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [printEntries, setPrintEntries] = useState<FactbookEntry[]>([])
  const [printSettings, setPrintSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS)
  const [importPreview, setImportPreview] = useState<FactbookBackup | null>(null)
  const [importMode, setImportMode] = useState<'new' | 'merge'>('new')
  const [trashSubjects, setTrashSubjects] = useState<FactbookSubject[]>([])
  const [trashCategories, setTrashCategories] = useState<FactbookCategory[]>([])
  const [trashEntries, setTrashEntries] = useState<FactbookEntry[]>([])
  const [archivedSubjects, setArchivedSubjects] = useState<FactbookSubject[]>([])
  const [archivedCategories, setArchivedCategories] = useState<FactbookCategory[]>([])
  const [trashCollections, setTrashCollections] = useState<FactbookCollection[]>([])
  const [archivedCollections, setArchivedCollections] = useState<FactbookCollection[]>([])
  const [collectionEntries, setCollectionEntriesState] = useState<FactbookEntry[]>([])
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [workspacePage, setWorkspacePage] = useState(0)
  const [workspaceHasMore, setWorkspaceHasMore] = useState(false)
  const [revisionEntry, setRevisionEntry] = useState<FactbookEntry | null>(null)
  const [revisions, setRevisions] = useState<FactbookRevision[]>([])
  const lastSavedSignature = useRef('')
  const quickAddHandled = useRef(false)
  const pendingQuickAdd = useRef<{ title: string; subject: string } | null>(null)

  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) ?? null
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? null
  const totalCategories = subjects.reduce((sum, subject) => sum + subject.category_count, 0)
  const totalEntries = subjects.reduce((sum, subject) => sum + subject.entry_count, 0)
  const mustRevise = dashboardRecent.filter((entry) => entry.importance === 'must-revise').length
  const mostUsed = [...subjects].sort((a, b) => b.entry_count - a.entry_count)[0]

  const showNotice = useCallback((text: string, tone: NonNullable<Notice>['tone'] = 'info') => {
    setNotice({ text, tone })
    window.setTimeout(() => setNotice(null), 5_000)
  }, [])

  const refreshOverview = useCallback(async () => {
    if (!user) return
    const [nextSubjects, nextCollections, nextPreferences, recent, bookmarked] = await Promise.all([
      loadFactbookSubjects(user.id), loadFactbookCollections(user.id), loadFactbookPreferences(user.id),
      loadFactbookEntries(user.id, { pageSize: 8 }), loadFactbookEntries(user.id, { bookmarked: true, pageSize: 1 }),
    ])
    setSubjects(nextSubjects)
    setCollections(nextCollections)
    setPreferences(nextPreferences)
    setView(nextPreferences.default_view)
    setDashboardRecent(recent.entries)
    setBookmarkedCount(bookmarked.count)
    setSelectedSubjectId((current) => current && nextSubjects.some((subject) => subject.id === current) ? current : nextSubjects[0]?.id ?? null)
  }, [user])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    void refreshOverview().then(() => setCloudUnavailable(false)).catch((error) => {
      if (isFactbookSchemaUnavailable(error)) {
        setCloudUnavailable(true)
        return
      }
      showNotice(error instanceof Error ? error.message : 'Your Factbook could not be loaded.', 'error')
    }).finally(() => setLoading(false))
  }, [refreshOverview, showNotice, user])

  const refreshWorkspace = useCallback(async () => {
    if (!user) return
    const subjectId = query.trim() ? undefined : selectedSubjectId ?? undefined
    const [nextCategories, result] = await Promise.all([
      selectedSubjectId ? loadFactbookCategories(user.id, selectedSubjectId) : Promise.resolve([]),
      loadFactbookEntries(user.id, {
        ...filters, subjectId, categoryId: query.trim() ? undefined : selectedCategoryId ?? undefined,
        query: query.trim(), bookmarked: tab === 'bookmarks' ? true : filters.bookmarked,
      }),
    ])
    setCategories(nextCategories)
    setEntries(result.entries)
    setWorkspacePage(0)
    setWorkspaceHasMore(result.hasMore)
    setSelectedEntries(new Set())
  }, [filters, query, selectedCategoryId, selectedSubjectId, tab, user])

  useEffect(() => {
    if (!user || (tab !== 'workspace' && tab !== 'bookmarks')) return
    const timer = window.setTimeout(() => void refreshWorkspace().catch((error) => showNotice(error instanceof Error ? error.message : 'Entries could not be loaded.', 'error')), query ? 280 : 0)
    return () => window.clearTimeout(timer)
  }, [query, refreshWorkspace, showNotice, tab, user])

  const openEntry = useCallback((entry?: FactbookEntry, quick = false) => {
    if (!user) return
    if (entry) {
      const draft: FactbookEntryDraft = { ...entry, sources: entry.sources.map((source) => ({ ...source })), tags: [...entry.tags], content: structuredClone(entry.content) }
      setEditorDraft(loadLocalFactbookDraft(user.id, entry.id) ?? draft)
    } else {
      const subjectId = selectedSubjectId ?? subjects[0]?.id
      if (!subjectId) { setSubjectModal(true); return }
      const local = loadLocalFactbookDraft(user.id)
      const draft = local ?? newEntryDraft(subjectId, selectedCategoryId)
      if (quick) { draft.entry_type = 'fact'; draft.content = { mainFact: '', explanation: '', sourceName: '', sourceYear: '' } }
      setEditorDraft(draft)
    }
    setSaveState('idle')
  }, [selectedCategoryId, selectedSubjectId, subjects, user])

  useEffect(() => {
    if (!user || loading || quickAddHandled.current || routeParams.get('quick-add') !== '1') return
    const title = (routeParams.get('title') ?? '').trim().slice(0, 180)
    const requestedSubject = (routeParams.get('subject') ?? '').trim().slice(0, 100)
    if (!title) return
    quickAddHandled.current = true
    setRouteParams({}, { replace: true })
    if (!subjects.length) {
      pendingQuickAdd.current = { title, subject: requestedSubject || 'General Knowledge' }
      setSubjectForm((current) => ({ ...current, name: requestedSubject || 'General Knowledge' }))
      setSubjectModal(true)
      return
    }
    const target = subjects.find((subject) => subject.name.localeCompare(requestedSubject, undefined, { sensitivity: 'base' }) === 0) ?? subjects[0]
    const draft = newEntryDraft(target.id, null)
    draft.title = title
    draft.entry_type = 'fact'
    draft.content = { mainFact: '', explanation: '', sourceName: 'VISTA Exam Intelligence', sourceYear: String(new Date().getFullYear()) }
    setSelectedSubjectId(target.id)
    setEditorDraft(draft)
    setSaveState('idle')
  }, [loading, routeParams, setRouteParams, subjects, user])

  const saveEditor = useCallback(async () => {
    if (!user || !editorDraft || !editorDraft.title.trim()) return
    saveLocalFactbookDraft(user.id, editorDraft)
    if (!navigator.onLine) { setSaveState('offline'); return }
    setSaveState('saving')
    try {
      const saved = await saveFactbookEntry(user.id, editorDraft)
      const savedDraft = { ...editorDraft, id: saved.id }
      lastSavedSignature.current = JSON.stringify(savedDraft)
      setEditorDraft(savedDraft)
      clearLocalFactbookDraft(user.id, editorDraft.id)
      if (!editorDraft.id) clearLocalFactbookDraft(user.id)
      setSaveState('saved')
      await Promise.all([refreshOverview(), refreshWorkspace()])
    } catch (error) {
      setSaveState(navigator.onLine ? 'error' : 'offline')
      showNotice(error instanceof Error ? error.message : 'The entry could not be saved.', 'error')
    }
  }, [editorDraft, refreshOverview, refreshWorkspace, showNotice, user])

  useEffect(() => {
    if (!user || !editorDraft) return
    saveLocalFactbookDraft(user.id, editorDraft)
    if (JSON.stringify(editorDraft) === lastSavedSignature.current) return
    if (!preferences?.autosave_enabled || !editorDraft.title.trim()) return
    setSaveState(navigator.onLine ? 'idle' : 'offline')
    const timer = window.setTimeout(() => void saveEditor(), 1_400)
    return () => window.clearTimeout(timer)
  }, [editorDraft, preferences?.autosave_enabled, saveEditor, user])

  useEffect(() => {
    const goOffline = () => { if (editorDraft) setSaveState('offline') }
    const goOnline = () => { if (editorDraft) void saveEditor() }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline) }
  }, [editorDraft, saveEditor])

  const createSubject = async () => {
    if (!user || !subjectForm.name.trim()) return
    const duplicate = subjects.some((subject) => subject.name.trim().toLocaleLowerCase() === subjectForm.name.trim().toLocaleLowerCase())
    if (duplicate && !window.confirm('A subject with this name already exists. Create another subject with the same name?')) return
    try {
      const created = await createFactbookSubject(user.id, { ...subjectForm, target_date: subjectForm.target_date || null })
      setSubjectModal(false)
      setSubjectForm({ name: '', description: '', icon: 'book', cover_style: 'classic', accent_color: '#0f6b4f', exam_label: '', target_date: '' })
      await refreshOverview()
      setSelectedSubjectId(created.id)
      setTab('workspace')
      if (pendingQuickAdd.current) {
        const draft = newEntryDraft(created.id, null)
        draft.title = pendingQuickAdd.current.title
        draft.entry_type = 'fact'
        draft.content = { mainFact: '', explanation: '', sourceName: 'VISTA Exam Intelligence', sourceYear: String(new Date().getFullYear()) }
        pendingQuickAdd.current = null
        setEditorDraft(draft)
        setSaveState('idle')
      }
      showNotice('Your new subject is ready.', 'success')
    } catch (error) { showNotice(error instanceof Error ? error.message : 'The subject could not be created.', 'error') }
  }

  const createCategory = async (parentId: string | null) => {
    if (!user || !selectedSubjectId) return
    const name = window.prompt(parentId ? 'Name this subcategory:' : 'Name this category:')?.trim()
    if (!name) return
    try { await createFactbookCategory(user.id, selectedSubjectId, { name, parent_id: parentId, position: categories.length }); await refreshWorkspace(); showNotice('Category created.', 'success') } catch (error) { showNotice(error instanceof Error ? error.message : 'Category could not be created.', 'error') }
  }

  const allEntries = async (filter: FactbookFilters = {}) => {
    if (!user) return []
    const result: FactbookEntry[] = []
    let page = 0
    let more = true
    while (more && page < 1000) { const next = await loadFactbookEntries(user.id, { ...filter, page, pageSize: 100 }); result.push(...next.entries); more = next.hasMore; page += 1 }
    return result
  }

  const openPrint = async (items?: FactbookEntry[]) => {
    const next = items ?? (selectedEntries.size ? entries.filter((entry) => selectedEntries.has(entry.id)) : await allEntries(selectedSubjectId ? { subjectId: selectedSubjectId } : {}))
    if (!next.length) { showNotice('Choose at least one entry to print.', 'error'); return }
    setPrintEntries(next)
    setPrintSettings((current) => ({ ...current, subtitle: selectedCategory?.name ?? selectedSubject?.name ?? 'Complete Factbook', studentName: String(user?.user_metadata?.full_name ?? '') }))
    setPrintOpen(true)
  }

  const changeView = async (nextView: FactbookView) => {
    setView(nextView)
    if (user && preferences) { const next = { ...preferences, default_view: nextView }; setPreferences(next); try { await saveFactbookPreferences(user.id, next) } catch { showNotice('The preferred view could not be saved.', 'error') } }
  }

  const loadMoreWorkspace = useCallback(async () => {
    if (!user || !workspaceHasMore) return
    const nextPage = workspacePage + 1
    const result = await loadFactbookEntries(user.id, {
      ...filters,
      subjectId: query.trim() ? undefined : selectedSubjectId ?? undefined,
      categoryId: query.trim() ? undefined : selectedCategoryId ?? undefined,
      query: query.trim(),
      bookmarked: tab === 'bookmarks' ? true : filters.bookmarked,
      page: nextPage,
    })
    setEntries((current) => [...current, ...result.entries.filter((entry) => !current.some((item) => item.id === entry.id))])
    setWorkspacePage(nextPage)
    setWorkspaceHasMore(result.hasMore)
  }, [filters, query, selectedCategoryId, selectedSubjectId, tab, user, workspaceHasMore, workspacePage])

  const openHistory = useCallback((entry: FactbookEntry) => {
    if (!user) return
    void loadEntryRevisions(user.id, entry.id).then((items) => {
      setRevisionEntry(entry)
      setRevisions(items)
    }).catch((error) => showNotice(error instanceof Error ? error.message : 'History could not be loaded.', 'error'))
  }, [showNotice, user])

  const loadTrashAndArchive = useCallback(async () => {
    if (!user) return
    const [deletedSubjects, deletedCategories, archived, archivedCategoryItems, deletedCollections, archivedCollectionItems, deletedEntries] = await Promise.all([
      loadFactbookSubjects(user.id, 'trash'), loadFactbookCategoriesForUser(user.id, 'trash'),
      loadFactbookSubjects(user.id, 'archived'), loadFactbookCategoriesForUser(user.id, 'archived'),
      loadFactbookCollections(user.id, 'trash'), loadFactbookCollections(user.id, 'archived'),
      loadFactbookEntries(user.id, { trashed: true, pageSize: 100 }),
    ])
    setTrashSubjects(deletedSubjects)
    setTrashCategories(deletedCategories)
    setArchivedSubjects(archived)
    setArchivedCategories(archivedCategoryItems)
    setTrashCollections(deletedCollections)
    setArchivedCollections(archivedCollectionItems)
    setTrashEntries(deletedEntries.entries)
  }, [user])

  const activeCollection = collections.find((collection) => collection.id === activeCollectionId)
  const displayEntries = entries

  const breadcrumbs = useMemo(() => {
    const chain: FactbookCategory[] = []
    let current = selectedCategory
    while (current) { chain.unshift(current); current = categories.find((category) => category.id === current?.parent_id) ?? null }
    return chain
  }, [categories, selectedCategory])

  if (accountLoading) return <div className="mx-auto max-w-7xl px-4 py-16" role="status">Preparing your private Factbook…</div>
  if (!configured || !user) return <main className="factbook-shell min-h-[70vh] px-4 py-12 sm:py-16"><section className="mx-auto max-w-3xl rounded-3xl border border-emerald-900/10 bg-white/90 p-6 text-center shadow-xl shadow-emerald-950/5 sm:p-10"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-pine text-white"><ShieldCheck className="h-7 w-7" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-amber-700">Private student workspace</p><h1 className="mt-2 font-display text-3xl font-bold text-pine sm:text-4xl">Build Your Personal Factbook</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Collect the facts, arguments, statistics, quotations and examples you want to remember—all in one organized place.</p><p className="mt-5 text-sm text-slate-600">Sign in with your CSS VISTA account to keep your Factbook private and available across supported devices.</p><Link to="/account?returnTo=/factbook" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-pine px-6 text-sm font-bold text-white hover:bg-emerald-900">Sign in to My Factbook</Link></section></main>
  if (cloudUnavailable) return <DeviceFactbook userId={user.id} onRetryCloud={() => {
    setLoading(true)
    void refreshOverview().then(() => setCloudUnavailable(false)).catch((error) => {
      if (!isFactbookSchemaUnavailable(error)) showNotice(error instanceof Error ? error.message : 'Cloud Factbook could not be loaded.', 'error')
    }).finally(() => setLoading(false))
  }} retrying={loading} />

  return <main className="factbook-shell min-h-screen pb-28">
    {notice && <div className={`fixed right-4 top-20 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl ${notice.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : notice.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700'}`} role="status">{notice.text}</div>}
    <section className="border-b border-emerald-900/10 bg-white/85"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-700">Your private knowledge library</p><h1 className="mt-2 font-display text-3xl font-bold text-pine sm:text-4xl">My Factbook</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Organize facts, arguments, quotations, reports, laws and revision material subject by subject.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setSubjectModal(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-bold text-pine"><FolderPlus className="h-4 w-4" /> New Subject</button><button type="button" onClick={() => openEntry(undefined, true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pine px-5 text-sm font-bold text-white shadow-sm"><Plus className="h-4 w-4" /> Quick Add</button></div></div></section>

    {subjects.length === 0 && !loading ? <Welcome onCreate={() => setSubjectModal(true)} onSample={() => setSampleOpen(true)} /> : <>
      <nav className="sticky top-[var(--header-height,64px)] z-40 border-b bg-white/95 backdrop-blur no-print" aria-label="Factbook sections"><div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2">{([
        ['dashboard', 'Dashboard', Grid2X2], ['workspace', 'Subjects & Entries', LibraryBig], ['bookmarks', 'Bookmarks', Bookmark], ['collections', 'Collections', BookOpen], ['settings', 'Settings & Trash', Settings],
      ] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setTab(id)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-bold ${tab === id ? 'bg-pine text-white' : 'text-slate-600 hover:bg-secondary'}`}><Icon className="h-4 w-4" /> {label}</button>)}</div></nav>

      {tab === 'dashboard' && <Dashboard subjects={subjects} totalCategories={totalCategories} totalEntries={totalEntries} bookmarkedCount={bookmarkedCount} recent={dashboardRecent} mustRevise={mustRevise} mostUsed={mostUsed} query={query} onQuery={(value) => { setQuery(value); if (value.trim()) setTab('workspace') }} onNewSubject={() => setSubjectModal(true)} onOpenSubject={(id) => { setSelectedSubjectId(id); setSelectedCategoryId(null); setTab('workspace') }} onOpenEntry={openEntry} onActionError={(error) => showNotice(error instanceof Error ? error.message : 'The action could not be completed.', 'error')} userId={user.id} refresh={refreshOverview} openPrint={openPrint} allEntries={allEntries} />}

      {(tab === 'workspace' || tab === 'bookmarks') && <Workspace subjects={subjects} categories={categories} entries={displayEntries} allWorkspaceEntries={entries} selectedSubjectId={selectedSubjectId} selectedCategoryId={selectedCategoryId} selectedEntries={selectedEntries} filters={filters} query={query} view={view} tab={tab} mobileTree={mobileTree} breadcrumbs={breadcrumbs} draggedEntry={draggedEntry} collections={collections} revealIds={revealIds} sourceReminders={preferences?.source_reminders ?? true} hasMore={workspaceHasMore} onLoadMore={loadMoreWorkspace} onSelectedSubject={(id) => { setSelectedSubjectId(id); setSelectedCategoryId(null) }} onSelectedCategory={setSelectedCategoryId} onSelectedEntries={setSelectedEntries} onFilters={setFilters} onQuery={setQuery} onView={changeView} onMobileTree={setMobileTree} onNewEntry={() => openEntry()} onOpenEntry={openEntry} onHistory={openHistory} onCreateCategory={createCategory} onRefresh={refreshWorkspace} onNotice={showNotice} userId={user.id} onPrint={openPrint} onDrag={setDraggedEntry} onReveal={(id) => setRevealIds((current) => new Set(current).add(id))} />}

      {tab === 'collections' && <CollectionsView collections={collections} activeCollection={activeCollection} collectionEntries={collectionEntries} userId={user.id} onRefresh={refreshOverview} onActivate={(collection) => void loadFactbookEntriesByIds(user.id, collection.entry_ids ?? []).then((items) => { setActiveCollectionId(collection.id); setCollectionEntriesState(items) })} onOpenEntry={openEntry} onHistory={openHistory} onPrint={openPrint} onNotice={showNotice} />}

      {tab === 'settings' && <SettingsPanel userId={user.id} preferences={preferences} onPreferences={async (next) => { setPreferences(next); setView(next.default_view); await saveFactbookPreferences(user.id, next); showNotice('Factbook settings saved.', 'success') }} onExport={async () => { const backup = await exportCompleteFactbook(user.id); downloadFile(`css-vista-factbook-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), 'application/json') }} onPrintComplete={async () => openPrint(await allEntries())} onImport={setImportPreview} onLoadTrash={loadTrashAndArchive} trashSubjects={trashSubjects} trashCategories={trashCategories} trashCollections={trashCollections} archivedSubjects={archivedSubjects} archivedCategories={archivedCategories} archivedCollections={archivedCollections} trashEntries={trashEntries} onRestoreSubject={async (subject, archived) => { await updateFactbookSubject(user.id, subject.id, archived ? { archived_at: null } : { deleted_at: null }); await refreshOverview(); await loadTrashAndArchive() }} onRestoreCategory={async (category, archived) => { if (archived) await updateFactbookCategory(user.id, category.id, { archived_at: null }); else await restoreFactbookCategoryTree(user.id, category.id, trashCategories); await refreshOverview(); await loadTrashAndArchive() }} onRestoreCollection={async (collection, archived) => { await updateFactbookCollection(user.id, collection.id, archived ? { archived_at: null } : { deleted_at: null }); await refreshOverview(); await loadTrashAndArchive() }} onRestoreEntry={async (entry) => { await updateFactbookEntry(user.id, entry.id, { deleted_at: null }); await refreshOverview(); await loadTrashAndArchive() }} onPurge={async (table, id) => { if (!window.confirm('Permanently delete this item? This cannot be undone.')) return; await permanentlyDeleteFactbookItem(user.id, table, id); await loadTrashAndArchive(); await refreshOverview() }} onMergeTags={async (fromTag, toTag) => { const all = await allEntries(); const affected = all.filter((entry) => entry.tags.some((tagName) => tagName.toLocaleLowerCase() === fromTag.toLocaleLowerCase())); for (const entry of affected) await saveFactbookEntry(user.id, { ...entry, tags: [...new Set(entry.tags.map((tagName) => tagName.toLocaleLowerCase() === fromTag.toLocaleLowerCase() ? toTag : tagName))] }); showNotice(`${affected.length} entries updated.`, 'success') }} onDeleteAll={async (confirmation) => { await deleteAllFactbookData(user.id, confirmation); await refreshOverview(); showNotice('Only your Factbook data was deleted.', 'success') }} />}
    </>}

    <button type="button" onClick={() => openEntry(undefined, true)} className="fixed bottom-20 right-4 z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-pine px-5 text-sm font-bold text-white shadow-xl no-print sm:bottom-6"><Plus className="h-5 w-5" /> Quick Add</button>

    {subjectModal && <SubjectModal form={subjectForm} onForm={setSubjectForm} onCreate={() => void createSubject()} onClose={() => setSubjectModal(false)} />}
    {sampleOpen && <SampleModal onClose={() => setSampleOpen(false)} onCreate={() => { setSampleOpen(false); setSubjectModal(true) }} />}
    {editorDraft && <EntryEditor draft={editorDraft} subjects={subjects} categories={categories} saveState={saveState} onChange={setEditorDraft} onSave={saveEditor} onClose={() => { if (saveState === 'error' && !window.confirm('The cloud save failed. A temporary local draft is available. Close the editor?')) return; setEditorDraft(null) }} onAddAnother={() => { const next = newEntryDraft(editorDraft.subject_id, editorDraft.category_id); lastSavedSignature.current = ''; setSaveState('idle'); setEditorDraft(next) }} onViewSaved={() => { setSelectedSubjectId(editorDraft.subject_id); setSelectedCategoryId(editorDraft.category_id); setQuery(editorDraft.title); setTab('workspace'); setEditorDraft(null) }} onDeleteMedia={async (media) => { await deleteFactbookImage(user.id, media); await refreshWorkspace() }} onUpload={editorDraft.id ? async (file, metadata) => { const media = await uploadFactbookImage({ userId: user.id, entryId: editorDraft.id!, file, ...metadata }); await refreshWorkspace(); return media } : undefined} />}
    <FactbookPrint open={printOpen} settings={printSettings} entries={printEntries} subjects={subjects} categories={categories} onSettings={setPrintSettings} onClose={() => setPrintOpen(false)} />
    {importPreview && <ImportModal backup={importPreview} subjects={subjects} mode={importMode} onMode={setImportMode} onClose={() => setImportPreview(null)} onConfirm={() => void importFactbookBackup(user.id, importPreview, importMode).then(async (result) => { setImportPreview(null); await refreshOverview(); showNotice(`Imported ${result.subjects} subjects, ${result.categories} categories and ${result.entries} entries.`, 'success') }).catch((error) => showNotice(error instanceof Error ? error.message : 'Import failed.', 'error'))} />}
    {revisionEntry && <Modal title={`Revision History: ${revisionEntry.title}`} onClose={() => { setRevisionEntry(null); setRevisions([]) }}><div className="max-h-[70vh] space-y-2 overflow-y-auto p-5">{revisions.map((revision) => <article key={revision.id} className="rounded-xl border bg-white p-3"><p className="text-xs font-bold text-pine">{new Date(revision.created_at).toLocaleString()}</p><p className="mt-1 truncate text-xs text-muted-foreground">{revision.snapshot.title}</p><button type="button" onClick={() => { if (window.confirm('Restore this earlier version? The current version will remain in history.')) void restoreEntryRevision(user.id, revisionEntry.id, revision).then(async () => { setRevisionEntry(null); await refreshWorkspace(); showNotice('Earlier version restored.', 'success') }) }} className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-bold">Restore</button></article>)}{revisions.length === 0 && <p className="text-sm text-muted-foreground">No earlier versions are available yet.</p>}</div></Modal>}
  </main>
}

function Welcome({ onCreate, onSample }: { onCreate(): void; onSample(): void }) {
  return <div className="mx-auto max-w-7xl px-4 py-10"><section className="rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-sm sm:p-9"><div className="grid gap-7 lg:grid-cols-[1.1fr_.9fr] lg:items-center"><div><span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900"><Cloud className="h-3.5 w-3.5" /> Private and synced</span><h2 className="mt-4 font-display text-2xl font-bold text-pine sm:text-3xl">Build Your Personal Factbook</h2><p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">Collect the facts, arguments, statistics, quotations and examples you want to remember—all in one organized place.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={onCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pine px-5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Create My First Factbook</button><button type="button" onClick={onSample} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-white px-5 text-sm font-bold text-pine"><FolderTree className="h-4 w-4" /> View Sample Structure</button></div></div><div className="rounded-2xl border bg-[#fbfaf5] p-4"><div className="flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm"><BookMarked className="h-5 w-5 text-emerald-800" /><span className="font-bold text-pine">Current Affairs</span></div><div className="ml-5 mt-3 border-l border-amber-300 pl-4 text-sm text-slate-700"><p className="rounded-lg bg-white px-3 py-2">Climate Change</p><p className="ml-4 mt-2 rounded-lg bg-white px-3 py-2">Pakistan</p><p className="ml-8 mt-2 rounded-lg border bg-emerald-50 px-3 py-2 font-semibold text-pine">Floods → Individual entries</p></div></div></div></section></div>
}

function Dashboard({ subjects, totalCategories, totalEntries, bookmarkedCount, recent, mustRevise, mostUsed, query, onQuery, onNewSubject, onOpenSubject, onOpenEntry, onActionError, userId, refresh, openPrint, allEntries }: {
  subjects: FactbookSubject[]; totalCategories: number; totalEntries: number; bookmarkedCount: number; recent: FactbookEntry[]; mustRevise: number; mostUsed?: FactbookSubject; query: string
  onQuery(value: string): void; onNewSubject(): void; onOpenSubject(id: string): void; onOpenEntry(entry: FactbookEntry): void; onActionError(error: unknown): void; userId: string; refresh(): Promise<void>; openPrint(entries: FactbookEntry[]): Promise<void>; allEntries(filters?: FactbookFilters): Promise<FactbookEntry[]>
}) {
  const [renderedAt] = useState(() => Date.now())
  return <div className="mx-auto max-w-7xl space-y-8 px-4 py-8"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
    { label: 'Subjects', value: subjects.length, Icon: BookMarked },
    { label: 'Categories', value: totalCategories, Icon: FolderTree },
    { label: 'Entries', value: totalEntries, Icon: BookOpenCheck },
    { label: 'Bookmarked', value: bookmarkedCount, Icon: Sparkles },
  ].map(({ label, value, Icon }) => <article key={label} className="rounded-2xl border bg-white p-4 shadow-sm"><Icon className="h-5 w-5 text-emerald-800" /><p className="mt-4 text-2xl font-bold text-pine">{value}</p><p className="text-xs font-semibold text-muted-foreground">{label}</p></article>)}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><article className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold text-muted-foreground">Recently added</p><p className="mt-2 text-xl font-bold text-pine">{recent.filter((entry) => renderedAt - new Date(entry.created_at).getTime() < 7 * 86_400_000).length}</p></article><article className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold text-muted-foreground">Recently edited</p><p className="mt-2 text-xl font-bold text-pine">{recent.length}</p></article><article className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold text-muted-foreground">Marked for revision</p><p className="mt-2 text-xl font-bold text-pine">{mustRevise}</p></article><article className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold text-muted-foreground">Most-used subject</p><p className="mt-2 truncate text-base font-bold text-pine">{mostUsed?.name ?? '—'}</p></article></div><label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Quick search across titles, content, sources, years and provisions" className="h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-sm" /></label><section><div className="flex items-end justify-between"><div><h2 className="font-display text-2xl font-bold text-pine">Your subject books</h2><p className="mt-1 text-sm text-muted-foreground">Open a cover to continue organizing and revising.</p></div><button type="button" onClick={onNewSubject} className="hidden min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold sm:inline-flex"><Plus className="h-4 w-4" /> Subject</button></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{subjects.map((subject) => <article key={subject.id} className="group relative overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="h-2" style={{ backgroundColor: subject.accent_color }} /><div className="p-5"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ backgroundColor: subject.accent_color }}><BookMarked className="h-5 w-5" /></span><details className="relative"><summary className="list-none rounded-lg border p-2 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></summary><div className="absolute right-0 z-30 mt-1 w-48 rounded-xl border bg-white p-1 shadow-xl">{[
      { label: 'Rename', icon: Edit3, action: async () => { const name = window.prompt('New subject name:', subject.name)?.trim(); if (name) { await updateFactbookSubject(userId, subject.id, { name }); await refresh() } } },
      { label: 'Colour & icon', icon: Sparkles, action: async () => { const color = window.prompt('Accent colour (hex):', subject.accent_color); if (!color) return; const icon = window.prompt('Icon label:', subject.icon) ?? subject.icon; await updateFactbookSubject(userId, subject.id, { accent_color: color, icon }); await refresh() } },
      { label: 'Duplicate', icon: Copy, action: async () => { await duplicateFactbookSubject(userId, subject); await refresh() } },
      { label: 'Export', icon: Download, action: async () => { const backup = await exportCompleteFactbook(userId); const scoped = { ...backup, subjects: backup.subjects.filter((item) => item.id === subject.id), categories: backup.categories.filter((item) => item.subject_id === subject.id), entries: backup.entries.filter((item) => item.subject_id === subject.id) }; downloadFile(`${slug(subject.name)}.json`, JSON.stringify(scoped, null, 2), 'application/json') } },
      { label: 'Print', icon: Printer, action: async () => openPrint(await allEntries({ subjectId: subject.id })) },
      { label: 'Archive', icon: Archive, action: async () => { await updateFactbookSubject(userId, subject.id, { archived_at: new Date().toISOString() }); await refresh() } },
      { label: 'Move to Trash', icon: Trash2, danger: true, action: async () => { if (window.confirm(`Move “${subject.name}” and its contents to Trash?`)) { await updateFactbookSubject(userId, subject.id, { deleted_at: new Date().toISOString() }); await refresh() } } },
    ].map((item) => <button key={item.label} type="button" onClick={() => void item.action().catch(onActionError)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-secondary ${item.danger ? 'text-red-700' : ''}`}><item.icon className="h-3.5 w-3.5" /> {item.label}</button>)}</div></details></div><h3 className="mt-4 font-display text-xl font-bold text-pine">{subject.name}</h3>{subject.exam_label && <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">{subject.exam_label}</p>}<p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{subject.description || 'A personal evidence and revision book.'}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><span className="rounded-lg bg-secondary/60 p-2"><strong>{subject.category_count}</strong> categories</span><span className="rounded-lg bg-secondary/60 p-2"><strong>{subject.entry_count}</strong> entries</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full" style={{ width: `${Math.min(100, subject.category_count ? 35 + subject.entry_count * 2 : subject.entry_count ? 20 : 5)}%`, backgroundColor: subject.accent_color }} /></div><p className="mt-2 text-[10px] text-muted-foreground">Updated {new Date(subject.updated_at).toLocaleDateString()}</p><button type="button" onClick={() => onOpenSubject(subject.id)} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-pine text-xs font-bold text-white">Open Factbook <ChevronRight className="h-4 w-4" /></button></div></article>)}</div></section><section><h2 className="font-display text-xl font-bold text-pine">Continue editing</h2><div className="mt-3 grid gap-3 lg:grid-cols-2">{recent.slice(0, 4).map((entry) => <button key={entry.id} type="button" onClick={() => onOpenEntry(entry)} className="rounded-xl border bg-white p-4 text-left hover:border-emerald-600"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">{ENTRY_TYPE_MAP.get(entry.entry_type)?.label}</p><p className="mt-1 font-bold text-pine">{entry.title}</p><p className="mt-1 text-xs text-muted-foreground">Edited {new Date(entry.updated_at).toLocaleString()}</p></button>)}</div></section></div>
}

// The multi-panel workspace is isolated here so its stateful controls remain readable.
function Workspace(props: {
  subjects: FactbookSubject[]; categories: FactbookCategory[]; entries: FactbookEntry[]; allWorkspaceEntries: FactbookEntry[]; selectedSubjectId: string | null; selectedCategoryId: string | null; selectedEntries: Set<string>; filters: FactbookFilters; query: string; view: FactbookView; tab: FactbookTab; mobileTree: boolean; breadcrumbs: FactbookCategory[]; draggedEntry: string | null; collections: FactbookCollection[]; revealIds: Set<string>; sourceReminders: boolean; hasMore: boolean
  onLoadMore(): Promise<void>; onSelectedSubject(id: string): void; onSelectedCategory(id: string | null): void; onSelectedEntries(ids: Set<string>): void; onFilters(filters: FactbookFilters): void; onQuery(value: string): void; onView(view: FactbookView): Promise<void>; onMobileTree(open: boolean): void; onNewEntry(): void; onOpenEntry(entry: FactbookEntry): void; onHistory(entry: FactbookEntry): void; onCreateCategory(parent: string | null): Promise<void>; onRefresh(): Promise<void>; onNotice(text: string, tone?: NonNullable<Notice>['tone']): void; userId: string; onPrint(entries?: FactbookEntry[]): Promise<void>; onDrag(id: string | null): void; onReveal(id: string): void
}) {
  const selectedSubject = props.subjects.find((subject) => subject.id === props.selectedSubjectId)
  const selectedCategory = props.categories.find((category) => category.id === props.selectedCategoryId)
  const selectedList = props.allWorkspaceEntries.filter((entry) => props.selectedEntries.has(entry.id))
  const [mobileFilters, setMobileFilters] = useState(false)
  const [focusIndex, setFocusIndex] = useState(0)
  useEffect(() => { setFocusIndex(0) }, [props.query, props.selectedCategoryId, props.selectedSubjectId, props.view])
  const visibleEntries = props.view === 'focus' || props.view === 'book'
    ? props.entries.length ? [props.entries[Math.min(focusIndex, props.entries.length - 1)]!] : []
    : props.entries
  return <div className="mx-auto max-w-[1500px] px-3 py-5 sm:px-4"><div className="mb-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => props.onMobileTree(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold lg:hidden"><Menu className="h-4 w-4" /> Subjects & categories</button><label className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={props.query} onChange={(e) => props.onQuery(e.target.value)} placeholder="Search complete Factbook…" className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm" /></label><button type="button" onClick={() => setMobileFilters(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold lg:hidden"><Filter className="h-4 w-4" /> Filters</button><button type="button" onClick={props.onNewEntry} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-pine px-4 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Add Entry</button></div><div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_230px]"><aside className={`${props.mobileTree ? 'fixed inset-0 z-[85] block overflow-y-auto bg-white p-4' : 'hidden'} rounded-2xl border bg-white p-4 lg:sticky lg:top-28 lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto`}><div className="mb-3 flex items-center justify-between lg:hidden"><h2 className="font-bold text-pine">Factbook navigation</h2><button type="button" onClick={() => props.onMobileTree(false)} className="rounded-full border p-2"><X className="h-4 w-4" /></button></div><label className="block text-xs font-bold text-pine">Subject<select value={props.selectedSubjectId ?? ''} onChange={(e) => props.onSelectedSubject(e.target.value)} className={`${inputClass} mt-1`}>{props.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><div className="mt-5"><CategoryTree categories={props.categories} selectedId={props.selectedCategoryId} onSelect={(id) => { props.onSelectedCategory(id); props.onMobileTree(false) }} onCreate={(parent) => void props.onCreateCategory(parent)} onRename={(category) => { const name = window.prompt('Rename category:', category.name)?.trim(); if (name) void updateFactbookCategory(props.userId, category.id, { name }).then(props.onRefresh).catch((e) => props.onNotice(e.message, 'error')) }} onDuplicate={(category) => void duplicateFactbookCategory(props.userId, category, props.categories).then(props.onRefresh).catch((e) => props.onNotice(e.message, 'error'))} onArchive={(category) => void updateFactbookCategory(props.userId, category.id, { archived_at: new Date().toISOString() }).then(props.onRefresh).catch((e) => props.onNotice(e.message, 'error'))} onDelete={(category) => { if (window.confirm(`Move “${category.name}”, its subcategories and entries to Trash? Everything remains recoverable.`)) void trashFactbookCategoryTree(props.userId, category.id, props.categories).then(props.onRefresh).catch((e) => props.onNotice(e.message, 'error')) }} onPrint={(category) => void loadFactbookEntries(props.userId, { subjectId: category.subject_id, categoryId: category.id, pageSize: 100 }).then((result) => props.onPrint(result.entries))} onExport={(category) => void loadFactbookEntries(props.userId, { subjectId: category.subject_id, categoryId: category.id, pageSize: 100 }).then((result) => downloadFile(`${slug(category.name)}.md`, result.entries.map(entryToMarkdown).join('\n---\n'), 'text/markdown'))} onMove={(id, parentId) => void updateFactbookCategory(props.userId, id, { parent_id: parentId }).then(props.onRefresh).catch((e) => props.onNotice(e.message, 'error'))} onStyle={(category) => { const color = window.prompt('Category colour (hex):', category.color); if (!color) return; const icon = window.prompt('Category icon label:', category.icon) ?? category.icon; void updateFactbookCategory(props.userId, category.id, { color, icon }).then(props.onRefresh).catch((e) => props.onNotice(e.message, 'error')) }} onReorder={(category, direction) => { const siblings = props.categories.filter((item) => item.parent_id === category.parent_id).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)); const from = siblings.findIndex((item) => item.id === category.id); const to = from + direction; if (from < 0 || to < 0 || to >= siblings.length) return; [siblings[from], siblings[to]] = [siblings[to]!, siblings[from]!]; void Promise.all(siblings.map((item, position) => updateFactbookCategory(props.userId, item.id, { position }))).then(props.onRefresh).catch((e) => props.onNotice(e.message, 'error')) }} /></div></aside><section className="min-w-0"><nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb"><span className="font-bold text-emerald-800">My Factbook</span>{selectedSubject && <><ChevronRight className="h-3 w-3" /><button type="button" onClick={() => props.onSelectedCategory(null)} className="font-bold text-emerald-800">{selectedSubject.name}</button></>}{props.breadcrumbs.map((category) => <span key={category.id} className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /><button type="button" onClick={() => props.onSelectedCategory(category.id)} className={category.id === props.selectedCategoryId ? 'font-bold text-pine' : 'hover:text-pine'}>{category.name}</button></span>)}</nav><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-display text-xl font-bold text-pine">{props.tab === 'bookmarks' ? 'Bookmarked entries' : selectedCategory?.name ?? selectedSubject?.name ?? 'All entries'}</h2><p className="text-xs text-muted-foreground">{props.allWorkspaceEntries.length} loaded · drag cards or use move controls to reorder</p></div><div className="flex rounded-lg border bg-white p-1">{([['cards', Grid2X2], ['compact', LayoutList], ['book', BookOpen], ['revision', RotateCcw], ['focus', BookOpenCheck]] as const).map(([id, Icon]) => <button key={id} type="button" onClick={() => void props.onView(id)} className={`rounded-md p-2 ${props.view === id ? 'bg-pine text-white' : 'text-slate-600'}`} aria-label={`${id} view`}><Icon className="h-4 w-4" /></button>)}</div></div>{props.selectedEntries.size > 0 && <BulkBar selected={selectedList} collections={props.collections} categories={props.categories} userId={props.userId} onRefresh={props.onRefresh} onPrint={props.onPrint} onClear={() => props.onSelectedEntries(new Set())} />}{visibleEntries.length ? <div className={`${props.view === 'cards' ? 'grid gap-4 xl:grid-cols-2' : 'space-y-3'} ${props.view === 'book' ? 'rounded-3xl border bg-[#fffdf6] p-4 shadow-inner sm:p-8' : ''}`}>{visibleEntries.map((entry) => { const index = props.allWorkspaceEntries.findIndex((item) => item.id === entry.id); return <EntryCard key={entry.id} entry={entry} selected={props.selectedEntries.has(entry.id)} selectable view={props.view} query={props.query} revealed={props.revealIds.has(entry.id)} showSourceReminder={props.sourceReminders} onSelect={() => props.onSelectedEntries((() => { const next = new Set(props.selectedEntries); if (next.has(entry.id)) next.delete(entry.id); else next.add(entry.id); return next })())} onReveal={() => props.onReveal(entry.id)} onEdit={() => props.onOpenEntry(entry)} onHistory={() => props.onHistory(entry)} onDuplicate={() => void duplicateFactbookEntry(props.userId, entry).then(props.onRefresh)} onBookmark={() => void updateFactbookEntry(props.userId, entry.id, { bookmarked: !entry.bookmarked }).then(props.onRefresh)} onArchive={() => void updateFactbookEntry(props.userId, entry.id, { archived_at: new Date().toISOString() }).then(props.onRefresh)} onDelete={() => { if (window.confirm(`Move “${entry.title}” to Trash?`)) void updateFactbookEntry(props.userId, entry.id, { deleted_at: new Date().toISOString() }).then(props.onRefresh) }} onPrint={() => void props.onPrint([entry])} onExport={() => exportEntry(entry)} onMove={(direction) => { const to = index + direction; if (to < 0 || to >= props.allWorkspaceEntries.length) return; const ids = props.allWorkspaceEntries.map((item) => item.id); [ids[index], ids[to]] = [ids[to]!, ids[index]!]; void reorderFactbookEntries(props.userId, ids).then(props.onRefresh) }} onDrag={() => props.onDrag(entry.id)} onDrop={() => { if (!props.draggedEntry || props.draggedEntry === entry.id) return; const ids = props.allWorkspaceEntries.map((item) => item.id); const from = ids.indexOf(props.draggedEntry); const to = ids.indexOf(entry.id); const [moved] = ids.splice(from, 1); if (moved) ids.splice(to, 0, moved); props.onDrag(null); void reorderFactbookEntries(props.userId, ids).then(props.onRefresh) }} /> })}</div> : <div className="rounded-2xl border border-dashed bg-white px-6 py-12 text-center"><BookOpenCheck className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-bold text-pine">{props.query ? 'No matching entries' : 'This section is ready for its first entry'}</p><p className="mt-1 text-xs text-muted-foreground">{props.query ? 'Try another term or remove a filter.' : 'Add a fact, statistic, quotation, case study or another structured entry.'}</p><button type="button" onClick={props.onNewEntry} className="mt-4 rounded-lg bg-pine px-4 py-2 text-xs font-bold text-white">Add Entry</button></div>}{(props.view === 'focus' || props.view === 'book') && props.entries.length > 1 && <div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={() => setFocusIndex((current) => Math.max(0, current - 1))} disabled={focusIndex === 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous</button><span className="text-xs text-muted-foreground">{focusIndex + 1} of {props.entries.length}</span><button type="button" onClick={() => setFocusIndex((current) => Math.min(props.entries.length - 1, current + 1))} disabled={focusIndex >= props.entries.length - 1} className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-bold disabled:opacity-40">Next <ArrowRight className="h-4 w-4" /></button></div>}{props.hasMore && <button type="button" onClick={() => void props.onLoadMore()} className="mt-5 min-h-11 w-full rounded-xl border bg-white text-sm font-bold text-pine">Load more entries</button>}</section><FilterPanel filters={props.filters} onFilters={props.onFilters} />{mobileFilters && <div className="fixed inset-0 z-[86] overflow-y-auto bg-white p-4 lg:hidden"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-pine">Filter entries</h2><button type="button" onClick={() => setMobileFilters(false)} className="rounded-full border p-2"><X className="h-4 w-4" /></button></div><FilterPanel filters={props.filters} onFilters={props.onFilters} mobile /></div>}</div></div>
}

function BulkBar({ selected, collections, categories, userId, onRefresh, onPrint, onClear }: { selected: FactbookEntry[]; collections: FactbookCollection[]; categories: FactbookCategory[]; userId: string; onRefresh(): Promise<void>; onPrint(entries: FactbookEntry[]): Promise<void>; onClear(): void }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs"><strong className="px-2 text-pine">{selected.length} selected</strong><button type="button" onClick={() => void updateManyFactbookEntries(userId, selected.map((entry) => entry.id), { bookmarked: true }).then(onRefresh)} className="rounded-lg bg-white px-3 py-2 font-bold">Bookmark</button><button type="button" onClick={() => { const name = window.prompt(`Collection name:\n${collections.map((c) => c.name).join('\n')}`)?.trim(); const collection = collections.find((c) => c.name.toLocaleLowerCase() === name?.toLocaleLowerCase()); if (collection) void setCollectionEntries(userId, collection.id, [...new Set([...(collection.entry_ids ?? []), ...selected.map((entry) => entry.id)])]).then(onRefresh) }} className="rounded-lg bg-white px-3 py-2 font-bold">Add to collection</button><button type="button" onClick={() => { const tagName = window.prompt('Tag to add:')?.trim(); if (tagName) void Promise.all(selected.map((entry) => saveFactbookEntry(userId, { ...entry, tags: [...new Set([...entry.tags, tagName])] }))).then(onRefresh) }} className="rounded-lg bg-white px-3 py-2 font-bold">Tag</button><button type="button" onClick={() => { const categoryName = window.prompt(`Move to category (leave blank for Uncategorised):\n${categories.map((category) => category.name).join('\n')}`); if (categoryName === null) return; const category = categories.find((item) => item.name.toLocaleLowerCase() === categoryName.trim().toLocaleLowerCase()); if (categoryName.trim() && !category) { window.alert('No matching category was found.'); return } void updateManyFactbookEntries(userId, selected.map((entry) => entry.id), { category_id: category?.id ?? null, subject_id: category?.subject_id ?? selected[0]?.subject_id }).then(onRefresh) }} className="rounded-lg bg-white px-3 py-2 font-bold">Move</button><button type="button" onClick={() => void Promise.all(selected.map((entry) => duplicateFactbookEntry(userId, entry))).then(onRefresh)} className="rounded-lg bg-white px-3 py-2 font-bold">Copy</button><button type="button" onClick={() => void onPrint(selected)} className="rounded-lg bg-white px-3 py-2 font-bold">Print</button><button type="button" onClick={() => downloadFile('selected-factbook-entries.md', selected.map(entryToMarkdown).join('\n---\n'), 'text/markdown')} className="rounded-lg bg-white px-3 py-2 font-bold">Export</button><button type="button" onClick={() => void updateManyFactbookEntries(userId, selected.map((entry) => entry.id), { archived_at: new Date().toISOString() }).then(onRefresh)} className="rounded-lg bg-white px-3 py-2 font-bold">Archive</button><button type="button" onClick={() => { if (window.confirm(`Move ${selected.length} entries to Trash?`)) void updateManyFactbookEntries(userId, selected.map((entry) => entry.id), { deleted_at: new Date().toISOString() }).then(onRefresh) }} className="rounded-lg bg-white px-3 py-2 font-bold text-red-700">Trash</button><button type="button" onClick={onClear} className="rounded-lg p-2" aria-label="Clear selection"><X className="h-4 w-4" /></button></div>
}

function FilterPanel({ filters, onFilters, mobile = false }: { filters: FactbookFilters; onFilters(filters: FactbookFilters): void; mobile?: boolean }) {
  return <aside className={`${mobile ? 'block' : 'hidden lg:sticky lg:top-28 lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto'} rounded-2xl border bg-white p-4`}><h2 className="flex items-center gap-2 text-sm font-bold text-pine"><Filter className="h-4 w-4" /> Filter entries</h2><div className="mt-4 space-y-3"><label className="block text-xs font-bold">Entry type<select value={filters.entryType ?? ''} onChange={(e) => onFilters({ ...filters, entryType: e.target.value as FactbookEntryType | '' })} className={`${inputClass} mt-1`}><option value="">All types</option>{ENTRY_TYPE_DEFINITIONS.map((definition) => <option key={definition.type} value={definition.type}>{definition.label}</option>)}</select></label><label className="block text-xs font-bold">Tag<input value={filters.tag ?? ''} onChange={(e) => onFilters({ ...filters, tag: e.target.value })} className={`${inputClass} mt-1`} /></label><label className="block text-xs font-bold">Importance<select value={filters.importance ?? ''} onChange={(e) => onFilters({ ...filters, importance: e.target.value as FactbookFilters['importance'] })} className={`${inputClass} mt-1`}><option value="">All</option><option value="normal">Normal</option><option value="important">Important</option><option value="very-important">Very Important</option><option value="must-revise">Must Revise</option></select></label><label className="block text-xs font-bold">Revision<select value={filters.revisionStatus ?? ''} onChange={(e) => onFilters({ ...filters, revisionStatus: e.target.value as FactbookFilters['revisionStatus'] })} className={`${inputClass} mt-1`}><option value="">All</option><option value="not-reviewed">Not Reviewed</option><option value="learning">Learning</option><option value="revised-once">Revised Once</option><option value="well-prepared">Well Prepared</option></select></label><label className="block text-xs font-bold">Sources<select value={filters.sourceAvailability ?? ''} onChange={(e) => onFilters({ ...filters, sourceAvailability: e.target.value as FactbookFilters['sourceAvailability'] })} className={`${inputClass} mt-1`}><option value="">Any</option><option value="with-source">With source</option><option value="without-source">Without source</option></select></label><label className="block text-xs font-bold">Created after<input type="date" value={filters.createdAfter ?? ''} onChange={(e) => onFilters({ ...filters, createdAfter: e.target.value })} className={`${inputClass} mt-1`} /></label><label className="block text-xs font-bold">Edited after<input type="date" value={filters.editedAfter ?? ''} onChange={(e) => onFilters({ ...filters, editedAfter: e.target.value })} className={`${inputClass} mt-1`} /></label><button type="button" onClick={() => onFilters({})} className="min-h-10 w-full rounded-lg border text-xs font-bold text-pine">Clear filters</button></div></aside>
}

function CollectionsView({ collections, activeCollection, collectionEntries, userId, onRefresh, onActivate, onOpenEntry, onHistory, onPrint, onNotice }: { collections: FactbookCollection[]; activeCollection?: FactbookCollection; collectionEntries: FactbookEntry[]; userId: string; onRefresh(): Promise<void>; onActivate(collection: FactbookCollection): void; onOpenEntry(entry: FactbookEntry): void; onHistory(entry: FactbookEntry): void; onPrint(entries: FactbookEntry[]): Promise<void>; onNotice(text: string, tone?: NonNullable<Notice>['tone']): void }) {
  return <div className="mx-auto max-w-7xl px-4 py-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-2xl font-bold text-pine">Collections</h2><p className="mt-1 text-sm text-muted-foreground">Collections reference original entries, so edits stay in sync everywhere.</p></div><button type="button" onClick={() => { const name = window.prompt('Collection name:')?.trim(); if (name) void createFactbookCollection(userId, name).then(onRefresh).catch((e) => onNotice(e.message, 'error')) }} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-pine px-4 text-xs font-bold text-white"><Plus className="h-4 w-4" /> New Collection</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{collections.map((collection) => <button key={collection.id} type="button" onClick={() => onActivate(collection)} className={`rounded-2xl border bg-white p-5 text-left shadow-sm ${activeCollection?.id === collection.id ? 'border-emerald-600 ring-2 ring-emerald-600/10' : ''}`}><BookOpen className="h-5 w-5 text-amber-700" /><h3 className="mt-3 font-bold text-pine">{collection.name}</h3><p className="mt-1 text-xs text-muted-foreground">{collection.entry_ids?.length ?? 0} referenced entries</p></button>)}</div>{activeCollection && <section className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-bold text-pine">{activeCollection.name}</h2><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { const name = window.prompt('Rename collection:', activeCollection.name)?.trim(); if (name) void updateFactbookCollection(userId, activeCollection.id, { name }).then(onRefresh).catch((e) => onNotice(e.message, 'error')) }} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold"><Edit3 className="mr-1 inline h-4 w-4" /> Rename</button><button type="button" onClick={() => void updateFactbookCollection(userId, activeCollection.id, { archived_at: new Date().toISOString() }).then(onRefresh).catch((e) => onNotice(e.message, 'error'))} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold"><Archive className="mr-1 inline h-4 w-4" /> Archive</button><button type="button" onClick={() => { if (window.confirm(`Move “${activeCollection.name}” to Trash? Entries will not be deleted.`)) void updateFactbookCollection(userId, activeCollection.id, { deleted_at: new Date().toISOString() }).then(onRefresh).catch((e) => onNotice(e.message, 'error')) }} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold text-red-700"><Trash2 className="mr-1 inline h-4 w-4" /> Trash</button><button type="button" onClick={() => void onPrint(collectionEntries)} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold"><Printer className="mr-1 inline h-4 w-4" /> Print</button><button type="button" onClick={() => downloadFile(`${slug(activeCollection.name)}.md`, collectionEntries.map(entryToMarkdown).join('\n---\n'), 'text/markdown')} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold"><Download className="mr-1 inline h-4 w-4" /> Export</button></div></div><div className="mt-4 grid gap-4 lg:grid-cols-2">{collectionEntries.map((entry, index) => <EntryCard key={entry.id} entry={entry} selected={false} selectable={false} view="cards" query="" revealed showSourceReminder={false} onSelect={() => undefined} onReveal={() => undefined} onEdit={() => onOpenEntry(entry)} onHistory={() => onHistory(entry)} onDuplicate={() => void duplicateFactbookEntry(userId, entry).then(onRefresh)} onBookmark={() => void updateFactbookEntry(userId, entry.id, { bookmarked: !entry.bookmarked }).then(onRefresh)} onArchive={() => void updateFactbookEntry(userId, entry.id, { archived_at: new Date().toISOString() }).then(onRefresh)} onDelete={() => { if (window.confirm('Move this entry to Trash?')) void updateFactbookEntry(userId, entry.id, { deleted_at: new Date().toISOString() }).then(onRefresh) }} onPrint={() => void onPrint([entry])} onExport={() => exportEntry(entry)} onMove={(direction) => { const to = index + direction; if (to < 0 || to >= collectionEntries.length) return; const ids = collectionEntries.map((item) => item.id); [ids[index], ids[to]] = [ids[to]!, ids[index]!]; void setCollectionEntries(userId, activeCollection.id, ids).then(async () => { await onRefresh(); onActivate({ ...activeCollection, entry_ids: ids }) }) }} onDrag={() => undefined} onDrop={() => undefined} />)}</div></section>}{collections.length === 0 && <div className="mt-5 rounded-2xl border border-dashed bg-white p-10 text-center"><BookOpen className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-bold text-pine">No custom collections yet</p><p className="mt-1 text-xs text-muted-foreground">Create Essay Evidence, Final Revision, Important Quotations or any collection you need.</p></div>}</div>
}

function SubjectModal({ form, onForm, onCreate, onClose }: { form: { name: string; description: string; icon: string; cover_style: FactbookSubject['cover_style']; accent_color: string; exam_label: string; target_date: string }; onForm(form: { name: string; description: string; icon: string; cover_style: FactbookSubject['cover_style']; accent_color: string; exam_label: string; target_date: string }): void; onCreate(): void; onClose(): void }) {
  return <Modal title="Create New Subject" onClose={onClose}><div className="space-y-4 p-5"><label className="block text-xs font-bold text-pine">Subject name<input value={form.name} onChange={(e) => onForm({ ...form, name: e.target.value })} className={`${inputClass} mt-1`} autoFocus /></label><label className="block text-xs font-bold text-pine">Short description<textarea value={form.description} onChange={(e) => onForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border p-3 text-sm" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-pine">Icon<select value={form.icon} onChange={(e) => onForm({ ...form, icon: e.target.value })} className={`${inputClass} mt-1`}>{subjectIcons.map((icon) => <option key={icon}>{icon}</option>)}</select></label><label className="block text-xs font-bold text-pine">Cover style<select value={form.cover_style} onChange={(e) => onForm({ ...form, cover_style: e.target.value as FactbookSubject['cover_style'] })} className={`${inputClass} mt-1`}><option value="classic">Classic</option><option value="minimal">Minimal</option><option value="academic">Academic</option><option value="linen">Linen</option></select></label><label className="block text-xs font-bold text-pine">Examination or paper label<input value={form.exam_label} onChange={(e) => onForm({ ...form, exam_label: e.target.value })} className={`${inputClass} mt-1`} /></label><label className="block text-xs font-bold text-pine">Target date<input type="date" value={form.target_date} onChange={(e) => onForm({ ...form, target_date: e.target.value })} className={`${inputClass} mt-1`} /></label></div><fieldset><legend className="text-xs font-bold text-pine">Accent colour</legend><div className="mt-2 flex flex-wrap gap-2">{accentColours.map((colour) => <button key={colour} type="button" onClick={() => onForm({ ...form, accent_color: colour })} className={`h-9 w-9 rounded-full border-2 ${form.accent_color === colour ? 'border-slate-900 ring-2 ring-offset-2' : 'border-white'}`} style={{ backgroundColor: colour }} aria-label={`Use ${colour}`} />)}</div></fieldset><button type="button" onClick={onCreate} disabled={!form.name.trim()} className="min-h-11 w-full rounded-xl bg-pine text-sm font-bold text-white disabled:opacity-50">Create Subject</button></div></Modal>
}

function SampleModal({ onClose, onCreate }: { onClose(): void; onCreate(): void }) {
  return <Modal title="Sample Structure" onClose={onClose}><div className="p-5"><p className="text-sm leading-6 text-muted-foreground">This example demonstrates organization only. It will not add any facts or fabricated academic material to your account.</p><div className="mt-4 rounded-xl border bg-white p-4 text-sm"><p className="font-bold text-pine">My Factbooks</p><p className="ml-4 mt-2">↳ Subject: Current Affairs</p><p className="ml-8 mt-2">↳ Category: Climate Change</p><p className="ml-12 mt-2">↳ Subcategory: Pakistan</p><p className="ml-16 mt-2">↳ Subcategory: Floods</p><p className="ml-20 mt-2 font-semibold text-emerald-800">↳ Individual entry: Your own sourced note</p></div><button type="button" onClick={onCreate} className="mt-5 min-h-11 w-full rounded-xl bg-pine text-sm font-bold text-white">Create My First Factbook</button></div></Modal>
}

function ImportModal({ backup, subjects, mode, onMode, onClose, onConfirm }: { backup: FactbookBackup; subjects: FactbookSubject[]; mode: 'new' | 'merge'; onMode(mode: 'new' | 'merge'): void; onClose(): void; onConfirm(): void }) {
  const duplicates = backup.subjects.filter((incoming) => subjects.some((existing) => existing.name.toLocaleLowerCase() === incoming.name.toLocaleLowerCase())).length
  return <Modal title="Validate Factbook Backup" onClose={onClose}><div className="space-y-4 p-5"><div className="grid grid-cols-3 gap-2 text-center"><span className="rounded-xl bg-secondary p-3"><strong className="block text-xl text-pine">{backup.subjects.length}</strong><small>Subjects</small></span><span className="rounded-xl bg-secondary p-3"><strong className="block text-xl text-pine">{backup.categories.length}</strong><small>Categories</small></span><span className="rounded-xl bg-secondary p-3"><strong className="block text-xl text-pine">{backup.entries.length}</strong><small>Entries</small></span></div><p className="text-xs text-muted-foreground">Potential duplicate subjects: {duplicates}. Existing data will not be overwritten.</p><label className="flex items-start gap-2 rounded-xl border p-3 text-sm"><input type="radio" checked={mode === 'new'} onChange={() => onMode('new')} /> <span><strong>Import as new</strong><small className="block text-muted-foreground">Create imported subject copies.</small></span></label><label className="flex items-start gap-2 rounded-xl border p-3 text-sm"><input type="radio" checked={mode === 'merge'} onChange={() => onMode('merge')} /> <span><strong>Merge carefully</strong><small className="block text-muted-foreground">Reuse matching subjects and categories; add entries without replacing existing ones.</small></span></label><button type="button" onClick={onConfirm} className="min-h-11 w-full rounded-xl bg-pine text-sm font-bold text-white">Confirm Import</button></div></Modal>
}

function SettingsPanel({ userId, preferences, onPreferences, onExport, onPrintComplete, onImport, onLoadTrash, trashSubjects, trashCategories, trashCollections, archivedSubjects, archivedCategories, archivedCollections, trashEntries, onRestoreSubject, onRestoreCategory, onRestoreCollection, onRestoreEntry, onPurge, onMergeTags, onDeleteAll }: {
  userId: string; preferences: FactbookPreferences | null; onPreferences(next: FactbookPreferences): Promise<void>; onExport(): Promise<void>; onPrintComplete(): Promise<void>; onImport(backup: FactbookBackup): void; onLoadTrash(): Promise<void>
  trashSubjects: FactbookSubject[]; trashCategories: FactbookCategory[]; trashCollections: FactbookCollection[]; archivedSubjects: FactbookSubject[]; archivedCategories: FactbookCategory[]; archivedCollections: FactbookCollection[]; trashEntries: FactbookEntry[]
  onRestoreSubject(subject: FactbookSubject, archived: boolean): Promise<void>; onRestoreCategory(category: FactbookCategory, archived: boolean): Promise<void>; onRestoreCollection(collection: FactbookCollection, archived: boolean): Promise<void>; onRestoreEntry(entry: FactbookEntry): Promise<void>
  onPurge(table: 'factbook_subjects' | 'factbook_categories' | 'factbook_collections' | 'factbook_entries', id: string): Promise<void>; onMergeTags(from: string, to: string): Promise<void>; onDeleteAll(confirmation: string): Promise<void>
}) {
  const [fromTag, setFromTag] = useState('')
  const [toTag, setToTag] = useState('')
  const [confirmation, setConfirmation] = useState('')
  useEffect(() => { void onLoadTrash() }, [onLoadTrash])
  if (!preferences) return <div className="mx-auto max-w-7xl px-4 py-10" role="status">Loading Factbook settings…</div>
  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-8"><section className="rounded-2xl border bg-white p-5"><h2 className="font-display text-xl font-bold text-pine">Factbook Settings</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Default view<select value={preferences.default_view} onChange={(e) => void onPreferences({ ...preferences, default_view: e.target.value as FactbookView })} className={`${inputClass} mt-1`}><option value="cards">Cards</option><option value="compact">Compact</option><option value="book">Book</option><option value="revision">Revision</option><option value="focus">Focus</option></select></label><label className="text-xs font-bold">Default print layout<select value={preferences.default_print_layout} onChange={(e) => void onPreferences({ ...preferences, default_print_layout: e.target.value as FactbookPreferences['default_print_layout'] })} className={`${inputClass} mt-1`}><option value="compact">Compact</option><option value="standard">Standard</option><option value="spacious">Spacious</option></select></label>{[
    ['source_reminders', 'Show Source Missing reminders'], ['autosave_enabled', 'Autosave while writing'], ['revision_labels', 'Show revision labels'],
  ].map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-semibold"><input type="checkbox" checked={Boolean(preferences[key as keyof FactbookPreferences])} onChange={(e) => void onPreferences({ ...preferences, [key]: e.target.checked })} className="accent-emerald-700" /> {label}</label>)}</div></section><section className="rounded-2xl border bg-white p-5"><h2 className="font-display text-xl font-bold text-pine">Backup & Import</h2><p className="mt-1 text-xs text-muted-foreground">Export structured JSON preserving subjects, nested categories, entries, tags, sources, ordering, bookmarks and collections.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void onExport()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-pine px-4 text-xs font-bold text-white"><FileJson className="h-4 w-4" /> Export complete backup</button><button type="button" onClick={() => void onPrintComplete()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-xs font-bold"><Printer className="h-4 w-4" /> Print complete Factbook</button><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-4 text-xs font-bold"><Import className="h-4 w-4" /> Import backup<input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (!file || file.size > 100 * 1024 * 1024) return; void file.text().then((content) => onImport(validateFactbookBackup(JSON.parse(content)))).catch(() => window.alert('This backup file is invalid or unsupported.')) }} /></label></div></section><section className="rounded-2xl border bg-white p-5"><h2 className="font-display text-xl font-bold text-pine">Manage tags</h2><p className="mt-1 text-xs text-muted-foreground">Merge a duplicate tag into one preferred label.</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input value={fromTag} onChange={(e) => setFromTag(e.target.value)} className={inputClass} placeholder="Duplicate tag" /><input value={toTag} onChange={(e) => setToTag(e.target.value)} className={inputClass} placeholder="Keep as" /><button type="button" disabled={!fromTag.trim() || !toTag.trim()} onClick={() => void onMergeTags(fromTag.trim(), toTag.trim()).then(() => { setFromTag(''); setToTag('') })} className="rounded-lg bg-pine px-4 text-xs font-bold text-white disabled:opacity-50"><Tag className="mr-1 inline h-4 w-4" /> Merge</button></div></section><section className="rounded-2xl border bg-white p-5"><h2 className="font-display text-xl font-bold text-pine">Archived Content</h2><div className="mt-3 space-y-2">{archivedSubjects.map((subject) => <div key={subject.id} className="flex items-center justify-between rounded-xl bg-secondary/50 p-3"><span className="text-sm font-semibold">{subject.name}</span><button type="button" onClick={() => void onRestoreSubject(subject, true)} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-bold"><RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Restore</button></div>)}{archivedCategories.map((category) => <div key={category.id} className="flex items-center justify-between rounded-xl bg-secondary/50 p-3"><span className="text-sm font-semibold">Category: {category.name}</span><button type="button" onClick={() => void onRestoreCategory(category, true)} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-bold"><RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Restore</button></div>)}{archivedCollections.map((collection) => <div key={collection.id} className="flex items-center justify-between rounded-xl bg-secondary/50 p-3"><span className="text-sm font-semibold">Collection: {collection.name}</span><button type="button" onClick={() => void onRestoreCollection(collection, true)} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-bold"><RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Restore</button></div>)}{archivedSubjects.length + archivedCategories.length + archivedCollections.length === 0 && <p className="text-xs text-muted-foreground">No archived subjects, categories or collections.</p>}</div></section><section className="rounded-2xl border bg-white p-5"><h2 className="font-display text-xl font-bold text-pine">Trash</h2><p className="mt-1 text-xs text-muted-foreground">Restore recoverable items or permanently delete them.</p><div className="mt-3 space-y-2">{trashSubjects.map((subject) => <div key={subject.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 p-3"><span className="min-w-0 truncate text-sm font-semibold">Subject: {subject.name}</span><span className="flex gap-1"><button type="button" onClick={() => void onRestoreSubject(subject, false)} className="rounded-lg border bg-white px-2 py-1.5 text-xs font-bold">Restore</button><button type="button" onClick={() => void onPurge('factbook_subjects', subject.id)} className="rounded-lg border bg-white p-2 text-red-700"><Trash2 className="h-3.5 w-3.5" /></button></span></div>)}{trashCategories.map((category) => <div key={category.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 p-3"><span className="min-w-0 truncate text-sm font-semibold">Category: {category.name}</span><span className="flex gap-1"><button type="button" onClick={() => void onRestoreCategory(category, false)} className="rounded-lg border bg-white px-2 py-1.5 text-xs font-bold">Restore tree</button><button type="button" onClick={() => void onPurge('factbook_categories', category.id)} className="rounded-lg border bg-white p-2 text-red-700"><Trash2 className="h-3.5 w-3.5" /></button></span></div>)}{trashCollections.map((collection) => <div key={collection.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 p-3"><span className="min-w-0 truncate text-sm font-semibold">Collection: {collection.name}</span><span className="flex gap-1"><button type="button" onClick={() => void onRestoreCollection(collection, false)} className="rounded-lg border bg-white px-2 py-1.5 text-xs font-bold">Restore</button><button type="button" onClick={() => void onPurge('factbook_collections', collection.id)} className="rounded-lg border bg-white p-2 text-red-700"><Trash2 className="h-3.5 w-3.5" /></button></span></div>)}{trashEntries.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 p-3"><span className="min-w-0 truncate text-sm font-semibold">Entry: {entry.title}</span><span className="flex gap-1"><button type="button" onClick={() => void onRestoreEntry(entry)} className="rounded-lg border bg-white px-2 py-1.5 text-xs font-bold">Restore</button><button type="button" onClick={() => void onPurge('factbook_entries', entry.id)} className="rounded-lg border bg-white p-2 text-red-700"><Trash2 className="h-3.5 w-3.5" /></button></span></div>)}{trashSubjects.length + trashCategories.length + trashCollections.length + trashEntries.length === 0 && <p className="text-xs text-muted-foreground">Trash is empty.</p>}</div></section><section className="rounded-2xl border border-red-200 bg-red-50 p-5"><h2 className="font-display text-xl font-bold text-red-900">Delete All Factbook Data</h2><p className="mt-2 text-xs leading-5 text-red-800">This deletes only your Factbook feature data. It does not delete your CSS VISTA account, mock results or other study progress.</p><label className="mt-4 block text-xs font-bold text-red-900">Type DELETE MY FACTBOOK<input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={`${inputClass} mt-1`} /></label><button type="button" disabled={confirmation !== 'DELETE MY FACTBOOK'} onClick={() => { if (window.confirm('Permanently delete all Factbook data?')) void onDeleteAll(confirmation) }} className="mt-3 min-h-10 rounded-lg bg-red-800 px-4 text-xs font-bold text-white disabled:opacity-40">Delete All Factbook Data</button></section><p className="text-center text-[10px] text-muted-foreground">Private owner scope: {userId.slice(0, 8)}…</p></div>
}
