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

const homeCriticalCss = `<style id="cssv-home-first-paint-critical">
[data-cssv-home-first-paint]{box-sizing:border-box;min-height:100vh;background:#f7faf8;color:#0f172a;font-family:"Google Sans","Product Sans",Inter,Arial,sans-serif}[data-cssv-home-first-paint] *{box-sizing:border-box}.cssv-fp-live{display:flex;min-height:34px;align-items:center;justify-content:center;gap:.55rem;background:#063d2b;padding:.35rem .75rem;color:#ecfdf5;font-size:.7rem;font-weight:700;letter-spacing:.02em}.cssv-fp-live span:last-child{color:#f5cf68;font-size:.64rem}.cssv-fp-header{border-bottom:1px solid #dbe7e1;background:rgba(255,255,255,.96)}.cssv-fp-header-inner{display:flex;height:56px;max-width:1520px;margin:0 auto;align-items:center;gap:.4rem;padding:0 .65rem}.cssv-fp-menu{display:grid;width:36px;height:36px;place-items:center;color:#17352b}.cssv-fp-logo{display:flex;flex:1;justify-content:center}.cssv-fp-logo img{display:block;width:auto;height:36px;max-width:116px;object-fit:contain}.cssv-fp-nav{display:none;margin-left:auto;align-items:center;gap:.25rem}.cssv-fp-nav a{border-radius:.55rem;padding:.7rem .75rem;color:#334155;font-size:.78rem;font-weight:650;text-decoration:none}.cssv-fp-content{width:min(100% - 1.5rem,1240px);margin:0 auto;padding:1rem 0 1.5rem}.cssv-fp-search{display:flex;height:44px;align-items:center;gap:.65rem;border:1px solid #dce7e2;border-radius:.8rem;background:rgba(255,255,255,.94);padding:0 .8rem;box-shadow:0 8px 24px rgba(6,61,43,.045);color:#94a3b8;font-size:.82rem}.cssv-fp-search svg{width:16px;height:16px;flex:0 0 auto;color:#0f6a4a}.cssv-fp-hero{display:grid;min-height:430px;margin-top:.75rem;overflow:hidden;border:1px solid #dce7e2;border-radius:1.25rem;background:linear-gradient(115deg,rgba(255,255,255,.94),rgba(236,248,242,.82));box-shadow:0 16px 38px rgba(6,61,43,.08)}.cssv-fp-hero-copy{align-self:center;padding:1.35rem}.cssv-fp-kicker{margin:0 0 .35rem;color:#8b671c;font-size:.78rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.cssv-fp-hero h1{max-width:15ch;margin:0;color:#0b2d22;font-size:clamp(2.05rem,9vw,3.55rem);font-weight:650;letter-spacing:-.045em;line-height:.98}.cssv-fp-hero h1 span{color:#07573d}.cssv-fp-description{max-width:42rem;margin:.95rem 0 0;color:#52645e;font-size:.82rem;font-weight:550;line-height:1.65}.cssv-fp-account{margin:.75rem;border-radius:1.1rem;background:linear-gradient(155deg,#0a6a4a,#043b2b);padding:1.3rem;color:#fff;box-shadow:0 18px 36px rgba(3,68,47,.2)}.cssv-fp-account-badge{display:inline-flex;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:.3rem .55rem;color:#ffe17d;font-size:.63rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.cssv-fp-account h2{margin:.7rem 0 0;color:#fff;font-size:clamp(1.7rem,8vw,2.7rem);letter-spacing:-.035em;line-height:.92;text-transform:uppercase}.cssv-fp-account h2 span{display:block;color:#ffd56a}.cssv-fp-account p{margin:.8rem 0 0;color:#d7efe5;font-size:.75rem;line-height:1.5}.cssv-fp-account ul{display:grid;gap:.6rem;margin:.85rem 0 0;padding:0;list-style:none}.cssv-fp-account li{display:flex;gap:.5rem;color:#edf9f4;font-size:.72rem;font-weight:650;line-height:1.35}.cssv-fp-account li::before{content:"✓";color:#ffd45f;font-weight:900}.cssv-fp-account a{display:flex;min-height:44px;margin-top:1rem;align-items:center;justify-content:center;border-radius:.7rem;background:#ffd56a;color:#073f2e;font-size:.75rem;font-weight:850;text-decoration:none}.cssv-fp-timers{margin-top:.75rem;border:1px solid #dce7e2;border-radius:1rem;background:rgba(255,255,255,.9);padding:.7rem;box-shadow:0 8px 24px rgba(6,61,43,.045)}.cssv-fp-title-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0 .1rem .5rem}.cssv-fp-title-row strong{font-size:.76rem;color:#334155}.cssv-fp-title-row span{font-size:.58rem;color:#94a3b8}.cssv-fp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem}.cssv-fp-timer-card{min-height:62px;border:1px solid #e1ebe6;border-radius:.75rem;background:#fbfdfc;padding:.55rem}.cssv-fp-timer-card b{display:block;color:#0f6a4a;font-size:.58rem;letter-spacing:.08em;text-transform:uppercase}.cssv-fp-line{height:8px;border-radius:999px;background:#e6eeea}.cssv-fp-line.sm{width:42%;margin-top:.42rem}.cssv-fp-line.lg{width:78%;margin-top:.5rem}.cssv-fp-continue-label{display:flex;margin-top:1rem;align-items:end;justify-content:space-between}.cssv-fp-continue-label strong{font-size:1rem}.cssv-fp-continue-label span{font-size:.65rem;color:#0f6a4a;font-weight:700}.cssv-fp-continue{display:flex;min-height:92px;margin-top:.55rem;align-items:center;gap:.75rem;border:1px solid #dce7e2;border-radius:1rem;background:rgba(255,255,255,.93);padding:.8rem}.cssv-fp-icon{width:40px;height:40px;flex:0 0 auto;border-radius:.7rem;background:#e8f3ee}.cssv-fp-copy{flex:1;min-width:0}.cssv-fp-copy .cssv-fp-line:first-child{width:38%}.cssv-fp-copy .cssv-fp-line:last-child{width:68%;margin-top:.55rem}.cssv-fp-action{width:58px;height:34px;flex:0 0 auto;border-radius:.55rem;background:#063d2b}.cssv-fp-seo-spacer{min-height:8px}@media(min-width:640px){.cssv-fp-header-inner{height:68px;padding:0 1.5rem}.cssv-fp-logo img{height:48px;max-width:190px}.cssv-fp-content{width:min(100% - 2rem,1240px);padding-top:1.25rem}}@media(min-width:700px){.cssv-fp-hero{grid-template-columns:minmax(0,1.02fr) minmax(340px,.98fr);min-height:450px}.cssv-fp-hero-copy{padding:2.4rem 0 2.4rem 2.5rem}.cssv-fp-account{align-self:stretch;margin:1.25rem;padding:1.65rem}}@media(min-width:1280px){.cssv-fp-live{min-height:36px}.cssv-fp-header-inner{height:82px}.cssv-fp-menu{display:none}.cssv-fp-logo{flex:none;justify-content:flex-start}.cssv-fp-logo img{height:62px;max-width:245px}.cssv-fp-nav{display:flex}.cssv-fp-content{padding:1.65rem 0 2rem}.cssv-fp-hero{min-height:520px}.cssv-fp-hero-copy{padding-left:3.2rem}.cssv-fp-hero h1{font-size:clamp(3.35rem,4.7vw,4.75rem)}}
</style>`

const homeHeroBalanceCss = `<style id="cssv-home-first-paint-balance">
.cssv-fp-kicker{font-weight:850}.cssv-fp-hero h1{font-size:clamp(1.82rem,8.8vw,2.65rem)}.cssv-fp-description{color:#29483d;font-size:.98rem;font-weight:680}@media(min-width:1280px){.cssv-fp-hero h1{font-size:clamp(2.85rem,4.25vw,3.8rem)}}
</style>`

const homeFirstPaint = `<div data-cssv-home-first-paint aria-busy="true">
  <div class="cssv-fp-live"><span>CSS Vista</span><span>Study · Practice · Progress</span></div>
  <header class="cssv-fp-header">
    <div class="cssv-fp-header-inner">
      <span class="cssv-fp-menu" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></span>
      <a class="cssv-fp-logo" href="/" aria-label="CSS Vista home"><img src="/images/logo.webp?v=20260909" alt="CSS Vista - official logo" width="480" height="157" decoding="async" /></a>
      <nav class="cssv-fp-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/css-mcqs">Subject MCQs</a><a href="/gk">GK World</a><a href="/mpt">MPT Practice</a><a href="/past-papers">Past Papers</a><a href="/legal">Policies</a></nav>
    </div>
  </header>
  <div class="cssv-fp-content">
    <div class="cssv-fp-search" role="search" aria-label="Search CSS Vista"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><span>Search notes, MCQs, subjects, past papers…</span></div>
    <section class="cssv-fp-hero" aria-labelledby="css-vista-first-paint-title">
      <div class="cssv-fp-hero-copy">
        <p class="cssv-fp-kicker">CSS Vista</p>
        <h1 id="css-vista-first-paint-title">Everything you need to prepare. <span>One platform. Completely free.</span></h1>
        <p class="cssv-fp-description">Your sincere preparation partner for daily Current Affairs, MCQs, past papers, notes, book summaries, mock exams and structured study—all in one place.</p>
      </div>
      <aside class="cssv-fp-account" aria-label="Free CSS Vista student account">
        <span class="cssv-fp-account-badge">Always free</span>
        <h2><span>Free</span> student account</h2>
        <p>Turn CSS Vista into your own connected preparation dashboard.</p>
        <ul><li>Continue from your last question or resource</li><li>Access daily Current Affairs with MCQs and study resources</li><li>Keep planner, progress, bookmarks and mistakes together</li></ul>
        <a href="/account">Create my free account →</a>
      </aside>
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
      html = html.replace('</head>', `    ${homeCriticalCss}\n    ${homeHeroBalanceCss}\n  </head>`)
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
