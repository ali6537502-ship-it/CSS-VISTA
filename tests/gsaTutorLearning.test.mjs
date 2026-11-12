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
