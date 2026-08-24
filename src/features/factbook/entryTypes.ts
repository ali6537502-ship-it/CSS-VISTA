import type { FactbookEntryType } from './types'

export interface EntryFieldDefinition {
  key: string
  label: string
  kind?: 'text' | 'textarea' | 'number' | 'date' | 'url' | 'rich'
  placeholder?: string
  required?: boolean
}

export interface EntryTypeDefinition {
  type: FactbookEntryType
  label: string
  shortLabel: string
  description: string
  fields: EntryFieldDefinition[]
  structured?: 'timeline' | 'comparison' | 'table' | 'cause-effect'
}

export const ENTRY_TYPE_DEFINITIONS: EntryTypeDefinition[] = [
  { type: 'fact', label: 'Concise Fact', shortLabel: 'Fact', description: 'A date, name, provision, number or one-line statement.', fields: [
    { key: 'mainFact', label: 'Main fact', kind: 'textarea', required: true },
    { key: 'explanation', label: 'Explanation', kind: 'textarea' },
    { key: 'sourceName', label: 'Source' }, { key: 'sourceYear', label: 'Source year' },
  ] },
  { type: 'statistic', label: 'Statistic & Data', shortLabel: 'Statistic', description: 'A sourced value presented as a visual data card.', fields: [
    { key: 'value', label: 'Number or value', required: true }, { key: 'unit', label: 'Unit' },
    { key: 'period', label: 'Relevant year or period' }, { key: 'geography', label: 'Geographic area' },
    { key: 'explanation', label: 'Explanation or examination relevance', kind: 'textarea' },
    { key: 'sourceName', label: 'Source name' }, { key: 'sourceLink', label: 'Source link', kind: 'url' },
    { key: 'verificationDate', label: 'Verification date', kind: 'date' },
  ] },
  { type: 'quotation', label: 'Quotation', shortLabel: 'Quote', description: 'A quotation with speaker, occasion and relevance.', fields: [
    { key: 'quotation', label: 'Quotation', kind: 'textarea', required: true }, { key: 'speaker', label: 'Speaker or author' },
    { key: 'occasion', label: 'Work, speech, report or occasion' }, { key: 'year', label: 'Year' },
    { key: 'relevance', label: 'Topic relevance', kind: 'textarea' }, { key: 'sourceName', label: 'Source' },
  ] },
  { type: 'definition', label: 'Definition', shortLabel: 'Definition', description: 'A term, authoritative definition and related concepts.', fields: [
    { key: 'term', label: 'Term', required: true }, { key: 'definition', label: 'Definition', kind: 'textarea', required: true },
    { key: 'authority', label: 'Scholar, institution, law or source' },
    { key: 'relatedConcepts', label: 'Related concepts' }, { key: 'personalExplanation', label: 'Personal explanation', kind: 'textarea' },
  ] },
  { type: 'case-study', label: 'Case Study', shortLabel: 'Case Study', description: 'A structured case with evidence, outcome and answer relevance.', fields: [
    { key: 'location', label: 'Country or location' }, { key: 'background', label: 'Background', kind: 'textarea' },
    { key: 'development', label: 'Core development', kind: 'textarea' }, { key: 'evidence', label: 'Evidence or data', kind: 'textarea' },
    { key: 'outcome', label: 'Outcome', kind: 'textarea' }, { key: 'lessons', label: 'Lessons', kind: 'textarea' },
    { key: 'relevance', label: 'Relevance to an examination answer', kind: 'textarea' },
  ] },
  { type: 'report-index', label: 'Report or Index', shortLabel: 'Report', description: 'Findings and figures from a named report or index.', fields: [
    { key: 'organization', label: 'Issuing organization' }, { key: 'edition', label: 'Edition or year' },
    { key: 'pakistanPosition', label: 'Pakistan position, if applicable' },
    { key: 'findings', label: 'Key findings', kind: 'textarea' }, { key: 'figures', label: 'Important figures', kind: 'textarea' },
    { key: 'significance', label: 'Analytical significance', kind: 'textarea' }, { key: 'sourceLink', label: 'Source link', kind: 'url' },
  ] },
  { type: 'legal-provision', label: 'Legal Provision', shortLabel: 'Law', description: 'A constitutional, legal, treaty or judgment reference.', fields: [
    { key: 'instrument', label: 'Constitution, law, treaty, judgment or instrument', required: true },
    { key: 'provision', label: 'Article, section, clause or case name' },
    { key: 'principle', label: 'Exact provision or principle', kind: 'textarea' },
    { key: 'explanation', label: 'Explanation', kind: 'textarea' }, { key: 'example', label: 'Relevant example', kind: 'textarea' },
    { key: 'citation', label: 'Citation or source' },
  ] },
  { type: 'event', label: 'Event', shortLabel: 'Event', description: 'A dated event with causes, developments and consequences.', fields: [
    { key: 'date', label: 'Date or period' }, { key: 'location', label: 'Location' },
    { key: 'background', label: 'Background', kind: 'textarea' }, { key: 'causes', label: 'Causes', kind: 'textarea' },
    { key: 'developments', label: 'Major developments', kind: 'textarea' }, { key: 'consequences', label: 'Consequences', kind: 'textarea' },
    { key: 'relevance', label: 'Examination relevance', kind: 'textarea' },
  ] },
  { type: 'timeline', label: 'Timeline', shortLabel: 'Timeline', description: 'Multiple chronologically ordered events.', fields: [], structured: 'timeline' },
  { type: 'comparison', label: 'Comparison', shortLabel: 'Compare', description: 'Compare two or more items against custom criteria.', fields: [
    { key: 'similarities', label: 'Similarities', kind: 'textarea' }, { key: 'differences', label: 'Differences', kind: 'textarea' },
    { key: 'conclusion', label: 'Conclusion', kind: 'textarea' },
  ], structured: 'comparison' },
  { type: 'custom-table', label: 'Custom Table', shortLabel: 'Table', description: 'Build a printable table with custom rows and columns.', fields: [], structured: 'table' },
  { type: 'argument', label: 'Argument', shortLabel: 'Argument', description: 'An argument with evidence and a reasoned response.', fields: [
    { key: 'argument', label: 'Argument', kind: 'textarea', required: true }, { key: 'explanation', label: 'Explanation', kind: 'textarea' },
    { key: 'evidence', label: 'Supporting evidence', kind: 'textarea' }, { key: 'example', label: 'Example', kind: 'textarea' },
    { key: 'counterargument', label: 'Counterargument', kind: 'textarea' },
    { key: 'response', label: 'Response to counterargument', kind: 'textarea' }, { key: 'sourceName', label: 'Source' },
  ] },
  { type: 'cause-effect', label: 'Causes & Effects', shortLabel: 'Cause/Effect', description: 'Multiple causes and effects with a connecting explanation.', fields: [
    { key: 'explanation', label: 'Connecting explanation', kind: 'textarea' },
  ], structured: 'cause-effect' },
  { type: 'problem-solution', label: 'Problem & Solution', shortLabel: 'Solution', description: 'A problem diagnosis and practical way forward.', fields: [
    { key: 'problem', label: 'Problem', kind: 'textarea', required: true }, { key: 'causes', label: 'Causes', kind: 'textarea' },
    { key: 'impacts', label: 'Impacts', kind: 'textarea' }, { key: 'responses', label: 'Existing responses', kind: 'textarea' },
    { key: 'solutions', label: 'Proposed solutions', kind: 'textarea' }, { key: 'wayForward', label: 'Way forward', kind: 'textarea' },
  ] },
  { type: 'book-note', label: 'Book or Research Note', shortLabel: 'Reading', description: 'Capture a publication’s argument and useful evidence.', fields: [
    { key: 'author', label: 'Author' }, { key: 'publication', label: 'Publication' }, { key: 'year', label: 'Year' },
    { key: 'centralArgument', label: 'Central argument', kind: 'textarea' }, { key: 'evidence', label: 'Useful evidence', kind: 'textarea' },
    { key: 'quotation', label: 'Important quotation', kind: 'textarea' }, { key: 'notes', label: 'Personal notes', kind: 'textarea' },
    { key: 'citation', label: 'Citation or link' },
  ] },
  { type: 'media', label: 'Image, Map or Diagram', shortLabel: 'Media', description: 'An uploaded visual with caption, explanation and source.', fields: [
    { key: 'caption', label: 'Caption' }, { key: 'explanation', label: 'Explanation', kind: 'textarea' },
    { key: 'sourceName', label: 'Source' }, { key: 'altText', label: 'Alternative text', kind: 'textarea', required: true },
  ] },
  { type: 'rich-note', label: 'Flexible Rich Note', shortLabel: 'Rich Note', description: 'A formatted academic note with headings, lists, quotes and links.', fields: [
    { key: 'html', label: 'Formatted note', kind: 'rich', required: true },
  ] },
]

export const ENTRY_TYPE_MAP = new Map(ENTRY_TYPE_DEFINITIONS.map((definition) => [definition.type, definition]))

export function createEmptyContent(type: FactbookEntryType): Record<string, unknown> {
  const definition = ENTRY_TYPE_MAP.get(type)
  const content: Record<string, unknown> = {}
  definition?.fields.forEach((field) => { content[field.key] = '' })
  if (definition?.structured === 'timeline') content.timeline = [{ date: '', title: '', description: '', source: '' }]
  if (definition?.structured === 'comparison') content.comparison = { items: ['Item A', 'Item B'], criteria: [{ criterion: '', values: ['', ''] }] }
  if (definition?.structured === 'table') content.table = { columns: ['Column 1', 'Column 2'], rows: [['', '']], alignments: ['left', 'left'], headerColor: '#e8f3ed' }
  if (definition?.structured === 'cause-effect') {
    content.causes = ['']
    content.effects = ['']
  }
  return content
}
