import { currentHostingerAccountUser, hostingerRequest, HostingerApiError } from '@/lib/hostingerApi'
import type { FactbookBackup } from './types'
export type FactbookRestoreResult = { request_id: string; confirmed_at: string; source_version: number; subjects: number; categories: number; entries: number; collections: number; revisions: number; images: number; preferences_applied: boolean; replayed?: boolean }
const pointerKey = (user: string) => `cssvista:factbook-restore:v1:${user}`
function checkUser(user: string) { if(currentHostingerAccountUser()!==user)throw Error('Your account changed. Reopen Factbook before continuing.') }
function canonical(value: unknown): unknown {
  if(Array.isArray(value))return value.map(canonical)
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical((value as Record<string,unknown>)[key])]))
  return value
}
export async function exportFactbookBackup(user: string): Promise<FactbookBackup> {
  checkUser(user)
  const result=await hostingerRequest<{backup:FactbookBackup}>('factbook/backup.php',{headers:{'X-CSSV-User':user}})
  checkUser(user);return result.backup
}
export async function restoreFactbookBackup(user: string, backup: FactbookBackup, mode: 'new'|'merge', applyPreferences: boolean): Promise<FactbookRestoreResult> {
  checkUser(user)
  let value: string
  try{value=JSON.stringify(canonical([user,backup,mode,applyPreferences]))}catch{throw Error('The backup is nested too deeply to validate. Keep the original file.')}
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)),hash=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')
  const hex=hash.slice(0,12)+'4'+hash.slice(13,16)+'a'+hash.slice(17,32)
  const id=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
  checkUser(user)
  try{localStorage.setItem(pointerKey(user),JSON.stringify({id,hash}))}catch{throw Error('This browser cannot retain a restore reference. No restore was sent. Keep the original file and try a browser with storage available.')}
  try {
    const result=await hostingerRequest<{result:FactbookRestoreResult}>('factbook/backup.php',{method:'POST',headers:{'X-CSSV-User':user},body:JSON.stringify({request_id:id,backup,mode,apply_preferences:applyPreferences,confirmation:'RESTORE MY FACTBOOK COPY'})})
    checkUser(user);return result.result
  }catch(error){if(error instanceof HostingerApiError)throw error;throw Error('The restore response was interrupted. Keep your original file. Close this preview and check the last restore receipt before trying again.') }
}
export async function checkFactbookRestore(user: string): Promise<FactbookRestoreResult> {
  checkUser(user)
  const raw=localStorage.getItem(pointerKey(user));if(!raw)throw Error('No restore reference is retained for this account on this browser.')
  let id: unknown
  try{id=(JSON.parse(raw) as {id?:unknown}).id}catch{throw Error('The retained restore reference could not be read. Keep the original backup file.')}
  if(typeof id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))throw Error('The retained restore reference is invalid. No restore was resent.')
  const result=await hostingerRequest<{result:FactbookRestoreResult}>('factbook/backup.php?request_id='+id,{headers:{'X-CSSV-User':user}})
  checkUser(user);return result.result
}
