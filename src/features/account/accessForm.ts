import { safeReturnTo } from '../current-affairs/model.ts'
export type AccountMode = 'sign-in' | 'create'
export type AccessValues = { name: string; email: string; password: string; confirmation: string; resetCode: string }
export function accountDestination(value: string | null) {
  const safe = safeReturnTo(value), target = new URL(safe, 'https://www.css-vista.com')
  return target.pathname === '/account' && target.searchParams.get('settings') !== '1' ? '/account/dashboard' : safe
}
export function accessIssues(values: AccessValues, mode: AccountMode, reset: boolean, codeRecovery: boolean): Partial<Record<keyof AccessValues, string>> {
  const errors: Partial<Record<keyof AccessValues, string>> = {}
  if ((!reset || codeRecovery) && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) || values.email.trim().length > 254)) errors.email = 'Enter a valid email address.'
  if (!reset && mode === 'create' && (!values.name.trim() || values.name.trim().length > 180)) errors.name = 'Enter your full name, up to 180 characters.'
  if (!values.password) errors.password = 'Enter your password.'
  if (reset || mode === 'create') {
    if (values.password.length < 8) errors.password = 'Use at least eight characters.'
    else if (new TextEncoder().encode(values.password).length > 72 || values.password.includes('\0')) errors.password = 'This password is too long or contains an unsupported character. Please choose another.'
  }
  if (reset && values.password !== values.confirmation) errors.confirmation = 'The two password entries do not match.'
  if (codeRecovery && !/^\d{6}$/.test(values.resetCode)) errors.resetCode = 'Enter the six-digit code from your recovery email.'
  return errors
}
