export interface OneLinerField {
  label: string
  value: string
}

export type FormattedOneLiner =
  | { kind: 'fields'; fields: OneLinerField[] }
  | { kind: 'term'; term: string; detail: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'text'; text: string }

const LABELED_FIELD_BOUNDARY = /;\s*(?=[A-Za-z][A-Za-z0-9 /&()'’.,-]{0,55}:\s*\S)/
const TERM_SEPARATOR = /\s[-–—]\s/

function toField(segment: string): OneLinerField | null {
  const colonIndex = segment.indexOf(':')
  if (colonIndex < 1 || colonIndex > 60) return null

  const label = segment.slice(0, colonIndex).trim()
  const value = segment.slice(colonIndex + 1).trim()
  if (!label || !value || /^https?$/i.test(label)) return null
  return { label, value }
}

export function formatOneLiner(text: string): FormattedOneLiner {
  const normalized = text.trim()
  const labeledSegments = normalized.split(LABELED_FIELD_BOUNDARY)
  const fields = labeledSegments.map(toField)

  if (fields.length > 0 && fields.every((field): field is OneLinerField => field !== null)) {
    return { kind: 'fields', fields }
  }

  const termMatch = TERM_SEPARATOR.exec(normalized)
  if (termMatch?.index) {
    const term = normalized.slice(0, termMatch.index).trim()
    const detail = normalized.slice(termMatch.index + termMatch[0].length).trim()
    if (term && detail) return { kind: 'term', term, detail }
  }

  const items = normalized.split(/;\s*/).map((item) => item.trim()).filter(Boolean)
  if (items.length > 1) return { kind: 'list', items }

  return { kind: 'text', text: normalized }
}
