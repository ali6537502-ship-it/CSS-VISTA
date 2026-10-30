import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildStudyDays,
  coveredCount,
  firstPendingDay,
  handbookUnits,
  questionForDay,
  safeDay,
  safeUnitStep,
  skillForChapter,
} from '../src/features/precis/guideModel.ts'
import type { Chapter, Overview } from '../src/features/precis/api.ts'

const chapters: Chapter[] = [
  {
    id: '1',
    title: '1. First chapter',
    blocks: [
      { type: 'paragraph', text: 'Opening from the original book.' },
      { type: 'heading', text: 'Essential distinction' },
      { type: 'table', rows: [['Topic', 'Claim'], ['Science', 'Science needs ethical safeguards.']] },
      { type: 'bullet', text: 'Keep the central argument.' },
    ],
  },
  {
    id: '2',
    title: '2. Examination framework',
    blocks: [
      { type: 'paragraph', text: 'Follow the printed question instructions.' },
      { type: 'paragraph', text: 'Keep the main meaning.' },
    ],
  },
  {
    id: '3',
    title: '3. Rules',
    blocks: [
      { type: 'table', rows: [['Preserve meaning', 'Do not distort the writer.']] },
      { type: 'table', rows: [['Remove repetition', 'Keep essential links.']] },
    ],
  },
]

test('All original teaching blocks, including tables and bullets, are preserved once', () => {
  const units = handbookUnits(chapters)
  assert.equal(units.length, 7)
  assert.deepEqual(units.map((u) => u.id), ['1:0', '1:2', '1:3', '2:0', '2:1', '3:0', '3:1'] )
  assert.equal(units[1].section, 'Essential distinction')
  assert.deepEqual(units[1].block, chapters[0].blocks[2])
})

test('Pace selection partitions the whole source sequentially with no omission or duplication', () => {
  const units = handbookUnits(chapters)
  for (const days of [1, 2, 3, 4, 5, 6, units.length]) {
    const schedule = buildStudyDays(units, days)
    assert.equal(schedule.length, days)
    assert.ok(schedule.every((day) => day.units.length > 0))
    assert.deepEqual(schedule.flatMap((day) => day.units.map((unit) => unit.id)), units.map((unit) => unit.id))
    assert.deepEqual(schedule.map(day => day.day), Array.from({ length: days }, (_, i) => i + 1))
  }
})

test('Studied sections survive changes in course duration without acquiring fake completion', () => {
  const units = handbookUnits(chapters)
  const completed = [units[0].id, units[1].id]
  const short = buildStudyDays(units, 3)
  const longer = buildStudyDays(units, 5)
  assert.equal(coveredCount(units, completed), 2)
  assert.equal(firstPendingDay(short, completed) >= 1, true)
  assert.equal(firstPendingDay(longer, completed) >= 1, true)
  assert.equal(coveredCount(units, [...completed, 'not-real', units[0].id]), 2)
})

test('Daily question uses existing authored questions with no answer key in browser', () => {
  const units = handbookUnits(chapters)
  const day = buildStudyDays(units, 3)[0]
  const data = {
    catalog: {
      chapters,
      passages: [],
      source_sha256: 'handbook',
      questions: [{
        id: 'reviewed-original-q',
        skill: 'central_idea',
        prompt: 'An authored exercise',
        options: ['First option', 'Second option'],
        hint: 'An authored hint',
      }],
    },
  } as unknown as Overview
  const question = questionForDay(data, day)
  assert.equal(question?.id, 'reviewed-original-q')
  assert.equal(question && Object.hasOwn(question, 'answer'), false)
  assert.equal(skillForChapter('12'), 'title')
  assert.equal(skillForChapter('9'), 'qualifications')
})

test('Invalid day and section parameters fall back safely', () => {
  assert.equal(safeDay('11', 30, 1), 11)
  assert.equal(safeDay('99', 30, 1), 1)
  assert.equal(safeDay('-3', 30, 1), 1)
  assert.equal(safeDay('1.2', 30, 1), 1)
  assert.equal(safeUnitStep('2', 4), 2)
  assert.equal(safeUnitStep('8', 4), 0)
  assert.equal(safeUnitStep('invalid', 4), 0)
  assert.throws(() => buildStudyDays(handbookUnits(chapters), 100))
})
