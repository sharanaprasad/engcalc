// diff() / integ(): every symbolic result is checked numerically, not just by string
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const api=new Function(engine+';return {execLine,fmtValue,CFG,STATE,ev,parseExpr,symPrint,U,serializeState,loadState,Sym,FUNCS};')();
const {execLine,fmtValue,CFG,STATE,ev,parseExpr,symPrint,U,Sym}=api;
let fail=0,total=0;
function reset(){CFG.deg=false;CFG.mode='eng';CFG.digits=6;STATE.vars.clear();STATE.funcs.clear();STATE.solved.clear();STATE.ans=STATE.ans2=undefined;}
function last(line){const r=execLine(line);return r.items[r.items.length-1];}
function text(line){const it=last(line);if(!it)return 'NOITEM';if(it.kind==='err')return 'ERR: '+it.msg;if(it.kind==='val'||it.kind==='assign')return fmtValue(it.v).text+(it.v instanceof Sym&&it.v.c?' + C':'');if(it.kind==='def')return 'DEF '+it.name;return it.kind;}
function t(line,exp){total++;const got=text(line);const ok=exp instanceof RegExp?exp.test(got):got===exp;if(!ok){fail++;console.log('FAIL',JSON.stringify(line),'=>',JSON.stringify(got),'expected',exp);}}
const at=(ast,x,v)=>{const m=new Map([[x,v]]);return U(ev(ast,m));};
const close=(a,b,tol)=>Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b));
function checkDiff(expr,pts,x){
  x=x||'x';total++;
  const it=last('diff('+expr+', '+x+')');
  if(it.kind==='err'){fail++;console.log('FAIL diff('+expr+')',it.msg);return;}
  const d=it.v.ast,f=parseExpr(expr),h=1e-6;
  const reparsed=parseExpr(symPrint(d));
  for(const p of pts){
    const num=(at(f,x,p+h)-at(f,x,p-h))/(2*h),sym=at(d,x,p),rt=at(reparsed,x,p);
    if(!close(num,sym,1e-5)||!close(sym,rt,1e-9)){fail++;console.log('FAIL diff('+expr+') at '+p+': symbolic '+sym+' ('+symPrint(d)+') numeric '+num+' round-trip '+rt);return;}
  }
}
function checkInteg(expr,pts,x){
  x=x||'x';total++;
  const it=last('integ('+expr+', '+x+')');
  if(it.kind==='err'){fail++;console.log('FAIL integ('+expr+')',it.msg);return;}
  const F=it.v.ast,f=parseExpr(expr),h=1e-6;
  const reparsed=parseExpr(symPrint(F));
  for(const p of pts){
    const num=(at(F,x,p+h)-at(F,x,p-h))/(2*h),want=at(f,x,p),rt=at(reparsed,x,p),sym=at(F,x,p);
    if(!close(num,want,1e-5)||!close(sym,rt,1e-9)){fail++;console.log('FAIL integ('+expr+') at '+p+': d/dx of '+symPrint(F)+' = '+num+' but integrand = '+want);return;}
  }
}
const P=[0.3,0.7,1.3,2.1],PS=[0.1,0.25,0.4,0.6];
reset();
// ---- exact strings for the canonical cases
t('diff(x^2)','2*x');
t('diff(x^3, x, 2)','6*x');
t('diff(x^2*sin(x))','2*x*sin(x) + x^2*cos(x)');
t('diff(sin(x)/x)','(cos(x)*x - sin(x))/x^2');
t('diff(exp(2*x))','2*exp(2*x)');
t('diff(ln(x^2+1))','2*x/(x^2 + 1)');
t('diff(atan(x))','1/(x^2 + 1)');
t('diff(5)','0');
t('integ(x^2)','x^3/3 + C');
t('integ(x)','x^2/2 + C');
t('integ(1/x)','ln(abs(x)) + C');
t('integ(sin(x))','-cos(x) + C');
t('integ(x*exp(x))','x*exp(x) - exp(x) + C');
t('integ(1/(x^2+1))','atan(x) + C');
t('integ(1/(x^2+4))','atan(x/2)/2 + C');
t('integ(x*exp(x^2))','exp(x^2)/2 + C');
t('integ(sin(x)*cos(x))','sin(x)^2/2 + C');
t('integ(3*x^2+2*x+1)','x^3 + x^2 + x + C');
t('integ(1/sqrt(1-x^2))','asin(x) + C');
t('integ(exp(-2*x))','-exp(-2*x)/2 + C');
// ---- variable handling
t('diff(R1*x^2)',/found several variables \(R1, x\)/);
t('diff(R1*x^2, x)','2*R1*x');
t('diff(R1*x^2, R1)','x^2');
t('diff(x^2, 3)',/must be a plain name/);
t('integ(R1*x, x)','R1*x^2/2 + C');
t('integ(sin(x)/x)',/no closed form/);
t('diff(x^2, x, 99)',/order must be/);
// ---- numeric verification of derivatives
['x^3','x^2*sin(x)','sin(x)/x','exp(2*x)','exp(-x^2)','ln(x^2+1)','sqrt(x)','1/x','x^x','tan(x)','x*cos(x)^2','atan(x)','sinh(x)*cosh(x)','2^x','x^2.5','1/(1+x^2)','(x+1)^3','sin(x)*exp(-x)','x*ln(x)','sqrt(1+x^2)','log10(x)','log2(x)','cbrt(x)','(x^2+1)/(x-5)','abs(x-1)','exp(sin(x))','sin(cos(x))','x/(x^2+1)','pow(x,3)','log(x,2)'].forEach(e=>checkDiff(e,P));
['asin(x)','acos(x)','atanh(x)','sqrt(1-x^2)'].forEach(e=>checkDiff(e,PS));
execLine('R1=2');execLine('R2=3');
checkDiff('R1*t^3+R2*t',P,'t');
// ---- numeric verification of antiderivatives
['x^2','x^5','sqrt(x)','1/x^2','1/x','2*x+3','(x+1)^2','(2*x+1)^3','sin(x)','cos(3*x+1)','exp(2*x)','exp(-x)','e^x','e^(2*x+1)','2^x','sinh(x)','cosh(2*x)','tan(x)','x*exp(x)','x^2*exp(-x)','x^3*exp(2*x)','x*sin(x)','x*cos(2*x)','x^2*sin(x)','x^2*cos(3*x)','x*sinh(x)','ln(x)','x*ln(x)','x^2*ln(x)','sin(x)^2','cos(2*x)^2','1/cos(x)^2','1/(x^2+1)','1/(x^2+4)','1/(x^2+2*x+5)','1/(x^2-1)','1/(x^2-5*x+6)','x/(x^2+1)','(2*x+3)/(x^2+4*x+5)','x*exp(x^2)','x*cos(x^2)','sin(x)*cos(x)','cos(x)/sin(x)','1/(x*ln(x))','x/sqrt(x^2+1)','1/sqrt(x^2+4)','sqrt(2*x+1)','ln(2*x+3)','3*sin(2*x)+x^2','exp(sin(x))*cos(x)','x^2*(x+1)','(x+1)*(x+2)','1/(2*x+1)','1/(3*x+2)^2'].forEach(e=>checkInteg(e,P));
['asin(x)','acos(x)','atan(x)','1/sqrt(1-x^2)'].forEach(e=>checkInteg(e,PS));
checkInteg('1/sqrt(1-4*x^2)',[0.1,0.2,0.3,0.4]);
checkInteg('R1*t^2+R2',P,'t');
// ---- definite integrals
const near=(line,want,tol)=>{total++;const it=last(line);if(it.kind==='err'){fail++;console.log('FAIL',line,it.msg);return;}const v=U(it.v);if(!close(v,want,tol||1e-8)){fail++;console.log('FAIL',line,'=>',v,'expected',want);}};
near('integ(x^2, x, 0, 3)',9);
near('integ(x^2, 0, 3)',9);
near('integ(sin(x), 0, pi)',2);
near('integ(1/x, 1, e)',1);
near('integ(exp(-x^2), -inf, inf)',Math.sqrt(Math.PI),1e-9);
near('integ(exp(-x^2), 0, inf)',Math.sqrt(Math.PI)/2,1e-9);
near('integ(1/(1+x^2), 0, inf)',Math.PI/2,1e-9);
near('integ(1/sqrt(x), 0, 1)',2,1e-8);
near('integ(sin(x)/x, 0, pi)',1.8519370519824662,1e-9);
near('integ(x*exp(-x), 0, inf)',1,1e-9);
near('integ(exp(-x), x, 0, inf)',1,1e-9);
near('integ(ln(x), 0, 1)',-1,1e-8);
near('integ(x^2, 3, 0)',-9);
near('integ(sin(x)^2, 0, 2*pi)',Math.PI,1e-9);
near('integ(cos(x)*exp(-x), 0, inf)',0.5,1e-9);
t('integ(1/x^2, -1, 1)',/singularity|not finite/i);
t('integ(x^2, x, 0, 1)','333.333m');
// ---- user functions, ans and variables
reset();
t('F1(x)=x^3','DEF F1');
t('diff(F1(x))','3*x^2');
t('integ(F1(x))','x^4/4 + C');
t('integ(F1(x), 0, 2)','4');
t('G1(x)=diff(F1(x))','DEF G1');
t('G1(2)','12');
t('H1(x)=diff(sin(x)*F1(x))','DEF H1');
total++;{const v=U(ev(parseExpr('H1(1)'),null));if(!close(v,Math.cos(1)+3*Math.sin(1),1e-9)){fail++;console.log('FAIL H1(1)',v);}}
t('d1 = diff(x^2*exp(x))','2*x*exp(x) + x^2*exp(x)');
t('d1','2*x*exp(x) + x^2*exp(x)');
t('x = 2','2');
total++;{const v=U(ev(parseExpr('d1'),null));if(!close(v,8*Math.exp(2),1e-9)){fail++;console.log('FAIL numeric use of symbolic d1',v);}}
t('diff(x^3)*2','24');
reset();
t('diff(x^2)','2*x');
t('ans*3',/ERR: Can't evaluate the symbolic result/);
// ---- persistence of symbolic variables
reset();
t('d2 = diff(sin(x)*x)','cos(x)*x + sin(x)');
const saved=api.serializeState();
STATE.vars.clear();
api.loadState({vars:saved.vars});
t('d2','cos(x)*x + sin(x)');
console.log(fail?fail+' FAILED of '+total:'all '+total+' passed');
process.exit(fail?1:0);
