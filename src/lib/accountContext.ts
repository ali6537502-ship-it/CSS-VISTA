import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

export type ActionResult = {
  error?: string
  confirmationRequired?: boolean
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'
export type SyncBackend = 'hostinger' | 'supabase' | null

export interface AccountContextValue {
  configured: boolean
  loading: boolean
  user: User | null
  passwordRecovery: boolean
  syncStatus: SyncStatus
  syncBackend: SyncBackend
  syncError: string
  lastSyncedAt: Date | null
  signIn(email: string, password: string): Promise<ActionResult>
  signUp(email: string, password: string, fullName: string): Promise<ActionResult>
  signInWithGoogle(): Promise<ActionResult>
  requestPasswordReset(email: string): Promise<ActionResult>
  updatePassword(password: string): Promise<ActionResult>
  clearPasswordRecovery(): void
  signOut(): Promise<ActionResult>
  syncNow(): Promise<ActionResult>
  resetProgress(): Promise<ActionResult>
}

export const AccountContext = createContext<AccountContextValue | null>(null)

export function useAccount() {
  const value = useContext(AccountContext)
  if (!value) throw new Error('useAccount must be used inside AccountProvider')
  return value
}
