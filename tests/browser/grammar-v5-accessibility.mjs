import {chromium} from './node_modules/playwright-core/index.mjs'
import {isolateNetwork} from './isolated-network.mjs'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import assert from 'node:assert/strict'
const base=process.env.CSSV_GRAMMAR_ORIGIN??'http://localhost:5173',catalog=JSON.parse(readFileSync('public/grammar/v5/index.json','utf8'))
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE??'/usr/bin/chromium',args:['--no-sandbox']})
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:900}});await isolateNetwork(context,base)
const page=await context.newPage(),results=[]
try{
 for(const path of ['/grammar-course','/grammar-course?day=24&section=gv5-d24-m02','/grammar-course?day=1&section=questions','/grammar-course?day=20&section=writing','/grammar-course?view=profile','/grammar-course?view=reference&guide=glossary']){
  await page.goto(base+path,{waitUntil:'domcontentloaded'});await page.locator('#grammar-workspace').waitFor()
  await page.addScriptTag({path:'tests/browser/node_modules/axe-core/axe.min.js'})
  const report=await page.evaluate(()=>window.axe.run(document.querySelector('.grammar-v5'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}))
  results.push({path,violations:report.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))})
 }
 // Exercise the actual native disclosure and keyboard focus, not only DOM rules.
 await page.goto(base+'/grammar-course?day=1&section=gv5-d01-m01',{waitUntil:'domcontentloaded'});const summary=page.getByText('Expert ExtensionOptional deeper study',{exact:true});await summary.waitFor();await summary.focus();await page.keyboard.press('Enter');assert(await summary.evaluate(el=>el.parentElement.open))
 await page.keyboard.press('Tab');const focused=await page.evaluate(()=>({tag:document.activeElement.tagName,outline:getComputedStyle(document.activeElement).outlineStyle}));assert.notEqual(focused.outline,'none','Keyboard focus must remain visible')
 assert(results.every(r=>!r.violations.length),JSON.stringify(results))
 mkdirSync('test-artifacts',{recursive:true});writeFileSync('test-artifacts/grammar-v5-accessibility.json',JSON.stringify({contentHash:catalog.contentHash,passed:true,scope:'Automated course-component WCAG 2.2 AA checks in six representative views, plus keyboard disclosure/focus. This is not a full-site certification or a substitute for assistive-technology user testing.',results,keyboard:focused},null,2));console.log('PASS: six grammar accessibility views, keyboard disclosure and visible focus.')
}finally{await browser.close()}
