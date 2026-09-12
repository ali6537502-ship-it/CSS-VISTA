import { createContext, useContext } from 'react'
export interface AccountUser {
  id: string
  email: string
  created_at: string
  email_confirmed_at: string | null
  display_name: string
  user_metadata: { full_name: string }
  profile_complete?: boolean
  photo_complete?: boolean
}

export type ActionResult = {
  error?: string
  confirmationRequired?: boolean
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'
export type SyncBackend = 'hostinger' | null

export interface AccountContextValue {
  configured: boolean
  loading: boolean
  user: AccountUser | null
  passwordRecovery: boolean
  syncStatus: SyncStatus
  syncBackend: SyncBackend
  syncError: string
  lastSyncedAt: Date | null
  signIn(email: string, password: string): Promise<ActionResult>
  signUp(email: string, password: string, fullName: string): Promise<ActionResult>
  resendVerification(email: string): Promise<ActionResult>
  verifyEmail(token: string): Promise<ActionResult>
  requestPasswordReset(email: string): Promise<ActionResult>
  updatePassword(password: string, currentPassword?: string, resetToken?: string): Promise<ActionResult>
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
