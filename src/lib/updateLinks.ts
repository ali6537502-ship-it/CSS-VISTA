// Accept only absolute web links for notification actions.
// Do not render javascript:, data:, credentials, or malformed URLs as clickable links.
export function safeUpdateLink(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const candidate = value.trim()
  if (!candidate || candidate.length > 2048 || [...candidate].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) return null
  try {
    const parsed = new URL(candidate)
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || !parsed.hostname || parsed.username || parsed.password) return null
    return parsed.href
  } catch {
    return null
  }
}
