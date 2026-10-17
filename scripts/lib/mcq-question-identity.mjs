/**
 * A question includes its answer choices: a generic instruction stem alone
 * cannot distinguish separate grammar exercises. Choice order does not create
 * a new question; retain the actual correct answer when normalizing it.
 */
export function mcqQuestionIdentity(question) {
  const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
  const choices = Array.isArray(question.o) ? question.o.map(normalize) : []
  return JSON.stringify([
    normalize(question.q),
    [...choices].sort(),
    choices[question.a] ?? null,
  ])
}
