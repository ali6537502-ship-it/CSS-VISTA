// CSS Vista Admin - simple content management stored in the browser's localStorage.
// The owner edits Current Affairs, CSS 2027 dates, FPSC notifications, announcements,
// past papers and MCQs from mobile or laptop without touching code.
// To publish edits for everyone, use "Export site data" and send the file to your developer.

import type { Question } from '@/data/quiz'
import type { PastPaper } from '@/data/pastPapers'
import type { FpscNotification2027, CssDate } from '@/data/css2027'
import type { TestSeriesAnnouncement } from '@/data/testSeries'

const AUTH_KEY = 'cssvista:admin:auth'
const PASS_KEY = 'cssvista:admin:pass'
const CONTENT_KEY = 'cssvista:admin:content'
const DEFAULT_PASSWORD = 'cssvista2026' // CHANGE THIS on first login (Admin → Settings)

// ---------- Auth ----------
export function getPassword(): string {
  return localStorage.getItem(PASS_KEY) || DEFAULT_PASSWORD
}
export function setPassword(p: string) {
  localStorage.setItem(PASS_KEY, p)
}
export function login(password: string): boolean {
  if (password === getPassword()) {
    sessionStorage.setItem(AUTH_KEY, '1')
    return true
  }
  return false
}
export function logout() {
  sessionStorage.removeItem(AUTH_KEY)
}
export function isAuthed(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === '1'
}

// ---------- Content model ----------
export interface CaTopic {
  id: string
  title: string
  date: string
  summary: string
  content: string
  fileData?: string // base64 data-URL for PDF/image/doc
  fileName?: string
  sourceUrl?: string
  important: boolean
  published: boolean
  order: number
}

export interface CountdownConfig {
  title: string
  eventName: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  visible: boolean
}

export interface HomeCard {
  id: string
  title: string
  desc: string
  to: string
  icon: string
  visible: boolean
  order: number
  custom?: boolean
}

export interface SiteUpdate {
  id: string
  title: string
  body: string
  date: string
  tag: string // Mentors | Opinions | Test Series | FPSC | General
  notify: boolean
}

export interface McqOverride {
  id: string
  disabled?: boolean
  disputed?: boolean
  q?: string
  o?: string[]
  a?: number
  e?: string
}

export interface CategoryOverride {
  slug: string
  name?: string
  hidden?: boolean
  custom?: boolean
}

export interface ErrorReport {
  id: string
  questionId: string
  note: string
  date: string
}

export interface MentorOverride {
  id: string
  name?: string
  role?: string
  whatsapp?: string
  photoData?: string
  bio?: string
}

export interface AdminContent {
  caTopics: CaTopic[]
  css2027Dates: CssDate[]
  notifications2027: FpscNotification2027[]
  announcements: TestSeriesAnnouncement[]
  pastPapers: PastPaper[]
  mcqs: Question[]
  countdown: CountdownConfig | null
  homeCards: HomeCard[]
  updates: SiteUpdate[]
  mcqOverrides: McqOverride[]
  categoryOverrides: CategoryOverride[]
  mentorOverrides: MentorOverride[]
  priceOverrides: Record<string, string>
}

const emptyContent: AdminContent = {
  caTopics: [],
  css2027Dates: [],
  notifications2027: [],
  announcements: [],
  pastPapers: [],
  mcqs: [],
  countdown: null,
  homeCards: [],
  updates: [],
  mcqOverrides: [],
  categoryOverrides: [],
  mentorOverrides: [],
  priceOverrides: {},
}

export function getAdminContent(): AdminContent {
  try {
    const raw = localStorage.getItem(CONTENT_KEY)
    if (!raw) return { ...emptyContent }
    return { ...emptyContent, ...JSON.parse(raw) }
  } catch {
    return { ...emptyContent }
  }
}

export function saveAdminContent(c: AdminContent) {
  try {
    localStorage.setItem(CONTENT_KEY, JSON.stringify(c))
  } catch {
    alert('Storage is full. Remove large files or export your data first.')
  }
}

// Convenience updaters
export function upsertCaTopic(t: CaTopic) {
  const c = getAdminContent()
  const i = c.caTopics.findIndex((x) => x.id === t.id)
  if (i >= 0) c.caTopics[i] = t
  else c.caTopics.push(t)
  saveAdminContent(c)
}
export function deleteCaTopic(id: string) {
  const c = getAdminContent()
  c.caTopics = c.caTopics.filter((x) => x.id !== id)
  saveAdminContent(c)
}
export function upsertDateRow(d: CssDate) {
  const c = getAdminContent()
  const i = c.css2027Dates.findIndex((x) => x.id === d.id)
  if (i >= 0) c.css2027Dates[i] = d
  else c.css2027Dates.push(d)
  saveAdminContent(c)
}
export function upsertNotification(n: FpscNotification2027) {
  const c = getAdminContent()
  const i = c.notifications2027.findIndex((x) => x.id === n.id)
  if (i >= 0) c.notifications2027[i] = n
  else c.notifications2027.push(n)
  saveAdminContent(c)
}
export function deleteNotification(id: string) {
  const c = getAdminContent()
  c.notifications2027 = c.notifications2027.filter((x) => x.id !== id)
  saveAdminContent(c)
}
export function upsertAnnouncement(a: TestSeriesAnnouncement) {
  const c = getAdminContent()
  const i = c.announcements.findIndex((x) => x.id === a.id)
  if (i >= 0) c.announcements[i] = a
  else c.announcements.push(a)
  saveAdminContent(c)
}
export function deleteAnnouncement(id: string) {
  const c = getAdminContent()
  c.announcements = c.announcements.filter((x) => x.id !== id)
  saveAdminContent(c)
}
export function upsertPastPaper(p: PastPaper) {
  const c = getAdminContent()
  const i = c.pastPapers.findIndex((x) => x.id === p.id)
  if (i >= 0) c.pastPapers[i] = p
  else {
    const duplicate = c.pastPapers.some((x) =>
      x.examination === p.examination &&
      x.year === p.year &&
      x.subject === p.subject &&
      x.paper === p.paper &&
      x.mode === p.mode
    )
    if (!duplicate) c.pastPapers.push(p)
  }
  saveAdminContent(c)
}
export function deletePastPaper(id: string) {
  const c = getAdminContent()
  c.pastPapers = c.pastPapers.filter((x) => x.id !== id)
  saveAdminContent(c)
}
export function addMcqsBatch(qs: Question[]): number {
  const c = getAdminContent()
  const existingIds = new Set(c.mcqs.map((m) => m.id))
  const normalise = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
  const existingQuestions = new Set(c.mcqs.map((m) => normalise(m.question)))
  const fresh = qs.filter((q) => {
    const key = normalise(q.question)
    if (existingIds.has(q.id) || !key || existingQuestions.has(key)) return false
    existingIds.add(q.id)
    existingQuestions.add(key)
    return true
  })
  c.mcqs = [...c.mcqs, ...fresh]
  saveAdminContent(c)
  return fresh.length
}

// ---------- Merge helpers for public pages ----------
export function mergedCaTopics(seed: CaTopic[]): CaTopic[] {
  const admin = getAdminContent().caTopics
  const map = new Map<string, CaTopic>()
  seed.forEach((t) => map.set(t.id, t))
  admin.forEach((t) => map.set(t.id, t))
  return [...map.values()].sort((a, b) => a.order - b.order)
}
export function mergedDates(seed: CssDate[]): CssDate[] {
  const admin = getAdminContent().css2027Dates
  const map = new Map<string, CssDate>()
  seed.forEach((d) => map.set(d.id, d))
  admin.forEach((d) => {
    // Older builds allowed an unverified "Expected" status. Never publish an
    // estimated date: migrate it to an explicit unannounced entry instead.
    if ((d.status as string) === 'Expected') map.set(d.id, { ...d, date: '', status: 'To Be Announced' })
    else map.set(d.id, d)
  })
  return [...map.values()]
}
export function mergedNotifications(seed: FpscNotification2027[]): FpscNotification2027[] {
  const admin = getAdminContent().notifications2027
  const map = new Map<string, FpscNotification2027>()
  seed.forEach((n) => map.set(n.id, n))
  admin.forEach((n) => map.set(n.id, n))
  return [...map.values()].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}
export function mergedAnnouncements(seed: TestSeriesAnnouncement[]): TestSeriesAnnouncement[] {
  const admin = getAdminContent().announcements
  const map = new Map<string, TestSeriesAnnouncement>()
  seed.forEach((a) => map.set(a.id, a))
  admin.forEach((a) => map.set(a.id, a))
  return [...map.values()].filter((a) => a.published).sort((a, b) => b.date.localeCompare(a.date))
}
export function mergedPastPapers(seed: PastPaper[]): PastPaper[] {
  const admin = getAdminContent().pastPapers
  const map = new Map<string, PastPaper>()
  seed.forEach((p) => map.set(p.id, p))
  admin.forEach((p) => map.set(p.id, p))
  return [...map.values()].sort((a, b) => b.year - a.year)
}
export function mergedMcqs(seed: Question[]): Question[] {
  const admin = getAdminContent().mcqs
  const map = new Map<number, Question>()
  seed.forEach((q) => map.set(q.id, q))
  admin.forEach((q) => map.set(q.id, q))
  return [...map.values()]
}

// ---------- Export / Import (publish workflow) ----------
export function exportAdminContent(): string {
  return JSON.stringify(getAdminContent(), null, 2)
}
export function importAdminContent(json: string): boolean {
  try {
    const parsed = JSON.parse(json)
    saveAdminContent({ ...emptyContent, ...parsed })
    return true
  } catch {
    return false
  }
}

// ---------- New admin helpers: countdown, homepage cards, updates, overrides ----------
export function getCountdownConfig(): CountdownConfig {
  const official: CountdownConfig = {
    title: 'CSS 2027 countdown',
    eventName: 'CSS 2027 Written Examination',
    date: '2027-01-27',
    time: '00:00',
    visible: true,
  }
  const saved = getAdminContent().countdown
  // The target is deliberately immutable: only the visibility preference is
  // retained from local admin settings, so stale data cannot change the date.
  return { ...official, visible: saved?.visible ?? official.visible }
}
export function saveCountdownConfig(cfg: CountdownConfig) {
  const c = getAdminContent()
  c.countdown = { ...getCountdownConfig(), visible: cfg.visible }
  saveAdminContent(c)
}

export function mergedHomeCards(seed: HomeCard[]): HomeCard[] {
  const admin = getAdminContent().homeCards
  const map = new Map<string, HomeCard>()
  seed.forEach((h) => map.set(h.id, h))
  admin.forEach((h) => map.set(h.id, h))
  return [...map.values()].sort((a, b) => a.order - b.order)
}
export function upsertHomeCard(h: HomeCard) {
  const c = getAdminContent()
  const i = c.homeCards.findIndex((x) => x.id === h.id)
  if (i >= 0) c.homeCards[i] = h
  else c.homeCards.push(h)
  saveAdminContent(c)
}
export function deleteHomeCard(id: string) {
  const c = getAdminContent()
  c.homeCards = c.homeCards.filter((x) => x.id !== id)
  saveAdminContent(c)
}

export function mergedUpdates(): SiteUpdate[] {
  return [...getAdminContent().updates].sort((a, b) => b.date.localeCompare(a.date))
}
export function upsertUpdate(u: SiteUpdate) {
  const c = getAdminContent()
  const i = c.updates.findIndex((x) => x.id === u.id)
  if (i >= 0) c.updates[i] = u
  else c.updates.push(u)
  saveAdminContent(c)
}
export function deleteUpdate(id: string) {
  const c = getAdminContent()
  c.updates = c.updates.filter((x) => x.id !== id)
  saveAdminContent(c)
}

export function getMcqOverride(id: string): McqOverride | undefined {
  return getAdminContent().mcqOverrides.find((o) => o.id === id)
}
export function upsertMcqOverride(o: McqOverride) {
  const c = getAdminContent()
  const i = c.mcqOverrides.findIndex((x) => x.id === o.id)
  if (i >= 0) c.mcqOverrides[i] = o
  else c.mcqOverrides.push(o)
  saveAdminContent(c)
}
export function disabledMcqIds(): Set<string> {
  return new Set(getAdminContent().mcqOverrides.filter((o) => o.disabled).map((o) => o.id))
}

export function mergedCategoryOverrides(): CategoryOverride[] {
  return getAdminContent().categoryOverrides
}
export function upsertCategoryOverride(o: CategoryOverride) {
  const c = getAdminContent()
  const i = c.categoryOverrides.findIndex((x) => x.slug === o.slug)
  if (i >= 0) c.categoryOverrides[i] = o
  else c.categoryOverrides.push(o)
  saveAdminContent(c)
}
export function deleteCategoryOverride(slug: string) {
  const c = getAdminContent()
  c.categoryOverrides = c.categoryOverrides.filter((x) => x.slug !== slug)
  saveAdminContent(c)
}

// ---------- Error reports (stored per browser) ----------
const REPORTS_KEY = 'cssvista:reports'
export function getReports(): ErrorReport[] {
  try {
    return JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]')
  } catch {
    return []
  }
}
export function addReport(r: Omit<ErrorReport, 'id' | 'date'>) {
  const reports = getReports()
  reports.unshift({ ...r, id: Math.random().toString(36).slice(2), date: new Date().toISOString().slice(0, 10) })
  if (reports.length > 200) reports.length = 200
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports))
  } catch {
    /* ignore */
  }
}
export function deleteReport(id: string) {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(getReports().filter((r) => r.id !== id)))
  } catch {
    /* ignore */
  }
}

export function getMentorOverride(id: string): MentorOverride | undefined {
  return getAdminContent().mentorOverrides.find((m) => m.id === id)
}
export function upsertMentorOverride(m: MentorOverride) {
  const c = getAdminContent()
  const i = c.mentorOverrides.findIndex((x) => x.id === m.id)
  if (i >= 0) c.mentorOverrides[i] = m
  else c.mentorOverrides.push(m)
  saveAdminContent(c)
}

export function getPriceOverride(id: string): string | undefined {
  return getAdminContent().priceOverrides[id]
}
export function setPriceOverride(id: string, price: string) {
  const c = getAdminContent()
  if (price.trim()) c.priceOverrides[id] = price.trim()
  else delete c.priceOverrides[id]
  saveAdminContent(c)
}

// ---------- CSV parsing for bulk MCQ upload ----------
// Expected columns (header row): question,optionA,optionB,optionC,optionD,answer,explanation,subject,topic,difficulty
export function parseMcqCsv(text: string, startId: number): { questions: Question[]; errors: string[] } {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') { cur.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      cur.push(field); field = ''
      if (cur.some((c) => c.trim() !== '')) rows.push(cur)
      cur = []
    } else field += ch
  }
  if (field.trim() !== '' || cur.length) { cur.push(field); if (cur.some((c) => c.trim() !== '')) rows.push(cur) }

  const errors: string[] = []
  const questions: Question[] = []
  if (!rows.length) return { questions, errors: ['Empty file'] }
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)
  const need = ['question', 'optiona', 'optionb', 'optionc', 'optiond', 'answer']
  for (const n of need) {
    if (idx(n) === -1) errors.push(`Missing column: ${n}`)
  }
  if (errors.length) return { questions, errors }

  let id = startId
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const get = (name: string) => (idx(name) >= 0 ? (row[idx(name)] || '').trim() : '')
    const options = [get('optiona'), get('optionb'), get('optionc'), get('optiond')]
    const ansRaw = get('answer').toUpperCase()
    const letterAnswer = ['A', 'B', 'C', 'D'].indexOf(ansRaw)
    const numericAnswer = Number.parseInt(ansRaw, 10)
    const ansIdx = letterAnswer >= 0 ? letterAnswer : numericAnswer >= 1 && numericAnswer <= 4 ? numericAnswer - 1 : -1
    if (!get('question') || options.some((option) => !option)) {
      errors.push(`Row ${r + 1}: skipped (question and all four options are required)`)
      continue
    }
    if (ansIdx < 0) {
      errors.push(`Row ${r + 1}: skipped (answer must be A, B, C, D or 1, 2, 3, 4)`)
      continue
    }
    questions.push({
      id: id++,
      question: get('question'),
      options,
      answer: ansIdx,
      explanation: get('explanation') || '-',
      category: get('subject') || 'gk',
      topic: get('topic'),
      difficulty: (['Easy', 'Medium', 'Hard'].includes(get('difficulty')) ? get('difficulty') : 'Medium') as Question['difficulty'],
    })
  }
  return { questions, errors }
}

// File → base64 data URL (for PDFs/images/docs in Current Affairs)
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
