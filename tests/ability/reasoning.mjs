import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const course=JSON.parse(readFileSync(new URL('../../public/api/_premium_files/general-ability-course.json',import.meta.url)))
// Independent rule evaluation; this does not import the Python answer generator.
function truth(text,world){
 const [left,right]=text.split('->'),atom=s=>s.startsWith('!')?!world[s.slice(1)]:world[s]
 return right===undefined?atom(left):!atom(left)||atom(right)
}
const worlds=[{P:false,Q:false},{P:false,Q:true},{P:true,Q:false},{P:true,Q:true}]
function candidates(q){const p=q.proof
 if(p.type==='logic')return p.formulas.map(f=>{const rule=f.startsWith('rule:'),formula=f.replace(/^rule:/,'');const allowed=worlds.filter(w=>p.given.filter(g=>!rule||g.includes('->')).every(g=>truth(g,w)));assert.ok(allowed.length);const entailed=allowed.every(w=>truth(formula,w));return p.task==='not_entailed'?!entailed:entailed})
 if(p.type==='order')return q.options.map(s=>s.length===p.people.length&&new Set(s).size===p.people.length&&[...p.people].every(c=>s.includes(c))&&(p.before||[]).every(([a,b])=>s.indexOf(a)<s.indexOf(b))&&(p.adjacent||[]).every(([a,b])=>Math.abs(s.indexOf(a)-s.indexOf(b))===1)&&(p.fixed||[]).every(([i,c])=>s[i]===c))
 if(p.type==='shift')return q.options.map(s=>s===[...p.word].map(c=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(c)+p.shift+26)%26]).join(''))
 if(p.type==='classify')return q.options.map(s=>{const n=Number(s);switch(p.property){case 'even':return n%2!==0;case 'multiple3':return n%3!==0;case 'prime':return n<2||Array.from({length:n-2},(_,i)=>i+2).some(d=>n%d===0);case 'square':return !Number.isInteger(Math.sqrt(n));case 'cube':return !Number.isInteger(Math.round(Math.cbrt(n)))||Math.round(Math.cbrt(n))**3!==n;default:throw Error('Unknown property')}})
 throw Error('Unknown formal proof')
}
const units=course.units.filter(u=>u.stage==='Logical reasoning'),ids=new Set(),answerPositions=new Set();assert.equal(units.length,4)
let questions=0
for(const u of units)for(const q of [...u.lessons.map(l=>l.exercise),...u.quiz]){
 assert.equal(q.kind,'choice');assert.equal(new Set(q.options).size,4);assert.ok(!ids.has(q.id));ids.add(q.id)
 const valid=candidates(q);assert.equal(valid.filter(Boolean).length,1,q.id);assert.equal(valid[q.answer],true,q.id);answerPositions.add(q.answer);questions++
}
assert.equal(questions,32);assert.equal(answerPositions.size,4)
console.log('PASS independent reasoning answer audit: 32 unique keys, truth-table/counterexample inference, every ordering constraint, alphabet wraparound, stated classifications and all four answer positions')
