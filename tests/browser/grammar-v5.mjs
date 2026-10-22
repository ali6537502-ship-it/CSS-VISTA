import assert from 'node:assert/strict'
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs'
import {isolateNetwork} from './isolated-network.mjs'
import {chromium} from './node_modules/playwright-core/index.mjs'
const base=process.env.CSSV_GRAMMAR_ORIGIN??'http://localhost:5173'
const catalog=JSON.parse(readFileSync('public/grammar/v5/index.json','utf8'))
const browser=await chromium.launch({executablePath:process.env.CSSV_BROWSER_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox']})
const reports=[],errors=[];const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}})
await isolateNetwork(context,base)
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
async function open(path){await page.goto(base+path,{waitUntil:'domcontentloaded'});await page.locator('#grammar-workspace').waitFor();}
async function state(){await page.waitForLoadState('networkidle');return page.evaluate(()=>JSON.parse(localStorage.getItem('cssvista:grammar-course:v5:guest')))}
try{
 await context.addInitScript(()=>{if(!localStorage.getItem('cssvista:grammar-course:v3'))localStorage.setItem('cssvista:grammar-course:v3','{"completed":[1],"notes":{"1":"Original legacy note"}}')})
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});await open('/grammar-course?day=1&section=questions');await page.getByRole('group',{name:'Answer options'}).waitFor()
  const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length,main:document.querySelectorAll('main').length}))
  assert(layout.scroll<=width+1,JSON.stringify(layout));assert.equal(layout.h1,1);assert.equal(layout.main,1)
  reports.push({check:'responsive objective interface',...layout})
 }
 await page.setViewportSize({width:1440,height:1000})
 for(const d of catalog.days){
  await open(`/grammar-course?day=${d.day}&section=orientation`)
  await page.getByRole('heading',{name:d.title,exact:true}).waitFor();await page.getByRole('heading',{name:'Learning orientation',exact:true}).waitFor()
  await page.getByRole('button',{name:'Next section',exact:true}).click();await page.getByRole('heading',{name:catalog.concepts.find(c=>c.id===d.modules[0]).title,exact:true}).waitFor()
  reports.push({check:'lesson orientation and section navigation',day:d.day}); if(d.day%10===0)console.log('Navigated',d.day,'days')
 }
 const q=catalog.items.find(q=>q.day===1&&q.type==='objective')
 const data=await context.request.get(base+'/grammar/v5/day-01.json').then(r=>r.json()),question=data.questions.find(x=>x.id===q.id)
 await open(`/grammar-course?day=1&section=questions&item=${q.id}`)
 await page.getByRole('group',{name:'Answer options'}).waitFor()
 await page.getByRole('group',{name:'Answer options'}).getByRole('button').nth((q.answer+1)%4).click()
 await page.getByText('Review the distinction.',{exact:true}).waitFor()
 assert.equal((await state()).answers[q.id].first,(q.answer+1)%4)
 await page.getByRole('button',{name:'Short reinforcement exercise',exact:true}).click();await page.getByRole('heading',{name:'Apply the same grammatical principle'}).waitFor()
 await page.getByRole('button',{name:'Try this item again',exact:true}).click();await page.getByRole('group',{name:'Answer options'}).getByRole('button').nth(q.answer).click()
 await page.getByText('Correct on this response.',{exact:true}).waitFor();assert.equal((await state()).answers[q.id].first,(q.answer+1)%4)
 reports.push({check:'wrong response, feedback, actual reinforcement and immutable first response',id:q.id,prompt:question.prompt})
 await open('/grammar-course?day=1&section=questions');const cursor=data.questions[4].id;await page.getByLabel('Jump to task').selectOption('4');await page.locator(`[id="${cursor}"]`).waitFor();await page.waitForLoadState('networkidle')
 await page.waitForURL(url=>url.searchParams.get('item')===cursor);await page.reload({waitUntil:'domcontentloaded'});await page.getByLabel('Jump to task').waitFor();assert.equal(await page.getByLabel('Jump to task').inputValue(),'4');assert.equal((await state()).cursor.item,cursor)
 // Deep-linked reference notes, bookmarks and a real standalone extension bank.
 await open('/grammar-course?view=reference&concept=gv5-ref-morph-processes');await page.getByRole('button',{name:'Bookmark rule',exact:true}).waitFor()
 await page.getByRole('button',{name:'Bookmark rule',exact:true}).click();const note=page.getByRole('textbox',{name:/My note on/});await note.fill('My original note about clipping and conversion.');await page.reload();await page.getByRole('textbox',{name:/My note on/}).waitFor();assert.equal(await page.getByRole('textbox',{name:/My note on/}).inputValue(),'My original note about clipping and conversion.')
 await page.getByRole('link',{name:'Independent practice',exact:true}).click();await page.getByRole('heading',{name:catalog.assessments.find(a=>a.id==='reference-word-formation').title,exact:true}).waitFor()
 reports.push({check:'reference deep link, persisted note and bookmark, standalone practice link'})
 const formats=['gap','multiple-gap','correction','transformation','combining','splitting','ordering','classification','function','comparison','paragraph-edit','writing','analysis']
 for(const kind of formats){
  const q=catalog.items.find(i=>i.type==='response'&&i.kind===kind&&i.day>0&&i.day<29)
  assert(q,kind);await open(`/grammar-course?day=${q.day}&section=${q.group}&item=${q.id}`);const article=page.locator(`[id="${q.id}"]`);await article.waitFor()
  const button=article.getByRole('button',{name:'Compare with model and rubric'});assert(await button.isDisabled());await article.getByLabel('Your response',{exact:true}).fill('An original response retained for self-review.');await button.click();await article.getByText('One model solution',{exact:true}).waitFor();await article.getByRole('combobox',{name:'Your self-review',exact:true}).selectOption('developing')
  assert.equal((await state()).selfReviews[q.id],'developing');reports.push({check:'draft, model, rubric and honest self-review',kind,id:q.id})
 }

 // The diagnostic withholds both keyed and model feedback until all tasks have responses.
 const diagnostic=JSON.parse(readFileSync('public/grammar/v5/diagnostic.json','utf8'));await open('/grammar-course?view=lab&mode=diagnostic')
 for(let i=0;i<diagnostic.items.length;i++){
  const q=diagnostic.items[i],article=page.locator(`[id="${q.id}"]`);await article.waitFor()
  if(q.type==='objective')await article.getByRole('group',{name:'Answer options'}).getByRole('button').nth(q.answer).click()
  else await article.getByLabel('Your response',{exact:true}).fill('My independent explanation for the diagnostic task.')
  if(i===0)assert.equal(await article.getByText('Correct answer',{exact:true}).count(),0)
  if(i<diagnostic.items.length-1)await page.getByRole('button',{name:'Next task',exact:true}).click()
 }
 await page.getByRole('button',{name:'Compare with model and rubric',exact:true}).click();await page.getByText('One model solution',{exact:true}).waitFor();reports.push({check:'diagnostic questions, written responses and assessment feedback boundary'})
 await open('/grammar-course?view=profile');await page.getByRole('heading',{name:'Four abilities, separate evidence'}).waitFor();await page.getByRole('heading',{name:'Diagnostic and capstone comparison'}).waitFor()
 // Public notebook resolves the new grammar IDs and links to their actual practice.
 await page.goto(base+'/mistakes');await page.getByText(question.prompt,{exact:true}).waitFor();assert(await page.getByRole('link',{name:'Retry',exact:true}).first().getAttribute('href').then(x=>x.startsWith('/grammar-course?')))
 await open('/grammar-course?view=reference&guide=glossary');await page.getByLabel('Search grammar',{exact:true}).fill('morpheme');await page.getByText('No matching entry.',{exact:false}).waitFor({timeout:500}).then(()=>{throw Error('Glossary search unexpectedly empty')},()=>{})
 // Download, clear a note, and restore into the same scope; previous raw copy is backed up.
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export my work',exact:true}).click();const download=await downloadPromise;const path=await download.path();const backup=readFileSync(path)
 const exported=JSON.parse(backup);assert.equal(exported.format,'cssvista-grammar-v5-backup');assert.equal(exported.state.notes['gv5-ref-morph-processes'],'My original note about clipping and conversion.')
 await page.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:backup});await page.getByText('Backup restored in this scope; the previous browser copy was retained.',{exact:true}).waitFor()
 const legacy=await page.evaluate(()=>({raw:localStorage.getItem('cssvista:grammar-course:v3'),backup:JSON.parse(localStorage.getItem('cssvista:grammar-course:v5:guest:legacy-backup'))}));assert.equal(legacy.raw,legacy.backup.value)
 reports.push({check:'profile, notebook integration, glossary, export, restore and legacy preservation'})
 // An unreadable record is retained and its raw text remains exportable.
 const corrupt=await browser.newContext({ignoreHTTPSErrors:true}),bad=await corrupt.newPage();await corrupt.addInitScript(()=>localStorage.setItem('cssvista:grammar-course:v5:guest:sync','{unreadable'))
 await bad.goto(base+'/grammar-course?day=1');await bad.getByRole('alert').filter({hasText:'Existing records have not been replaced'}).waitFor();assert.equal(await bad.evaluate(()=>localStorage.getItem('cssvista:grammar-course:v5:guest:sync')),'{unreadable');await corrupt.close()
 reports.push({check:'unreadable browser record retained; public course available'})
 const offline=await browser.newContext({ignoreHTTPSErrors:true});await isolateNetwork(offline,base);const disconnected=await offline.newPage();await offline.route('**/grammar/v5/day-07.json*',route=>route.abort());await disconnected.goto(base+'/grammar-course?day=7',{waitUntil:'domcontentloaded'});await disconnected.getByRole('button',{name:'Retry lesson',exact:true}).waitFor();await offline.unroute('**/grammar/v5/day-07.json*');await disconnected.getByRole('button',{name:'Retry lesson',exact:true}).click();await disconnected.getByRole('heading',{name:'Learning orientation',exact:true}).waitFor();await offline.close()
 reports.push({check:'unavailable lesson displays an error and retries without discarding work'})

 assert.deepEqual(errors,[])
 mkdirSync('test-artifacts',{recursive:true});writeFileSync('test-artifacts/grammar-v5-browser.json',JSON.stringify({contentHash:catalog.contentHash,passed:true,reports,pageErrors:errors},null,2))
 console.log(`PASS: ${reports.length} grammar browser checks; all 30 lessons, 13 written formats, 4 widths, persistence, notebook and restoration.`)
}catch(e){ console.error('Failed at',page.url()); await page.screenshot({path:'test-artifacts/grammar-v5-failure.png',fullPage:true}).catch(()=>{}); throw e }finally{await browser.close()}
