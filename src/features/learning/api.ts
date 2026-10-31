import { RESET_CHANGED_EVENT } from '@/features/preparation-reset/model'
import { useCallback, useEffect, useState } from 'react'
import type { TutorResult } from '@/features/tutor/api'
import { useAccount } from '@/lib/accountContext'
import { currentHostingerAccountUser, currentPreparationGeneration, hostingerRequest } from '@/lib/hostingerApi'
export type Attempt = { id: string; target_year: number; target_date: string | null; date_source: 'student_target'; optional_subject_ids: string[]; daily_minutes: number; stage: 'starting' | 'in_progress' | 'revision'; version: number; updated_at: string }
export type Subject = { slug: string; name: string; marks: number; group: number }
export type WritingSummary = { id: string; attempt_id: string; kind: 'sentence' | 'paragraph' | 'precis'; title: string; version: number; updated_at: string }
export type Writing = WritingSummary & { guided_workspace?: { id: string; feature: import('@/features/skills/api').Feature } | null; versions: { id: string; version: number; word_count: number; created_at: string }[] }
export type WritingVersion = { id: string; writing_id: string; version: number; text: string; word_count: number; created_at: string }
export type Overview = { attempts: Attempt[]; writing: WritingSummary[]; catalog: Subject[]; has_more_attempts: boolean; has_more_writing: boolean }
export type SaveResult = { attempt_id?: string; writing_id?: string; version_id?: string; version: number }
export type AiUsage = { date: string; live_actions_enabled: boolean; handwriting_enabled: boolean; expression_enabled: boolean; precis_enabled: boolean; tutor_enabled: boolean; skills_enabled?: Record<string, boolean>; limits: { feature: string; used: number; reserved: number; limit: number; provider_calls: number }[]; operations: { guided_workspace?: { id: string; feature: import('@/features/skills/api').Feature } | null; id: string; feature: string; version_id: string | null; state: string; accounting: string; created_at: string; result: { summary: string; findings: { code: string; excerpt: string; explanation: string; hint: string }[] } | { readable: boolean; uncertain: boolean; reason: string } | TutorResult | null }[]; has_more: boolean }
export const featureNames: Record<string, string> = { argumentation: 'Argumentation feedback', analysis: 'Analytical feedback', essay: 'Essay learning feedback', precis: 'Précis feedback', paragraph: 'Paragraph feedback', sentence: 'Sentence checks', tutor: 'Ask VISTA', current_affairs: 'Current Affairs assistance', maths: 'Maths explanations', handwriting: 'Handwritten paragraph feedback', handwriting_extract: 'Handwriting extraction' }
export async function learningRequest<T>(userId: string, path: string, body?: Record<string, unknown>, signal?: AbortSignal) {
  if (currentHostingerAccountUser() !== userId) throw new Error('Please sign in again to open your preparation records.')
  const generation = currentPreparationGeneration()
  const data = await hostingerRequest<T>(`student/${path}`, { signal, headers: { 'X-CSSV-User': userId }, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) })
  if (currentHostingerAccountUser() !== userId) throw new Error('Your account changed. Reopen your preparation records.')
  if (generation !== currentPreparationGeneration()) throw new Error('Preparation was reset while this view was loading. Open the current plan again.')
  return data
}
export function useLearning<T>(path?: string) {
  const { user } = useAccount()
  const id = user?.id
  const [snapshot, setSnapshot] = useState<{ id: string; path: string; data?: T; error?: string }>()
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion(v => v + 1), [])
  useEffect(() => {
    if (!id || !path) return
    const controller = new AbortController()
    void learningRequest<T>(id, path, undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) setSnapshot({ id, path, data })
    }).catch(cause => {
      if (!controller.signal.aborted) setSnapshot({ id, path, error: cause instanceof Error ? cause.message : 'Preparation records could not be loaded.' })
    })
    return () => controller.abort()
  }, [id, path, version])
  useEffect(() => {
    const reset = (event: Event) => { if ((event as CustomEvent<{ owner: string }>).detail?.owner === id) refresh() }
    window.addEventListener(RESET_CHANGED_EVENT, reset)
    return () => window.removeEventListener(RESET_CHANGED_EVENT, reset)
  }, [id, refresh])
  const current = snapshot?.id === id && snapshot?.path === path ? snapshot : undefined
  return { data: current?.data, error: current?.error, refresh }
}
/** Only an opaque identity/hash persists; no submitted text is put in a request key. */
export async function saveIdentity(userId: string, scope: string, body: Record<string, unknown>) {
  const id = crypto.randomUUID()
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(body)))
    const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
    const key = `cssvista:learning-request:${userId}:${scope}`
    const stored = JSON.parse(sessionStorage.getItem(key) || 'null') as { id?: string; hash?: string } | null
    const identity = stored?.hash === hash && stored.id && /^[a-f0-9-]{36}$/i.test(stored.id) ? stored.id : id
    sessionStorage.setItem(key, JSON.stringify({ id: identity, hash }))
    return { id: identity, done: () => { try { sessionStorage.removeItem(key) } catch { /* Optional retry cache. */ } } }
  } catch { return { id, done: () => {} } }
}
export const inputStyle = 'min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal focus-visible:ring-2 focus-visible:ring-pine'
export const buttonStyle = 'inline-flex min-h-11 items-center justify-center rounded-lg bg-pine px-5 py-2 text-sm font-semibold text-white disabled:opacity-50'
export const secondaryStyle = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50'
