import { useState } from 'react'
import {
  Archive, ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Download, Folder, FolderPlus,
  MoreHorizontal, Palette, Pencil, Printer, Trash2,
} from 'lucide-react'
import type { FactbookCategory } from './types'

interface CategoryTreeProps {
  categories: FactbookCategory[]
  selectedId: string | null
  onSelect(id: string | null): void
  onCreate(parentId: string | null): void
  onRename(category: FactbookCategory): void
  onDuplicate(category: FactbookCategory): void
  onArchive(category: FactbookCategory): void
  onDelete(category: FactbookCategory): void
  onPrint(category: FactbookCategory): void
  onExport(category: FactbookCategory): void
  onMove(categoryId: string, parentId: string | null): void
  onStyle(category: FactbookCategory): void
  onReorder(category: FactbookCategory, direction: -1 | 1): void
}

export default function CategoryTree(props: CategoryTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const children = (parentId: string | null) => props.categories.filter((category) => category.parent_id === parentId).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
  const toggle = (id: string) => setCollapsed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })

  const renderBranch = (parentId: string | null, depth = 0) => children(parentId).map((category) => {
    const hasChildren = children(category.id).length > 0
    const isCollapsed = collapsed.has(category.id)
    return <li key={category.id} role="treeitem" aria-expanded={hasChildren ? !isCollapsed : undefined} aria-selected={props.selectedId === category.id}>
      <div
        draggable
        onDragStart={() => setDraggedId(category.id)}
        onDragEnd={() => setDraggedId(null)}
        onDragOver={(event) => { if (draggedId && draggedId !== category.id) event.preventDefault() }}
        onDrop={(event) => { event.preventDefault(); if (draggedId && draggedId !== category.id) props.onMove(draggedId, category.id); setDraggedId(null) }}
        className={`group flex min-h-10 items-center gap-1 rounded-lg pr-1 text-sm ${props.selectedId === category.id ? 'bg-emerald-100 text-pine' : 'hover:bg-secondary/70'} ${draggedId === category.id ? 'opacity-50' : ''}`}
        style={{ paddingLeft: `${Math.min(depth, 7) * 14 + 4}px` }}
      >
        <button type="button" onClick={() => hasChildren && toggle(category.id)} className="rounded p-1" aria-label={hasChildren ? `${isCollapsed ? 'Expand' : 'Collapse'} ${category.name}` : undefined} tabIndex={hasChildren ? 0 : -1}>{hasChildren ? (isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <span className="block w-4" />}</button>
        <button type="button" onClick={() => props.onSelect(category.id)} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"><Folder className="h-4 w-4 shrink-0" style={{ color: category.color }} /><span className="truncate font-medium">{category.name}</span><span className="ml-auto rounded-full bg-white/75 px-1.5 text-[10px] font-bold text-muted-foreground">{category.entry_count}</span></button>
        <details className="relative"><summary className="list-none rounded p-1 text-muted-foreground hover:bg-white" aria-label={`Actions for ${category.name}`}><MoreHorizontal className="h-4 w-4" /></summary><div className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border bg-white p-1 shadow-xl">{[
          { label: 'Add subcategory', icon: FolderPlus, action: () => props.onCreate(category.id) },
          { label: 'Rename', icon: Pencil, action: () => props.onRename(category) },
          { label: 'Colour & icon', icon: Palette, action: () => props.onStyle(category) },
          { label: 'Duplicate', icon: Copy, action: () => props.onDuplicate(category) },
          { label: 'Move up', icon: ArrowUp, action: () => props.onReorder(category, -1) },
          { label: 'Move down', icon: ArrowDown, action: () => props.onReorder(category, 1) },
          { label: 'Print category', icon: Printer, action: () => props.onPrint(category) },
          { label: 'Export category', icon: Download, action: () => props.onExport(category) },
          { label: 'Archive', icon: Archive, action: () => props.onArchive(category) },
          { label: 'Move to root', icon: ChevronRight, action: () => props.onMove(category.id, null) },
          { label: 'Move to Trash', icon: Trash2, action: () => props.onDelete(category), danger: true },
        ].map((item) => <button key={item.label} type="button" onClick={(event) => { item.action(); event.currentTarget.closest('details')?.removeAttribute('open') }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-secondary ${item.danger ? 'text-red-700' : 'text-slate-700'}`}><item.icon className="h-3.5 w-3.5" /> {item.label}</button>)}</div></details>
      </div>
      {hasChildren && !isCollapsed && <ul role="group">{renderBranch(category.id, depth + 1)}</ul>}
    </li>
  })

  return <nav aria-label="Factbook category navigation"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-800">Category tree</p><button type="button" onClick={() => props.onCreate(null)} className="rounded-lg border p-2 text-pine hover:bg-emerald-50" aria-label="Create main category"><FolderPlus className="h-4 w-4" /></button></div><button type="button" onClick={() => props.onSelect(null)} className={`mb-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-semibold ${props.selectedId === null ? 'bg-emerald-100 text-pine' : 'hover:bg-secondary/70'}`}><Folder className="h-4 w-4" /> All entries</button>{props.categories.length ? <ul role="tree" aria-label="Categories" className="space-y-0.5">{renderBranch(null)}</ul> : <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Create a category to start organizing this subject.</div>}</nav>
}
