import type { Writing, WritingSummary, WritingVersion } from '@/features/learning/api'
export type Skill = { label: string; category: string; day: number }
export type Finding = { code: string; severity: string; excerpt: string; explanation: string; hint: string; category: string; label: string; lesson_day: number; rewrite_instruction: string }
export type Feedback = { summary: string; findings: Finding[] }
export type EvaluatedVersion = WritingVersion & { text_hash: string; feedback: Feedback | null }
export type Operation = { id: string; version_id: string; state: string; accounting: string; result: { summary: string; findings: Pick<Finding, 'code' | 'severity' | 'excerpt' | 'explanation' | 'hint'>[] } | null }
export type Meta = { configuration: { enabled: boolean; policy_version: string | null; processing_notice: string | null; max_words: Record<'paragraph' | 'sentence', number>; max_characters: number }; membership: { status: string }; date: string; usage: Record<'paragraph' | 'sentence', { used: number; reserved: number; accepted: number; limit: number }>; skills: Record<string, Skill> }
export type Overview = Meta & { writing: WritingSummary[]; has_more: boolean; attempts: { id: string; target_year: number }[]; profile: { window_days: number; reviewed_wordings: number; sample_limit: number; basis: string; items: (Skill & { code: string; state: string; flagged_writings: number; reviewed_writings: number; last_reported_at: string })[] } }
export type Detail = Meta & { writing: Writing; version: EvaluatedVersion; operations: Operation[] }
export type ComparisonData = Meta & { comparison: { before: EvaluatedVersion; after: EvaluatedVersion; word_delta: number; same_wording: boolean; feedback_available: boolean; no_longer_reported: string[]; still_reported: string[]; newly_reported: string[] } }
export function grammarLink(day: number, writing?: string, version?: string) { const params = new URLSearchParams({ day: String(day), from: 'expression' }); if (writing) params.set('writing', writing); if (version) params.set('version', version); return `/grammar-course?${params}` }
