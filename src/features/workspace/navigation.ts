export const workspaceDestinations = [
  { id: 'today', title: 'Today', to: '/account/dashboard' },
  { id: 'learn', title: 'Learn', to: '/account/learn' },
  { id: 'write', title: 'Write', to: '/account/writing' },
  { id: 'review', title: 'Review', to: '/account/review' },
  { id: 'library', title: 'Library', to: '/account/library' },
  { id: 'progress', title: 'Progress', to: '/account/progress' },
] as const

const homes: Record<string, typeof workspaceDestinations[number]['id']> = {
  '/account/expression': 'write', '/account/argumentation': 'write',
  '/account/analytical-skills': 'write', '/account/essay-builder': 'write',
  '/account/precis': 'write', '/account/handwriting': 'write',
  '/account/answer-performance': 'write', '/account/general-ability': 'learn',
  '/account/english': 'write', '/account/tasks': 'review',
  '/account/search': 'library', '/account/factbook': 'library',
  '/account/saved': 'library', '/account/library/search': 'library',
}
export function workspaceHome(pathname: string, search = '') {
  if (pathname === '/account/preparation') {
    const params = new URLSearchParams(search)
    const home = params.has('writing') || params.get('new') === 'writing' ? 'write' : params.get('view') === 'topics' ? 'learn' : 'today'
    return workspaceDestinations.find(item => item.id === home)
  }
  return workspaceDestinations.find(item => item.to === pathname || item.id === homes[pathname])
}

/** Same-origin, known study destinations only. URL parsing also normalizes dot segments. */
export function safeStudyReturn(value: string | null | undefined, fallback = '/account/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || (value.includes('\\') || Array.from(value).some(char => char.charCodeAt(0) <= 32))) return fallback
  try {
    const url = new URL(value, 'https://www.css-vista.com')
    if (url.origin !== 'https://www.css-vista.com') return fallback
    const allowed = new Set([
      ...workspaceDestinations.map(item => item.to), ...Object.keys(homes),
      '/account/preparation', '/account/library/search', '/grammar-course',
      '/language-grammar', '/grammar-vocabulary', '/factbook', '/daily-briefing',
      '/study-material/essay-themes', '/account/vistagram',
    ])
    if (!allowed.has(url.pathname) && !/^\/(?:account\/current-affairs|vistagram)\/[A-Za-z0-9_-]+$/.test(url.pathname)) return fallback
    return url.pathname + url.search + url.hash
  } catch { return fallback }
}
