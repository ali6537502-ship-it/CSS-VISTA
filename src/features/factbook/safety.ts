import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'OL', 'UL', 'LI', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'HR', 'A', 'SUP', 'SUB', 'MARK', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']

export function safeWebUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : ''
  } catch {
    return ''
  }
}

export function sanitizePlainText(value: string, maxLength = 50_000): string {
  return value.replaceAll(String.fromCharCode(0), '').slice(0, maxLength)
}

export function sanitizeRichText(html: string): string {
  // Sanitize the complete bounded input. Cutting serialized HTML afterwards can
  // produce a different parse on reinsertion (mutation XSS).
  if (!DOMPurify.isSupported) return ''
  const clean = DOMPurify.sanitize(html.slice(0, 200_000), {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_TRUSTED_TYPE: false,
  })
  const document = new DOMParser().parseFromString(clean, 'text/html')
  for (const anchor of document.querySelectorAll('a')) {
    const safe = safeWebUrl(anchor.getAttribute('href') ?? '')
    if (safe) {
      anchor.setAttribute('href', safe)
      anchor.setAttribute('target', '_blank')
      anchor.setAttribute('rel', 'noopener noreferrer nofollow')
    } else anchor.removeAttribute('href')
  }
  return document.body.innerHTML
}

export function searchableText(content: Record<string, unknown>): string {
  const parts: string[] = []
  const visit = (value: unknown) => {
    if (typeof value === 'string' || typeof value === 'number') parts.push(String(value))
    else if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === 'object') Object.values(value).forEach(visit)
  }
  visit(content)
  return parts.join(' ')
}
