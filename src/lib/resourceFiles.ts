export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes < 1) return 'Size unavailable'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 1 : 2)} MB`
}

export function safeDownloadName(value: string, extension = 'pdf') {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `${cleaned || 'css-vista-resource'}.${extension}`
}
