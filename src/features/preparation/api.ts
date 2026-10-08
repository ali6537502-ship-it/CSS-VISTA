import { useCallback, useState } from 'react'
import { useAccount } from '@/lib/accountContext'
import { HostingerApiError } from '@/lib/hostingerApi'
import { learningRequest, type Attempt } from '@/features/learning/api'
export type Candidate = {
  work_key: string
  kind: string
  unit_id: string | null
  title: string
  subject: string
  why: string
  to: string
  minutes: number
  carry_id?: string
  requires_pro?: boolean
}
export type Task = {
  id: string
  version: number
  minutes: number
  actual_minutes: number
  status: string
  kind: string
  snapshot: Candidate
  moved_to: string | null
}
export type Plan = {
  id: string
  plan_date: string
  version: number
  budget: number
  rule_version: string
  tasks: Task[]
}
export type Capacity = {
  total: number
  covered: number
  remaining: number
  coverage_percentage: number | null
  revision_due: number
  days_remaining: number | null
  estimated_coverage_minutes: number
  coverage_capacity_minutes: number | null
  estimated_shortfall_minutes: number | null
  basis: string
}
export type Unit = {
  id: string
  subject_id: string
  subject: string
  title: string
  items: string[]
  to: string
  paper_to: string
  source_kind: string
  paper_count: number
  version: number
  coverage: string
  source_changed: boolean
  last_studied: string | null
  next_revision: string | null
  review_count: number
  mcq_count: number
  paper_reviews: number
  written_answers: number
  mentor_evaluated: number
  tests: number
  imported_states: Record<string, string> | null
}
export type PlanData = {
  attempt: Attempt
  today: string
  active: boolean
  settings: { version: number; religion_choice: string | null; imported_at: string | null }
  plan: Plan | null
  proposal: {
    date: string
    expected_version: number
    hash: string
    budget: number
    rule_version: string
    has_changes: boolean
    requires_setup: boolean
    summary: Capacity
    selection: {
      tasks: Candidate[]
      locked: Task[]
      allocated_minutes: number
      remaining_minutes: number
      recorded_over_budget_minutes: number
    }
  }
  revision: {
    unit: { id: string; title: string; to: string }
    due: string
    last_studied: string | null
  }[]
  revision_total: number
  overdue: Task[]
  continue: { grammar: string; precis: string }
}
export type Mutation = Record<string, unknown>
type Pending = { user: string; attempt: string; body: Mutation }
export const primary =
  'inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50'
export const secondary =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50'
export const field =
  'min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950'
export function usePreparationAction(attempt: string, onSaved: () => void) {
  const { user } = useAccount(),
    id = user?.id ?? ''
  const key = `cssvista:attempt-action:${id}:${attempt}`
  const [pending, setPending] = useState<Pending | null>(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || 'null') as Pending | null
      return value?.user === id && value.attempt === attempt ? value : null
    } catch {
      return null
    }
  })
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [unaccepted, setUnaccepted] = useState(false)
  const clear = useCallback(() => {
    sessionStorage.removeItem(key)
    setPending(null)
    setUnaccepted(false)
  }, [key])
  const accepted = () => {
    clear()
    setMessage('Saved to this preparation attempt.')
    setError('')
    onSaved()
  }
  async function send(body: Mutation) {
    if (pending || busy) return
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const saved: Pending = {
        user: id,
        attempt,
        body: { ...body, attempt_id: attempt, request_id: crypto.randomUUID() },
      }
      sessionStorage.setItem(key, JSON.stringify(saved))
      setPending(saved)
      setUnaccepted(false)
      await learningRequest(id, 'planner.php', saved.body)
      accepted()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Save could not be confirmed. Check the saved action before continuing.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function recover(retry = false) {
    if (!pending || busy) return
    setBusy(true)
    setError('')
    try {
      await learningRequest(
        id,
        `planner.php?request_id=${encodeURIComponent(String(pending.body.request_id))}`,
      )
      accepted()
    } catch (cause) {
      if (cause instanceof HostingerApiError && cause.status === 404) {
        setUnaccepted(true)
        if (retry) {
          try {
            await learningRequest(id, 'planner.php', pending.body)
            accepted()
          } catch (e) {
            setError(e instanceof Error ? e.message : 'The saved action could not be accepted.')
          }
        } else
          setMessage(
            'No accepted receipt was found. Retry this exact action, or discard it and review fresh records.',
          )
      } else
        setError(cause instanceof Error ? cause.message : 'The saved action could not be checked.')
    } finally {
      setBusy(false)
    }
  }
  return {
    send,
    recover,
    pending,
    busy,
    blocked: busy || !!pending,
    message,
    error,
    unaccepted,
    discard: () => {
      if (unaccepted && !busy) {
        clear()
        setMessage('Unaccepted action discarded. Review fresh records before saving.')
        setError('')
        onSaved()
      }
    },
  }
}
export type PreparationAction = ReturnType<typeof usePreparationAction>
