/** Real native registration and profile journey. Never targets production accounts. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { isolateNetwork } from './isolated-network.mjs'

if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw Error('Disposable database required')
const base = process.env.CSSV_TEST_BROWSER_ORIGIN || 'https://localhost:3444'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback only')
if (process.env.CSSV_TEST_PHP_CONTAINER) {
  const env = { ...process.env }
  for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key]
  execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', process.env.CSSV_TEST_PHP_CONTAINER, 'php', 'tests/account-native/signup-fixture.php'], { env, stdio: 'pipe' })
}
const output = 'test-artifacts/signup/after'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' })
await isolateNetwork(context, base)
const page = await context.newPage(); page.setDefaultTimeout(20000)
const errors = [], checks = [], scans = []
page.on('pageerror', error => errors.push(error.message))
const email = `signup-${Date.now()}@example.invalid`, password = 'TEST ONLY signup password'
const destination = '/account/tasks?view=week#plan'
const field = name => page.getByLabel(name, { exact: false }).and(page.locator('input,select,textarea'))
const step = name => page.getByRole('heading', { name, exact: true })
const next = () => page.getByRole('button', { name: 'Save & continue', exact: true }).click()
const profile = async () => (await (await context.request.get(base + '/api/student/profile.php')).json()).profile
async function scan(name) {
  await page.addScriptTag({ content: readFileSync('tests/browser/node_modules/axe-core/axe.min.js', 'utf8') })
  const result = await page.evaluate(async () => (await window.axe.run(document.querySelector('.ac-access') || document.querySelector('.ac-profile'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })))
  scans.push({ name, violations: result })
}
async function widths(name) {
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} overflow at ${width}`)
    assert.equal(await page.getByRole('main').count(), 1, 'Account entry and profile setup expose one main landmark')
    await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0) }); await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.getByRole('navigation', { name: 'Primary mobile navigation', exact: true }).count(), 0, 'Public bottom navigation is absent during setup')
    if (name === 'contact' && width <= 390) {
      const firstField = await field('Full name').boundingBox()
      assert.ok(firstField && firstField.y + firstField.height < 900, 'The first profile field is visible without scrolling')
    }
    await page.screenshot({ path: `${output}/${name}-${width}.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 390, height: 844 })
}
try {
  let registers = 0, saves = 0, uploads = 0, failSave = true
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().endsWith('/api/auth/register.php')) ++registers
    if (request.method() === 'POST' && request.url().endsWith('/api/student/profile.php')) ++saves
    if (request.method() === 'POST' && request.url().endsWith('/api/student/photo.php')) ++uploads
  })
  await page.goto(`${base}/account?mode=create&returnTo=${encodeURIComponent(destination)}`)
  await page.getByRole('button', { name: 'Create my free account', exact: true }).click()
  await page.waitForFunction(() => document.activeElement?.id === 'access-email')
  assert.equal(await field('Full name').getAttribute('aria-invalid'), 'true')
  await field('Full name').focus()
  await page.keyboard.press('Tab'); assert.equal(await field('Email address').evaluate(input => document.activeElement === input), true)
  await page.keyboard.press('Tab'); assert.equal(await field('Password').evaluate(input => document.activeElement === input), true)
  await field('Full name').fill('TEST ONLY Student')
  await field('Email address').fill(email)
  await field('Password').fill(password)
  assert.equal(await field('Confirm password').count(), 0)
  await page.getByRole('button', { name: 'Show password', exact: true }).focus(); await page.keyboard.press('Space')
  assert.equal(await field('Password').getAttribute('type'), 'text')
  await page.getByRole('button', { name: 'Hide password', exact: true }).click()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await widths('create'); await scan('create')
  await page.locator('.ac-access form').evaluate(form => { form.requestSubmit(); form.requestSubmit() })
  await step('Contact').waitFor(); assert.equal(registers, 1)
  assert.equal(new URL(page.url()).searchParams.get('returnTo'), destination)
  assert.equal((await context.request.get(base + '/api/student/progress.php')).status(), 403)
  const initial = await profile()
  assert.equal(initial.completion.complete, false)
  assert.equal(initial.completion.checks.find(check => check.key === 'contact').complete, false)
  assert.equal(initial.completion.checks.find(check => check.key === 'optional_subjects').complete, false)
  assert.equal(await field('Full name').inputValue(), 'TEST ONLY Student')
  await field('Contact number').fill('+923001234567')
  await field('Have you previously studied with Miss Sadia Zahoor or Sir Ali Hassan Sargana?').selectOption('Both')
  await next(); await page.getByText('Choose at least one previous service.', { exact: true }).waitFor()
  await page.waitForFunction(() => document.activeElement?.id === 'profile-previous_css_vista_services')
  await page.getByRole('checkbox', { name: 'Test Series', exact: true }).focus(); await page.keyboard.press('Space')
  await page.route('**/api/student/profile.php', route => {
    if (route.request().method() === 'POST' && failSave) { failSave = false; return route.fulfill({ status: 503, json: { error: 'test_unavailable', message: 'TEST ONLY save unavailable. Retry your retained entries.' } }) }
    return route.continue()
  })
  await widths('contact'); await scan('contact')
  await next(); await page.getByText('TEST ONLY save unavailable. Retry your retained entries.', { exact: true }).waitFor()
  assert.equal(await field('Contact number').inputValue(), '+923001234567')
  assert.equal((await profile()).phone || '', '')
  await page.screenshot({ path: `${output}/save-error-390.png`, fullPage: true })
  await next(); await step('About you').waitFor(); assert.equal(saves, 2)
  await page.waitForFunction(() => document.activeElement?.id === 'profile-step-heading')
  checks.push('Three-field registration; duplicate-submit guard; first-step history; failed save retains draft; real retry')
  await field('City').fill('TEST ONLY Draft')
  await page.getByRole('navigation', { name: 'Profile sections' }).getByRole('button', { name: /Contact/ }).click()
  assert.equal(await field('Contact number').inputValue(), '+923001234567')
  await next(); await step('About you').waitFor()
  assert.equal(await field('City').inputValue(), 'TEST ONLY Draft')
  await field('Date of birth').fill('2000-01-01')
  await field('Gender').selectOption('Other')
  await field('Province / region').fill('TEST ONLY Region')
  await field('Country').fill('Pakistan')
  await widths('about'); await scan('about')
  await next(); await step('Your studies').waitFor()
  await page.reload(); await step('Your studies').waitFor()
  assert.equal((await profile()).city, 'TEST ONLY Draft')
  await field('Attempt year').fill('2027')
  await field('Preparation level').selectOption('Starting out')
  await field('Find optional subjects').fill('Political')
  await page.getByRole('checkbox', { name: 'Political Science 200 marks', exact: true }).check()
  await field('Education').fill('TEST ONLY Bachelor degree')
  await widths('studies'); await scan('studies')
  await next(); await step('Your photo').waitFor()
  assert.equal((await context.request.get(base + '/api/student/progress.php')).status(), 403, 'No gate bypass before photo')
  let failLoad = true
  await page.route('**/api/student/profile.php', route => {
    if (route.request().method() === 'GET' && failLoad) { failLoad = false; return route.fulfill({ status: 503, json: { message: 'TEST ONLY unavailable profile' } }) }
    return route.fallback()
  })
  await page.reload(); await page.getByText('Your profile could not be loaded. Please retry.', { exact: true }).waitFor()
  await page.screenshot({ path: `${output}/load-error-390.png`, fullPage: true })
  await page.getByRole('button', { name: 'Retry', exact: true }).click(); await step('Your photo').waitFor()
  const saved = await profile()
  assert.deepEqual(JSON.parse(saved.optional_subjects), ['Political Science'])
  assert.deepEqual(saved.previous_css_vista_services, ['Test Series'])
  const before = await page.evaluate(() => localStorage.getItem('cssvista:v1'))
  if (before) assert.equal(JSON.parse(before).studyPlanner?.selectedOptionals?.length || 0, 0, 'Profile shortlist does not seed a planner combination')
  checks.push('Back navigation retains drafts; saved-step refresh resumes studies/photo; native partial shortlist preserved; no seeded planner')
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 900
    const ctx = canvas.getContext('2d'), data = ctx.createImageData(canvas.width, canvas.height)
    let random = 12345
    for (let i = 0; i < data.data.length; i += 4) { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; data.data[i] = random & 255; data.data[i + 1] = (random >>> 8) & 255; data.data[i + 2] = (random >>> 16) & 255; data.data[i + 3] = 255 }
    ctx.putImageData(data, 0, 0)
    return Array.from(new Uint8Array(await (await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))).arrayBuffer()))
  })
  assert.ok(bytes.length > 60 * 1024)
  await page.locator('#profile-photo').setInputFiles({ name: 'TEST-ONLY-photo.png', mimeType: 'image/png', buffer: Buffer.from(bytes) })
  await page.getByText(/Resized on your device:/).waitFor()
  assert.equal(uploads, 0, 'Preparing a photo does not upload it')
  await widths('photo'); await scan('photo')
  await page.setViewportSize({ width: 844, height: 390 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  await page.screenshot({ path: `${output}/photo-landscape.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  let failUpload = true
  await page.route('**/api/student/photo.php', route => {
    if (route.request().method() === 'POST' && failUpload) { failUpload = false; return route.fulfill({ status: 503, json: { message: 'TEST ONLY photo save unavailable' } }) }
    return route.continue()
  })
  await page.getByRole('button', { name: 'Save photo', exact: true }).click()
  await page.getByText('TEST ONLY photo save unavailable', { exact: true }).waitFor()
  assert.equal((await profile()).has_photo, false)
  await page.getByAltText('Your profile photo preview', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Save photo', exact: true }).click()
  await page.waitForURL(url => url.pathname === '/account/tasks' && url.searchParams.get('view') === 'week' && url.hash === '#plan')
  assert.equal(uploads, 2)
  const complete = await profile(); assert.equal(complete.completion.complete, true); assert.equal(complete.completion.completed, 12)
  assert.ok(complete.profile_photo_bytes <= 60 * 1024 && complete.profile_photo_bytes >= 512)
  assert.equal((await context.request.get(base + '/api/student/progress.php')).status(), 200)
  await page.goto(base + '/account/settings')
  await step('Your profile, your learning space').waitFor()
  await page.locator('.ws-avatar img').first().waitFor()
  assert.equal(await field('Full name').inputValue(), 'TEST ONLY Student')
  async function changeRemotely(patch) {
    const result = await page.evaluate(async patch => {
      const saved = (await (await fetch('/api/student/profile.php')).json()).profile
      const csrf = decodeURIComponent(document.cookie.match(/(?:^|;\s*)cssv_csrf=([^;]+)/)[1])
      const response = await fetch('/api/student/profile.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ ...saved, optional_subjects: JSON.parse(saved.optional_subjects), ...patch }) })
      return response.status
    }, patch)
    assert.equal(result, 200)
  }
  await field('Contact number').fill('+923009998887')
  await changeRemotely({ city: 'TEST ONLY newer city' })
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await page.getByText('Saved to your account.', { exact: true }).waitFor()
  assert.equal((await profile()).city, 'TEST ONLY newer city', 'Untouched fields use fresh server values')
  await field('Contact number').fill('+923009998886')
  await changeRemotely({ phone: '+923009998885' })
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await page.getByText(/Newer saved details were found:/).waitFor()
  assert.equal(await field('Contact number').inputValue(), '+923009998886')
  assert.equal((await profile()).phone, '+923009998885', 'Conflict is not overwritten without review')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await page.getByText('Saved to your account.', { exact: true }).waitFor()
  assert.equal((await profile()).phone, '+923009998886')
  checks.push('Profile update refreshes untouched server fields; conflicting field requires review and retains draft')
  await changeRemotely({ optional_subjects: ['Political Science', 'Legacy subject, imported'] })
  await page.reload(); await step('Your profile, your learning space').waitFor()
  await page.getByRole('navigation', { name: 'Profile sections' }).getByRole('button', { name: /Your studies/ }).click()
  await page.getByRole('button', { name: 'Remove Legacy subject, imported from profile subjects', exact: true }).waitFor()
  await field('Education').fill('TEST ONLY Updated qualification')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await page.getByText('Saved to your account.', { exact: true }).waitFor()
  assert.deepEqual(JSON.parse((await profile()).optional_subjects), ['Political Science', 'Legacy subject, imported'])
  const preservedPhone = (await profile()).phone
  const incompatibleList = async route => {
    if (route.request().method() !== 'GET') return route.fallback()
    const response = await route.fetch(), json = await response.json()
    json.profile.optional_subjects = '{"legacy":"unrecognized shape"}'
    return route.fulfill({ response, json })
  }
  await page.route('**/api/student/profile.php', incompatibleList)
  await page.getByRole('navigation', { name: 'Profile sections' }).getByRole('button', { name: /Contact/ }).click()
  await field('Contact number').fill('+923009997774')
  const writesBefore = saves
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await page.getByText(/Your saved subject list uses an unsupported format/).waitFor()
  assert.equal(saves, writesBefore, 'An incompatible untouched list blocks the full-profile write')
  assert.equal(await field('Contact number').inputValue(), '+923009997774')
  await page.unroute('**/api/student/profile.php', incompatibleList)
  assert.equal((await profile()).phone, preservedPhone)
  assert.deepEqual(JSON.parse((await profile()).optional_subjects), ['Political Science', 'Legacy subject, imported'])
  checks.push('Unsupported legacy list response blocks unrelated writes and retains both native records and the draft')
  let importedService = true
  const legacyService = async route => {
    if (route.request().method() === 'POST') { importedService = false; return route.fallback() }
    const response = await route.fetch(), json = await response.json()
    if (importedService) json.profile.previous_css_vista_services = [...json.profile.previous_css_vista_services, 'Imported service']
    return route.fulfill({ response, json })
  }
  await page.route('**/api/student/profile.php', legacyService)
  await page.reload(); await step('Your profile, your learning space').waitFor()
  await page.getByRole('button', { name: 'Remove unrecognized service Imported service', exact: true }).click()
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await page.getByText('Saved to your account.', { exact: true }).waitFor()
  await page.unroute('**/api/student/profile.php', legacyService)
  assert.deepEqual((await profile()).previous_css_vista_services, ['Test Series'])
  checks.push('An unrecognized imported service remains visible until explicitly removed; supported history stays saved')
  checks.push('Oversize photo resized locally, previewed and explicitly saved within native 60KB; all12 requirements unlock intended query/hash route; private header photo')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await field('Email address').fill(email); await field('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in securely', exact: true }).click()
  await page.waitForURL('**/account/settings')
  await step('Your profile, your learning space').waitFor()
  await page.goto(base + '/account/dashboard')
  await page.getByRole('heading', { name: 'Today’s Study Plan', exact: true }).waitFor()
  checks.push('Completed profile sign-out/sign-in returns to existing workspace with saved record')
  await page.goto(base + '/account/settings'); await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.keyboard.press('Control+k')
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden', 'A public search shortcut cannot trap account entry')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await page.goBack(); await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('mode'), null)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await field('Full name').fill('TEST ONLY existing email')
  await field('Email address').fill(email); await field('Password').fill(password)
  await page.getByRole('button', { name: 'Create my free account', exact: true }).click()
  await page.getByText('An account already exists for this email. Sign in or reset your password.', { exact: true }).waitFor()
  assert.equal(await field('Email address').inputValue(), email)
  await page.goto(`${base}/account?recovery=code&returnTo=${encodeURIComponent(destination)}`)
  await field('Account email').fill(email); await field('Six-digit reset code').fill('000000')
  await field('New password').fill(password); await field('Confirm password').fill('does not match')
  await page.getByRole('button', { name: 'Update password', exact: true }).click()
  await page.getByText('The two password entries do not match.', { exact: true }).waitFor()
  await field('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Update password', exact: true }).click()
  await page.getByText('This code is invalid or expired. Request a new recovery email.', { exact: true }).waitFor()
  assert.equal(await field('New password').inputValue(), password)
  await page.getByRole('link', { name: 'Back to sign in', exact: true }).click()
  assert.equal(new URL(page.url()).searchParams.get('returnTo'), destination)
  await page.getByRole('link', { name: 'Already have a reset code?', exact: true }).click()
  assert.equal(new URL(page.url()).searchParams.get('returnTo'), destination)
  await page.goto(base + '/account?verify=1')
  await page.getByText('This verification link is incomplete.', { exact: false }).waitFor()
  checks.push('Mode/browser history, duplicate email recovery, reset confirmation/invalid code, legacy verification and return-to links')
  const uploadCount = uploads
  await page.goto(base + '/photo-compressor')
  assert.equal(await page.getByLabel('Target file size', { exact: true }).inputValue(), '14')
  await page.getByLabel('Target file size', { exact: true }).selectOption('60')
  await page.locator('#photo-upload').setInputFiles({ name: 'TEST-ONLY-public-tool.png', mimeType: 'image/png', buffer: Buffer.from(bytes) })
  await page.getByRole('button', { name: 'Reduce to 60 KB', exact: true }).click()
  await page.getByRole('button', { name: 'Download photo', exact: true }).waitFor()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download photo', exact: true }).click()
  const file = await download
  assert.ok(readFileSync(await file.path()).byteLength <= 60 * 1024)
  assert.equal(uploads, uploadCount, 'Public size reducer does not upload photos')
  checks.push('Existing public photo compressor still prepares and downloads a real image within the selected size')
  assert.deepEqual(errors, [])
  assert.ok(scans.every(scan => scan.violations.length === 0), 'Every reviewed account step passes its accessibility scan')
  console.log('PASS native signup:', checks.join('; '))
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {})
  throw error
} finally {
  writeFileSync(`${output}/results.json`, JSON.stringify({ checks, scans, errors }, null, 2))
  await browser.close()
}
