import type { BankQuestion } from './mcq.ts'
import grammarSource from './bundled-grammar/urdu.json' with { type: 'json' }

type SourceItem = {
  id: string
  fields: { label: string; value: string }[]
  sourcePage: number
}

type Fact = {
  id: string
  term: string
  definition: string
  example: string
  sourcePage: number
  group: number
}

const termLabels = new Set([
  'عنوان', 'کلمہ کی قسم', 'قسم', 'اسم', 'فعل کی قسم', 'حرف کی قسم', 'عنوان / قسم', 'مرکب', 'موضوع', 'اصطالح',
])
const definitionLabels = new Set(['تفصیل', 'تعریف', 'تعارف', 'مفہوم', 'کل تعداد / تعریف'])
const exampleLabels = new Set(['مثال', 'مثالیں', 'مثال / تمام حروف', 'مثال (اردو میں)', 'جملہ', 'وضاحتی جملہ'])

function sourceNumber(id: string) {
  return Number(id.replace('urdu-', ''))
}

function groupFor(number: number) {
  if (number <= 49) return 1
  if (number <= 92) return 2
  if (number <= 115) return 3
  if (number <= 142) return 4
  return 5
}

function cleanTerm(value: string) {
  return value
    .replace(/^[\d۰-۹]+\s*[.)۔]?\s*/u, '')
    .replace(/[۔\s]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const sourceItems = grammarSource.topics.flatMap((topic) => topic.items) as SourceItem[]
const facts: Fact[] = sourceItems
  .filter((item) => {
    const number = sourceNumber(item.id)
    return (number >= 1 && number <= 49)
      || (number >= 54 && number <= 92)
      || (number >= 96 && number <= 158)
  })
  .map((item) => {
    const term = cleanTerm(item.fields.find((field) => termLabels.has(field.label))?.value ?? '')
    const definition = item.fields.find((field) => definitionLabels.has(field.label))?.value.trim() ?? ''
    const example = item.fields.find((field) => exampleLabels.has(field.label))?.value.trim() ?? ''
    return { id: item.id, term, definition, example, sourcePage: item.sourcePage, group: groupFor(sourceNumber(item.id)) }
  })
  .filter((fact) => fact.term.length >= 2 && fact.definition.length >= 8)
  .filter((fact, index, rows) => rows.findIndex((candidate) => candidate.term === fact.term && candidate.definition === fact.definition) === index)

function rotate<T>(values: T[], offset: number) {
  const shift = offset % values.length
  return values.slice(shift).concat(values.slice(0, shift))
}

function companions(fact: Fact) {
  const group = facts.filter((candidate) => candidate.group === fact.group && candidate.id !== fact.id)
  const start = Math.max(0, group.findIndex((candidate) => sourceNumber(candidate.id) > sourceNumber(fact.id)))
  const ordered = group.slice(start).concat(group.slice(0, start))
  const picked: Fact[] = []
  for (const candidate of ordered) {
    if (candidate.term === fact.term || candidate.definition === fact.definition) continue
    if (picked.some((row) => row.term === candidate.term || row.definition === candidate.definition)) continue
    picked.push(candidate)
    if (picked.length === 3) break
  }
  if (picked.length !== 3) throw new Error(`Insufficient Urdu grammar distractors for ${fact.id}`)
  return picked
}

function prepareOptions(correct: string, distractors: string[], seed: number) {
  const base = [correct, ...distractors]
  if (new Set(base).size !== 4) throw new Error(`Duplicate Urdu grammar option near source row ${seed}`)
  const options = rotate(base, seed % 4)
  return { options, answer: options.indexOf(correct) }
}

const questions: BankQuestion[] = []
facts.forEach((fact, factIndex) => {
  const other = companions(fact)
  const citation = `ذخیرۂ قواعد، ماخذ صفحہ ${fact.sourcePage}: ${fact.term} — ${fact.definition}`

  {
    const { options, answer } = prepareOptions(fact.term, other.map((row) => row.term), factIndex)
    questions.push({
      id: `mpt-repo-urdu-${fact.id}-definition`,
      q: `یہ تعریف کس اصطلاح کی ہے؟ “${fact.definition}”`,
      o: options,
      a: answer,
      s: 'قواعد و زبان',
      e: citation,
      d: 'Advanced',
    })
  }

  {
    const { options, answer } = prepareOptions(fact.definition, other.map((row) => row.definition), factIndex + 1)
    questions.push({
      id: `mpt-repo-urdu-${fact.id}-meaning`,
      q: `“${fact.term}” کی درست تعریف منتخب کریں۔`,
      o: options,
      a: answer,
      s: 'قواعد و زبان',
      e: citation,
      d: 'Advanced',
    })
  }

  {
    const correct = `${fact.term} — ${fact.definition}`
    const distractors = other.map((row, index) => `${row.term} — ${other[(index + 1) % other.length].definition}`)
    const { options, answer } = prepareOptions(correct, distractors, factIndex + 2)
    questions.push({
      id: `mpt-repo-urdu-${fact.id}-pair`,
      q: `ان اصطلاحات—${[fact.term, ...other.map((row) => row.term)].join('، ')}—میں درست اصطلاح اور تعریف کا جوڑا منتخب کریں۔`,
      o: options,
      a: answer,
      s: 'قواعد و زبان',
      e: citation,
      d: 'Advanced',
    })
  }

  if (fact.example) {
    const { options, answer } = prepareOptions(fact.term, other.map((row) => row.term), factIndex + 3)
    questions.push({
      id: `mpt-repo-urdu-${fact.id}-application`,
      q: `تعریف “${fact.definition}” اور مثال “${fact.example}” کس اصطلاح کو ظاہر کرتی ہیں؟`,
      o: options,
      a: answer,
      s: 'قواعد و زبان',
      e: citation,
      d: 'Advanced',
    })
  }
})

export const repositoryMptUrduGrammarQuestions = questions.filter((question, index, rows) => (
  rows.findIndex((candidate) => candidate.q === question.q) === index
))
