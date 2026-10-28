// LT / ILT / poles / zeros: every result is verified against a direct numerical integral or the denominator itself
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const api=new Function(engine+';return {execLine,fmtValue,CFG,STATE,ev,parseExpr,symPrint,U,Sym,Mat,numIntegrate,symRat,plEval,plTrim,FUNCS};')();
const {execLine,fmtValue,CFG,STATE,ev,parseExpr,symPrint,U,Sym,Mat,numIntegrate,symRat,plEval,plTrim}=api;
let fail=0,total=0;
function reset(){CFG.deg=false;CFG.mode='eng';CFG.digits=6;STATE.vars.clear();STATE.funcs.clear();STATE.solved.clear();STATE.ans=STATE.ans2=undefined;}
function last(line){const r=execLine(line);return r.items[r.items.length-1];}
function text(line){const it=last(line);if(!it)return 'NOITEM';if(it.kind==='err')return 'ERR: '+it.msg;if(it.kind==='val'||it.kind==='assign')return fmtValue(it.v).text;if(it.kind==='solve')return it.rows.map(r=>r.name+' = '+fmtValue(r.v).text).join(', ');if(it.kind==='def')return 'DEF '+it.name;return it.kind;}
function t(line,exp){total++;const got=text(line);const ok=exp instanceof RegExp?exp.test(got):got===exp;if(!ok){fail++;console.log('FAIL',JSON.stringify(line),'=>',JSON.stringify(got),'expected',exp);}}
const close=(a,b,tol)=>Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b));
const nodeAt=(ast,vars)=>U(ev(ast,new Map(Object.entries(vars))));
reset();

// ---- exact strings
t('LT(1)','1/s');
t('LT(t)','1/s^2');
t('LT(t^3)','6/s^4');
t('LT(exp(-2*t))','1/(s + 2)');
t('LT(sin(3*t))','3/(s^2 + 9)');
t('LT(cos(2*t))','s/(s^2 + 4)');
t('LT(t*exp(-2*t))','1/(s + 2)^2');
t('LT(exp(-2*t)*sin(3*t))','3/((s + 2)^2 + 9)');
t('LT(t*sin(3*t))','6*s/(s^2 + 9)^2');
t('LT(delta(t-2))','exp(-2*s)');
t('LT(u(t-3))','exp(-3*s)/s');
t('LT(3*delta(t))','3');
t('LT(u(t-2)*exp(-(t-2)))','exp(-2*s)/(s + 1)');
t('ILT(1/(s^2+3*s+2))','exp(-t) - exp(-2*t)');
t('ILT(1/(s+2)^3)','t^2*exp(-2*t)/2');
t('ILT(3/(s^2+9))','sin(3*t)');
t('ILT(1/(s^2*(s+1)))','t + exp(-t) - 1');
t('ILT(1/(s+1)+2)','2*delta(t) + exp(-t)');
t('ILT((s+1)/(s^2+2*s+5))','exp(-t)*cos(2*t)');
t('ILT(1/(s^2+1)*exp(-s))','sin(t - 1)*u(t - 1)');
t('ILT(LT(t^2*exp(-3*t)))','t^2*exp(-3*t)');
t('poles(1/(s^2+3*s+2))','p1 = -1, p2 = -2');
t('poles((s+1)/(s^2+3*s+2))','p1 = -2');
t('zeros((s+1)/(s^2+3*s+5))','z1 = -1');
t('zeros((s+1)/(s^2+3*s+2))',/No finite zeros/);   // the zero cancels the pole at -1
t('zeros((s-2)*(s+5)/(s^2+1))','z1 = 2, z2 = -5');
t('poles(1/(s+1)^3)','p1 = -1, p2 = -1, p3 = -1');
t('poles(1/(s^2+2*s+5))','p1 = -1 + 2j, p2 = -1 - 2j');
t('poles(LT(exp(-t)*sin(2*t)))','p1 = -1 + 2j, p2 = -1 - 2j');
t('poles(1/(s*(s+1)*(s+2)*(s+3)*(s+4)))','p1 = 0, p2 = -1, p3 = -2, p4 = -3, p5 = -4');
t('zeros(2,3)','[0 0 0; 0 0 0]');
t('zeros(3)','[0 0 0; 0 0 0; 0 0 0]');

// ---- forward transform vs direct numerical integral  F(s) = integral f(t) exp(-s t) dt
const fwd=[['1',[1,2.5]],['t',[1,2.5]],['t^3',[1,2.5]],['exp(-2*t)',[0,1.5]],['exp(0.5*t)',[1.5,3]],['sin(3*t)',[0.5,2]],['cos(2*t)',[0.5,2]],['sinh(t)',[1.5,3]],['cosh(2*t)',[2.5,4]],['t*exp(-2*t)',[0,2]],['exp(-2*t)*sin(3*t)',[0,2]],['t*sin(3*t)',[0.5,2]],['t^2*exp(-t)',[0,2]],['5*exp(-t)+3*t',[0.5,2]],['sin(2*t+1)',[0.5,2]],['cos(3*t-0.5)',[0.5,2]],['exp(-t)*cos(2*t)',[0,2]],['t*cos(t)',[0.5,2]],['t^3*exp(-3*t)',[0,2]],['1-exp(-t)',[0.5,2]],['2*exp(-t)*sin(t+0.3)',[0,2]],['t^2*cos(2*t)',[0.5,2]],['exp(-t)*t*cosh(t)',[1.5,3]],['7',[1,2]],['3*t^2-2*t+1',[1,2]]];
for(const [f,ss] of fwd){
  total++;
  const it=last('LT('+f+')');
  if(it.kind==='err'){fail++;console.log('FAIL LT('+f+')',it.msg);continue;}
  const G=it.v.ast,fa=parseExpr(f);
  for(const s of ss){
    const num=numIntegrate(x=>nodeAt(fa,{t:x})*Math.exp(-s*x),0,60),sym=nodeAt(G,{s});
    if(!close(num,sym,1e-6)){fail++;console.log('FAIL LT('+f+') at s='+s+': symbolic '+sym+' ('+symPrint(G)+') numeric '+num);break;}
  }
}
// delays (discontinuous integrands, looser tolerance)
for(const [f,ss] of [['u(t-3)',[1,2]],['u(t-2)*exp(-(t-2))',[0.5,2]],['u(t-1)*sin(t-1)',[0.5,2]],['u(t-1)*(t-1)^2',[1,2]],['u(t-2)*t',[1,2]],['exp(-t)*u(t-1)',[0.5,2]]]){
  total++;
  const it=last('LT('+f+')');
  if(it.kind==='err'){fail++;console.log('FAIL LT('+f+')',it.msg);continue;}
  const G=it.v.ast,fa=parseExpr(f);
  for(const s of ss){
    const num=numIntegrate(x=>nodeAt(fa,{t:x})*Math.exp(-s*x),0,60),sym=nodeAt(G,{s});
    if(!close(num,sym,1e-5)){fail++;console.log('FAIL LT('+f+') at s='+s+': symbolic '+sym+' ('+symPrint(G)+') numeric '+num);break;}
  }
}

// ---- inverse transform: the time function, transformed numerically, must give F(s) back
const inv=['1/(s+1)','1/(s^2+3*s+2)','3/(s^2+9)','1/(s*(s^2+4))','(s+1)/(s^2+2*s+5)','1/(s^2*(s+1))','1/(s+2)^3','(s^2+1)/(s*(s+1)*(s+2))','1/(s^3+6*s^2+11*s+6)','(s+3)/((s+1)*(s+2)^2)','1/(s^2+2*s+5)','1/(s^2+1)^2','s/(s^2+4)^2','1/(s^4+5*s^2+4)','1/(s*(s+1)*(s+2)*(s+3)*(s+4))','100/(s^2+10*s+100)','1/(s*(s^2+s+1))','(2*s+3)/(s^2+4*s+13)','10/(s*(s+10))','1/((s+1)^2*(s+2)^2)','1/(s^2+0.2*s+1)','(s+5)/(s^2+6*s+25)','1/(s+0.5)','s/(s+1)^2','1/(s^3)','1/(s^2+1)^3'];
for(const F of inv){
  total++;
  const it=last('ILT('+F+')');
  if(it.kind==='err'){fail++;console.log('FAIL ILT('+F+')',it.msg);continue;}
  const g=it.v.ast,Fa=parseExpr(F);
  for(const s of [1.7,3.2]){
    const num=numIntegrate(x=>nodeAt(g,{t:x})*Math.exp(-s*x),0,60),want=nodeAt(Fa,{s});
    if(!close(num,want,1e-6)){fail++;console.log('FAIL ILT('+F+') at s='+s+': '+symPrint(g)+' transforms to '+num+' but F(s) = '+want);break;}
  }
}
// delayed inverse transforms
for(const F of ['exp(-s)/(s+1)','exp(-2*s)/(s^2+1)','exp(-s)/s^2','1/(s+1)+exp(-3*s)/(s+2)']){
  total++;
  const it=last('ILT('+F+')');
  if(it.kind==='err'){fail++;console.log('FAIL ILT('+F+')',it.msg);continue;}
  const g=it.v.ast,Fa=parseExpr(F);
  for(const s of [1.7,3.2]){
    const num=numIntegrate(x=>nodeAt(g,{t:x})*Math.exp(-s*x),0,80),want=nodeAt(Fa,{s});
    if(!close(num,want,1e-5)){fail++;console.log('FAIL ILT('+F+') at s='+s+': '+symPrint(g)+' -> '+num+' vs '+want);break;}
  }
}

// ---- poles / zeros really are roots of the denominator / numerator
for(const F of ['1/(s^2+3*s+2)','(s+1)/(s^2+3*s+2)','1/(s^3+3*s^2+3*s+1)','1/(s^4+5*s^2+4)','(s^2+2*s+5)/(s*(s+3)*(s^2+4))','1/(s^5+1)','(s-1)*(s+7)/((s+2)^3*(s^2+2*s+10))','1/(s^6+6*s^5+15*s^4+20*s^3+15*s^2+6*s+1)']){
  total++;
  const P=last('poles('+F+')'),Z=last('zeros('+F+')');
  if(P.kind==='err'){fail++;console.log('FAIL poles('+F+')',P.msg);continue;}
  const r=symRat(parseExpr(F),'s'),D=plTrim(r.D),N=plTrim(r.N);
  let bad='';
  const mag=x=>x&&x.re!==undefined?Math.hypot(x.re,x.im):Math.abs(x);
  const resid=(c,p)=>{const v=plEval(c,p),sc=c.reduce((a,co,k)=>a+Math.abs(co)*Math.pow(Math.max(1,mag(p)),k),0);return mag(v)/sc;};
  P.rows.map(r=>r.v).forEach(p=>{if(!(resid(D,p)<=1e-6))bad+=' pole '+JSON.stringify(p)+' residual '+resid(D,p);});
  if(Z.kind!=='err'&&N.length>1)Z.rows.map(r=>r.v).forEach(z=>{if(!(resid(N,z)<=1e-6))bad+=' zero '+JSON.stringify(z)+' residual '+resid(N,z);});
  if(bad){fail++;console.log('FAIL poles/zeros of '+F+':'+bad);}
}

// ---- notation: transfer functions as functions, Sym variables, defined component values
reset();
t('H(s)=1/(s^2+s+1)','DEF H');
t('poles(H(s))','p1 = -500m + 866.025m*j, p2 = -500m - 866.025m*j');
total++;{const it=last('ILT(H(s)/s)');const g=it.v.ast,s=2.3;const num=numIntegrate(x=>nodeAt(g,{t:x})*Math.exp(-s*x),0,60);if(!close(num,1/(s*(s*s+s+1)),1e-6)){fail++;console.log('FAIL step response of H');}}
t('H1(s)=1/(s^2+s+1)','DEF H1');
t('poles(H1)','p1 = -500m + 866.025m*j, p2 = -500m - 866.025m*j');
t('p1','-500m + 866.025m*j');
t('p1*p2','1');   // the product of the poles of s^2+s+1
t('poles(H1(s))','p1 = -500m + 866.025m*j, p2 = -500m - 866.025m*j');
t('ILT(H1/s)',/exp\(-t\/2\)/);
t('F2(x)=x^2','DEF F2');
t('diff(F2)','2*x');
t('integ(F2)','x^3/3');
t('LT(F2(t))','2/s^3');
t('G1 = LT(exp(-t))','1/(s + 1)');
t('poles(G1)','p1 = -1');
t('R1 = 2.2k','2.2k');
t('C1 = 1u','1µ');
t("poles(1/(R1*C1*s+1))",/^p1 = -454.5/);
t('3s',/Write 3\*s/);   // explicit-*
t('5ms','5m');
t('s = 2','2');
t('3*s','6');t('3s',/Write 3\*s/);   // explicit-*
reset();
// ---- u / delta numerics and calculus
t('u(-1)','0');t('u(0)','1');t('u(2.5)','1');t('delta(1)','0');
t('diff(u(t))','delta(t)');
t('integ(delta(t-2))','u(t - 2)');
t('integ(u(t))','t*u(t)');
// ---- errors
t('LT(sin(t)^2)',/no rule/);
t('LT(ln(t))',/no rule/);
t('ILT(1/(s+Q9))',/numeric coefficients/);
t('poles(1/(s+Q9))',/numeric coefficients/);
t('ILT(s^2/(s+1))',/derivatives of delta/);
t('poles(5)',/No finite poles/);
t('zeros(1/(s+1))',/No finite zeros/);
t('LT(t, t, t)',/different names/);
console.log(fail?fail+' FAILED of '+total:'all '+total+' passed');
process.exit(fail?1:0);
