import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pmsVistaSubjects } from '../src/data/pmsVistaPublic.generated.mjs'
import { pmsVistaSubjectMeta } from '../src/data/pmsVistaMeta.mjs'
import { CANONICAL_ORIGIN, findRouteDefinition } from '../src/data/routeRegistry.mjs'

const source = JSON.parse(readFileSync('public/pms-punjab/vista-syllabus.json','utf8'))
type Topic = { title:string; detail?:string; children?:Topic[] }
type Subject = { id:string; title:string; designation:string; marks:number|null; sections:Array<{title:string;detail?:string;topics:Topic[]}>; readings:string[];notes:string[] }
const publicSubjects = pmsVistaSubjects as Subject[]
const coreSubjects = source.subjects as Subject[]

function content(node:Topic):unknown {
  return {
    title:node.title,
    detail:node.detail && node.detail!==node.title ? node.detail : undefined,
    children:node.children?.length ? node.children.map(content) : undefined,
  }
}
function countLeaves(node:Topic):number {
  return node.children?.length ? node.children.reduce((a,b)=>a+countLeaves(b),0) : 1
}

test('all public PMS syllabi exactly match the uploaded source and do not invent chapters or readings',()=>{
  assert.equal(publicSubjects.length,40)
  assert.equal(pmsVistaSubjectMeta.length,40)
  assert.equal(new Set(publicSubjects.map(s=>s.id)).size,40)
  assert.equal(publicSubjects.filter(s=>s.designation==='compulsory').length,10)
  assert.equal(publicSubjects.filter(s=>s.designation==='optional').length,30)
  for(let i=0;i<coreSubjects.length;i++){
    const original=coreSubjects[i],shown=publicSubjects[i],meta=pmsVistaSubjectMeta[i]
    assert.deepEqual([shown.id,shown.title,shown.designation,shown.marks],
      [original.id,original.title,original.designation,original.marks])
    assert.deepEqual([meta.id,meta.title,meta.designation],
      [original.id,original.title,original.designation])
    assert.deepEqual(shown.readings,original.readings)
    assert.deepEqual(shown.notes,original.notes)
    assert.equal(shown.sections.length,original.sections.length,original.title)
    for(let j=0;j<original.sections.length;j++){
      const a=original.sections[j],b=shown.sections[j]
      assert.equal(a.title,b.title)
      assert.equal(a.detail||undefined,b.detail||undefined)
      assert.deepEqual(b.topics.map(content),a.topics.map(content))
    }
  }
  assert.equal(publicSubjects.reduce((n,s)=>n+s.sections.length,0),179)
  assert.equal(publicSubjects.reduce((n,s)=>n+s.sections.reduce((a,z)=>a+z.topics.reduce((x,y)=>x+countLeaves(y),0),0),0),1414)
})

test('PMS Vista hub and forty individual subject routes can be indexed; personal records stay noindex',()=>{
  const hub=findRouteDefinition('/pms-vista')
  assert.equal(hub?.indexable,true)
  assert.equal(hub?.sitemap,true)
  assert.equal(hub?.access,'public')
  assert.equal(hub?.robots,'index, follow')
  assert.match(hub?.title||'',/PMS Vista/)
  assert.match(hub?.description||'',/Free PMS preparation/i)
  assert.equal(CANONICAL_ORIGIN,'https://www.css-vista.com')
  for(const s of publicSubjects){
    const route=findRouteDefinition('/pms-vista/syllabus/'+s.id)
    assert.ok(route,s.id)
    assert.equal(route.indexable,true,s.id)
    assert.equal(route.sitemap,true,s.id)
    assert.equal(route.access,'public',s.id)
    assert.match(route.title,/Syllabus/,s.id)
  }
  const planner=findRouteDefinition('/account/tasks')
  assert.equal(planner?.indexable,false)
  assert.equal(planner?.sitemap,false)
})

test('homepage, navigation and prerender use the same public PMS Vista destination',()=>{
  const home=readFileSync('src/pages/Home.tsx','utf8')
  const menu=readFileSync('src/components/Layout.tsx','utf8')
  const cards=readFileSync('src/data/homeCards.ts','utf8')
  const app=readFileSync('src/App.tsx','utf8')
  const prerender=readFileSync('scripts/prerender/routes.tsx','utf8')
  assert.match(home,/Free Punjab PMS preparation/)
  assert.match(home,/<Link to="\/pms-vista"/)
  assert.match(menu,/PMS Vista — Free PMS Preparation/)
  assert.match(cards,/id: 'pms-vista'/)
  assert.match(app,/path="\/pms-vista"/)
  assert.match(app,/path="\/pms-vista\/syllabus\/:subject"/)
  assert.match(prerender,/page\('\/pms-vista'/)
  assert.match(prerender,/pmsVistaSubjectMeta\.map/)
})

test('the source-backed Mental Ability guidebook has a public, crawlable route without modifying the 40 original PDFs',()=>{
  const url='/pms-vista/syllabus/compulsory-mental-ability-and-reasoning-test'
  const route=findRouteDefinition(url)
  assert.equal(route?.indexable,true)
  assert.equal(route?.sitemap,true)
  assert.match(route?.title||'',/Mental Ability/)
  assert.match(readFileSync('src/pages/PmsVista.tsx','utf8'),/pmsMentalAbilitySubject/)
  assert.match(readFileSync('src/pages/PmsVistaSubject.tsx','utf8'),/Open PPSC original Mental Ability guidebook/)
  assert.match(readFileSync('scripts/prerender/routes.tsx','utf8'),/compulsory-mental-ability-and-reasoning-test/)
})
