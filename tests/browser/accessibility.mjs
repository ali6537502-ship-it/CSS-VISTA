import {chromium} from 'playwright-core'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'

if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw Error('Disposable native database required')
const root = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const base = process.env.CSSV_TEST_BROWSER_ORIGIN || 'https://localhost:3444'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback only')
const env = {...process.env}
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key]
const php = (...args) => (process.env.CSSV_TEST_PHP_CONTAINER
  ? execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', process.env.CSSV_TEST_PHP_CONTAINER, 'php', ...args], {cwd: root, env, encoding: 'utf8'})
  : execFileSync('php', args, {cwd: root, env, encoding: 'utf8'})).trim()
const require = createRequire(new URL('./package.json', import.meta.url))
const axePath = require.resolve('axe-core/axe.min.js')
php('tests/skills/fixture.php', 'config', 'off')
const email = `accessibility-${Date.now()}@example.invalid`
const user = php('tests/current-affairs/setup.php', 'user', email)
php('tests/precis/fixture.php', 'activate', user)
const before = php('tests/skills/fixture.php', 'snapshot', user)
const curriculum = JSON.parse(readFileSync(root + '/public/api/_premium_files/skills-curriculum.json'))
const theme = JSON.parse(readFileSync(root + '/public/study-material/essay-themes.json')).themes[0].slug
const ability = JSON.parse(readFileSync(root + '/public/api/_premium_files/general-ability-course.json')).units[0]
const browser = await chromium.launch({executablePath: process.env.CSSV_BROWSER_EXECUTABLE || chromium.executablePath(), args: ['--no-sandbox']})
const context = await browser.newContext({ignoreHTTPSErrors: true, viewport: {width: 390, height: 1000}, reducedMotion: 'reduce'})
const page = await context.newPage(), errors = [], audits = []
page.setDefaultTimeout(30000)
page.on('pageerror', error => errors.push(error.message))
async function settled() {
  await page.locator('main h1').waitFor()
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}
async function audit(name) {
  await settled()
  const scroll = await page.evaluate(() => window.scrollY)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.evaluate(() => new Promise(requestAnimationFrame))
  await page.addScriptTag({path: axePath})
  const result = await page.evaluate(async () => {
    const result = await window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']}})
    const structure = await window.axe.run(document, {runOnly: {type: 'rule', values: ['landmark-one-main', 'landmark-main-is-top-level']}})
    return {violations: [...result.violations, ...structure.violations].map(v => ({id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({target: n.target, summary: n.failureSummary}))})), incomplete: [...result.incomplete, ...structure.incomplete].map(v => ({id: v.id, help: v.help, nodes: v.nodes.map(n => ({target: n.target, summary: n.failureSummary, checks: [...n.any, ...n.all, ...n.none].map(c => c.message)}))}))}
  })
  audits.push({name, width: page.viewportSize().width, initial_scroll_y: scroll, ...result})
  assert.equal(await page.locator('main').count(), 1, 'One primary content landmark')
  assert.equal(await page.locator('.vista-live-ticker-track').evaluate(el => getComputedStyle(el).animationName), 'none', 'Honor reduced-motion preference')
  if (name === 'dashboard') {
    mkdirSync(root + '/test-artifacts', {recursive: true})
    await page.screenshot({path: root + '/test-artifacts/accessibility-dashboard-mobile.png'})
  }
  console.log(JSON.stringify({screen: name, violations: result.violations.map(v => ({id: v.id, targets: v.nodes.map(n => n.target)})), manual_review: result.incomplete.map(v => v.id)}))
}
try {
  await page.goto(base + '/account')
  await page.getByLabel('Email address', {exact: true}).fill(email)
  await page.getByLabel('Password', {exact: true}).fill('TEST ONLY native fixture password')
  await page.getByRole('button', {name: 'Sign in securely', exact: true}).click()
  await page.waitForURL('**/account/dashboard')
  const csrf = (await context.cookies()).find(c => c.name === 'cssv_csrf').value
  const attempt = await context.request.post(base + '/api/student/learning.php', {headers: {'X-CSRF-Token': csrf}, data: {action: 'attempt_save', request_id: crypto.randomUUID(), expected_version: 0, target_year: 2027, target_date: null, optional_subject_ids: [], daily_minutes: 60, stage: 'starting'}})
  assert.equal(attempt.status(), 200)
  for (const path of ['dashboard', 'dashboard?plan=pro', 'expression', 'precis', 'general-ability', 'handwriting', 'ask-vista', 'preparation', 'progress', 'ai-usage', 'membership']) {
    await page.goto(base + '/account/' + path)
    await audit(path)
  }
  for (const [feature, path] of [['sentence', 'expression?view=studio'], ['argument', 'argumentation'], ['analysis', 'analytical-skills'], ['essay', 'essay-builder']]) {
    await page.goto(base + '/account/' + path)
    const lesson = curriculum.lessons.find(l => l.feature === feature && l.level === 'beginner')
    await page.getByRole('combobox', {name: feature === 'essay' ? /^Existing essay theme/ : /^Lesson/}).selectOption(lesson?.id || theme)
    await page.getByRole('button', {name: 'Start guided practice', exact: true}).click()
    await page.getByRole('heading', {name: /1 · Understand the theme|Understand the idea/}).waitFor()
    await audit(feature + '-guided')
    if (lesson) {
      const radios = page.getByRole('radio')
      await radios.first().focus()
      await page.keyboard.press('Space')
      for (let i = 0; i < lesson.check.answer; i++) await page.keyboard.press('ArrowDown')
      assert.equal(await radios.nth(lesson.check.answer).isChecked(), true, 'Native radio keyboard selection')
      const save = page.getByRole('button', {name: 'Save & continue', exact: true})
      await save.focus(); await page.keyboard.press('Enter')
    }
    const field = page.locator('form textarea').first()
    await field.fill(feature === 'sentence' ? 'Students revise their drafts.' : 'This original test response proposes a conditional reason and identifies what evidence would be needed before drawing a conclusion.')
    await field.focus(); await page.keyboard.press('Tab')
    const save = page.getByRole('button', {name: 'Save independent response', exact: true})
    assert.equal(await save.evaluate(el => document.activeElement === el), true, 'Tab reaches the response save control')
    await page.keyboard.press('Enter')
    await page.getByText(new RegExp('beginner · ' + (lesson ? 2 : 1) + ' saved versions')).waitFor()
    await audit(feature + '-saved-editor')
    await field.focus(); await page.keyboard.press('Escape')
    assert.equal(await field.evaluate(el => document.activeElement === el), true, 'A closed notification panel must not steal editor focus')
  }
  const lesson = ability.lessons[0]
  await page.goto(base + '/account/general-ability?unit=' + ability.id + '&lesson=' + lesson.id)
  await page.getByRole('heading', {name: ability.title, exact: true}).waitFor()
  const answer = page.getByRole(lesson.exercise.kind === 'choice' ? 'combobox' : 'textbox', {name: /^Your answer/})
  if (lesson.exercise.kind === 'choice') {
    const index = await answer.evaluate((el, value) => [...el.options].findIndex(option => option.value === value), String(lesson.exercise.answer))
    assert(index > 0, 'A real stored answer follows the unanswered option')
    const last = await answer.locator('option').count() - 1
    await answer.focus(); await page.keyboard.press('End')
    for (let i = last; i > index; i--) await page.keyboard.press('ArrowUp')
  } else {
    await answer.focus(); await page.keyboard.type(String(lesson.exercise.answer))
  }
  assert.equal(await answer.inputValue(), String(lesson.exercise.answer))
  await page.keyboard.press('Tab')
  const check = page.getByRole('button', {name: /^Check & save answer/})
  assert.equal(await check.evaluate(el => document.activeElement === el), true, 'Keyboard reaches deterministic grading')
  await page.keyboard.press('Enter')
  await page.getByText(/^Correct [—-] exercise saved$/).waitFor()
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height: 1000})
    await audit('ability-feedback')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow')
  }
  await page.goto(base + '/account/dashboard?plan=pro')
  await audit('pro-dashboard-desktop')
  const accountMenu = page.getByRole('button', {name: /^Open My Account menu/})
  await accountMenu.focus(); await page.keyboard.press('Enter')
  assert.equal(await accountMenu.getAttribute('aria-expanded'), 'true')
  await page.getByRole('menu', {name: 'My Account and CSS Vista links', exact: true}).waitFor()
  await audit('account-menu-desktop')
  await accountMenu.focus(); await page.keyboard.press('Tab')
  const firstItem = page.getByRole('menu', {name: 'My Account and CSS Vista links', exact: true}).getByRole('menuitem').first()
  assert.equal(await firstItem.evaluate(el => document.activeElement === el), true, 'Tab enters the account menu')
  await page.keyboard.press('Escape')
  assert.equal(await accountMenu.getAttribute('aria-expanded'), 'false')
  assert.equal(await accountMenu.evaluate(el => document.activeElement === el), true, 'Escape restores focus to the account menu button')
  const bell = page.getByRole('button', {name: 'Notifications', exact: true})
  await bell.focus(); await page.keyboard.press('Enter')
  await page.getByRole('region', {name: 'Updates and announcements', exact: true}).waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await bell.getAttribute('aria-expanded'), 'false')
  assert.equal(await bell.evaluate(el => document.activeElement === el), true, 'Notification-owned Escape still returns to its bell')
  assert.equal(php('tests/skills/fixture.php', 'snapshot', user), before, 'Accessibility scans must not dispatch AI or spend usage')
  assert.deepEqual(errors, [], 'Browser errors during accessibility checks')
  assert.equal(audits.reduce((count, audit) => count + audit.violations.length, 0), 0, 'Resolve actual WCAG violations; see private test-artifacts/accessibility.json')
  console.log('PASS isolated built Pro accessibility: WCAG A/AA and single-main checks, keyboard choice/writing/grading/menu recovery, 320–1440 widths, reduced-motion preference, no model calls. Manual/assistive-technology review remains separate.')
} finally {
  mkdirSync(root + '/test-artifacts', {recursive: true})
  writeFileSync(root + '/test-artifacts/accessibility.json', JSON.stringify(audits, null, 2))
  await browser.close()
}
