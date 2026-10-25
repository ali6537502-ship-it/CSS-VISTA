import createDOMPurify from 'dompurify'

const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'OL', 'UL', 'LI', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'HR', 'A', 'SUP', 'SUB', 'MARK', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD'])

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

let richTextPurifier: ReturnType<typeof createDOMPurify> | undefined

function escapeRichText(input: string): string {
  return input.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

export function sanitizeRichText(html: string): string {
  const input = sanitizePlainText(html, 200_000)
  // Rendering without a DOM must also be safe for an HTML insertion sink.
  if (typeof window === 'undefined' || !window.document) {
    return escapeRichText(input)
  }
  if (!richTextPurifier) {
    const purifier = createDOMPurify(window)
    if (!purifier.isSupported) return escapeRichText(input)
    richTextPurifier = purifier
    richTextPurifier.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName !== 'A') {
        node.removeAttribute('href')
        node.removeAttribute('title')
        return
      }
      const safe = safeWebUrl(node.getAttribute('href') ?? '')
      if (safe) {
        node.setAttribute('href', safe)
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer nofollow')
      } else node.removeAttribute('href')
    })
  }
  // Let the sanitizer traverse disallowed wrappers and their descendants.
  // Never truncate sanitized HTML: that can change how the browser parses it.
  return richTextPurifier.sanitize(input, {
    ALLOWED_TAGS: Array.from(ALLOWED_TAGS, (tag) => tag.toLowerCase()),
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
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
