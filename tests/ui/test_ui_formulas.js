const {JSDOM}=require('jsdom');
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){w.addEventListener('error',e=>errors.push('window error: '+e.message));}});
const w=dom.window,d=w.document;
let fail=0;
const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}else console.log('ok  ',m);};
const set=(id,v)=>{const e=d.getElementById(id);e.value=v;e.dispatchEvent(new w.Event('input',{bubbles:true}));};
const rows=()=>[...d.querySelectorAll('#fseries tbody tr')].map(r=>[...r.children].map(c=>c.textContent));

[...d.querySelectorAll('#tabs button')].find(b=>b.dataset.tab==='formulas').click();
ok(d.getElementById('view-formulas').classList.contains('on'),'Formulas tab opens');
ok(d.querySelectorAll('#fsel option').length>=10,'series list has '+d.querySelectorAll('#fsel option').length+' entries');

set('fsel','sin');set('fx','0.5');set('fn','4');
let r=rows();
ok(r.length===4,'sin: 4 rows');
ok(r[0][1]==='x'&&r[1][1].includes('x³/3!'),'sin: term labels x, −x³/3!');
ok(r[3][4].includes('479.42'),'sin(0.5) partial sum after 4 terms ≈ 479.426m: '+r[3][4]);
ok(/n$|µ$/.test(r[3][5]),'sin: error after 4 terms is tiny: '+r[3][5]);

set('fsel','exp');set('fx','1');set('fn','6');r=rows();
ok(r[5][4].startsWith('2.716'),'e^1 with 6 terms = 2.71667: '+r[5][4]);

set('fsel','tan');set('fx','pi/6');set('fn','20');r=rows();
ok(r.length===8,'tan is capped at 8 terms: '+r.length);

set('fsel','ln1p');set('fx','1.5');set('fn','3');
ok(!!d.querySelector('#fseries .warn'),'ln(1+x) at x=1.5 warns about convergence');
set('fx','0.5');
ok(!d.querySelector('#fseries .warn'),'no warning inside the radius');

set('fx','abc');
ok(d.getElementById('fseries').textContent.includes('Enter a real number'),'bad x gives a clear message');

ok(d.querySelectorAll('#fref .fgrp').length>=5,'reference groups: '+d.querySelectorAll('#fref .fgrp').length);
ok(d.getElementById('fref').textContent.includes('√π'),'Gaussian integral (√π) is listed');
ok(d.querySelectorAll('#fref code[data-t]').length>=40,'copyable formulas: '+d.querySelectorAll('#fref code[data-t]').length);

// switching back to the console works and the prompt still evaluates
[...d.querySelectorAll('#tabs button')].find(b=>b.dataset.tab==='console').click();
const inp=d.getElementById('inp');inp.value='2+3';
inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
ok(d.getElementById('log').textContent.includes('5'),'console still works after visiting Formulas');

ok(errors.length===0,'no script errors '+errors.join('; '));
console.log(fail?fail+' FAILED':'all passed');
process.exit(fail?1:0);
