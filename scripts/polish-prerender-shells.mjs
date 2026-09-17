import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')
const homePath = join(clientDir, 'index.html')

const criticalCss = `<style id="cssv-prerender-critical">
.cssv-prerender-shell{box-sizing:border-box;width:min(100% - 2rem,72rem);margin:1.25rem auto 3rem;padding:clamp(1.1rem,2.4vw,2rem);border:1px solid #d9e8e0;border-radius:1.25rem;background:linear-gradient(180deg,#fff 0%,#fbfdfc 100%);box-shadow:0 10px 35px rgba(6,61,43,.08);color:#17352b;font-family:"Google Sans","Product Sans",Inter,Arial,sans-serif;line-height:1.65}.cssv-prerender-shell::before{content:"CSS VISTA  ·  Study resource";display:block;margin:-.1rem 0 1.2rem;padding:0 0 .8rem;border-bottom:1px solid #e2eee8;color:#146346;font-size:.72rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.cssv-prerender-shell *{box-sizing:border-box}.cssv-prerender-shell h1,.cssv-prerender-shell h2,.cssv-prerender-shell h3{margin-top:0;color:#063d2b;line-height:1.18}.cssv-prerender-shell h1{font-size:clamp(1.8rem,5vw,2.8rem);letter-spacing:-.025em}.cssv-prerender-shell h2{font-size:clamp(1.2rem,3vw,1.55rem);margin-bottom:.55rem}.cssv-prerender-shell h3{font-size:1rem}.cssv-prerender-shell p{max-width:72ch;color:#4a6259}.cssv-prerender-shell section,.cssv-prerender-shell nav,.cssv-prerender-shell dl{margin-top:1rem;border:1px solid #e1ece6;border-radius:1rem;background:#fff;padding:1rem}.cssv-prerender-shell ul,.cssv-prerender-shell ol{padding-left:1.25rem}.cssv-prerender-shell li{margin:.35rem 0}.cssv-prerender-shell a{color:#0b6b4b;font-weight:700;text-underline-offset:3px}.cssv-prerender-shell a[class*="bg-pine"]{display:inline-block;border-radius:.65rem;background:#063d2b!important;color:#fff!important;padding:.7rem 1rem;text-decoration:none}.cssv-prerender-shell [class*="grid"]{gap:.7rem}.cssv-prerender-shell [class*="rounded"]{border-radius:.8rem}.cssv-prerender-shell [class*="text-amber"]{color:#a15c00!important}.cssv-prerender-shell [class*="text-emerald"]{color:#0b6b4b!important}@media(max-width:640px){.cssv-prerender-shell{width:min(100% - 1rem,72rem);margin:.5rem auto 1.5rem;padding:1rem;border-radius:.9rem}.cssv-prerender-shell::before{font-size:.62rem;letter-spacing:.09em}.cssv-prerender-shell section,.cssv-prerender-shell nav,.cssv-prerender-shell dl{padding:.85rem}}
</style>`




async function htmlFiles(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await htmlFiles(path))
    else if (entry.isFile() && entry.name.endsWith('.html')) result.push(path)
  }
  return result
}

let processed = 0
for (const path of await htmlFiles(clientDir)) {
  let html = await readFile(path, 'utf8')
  if (!/<div id="root"><main\b/.test(html)) continue

  // The homepage (and every other route the build server-renders) now ships
  // the real component markup, so it needs no substitute first-paint shell.
  // Only the template-generated pages below still need critical styling.
  if (path === homePath) continue

  if (!html.includes('cssv-prerender-shell')) {
    html = html.replace(/<div id="root"><main class="/, '<div id="root"><main class="cssv-prerender-shell ')
    if (!html.includes('cssv-prerender-shell')) {
      html = html.replace(/<div id="root"><main>/, '<div id="root"><main class="cssv-prerender-shell">')
    }
  }
  if (!html.includes('id="cssv-prerender-critical"')) html = html.replace('</head>', `    ${criticalCss}\n  </head>`)
  if (!html.includes('cssv-prerender-shell') || !html.includes('id="cssv-prerender-critical"')) {
    throw new Error(`Could not apply critical prerender styling to ${path}`)
  }
  await writeFile(path, html)
  processed += 1
}

if (!processed) throw new Error('No prerendered HTML shells were found to polish.')
console.log(`Added first-paint styling to ${processed} prerendered HTML pages while keeping crawler-visible content available.`)
