import type { Question } from './types'

/** Display order only: submitted choices always retain their original server indexes. */
export function orderedTopicOptions(question: Pick<Question, 'id' | 'options'>) {
  const options = question.options.map((option, index) => ({ option, index }))
  // Retain meaning for older/imported questions whose wording refers to option positions.
  const positional = /\b(?:all|none|both) (?:of )?(?:the )?(?:above|below)\b|\b(?:option|choice)\s+[A-D1-4]\b|\b[A-D]\s+(?:and|&)\s+[A-D]\b/i
  if (question.options.some((option) => positional.test(option))) return options
  // Stable across renders, retries and devices without storing another student record.
  // This seed uses public question content, never an answer key or account information.
  let seed = 2166136261
  for (const character of JSON.stringify([question.id, question.options])) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619)
  }
  for (let position = options.length - 1; position > 0; position--) {
    seed = (seed + 0x6d2b79f5) | 0
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    const target = Math.floor((((value ^ (value >>> 14)) >>> 0) / 4294967296) * (position + 1))
    ;[options[position], options[target]] = [options[target], options[position]]
  }
  return options
}
