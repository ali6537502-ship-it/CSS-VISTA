import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { JSDOM } from 'jsdom'
const core=fs.readFileSync('public/gsa-tutor/learning-core.js','utf8')
const renderer=fs.readFileSync('public/gsa-tutor/math-renderer.js','utf8')
const chapters=Array.from({length:28},(_,i)=>JSON.parse(fs.readFileSync(`public/gsa-tutor/content/chapter-${String(i+1).padStart(2,'0')}.json`)))
function api(){const dom=new JSDOM('',{runScripts:'outside-only'});dom.window.eval(core);return {dom,learn:dom.window.CSSVistaGSALearning}}
test('diagnostic uses all five science domains with unique, frozen source questions',()=>{
 const {dom,learn}=api(),a=learn.create(chapters,{mode:'diagnostic',seed:4,at:0});
 assert.equal(a.questions.length,20);assert.equal(new Set(a.questions.map(q=>q.id)).size,20);
 for(const d of learn.domains)assert.equal(a.questions.filter(q=>q.domain===d).length,4);
 const old=chapters[0].questions[0].answer;a.questions.find(q=>q.chapter===1)&&(a.questions.find(q=>q.chapter===1).answer='X');
 assert.equal(chapters[0].questions[0].answer,old);assert.equal(learn.result(a).mastery,'not-established');dom.window.close();
});
test('cumulative scope and timed deadline survive serialization and expire while away',()=>{
 const {dom,learn}=api();const a=learn.create(chapters,{mode:'cumulative',chapterIds:[6],seed:3,at:1000});
 assert.equal(a.questions.length,1);assert.ok(a.questions.every(q=>q.chapter===6));
 assert.throws(()=>learn.create(chapters,{mode:'cumulative',chapterIds:[]}),/Select/);
 const t=JSON.parse(JSON.stringify(learn.create(chapters,{mode:'timed',seed:3,at:1000})));
 assert.equal(learn.expired(t,1800999),false);assert.equal(learn.expired(t,1801000),true);dom.window.close();
});
test('planning accounts for knowledge, difficult chapters and real completed page-time records',()=>{
 const {dom,learn}=api(),lesson={id:'example',chapter:6,words:600};
 const base=learn.estimate(lesson,{},{});
 assert.ok(learn.estimate(lesson,{startingLevel:'beginner',difficultChapters:[6]},{} )>base);
 assert.ok(learn.estimate(lesson,{previouslyStudied:[6]},{} )<base);
 assert.equal(learn.estimate(lesson,{}, {studySessions:{one:{lessonId:'example',activeSeconds:1800,completed:true}}}),30);
 assert.equal(learn.estimate(lesson,{}, {studySessions:{one:{lessonId:'example',activeSeconds:1800,completed:false}}}),base);
 dom.window.close();
});
test('typesetter preserves percent signs and creates native accessible MathML',()=>{
 const dom=new JSDOM('<!doctype html><div id="math">$P=E/t$ and $$RH=\\frac{e}{e_s(T)}\\times100%.$$</div>',{runScripts:'outside-only'});
 dom.window.eval(renderer);const el=dom.window.document.getElementById('math');dom.window.CSSVistaGSAMath.render(el);
 assert.equal(el.querySelectorAll('math').length,2);assert.match(el.textContent,/%/);assert.equal(el.querySelector('[data-math-warning]'),null);
 assert.ok(el.querySelector('annotation[encoding="application/x-tex"]'));dom.window.close();
});
test('unsupported expressions retain original source with an explicit warning',()=>{
 const dom=new JSDOM('<!doctype html><div id="math">$\\notARealMacro{x}$</div>',{runScripts:'outside-only'});dom.window.eval(renderer);
 const el=dom.window.document.getElementById('math');dom.window.CSSVistaGSAMath.render(el);
 assert.match(el.textContent,/notARealMacro/);assert.ok(el.querySelector('[data-math-warning]'));dom.window.close();
});

test('science mock is 20 objective plus 40 written marks and never invents a written score',()=>{
 const {dom,learn}=api(),paper=JSON.parse(fs.readFileSync('content/gsa-tutor/past-paper-links.json','utf8'));
 const options={mode:'science-mock',seed:2,at:1000,writtenGroups:[2,5],durationMinutes:90,paperQuestions:paper.questions,paperSources:[paper.source]};
 const a=learn.create(chapters,options);
 assert.equal(a.questions.length,20);assert.equal(a.writtenQuestions.length,8);assert.equal(a.blueprint.totalMarks,60);
 assert.ok(a.writtenQuestions.every(q=>/^[25]\([a-d]\)$/.test(q.questionNumber)));
 assert.equal(Date.parse(a.deadline),1000+90*60000);assert.equal(a.paperSources[0].sha256,paper.source.sha256);
 a.writtenResponses[a.writtenQuestions[0].id]={at:new Date(2000).toISOString(),text:'A retained response'};
 const r=learn.result(a);assert.equal(r.writtenAnswered,1);assert.equal(r.writtenMarks,40);assert.equal(r.writtenScore,null);
 assert.throws(()=>learn.create(chapters,{...options,writtenGroups:[2,6]}),/exactly two/);
 assert.throws(()=>learn.create(chapters,{...options,paperSources:[]}),/provenance/);
 dom.window.close();
});
test('practice workload follows chapters and uses actual practice histories, not reading confidence',()=>{
 const {dom,learn}=api(),catalog=JSON.parse(fs.readFileSync('public/gsa-tutor/content/catalog.json','utf8'));
 const queue=learn.activities(catalog,{completed:{'c6-s6-1':{selfRating:'gotit'}}});
 assert.equal(queue.filter(x=>x.kind==='lesson').length,141);
 assert.equal(queue.filter(x=>x.type==='chapter').length,28);
 assert.equal(queue.find(x=>x.id==='science-mock').minutes,60);
 const firstPractice=queue.findIndex(x=>x.id==='chapter-practice-1');
 assert.ok(queue[firstPractice-1].lesson.id.startsWith('c1-'));assert.ok(queue[firstPractice+1].lesson.id.startsWith('c2-'));
 assert.equal(queue.find(x=>x.id==='chapter-practice-6').done,false);
 const done=learn.activities(catalog,{quizAttempts:{one:{chapter:6,finishedAt:'2026-11-12',responses:{'D20-Q20':{correct:false}}}}});
 assert.equal(done.find(x=>x.id==='chapter-practice-6').done,true,'Practice completion does not certify key correctness or mastery');dom.window.close();
});

test('all authored units render eight stages while escaping text and retaining original review status',()=>{
 const dom=new JSDOM('<!doctype html>',{runScripts:'outside-only'});dom.window.eval(fs.readFileSync('public/gsa-tutor/teaching-unit.js','utf8'));
 const api=dom.window.CSSVistaGSATeaching;
 const files=fs.readdirSync('content/gsa-tutor/draft-units').filter(x=>x.endsWith('.json'));
 assert.ok(files.length>=16);
 for(const file of files){
  const unit=JSON.parse(fs.readFileSync('content/gsa-tutor/draft-units/'+file));
  for(let stage=0;stage<8;stage++){const html=api.render(unit,{stage});assert.match(html,/Editorial draft/);assert.ok(html.length>500)}
  assert.equal(unit.status,'draft-pending-independent-review');
 }
 const unit=JSON.parse(fs.readFileSync('content/gsa-tutor/draft-units/c6-s6-1.json'));unit.title='<img src=x onerror=alert(1)>';
 assert.ok(!api.render(unit).includes('<img'));assert.throws(()=>api.validate(unit,'different-lesson'),/another lesson/);dom.window.close();
});

test('short daily budgets split chapter practice and schedule every available written model',()=>{
 const {dom,learn}=api(),catalog=JSON.parse(fs.readFileSync('public/gsa-tutor/content/catalog.json','utf8'));
 const queue=learn.activities(catalog,{plan:{dailyMinutes:15}});
 assert.equal(queue.filter(t=>t.type==='writing').length,31);
 assert.ok(queue.filter(t=>t.type==='chapter').every(t=>t.minutes<=15));
 const water=queue.filter(t=>t.type==='chapter'&&t.chapter===17);
 assert.ok(water.length>1);assert.equal(new Set(water.flatMap(t=>t.questionIds)).size,36);
 dom.window.close();
});
