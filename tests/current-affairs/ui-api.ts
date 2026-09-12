// Deterministic UI fixtures. Real authentication, SQL and publishing are tested
// by the separate HTTP integration suite; no production module imports this.
import type { z } from 'zod'
import example from '../../examples/current-affairs/test-edition.json'
import { pakistanDate, type Preferences, type ReadingStatus } from '../../src/features/current-affairs/model'
const date = pakistanDate()
const items = example.stories.map((s) => ({ ...s, publication_date: date, reading_minutes: 4, saved: false, reading_status: 'unread' as ReadingStatus }))
let preferences: Preferences = { reading_mode: 'quick', preferred_categories: [] }
let displayName = 'Test Reader'
const categories = [...new Set(items.map((s) => s.category))]
function summary() {
  return { date, published: true, latest_date: date, edition: example.edition, published_at: date + 'T00:00:00+05:00', updated_at: date + 'T09:30:00+05:00', total: items.length, unread: items.filter((s) => s.reading_status !== 'read').length,
    categories: categories.map((category) => ({ category, count: items.filter((s) => s.category === category).length, unread: items.filter((s) => s.category === category && s.reading_status !== 'read').length })) }
}
export async function briefingRequest<T>(query: string, schema: z.ZodType<T>, _signal?: AbortSignal, body?: { action: string; reading_mode?: Preferences['reading_mode']; preferred_categories?: string[]; display_name?: string }): Promise<T> {
  const p = new URLSearchParams(query)
  if (body?.action === 'preferences') {
    preferences = { reading_mode: body.reading_mode || 'quick', preferred_categories: body.preferred_categories || [] }
    displayName = body.display_name || displayName
    return schema.parse({ preferences })
  }
  const visible = items.filter((s) => (!p.get('category') || s.category === p.get('category')) && (!p.get('q') || JSON.stringify(s).toLowerCase().includes(p.get('q')!.toLowerCase())) && (p.get('saved') !== '1' || s.saved) && (!p.get('reading') || s.reading_status === p.get('reading')))
  const view = p.get('view')
  const value = view === 'overview' ? { summary: summary(), preferences, display_name: displayName, continue_reading: items.filter((s) => s.reading_status === 'opened'), saved: items.filter((s) => s.saved), stories: items, facts: items, weekly_read: items.filter((s) => s.reading_status === 'read').length }
    : view === 'story' ? { story: items.find((s) => s.id === p.get('id')), preferences }
      : view === 'preferences' ? { preferences, display_name: displayName, email: 'test-reader@example.invalid', categories }
        : view === 'archive' ? { days: [{ publication_date: date, edition: example.edition, published_at: date + 'T00:00:00+05:00', story_count: 2 }], has_more: false, categories }
          : { items: visible, has_more: false, page: 1, summary: summary(), categories, preferences }
  return schema.parse(value)
}
export async function setSaved(id: string, saved: boolean) { const item = items.find((s) => s.id === id)!; item.saved = saved; return { saved, reading_status: item.reading_status } }
export async function setReading(id: string, status: ReadingStatus) { const item = items.find((s) => s.id === id)!; if (!(status === 'opened' && item.reading_status === 'read')) item.reading_status = status; return { saved: item.saved, reading_status: item.reading_status } }
export function preferencesBody(p: Preferences, name?: string) { return { action: 'preferences', ...p, ...(name ? { display_name: name } : {}) } }
