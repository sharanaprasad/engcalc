// the LaTeX tab, latex() in the console and the TeX button on symbolic results
const {JSDOM}=require('jsdom');
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const errors=[];
let copied=[];
const mk=ls=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){w.addEventListener('error',e=>errors.push('window error: '+e.message));
    Object.defineProperty(w.navigator,'clipboard',{value:{writeText:t=>{copied.push(t);return Promise.resolve();}},configurable:true});
    if(ls)w.localStorage.setItem('engcalc.latex',ls);}});
const dom=mk();
const w=dom.window,d=w.document;
let fail=0;
const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}else console.log('ok  ',m);};
const $=id=>d.getElementById(id);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const tab=n=>[...d.querySelectorAll('#tabs button')].find(b=>b.dataset.tab===n).click();
const inp=$('inp'),log=$('log');
const run=s=>{inp.value=s;inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return log.lastElementChild;};
const type=s=>{$('txIn').value=s;$('txIn').dispatchEvent(new w.Event('input',{bubbles:true}));};
const fire=(el,t)=>el.dispatchEvent(new w.Event(t,{bubbles:true}));

(async()=>{
  ok(!!d.querySelector('#tabs button[data-tab="latex"]'),'there is a LaTeX tab');
  tab('latex');
  ok($('view-latex').classList.contains('on'),'the LaTeX tab opens');
  ok(/Type an expression/.test($('txMsg').textContent),'an empty box explains what to do');

  type('(s+1)/(s^2+3*s+2)');await wait(260);
  ok($('txOut').textContent==='\\frac{s + 1}{s^{2} + 3s + 2}','typing converts live: '+$('txOut').textContent);

  $('txWrap').value='inline';fire($('txWrap'),'change');
  ok($('txOut').textContent==='$\\frac{s + 1}{s^{2} + 3s + 2}$','wrap in $...$');
  $('txWrap').value='none';fire($('txWrap'),'change');

  type('2*x*y');await wait(260);
  $('txMul').value='cdot';fire($('txMul'),'change');
  ok($('txOut').textContent==='2 \\cdot x \\cdot y','multiplication style \\cdot');
  $('txMul').value='smart';fire($('txMul'),'change');
  ok($('txOut').textContent==='2x y','smart multiplication');

  d.querySelector('[data-tx="diff(x^2*sin(x))"]').click();
  ok(/= 2x \\sin\(x\) \+ x\^\{2\} \\cos\(x\)$/.test($('txOut').textContent),'example chip: diff shows its result: '+$('txOut').textContent);
  $('txRes').checked=false;fire($('txRes'),'change');
  ok(!/=/.test($('txOut').textContent),'unticking "add results" leaves just the expression');
  $('txRes').checked=true;fire($('txRes'),'change');

  const sysChip=[...d.querySelectorAll('[data-tx]')].find(b=>b.textContent==='system');
  sysChip.click();
  ok(/^\\begin\{aligned\}[\s\S]*&= 8 \\\\[\s\S]*\\end\{aligned\}$/.test($('txOut').textContent),'a system becomes an aligned block');

  copied=[];$('txCopy').click();await wait(20);
  ok(copied.length===1&&/aligned/.test(copied[0]),'Copy LaTeX copies the code');

  type('2x + 1');await wait(260);
  ok($('txMsg').classList.contains('bad')&&/2\*x/.test($('txMsg').textContent)&&$('txOut').textContent==='','an error is explained, not thrown: '+$('txMsg').textContent);
  copied=[];$('txCopy').click();await wait(20);
  ok(copied.length===0,'nothing is copied after an error');

  type('H(s) = 1/(R*C*s + 1)');await wait(260);
  const saved=w.localStorage.getItem('engcalc.latex');
  ok(saved&&JSON.parse(saved).src==='H(s) = 1/(R*C*s + 1)','the text is remembered in the browser');
  const d2=mk(saved).window.document;
  ok(d2.getElementById('txIn').value==='H(s) = 1/(R*C*s + 1)','a reload restores the LaTeX box');
  ok(!!$('txPrev'),'a preview area exists (KaTeX is loaded from the internet when available)');

  $('txClr').click();
  ok($('txIn').value===''&&$('txOut').textContent==='','clear empties the box');

  // ---- console
  tab('console');
  let e=run('latex((s+1)/(s^2+3*s+2))');
  const box=e.querySelector('.texbox');
  ok(box&&box.textContent==='\\frac{s + 1}{s^{2} + 3s + 2}','latex() in the console shows the code');
  copied=[];box.click();await wait(20);
  ok(copied[0]==='\\frac{s + 1}{s^{2} + 3s + 2}','clicking the code copies it');
  ok([...e.querySelectorAll('button')].some(b=>/Copy LaTeX/.test(b.textContent)),'and there is a Copy LaTeX button');
  e=run('latex x^2 - 3*x + 2 = 0');
  ok(e.querySelector('.texbox').textContent==='x^{2} - 3x + 2 = 0','equations work with "latex ..."');
  e=run('diff(x^2*sin(x))');
  const tb=[...e.querySelectorAll('button')].find(b=>b.textContent==='TeX');
  ok(!!tb,'a symbolic result has a TeX button');
  copied=[];tb.click();await wait(20);
  ok(copied[0]==='2x \\sin(x) + x^{2} \\cos(x)','TeX copies the result as LaTeX: '+copied[0]);
  e=run('2+3');
  ok(![...e.querySelectorAll('button')].some(b=>b.textContent==='TeX'),'plain numbers have no TeX button');
  e=run('latex(2x)');
  ok(/must be written with \*/.test(e.textContent),'latex errors show in the console');

  ok(errors.length===0,'no script errors '+errors.join('; '));
  console.log(fail?fail+' FAILED':'all passed');
  process.exit(fail?1:0);
})();
