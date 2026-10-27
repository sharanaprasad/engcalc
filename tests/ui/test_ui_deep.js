const {JSDOM}=require('jsdom');
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const err=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){w.addEventListener('error',e=>err.push('ERR: '+e.message));}});
const w=dom.window,d=w.document;
const inp=d.getElementById('inp'),log=d.getElementById('log');
let fail=0;
function type(s){inp.value=s;inp.dispatchEvent(new w.Event('input'));}
function enter(){inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}
function run(s){type(s);enter();return log.lastElementChild?log.lastElementChild.textContent.trim():'';}
function tabTo(name){d.querySelector('#tabs button[data-tab="'+name+'"]').click();}
function key(k,opts){const e=new w.KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},opts||{}));inp.dispatchEvent(e);}

// 1. Help after switching to solver tab and back doesn't crash
tabTo('solver');tabTo('console');console.log('t1: console after tab round-trip ok');

// 2. clicking a chip inserts
d.querySelector('#chips button').click();
console.log('t2: chip click, inp.value=',JSON.stringify(inp.value));

// 3. Function panel click when input is a textarea on solver tab
inp.value='';
tabTo('solver');
d.getElementById('eqs').value='';
d.getElementById('eqs').focus();
const sinBtn=[...d.querySelectorAll('#fgroups .fb')].find(b=>b.textContent==='sin');
sinBtn.click();
console.log('t3: sin from solver tab, eqs=',JSON.stringify(d.getElementById('eqs').value));

// 4. Constant click when on solver tab — should insert into eqs
const kB=[...d.querySelectorAll('#clist .cn')].find(b=>b.textContent==='k_B');
d.getElementById('btnConsts').click();
kB.click();
console.log('t4: k_B from solver tab, eqs=',JSON.stringify(d.getElementById('eqs').value));
d.getElementById('cclose').click();
tabTo('console');

// 5. Variables panel click after switch
inp.value='';
run('xx = 5');
tabTo('solver');
d.getElementById('eqs').value='';
d.getElementById('eqs').focus();
[...d.querySelectorAll('#varlist .vname')].find(b=>b.textContent==='xx').click();
console.log('t5: var xx from solver, eqs=',JSON.stringify(d.getElementById('eqs').value));

// 6. Converter: typing invalid hex clears others?
tabTo('conv');
const f=id=>d.getElementById(id);
f('cw').value='32';f('cw').dispatchEvent(new w.Event('change'));
function setv(id,v){f(id).value=v;f(id).dispatchEvent(new w.Event('input'));}
setv('c10','42');
console.log('t6a: c10=42, c16=',f('c16').value,'c2=',f('c2').value);
setv('c16','ZZ');
console.log('t6b: c16=ZZ, class=',f('c16').className,'c10=',f('c10').value);
setv('c16','FF');
console.log('t6c: c16=FF recovers, c10=',f('c10').value);

// 7. Base converter big number
setv('c10','99999999999999999999999999');
console.log('t7: big c10, c16=',f('c16').value);

// 8. Width change with existing value
f('cw').value='8';f('cw').dispatchEvent(new w.Event('change'));
console.log('t8: width 8 with huge number, info=',f('cinfo').textContent.slice(0,120));

// 9. Converter: switch to auto, type negative
f('cw').value='0';f('cw').dispatchEvent(new w.Event('change'));
setv('c10','-5');
console.log('t9: auto width, -5, bits=',d.querySelectorAll('#bitgrid .bit').length,'c16=',f('c16').value);

// 10. Base N select
setv('c10','255');
f('cbn').value='16';f('cbn').dispatchEvent(new w.Event('change'));
console.log('t10: base 16 via base-N select, cn=',f('cn').value);

// 11. Does Ctrl+K focus function search even when on solver tab?
tabTo('solver');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));
console.log('t11: Ctrl+K from solver, active element id=',d.activeElement.id);

// 12. Function search with no match
f('fsearch').value='xyznope';f('fsearch').dispatchEvent(new w.Event('input'));
const visible=[...d.querySelectorAll('#fgroups .fb')].filter(b=>b.style.display!=='none').length;
console.log('t12: search "xyznope" visible buttons:',visible);
f('fsearch').value='';f('fsearch').dispatchEvent(new w.Event('input'));

// 13. Help/clear buttons
tabTo('console');
log.innerHTML='';
{const i0=d.getElementById('inp');i0.value='help';i0.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}
console.log('t13: help button, log has help text:',log.textContent.includes('ENGINEERING SUFFIXES'));
d.getElementById('btnClear').click();
console.log('t13b: clear button, log empty:',log.children.length===0);

// 14. Export button
d.getElementById('btnExport').click();
console.log('t14: export click (no crash)');

// 15. Ctrl+L clears
run('5+3');
key('l',{ctrlKey:true});
console.log('t15: Ctrl+L clears log:',log.children.length===0);

// 16. ArrowUp/Down empty history
inp.value='test123';
key('ArrowUp');key('ArrowDown');
console.log('t16: history nav from draft, inp=',inp.value);

// 17. Escape closes constants drawer
d.getElementById('btnConsts').click();
console.log('t17a: drawer open:',d.getElementById('consts').classList.contains('open'));
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
console.log('t17b: drawer after Esc:',d.getElementById('consts').classList.contains('open'));

// 18. Solver button via Ctrl+Enter
inp.value='';
tabTo('solver');
d.getElementById('eqs').value='x+y=3\nx-y=1';
d.getElementById('eqs').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true}));
console.log('t18: Ctrl+Enter on solver tab, solout:',d.getElementById('solout').textContent.replace(/\s+/g,' ').slice(0,100));

// 19. Solver with pre-defined var
tabTo('console');
run('a_big = 100');
run('solve a_big + x = 150');  // should ERROR or work? previously defined var not detected as unknown
console.log('t19: solve a_big + x = 150 =>',log.lastElementChild.textContent.replace(/\s+/g,' ').slice(0,120));

// 20. Insert function in solver, press clear, insert again
tabTo('solver');
d.getElementById('eqs').value='sin(1)';
d.getElementById('btnEqClear').click();
console.log('t20: clear button, eqs=',JSON.stringify(d.getElementById('eqs').value),'solout empty:',d.getElementById('solout').textContent.length===0);

// 21. Does ans update when just referencing ans?
tabTo('console');
log.innerHTML='';
run('reset');
run('5+3');  // ans=8, ans2=undef
run('5');    // ans=5, ans2=8
run('ans');  // should NOT clobber ans2
run('ans2'); // should still be 8
console.log('t21: ans2 after referencing ans:',log.lastElementChild.textContent.replace(/\s+/g,' ').slice(0,80));

// 22. complex display
run('(1+2j)/(3+4j)');
console.log('t22: complex result:',log.lastElementChild.textContent.replace(/\s+/g,' ').slice(0,80));

console.log();console.log('browser errors:',err.length,'→',err.slice(0,3).join('|'));
console.log(err.length?err.length+' failed':'all passed');
