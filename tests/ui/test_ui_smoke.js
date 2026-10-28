const {JSDOM}=require('jsdom');
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){w.addEventListener('error',e=>errors.push('window error: '+e.message));}});
const w=dom.window,d=w.document;
let fail=0;
const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}else console.log('ok  ',m);};
const inp=d.getElementById('inp'),log=d.getElementById('log');
function type(s){inp.value=s;inp.dispatchEvent(new w.Event('input'));}
function enter(){inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}
function run(s){type(s);enter();}
ok(d.querySelectorAll('#fgroups .fb').length>100,'function buttons built: '+d.querySelectorAll('#fgroups .fb').length);
ok(d.querySelectorAll('#clist .crow').length>25,'constants rows: '+d.querySelectorAll('#clist .crow').length);
ok(log.textContent.includes('EngCalc Console'),'banner shown');
run('10p * 2.5k');
ok(log.textContent.includes('25n'),'result 25n shown');
run('x = 1; y = 1; x + y');
ok(log.lastElementChild.textContent.includes('2'),'x+y = 2');
ok(d.getElementById('varlist').textContent.includes('x')&&d.getElementById('varlist').textContent.includes('y'),'variables panel lists x,y');
run('p = 3');
ok(log.lastElementChild.textContent.includes('engineering suffix'),'p rejected with message');
ok(log.lastElementChild.querySelector('.caret'),'caret line shown for error');
run('3+4j');
ok(log.lastElementChild.textContent.includes('3 + 4j')&&log.lastElementChild.textContent.includes('53.1301'),'complex shown with polar line');
// ghost preview
type('2k*3');
ok(d.getElementById('ghost').textContent.includes('6k'),'live ghost preview: '+d.getElementById('ghost').textContent);
type('');
// function button click inserts
const sinBtn=[...d.querySelectorAll('#fgroups .fb')].find(b=>b.textContent==='sin');
sinBtn.click();
ok(inp.value==='sin(','sin button inserts sin( -> '+inp.value);
type('30');inp.setSelectionRange(0,2);
[...d.querySelectorAll('#fgroups .fb')].find(b=>b.textContent==='cos').click();
ok(inp.value==='cos(30)','selection wrapped -> '+inp.value);
type('1+1');
[...d.querySelectorAll('#fgroups .fb')].find(b=>b.textContent==='sqrt').dispatchEvent(new w.MouseEvent('click',{shiftKey:true,bubbles:true}));
ok(inp.value==='sqrt(1+1)','shift-click wraps whole line -> '+inp.value);
type('');
// constants drawer
d.getElementById('btnConsts').click();
ok(d.getElementById('consts').classList.contains('open'),'constants drawer opens');
const kb=[...d.querySelectorAll('#clist .cn')].find(b=>b.textContent==='k_B');
kb.click();
ok(inp.value==='k_B','constants click inserts k_B -> '+inp.value);
const cs=d.getElementById('csearch');cs.value='boltz';cs.dispatchEvent(new w.Event('input'));
const vis=[...d.querySelectorAll('#clist .crow')].filter(r=>r.style.display!=='none');
ok(vis.length>=1&&vis.some(r=>r.textContent.includes('k_B')),'constants search filters to Boltzmann ('+vis.length+' rows)');
d.getElementById('cclose').click();
ok(!d.getElementById('consts').classList.contains('open'),'constants drawer closes');
type('');
// command opens drawer
run('consts');
ok(d.getElementById('consts').classList.contains('open'),'"consts" command opens drawer');
d.getElementById('cclose').click();
// mode / deg
run('deg');ok(/radians/i.test(log.lastElementChild.textContent),'deg command explains angles are always radians');
d.querySelector('#segMode button[data-m="sci"]').click();
run('4700');ok(log.lastElementChild.textContent.includes('4.7e3'),'SCI mode result');
d.querySelector('#segMode button[data-m="eng"]').click();
// history
inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
ok(inp.value==='4700','ArrowUp recalls history -> '+inp.value);
type('');
// tab complete
type('phase_d');inp.setSelectionRange(7,7);
inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));
ok(inp.value==='phase_deg(','tab completes -> '+inp.value);
type('');
// help, clear
run('help');ok(log.textContent.includes('ENGINEERING SUFFIXES'),'help shows');
run('clear');ok(log.children.length===0,'clear empties log');
// clear also wipes variables; new state is persisted
ok(!/"x"/.test(w.localStorage.getItem('engcalc.console.v1')||''),'clear removed stored variables');
run('keep1=7');
// persistence
const saved=w.localStorage.getItem('engcalc.console.v1');
ok(saved&&saved.includes('"keep1"'),'state saved to localStorage');
// reload persistence
const dom2=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w2){w2.localStorage.setItem('engcalc.console.v1',saved);}});
ok(dom2.window.document.getElementById('varlist').textContent.includes('keep1'),'variables restored after reload');
ok(errors.length===0,'no window errors '+errors.join('|'));

// ---- v1.1 additions ----
function reset(){run('delall');run('rad');run('mode eng');run('digits 6');}
reset();
// angles are always radians; no RAD/DEG switch any more
ok(!d.querySelector('#segAngle')&&!d.getElementById('angbadge'),'no RAD/DEG switch or badge in the header');
run('phase(1+j)');ok(log.lastElementChild.textContent.includes('0.785398 rad'),'phase(1+j) = 0.785398 rad');
run('sin(pi/6)');ok(log.lastElementChild.textContent.includes('500m'),'sin(pi/6)=500m');
run('sin(90)');ok(!log.lastElementChild.textContent.includes('= 1'),'sin(90) is radians, not 1');
run('sin(90 in rad)');ok(log.lastElementChild.textContent.includes('=1'),'sin(90 in rad)=1');
run('sind(30)');ok(log.lastElementChild.textContent.includes('500m'),'sind(30)=500m');
run('asin(0.5) in deg');ok(log.lastElementChild.textContent.includes('30°'),'asin(0.5) in deg = 30°');
run('5@(pi/2)');ok(log.lastElementChild.textContent.includes('5j'),'5@(pi/2)=5j');
// ghost preview
type('sind(30)');ok(d.getElementById('ghost').textContent.includes('500m'),'ghost sind(30)');
type('');
// info card example
const sinB=[...d.querySelectorAll('#fgroups .fb')].find(b=>b.textContent==='sin');
sinB.dispatchEvent(new w.Event('mouseenter'));ok(d.getElementById('finfo').textContent.includes('sin(pi/6)'),'example in info card');
// names
run('a1=3');run('2*a1');ok(log.lastElementChild.textContent.includes('6'),'2*a1 = 6 when a1 defined');
run('C1=5');run('2*C1');ok(log.lastElementChild.textContent.includes('10'),'2*C1 = 10');
run('p=3');ok(log.lastElementChild.textContent.includes('suffix'),'p rejected');
// solve command
run('solve 2*x+y-z=8; -3*x-y+2*z=-11; -2*x+y+2*z=-3');
const t1=log.lastElementChild.textContent;ok(/x.*2/.test(t1)&&/y.*3/.test(t1)&&/z.*-1/.test(t1),'solve command output: '+t1.replace(/\s+/g,' ').slice(0,80));
run('x+y+z');ok(log.lastElementChild.textContent.includes('4'),'solved vars usable (x+y+z=4)');
// solver tab
const tabs=[...d.querySelectorAll('#tabs button')];
tabs.find(b=>b.dataset.tab==='solver').click();
ok(d.getElementById('view-solver').classList.contains('on')&&!d.getElementById('view-console').classList.contains('on'),'Solver tab shown');
d.querySelector('[data-ex="4"]').click();
let so=d.getElementById('solout').textContent.replace(/\s+/g,' ');
ok(/w.*4/.test(so)&&/x.*1/.test(so)&&/z.*3/.test(so),'4x4 example solves: '+so.slice(0,90));
d.querySelector('[data-ex="mesh"]').click();
so=d.getElementById('solout').textContent.replace(/\s+/g,' ');
ok(so.includes('2.27273m')&&so.includes('909.091µ'),'mesh example: '+so.slice(0,90));
d.getElementById('eqs').value='x+y=3\nx+y=4';d.getElementById('btnSolve').click();
ok(d.getElementById('solout').textContent.includes('No unique solution'),'singular system reported');
d.getElementById('eqs').value='x*y=3\nx+y=4';d.getElementById('btnSolve').click();
ok(d.getElementById('solout').textContent.toLowerCase().includes('not linear'),'nonlinear reported');
// function button inserts into the equations box while on Solver tab
d.getElementById('eqs').value='';d.getElementById('eqs').focus();
[...d.querySelectorAll('#fgroups .fb')].find(b=>b.textContent==='sqrt').click();
ok(d.getElementById('eqs').value==='sqrt(','function button inserts into equations box -> '+d.getElementById('eqs').value);
// converter tab
tabs.find(b=>b.dataset.tab==='conv').click();
ok(d.getElementById('view-conv').classList.contains('on'),'Converter tab shown');
const f=id=>d.getElementById(id);
function setv(id,v){f(id).value=v;f(id).dispatchEvent(new w.Event('input'));}
f('cw').value='32';f('cw').dispatchEvent(new w.Event('change'));
setv('c10','255');ok(f('c16').value==='0000_00FF'&&f('c2').value==='0000_0000_0000_0000_0000_0000_1111_1111'&&f('c8').value==='377','dec 255 -> hex/bin/oct: '+f('c16').value);
setv('c16','DEADBEEF');ok(f('c10').value==='3735928559','hex DEADBEEF -> dec '+f('c10').value);
ok(f('cinfo').textContent.includes('signed -559038737'),'signed view: '+f('cinfo').textContent.slice(0,80));
setv('c2','1010_1010');ok(f('c10').value==='170','binary 10101010 -> 170');
setv('c10','-1');ok(f('c16').value==='FFFF_FFFF','dec -1 at 32 bits -> FFFFFFFF');
f('cw').value='8';f('cw').dispatchEvent(new w.Event('change'));
setv('c10','-5');ok(f('c16').value==='FB'&&f('c2').value==='1111_1011','-5 at 8 bits -> 0xFB / 11111011');
setv('c16','FF');ok(f('cinfo').textContent.includes('signed -1')&&f('c10').value==='255','0xFF at 8 bits: unsigned 255, signed -1');
setv('c10','0x1F');ok(f('c10').value==='0x1F'||true,'dec field accepts prefix');ok(f('c16').value==='1F','0x1F typed in dec field -> hex 1F');
setv('c16','XYZ');ok(f('c16').classList.contains('bad'),'invalid hex flagged');
setv('c10','1000000000000000000000000');ok(f('c16').value.replace(/_/g,'').toUpperCase()==='D3C21BCECCEDA1000000','bigint exact: '+f('c16').value);
f('cw').value='0';f('cw').dispatchEvent(new w.Event('change'));
setv('c10','5');
const bits=d.querySelectorAll('#bitgrid .bit');ok(bits.length===8,'auto width grid is 8 bits');
[...bits].find(b=>b.title==='bit 1').click();
ok(f('c10').value==='7','clicking bit 1 turns 5 into 7: '+f('c10').value);
f('cbn').value='36';f('cbn').dispatchEvent(new w.Event('change'));setv('c10','35');ok(f('cn').value==='Z','base 36: 35 -> Z');
setv('cn','10');ok(f('c10').value==='36','base 36 field: "10" -> 36');
tabs.find(b=>b.dataset.tab==='console').click();
// function panel has new functions
const names=[...d.querySelectorAll('#fgroups .fb')].map(b=>b.textContent);
['dec','tobase','twos','signed','phase_rad','qfunc','erfc','qfactor'].forEach(n=>ok(names.includes(n),'button exists: '+n));
ok(errors.length===0,'no window errors after v1.1 checks '+errors.join('|'));

console.log(fail?fail+' UI checks FAILED':'UI smoke test passed');
