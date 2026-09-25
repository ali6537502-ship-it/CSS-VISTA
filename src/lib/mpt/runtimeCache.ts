import type { MptRuntime } from './api'

// Hands the paper from START to the exam screen without a second download. The
// exam screen falls back to the resume endpoint (same device) after a refresh.
let pending: { slug: string; runtime: MptRuntime } | null = null

export function stashRuntime(slug: string, runtime: MptRuntime) {
  pending = { slug, runtime }
}

export function takeRuntime(slug: string): MptRuntime | null {
  if (!pending || pending.slug !== slug) return null
  const { runtime } = pending
  pending = null
  return runtime
}
