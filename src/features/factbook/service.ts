import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import { createEmptyContent } from './entryTypes'
import { safeWebUrl, sanitizePlainText, sanitizeRichText } from './safety'
import type {
  FactbookBackup, FactbookCategory, FactbookCollection, FactbookEntry,
  FactbookEntryDraft, FactbookFilters, FactbookMedia, FactbookPreferences,
  FactbookRevision, FactbookSource, FactbookSubject,
} from './types'

const PAGE_SIZE = 60
const DEFAULT_PREFERENCES: Omit<FactbookPreferences, 'user_id'> = {
  default_view: 'cards',
  default_print_layout: 'standard',
  source_reminders: true,
  autosave_enabled: true,
  revision_labels: true,
}

type DatabaseRow = Record<string, unknown>

function asRows(value: unknown): DatabaseRow[] {
  return Array.isArray(value) ? value as DatabaseRow[] : []
}

function messageFrom(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    if (/row-level security|permission denied/i.test(error.message)) return 'Your account is not allowed to access this Factbook item.'
    if (/duplicate key/i.test(error.message)) return 'An item with the same protected value already exists.'
    return error.message
  }
  return fallback
}

async function requireClient(): Promise<SupabaseClient> {
  const client = await getSupabaseClient()
  if (!client) throw new Error('Factbook cloud storage is not configured.')
  return client
}

function cleanContent(value: unknown): unknown {
  if (typeof value === 'string') return sanitizePlainText(value)
  if (Array.isArray(value)) return value.slice(0, 500).map(cleanContent)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 300).map(([key, item]) => [sanitizePlainText(key, 80), cleanContent(item)]))
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value
  return ''
}

function cleanEntryContent(draft: FactbookEntryDraft): Record<string, unknown> {
  const cleaned = cleanContent(draft.content) as Record<string, unknown>
  if (draft.entry_type === 'rich-note' && typeof cleaned.html === 'string') cleaned.html = sanitizeRichText(cleaned.html)
  return cleaned
}

function cleanSource(source: FactbookSource, position: number) {
  return {
    title: sanitizePlainText(source.title, 300),
    author_organization: sanitizePlainText(source.author_organization, 240),
    publication_year: sanitizePlainText(source.publication_year, 40),
    page_number: sanitizePlainText(source.page_number, 60),
    web_address: safeWebUrl(source.web_address),
    accessed_on: source.accessed_on || null,
    verification_note: sanitizePlainText(source.verification_note, 2000),
    position,
  }
}

function normalizeSource(row: DatabaseRow): FactbookSource {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    author_organization: String(row.author_organization ?? ''),
    publication_year: String(row.publication_year ?? ''),
    page_number: String(row.page_number ?? ''),
    web_address: String(row.web_address ?? ''),
    accessed_on: row.accessed_on ? String(row.accessed_on) : null,
    verification_note: String(row.verification_note ?? ''),
    position: Number(row.position ?? 0),
  }
}

function normalizeEntry(
  row: DatabaseRow,
  sources: FactbookSource[] = [],
  tags: string[] = [],
  media: FactbookMedia[] = [],
): FactbookEntry {
  return {
    id: String(row.id), user_id: String(row.user_id), subject_id: String(row.subject_id),
    category_id: row.category_id ? String(row.category_id) : null,
    title: String(row.title ?? ''), entry_type: row.entry_type as FactbookEntry['entry_type'],
    content: (row.content && typeof row.content === 'object' ? row.content : {}) as Record<string, unknown>,
    importance: row.importance as FactbookEntry['importance'],
    revision_status: row.revision_status as FactbookEntry['revision_status'],
    bookmarked: Boolean(row.bookmarked), personal_remarks: String(row.personal_remarks ?? ''),
    position: Number(row.position ?? 0), archived_at: row.archived_at ? String(row.archived_at) : null,
    deleted_at: row.deleted_at ? String(row.deleted_at) : null,
    created_at: String(row.created_at), updated_at: String(row.updated_at), sources, tags, media,
  }
}

export async function loadFactbookSubjects(userId: string, mode: 'active' | 'archived' | 'trash' = 'active') {
  const client = await requireClient()
  let query = client.from('factbook_subjects').select('*').eq('user_id', userId).order('position').order('updated_at', { ascending: false })
  if (mode === 'trash') query = query.not('deleted_at', 'is', null)
  else {
    query = query.is('deleted_at', null)
    query = mode === 'archived' ? query.not('archived_at', 'is', null) : query.is('archived_at', null)
  }
  const { data, error } = await query
  if (error) throw new Error(messageFrom(error, 'Subjects could not be loaded.'))
  return asRows(data) as unknown as FactbookSubject[]
}

export async function loadFactbookCategories(userId: string, subjectId: string, mode: 'active' | 'archived' | 'trash' = 'active') {
  const client = await requireClient()
  let query = client.from('factbook_categories').select('*').eq('user_id', userId).eq('subject_id', subjectId).order('position').order('name')
  if (mode === 'trash') query = query.not('deleted_at', 'is', null)
  else {
    query = query.is('deleted_at', null)
    query = mode === 'archived' ? query.not('archived_at', 'is', null) : query.is('archived_at', null)
  }
  const { data, error } = await query
  if (error) throw new Error(messageFrom(error, 'Categories could not be loaded.'))
  return asRows(data) as unknown as FactbookCategory[]
}

export async function loadFactbookCategoriesForUser(userId: string, mode: 'active' | 'archived' | 'trash' = 'active') {
  const client = await requireClient()
  let query = client.from('factbook_categories').select('*').eq('user_id', userId).order('position').order('name')
  if (mode === 'trash') query = query.not('deleted_at', 'is', null)
  else {
    query = query.is('deleted_at', null)
    query = mode === 'archived' ? query.not('archived_at', 'is', null) : query.is('archived_at', null)
  }
  const { data, error } = await query
  if (error) throw new Error(messageFrom(error, 'Categories could not be loaded.'))
  return asRows(data) as unknown as FactbookCategory[]
}

function categoryTreeIds(rootId: string, categories: FactbookCategory[]) {
  const ids = new Set([rootId])
  let changed = true
  while (changed) {
    changed = false
    categories.forEach((category) => {
      if (category.parent_id && ids.has(category.parent_id) && !ids.has(category.id)) {
        ids.add(category.id)
        changed = true
      }
    })
  }
  return [...ids]
}

export async function trashFactbookCategoryTree(userId: string, rootId: string, categories: FactbookCategory[]) {
  const client = await requireClient()
  const ids = categoryTreeIds(rootId, categories)
  const deletedAt = new Date().toISOString()
  const [{ error: categoryError }, { error: entryError }] = await Promise.all([
    client.from('factbook_categories').update({ deleted_at: deletedAt }).eq('user_id', userId).in('id', ids),
    client.from('factbook_entries').update({ deleted_at: deletedAt }).eq('user_id', userId).in('category_id', ids).is('deleted_at', null),
  ])
  if (categoryError || entryError) throw new Error(messageFrom(categoryError ?? entryError, 'The category tree could not be moved to Trash.'))
}

export async function restoreFactbookCategoryTree(userId: string, rootId: string, categories: FactbookCategory[]) {
  const client = await requireClient()
  const ids = categoryTreeIds(rootId, categories)
  const deletedAt = categories.find((category) => category.id === rootId)?.deleted_at
  if (!deletedAt) throw new Error('This category tree is not currently in Trash.')
  const [{ error: categoryError }, { error: entryError }] = await Promise.all([
    client.from('factbook_categories').update({ deleted_at: null }).eq('user_id', userId).in('id', ids).eq('deleted_at', deletedAt),
    client.from('factbook_entries').update({ deleted_at: null }).eq('user_id', userId).in('category_id', ids).eq('deleted_at', deletedAt),
  ])
  if (categoryError || entryError) throw new Error(messageFrom(categoryError ?? entryError, 'The category tree could not be restored.'))
}

async function hydrateEntries(client: SupabaseClient, rows: DatabaseRow[]): Promise<FactbookEntry[]> {
  const ids = rows.map((row) => String(row.id)).filter(Boolean)
  if (!ids.length) return []
  const [sourceResult, tagResult, mediaResult] = await Promise.all([
    client.from('factbook_sources').select('*').in('entry_id', ids).order('position'),
    client.from('factbook_entry_tags').select('entry_id, tag:factbook_tags(name)').in('entry_id', ids),
    client.from('factbook_media').select('*').in('entry_id', ids),
  ])
  if (sourceResult.error) throw new Error(messageFrom(sourceResult.error, 'Entry sources could not be loaded.'))
  if (tagResult.error) throw new Error(messageFrom(tagResult.error, 'Entry tags could not be loaded.'))
  if (mediaResult.error) throw new Error(messageFrom(mediaResult.error, 'Entry images could not be loaded.'))

  const sources = new Map<string, FactbookSource[]>()
  asRows(sourceResult.data).forEach((row) => {
    const entryId = String(row.entry_id)
    sources.set(entryId, [...(sources.get(entryId) ?? []), normalizeSource(row)])
  })
  const tags = new Map<string, string[]>()
  asRows(tagResult.data).forEach((row) => {
    const relation = row.tag
    const tag = Array.isArray(relation) ? relation[0] : relation
    if (!tag || typeof tag !== 'object' || !('name' in tag)) return
    const entryId = String(row.entry_id)
    tags.set(entryId, [...(tags.get(entryId) ?? []), String(tag.name)])
  })
  const rawMedia = asRows(mediaResult.data)
  const paths = rawMedia.map((row) => String(row.storage_path)).filter(Boolean)
  const signedByPath = new Map<string, string>()
  if (paths.length) {
    const { data } = await client.storage.from('factbook-media').createSignedUrls(paths, 60 * 60)
    data?.forEach((item) => { if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl) })
  }
  const media = new Map<string, FactbookMedia[]>()
  rawMedia.forEach((row) => {
    const entryId = String(row.entry_id ?? '')
    const item = {
      id: String(row.id), entry_id: entryId || null, storage_path: String(row.storage_path),
      file_name: String(row.file_name), mime_type: String(row.mime_type), byte_size: Number(row.byte_size),
      width: row.width === null ? null : Number(row.width), height: row.height === null ? null : Number(row.height),
      caption: String(row.caption ?? ''), alt_text: String(row.alt_text ?? ''), source: String(row.source ?? ''),
      signed_url: signedByPath.get(String(row.storage_path)),
    }
    media.set(entryId, [...(media.get(entryId) ?? []), item])
  })
  return rows.map((row) => normalizeEntry(row, sources.get(String(row.id)), tags.get(String(row.id)), media.get(String(row.id))))
}

export async function loadFactbookEntries(userId: string, filters: FactbookFilters = {}) {
  const client = await requireClient()
  const pageSize = Math.min(Math.max(filters.pageSize ?? PAGE_SIZE, 1), 100)
  const page = Math.max(filters.page ?? 0, 0)
  let query = client.from('factbook_entries').select('*', { count: 'exact' }).eq('user_id', userId)
  query = filters.trashed ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null)
  if (!filters.trashed) query = filters.archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null)
  if (filters.subjectId) query = query.eq('subject_id', filters.subjectId)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.entryType) query = query.eq('entry_type', filters.entryType)
  if (filters.importance) query = query.eq('importance', filters.importance)
  if (filters.revisionStatus) query = query.eq('revision_status', filters.revisionStatus)
  if (filters.bookmarked !== undefined) query = query.eq('bookmarked', filters.bookmarked)
  if (filters.createdAfter) query = query.gte('created_at', filters.createdAfter)
  if (filters.editedAfter) query = query.gte('updated_at', filters.editedAfter)
  if (filters.sourceAvailability === 'with-source') query = query.gt('source_count', 0)
  if (filters.sourceAvailability === 'without-source') query = query.eq('source_count', 0)
  if (filters.query?.trim()) query = query.ilike('search_text', `%${filters.query.trim().slice(0, 120)}%`)
  if (filters.tag) {
    const { data: tagRows } = await client.from('factbook_tags').select('id').eq('user_id', userId).ilike('name', filters.tag).limit(1)
    const tagId = asRows(tagRows)[0]?.id
    if (!tagId) return { entries: [], count: 0, hasMore: false }
    const { data: links } = await client.from('factbook_entry_tags').select('entry_id').eq('user_id', userId).eq('tag_id', String(tagId))
    const ids = asRows(links).map((row) => String(row.entry_id))
    if (!ids.length) return { entries: [], count: 0, hasMore: false }
    query = query.in('id', ids)
  }
  query = query.order(filters.query ? 'updated_at' : 'position', { ascending: filters.query ? false : true })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  const { data, error, count } = await query
  if (error) throw new Error(messageFrom(error, 'Entries could not be loaded.'))
  const entries = await hydrateEntries(client, asRows(data))
  return { entries, count: count ?? entries.length, hasMore: (count ?? 0) > (page + 1) * pageSize }
}

export async function loadFactbookEntriesByIds(userId: string, ids: string[]) {
  if (!ids.length) return []
  const client = await requireClient()
  const rows: DatabaseRow[] = []
  for (let index = 0; index < ids.length; index += 100) {
    const batch = ids.slice(index, index + 100)
    const { data, error } = await client.from('factbook_entries').select('*').eq('user_id', userId).in('id', batch)
    if (error) throw new Error(messageFrom(error, 'Collection entries could not be loaded.'))
    rows.push(...asRows(data))
  }
  const entries = await hydrateEntries(client, rows)
  const order = new Map(ids.map((id, index) => [id, index]))
  return entries.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}

export async function createFactbookSubject(userId: string, input: Partial<FactbookSubject>) {
  const client = await requireClient()
  const name = sanitizePlainText(input.name?.trim() ?? '', 120)
  if (!name) throw new Error('Enter a subject name before creating it.')
  const { data, error } = await client.from('factbook_subjects').insert({
    user_id: userId, name, description: sanitizePlainText(input.description ?? '', 1000),
    icon: sanitizePlainText(input.icon ?? 'book', 40), cover_style: input.cover_style ?? 'classic',
    accent_color: input.accent_color ?? '#0f6b4f', exam_label: sanitizePlainText(input.exam_label ?? '', 80),
    target_date: input.target_date || null, position: input.position ?? 0,
  }).select('*').single()
  if (error) throw new Error(messageFrom(error, 'The subject could not be created.'))
  return data as FactbookSubject
}

export async function updateFactbookSubject(userId: string, id: string, patch: Partial<FactbookSubject>) {
  const client = await requireClient()
  const safePatch: DatabaseRow = {}
  if (patch.name !== undefined) safePatch.name = sanitizePlainText(patch.name.trim(), 120)
  if (patch.description !== undefined) safePatch.description = sanitizePlainText(patch.description, 1000)
  for (const key of ['icon', 'cover_style', 'accent_color', 'exam_label', 'target_date', 'position', 'archived_at', 'deleted_at'] as const) {
    if (patch[key] !== undefined) safePatch[key] = patch[key]
  }
  const { data, error } = await client.from('factbook_subjects').update(safePatch).eq('user_id', userId).eq('id', id).select('*').single()
  if (error) throw new Error(messageFrom(error, 'The subject could not be updated.'))
  return data as FactbookSubject
}

export async function createFactbookCategory(userId: string, subjectId: string, input: Partial<FactbookCategory>) {
  const client = await requireClient()
  const name = sanitizePlainText(input.name?.trim() ?? '', 140)
  if (!name) throw new Error('Enter a category name before creating it.')
  const { data, error } = await client.from('factbook_categories').insert({
    user_id: userId, subject_id: subjectId, parent_id: input.parent_id || null, name,
    icon: sanitizePlainText(input.icon ?? 'folder', 40), color: input.color ?? '#0f6b4f', position: input.position ?? 0,
  }).select('*').single()
  if (error) throw new Error(messageFrom(error, 'The category could not be created.'))
  return data as FactbookCategory
}

export async function updateFactbookCategory(userId: string, id: string, patch: Partial<FactbookCategory>) {
  const client = await requireClient()
  const safePatch: DatabaseRow = {}
  if (patch.name !== undefined) safePatch.name = sanitizePlainText(patch.name.trim(), 140)
  for (const key of ['parent_id', 'icon', 'color', 'position', 'archived_at', 'deleted_at'] as const) {
    if (patch[key] !== undefined) safePatch[key] = patch[key]
  }
  const { data, error } = await client.from('factbook_categories').update(safePatch).eq('user_id', userId).eq('id', id).select('*').single()
  if (error) throw new Error(messageFrom(error, 'The category could not be updated.'))
  return data as FactbookCategory
}

export async function duplicateFactbookSubject(userId: string, subject: FactbookSubject) {
  const copy = await createFactbookSubject(userId, {
    ...subject, id: undefined, name: `${subject.name} (Copy)`, position: subject.position + 1,
    category_count: 0, entry_count: 0, archived_at: null, deleted_at: null,
  })
  const categories = await loadFactbookCategories(userId, subject.id)
  const categoryMap = new Map<string, string>()
  const pending = [...categories]
  for (let pass = 0; pass <= categories.length && pending.length; pass += 1) {
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const category = pending[index]
      if (!category) continue
      if (category.parent_id && !categoryMap.has(category.parent_id)) continue
      const created = await createFactbookCategory(userId, copy.id, {
        ...category, id: undefined, parent_id: category.parent_id ? categoryMap.get(category.parent_id) : null,
      })
      categoryMap.set(category.id, created.id)
      pending.splice(index, 1)
    }
  }
  let page = 0
  let hasMore = true
  while (hasMore) {
    const result = await loadFactbookEntries(userId, { subjectId: subject.id, page, pageSize: 100 })
    for (const entry of result.entries) {
      await saveFactbookEntry(userId, {
        ...entry, id: undefined, title: entry.title, subject_id: copy.id,
        category_id: entry.category_id ? categoryMap.get(entry.category_id) ?? null : null,
      })
    }
    hasMore = result.hasMore
    page += 1
  }
  return copy
}

export async function duplicateFactbookCategory(userId: string, category: FactbookCategory, categories: FactbookCategory[]) {
  const descendants = new Set<string>([category.id])
  let changed = true
  while (changed) {
    changed = false
    categories.forEach((item) => { if (item.parent_id && descendants.has(item.parent_id) && !descendants.has(item.id)) { descendants.add(item.id); changed = true } })
  }
  const categoryMap = new Map<string, string>()
  const subtree = categories.filter((item) => descendants.has(item.id))
  const pending = [...subtree]
  for (let pass = 0; pass <= subtree.length && pending.length; pass += 1) {
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const item = pending[index]
      if (!item) continue
      const isRoot = item.id === category.id
      if (!isRoot && item.parent_id && !categoryMap.has(item.parent_id)) continue
      const created = await createFactbookCategory(userId, item.subject_id, {
        ...item, id: undefined, name: isRoot ? `${item.name} (Copy)` : item.name,
        parent_id: isRoot ? item.parent_id : item.parent_id ? categoryMap.get(item.parent_id) : null,
        position: isRoot ? item.position + 1 : item.position,
      })
      categoryMap.set(item.id, created.id)
      pending.splice(index, 1)
    }
  }
  let page = 0
  let hasMore = true
  while (hasMore) {
    const result = await loadFactbookEntries(userId, { subjectId: category.subject_id, page, pageSize: 100 })
    for (const entry of result.entries.filter((item) => item.category_id && descendants.has(item.category_id))) {
      await saveFactbookEntry(userId, { ...entry, id: undefined, category_id: entry.category_id ? categoryMap.get(entry.category_id) ?? null : null })
    }
    hasMore = result.hasMore
    page += 1
  }
  return categoryMap.get(category.id) ?? null
}

async function replaceEntrySources(client: SupabaseClient, userId: string, entryId: string, sources: FactbookSource[]) {
  const { error: deleteError } = await client.from('factbook_sources').delete().eq('user_id', userId).eq('entry_id', entryId)
  if (deleteError) throw deleteError
  const rows = sources.map(cleanSource).filter((source) => Object.values(source).some(Boolean))
  if (!rows.length) return
  const { error } = await client.from('factbook_sources').insert(rows.map((source) => ({ ...source, user_id: userId, entry_id: entryId })))
  if (error) throw error
}

async function ensureTag(client: SupabaseClient, userId: string, rawName: string) {
  const name = sanitizePlainText(rawName.trim().replace(/^#/, ''), 60)
  if (!name) return null
  const { data: existing } = await client.from('factbook_tags').select('id').eq('user_id', userId).ilike('name', name).limit(1)
  const existingId = asRows(existing)[0]?.id
  if (existingId) return String(existingId)
  const { data, error } = await client.from('factbook_tags').insert({ user_id: userId, name }).select('id').single()
  if (error) {
    const { data: raced } = await client.from('factbook_tags').select('id').eq('user_id', userId).ilike('name', name).limit(1)
    const racedId = asRows(raced)[0]?.id
    if (racedId) return String(racedId)
    throw error
  }
  return String(data.id)
}

async function replaceEntryTags(client: SupabaseClient, userId: string, entryId: string, tags: string[]) {
  const { error: deleteError } = await client.from('factbook_entry_tags').delete().eq('user_id', userId).eq('entry_id', entryId)
  if (deleteError) throw deleteError
  const normalized = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 40)
  const tagIds = (await Promise.all(normalized.map((tag) => ensureTag(client, userId, tag)))).filter((id): id is string => Boolean(id))
  if (!tagIds.length) return
  const { error } = await client.from('factbook_entry_tags').insert(tagIds.map((tagId) => ({ user_id: userId, entry_id: entryId, tag_id: tagId })))
  if (error) throw error
}

export async function saveFactbookEntry(userId: string, draft: FactbookEntryDraft) {
  const client = await requireClient()
  const title = sanitizePlainText(draft.title.trim(), 220)
  if (!title) throw new Error('Add an entry title before saving.')
  if (!draft.subject_id) throw new Error('Choose a subject before saving.')
  const payload = {
    user_id: userId, subject_id: draft.subject_id, category_id: draft.category_id || null,
    title, entry_type: draft.entry_type, content: cleanEntryContent(draft), importance: draft.importance,
    revision_status: draft.revision_status, bookmarked: draft.bookmarked,
    personal_remarks: sanitizePlainText(draft.personal_remarks, 10_000), position: draft.position ?? 0,
  }
  const response = draft.id
    ? await client.from('factbook_entries').update(payload).eq('user_id', userId).eq('id', draft.id).select('*').single()
    : await client.from('factbook_entries').insert(payload).select('*').single()
  if (response.error) throw new Error(messageFrom(response.error, 'The entry could not be saved.'))
  const entryId = String(response.data.id)
  try {
    await Promise.all([
      replaceEntrySources(client, userId, entryId, draft.sources),
      replaceEntryTags(client, userId, entryId, draft.tags),
    ])
  } catch (error) {
    throw new Error(messageFrom(error, 'The entry was saved, but its sources or tags could not be updated.'))
  }
  const [entry] = await hydrateEntries(client, [response.data as DatabaseRow])
  return entry
}

export async function updateFactbookEntry(userId: string, id: string, patch: Partial<FactbookEntry>) {
  const client = await requireClient()
  const allowed: DatabaseRow = {}
  for (const key of ['subject_id', 'category_id', 'importance', 'revision_status', 'bookmarked', 'position', 'archived_at', 'deleted_at'] as const) {
    if (patch[key] !== undefined) allowed[key] = patch[key]
  }
  const { data, error } = await client.from('factbook_entries').update(allowed).eq('user_id', userId).eq('id', id).select('*').single()
  if (error) throw new Error(messageFrom(error, 'The entry could not be updated.'))
  const [entry] = await hydrateEntries(client, [data as DatabaseRow])
  return entry
}

export async function updateManyFactbookEntries(userId: string, ids: string[], patch: Partial<FactbookEntry>) {
  await Promise.all(ids.slice(0, 200).map((id) => updateFactbookEntry(userId, id, patch)))
}

export async function duplicateFactbookEntry(userId: string, entry: FactbookEntry) {
  return saveFactbookEntry(userId, { ...entry, id: undefined, title: `${entry.title} (Copy)`, position: entry.position + 1 })
}

export async function permanentlyDeleteFactbookItem(userId: string, table: 'factbook_subjects' | 'factbook_categories' | 'factbook_entries' | 'factbook_collections', id: string) {
  const client = await requireClient()
  const { error } = await client.from(table).delete().eq('user_id', userId).eq('id', id)
  if (error) throw new Error(messageFrom(error, 'The item could not be permanently deleted.'))
}

export async function reorderFactbookEntries(userId: string, orderedIds: string[]) {
  await Promise.all(orderedIds.map((id, position) => updateFactbookEntry(userId, id, { position } as Partial<FactbookEntry>)))
}

export async function loadFactbookCollections(userId: string, mode: 'active' | 'archived' | 'trash' = 'active') {
  const client = await requireClient()
  let collectionQuery = client.from('factbook_collections').select('*').eq('user_id', userId).order('position')
  if (mode === 'trash') collectionQuery = collectionQuery.not('deleted_at', 'is', null)
  else {
    collectionQuery = collectionQuery.is('deleted_at', null)
    collectionQuery = mode === 'archived' ? collectionQuery.not('archived_at', 'is', null) : collectionQuery.is('archived_at', null)
  }
  const [collectionResult, linksResult] = await Promise.all([
    collectionQuery,
    client.from('factbook_collection_entries').select('collection_id,entry_id').eq('user_id', userId).order('position'),
  ])
  if (collectionResult.error) throw new Error(messageFrom(collectionResult.error, 'Collections could not be loaded.'))
  const entryIds = new Map<string, string[]>()
  asRows(linksResult.data).forEach((row) => {
    const id = String(row.collection_id)
    entryIds.set(id, [...(entryIds.get(id) ?? []), String(row.entry_id)])
  })
  return asRows(collectionResult.data).map((row) => ({ ...row, entry_ids: entryIds.get(String(row.id)) ?? [] })) as unknown as FactbookCollection[]
}

export async function createFactbookCollection(userId: string, name: string) {
  const client = await requireClient()
  const cleanName = sanitizePlainText(name.trim(), 100)
  if (!cleanName) throw new Error('Enter a collection name.')
  const { data, error } = await client.from('factbook_collections').insert({ user_id: userId, name: cleanName }).select('*').single()
  if (error) throw new Error(messageFrom(error, 'The collection could not be created.'))
  return { ...data, entry_ids: [] } as FactbookCollection
}

export async function updateFactbookCollection(userId: string, id: string, patch: Partial<FactbookCollection>) {
  const client = await requireClient()
  const safePatch: DatabaseRow = {}
  if (patch.name !== undefined) safePatch.name = sanitizePlainText(patch.name.trim(), 100)
  if (patch.description !== undefined) safePatch.description = sanitizePlainText(patch.description, 1000)
  for (const key of ['color', 'position', 'archived_at', 'deleted_at'] as const) {
    if (patch[key] !== undefined) safePatch[key] = patch[key]
  }
  const { data, error } = await client.from('factbook_collections').update(safePatch).eq('user_id', userId).eq('id', id).select('*').single()
  if (error) throw new Error(messageFrom(error, 'The collection could not be updated.'))
  return data as FactbookCollection
}

export async function setCollectionEntries(userId: string, collectionId: string, entryIds: string[]) {
  const client = await requireClient()
  const { error: deleteError } = await client.from('factbook_collection_entries').delete().eq('user_id', userId).eq('collection_id', collectionId)
  if (deleteError) throw new Error(messageFrom(deleteError, 'The collection could not be updated.'))
  const unique = [...new Set(entryIds)]
  if (!unique.length) return
  const { error } = await client.from('factbook_collection_entries').insert(unique.map((entryId, position) => ({ user_id: userId, collection_id: collectionId, entry_id: entryId, position })))
  if (error) throw new Error(messageFrom(error, 'The collection could not be updated.'))
}

export async function loadFactbookPreferences(userId: string): Promise<FactbookPreferences> {
  const client = await requireClient()
  const { data, error } = await client.from('factbook_preferences').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(messageFrom(error, 'Factbook settings could not be loaded.'))
  return data ? data as FactbookPreferences : { user_id: userId, ...DEFAULT_PREFERENCES }
}

export async function saveFactbookPreferences(userId: string, preferences: FactbookPreferences) {
  const client = await requireClient()
  const { data, error } = await client.from('factbook_preferences').upsert({ ...preferences, user_id: userId }, { onConflict: 'user_id' }).select('*').single()
  if (error) throw new Error(messageFrom(error, 'Factbook settings could not be saved.'))
  return data as FactbookPreferences
}

export async function loadEntryRevisions(userId: string, entryId: string) {
  const client = await requireClient()
  const { data, error } = await client.from('factbook_revisions').select('*').eq('user_id', userId).eq('entry_id', entryId).order('created_at', { ascending: false }).limit(30)
  if (error) throw new Error(messageFrom(error, 'Revision history could not be loaded.'))
  return asRows(data) as unknown as FactbookRevision[]
}

export async function restoreEntryRevision(userId: string, entryId: string, revision: FactbookRevision) {
  const snapshot = revision.snapshot
  const client = await requireClient()
  const { error } = await client.from('factbook_entries').update({
    title: snapshot.title, entry_type: snapshot.entry_type, content: snapshot.content,
    importance: snapshot.importance, revision_status: snapshot.revision_status,
    personal_remarks: snapshot.personal_remarks, subject_id: snapshot.subject_id,
    category_id: snapshot.category_id, bookmarked: snapshot.bookmarked,
  }).eq('user_id', userId).eq('id', entryId)
  if (error) throw new Error(messageFrom(error, 'The earlier version could not be restored.'))
}

export function factbookDraftKey(userId: string, entryId = 'new') {
  return `cssvista:factbook:draft:${userId}:${entryId}`
}

export function saveLocalFactbookDraft(userId: string, draft: FactbookEntryDraft) {
  try { localStorage.setItem(factbookDraftKey(userId, draft.id), JSON.stringify({ draft, savedAt: new Date().toISOString() })) } catch { /* Browser storage is a best-effort safety net. */ }
}

export function loadLocalFactbookDraft(userId: string, entryId = 'new'): FactbookEntryDraft | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(factbookDraftKey(userId, entryId)) ?? 'null') as { draft?: FactbookEntryDraft } | null
    return parsed?.draft ?? null
  } catch { return null }
}

export function clearLocalFactbookDraft(userId: string, entryId = 'new') {
  try { localStorage.removeItem(factbookDraftKey(userId, entryId)) } catch { /* no-op */ }
}

export function newEntryDraft(subjectId: string, categoryId: string | null = null): FactbookEntryDraft {
  return {
    subject_id: subjectId, category_id: categoryId, title: '', entry_type: 'fact',
    content: createEmptyContent('fact'), importance: 'normal', revision_status: 'not-reviewed',
    bookmarked: false, personal_remarks: '', tags: [], sources: [],
  }
}

export async function exportCompleteFactbook(userId: string): Promise<FactbookBackup> {
  const client = await requireClient()
  const [subjects, categoryResult, collections, preferences] = await Promise.all([
    loadFactbookSubjects(userId),
    client.from('factbook_categories').select('*').eq('user_id', userId).is('deleted_at', null).order('position'),
    loadFactbookCollections(userId),
    loadFactbookPreferences(userId),
  ])
  if (categoryResult.error) throw new Error(messageFrom(categoryResult.error, 'Categories could not be exported.'))
  const entries: FactbookEntry[] = []
  let page = 0
  let hasMore = true
  while (hasMore && page < 1000) {
    const result = await loadFactbookEntries(userId, { page, pageSize: 100 })
    entries.push(...result.entries)
    hasMore = result.hasMore
    page += 1
  }
  for (const entry of entries) {
    entry.media = await Promise.all(entry.media.map(async (item) => {
      if (!item.signed_url) return { ...item, signed_url: undefined }
      try {
        const response = await fetch(item.signed_url)
        if (!response.ok) return { ...item, signed_url: undefined }
        const blob = await response.blob()
        const backup_data_url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(blob)
        })
        return { ...item, signed_url: undefined, backup_data_url }
      } catch { return { ...item, signed_url: undefined } }
    }))
  }
  return {
    format: 'css-vista-factbook', version: 1, exported_at: new Date().toISOString(),
    subjects, categories: asRows(categoryResult.data) as unknown as FactbookCategory[], entries, collections, preferences,
  }
}

export function validateFactbookBackup(value: unknown): FactbookBackup {
  if (!value || typeof value !== 'object') throw new Error('This file is not a Factbook backup.')
  const candidate = value as Partial<FactbookBackup>
  if (candidate.format !== 'css-vista-factbook' || candidate.version !== 1) throw new Error('This backup format or version is not supported.')
  if (!Array.isArray(candidate.subjects) || !Array.isArray(candidate.categories) || !Array.isArray(candidate.entries)) throw new Error('The backup is missing required Factbook records.')
  if (candidate.subjects.length > 500 || candidate.categories.length > 20_000 || candidate.entries.length > 100_000) throw new Error('This backup exceeds the safe import limits.')
  return candidate as FactbookBackup
}

export async function importFactbookBackup(userId: string, backup: FactbookBackup, mode: 'new' | 'merge' = 'new') {
  const subjectMap = new Map<string, string>()
  const categoryMap = new Map<string, string>()
  const existingSubjects = mode === 'merge' ? await loadFactbookSubjects(userId) : []
  for (const subject of backup.subjects) {
    const existing = existingSubjects.find((item) => item.name.localeCompare(subject.name, undefined, { sensitivity: 'accent' }) === 0)
    if (existing) subjectMap.set(subject.id, existing.id)
    else {
      const created = await createFactbookSubject(userId, { ...subject, id: undefined, name: mode === 'new' ? `${subject.name} (Imported)` : subject.name })
      subjectMap.set(subject.id, created.id)
    }
  }
  const pending = [...backup.categories]
  for (let pass = 0; pass < backup.categories.length + 1 && pending.length; pass += 1) {
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const category = pending[index]
      if (!category) continue
      if (category.parent_id && !categoryMap.has(category.parent_id)) continue
      const subjectId = subjectMap.get(category.subject_id)
      if (!subjectId) { pending.splice(index, 1); continue }
      const parentId = category.parent_id ? categoryMap.get(category.parent_id) : null
      let existing: FactbookCategory | undefined
      if (mode === 'merge') {
        const existingCategories = await loadFactbookCategories(userId, subjectId)
        existing = existingCategories.find((item) => item.parent_id === (parentId ?? null) && item.name.localeCompare(category.name, undefined, { sensitivity: 'accent' }) === 0)
      }
      if (existing) categoryMap.set(category.id, existing.id)
      else {
        const created = await createFactbookCategory(userId, subjectId, { ...category, id: undefined, parent_id: parentId })
        categoryMap.set(category.id, created.id)
      }
      pending.splice(index, 1)
    }
  }
  let importedEntries = 0
  for (const entry of backup.entries) {
    const subjectId = subjectMap.get(entry.subject_id)
    if (!subjectId) continue
    const saved = await saveFactbookEntry(userId, {
      ...entry, id: undefined, subject_id: subjectId,
      category_id: entry.category_id ? categoryMap.get(entry.category_id) ?? null : null,
      sources: entry.sources ?? [], tags: entry.tags ?? [],
    })
    for (const media of entry.media ?? []) {
      if (!media.backup_data_url || !/^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(media.backup_data_url)) continue
      const blob = await fetch(media.backup_data_url).then((response) => response.blob())
      if (blob.size <= 0 || blob.size > 5 * 1024 * 1024) continue
      const extension = media.mime_type === 'image/jpeg' ? 'jpg' : media.mime_type.split('/')[1] || 'bin'
      const path = `${userId}/${saved.id}/${crypto.randomUUID()}.${extension}`
      const client = await requireClient()
      const { error: uploadError } = await client.storage.from('factbook-media').upload(path, blob, { contentType: media.mime_type, cacheControl: '3600', upsert: false })
      if (uploadError) continue
      const { error: mediaError } = await client.from('factbook_media').insert({
        user_id: userId, entry_id: saved.id, storage_path: path, file_name: sanitizePlainText(media.file_name, 240),
        mime_type: media.mime_type, byte_size: blob.size, width: media.width, height: media.height,
        caption: sanitizePlainText(media.caption, 1000), alt_text: sanitizePlainText(media.alt_text, 500), source: sanitizePlainText(media.source, 1000),
      })
      if (mediaError) await client.storage.from('factbook-media').remove([path])
    }
    importedEntries += 1
  }
  return { subjects: subjectMap.size, categories: categoryMap.size, entries: importedEntries }
}

export async function deleteAllFactbookData(userId: string, confirmation: string) {
  const client = await requireClient()
  const { data: entryFolders } = await client.storage.from('factbook-media').list(userId, { limit: 1000 })
  const paths: string[] = []
  for (const folder of entryFolders ?? []) {
    const prefix = `${userId}/${folder.name}`
    const { data: files } = await client.storage.from('factbook-media').list(prefix, { limit: 1000 })
    for (const file of files ?? []) paths.push(`${prefix}/${file.name}`)
  }
  for (let index = 0; index < paths.length; index += 100) {
    const { error: storageError } = await client.storage.from('factbook-media').remove(paths.slice(index, index + 100))
    if (storageError) throw new Error('Factbook images could not be removed. No database records were deleted.')
  }
  const { error } = await client.rpc('delete_my_factbook_data', { confirm_text: confirmation })
  if (error) throw new Error(messageFrom(error, 'Factbook data could not be deleted.'))
}
