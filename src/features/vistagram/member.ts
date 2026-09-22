import { useSyncExternalStore } from 'react'
import { notifyProgressChanged } from '@/lib/progressEvents'

const KEY = 'cssvista:tool:vistagram'
const EVENT = 'cssvista:vistagram-changed'

export interface VistagramCollection {
  id: string
  name: string
  postIds: string[]
  createdAt: string
}

export interface VistagramMemberState {
  saved: string[]
  read: Record<string, string>
  history: Record<string, string>
  followedTopics: string[]
  collections: VistagramCollection[]
  notes: Record<string, string>
  lastVisit: string
}

const empty: VistagramMemberState = {
  saved: [],
  read: {},
  history: {},
  followedTopics: [],
  collections: [],
  notes: {},
  lastVisit: '',
}

let cachedRaw: string | null | undefined
let cachedState: VistagramMemberState = empty

function normalize(value: unknown): VistagramMemberState {
  if (!value || typeof value !== 'object') return { ...empty }
  const state = value as Partial<VistagramMemberState>
  return {
    saved: Array.isArray(state.saved) ? state.saved.filter((item): item is string => typeof item === 'string') : [],
    read: state.read && typeof state.read === 'object' && !Array.isArray(state.read) ? state.read as Record<string, string> : {},
    history: state.history && typeof state.history === 'object' && !Array.isArray(state.history) ? state.history as Record<string, string> : {},
    followedTopics: Array.isArray(state.followedTopics) ? state.followedTopics.filter((item): item is string => typeof item === 'string') : [],
    collections: Array.isArray(state.collections)
      ? state.collections.filter((item): item is VistagramCollection => Boolean(item && typeof item === 'object' && typeof (item as VistagramCollection).id === 'string' && typeof (item as VistagramCollection).name === 'string'))
      : [],
    notes: state.notes && typeof state.notes === 'object' && !Array.isArray(state.notes) ? state.notes as Record<string, string> : {},
    lastVisit: typeof state.lastVisit === 'string' ? state.lastVisit : '',
  }
}

export function getVistagramMemberState(): VistagramMemberState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === cachedRaw) return cachedState
    cachedRaw = raw
    cachedState = raw ? normalize(JSON.parse(raw)) : empty
    return cachedState
  } catch {
    cachedRaw = undefined
    cachedState = empty
    return cachedState
  }
}

function write(next: VistagramMemberState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
    cachedRaw = undefined
    cachedState = next
    window.dispatchEvent(new Event(EVENT))
    notifyProgressChanged()
  } catch {
    // The shared progress layer will surface storage failures elsewhere.
  }
}

export function updateVistagramMemberState(mutator: (state: VistagramMemberState) => void) {
  const next = getVistagramMemberState()
  mutator(next)
  write(next)
  return next
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === KEY) listener() }
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useVistagramMemberState() {
  return useSyncExternalStore(subscribe, getVistagramMemberState, () => empty)
}

export function toggleVistagramSaved(postId: string) {
  return updateVistagramMemberState((state) => {
    state.saved = state.saved.includes(postId)
      ? state.saved.filter((id) => id !== postId)
      : [postId, ...state.saved.filter((id) => id !== postId)]
  })
}

export function markVistagramRead(postId: string) {
  return updateVistagramMemberState((state) => { state.read[postId] = new Date().toISOString() })
}

export function recordVistagramView(postId: string) {
  return updateVistagramMemberState((state) => { state.history[postId] = new Date().toISOString() })
}

export function toggleVistagramTopic(topic: string) {
  return updateVistagramMemberState((state) => {
    state.followedTopics = state.followedTopics.includes(topic)
      ? state.followedTopics.filter((item) => item !== topic)
      : [topic, ...state.followedTopics.filter((item) => item !== topic)]
  })
}

export function setVistagramNote(postId: string, note: string) {
  return updateVistagramMemberState((state) => {
    const value = note.trim()
    if (value) state.notes[postId] = value.slice(0, 4000)
    else delete state.notes[postId]
  })
}

export function createVistagramCollection(name: string): VistagramCollection | null {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 80)
  if (!clean) return null

  const existing = getVistagramMemberState().collections.find(
    (item) => item.name.toLowerCase() === clean.toLowerCase(),
  )
  if (existing) return existing

  const created: VistagramCollection = {
    id: `vistagram-collection-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: clean,
    postIds: [],
    createdAt: new Date().toISOString(),
  }
  updateVistagramMemberState((state) => {
    if (!state.collections.some((item) => item.name.toLowerCase() === clean.toLowerCase())) {
      state.collections.unshift(created)
    }
  })
  return created
}

export function toggleVistagramCollectionPost(collectionId: string, postId: string) {
  return updateVistagramMemberState((state) => {
    state.collections = state.collections.map((collection) => {
      if (collection.id !== collectionId) return collection
      return {
        ...collection,
        postIds: collection.postIds.includes(postId)
          ? collection.postIds.filter((id) => id !== postId)
          : [postId, ...collection.postIds.filter((id) => id !== postId)],
      }
    })
  })
}

export function markVistagramVisit() {
  return updateVistagramMemberState((state) => { state.lastVisit = new Date().toISOString() })
}
