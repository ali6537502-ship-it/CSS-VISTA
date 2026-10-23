export type RecoveryLink = { to: string; label: string }
/** Inspect only this account's known request namespace; never adopt another account's local work. */
export function preparationRecovery(storage: Pick<Storage, 'length' | 'key' | 'getItem'>, user: string): RecoveryLink[] {
  const links: RecoveryLink[] = []
  const prefix = `cssvista:attempt-action:${user}:`
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (!key?.startsWith(prefix)) continue
      const pending = JSON.parse(storage.getItem(key) || 'null') as { user?: string; attempt?: string; body?: { topic_id?: string } } | null
      if (pending?.user !== user || !pending.attempt || !/^[a-f0-9-]{36}$/i.test(pending.attempt)) continue
      const params = new URLSearchParams({ attempt: pending.attempt })
      if (key.endsWith(':topics.php') && pending.body?.topic_id && /^[a-z0-9-]{1,96}$/.test(pending.body.topic_id)) {
        params.set('view', 'topics'); params.set('topic', pending.body.topic_id)
      }
      const to = `/account/preparation?${params}`
      if (!links.some(link => link.to === to)) links.push({ to, label: 'Check an unconfirmed preparation save' })
    }
  } catch { /* Original storage remains untouched; domain recovery is still available. */ }
  return links
}
