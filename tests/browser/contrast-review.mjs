// Optional rendered-background measurements for axe's incomplete contrast findings.
// This measures the isolated page, not a production student or physical screen reader.
export async function reviewContrast(page, findings) {
  const location = new URL(page.url())
  if (location.protocol !== 'about:' && !['localhost', '127.0.0.1'].includes(location.hostname)) throw Error('Rendered review is limited to isolated loopback or reference pages')
  const results = []
  const originalScroll = await page.evaluate(() => ({x: scrollX, y: scrollY}))
  try {
    for (const finding of findings) {
      for (const node of finding.nodes) {
        if (node.target.length !== 1) {results.push({target: node.target, status: 'MANUAL_FRAME_REVIEW'}); continue}
        const selector = node.target[0]
        const prepared = await page.evaluate(selector => {
          const el = document.querySelector(selector)
          if (!el) return {status: 'TARGET_UNAVAILABLE'}
          if (el.tagName === 'SPAN' && el.getAttribute('aria-hidden') === 'true' && el.textContent.trim() === '·' && el.parentElement.querySelector('time[datetime]')) return {status: 'REVIEWED_DECORATIVE_CLOCK_SEPARATOR'}
          const bounds = el.getBoundingClientRect()
          if (bounds.bottom > innerHeight - 80 || bounds.top < 0) el.scrollIntoView({block: 'center', inline: 'nearest'})
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), ranges = []
          let clippedTicker = false
          let text
          while ((text = walker.nextNode())) {
            if (!text.textContent.trim()) continue
            const parent = text.parentElement, style = getComputedStyle(parent)
            if (style.visibility !== 'visible' || style.display === 'none') continue
            if (style.textShadow !== 'none') return {status: 'MANUAL_TEXT_SHADOW'}
            for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) {
              const ancestorStyle = getComputedStyle(ancestor)
              if (Number(ancestorStyle.opacity) !== 1) return {status: 'MANUAL_GROUP_OPACITY'}
              if (ancestorStyle.filter !== 'none' || ancestorStyle.mixBlendMode !== 'normal') return {status: 'MANUAL_PAINT_FILTER'}
            }
            if (style.webkitTextFillColor !== style.color || style.backgroundClip === 'text') return {status: 'MANUAL_TEXT_PAINT'}
            const range = document.createRange(); range.selectNodeContents(text)
            const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1
            const ctx = canvas.getContext('2d'); ctx.fillStyle = style.color; ctx.fillRect(0, 0, 1, 1)
            const color = [...ctx.getImageData(0, 0, 1, 1).data]
            const alpha = ctx.fillStyle.startsWith('rgba(') ? Number(ctx.fillStyle.split(',').at(-1).replace(')', '')) : color[3] / 255
            color[3] = Math.min(alpha, color[3] / 255)
            for (const rect of range.getClientRects()) {
              if (rect.width < 1 || rect.height < 1) continue
              let area = {left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom}
              const ticker = parent.closest('.vista-live-ticker')
              if (ticker) {
                const clip = ticker.getBoundingClientRect()
                area = {left: Math.max(0, rect.left, clip.left), top: Math.max(0, rect.top, clip.top), right: Math.min(innerWidth, rect.right, clip.right), bottom: Math.min(innerHeight, rect.bottom, clip.bottom)}
                clippedTicker ||= area.left !== rect.left || area.right !== rect.right || area.top !== rect.top || area.bottom !== rect.bottom
                if (area.right - area.left < 2 || area.bottom - area.top < 2) continue
              } else if (rect.left < 0 || rect.top < 0 || rect.right > innerWidth || rect.bottom > innerHeight) return {status: 'MANUAL_CLIPPED_TEXT'}
              for (const x of [area.left + 1, (area.left + area.right) / 2, area.right - 1]) {
                for (const y of [area.top + 1, (area.top + area.bottom) / 2, area.bottom - 1]) {
                  const top = document.elementFromPoint(x, y)
                  if (!top || (!parent.contains(top) && !top.contains(parent))) return {status: 'MANUAL_OBSCURED_TEXT'}
                }
              }
              ranges.push({x: area.left, y: area.top, width: area.right - area.left, height: area.bottom - area.top, color, threshold: Number.parseFloat(style.fontSize) >= 24 || (Number.parseFloat(style.fontWeight) >= 700 && Number.parseFloat(style.fontSize) >= 18.6667) ? 3 : 4.5})
            }
          }
          if (!ranges.length) return {status: 'NO_VISIBLE_TEXT'}
          const originalStyle = el.getAttribute('style')
          // Change only glyph paint; preserve layout, CSS colors, backgrounds and currentColor decorations.
          el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important')
          return {status: 'READY', originalStyle, ranges, clippedTicker}
        }, selector)
        if (prepared.status !== 'READY') {results.push({target: node.target, status: prepared.status}); continue}
        try {
          const png = (await page.screenshot({type: 'png'})).toString('base64')
          const measured = await page.evaluate(async ({png, ranges}) => {
            const image = new Image(); image.src = 'data:image/png;base64,' + png; await image.decode()
            const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
            const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0)
            const pixels = ctx.getImageData(0, 0, image.width, image.height).data, scale = image.width / innerWidth
            const luminance = rgb => rgb.map(v => {const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4}).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
            let lowestMargin = Infinity, worst = null, sampled = 0
            for (const range of ranges) {
              for (let y = Math.ceil(range.y * scale); y < Math.floor((range.y + range.height) * scale); y++) {
                for (let x = Math.ceil(range.x * scale); x < Math.floor((range.x + range.width) * scale); x++) {
                  const index = (y * image.width + x) * 4, background = [pixels[index], pixels[index + 1], pixels[index + 2]]
                  const foreground = background.map((v, i) => range.color[i] * range.color[3] + v * (1 - range.color[3]))
                  const a = luminance(foreground), b = luminance(background), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
                  sampled++
                  if (ratio / range.threshold < lowestMargin) {lowestMargin = ratio / range.threshold; worst = {ratio, threshold: range.threshold, foreground_rgba: range.color, background_rgb: background}}
                }
              }
            }
            return {status: !sampled ? 'NO_SAMPLES' : lowestMargin >= 1 ? 'RENDERED_CONTRAST_PASS' : 'RENDERED_CONTRAST_FAIL', sampled_pixels: sampled, worst}
          }, {png, ranges: prepared.ranges})
          if (measured.status === 'RENDERED_CONTRAST_PASS' && prepared.clippedTicker) measured.status = 'RENDERED_VISIBLE_TICKER_PASS'
          results.push({target: node.target, ...measured, unmeasured_offscreen_text: prepared.clippedTicker})
        } finally {
          await page.evaluate(({selector, originalStyle}) => {
            const el = document.querySelector(selector)
            if (el) {if (originalStyle === null) el.removeAttribute('style'); else el.setAttribute('style', originalStyle)}
          }, {selector, originalStyle: prepared.originalStyle})
        }
      }
    }
  } finally {await page.evaluate(({x, y}) => scrollTo(x, y), originalScroll)}
  return results
}
