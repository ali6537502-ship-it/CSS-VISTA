/* Formatting only: original scientific source remains unchanged. */
(function(scope){
 'use strict';
 function render(container,{sourceText=''}={}){
  if(!scope.katex)return {rendered:0,issues:['Equation renderer unavailable']};
  // One documented Markdown-emphasis defect: restore only when the original source proves the exact notation.
  let repairs=0;const original='$$\\boxed{(1011)_2=11_{10}}$$';
  if(sourceText.includes(original))for(const p of container.querySelectorAll('p')){if(p.innerHTML==='$$\\boxed{(1011)<em>2=11</em>{10}}$$'){p.textContent=original;p.dataset.renderingRepair='original-manuscript-tex';repairs++}}
  const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT),nodes=[],issues=[];let node,rendered=0;
  while((node=walker.nextNode()))if(!node.parentElement.closest('math,code,pre,script,style,.gsa-equation,.math-source-fallback'))nodes.push(node);
  for(const node of nodes){
   const text=node.nodeValue;if(!text.includes('$'))continue;
   const matches=[...text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)];
   if(!matches.length){
    const block=node.parentElement.closest('p,li,td')||node.parentElement;
    block.classList.add('math-source-issue');block.setAttribute('data-math-issue','Formula source contains unmatched or HTML-fragmented delimiters; editorial repair required.');issues.push(text);continue;
   }
   const fragment=document.createDocumentFragment();let position=0;
   for(const match of matches){
    fragment.append(document.createTextNode(text.slice(position,match.index)));
    const display=match[1]!==undefined,tex=match[1]??match[2],wrapper=document.createElement('span');
    wrapper.className='gsa-equation'+(display?' display-equation':'');
    try{
     // Literal percent signs in this manuscript mean percent, not TeX comments.
     const normalized=tex.replace(/(^|[^\\])%/g,'$1\\%');
     wrapper.innerHTML=scope.katex.renderToString(normalized,{output:'mathml',displayMode:display,throwOnError:true,trust:false,maxExpand:200,maxSize:10,strict:'ignore'});
     wrapper.dataset.tex=tex;rendered++;
    }catch{
     wrapper.className='math-source-fallback';wrapper.textContent='Formula requires editorial repair: '+tex;issues.push(tex);
    }
    fragment.append(wrapper);position=match.index+match[0].length;
   }
   fragment.append(document.createTextNode(text.slice(position)));node.replaceWith(fragment);
  }
  if(scope.requestAnimationFrame)scope.requestAnimationFrame(()=>{
   for(const equation of container.querySelectorAll('.gsa-equation'))if(equation.scrollWidth>equation.clientWidth+1){equation.tabIndex=0;equation.classList.add('scrollable-equation');equation.setAttribute('role','group');equation.setAttribute('aria-label','Scientific equation; use left and right arrow keys to scroll');}
  });
  return {rendered,issues,repairs};
 }
 scope.CSSVistaGSAMath={render};
})(window);
