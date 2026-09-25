import { useEffect, useState } from 'react'
import { useAccount } from '@/lib/accountContext'
import { mptApi, serverNow, type MptCard } from './api'
import { useMptFlowEnabled } from './useMptFlow'

// The one MPT Mock to point at from anywhere on the site (D-52): the viewer's own
// mock when it is live, otherwise a mock being held now, otherwise the next one.
// One shared request per minute, so site-wide use stays cheap.
export type MptSpotlight = { card: MptCard; kind: 'mine-live' | 'mine' | 'live' | 'next' }

const TTL_MS = 60_000
let cached: { key: string; at: number; promise: Promise<MptCard[]> } | null = null

function load(key: string) {
  if (!cached || cached.key !== key || Date.now() - cached.at > TTL_MS) {
    cached = { key, at: Date.now(), promise: mptApi.mocks().then((data) => (data.enabled ? data.mocks : [])).catch(() => []) }
  }
  return cached.promise
}

export function pickSpotlight(cards: MptCard[], now = serverNow()): MptSpotlight | null {
  const byStart = [...cards].sort((a, b) => Date.parse(a.mock.exam_open_at) - Date.parse(b.mock.exam_open_at))
  const mineLive = byStart.find((card) => card.state.phase === 'ENTRY_OPEN' || card.state.phase === 'IN_PROGRESS')
  if (mineLive) return { card: mineLive, kind: 'mine-live' }
  const mine = byStart.find((card) => card.state.phase === 'ROLL_NUMBER_PENDING' || card.state.phase === 'SLOT_RESERVED')
  const live = byStart.find((card) => card.state.exam_in_progress && card.state.phase === 'APPLICATIONS_CLOSED')
  if (live) return { card: live, kind: 'live' }
  if (mine) return { card: mine, kind: 'mine' }
  const next = byStart.find((card) => Date.parse(card.mock.exam_open_at) > now && card.mock.status === 'PUBLISHED')
  return next ? { card: next, kind: 'next' } : null
}

export function useMptSpotlight() {
  const enabled = useMptFlowEnabled()
  const { user } = useAccount()
  const [cards, setCards] = useState<MptCard[] | null>(null)
  const [tick, setTick] = useState(0)
  const key = user?.id ?? 'anonymous'
  useEffect(() => {
    if (!enabled) return
    let active = true
    load(key).then((value) => { if (active) setCards(value) })
    return () => { active = false }
  }, [enabled, key, tick])
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') setTick((value) => value + 1) }, TTL_MS)
    return () => window.clearInterval(id)
  }, [enabled])
  return enabled && cards ? pickSpotlight(cards) : null
}
