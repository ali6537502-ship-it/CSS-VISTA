import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
import { startArtifactPreview } from './artifact-preview.mjs'

const root = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const { server, origin } = await startArtifactPreview(resolve(root, 'dist'))
const browser = await chromium.launch({
  executablePath: process.env.CSSV_BROWSER_EXECUTABLE || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
})
const mockSummary = {ok:true,target:100000000,trees:0,seeds:0,contributors:0,cities:0,pending_reports:0,survival_checks:0,city_totals:[],leaderboard:[],public_gallery:[]}
const mockSpecies = {ok:true,species:{neem:{name:'Neem',scientific:'Azadirachta indica',category:'shade'},jamun:{name:'Jamun',scientific:'Syzygium cumini',category:'fruit'}}}
const errors = []
const createContext = async viewport => {
  const context=await browser.newContext({viewport})
  let member=null
  await context.route('**/*',route=>{
    const url=new URL(route.request().url())
    if(url.origin!==origin)return route.abort('blockedbyclient')
    if(url.pathname==='/api/admin-auth/session.php')return route.fulfill({status:401,json:{ok:false}})
    if(url.pathname==='/api/trees/index.php'){
      const action=url.searchParams.get('action')
      const respond=json=>route.fulfill({status:200,json})
      if(action==='summary')return respond(mockSummary)
      if(action==='catalog')return respond(mockSpecies)
      if(action==='session')return respond({ok:true,member,csrf_token:member?'browser-test-csrf':null})
      if(action==='mine')return respond({ok:true,member,reports:[],followups:[]})
      if(action==='request-email-reset')return respond({ok:true,message:'If a confirmed campaign account uses this email and mail delivery is available, a reset link will arrive shortly.'})
      if(action==='confirm-email'){if(member)member={...member,email_verified:true};return respond({ok:true,message:'Email address confirmed.'})}
      if(action==='reset-email-password')return respond({ok:true,message:'Password reset.',recovery_key:'TREE-'+'B'.repeat(48)})
      if(action==='register'){
        member={id:'11111111-2222-4333-8444-555555555555',name:'Browser Test Volunteer',email:'browser@example.invalid',email_verified:false,city:'Multan',has_photo:false,public_name:false,joined_at:'2026-11-06'}
        return respond({ok:true,member,csrf_token:'browser-test-csrf',recovery_key:'TREE-'+'A'.repeat(48)})
      }
      return route.fulfill({status:400,json:{ok:false,message:'Not implemented in visual test fixture'}})
    }
    return route.continue()
  })
  return context
}
try {
  const desktop=await createContext({width:1366,height:900})
  const first=await desktop.newPage()
  first.on('pageerror',e=>errors.push(e.message))
  await first.goto(origin+'/100-million-trees')
  await first.getByRole('heading',{name:/100 million trees/i}).waitFor()
  const brandImages=await first.locator('.trees-sitebar .trees-brand img').evaluateAll(images=>images.map(img=>img.getAttribute('alt')))
  assert.deepEqual(brandImages,['Isarul Ibaad Foundation emblem','CSS Vista'])
  await first.getByRole('button',{name:'Leaderboard',exact:true}).click()
  await first.getByRole('heading',{name:'Community leaderboard'}).waitFor()
  assert.equal(await first.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+2),true,'Desktop campaign fits viewport')
  await desktop.close()

  const mobile=await createContext({width:390,height:844})
  const page=await mobile.newPage()
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(origin+'/100-million-trees')
  await page.getByRole('button',{name:'I want to contribute'}).click()
  await page.getByRole('button',{name:'Create my campaign account'}).click()
  await page.getByRole('heading',{name:'Join the movement'}).waitFor()
  assert.equal(await page.locator('input[autocomplete="one-time-code"]').count(),0,'No OTP input is present')
  await page.getByPlaceholder('Your full name').fill('Browser Test Volunteer')
  await page.getByPlaceholder('Your email for password recovery').fill('browser@example.invalid')
  await page.getByRole('combobox',{name:'Your city or town in Punjab'}).selectOption('Multan')
  await page.getByPlaceholder('13 digits, used only to prevent duplicates').fill('1111100000001')
  await page.getByPlaceholder('03XX-XXXXXXX').fill('03000001010')
  await page.getByPlaceholder('At least 12 characters').fill('Browser-Test-Passphrase-2026')
  await page.getByRole('checkbox').first().check()
  await page.getByRole('button',{name:'Create my campaign account'}).click()
  await page.getByText('Save your private recovery key now').waitFor()
  await page.getByRole('button',{name:'Toggle campaign navigation'}).click()
  await page.getByRole('button',{name:'Plant & report'}).click()
  await page.getByRole('heading',{name:'Confirm your email to begin planting.'}).waitFor()
  // Registration succeeds without any portrait; the email link unlocks planting.
  const verifiedPage=await mobile.newPage()
  verifiedPage.on('pageerror',e=>errors.push(e.message))
  await verifiedPage.goto(origin+'/100-million-trees#verify-email='+'d'.repeat(64))
  await verifiedPage.getByText('Email address confirmed. You can now reset your password by email.').waitFor()
  assert.equal(new URL(verifiedPage.url()).hash,'','Verification link must be cleared from browser history')
  await verifiedPage.getByRole('button',{name:'Toggle campaign navigation'}).click()
  await verifiedPage.getByRole('button',{name:'Plant & report'}).click()
  await verifiedPage.getByRole('heading',{name:'What did you plant?'}).waitFor()
  assert.ok(await verifiedPage.getByRole('button',{name:/Neem/}).count()>0,'Botanical catalog renders without an avatar')
  await verifiedPage.getByRole('button',{name:/Seed sown/}).click()
  await verifiedPage.getByRole('button',{name:/Neem/}).click()
  assert.equal(await verifiedPage.getByRole('button',{name:/Neem/}).getAttribute('aria-pressed'),'true')
  assert.equal(await verifiedPage.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+2),true,'Mobile campaign has no horizontal overflow')
  await mobile.close()
  const resetContext=await createContext({width:390,height:844})
  const resetPage=await resetContext.newPage()
  resetPage.on('pageerror',e=>errors.push(e.message))
  const oneTimeToken='b'.repeat(64)
  await resetPage.goto(origin+'/100-million-trees#reset-email='+oneTimeToken)
  await resetPage.getByRole('heading',{name:'Choose a new password'}).waitFor()
  assert.equal(new URL(resetPage.url()).hash,'','Email reset token is removed from the URL immediately')
  await resetPage.getByLabel('New password',{exact:true}).fill('Browser-Email-Reset-Password-2026')
  await resetPage.getByLabel('Repeat new password',{exact:true}).fill('Browser-Email-Reset-Password-2026')
  await resetPage.getByRole('button',{name:'Set a new password'}).click()
  await resetPage.getByText('Save your private recovery key now').waitFor()
  await resetContext.close()

  const verifyContext=await createContext({width:1366,height:900})
  const verifyPage=await verifyContext.newPage()
  verifyPage.on('pageerror',e=>errors.push(e.message))
  await verifyPage.goto(origin+'/100-million-trees#verify-email='+'c'.repeat(64))
  await verifyPage.getByRole('heading',{name:'Welcome back'}).waitFor()
  assert.equal(new URL(verifyPage.url()).hash,'','Email verification token never remains in history')
  await verifyContext.close()
  assert.deepEqual(errors,[],'No client-side JavaScript errors')
  console.log('PASS Punjab Trees: desktop, 390px mobile, partner order, account UX, no OTP, catalog, responsive width')
} finally {
  await browser.close()
  server.closeAllConnections()
  await new Promise(resolve=>server.close(resolve))
}
