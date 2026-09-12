import type { z } from 'zod'
import { getSupabaseClient } from '@/lib/supabase'
import { ensureHostingerSession, HostingerApiError, hostingerRequest } from '@/lib/hostingerApi'
import { readingResponseSchema, type Preferences, type ReadingStatus } from './model'

export async function briefingRequest<T>(query: string, schema: z.ZodType<T>, signal?: AbortSignal, body?: unknown): Promise<T> {
  const client = await getSupabaseClient()
  if (!client) throw new Error('Account access is temporarily unavailable. Please try again.')
  const { data } = await client.auth.getSession()
  if (!data.session || !await ensureHostingerSession(client)) throw new HostingerApiError('Please sign in again to continue.', 401)
  const userId = data.session.user.id
  const init: RequestInit = {
    signal, headers: { 'X-CSSV-User': userId },
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
  }
  const request = () => hostingerRequest<unknown>('current-affairs.php' + (query ? '?' + query : ''), init)
  let result: unknown
  try { result = await request() }
  catch (error) {
    if (!(error instanceof HostingerApiError) || error.status !== 401 || !await ensureHostingerSession(client)) throw error
    result = await request()
  }
  const current = await client.auth.getSession()
  if (current.data.session?.user.id !== userId) throw new HostingerApiError('Your account changed. Please sign in again.', 401)
  const parsed = schema.safeParse(result)
  if (!parsed.success) { console.warn('CSS Vista: invalid briefing response.'); throw new Error('This briefing could not be loaded. Please try again shortly.') }
  return parsed.data
}
export function setSaved(id: string, saved: boolean) {
  return briefingRequest('', readingResponseSchema, undefined, { action: 'bookmark', id, saved })
}
export function setReading(id: string, status: ReadingStatus) {
  return briefingRequest('', readingResponseSchema, undefined, { action: 'reading', id, status })
}
export function preferencesBody(preferences: Preferences, name?: string) {
  return { action: 'preferences', ...preferences, ...(name !== undefined ? { display_name: name } : {}) }
}
