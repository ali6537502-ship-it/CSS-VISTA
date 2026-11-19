import DOMPurify from 'dompurify'
import { hostingerRequest } from '@/lib/hostingerApi'

export type NoteFolder = {
  id: string; parent_id: string | null; name: string; depth: number
  deleted_at: string | null; updated_at: string
}
export type NoteSummary = {
  id: string; folder_id: string | null; title: string; pinned: boolean
  deleted_at: string | null; created_at: string; updated_at: string
}
export type NotePageMeta = {
  id: string; position: number; version: number; deleted_at: string | null; updated_at: string
}
export type NoteDocument = { note: NoteSummary; pages: NotePageMeta[] }
export type NoteList = { ok: boolean; folders: NoteFolder[]; notes: NoteSummary[]; has_more: boolean; next_offset: number }
export type NotePage = { id: string; note_id: string; content_html: string; version: number; position: number; deleted_at: string | null; updated_at: string }
export type NoteRevision = { version: number; created_at: string }
export type LocalDraft = { user: string; note: string; page: string; html: string; version: number; changed_at: number }

export const PAGE_BYTES = 2097152
const ALLOWED_TAGS = [
  'p','div','br','strong','b','em','i','u','s','strike','span','font','h1','h2','h3','h4','h5','h6',
  'blockquote','ul','ol','li','a','hr','table','thead','tbody','tfoot','tr','td','th','sub','sup','mark','pre','code'
]
const ALLOWED_ATTR = ['href','title','color','face','size','bgcolor','style','colspan','rowspan']
const TEXT_COLORS = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|transparent|black|white|red|blue|green|orange|purple|yellow|gray|grey|navy|maroon|teal|olive)$/i
const FAMILY = /^(Arial|Georgia|Verdana|Tahoma|Times New Roman|Courier New|Trebuchet MS|system-ui)(,\s*(Arial|Georgia|Verdana|Tahoma|Times New Roman|Courier New|Trebuchet MS|system-ui))*$/i

/** Explicitly allow only harmless formatting; never honor URLs or unknown CSS declarations. */
export function sanitizeNoteHtml(html: string): string {
  if (typeof window === 'undefined') return ''
  const safe = DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false })
  const template = document.createElement('template')
  template.innerHTML = safe
  template.content.querySelectorAll<HTMLElement>('[style]').forEach(node => {
    const raw = node.getAttribute('style') || ''
    const result: string[] = []
    raw.split(';').forEach(part => {
      const at = part.indexOf(':')
      if (at < 0) return
      const prop = part.slice(0,at).trim().toLowerCase()
      const value = part.slice(at+1).trim()
      if ((prop === 'color' || prop === 'background-color') && TEXT_COLORS.test(value)) result.push(prop+':'+value)
      if (prop === 'font-family' && FAMILY.test(value)) result.push(prop+':'+value)
      if (prop === 'font-size' && /^\d+(?:\.\d+)?px$/.test(value) && parseFloat(value) >= 8 && parseFloat(value) <= 72) result.push(prop+':'+value)
      if (prop === 'text-align' && /^(left|right|center|justify)$/.test(value)) result.push(prop+':'+value)
    })
    if (result.length) node.setAttribute('style',result.join(';'))
    else node.removeAttribute('style')
  })
  template.content.querySelectorAll('a').forEach(link => {
    const url = link.getAttribute('href') || ''
    if (!/^(https?:\/\/|mailto:|#)/i.test(url)) link.removeAttribute('href')
    else link.setAttribute('rel','noopener noreferrer')
  })
  // DOMPurify sanitizes markup; the additional pass only narrows style/link values.
  return template.innerHTML
}

export function noteText(html: string): string {
  if (typeof document === 'undefined') return ''
  const node = document.createElement('div')
  node.innerHTML = sanitizeNoteHtml(html)
  return (node.textContent || '').trim()
}
export function noteBytes(text: string): number { return new TextEncoder().encode(text).length }
export const notesRequest = <T>(query: string) => hostingerRequest<T>('student/notes.php'+query)
export const notesWrite = <T>(body: Record<string, unknown>) =>
  hostingerRequest<T>('student/notes.php', { method:'POST', body:JSON.stringify(body) })

const DRAFT_DB = 'cssvista-personal-notes-drafts'
const STORE = 'drafts'
const keyOf = (user: string, note: string, page: string) => user+':'+note+':'+page

async function withDraftStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  if (typeof indexedDB === 'undefined') return null
  return new Promise<T | null>(resolve => {
    let resolved=false
    const finish=(v:T|null)=>{ if (!resolved) {resolved=true;resolve(v)} }
    try {
      const opening=indexedDB.open(DRAFT_DB,1)
      opening.onupgradeneeded=()=>{if(!opening.result.objectStoreNames.contains(STORE)) opening.result.createObjectStore(STORE)}
      opening.onerror=()=>finish(null)
      opening.onsuccess=()=>{
        const db=opening.result
        try {
          const transaction=db.transaction(STORE,mode)
          const request=fn(transaction.objectStore(STORE))
          let value:T|null=null
          request.onsuccess=()=>{value=request.result ?? null}
          request.onerror=()=>finish(null)
          transaction.onabort=()=>{db.close();finish(null)}
          transaction.onerror=()=>{db.close();finish(null)}
          transaction.oncomplete=()=>{db.close();finish(value)}
        } catch {db.close();finish(null)}
      }
    } catch {finish(null)}
  })
}

export async function readLocalDraft(user: string, note: string, page: string): Promise<LocalDraft | null> {
  return withDraftStore<LocalDraft>('readonly',store=>store.get(keyOf(user,note,page)))
}
export async function writeLocalDraft(draft: LocalDraft): Promise<boolean> {
  const result=await withDraftStore<IDBValidKey>('readwrite',store=>store.put(draft,keyOf(draft.user,draft.note,draft.page)))
  return result !== null
}
export async function clearLocalDraft(user:string,note:string,page:string):Promise<void> {
  await withDraftStore('readwrite',store=>store.delete(keyOf(user,note,page)))
}
export function localDraftKey(user:string,note:string,page:string) { return keyOf(user,note,page) }
