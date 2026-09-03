import test from 'node:test'
import assert from 'node:assert/strict'
import { formatOneLiner } from '../src/lib/oneLinerFormat.ts'

test('formats labelled facts as separate readable fields', () => {
  assert.deepEqual(
    formatOneLiner('Country: United States; Currency: US Dollar; Currency Code: USD'),
    {
      kind: 'fields',
      fields: [
        { label: 'Country', value: 'United States' },
        { label: 'Currency', value: 'US Dollar' },
        { label: 'Currency Code', value: 'USD' },
      ],
    },
  )
})

test('keeps semicolons inside a labelled value', () => {
  assert.deepEqual(
    formatOneLiner('Component: RAM; Full Form: Random Access Memory; Description: Volatile memory; temporarily stores active processes.'),
    {
      kind: 'fields',
      fields: [
        { label: 'Component', value: 'RAM' },
        { label: 'Full Form', value: 'Random Access Memory' },
        { label: 'Description', value: 'Volatile memory; temporarily stores active processes.' },
      ],
    },
  )
})

test('formats term definitions and plain lists without changing their words', () => {
  assert.deepEqual(
    formatOneLiner("Worm - Self-replicating malware; unlike viruses, it doesn't require a host program"),
    { kind: 'term', term: 'Worm', detail: "Self-replicating malware; unlike viruses, it doesn't require a host program" },
  )
  assert.deepEqual(
    formatOneLiner('Province/Territory; Divisions; Districts'),
    { kind: 'list', items: ['Province/Territory', 'Divisions', 'Districts'] },
  )
})

test('leaves normal sentences as normal text', () => {
  const sentence = 'A light-year is the distance light travels in one year.'
  assert.deepEqual(formatOneLiner(sentence), { kind: 'text', text: sentence })
})
