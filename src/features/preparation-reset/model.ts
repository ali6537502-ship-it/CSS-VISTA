export type ResetScope = 'timetable' | 'planner' | 'preparation' | 'attempt-plan'
export type ResetSelection = { scope: ResetScope; subject?: string; start?: string; end?: string; keep_settings?: boolean; attempt_id?: string; date?: string }
export type ResetEvent = ResetSelection & { id: string; at: string }
export type ResetControl = { revision: number; generation: string; events: ResetEvent[]; full_reset: string | null }
export type ProgressSnapshot = Record<string, unknown>
export const RESET_FAILED_EVENT = 'cssvista:preparation-reset-device-failed'
export const RESET_PHASE_EVENT = 'cssvista:preparation-reset-phase'
export const RESET_CHANGED_EVENT = 'cssvista:preparation-reset-applied'
export const RESET_CONTROL_KEY = '__cssv_reset_v1'
export const generationKey = (owner: string) => `cssvista:sync-generation:v1:${owner}`
export const fullResetKey = (owner: string) => `cssvista:study-reset:v1:${owner}`
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const progressKey = (key: string) => key === 'cssvista:v1' || key === 'cssvista:progress:v1' || key.startsWith('cssvista:tool:')
export function matchesTask(value: unknown, selection: ResetSelection) {
  const task = record(value)
  if (selection.subject && task.subject !== selection.subject) return false
  if ((selection.start || selection.end) && typeof task.date !== 'string') return false
  const date = String(task.date || '')
  return (!selection.start || date >= selection.start) && (!selection.end || date <= selection.end)
}
/** Presentation adapter over the existing snapshot. No new task database. */
export function applyPreparationReset(snapshot: ProgressSnapshot, selection: ResetSelection): ProgressSnapshot {
  const next = structuredClone(snapshot), state = record(next['cssvista:v1'])
  if (selection.scope === 'attempt-plan') return next
  if (selection.scope === 'preparation') {
    for (const key of Object.keys(next)) if (progressKey(key)) delete next[key]
    const kept: Record<string, unknown> = {}
    if (selection.keep_settings !== false && state.studyPlanner) kept.studyPlanner = state.studyPlanner
    if (selection.keep_settings !== false && snapshot['cssvista:tool:pms-planner:v1']) next['cssvista:tool:pms-planner:v1'] = snapshot['cssvista:tool:pms-planner:v1']
    if (state.vistaShortcut) kept.vistaShortcut = state.vistaShortcut
    if (Object.keys(kept).length) next['cssvista:v1'] = kept
    return next
  }
  if (next['cssvista:v1'] !== undefined && (!next['cssvista:v1'] || typeof next['cssvista:v1'] !== 'object' || Array.isArray(next['cssvista:v1']))) throw new Error('Saved preparation format needs review. No partial reset was applied on this device.')
  if (state.studyScheduleTasks !== undefined && !Array.isArray(state.studyScheduleTasks)) throw new Error('Saved timetable format needs review. No partial reset was applied on this device.')
  const tasks = Array.isArray(state.studyScheduleTasks) ? state.studyScheduleTasks : []
  const removed = new Set(tasks.filter(task => selection.scope === 'planner' || matchesTask(task, selection)).map(task => String(record(task).id || '')))
  state.studyScheduleTasks = tasks.filter(task => !removed.has(String(record(task).id || '')))
  const archive = record(next['cssvista:tool:my-tasks-archive:v1'])
  for (const id of removed) delete archive[id]
  if (next['cssvista:tool:my-tasks-archive:v1'] && typeof next['cssvista:tool:my-tasks-archive:v1'] === 'object' && !Array.isArray(next['cssvista:tool:my-tasks-archive:v1'])) next['cssvista:tool:my-tasks-archive:v1'] = archive
  if (selection.scope === 'planner') {
    Object.assign(state, { planTaskCompletions: {}, goalChecklist: [], goalText: '', quickNotes: '' })
    if (selection.keep_settings === false) { state.studyPlanner = null; delete next['cssvista:tool:pms-planner:v1'] }
  }
  next['cssvista:v1'] = state
  return next
}
export function resetsSince(control: ResetControl, known: string | null): ResetEvent[] {
  if (known === control.generation) return []
  const index = control.events.findIndex(event => event.id === known)
  return index < 0 ? control.events : control.events.slice(index + 1)
}
