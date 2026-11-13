import renderMathInElement from 'katex/contrib/auto-render'

// Native MathML avoids external fonts and keeps equations accessible at zoom.
// KaTeX is a parser, not a scientific verifier. Unsupported notation stays visible.
function render(element: HTMLElement) {
  renderMathInElement(element, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
      { left: '$', right: '$', display: false },
    ],
    output: 'mathml', throwOnError: true, trust: false, strict: (code: string) => code === 'unicodeTextInMathMode' ? 'ignore' : 'error',
    // Source manuscripts use % as a literal percent, never as a TeX comment.
    preProcess: (math: string) => math.replace(/(?<!\\)%/g, '\\%'),
    maxExpand: 1000, maxSize: 20,
    ignoredClasses: ['katex', 'math-source'],
    errorCallback(_message: string, error: Error) {
      element.dataset.mathWarning = 'true'
      if (!element.querySelector('[data-math-warning]')) {
        const note = document.createElement('p')
        note.dataset.mathWarning = 'true'
        note.className = 'notice warn tiny'
        note.textContent = 'One expression could not be typeset. Its original notation is retained for review.'
        element.append(note)
      }
      // No conversion or invented replacement for unsupported source notation.
      void error
    },
  })
  // Delimiters split by imported markup can escape the parser entirely.
  const remaining = element.cloneNode(true) as HTMLElement
  remaining.querySelectorAll('.katex,math,script,style,textarea,pre,code,[data-math-warning]').forEach(node => node.remove())
  if (/\$/.test(remaining.textContent || '') && !element.querySelector('[data-math-warning]')) {
    const note = document.createElement('p')
    note.dataset.mathWarning = 'true'
    note.className = 'notice warn tiny'
    note.textContent = 'Some original mathematical notation remains untypeset and needs editorial review.'
    element.append(note)
  }
}
Object.assign(window, { CSSVistaGSAMath: { render } })
