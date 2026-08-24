export const FACTBOOK_ENTRY_TYPES = [
  'fact', 'statistic', 'quotation', 'definition', 'case-study', 'report-index',
  'legal-provision', 'event', 'timeline', 'comparison', 'custom-table',
  'argument', 'cause-effect', 'problem-solution', 'book-note', 'media', 'rich-note',
] as const

export type FactbookEntryType = typeof FACTBOOK_ENTRY_TYPES[number]
export type Importance = 'normal' | 'important' | 'very-important' | 'must-revise'
export type RevisionStatus = 'not-reviewed' | 'learning' | 'revised-once' | 'well-prepared'
export type FactbookView = 'cards' | 'compact' | 'book' | 'revision' | 'focus'

export interface FactbookSubject {
  id: string
  user_id: string
  name: string
  description: string
  icon: string
  cover_style: 'classic' | 'minimal' | 'academic' | 'linen'
  accent_color: string
  exam_label: string
  target_date: string | null
  position: number
  category_count: number
  entry_count: number
  archived_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface FactbookCategory {
  id: string
  user_id: string
  subject_id: string
  parent_id: string | null
  name: string
  icon: string
  color: string
  position: number
  entry_count: number
  archived_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface FactbookSource {
  id?: string
  title: string
  author_organization: string
  publication_year: string
  page_number: string
  web_address: string
  accessed_on: string | null
  verification_note: string
  position: number
}

export interface FactbookMedia {
  id: string
  entry_id: string | null
  storage_path: string
  file_name: string
  mime_type: string
  byte_size: number
  width: number | null
  height: number | null
  caption: string
  alt_text: string
  source: string
  signed_url?: string
  backup_data_url?: string
}

export interface FactbookEntry {
  id: string
  user_id: string
  subject_id: string
  category_id: string | null
  title: string
  entry_type: FactbookEntryType
  content: Record<string, unknown>
  importance: Importance
  revision_status: RevisionStatus
  bookmarked: boolean
  personal_remarks: string
  position: number
  archived_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  tags: string[]
  sources: FactbookSource[]
  media: FactbookMedia[]
}

export interface FactbookCollection {
  id: string
  user_id: string
  name: string
  description: string
  color: string
  position: number
  archived_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  entry_ids?: string[]
}

export interface FactbookPreferences {
  user_id: string
  default_view: FactbookView
  default_print_layout: 'compact' | 'standard' | 'spacious'
  source_reminders: boolean
  autosave_enabled: boolean
  revision_labels: boolean
}

export interface FactbookRevision {
  id: string
  entry_id: string
  snapshot: Partial<FactbookEntry>
  created_at: string
}

export interface FactbookEntryDraft {
  id?: string
  subject_id: string
  category_id: string | null
  title: string
  entry_type: FactbookEntryType
  content: Record<string, unknown>
  importance: Importance
  revision_status: RevisionStatus
  bookmarked: boolean
  personal_remarks: string
  tags: string[]
  sources: FactbookSource[]
  media?: FactbookMedia[]
  position?: number
}

export interface FactbookFilters {
  subjectId?: string
  categoryId?: string
  query?: string
  entryType?: FactbookEntryType | ''
  tag?: string
  importance?: Importance | ''
  revisionStatus?: RevisionStatus | ''
  bookmarked?: boolean
  sourceAvailability?: 'with-source' | 'without-source' | ''
  createdAfter?: string
  editedAfter?: string
  archived?: boolean
  trashed?: boolean
  page?: number
  pageSize?: number
}

export interface FactbookBackup {
  format: 'css-vista-factbook'
  version: 1
  exported_at: string
  subjects: FactbookSubject[]
  categories: FactbookCategory[]
  entries: FactbookEntry[]
  collections: FactbookCollection[]
  preferences: FactbookPreferences
}

export interface PrintSettings {
  title: string
  subtitle: string
  studentName: string
  includeDescriptions: boolean
  includeSources: boolean
  includeImages: boolean
  includeTags: boolean
  includeRevisionLabels: boolean
  includeTableOfContents: boolean
  includeNoteSpace: boolean
  layout: 'compact' | 'standard' | 'spacious'
  inkSaving: boolean
  pageSize: 'A4' | 'Letter'
  orientation: 'portrait' | 'landscape'
  pageNumbers: boolean
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'offline'
