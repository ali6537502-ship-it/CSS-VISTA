import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const clientDir = process.env.CSSV_CLIENT_DIR
  ? resolve(root, process.env.CSSV_CLIENT_DIR)
  : join(root, 'dist', 'client')
const homePath = join(clientDir, 'index.html')

const criticalCss = `<style id="cssv-prerender-critical">
.cssv-prerender-shell{box-sizing:border-box;width:min(100% - 2rem,72rem);margin:1.25rem auto 3rem;padding:clamp(1.1rem,2.4vw,2rem);border:1px solid #d9e8e0;border-radius:1.25rem;background:linear-gradient(180deg,#fff 0%,#fbfdfc 100%);box-shadow:0 10px 35px rgba(6,61,43,.08);color:#17352b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65}.cssv-prerender-shell::before{content:"CSS VISTA  ·  Study resource";display:block;margin:-.1rem 0 1.2rem;padding:0 0 .8rem;border-bottom:1px solid #e2eee8;color:#146346;font-size:.72rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.cssv-prerender-shell *{box-sizing:border-box}.cssv-prerender-shell h1,.cssv-prerender-shell h2,.cssv-prerender-shell h3{margin-top:0;color:#063d2b;line-height:1.18}.cssv-prerender-shell h1{font-size:clamp(1.8rem,5vw,2.8rem);letter-spacing:-.025em}.cssv-prerender-shell h2{font-size:clamp(1.2rem,3vw,1.55rem);margin-bottom:.55rem}.cssv-prerender-shell h3{font-size:1rem}.cssv-prerender-shell p{max-width:72ch;color:#4a6259}.cssv-prerender-shell section,.cssv-prerender-shell nav,.cssv-prerender-shell dl{margin-top:1rem;border:1px solid #e1ece6;border-radius:1rem;background:#fff;padding:1rem}.cssv-prerender-shell ul,.cssv-prerender-shell ol{padding-left:1.25rem}.cssv-prerender-shell li{margin:.35rem 0}.cssv-prerender-shell a{color:#0b6b4b;font-weight:700;text-underline-offset:3px}.cssv-prerender-shell a[class*="bg-pine"]{display:inline-block;border-radius:.65rem;background:#063d2b!important;color:#fff!important;padding:.7rem 1rem;text-decoration:none}.cssv-prerender-shell [class*="grid"]{gap:.7rem}.cssv-prerender-shell [class*="rounded"]{border-radius:.8rem}.cssv-prerender-shell [class*="text-amber"]{color:#a15c00!important}.cssv-prerender-shell [class*="text-emerald"]{color:#0b6b4b!important}@media(max-width:640px){.cssv-prerender-shell{width:min(100% - 1rem,72rem);margin:.5rem auto 1.5rem;padding:1rem;border-radius:.9rem}.cssv-prerender-shell::before{font-size:.62rem;letter-spacing:.09em}.cssv-prerender-shell section,.cssv-prerender-shell nav,.cssv-prerender-shell dl{padding:.85rem}}
</style>`

const homeCriticalCss = `<style id="cssv-home-first-paint-critical">
[data-cssv-home-first-paint]{box-sizing:border-box;min-height:100vh;background:#f7faf8;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}[data-cssv-home-first-paint] *{box-sizing:border-box}.cssv-fp-live{display:flex;min-height:34px;align-items:center;justify-content:center;gap:.55rem;background:#063d2b;padding:.35rem .75rem;color:#ecfdf5;font-size:.7rem;font-weight:700;letter-spacing:.02em}.cssv-fp-live span:last-child{color:#f5cf68;font-size:.64rem}.cssv-fp-header{border-bottom:1px solid #dbe7e1;background:rgba(255,255,255,.96)}.cssv-fp-header-inner{display:flex;height:56px;max-width:1520px;margin:0 auto;align-items:center;gap:.4rem;padding:0 .65rem}.cssv-fp-menu{display:grid;width:36px;height:36px;place-items:center;color:#17352b}.cssv-fp-logo{display:flex;flex:1;justify-content:center}.cssv-fp-logo img{display:block;width:auto;height:36px;max-width:116px;object-fit:contain}.cssv-fp-nav{display:none;margin-left:auto;align-items:center;gap:.25rem}.cssv-fp-nav a{border-radius:.55rem;padding:.7rem .75rem;color:#334155;font-size:.78rem;font-weight:650;text-decoration:none}.cssv-fp-content{width:min(100% - 1.5rem,1240px);margin:0 auto;padding:1rem 0 1.5rem}.cssv-fp-search{display:flex;height:44px;align-items:center;gap:.65rem;border:1px solid #dce7e2;border-radius:.8rem;background:rgba(255,255,255,.94);padding:0 .8rem;box-shadow:0 8px 24px rgba(6,61,43,.045);color:#94a3b8;font-size:.82rem}.cssv-fp-search svg{width:16px;height:16px;flex:0 0 auto;color:#0f6a4a}.cssv-fp-hero{margin-top:.75rem;overflow:hidden;border:1px solid #dce7e2;border-radius:1rem;background:#eaf2ee;box-shadow:0 10px 30px rgba(6,61,43,.06)}.cssv-fp-hero picture,.cssv-fp-hero img{display:block;width:100%}.cssv-fp-hero img{height:auto;aspect-ratio:2862/1338;object-fit:cover}.cssv-fp-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.cssv-fp-timers{margin-top:.75rem;border:1px solid #dce7e2;border-radius:1rem;background:rgba(255,255,255,.9);padding:.7rem;box-shadow:0 8px 24px rgba(6,61,43,.045)}.cssv-fp-title-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0 .1rem .5rem}.cssv-fp-title-row strong{font-size:.76rem;color:#334155}.cssv-fp-title-row span{font-size:.58rem;color:#94a3b8}.cssv-fp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem}.cssv-fp-timer-card{min-height:62px;border:1px solid #e1ebe6;border-radius:.75rem;background:#fbfdfc;padding:.55rem}.cssv-fp-timer-card b{display:block;color:#0f6a4a;font-size:.58rem;letter-spacing:.08em;text-transform:uppercase}.cssv-fp-line{height:8px;border-radius:999px;background:#e6eeea}.cssv-fp-line.sm{width:42%;margin-top:.42rem}.cssv-fp-line.lg{width:78%;margin-top:.5rem}.cssv-fp-continue-label{display:flex;margin-top:1rem;align-items:end;justify-content:space-between}.cssv-fp-continue-label strong{font-size:1rem}.cssv-fp-continue-label span{font-size:.65rem;color:#0f6a4a;font-weight:700}.cssv-fp-continue{display:flex;min-height:92px;margin-top:.55rem;align-items:center;gap:.75rem;border:1px solid #dce7e2;border-radius:1rem;background:rgba(255,255,255,.93);padding:.8rem}.cssv-fp-icon{width:40px;height:40px;flex:0 0 auto;border-radius:.7rem;background:#e8f3ee}.cssv-fp-copy{flex:1;min-width:0}.cssv-fp-copy .cssv-fp-line:first-child{width:38%}.cssv-fp-copy .cssv-fp-line:last-child{width:68%;margin-top:.55rem}.cssv-fp-action{width:58px;height:34px;flex:0 0 auto;border-radius:.55rem;background:#063d2b}.cssv-fp-seo-spacer{min-height:8px}@media(min-width:640px){.cssv-fp-header-inner{height:68px;padding:0 1.5rem}.cssv-fp-logo img{height:48px;max-width:190px}.cssv-fp-content{width:min(100% - 2rem,1240px);padding-top:1.25rem}}@media(min-width:1280px){.cssv-fp-live{min-height:36px}.cssv-fp-header-inner{height:82px}.cssv-fp-menu{display:none}.cssv-fp-logo{flex:none;justify-content:flex-start}.cssv-fp-logo img{height:62px;max-width:245px}.cssv-fp-nav{display:flex}.cssv-fp-content{padding:1.65rem 0 2rem}}
</style>`

const homeFirstPaint = `<div data-cssv-home-first-paint aria-busy="true">
  <div class="cssv-fp-live"><span>CSS Vista</span><span>Study · Practice · Progress</span></div>
  <header class="cssv-fp-header">
    <div class="cssv-fp-header-inner">
      <span class="cssv-fp-menu" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></span>
      <a class="cssv-fp-logo" href="/" aria-label="CSS Vista home"><img src="/images/logo.webp?v=20260909" alt="CSS Vista - official logo" width="480" height="157" decoding="async" /></a>
      <nav class="cssv-fp-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/css-mcqs">Subject MCQs</a><a href="/gk">GK World</a><a href="/mpt">MPT Practice</a><a href="/past-papers">Past Papers</a></nav>
    </div>
  </header>
  <div class="cssv-fp-content">
    <div class="cssv-fp-search" role="search" aria-label="Search CSS Vista"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><span>Search notes, MCQs, subjects, past papers…</span></div>
    <section class="cssv-fp-hero" aria-labelledby="css-vista-first-paint-title">
      <h1 id="css-vista-first-paint-title" class="cssv-fp-sr">CSS Vista</h1>
      <picture>
        <source media="(max-width: 640px)" srcset="/images/css-vista-main-poster-480.webp 480w, /images/css-vista-main-poster-720.webp 720w" sizes="calc(100vw - 1.5rem)" />
        <img src="/images/css-vista-main-poster-1440.webp" srcset="/images/css-vista-main-poster-720.webp 720w, /images/css-vista-main-poster-1440.webp 1440w, /images/css-vista-main-poster-2400.webp 2400w" sizes="(max-width: 1280px) calc(100vw - 2rem), 1240px" alt="CSS Vista competitive examination preparation platform" width="2862" height="1338" fetchpriority="high" decoding="async" />
      </picture>
    </section>
    <section class="cssv-fp-timers" aria-label="Preparation timers loading">
      <div class="cssv-fp-title-row"><strong>Live preparation timers</strong><span>Loading current timings</span></div>
      <div class="cssv-fp-grid"><div class="cssv-fp-timer-card"><b>Daily mocks</b><div class="cssv-fp-line sm"></div><div class="cssv-fp-line lg"></div></div><div class="cssv-fp-timer-card"><b>Official exam dates</b><div class="cssv-fp-line sm"></div><div class="cssv-fp-line lg"></div></div></div>
    </section>
    <div class="cssv-fp-continue-label"><strong>Continue studying</strong><span>History</span></div>
    <div class="cssv-fp-continue" aria-hidden="true"><span class="cssv-fp-icon"></span><span class="cssv-fp-copy"><span class="cssv-fp-line"></span><span class="cssv-fp-line"></span></span><span class="cssv-fp-action"></span></div>
    <div class="cssv-fp-seo-spacer" aria-hidden="true"></div>
  </div>
</div>`

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

  if (path === homePath) {
    if (!html.includes('data-cssv-home-first-paint')) {
      html = html.replace(
        /(<div id="root"><main\b[^>]*>[\s\S]*?)<h1([^>]*)>CSS Vista<\/h1>/,
        '$1<h2$2>CSS Vista</h2>',
      )
      html = html.replace('<div id="root">', `<div id="root">${homeFirstPaint}`)
    }
    if (!html.includes('id="cssv-home-first-paint-critical"')) {
      html = html.replace('</head>', `    ${homeCriticalCss}\n  </head>`)
    }
    if (!html.includes('data-cssv-home-first-paint') || !html.includes('id="cssv-home-first-paint-critical"')) {
      throw new Error('Could not create the CSS Vista homepage first-paint shell.')
    }
    await writeFile(path, html)
    processed += 1
    continue
  }

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
