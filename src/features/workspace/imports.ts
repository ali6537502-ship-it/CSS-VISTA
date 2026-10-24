export type ImportSource = { key: string; label: string; raw: string; title: string; text: string; kind: 'sentence' | 'paragraph' | 'precis'; accountScoped: boolean }
export type ImportJournal = { request: string; source: string; fingerprint: string; attempt: string; title: string }
type ReadStorage = Pick<Storage, 'getItem'>
const validId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const journalPrefix = (user: string) => `cssvista:writing-import:v1:${user}:`
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) }
/** Match the native writing normalizer in the preview; the browser original is never altered. */
export function importText(value: unknown, max: number): string {
  if (typeof value !== 'string' || Array.from(value).some(char => { const point = char.codePointAt(0)!; return point < 32 && ![9,10,13].includes(point) || point >= 0xd800 && point <= 0xdfff })) throw Error('This copy contains unsupported text. Export the original instead.')
  const text = value.replace(/\r\n?/g, '\n').replace(/^[ \t\n]+|[ \t\n]+$/g, '')
  if (!text || Array.from(text).length > max) throw Error(`This copy must contain between 1 and ${max} characters. The original is retained.`)
  return text
}
export function importSources(storage: ReadStorage, user: string, includeDevice = false): { sources: ImportSource[]; skipped: number } {
  const sources: ImportSource[] = []; let skipped = 0
  const draftKey = `cssvista:draft:learning:v1:${user}:new`
  const own = storage.getItem(draftKey)
  if (own) {
    try {
      if (own.length > 100000) throw Error('Too large')
      const data: unknown = JSON.parse(own)
      if (!record(data) || !['sentence','paragraph','precis'].includes(String(data.kind))) throw Error('Invalid draft')
      sources.push({ key: draftKey, label: 'Your unsaved account writing draft', raw: own, title: importText(data.title, 180), text: importText(data.text, 20000), kind: data.kind as ImportSource['kind'], accountScoped: true })
    } catch { skipped++ }
  }
  if (includeDevice) {
    const raw = storage.getItem('cssvista:v1')
    if (raw) {
      if (raw.length > 8000000) throw Error('This browser record is too large to preview here. Export it from its original tool.')
      const data: unknown = JSON.parse(raw)
      if (!record(data) || !Array.isArray(data.savedAnswers)) throw Error('This browser record could not be read. The original has not been changed.')
      const counts = new Map<string, number>()
      for (const item of data.savedAnswers) if (record(item) && typeof item.id === 'string') counts.set(item.id, (counts.get(item.id) || 0) + 1)
      for (const value of data.savedAnswers) {
        try {
          if (sources.length >= 1000 || !record(value) || typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value.id) || counts.get(value.id) !== 1) throw Error('Invalid source')
          for (const field of ['question','subject','outline','intro','text','conclusion','date']) if (typeof value[field] !== 'string') throw Error('Missing source field')
          // Preserve every writing section, the complete question and its recorded date as context.
          // Historical timing and all other fields remain in the unmodified original/export.
          const sections = [['Question',value.question],['Subject',value.subject],['Original recorded date (unverified)',value.date],['Outline',value.outline],['Introduction',value.intro],['Answer',value.text],['Conclusion',value.conclusion]]
          const text = importText(sections.filter(([,v]) => v !== '').map(([label,v]) => `${label}\n${v}`).join('\n\n'), 20000)
          if (![value.text,value.outline,value.intro,value.conclusion].some(v => typeof v === 'string' && v.trim())) throw Error('Empty answer')
          const title = importText(value.question, 20000)
          sources.push({ key: `device-answer:${value.id}`, label: title, raw: JSON.stringify(value), title: Array.from(title).slice(0,180).join(''), text, kind: 'paragraph', accountScoped: false })
        } catch { skipped++ }
      }
    }
  }
  return { sources, skipped }
}
async function digest(text: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buffer)].map(value => value.toString(16).padStart(2,'0')).join('')
}
export async function importIdentity(user: string, source: ImportSource, attempt: string): Promise<ImportJournal> {
  if (!validId.test(user) || !validId.test(attempt)) throw Error('Choose your account and preparation attempt.')
  function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical)
    if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])]))
    return value
  }
  // Existing account progress backup may reorder JSON fields; it must not duplicate an import.
  const fingerprint = await digest(JSON.stringify(canonical(JSON.parse(source.raw))))
  const hash = await digest(JSON.stringify(['cssvista-writing-import-v1',user,source.key,fingerprint,attempt,source.title,source.text,source.kind]))
  const hex = hash.slice(0,12) + '4' + hash.slice(13,16) + 'a' + hash.slice(17,32)
  const request = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
  return { request, source: source.key, fingerprint, attempt, title: source.title }
}
export function retainImport(storage: Pick<Storage,'setItem'>, user: string, journal: ImportJournal) {
  // A metadata-only recovery pointer must be retained before sending a mutation.
  storage.setItem(journalPrefix(user) + journal.request, JSON.stringify(journal))
}
export function importJournals(storage: Pick<Storage,'length'|'key'|'getItem'>, user: string): ImportJournal[] {
  const out: ImportJournal[] = [], prefix = journalPrefix(user)
  for (let i=0;i<storage.length;i++) {
    const key = storage.key(i)
    if (!key?.startsWith(prefix)) continue
    try {
      const value: unknown = JSON.parse(storage.getItem(key) || 'null')
      if (record(value) && typeof value.request === 'string' && validId.test(value.request) && key === prefix + value.request && typeof value.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(value.fingerprint) && typeof value.source === 'string' && typeof value.attempt === 'string' && validId.test(value.attempt) && typeof value.title === 'string' && value.title.length <= 360) out.push(value as ImportJournal)
    } catch { /* Keep unreadable pointers in place; do not adopt or erase them. */ }
  }
  return out
}

export function pendingWritingSave(storage: ReadStorage, user: string): { request: string } | undefined {
  const raw = storage.getItem(`cssvista:learning-request:${user}:writing:new`)
  if (!raw) return
  try {
    const value: unknown = JSON.parse(raw)
    if (record(value) && typeof value.id === 'string' && validId.test(value.id) && typeof value.hash === 'string' && /^[a-f0-9]{64}$/.test(value.hash)) return { request: value.id }
  } catch { /* Retain the original request pointer. */ }
}
