// roots(), polynomial equations, numeric nonlinear solving, solve(eq, x, a, b), nonlinear systems
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const {execLine,fmtValue,CFG,STATE}=new Function(engine+';return {execLine,fmtValue,CFG,STATE};')();
let fail=0,total=0;
function reset(){CFG.mode='eng';CFG.digits=6;STATE.vars.clear();STATE.funcs.clear();STATE.solved.clear();STATE.ans=STATE.ans2=undefined;}
function run(line){const r=execLine(line);const it=r.items[r.items.length-1];if(!it)return '(nothing)';
  if(it.kind==='err')return 'ERR: '+it.msg;
  if(it.kind==='solve')return it.rows.map(x=>x.name+'='+fmtValue(x.v).text).join(', ');
  if(it.kind==='val'||it.kind==='assign')return fmtValue(it.v).text;
  return it.kind;}
function note(line){const r=execLine(line);const it=r.items[r.items.length-1];return (it&&(it.note||'')+' '+((it.warns||[]).join(' ')))||'';}
function t(line,exp){total++;const t0=Date.now();const got=run(line);const ms=Date.now()-t0;const ok=exp instanceof RegExp?exp.test(got):got===exp;
  if(!ok){fail++;console.log('BUG',JSON.stringify(line),'=>',JSON.stringify(got),'expected',String(exp));}
  if(ms>2500){fail++;console.log('SLOW',ms+'ms',line);}}
function near(name,want,tol){total++;const v=STATE.vars.get(name);const x=typeof v==='number'?v:NaN;
  if(!(Math.abs(x-want)<=(tol||1e-9)*(1+Math.abs(want)))){fail++;console.log('BUG value',name,'=',v,'expected',want);}}
reset();

// ---- roots()
t('roots(x^3 - 6*x^2 + 11*x - 6)','x1=1, x2=2, x3=3');
t('roots([1 -6 11 -6])','x1=1, x2=2, x3=3');
t('roots([1; -6; 11; -6])','x1=1, x2=2, x3=3');
t('roots((x-1)^3*(x+2))','x1=-2, x2=1, x3=1, x4=1');
t('roots(s^2+2*s+5)','s1=-1 + 2j, s2=-1 - 2j');
t('roots(x^4+1)',/^x1=-707\.107m \+ 707\.107m\*j, x2=-707\.107m - 707\.107m\*j, x3=707\.107m \+ 707\.107m\*j, x4=707\.107m - 707\.107m\*j$/);
t('roots([1 0 0 1])','x1=-1, x2=500m + 866.025m*j, x3=500m - 866.025m*j');
t('roots(2*x - 3)','x1=1.5');
t('roots(t^2 - 4, t)','t1=-2, t2=2');
t('R1 = 2.2k',  '2.2k');
t('roots(x^2 - R1)','x1=-46.9042, x2=46.9042');
t('roots(x^2*y - 1)',/ERR: roots\(\) needs a polynomial in x/);
t('roots(p1*q1 + q1)',/ERR: roots\(\) found several unknowns/);
t('roots(sin(x))',/ERR: roots\(\) needs a polynomial.*solve/);
t('roots(5)',/ERR: A constant has no roots/);
t('roots([1 2; 3 4])',/ERR: roots\(\[\.\.\.\]\) takes one row/);
t('roots(x^5 - x - 1)',/^x1=1\.1673, /);
near('x1',1.1673039782614187,1e-12);
// a polynomial typed as an equation gives every root
t('x^3 - 6*x^2 + 11*x - 6 = 0','x1=1, x2=2, x3=3');
t('x^3 = 8','x1=2, x2=-1 + 1.73205j, x3=-1 - 1.73205j');
t('(x-1)^2*(x+2) = 0','x1=-2, x2=1, x3=1');
t('x^2 - 3*x + 2 = 0','x1=2, x2=1');          // quadratic formula as before

// ---- one unknown, numeric
reset();
t('cos(x) = x','x=739.085m');near('x',0.7390851332151607);
t('exp(-x) = x','x=567.143m');near('x',0.5671432904097838);
t('sin(x) = 0.5','x1=-9.94838, x2=-5.75959, x3=-3.66519, x4=523.599m, x5=2.61799, x6=6.80678, x7=8.90118');
near('x4',Math.PI/6);
t('tan(x) = 0','x1=-9.42478, x2=-6.28319, x3=-3.14159, x4=0, x5=3.14159, x6=6.28319, x7=9.42478');   // the poles of tan are not roots
t('1/x = 2','x=500m');
t('cos(x) = 1','x1=-6.28319, x2=0, x3=6.28319');         // touching roots (no sign change)
t('x^x = 2','x=1.55961');
t('2^x = 1000','x=9.96578');
t('x^1000 = 2','x1=-1.00069, x2=1.00069');
t('ln(x) = 2','x=7.38906');
t('sqrt(x) = 3','x=9');
t('abs(x-3) = 1','x1=2, x2=4');
t('exp(x) = 1e6','x=13.8155');                             // outside -10..10: found by the wider scan
t('exp(x) = -1',/ERR: No real solution found/);
t('sin(x) = 2',/ERR: No real solution found/);
total++;if(!/roots outside -10/.test(note('sin(x) = 0.5'))){fail++;console.log('BUG: no note about roots outside the default range');}
// ---- solve(...) with a range / variable
reset();
t('solve(cos(x) = x)','x=739.085m');
t('solve(x*exp(x) = 2, x, 0, 5)','x=852.606m');
t('solve(sin(x) = 0.5, x, 0, 10)','x1=523.599m, x2=2.61799, x3=6.80678, x4=8.90118');
t('solve(tan(x) = 1, 0, 3)','x=785.398m');
t('solve(x^2 = 2, x, 0, 10)','x=1.41421');                 // a range keeps only the roots inside it
t('solve(x^2 - 2, 10, 0)','x=1.41421');                    // ends in either order
t('solve(x^3 - x)','x1=-1, x2=0, x3=1');                   // no '=' means = 0
t('solve(1e6*(x-1)^2, x, 0, 3)','x=1');
t('solve(sin(x) = 0.5, x, 0, 200)',/^x1=523\.599m.*x20=/);
total++;if(!/first 20 of 64/.test(note('solve(sin(x) = 0.5, x, 0, 200)'))){fail++;console.log('BUG: too many roots not capped',note('solve(sin(x) = 0.5, x, 0, 200)'));}
t('solve(cos(x)=x, y)',/ERR: 'y' does not appear/);
t('solve(x, 2, 2)',/ERR: The range is empty/);
t('solve(x, 0, abc)',/ERR/);
t('solve()',/ERR: Usage/);
t('solve(a, b, c, d, e)',/ERR: solve\(\) takes at most 4/);
t('solve(x^2+y^2=4)',/ERR: 1 equation\(s\) but 2 unknown/);
t('y = solve(x = 1)',/ERR/);
t('solve 2*x+y=5; x-y=1','x=2, y=1');                     // command form unchanged

// ---- nonlinear systems
reset();
t('x^2 + y^2 = 4; x*y = 1','x1=-1.93185, y1=-517.638m, x2=-517.638m, y2=-1.93185, x3=517.638m, y3=1.93185, x4=1.93185, y4=517.638m');
t('x^2+y^2 = 1; x = y',/ERR: Unknown name 'y'.*start the line with  eq:/);   // a plain name on the left is always an assignment
t('eq: x^2+y^2 = 1; x = y','x1=-707.107m, y1=-707.107m, x2=707.107m, y2=707.107m');
t('eq x,y: x^2+y^2 = 1; x = y','x1=-707.107m, y1=-707.107m, x2=707.107m, y2=707.107m');
t('x = y',/ERR: Unknown name 'y'.*eq: x = y/);
t('eq: x = y',/ERR: 1 equation\(s\) but 2 unknown.*eq x: \.\.\./);
t('y = 3','3');t('x = y','3');                             // y defined: assignment
t('eq x: x = y + 1','x=4');
t('x = 5; eq: x = 2*x - 3','x=3');
t('eq: cos(x) = x','x=739.085m');
t('eq:',/ERR: Usage:  eq: x = y/);
t('eq: 2*x',/needs exactly one '='/);
t('eq1 = 4','4');t('eq1*2','8');                          // names starting with eq still work
t('k1 = 2; eq: z1 = k1 + 1','z1=3');                        // eq: on one statement of a line
reset();
t('solve x,y: x^2 + y = 3; x - y^2 = 1','x1=1.51155, y1=715.225m, x2=2, y2=-1');
t('sin(x)+y = 1; x - y = 0','x=510.973m, y=510.973m');
t('exp(x)+y=0; x+y=5',/ERR: No real solution found with Newton/);
t('x+y=3; x-y=1','x=2, y=1');                              // linear stays exact
// ---- equations with integrals: the integration variable is bound; slow equations stay within a time budget
reset();
t('solve(integ(sin(t),t,0,x) = 1, x, 0, 3)','x=1.5708');
t('x*integ(t,t,0,1) = 2','x=4');
{const t0=Date.now();t('integ(exp(-t^2), t, 0, x) = 0.5','x=551.039m');
 total++;if(Date.now()-t0>6000){fail++;console.log('BUG: slow equation took',Date.now()-t0,'ms');}}

// ---- definitions are still definitions
reset();
t('g(x) = x^2','def');
t('g(3)','9');
t('R = 10; x*R = 5','x=500m');

console.log(fail?fail+' failed of '+total:'all '+total+' passed');
