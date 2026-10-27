/** Preserve the existing internal return-path policy without loading feature schemas. */
export function safeReturnTo(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !Array.from(value).some((char) => char.charCodeAt(0) <= 32) ? value : '/account/dashboard'
}
