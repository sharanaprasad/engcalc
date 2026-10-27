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
const run=s=>{inp.value=s;inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return log.lastElementChild.textContent.replace(/\s+/g,' ');};

// every welcome example runs without an error
const chipTexts=[...d.querySelectorAll('#log .banner .ex button')].map(b=>b.textContent);
let bad=[];
for(const c of chipTexts){const out=run(c);if(/✖|ERROR/.test(out))bad.push(c+' -> '+out.slice(0,80));}
ok(bad.length===0,'welcome examples all run ('+chipTexts.length+'): '+bad.join(' | '));


let r=run('diff(x^2*sin(x))');
ok(r.includes('2*x*sin(x) + x^2*cos(x)')&&r.includes('derivative with respect to x'),'diff shows the expression and a note: '+r);
r=run('integ(x*exp(x))');
ok(r.includes('x*exp(x) - exp(x) + C'),'integ shows + C: '+r);
r=run('integ(exp(-x^2), -inf, inf)');
ok(r.includes('1.77245'),'Gaussian integral = sqrt(pi): '+r);
ok(r.includes('numeric'),'numeric result is labelled');
r=run('integ(x^2, 0, 3)');
ok(r.includes('=9'),'exact definite integral has no numeric label: '+r);
r=run('diff(a*x^2)');
ok(r.includes('several variables'),'multi-variable asks for the variable');
r=run('d = diff(x^3)');
ok(r.includes('3*x^2'),'assigning a derivative keeps it symbolic: '+r);
run('x = 2');
r=run('d*10');
ok(r.includes('120'),'symbolic variable is usable numerically once x has a value: '+r);

// function drawer
const groups=[...d.querySelectorAll('#fgroups .fg, #fgroups [class*="grp"], #fgroups *')].map(e=>e.textContent);
ok(groups.some(t=>t.includes('Calculus')),'Calculus group in the function drawer');
const dbtn=[...d.querySelectorAll('#fgroups .fb')].find(b=>b.textContent==='diff');
ok(!!dbtn,'diff button exists');
dbtn.dispatchEvent(new w.Event('mouseenter'));
ok(d.getElementById('finfo').textContent.includes('diff(expr'),'diff info card shows its signature');

r=run('LT(t*exp(-2*t))');
ok(r.includes('1/(s + 2)^2'),'LT works in the console: '+r);
r=run('ILT(1/(s^2+3*s+2))');
ok(r.includes('exp(-t) - exp(-2*t)'),'ILT works in the console: '+r);
r=run('poles(1/(s^2+3*s+2))');
ok(r.includes('-1')&&r.includes('-2'),'poles works in the console: '+r);
ok(['LT','ILT','poles','delta','u'].every(n=>[...d.querySelectorAll('#fgroups .fb')].some(b=>b.textContent===n)),'LT, ILT, poles, delta and u are in the function drawer');
[...d.querySelectorAll('#tabs button')].find(b=>b.dataset.tab==='formulas').click();
ok(d.getElementById('fref').textContent.includes('Laplace transforms'),'Formulas tab has a Laplace transforms group');
ok(errors.length===0,'no script errors '+errors.join('; '));
console.log(fail?fail+' FAILED':'all passed');
process.exit(fail?1:0);
