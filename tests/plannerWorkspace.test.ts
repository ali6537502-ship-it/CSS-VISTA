import test from 'node:test'
import assert from 'node:assert/strict'
import { dayWorkload, plannerHref, plannerView, revisionGroups, shiftDay, taskOrder, validDay, weekDays } from '../src/features/planner/model.ts'
import type { StudyScheduleTask } from '../src/lib/store.ts'
import type { ReviewSchedule } from '../src/lib/progress.ts'

test('planner routes retain legacy settings anchors, syllabus links and explicit views', () => {
  assert.equal(plannerView('/account/tasks', new URLSearchParams()), 'today')
  assert.equal(plannerView('/account/plan', new URLSearchParams()), 'settings')
  assert.equal(plannerView('/study-planner', new URLSearchParams(), '#plan-management'), 'settings')
  assert.equal(plannerView('/study-planner', new URLSearchParams('subject=political-science&topic=rights&unit=political-science:section:0')), 'syllabus')
  assert.equal(plannerView('/account/tasks', new URLSearchParams('view=week&subject=political-science')), 'week')
  assert.equal(plannerView('/account/tasks', new URLSearchParams('view=unknown')), 'today')
  assert.equal(plannerHref('/study-tools', new URLSearchParams('subject=political-science'), 'week'), '/study-planner?subject=political-science&view=week')
  assert.equal(plannerHref('/account/tasks', new URLSearchParams('keep=1'), 'goals', '#saved'), '/account/tasks?keep=1&view=goals#saved')
})
test('calendar uses valid local date keys and Monday-to-Sunday weeks across year boundaries', () => {
  assert.equal(validDay('2026-02-30'), false)
  assert.equal(validDay('2028-02-29'), true)
  assert.equal(validDay('2026-2-01'), false)
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01')
  assert.deepEqual(weekDays('2027-01-03'), ['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03'])
})
function task(id: string, time: string | undefined, minutes: number, status: StudyScheduleTask['status'] = 'in-progress'): StudyScheduleTask {
  return { id, time, minutes, status, date:'2026-10-25', subject:'Political Science', paper:'Paper I', topic:id, section:'Theory', syllabusItemId:`political-science:0:${id}`, createdAt:'2026-10-24T12:00:00Z' }
}
test('workload counts estimates without inferring measured time, and detects only genuine overlaps', () => {
  const tasks = [task('a','09:00',60), task('b','09:30',30), task('c','10:00',30), task('d','09:00',90,'completed'), task('e',undefined,30)]
  const report = dayWorkload(tasks, '2026-10-25', 2)
  assert.equal(report.minutes, 240)
  assert.equal(report.capacity, 120)
  assert.equal(report.overBy, 120)
  assert.deepEqual([...report.overlaps].sort(), ['a','b'])
  assert.equal(dayWorkload(tasks,'2026-10-25').capacity, null)
  assert.equal(dayWorkload(tasks,'2026-10-26',2).minutes, 0)
  assert.deepEqual([...tasks].sort(taskOrder).map(row => row.id), ['a','d','b','c','e'])
  assert.equal(tasks[0].id,'a', 'selectors do not mutate saved records')
})
test('revision groups distinguish upcoming work from genuine previously reviewed records', () => {
  const reviews: ReviewSchedule[] = [
    {id:'due',cat:'Science',level:0,streak:0,lapses:1,intervalDays:1,lastReviewedAt:0,dueAt:100},
    {id:'upcoming',cat:'English',level:2,streak:2,lapses:0,intervalDays:7,lastReviewedAt:200,dueAt:1000},
    {id:'invalid',cat:'English',level:0,streak:0,lapses:0,intervalDays:1,lastReviewedAt:0,dueAt:NaN},
  ]
  const groups = revisionGroups(reviews,500)
  assert.deepEqual(groups.due.map(review=>review.id),['due'])
  assert.deepEqual(groups.upcoming.map(review=>review.id),['upcoming'])
  assert.deepEqual(groups.reviewed.map(review=>review.id),['upcoming'])
  assert.deepEqual(revisionGroups([],500),{due:[],upcoming:[],reviewed:[]})
})
