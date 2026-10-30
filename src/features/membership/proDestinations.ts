/** Existing paid destinations only; free Grammar, archives and saved writing stay free. */
export function isProDestination(value: string): boolean {
  let url: URL
  try { url = new URL(value, 'https://www.css-vista.com') } catch { return false }
  if (url.origin !== 'https://www.css-vista.com') return false
  let path: string
  try { path = decodeURIComponent(url.pathname).replace(/\/+$/, '') } catch { return false }
  if (/^\/account\/(?:general-ability|handwriting|ask-vista|answer-performance|ai-usage|membership|current-affairs|factbook|saved|search)(?:\/|$)/.test(path)) return true
  if (path === '/account/dashboard') return url.searchParams.get('plan') === 'pro'
  if (path === '/account/preparation') return (url.searchParams.get('view') === 'reading' && url.searchParams.get('kind') !== 'vistagram')
  if (/^\/(?:current-affairs|study-material\/essay-themes)(?:\/|$)/.test(path)) return true
  if (/^\/(?:gk\/cat|one-liner-gk|css-mcqs)\/(?:general-ability|current-affairs|current-affairs-archive|pakistan-current-affairs)(?:\/|$)/.test(path)) return true
  if (/^\/(?:mpt\/bank|mpt\/notes)\/(?:abilities|reasoning|current)(?:\/|$)/.test(path)) return true
  const categories = (url.searchParams.get('cats') || '').split(',')
  return ['/gk/quiz','/one-liner-gk','/css-mcqs'].includes(path) && (['general-ability','current-affairs','current-affairs-archive','pakistan-current-affairs'].includes(url.searchParams.get('category') || '') || categories.some(c => ['general-ability','current-affairs'].includes(c)))
}
