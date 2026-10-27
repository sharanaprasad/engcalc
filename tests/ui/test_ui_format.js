const {JSDOM}=require('jsdom');
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const err=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){w.addEventListener('error',e=>err.push(e.message));}});
const w=dom.window,d=w.document;
const inp=d.getElementById('inp'),log=d.getElementById('log');
let fail=0;
function run(s){inp.value=s;inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return log.lastElementChild.textContent.replace(/\s+/g,' ').trim();}
function ok(c,m){if(!c){fail++;console.log('FAIL',m);}else console.log('ok',m);}

// Format directive in UI
let r=run('5MHz / 60us => M');
ok(r.includes('83333.3 M'),'5MHz/60us => M: '+r.slice(0,80));
r=run('x = 10M => k');
ok(r.includes('10000 k')&&!r.includes('ERR'),'assignment with =>: '+r.slice(0,80));
r=run('x');
ok(r.includes('10M'),'stored var is raw: '+r.slice(0,80));
r=run('255 => hex');
ok(r.includes('0xFF'),'base conversion: '+r.slice(0,60));
r=run('0xFF => bin');
ok(r.includes('0b1111_1111'),'hex to bin: '+r.slice(0,60));

// Error for unknown directive
r=run('5 => xyz');
ok(r.toLowerCase().includes('known format'),'unknown directive error: '+r.slice(0,80));

// Chip for "to M"
const chips=[...d.querySelectorAll('#chips button')].map(b=>b.textContent.trim());
ok(chips.includes('to M'),'chip "to M" exists: '+chips.join(','));

// Help mentions =>
d.getElementById('btnHelp').click();
const helpText=log.textContent;
ok(helpText.includes('=>'),'help mentions =>');
ok(helpText.includes('DISPLAY ANY RESULT'),'help has new section');

// Ghost preview with =>
inp.value='5 => M';inp.dispatchEvent(new w.Event('input'));
console.log('ghost:',d.getElementById('ghost').textContent.slice(0,60));

// Format directive in solver tab eqs box? Should not apply (format is per statement in console)
d.querySelector('#tabs button[data-tab="solver"]').click();
d.getElementById('eqs').value='x+y=3=>M;x-y=1';
d.getElementById('btnSolve').click();
console.log('solver output with =>:',d.getElementById('solout').textContent.replace(/\s+/g,' ').slice(0,120));

console.log();console.log('browser errors:',err.length,err.slice(0,3).join('|'));
console.log(fail?fail+' failed':'all passed');
