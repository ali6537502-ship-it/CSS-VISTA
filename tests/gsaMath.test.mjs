import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {JSDOM} from 'jsdom'
const katex=readFileSync('public/gsa-tutor/vendor/katex.min.js','utf8'),script=readFileSync('public/gsa-tutor/math-renderer.js','utf8')
function render(html){const dom=new JSDOM('<!doctype html><main>'+html+'</main>',{runScripts:'outside-only'});dom.window.eval(katex);dom.window.eval(script);const root=dom.window.document.querySelector('main');return {dom,root,result:dom.window.CSSVistaGSAMath.render(root)}}
test('fractions, subscripts, chemistry and literal percentage are rendered as native MathML',()=>{
 const p=render('<p>$c=f\\lambda$ and $N=N_0(1/2)^n$</p><p>$$\\mathrm{C_6H_{12}O_6\\rightarrow2C_2H_5OH+2CO_2}$$</p><p>$RH=\\frac{e}{e_s(T)}\\times100%.$</p>')
 assert.equal(p.result.rendered,4);assert.equal(p.result.issues.length,0);assert.equal(p.root.querySelectorAll('math').length,4)
 assert.match(p.root.textContent,/%/);assert.equal(p.root.querySelectorAll('mfrac').length,1)
 assert.equal(p.dom.window.CSSVistaGSAMath.render(p.root).rendered,0,'Rendering is idempotent')
 p.dom.window.close()
})
test('unsupported or fragmented source is visible without inventing a replacement formula',()=>{
 const p=render('<p>$\\unsupportedthing{a}$</p><p>$\\boxed{(1011)<em>2=11</em>{10}}$</p>')
 assert.equal(p.root.querySelectorAll('.math-source-fallback').length,1)
 assert.ok(p.root.querySelector('.math-source-issue'))
 assert.match(p.root.textContent,/editorial repair/);p.dom.window.close()
})
test('code samples and unsafe TeX commands cannot introduce links, images or scripts',()=>{
 const p=render('<code>$x^2$</code><p>$\\href{javascript:alert(1)}{unsafe}$</p>')
 assert.equal(p.root.querySelector('code').textContent,'$x^2$')
 assert.equal(p.root.querySelectorAll('a,img,script').length,0);p.dom.window.close()
})

test('binary subscripts are restored only when exact original manuscript notation is supplied',()=>{
 const p=render('<p>$$\\boxed{(1011)<em>2=11</em>{10}}$$</p>')
 assert.equal(p.result.rendered,0)
 p.root.innerHTML='<p>$$\\boxed{(1011)<em>2=11</em>{10}}$$</p>'
 const result=p.dom.window.CSSVistaGSAMath.render(p.root,{sourceText:'$$\\boxed{(1011)_2=11_{10}}$$'})
 assert.equal(result.repairs,1);assert.equal(result.rendered,1);assert.equal(result.issues.length,0)
 assert.equal(p.root.querySelectorAll('msub').length,2);p.dom.window.close()
})
