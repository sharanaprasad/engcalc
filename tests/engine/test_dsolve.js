// dsolve(): linear ODEs with constant coefficients by Laplace transform. Each solution is also checked
// by putting it back into the equation (symbolic derivatives, several times) and against the initial conditions.
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const {execLine,fmtValue,CFG,STATE,parseExpr,ev,U,Sym,symD,latexText}=new Function(engine+';return {execLine,fmtValue,CFG,STATE,parseExpr,ev,U,Sym,symD,latexText};')();
let fail=0,total=0;
function reset(){CFG.mode='eng';CFG.digits=6;STATE.vars.clear();STATE.funcs.clear();STATE.solved.clear();STATE.ans=STATE.ans2=undefined;}
function item(line){const r=execLine(line);return r.items[r.items.length-1];}
function run(line){const it=item(line);if(!it)return '(nothing)';
  if(it.kind==='err')return 'ERR: '+it.msg;
  if(it.kind==='val')return (it.label?it.label+' = ':'')+fmtValue(it.v).text;
  return it.kind;}
function t(line,exp){total++;const got=run(line);const ok=exp instanceof RegExp?exp.test(got):got===exp;
  if(!ok){fail++;console.log('BUG',JSON.stringify(line),'=>',JSON.stringify(got),'expected',String(exp));}}
/* solve, then check: sum a_k y^(k)(t) = f(t) at t > 0, and y^(i)(0) = ic[i] */
function check(line,coef,f,ic,tv){
  total++;tv=tv||'t';
  const it=item(line);
  if(!it||!(it.v instanceof Sym)){fail++;console.log('BUG not solved',line,it&&it.msg);return;}
  const ders=[it.v.ast];for(let k=1;k<coef.length;k++)ders.push(symD(ders[k-1],tv));
  for(const x of [0.31,0.97,1.73,3.2]){
    const sc=new Map([[tv,x]]);
    const lhs=coef.reduce((s,a,k)=>s+a*U(ev(ders[k],sc)),0),rhs=U(ev(parseExpr(f),sc));
    if(!(Math.abs(lhs-rhs)<=1e-8*Math.max(1,Math.abs(rhs)))){fail++;console.log('BUG equation not satisfied',line,'at',x,lhs,rhs);return;}
  }
  ic.forEach((v,i)=>{const got=U(ev(ders[i],new Map([[tv,0]])));if(!(Math.abs(got-v)<=1e-9*Math.max(1,Math.abs(v)))){fail++;console.log('BUG initial condition',i,line,got,'vs',v);}});
}
reset();

// ---- answers
t("dsolve(y' + 2*y = 0, y(0)=5)",'y(t) = 5*exp(-2*t)');
t("dsolve(y'' + y = 0, y(0)=1, y'(0)=0)",'y(t) = cos(t)');
t("dsolve(y' + y = 1)",'y(t) = 1 - exp(-t)');
t("dsolve(y'' + 3*y' + 2*y = u(t), y(0)=0, y'(0)=0)",'y(t) = 0.5 + exp(-2*t)/2 - exp(-t)');
t("dsolve(y'' + 4*y = sin(2*t), y(0)=0, y'(0)=0)",'y(t) = sin(2*t)/8 - t*cos(2*t)/4');       // resonance
t("dsolve(y' = -y + exp(-t), y(0)=0)",'y(t) = t*exp(-t)');                                    // repeated pole
t("dsolve(y'' = 9.81)",'y(t) = 4.905*t^2');
t("dsolve(y''' - y = 0, y(0)=1, y'(0)=1, y''(0)=1)",'y(t) = exp(t)');
t("dsolve(y' + y = delta(t))",'y(t) = exp(-t)');
t("dsolve(y' + y = u(t-2))",/^y\(t\) = u\(t - 2\) - u\(t - 2\)\*exp\(-t \+ 2\)$/);
t("dsolve(x'' + x = cos(s))",'x(s) = s*sin(s)/2');                                           // other names, s as time
t("dsolve(y' + y = sin(x))",'y(x) = exp(-x)/2 - cos(x)/2 + sin(x)/2');
t('R1 = 1k; C1 = 1u','assign');
t("dsolve(R1*C1*v' + v = 5*u(t), v(0)=0)",'v(t) = 5 - 5*exp(-1000*t)');
// the answer is stored as a function
t('v(1m)','3.1606');
t("dsolve(y' + 2*y = 0, y(0)=5)",'y(t) = 5*exp(-2*t)');
t('y(1)','676.676m');
t('plot(y(t), t, 0, 5)','plot');
total++;if(!/assumed/.test(fmtValue(item("dsolve(y' + y = 1)").v).alt||'')){fail++;console.log('BUG: no note about assumed initial conditions');}

// ---- the solutions satisfy the equations
reset();
check("dsolve(y'' + 3*y' + 2*y = 1, y(0)=1, y'(0)=-2)",[2,3,1],'1',[1,-2]);
check("dsolve(y'' + 2*y' + 5*y = exp(-t), y(0)=0, y'(0)=1)",[5,2,1],'exp(-t)',[0,1]);
check("dsolve(2*y'' - 3*y' + y = t^2, y(0)=2, y'(0)=0)",[1,-3,2],'t^2',[2,0]);
check("dsolve(y'''' - y = 0, y(0)=1, y'(0)=0, y''(0)=-1, y'''(0)=0)",[-1,0,0,0,1],'0',[1,0,-1,0]);
check("dsolve(y'' + 9*y = cos(3*t), y(0)=1, y'(0)=0)",[9,0,1],'cos(3*t)',[1,0]);
check("dsolve(y' - 3*y = t*exp(3*t), y(0)=1)",[-3,1],'t*exp(3*t)',[1]);
check("dsolve(y'' + y' = sin(t), y(0)=0, y'(0)=0)",[0,1,1],'sin(t)',[0,0]);
check("dsolve(i'' + 4*i' + 13*i = 26, i(0)=0, i'(0)=0)",[13,4,1],'26',[0,0]);

// ---- regression: sums of fractions sharing a pole used a product denominator ((s+1)^5 instead of (s+1)^3) and ILT went wrong
t('ILT(1/(2*(s+1)^3) - s/(s+1)^2)','= -exp(-t) + t*exp(-t) + t^2*exp(-t)/4'.slice(2));
t('ILT(1/(s^2+1) + s/(s^2+1)^2)','sin(t) + t*sin(t)/2');
t('poles(1/(s+1)^2 + 1/(s+1))','solve');
total++;{const r=execLine('poles(1/(s+1)^2 + 1/(s+1))').items[0];if(!r.rows||r.rows.length!==2){fail++;console.log('BUG: expected 2 poles, got',r.rows&&r.rows.length);}}
check("dsolve(2*y'' + 4*y' + 2*y = exp(-t), y(0)=-1, y'(0)=2)",[2,4,2],'exp(-t)',[-1,2]);
check("dsolve(y'' + 5*y' + 4*y = t*exp(-t), y(0)=1, y'(0)=0)",[4,5,1],'t*exp(-t)',[1,0]);

// ---- errors
t("dsolve(y'*y = 1)",/ERR: dsolve\(\) handles linear equations/);
t("dsolve(t*y' + y = 0)",/ERR: dsolve\(\) needs constant coefficients/);
t("dsolve(y' + a2*y = 0)",/ERR: dsolve\(\): 'a2' has no value/);
t('dsolve(y + 2 = 3)',/ERR: No derivative found/);
t("dsolve(y' + y = 1, y(1)=0)",/ERR: Initial conditions must be at t = 0/);
t("dsolve(y' + y = 1, y'(0)=0)",/ERR: y'\(0\) is not needed for an order-1 equation/);
t("dsolve(y' + y = 1, z(0)=1)",/ERR: Initial conditions look like/);
t("dsolve(y'' + 3*y' + 2*y = 1, y(0)=1, y(0)=2)",/ERR: y\(0\) is given twice/);
t("dsolve(y' + y = tan(t))",/ERR: dsolve\(\): no Laplace rule/);
t("dsolve(y' - y' = 1)",/ERR: That is not a differential equation/);
t("dsolve(y' + x' = 1)",/ERR: dsolve\(\) solves one equation in one unknown function/);
t('dsolve()',/ERR: Usage/);
t("w = dsolve(y' = 1)",/ERR/);

// ---- LaTeX
total++;{const s=latexText("dsolve(y'' + 3*y' + 2*y = u(t), y(0)=0, y'(0)=0)");if(s!=="y'' + 3y' + 2y = u(t),\\quad y(0) = 0,\\quad y'(0) = 0"){fail++;console.log('BUG latex',s);}}
total++;{const s=latexText("A'");if(s!=='A^{\\mathsf{T}}'){fail++;console.log('BUG latex transpose',s);}}

console.log(fail?fail+' failed of '+total:'all '+total+' passed');
