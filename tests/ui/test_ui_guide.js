// the illustrated guide: opens from Help, live examples run on a clean state that is restored afterwards
const {JSDOM}=require('jsdom');
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){w.addEventListener('error',e=>errors.push('window error: '+e.message));w.Element.prototype.scrollIntoView=function(){};}});
const w=dom.window,d=w.document;
let fail=0;
const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}else console.log('ok  ',m);};
const inp=d.getElementById('inp'),log=d.getElementById('log'),guide=d.getElementById('guide'),help=d.getElementById('btnHelp');
const run=s=>{inp.value=s;inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return log.lastElementChild?log.lastElementChild.textContent.replace(/\s+/g,' '):'';};
const key=(k,o)=>d.dispatchEvent(new w.KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));

(async()=>{
// ---- first visit
ok(guide.hidden,'guide starts closed');
ok(help.classList.contains('pulse'),'Help button pulses on the first visit');
ok(!!log.querySelector('.ginvite'),'welcome banner invites new users to the guide');

// ---- state to be protected while the examples are computed
run('x = 5');run('keep1 = 9');run('7*6');run('mode sci');run('digits 4');
help.click();
ok(!guide.hidden,'Help opens the guide');
ok(!help.classList.contains('pulse')&&!log.querySelector('.ginvite'),'pulse and invitation disappear once the guide was opened');
ok(w.localStorage.getItem('engcalc.guideSeen')==='1','first-visit flag is remembered');
const exs=[...guide.querySelectorAll('.gx')];
ok(exs.length>=35,'live examples present: '+exs.length);
const bad=exs.filter(e=>!e.querySelector('.gout').textContent.trim()||e.querySelector('.gout').classList.contains('bad')).map(e=>e.dataset.ex+' -> '+e.querySelector('.gout').textContent);
ok(bad.length===0,'every example computes a result: '+bad.join(' | '));
const out=ex=>{const e=exs.find(x=>x.dataset.ex===ex);return e?e.querySelector('.gout').textContent:'(missing)';};
ok(out('2.2k * 3')==='= 6.6k','2.2k * 3 = 6.6k: '+out('2.2k * 3'));
ok(out('x^2 - 3x + 2 = 0').includes('x1 = 2'),'quadratic example: '+out('x^2 - 3x + 2 = 0'));
ok(out('integ(exp(-x^2), -inf, inf)').includes('1.77245'),'Gaussian integral example: '+out('integ(exp(-x^2), -inf, inf)'));
ok(out('integ(x*exp(x))').includes('+ C'),'integ example shows + C: '+out('integ(x*exp(x))'));
ok(out('ILT(1/(s^2+3*s+2))').includes('exp(-t) - exp(-2*t)'),'ILT example: '+out('ILT(1/(s^2+3*s+2))'));
ok(exs[0].querySelector('.gin').innerHTML.includes('<span'),'example input is syntax-highlighted');

// ---- the user's own state is untouched
key('Escape');
ok(guide.hidden,'Esc closes the guide');
ok(/42/.test(run('ans')),'ans survives opening the guide');
ok(/=\s*5\b/.test(run('x'))&&/=\s*9\b/.test(run('keep1')),'variables survive opening the guide: '+run('x'));
ok(/4\.7e3|4\.7e\+?3/.test(run('4700')),'display mode and digits survive: '+run('4700'));
run('mode eng');run('digits 6');

// ---- opening paths
key('F1');ok(!guide.hidden,'F1 opens the guide');
key('F1');ok(guide.hidden,'F1 closes it again');
run('guide');ok(!guide.hidden,'the guide command opens it');
d.getElementById('gClose').click();ok(guide.hidden,'Close button closes it');

// ---- Try buttons run the example in the console
help.click();
const tryOne=exs.find(e=>e.dataset.ex==='10p * 2.5k').querySelector('.gtry');
tryOne.click();
ok(guide.hidden,'Try closes the guide');
ok(log.lastElementChild.textContent.includes('25n'),'Try runs the example in the console: '+log.lastElementChild.textContent.replace(/\s+/g,' '));
help.click();
exs.find(e=>e.dataset.ex.startsWith('R1 = 2.2k')).querySelector('.gtry').click();
ok(/=\s*1\.4985/.test(run('par(R1, R2)'))||/1\.4985/.test(run('par(R1, R2)')),'a multi-line example runs every line: '+run('par(R1, R2)'));

// ---- navigation inside the guide
help.click();
ok(guide.querySelectorAll('.g-toc a').length===15&&guide.querySelectorAll('.g-sec').length===15,'15 sections with a matching contents list');
guide.querySelector('.g-toc a[href="#g-calculus"]').click();
// the contents list follows the scroll position
{const sec=guide.querySelector('#g-matrices');sec.getBoundingClientRect=()=>({top:0});guide.scrollTop=1;guide.dispatchEvent(new w.Event('scroll'));await new Promise(r=>setTimeout(r,60));ok(!!guide.querySelector('.g-toc a.on'),'the current section is highlighted in the contents list');}
ok(!guide.hidden,'a contents link keeps the guide open');
guide.querySelector('[data-tab="formulas"]').click();
ok(guide.hidden&&d.getElementById('view-formulas').classList.contains('on'),'"Open Formulas" jumps to that tab');
help.click();
guide.querySelector('[data-act="consts"]').click();
ok(guide.hidden&&d.getElementById('consts').classList.contains('open'),'"Open constants" opens the drawer');
d.getElementById('cclose').click();
help.click();
guide.querySelector('[data-act="export"]').click();
ok(guide.hidden&&!d.getElementById('exp').hidden,'"Open the export dialog" opens it');
d.getElementById('expClose').click();
help.click();
guide.querySelector('[data-guide-help]').click();
ok(guide.hidden&&log.textContent.includes('ENGINEERING SUFFIXES'),'the compact reference is still available');
ok(!!log.querySelector('[data-guide]'),'the text help links back to the guide');
log.querySelector('[data-guide]').click();
ok(!guide.hidden,'that link opens the guide');
key('Escape');

ok(errors.length===0,'no script errors '+errors.join('; '));
console.log(fail?fail+' FAILED':'all passed');
process.exit(fail?1:0);
})();
