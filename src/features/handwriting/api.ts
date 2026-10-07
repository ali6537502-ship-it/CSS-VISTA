import { currentHostingerAccountUser, hostingerRequest } from '@/lib/hostingerApi'
import type { Attempt } from '@/features/learning/api'
export type Feedback = { summary: string; findings: { code: string; severity: string; excerpt: string; explanation: string; hint: string }[] }
export type Operation = { id: string; feature: string; version_id: string | null; state: string; accounting: string; result: Feedback | { readable: boolean; uncertain: boolean; reason: string } | null }
export type HandwritingPage = { id: string; attempt_id: string; title: string; state: string; transcription: { text: string; version: number; hash: string; uncertain: boolean; source: string } | null; confirmed_version: number | null; writing_id: string | null; confirmed_text_version_id: string | null; image_available: boolean; image_expires_at: string; image_cleanup_pending: boolean; operation: Operation | null; created_at: string }
export type HandwritingOverview = {
 configuration: { enabled: boolean; policy_version: string | null; processing_notice: string | null; limits: { max_bytes: number; max_edge: number; max_pixels: number; max_words: number; max_characters: number; retention_seconds: number } }
 membership: { status: 'free' | 'active' | 'expired'; expires_at: string | null }
 date: string
 usage: Record<'handwriting_extract' | 'handwriting', { limit: number; used: number; reserved: number; accepted: number }>
 pages: { id: string; title: string; state: string; transcription_version: number; created_at: string }[]
 attempts: Pick<Attempt, 'id' | 'target_year'>[]
 has_more: boolean
}
export type HandwritingDetail = Pick<HandwritingOverview, 'configuration' | 'membership' | 'date' | 'usage'> & { page: HandwritingPage }
export const stateNames: Record<string, string> = { uploaded: 'Page uploaded', extracting: 'Reading handwriting', awaiting_confirmation: 'Check transcription', confirmed: 'Transcription confirmed', evaluating: 'Evaluating confirmed text', completed: 'Feedback saved', unreadable: 'Page unreadable', extraction_failed: 'Extraction unsuccessful', evaluation_failed: 'Evaluation unsuccessful', outcome_unknown: 'Outcome unresolved', image_expired: 'Temporary image expired' }
export async function uploadHandwriting(user: string, body: FormData) {
 if (currentHostingerAccountUser() !== user) throw new Error('Sign in again before uploading your page.')
 const result = await hostingerRequest<{ page_id: string }>('student/handwriting.php', { method: 'POST', body, headers: { 'X-CSSV-User': user } })
 if (currentHostingerAccountUser() !== user) throw new Error('Your account changed. Reopen your writing workspace.')
 return result
}
