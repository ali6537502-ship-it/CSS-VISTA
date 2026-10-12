import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync } from 'node:fs'
if (process.env.CI !== 'true' || process.env.CSSV_DB_NAME !== 'cssvista_briefing_test') throw new Error('Disposable database required')
const base = process.env.CSSV_TEST_BROWSER_ORIGIN || 'https://localhost:3444', root = new URL('../../', import.meta.url).pathname, env = { ...process.env }
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Loopback fixtures only')
for (const k of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[k]
const php = (...args) => process.env.CSSV_TEST_PHP_CONTAINER ? execFileSync('docker', ['--host=unix:///var/run/docker.sock', 'exec', process.env.CSSV_TEST_PHP_CONTAINER, 'php', ...args], { cwd: root, env, encoding: 'utf8' }).trim() : execFileSync('php', args, { cwd: root, env, encoding: 'utf8' }).trim()
const email = `reasoning-browser-${Date.now()}@example.invalid`, id = php('tests/current-affairs/setup.php', 'user', email)
const units = JSON.parse(readFileSync(root + '/public/api/_premium_files/general-ability-course.json')).units.filter(u => u.stage === 'Logical reasoning')
const browser = await chromium.launch({ executablePath: process.env.CSSV_BROWSER_EXECUTABLE || chromium.executablePath(), args: ['--no-sandbox'] })
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 1000 }, reducedMotion: 'reduce' }), page = await context.newPage(), errors = []
page.on('pageerror', e => errors.push(e.message))
try {
  await page.goto(base + '/account'); await page.getByLabel('Email address', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill('TEST ONLY native fixture password'); const reply=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/login.php'&&r.request().method()==='POST');await page.getByRole('button', { name: 'Sign in securely', exact: true }).click();const login=await reply;assert.equal(login.status(),200,'Native browser sign-in failed: '+(await login.json().catch(()=>({}))).error); await page.waitForURL('**/account/dashboard')
  await page.goto(base + '/account/general-ability'); await page.getByText('An active Pro membership is required.', { exact: false }).waitFor()
  php('tests/precis/fixture.php', 'activate', id)
  await page.reload(); await page.getByText('75 guided lessons', { exact: true }).waitFor(); await page.getByText('25 topic quizzes', { exact: true }).waitFor()
  for (const unit of units) {
    const lesson = unit.lessons[0]
    await page.goto(base + '/account/general-ability?unit=' + unit.id + '&lesson=' + lesson.id)
    await page.getByRole('heading', { name: unit.title, exact: true }).waitFor()
    const answer = page.getByRole('combobox', { name: /^Your answer/ })
    await answer.selectOption(String((lesson.exercise.answer + 1) % 4)); await page.getByRole('button', { name: /^Check & save answer/ }).click(); await page.getByText(/^Review this step [—-] attempt saved$/).waitFor()
    await answer.selectOption(String(lesson.exercise.answer)); await page.getByRole('button', { name: /^Check & save answer/ }).click(); await page.getByText(/^Correct [—-] exercise saved$/).waitFor()
    await page.reload(); await page.getByText('View your last saved exercise feedback',{exact:true}).click();await page.getByText(/^Correct [—-] exercise saved$/).waitFor()
    for (const width of [320, 390, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 1000 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow') }
  }
  await page.setViewportSize({ width: 390, height: 1000 }); mkdirSync(root + '/test-artifacts', { recursive: true }); await page.screenshot({ path: root + '/test-artifacts/reasoning-mobile.png', fullPage: true })
  php('tests/pro/fixture.php', 'expire', id); await page.reload(); await page.getByText('Renew your membership to continue.', { exact: false }).waitFor(); assert.equal(await page.getByRole('button', { name: /^Check & save answer/ }).count(), 0)
  assert.deepEqual(errors, [])
  console.log('PASS built reasoning browser: free/Pro/expired guards, four real lessons, wrong/correct stored choices, refresh recovery, 320–1440 widths and no console exceptions')
} catch (error) { console.log('Browser failed at',new URL(page.url()).pathname+' unit='+new URL(page.url()).searchParams.get('unit'),'alerts:',await page.getByRole('alert').allTextContents(),'statuses:',await page.getByRole('status').allTextContents(),'form:',await page.locator('form').evaluateAll(forms=>forms.map(f=>({valid:f.checkValidity(),select:f.querySelector('select')?.value,button:f.querySelector('button')?.disabled,type:f.querySelector('button')?.type}))));mkdirSync(root+'/test-artifacts',{recursive:true});await page.screenshot({path:root+'/test-artifacts/reasoning-failure.png',fullPage:true});throw error } finally { await browser.close() }
