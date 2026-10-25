import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { sanitizeRichText } from '../src/features/factbook/safety.ts'

const dom = new JSDOM('', { runScripts: 'dangerously', url: 'https://audit.invalid' })
after(() => dom.window.close())

// The Node/SSR fallback is also passed to HTML sinks, so it must escape markup.
test('rich text stays inert without a browser DOM', () => {
  assert.equal(typeof globalThis.window, 'undefined')
  assert.equal(sanitizeRichText('<img onerror="test()">&'), '&lt;img onerror=&quot;test()&quot;&gt;&amp;')
})

test('unsupported DOM environments fail closed', () => {
  globalThis.window = { document: {} }
  try {
    assert.equal(sanitizeRichText('<img onerror="test()">'), '&lt;img onerror=&quot;test()&quot;&gt;')
  } finally {
    delete globalThis.window
  }
})

test('rich notes reject active content at every nesting depth', () => {
  globalThis.window = dom.window
  try {
    const vectors = [
      '<div><img src="invalid" onerror="window.__marker=1"></div>',
      '<div><p onclick="window.__marker=1">note</p></div>',
      '<div><a href="javascript:window.__marker=1">link</a></div>',
      '<div><a href="java&#10;script:window.__marker=1">link</a></div>',
      '<a href="data:text/html,test">link</a>',
      '<svg><a href="javascript:window.__marker=1">link</a></svg>',
      '<math><mtext><img src="invalid" onerror="window.__marker=1"></mtext></math>',
      '<iframe srcdoc="<script>window.__marker=1</script>"></iframe>',
      '<form><input name="__proto__"></form><p id="location">note</p>',
      '<div>'.repeat(20) + '<img src="invalid" onerror="window.__marker=1">' + '</div>'.repeat(20),
    ]
    for (const input of vectors) {
      let output = sanitizeRichText(input)
      for (let pass = 0; pass < 4; pass++) {
        dom.window.__marker = 0
        dom.window.document.body.innerHTML = output
        const body = dom.window.document.body
        for (const element of body.querySelectorAll('*')) {
          for (const attribute of element.attributes) assert.doesNotMatch(attribute.name, /^on/i)
          if (element.hasAttribute('href')) assert.match(element.getAttribute('href'), /^https?:\/\//i)
        }
        for (const element of body.querySelectorAll('img')) element.dispatchEvent(new dom.window.Event('error'))
        assert.equal(dom.window.__marker, 0)
        assert.equal(body.querySelector('img,script,svg,math,iframe,object,embed,style,form,input'), null)
        output = sanitizeRichText(output)
      }
    }
  } finally {
    delete globalThis.window
  }
})

test('rich notes retain useful formatting and safe external links', () => {
  globalThis.window = dom.window
  try {
    const output = sanitizeRichText('<div><h2>Heading</h2><p><strong>Bold</strong> <em>emphasis</em></p><ul><li>Item</li></ul><table><tbody><tr><td>Cell</td></tr></tbody></table><a href="https://example.com/report" title="Source">source</a><a href="/relative">relative</a></div>')
    dom.window.document.body.innerHTML = output
    for (const tag of ['h2', 'strong', 'em', 'ul', 'li', 'table', 'td']) assert.ok(dom.window.document.querySelector(tag), tag)
    const [source, relative] = dom.window.document.querySelectorAll('a')
    assert.equal(source.href, 'https://example.com/report')
    assert.equal(source.target, '_blank')
    assert.equal(source.rel, 'noopener noreferrer nofollow')
    assert.equal(source.title, 'Source')
    assert.equal(relative.hasAttribute('href'), false)
    assert.equal(sanitizeRichText(output), output)
  } finally {
    delete globalThis.window
  }
})
