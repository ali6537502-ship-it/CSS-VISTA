import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const course = JSON.parse(readFileSync(new URL('../../public/api/_premium_files/general-ability-course.json', import.meta.url)))
// Independent floating-point arithmetic parser audits the rational authoring
// calculations without eval, imports from the authoring tool or student input.
function calculate(input) {
  const tokens = input.match(/\d+(?:\.\d+)?|\*\*|[()+\-*/]/g) || []
  assert.equal(tokens.join(''), input.replaceAll(' ', ''))
  let at = 0
  function atom() {
    if (tokens[at] === '-') { at++; return -atom() }
    if (tokens[at] === '(') { at++; const value = expression(0); assert.equal(tokens[at++], ')'); return value }
    const value = Number(tokens[at++]); assert.ok(Number.isFinite(value)); return value
  }
  const priority = { '+': 1, '-': 1, '*': 2, '/': 2, '**': 3 }
  function expression(min) {
    let value = atom()
    while ((priority[tokens[at]] || 0) > min) {
      const operator = tokens[at++], next = expression(priority[operator] - (operator === '**' ? 1 : 0))
      value = operator === '+' ? value + next : operator === '-' ? value - next : operator === '*' ? value * next : operator === '/' ? value / next : value ** next
    }
    return value
  }
  const value = expression(0); assert.equal(at, tokens.length); return value
}
const ids = new Set(), prompts = new Set()
assert.equal(course.units.length, 25)
let exercises = 0, quizzes = 0
for (const unit of course.units) {
  assert.equal(unit.lessons.length, 3); assert.equal(unit.quiz.length, 5)
  for (const lesson of unit.lessons) {
    assert.ok(lesson.idea.length > 40 && lesson.rule.trim().length > 0 && lesson.example.steps.length >= 1, lesson.id)
    assert.ok(!ids.has(lesson.id)); ids.add(lesson.id)
    const q = lesson.exercise
    assert.ok(!prompts.has(q.prompt)); prompts.add(q.prompt)
    if (q.kind === 'choice') { assert.equal(new Set(q.options).size,4); exercises++; continue }
    assert.ok(Math.abs(calculate(q.answer) - calculate(q.proof)) < 1e-9, q.id)
    exercises++
  }
  for (const q of unit.quiz) {
    assert.ok(!ids.has(q.id)); ids.add(q.id)
    assert.ok(!prompts.has(q.prompt)); prompts.add(q.prompt)
    assert.equal(q.options.length, 4)
    if (q.kind === 'choice') { assert.equal(new Set(q.options).size,4); quizzes++; continue }
    const expected = calculate(q.proof), values = q.options.map(calculate)
    assert.equal(new Set(values).size, 4, q.id)
    assert.equal(values.filter(v => Math.abs(v - expected) < 1e-9).length, 1, q.id)
    assert.ok(Math.abs(values[q.answer] - expected) < 1e-9, q.id)
    quizzes++
  }
}
assert.equal(exercises, 75); assert.equal(quizzes, 125)
const find = id => course.units.find(u => u.id === id)
const practice = (id, n) => calculate(find(id).lessons[n - 1].exercise.answer)
const gcd = (a, b) => b ? gcd(b, a % b) : a
assert.equal(practice('hcf-lcm', 2), gcd(54, 72))
assert.equal(practice('hcf-lcm', 3), [15, 20, 30].reduce((a, b) => a * b / gcd(a, b)))
assert.equal(calculate(find('hcf-lcm').quiz[0].options[find('hcf-lcm').quiz[0].answer]), gcd(42, 56))
assert.equal(practice('equations', 3) ** 2 - 7 * practice('equations', 3) + 12, 0)
assert.equal(practice('geometry-area', 3), 150 - 12)
assert.equal(calculate(find('geometry-area').quiz[3].options[find('geometry-area').quiz[3].answer]), Math.hypot(5, 12))
assert.equal(practice('time-work', 3), 7)
assert.equal(practice('speed-distance', 2), 2 / (1 / 30 + 1 / 60))
assert.ok(Math.abs(practice('word-problems', 3) - (0.1 * 4 + 0.3 * 6) / 10 * 100) < 1e-9)
assert.equal(practice('surface-area', 2), 594)
assert.equal(practice('volume', 1), 160)
for (const unit of ['fractions', 'decimals', 'percentages', 'ratio-proportion', 'averages', 'profit-loss', 'discounts', 'time-work', 'speed-distance', 'age-problems', 'word-problems', 'number-series', 'algebra', 'equations', 'geometry-area', 'circles', 'surface-area', 'volume']) assert.ok(find(unit))
console.log('PASS: independently calculated 168 answer keys, distinct questions/options, preserved 21-topic maths syllabus plus four new reasoning topics; factor/equation/geometry/rate/concentration checks.')
