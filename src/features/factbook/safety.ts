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

export function sanitizeRichText(html: string): string {
  if (typeof DOMParser === 'undefined') return sanitizePlainText(html, 200_000)
  const document = new DOMParser().parseFromString(html, 'text/html')
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove()
        return
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement
        if (!ALLOWED_TAGS.has(element.tagName)) {
          element.replaceWith(...Array.from(element.childNodes))
          return
        }
        Array.from(element.attributes).forEach((attribute) => {
          const allowed = element.tagName === 'A' && ['href', 'title'].includes(attribute.name)
          if (!allowed) element.removeAttribute(attribute.name)
        })
        if (element.tagName === 'A') {
          const safe = safeWebUrl(element.getAttribute('href') ?? '')
          if (safe) {
            element.setAttribute('href', safe)
            element.setAttribute('target', '_blank')
            element.setAttribute('rel', 'noopener noreferrer nofollow')
          } else {
            element.removeAttribute('href')
          }
        }
      }
      walk(child)
    })
  }
  walk(document.body)
  return document.body.innerHTML.slice(0, 200_000)
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
