declare module 'katex/contrib/auto-render' {
  import type { KatexOptions } from 'katex'
  interface AutoRenderOptions extends KatexOptions {
    delimiters?: { left: string; right: string; display: boolean }[]
    ignoredClasses?: string[]
    errorCallback?: (message: string, error: Error) => void
    preProcess?: (math: string) => string
  }
  export default function renderMathInElement(element: HTMLElement, options?: AutoRenderOptions): void
}
