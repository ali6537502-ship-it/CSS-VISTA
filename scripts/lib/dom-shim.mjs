/**
 * Minimal browser globals for the build-time prerender step.
 *
 * The application is a browser SPA: its providers read `window.location`,
 * `document.cookie` and `localStorage` while rendering. Rather than weaken the
 * runtime with `typeof window` guards, the *build* supplies inert stand-ins so
 * the real components can be rendered to static HTML. Nothing here ships to
 * production; effects, timers and network calls never run during
 * renderToStaticMarkup, so these only have to satisfy the render pass.
 */

const noop = () => {}

function createStorage() {
  const map = new Map()
  return {
    getItem: (key) => (map.has(String(key)) ? map.get(String(key)) : null),
    setItem: (key, value) => { map.set(String(key), String(value)) },
    removeItem: (key) => { map.delete(String(key)) },
    clear: () => { map.clear() },
    key: (index) => [...map.keys()][index] ?? null,
    get length() { return map.size },
  }
}

export function installDomShim(url = 'https://www.css-vista.com/') {
  if (globalThis.window) return

  const location = new URL(url)
  const documentStub = {
    cookie: '',
    visibilityState: 'visible',
    documentElement: { style: {}, classList: { add: noop, remove: noop, contains: () => false, toggle: noop } },
    addEventListener: noop,
    removeEventListener: noop,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop, remove: noop, classList: { add: noop, remove: noop } }),
    head: { appendChild: noop, removeChild: noop },
    body: { appendChild: noop, removeChild: noop, classList: { add: noop, remove: noop } },
  }

  const windowStub = {
    location,
    document: documentStub,
    localStorage: createStorage(),
    sessionStorage: createStorage(),
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => true,
    matchMedia: () => ({ matches: false, media: '', addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    requestAnimationFrame: (callback) => setTimeout(() => callback(Date.now()), 0),
    cancelAnimationFrame: clearTimeout,
    setInterval: () => 0,
    clearInterval: noop,
    setTimeout: () => 0,
    clearTimeout: noop,
    scrollTo: noop,
    innerWidth: 1280,
    innerHeight: 900,
    devicePixelRatio: 1,
    navigator: { userAgent: 'CSSVistaPrerender', language: 'en', onLine: true },
    history: { pushState: noop, replaceState: noop, state: null },
  }
  windowStub.self = windowStub
  windowStub.top = windowStub
  windowStub.parent = windowStub

  globalThis.window = windowStub
  globalThis.document = documentStub
  globalThis.localStorage = windowStub.localStorage
  globalThis.sessionStorage = windowStub.sessionStorage
  globalThis.navigator ??= windowStub.navigator
  globalThis.matchMedia = windowStub.matchMedia
  globalThis.getComputedStyle = windowStub.getComputedStyle
  globalThis.requestAnimationFrame ??= windowStub.requestAnimationFrame
  globalThis.cancelAnimationFrame ??= windowStub.cancelAnimationFrame
}
