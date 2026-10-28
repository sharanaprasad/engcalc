// expand, factor, simplify, limit, series, sum (+ exact constant recognition); every symbolic result is also checked numerically
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const {execLine,fmtValue,CFG,STATE,parseExpr,ev,U,Sym,latexText}=new Function(engine+';return {execLine,fmtValue,CFG,STATE,parseExpr,ev,U,Sym,latexText};')();
let fail=0,total=0;
function reset(){CFG.mode='eng';CFG.digits=6;STATE.vars.clear();STATE.funcs.clear();STATE.solved.clear();STATE.ans=STATE.ans2=undefined;}
function item(line){const r=execLine(line);return r.items[r.items.length-1];}
function run(line){const it=item(line);if(!it)return '(nothing)';
  if(it.kind==='err')return 'ERR: '+it.msg;
  if(it.kind==='val'||it.kind==='assign')return fmtValue(it.v).text;
  return it.kind;}
function t(line,exp){total++;const t0=Date.now();const got=run(line);const ok=exp instanceof RegExp?exp.test(got):got===exp;
  if(!ok){fail++;console.log('BUG',JSON.stringify(line),'=>',JSON.stringify(got),'expected',String(exp));}
  if(Date.now()-t0>8000){fail++;console.log('SLOW',line);}}
/* the result of f(...) must equal the input expression at a few points of x */
function same(call,expr,vars,tol){
  total++;
  const it=item(call);
  if(!it||!(it.v instanceof Sym)){fail++;console.log('BUG not symbolic',call,it&&it.msg);return;}
  vars=vars||['x'];
  for(const p of [0.37,1.21,2.6,-0.8]){
    const sc=new Map(vars.map((v,i)=>[v,p*(1+0.31*i)]));
    const a=U(ev(it.v.ast,sc)),b=U(ev(parseExpr(expr),sc));
    if(!(Math.abs(a-b)<=(tol||1e-9)*Math.max(1,Math.abs(b)))){fail++;console.log('BUG value',call,'at',p,':',a,'vs',b);return;}
  }
}
reset();

// ---- expand
t('expand((x+1)^3)','x^3 + 3*x^2 + 3*x + 1');
t('expand((x+y)^2)','2*x*y + x^2 + y^2');
t('expand((x-1)*(x+2)*(x+3))','x^3 + 4*x^2 + x - 6');
t('expand((x+1)^2/x)','x + 1/x + 2');
t('expand(2*(x+1))','2*x + 2');
t('expand(sin(x)*(1+cos(x)))','sin(x) + sin(x)*cos(x)');
same('expand((x+y+z)^3)','(x+y+z)^3',['x','y','z']);
same('expand((2*x-3)^5)','(2*x-3)^5');
t('expand((x+1)^100)',/ERR: The power is too large/);
// ---- factor
t('factor(x^3 - 6*x^2 + 11*x - 6)','(x - 1)*(x - 2)*(x - 3)');
t('factor(2*x^2 - 3*x + 1)','(2*x - 1)*(x - 1)');
t('factor(x^4 - 1)','(x + 1)*(x - 1)*(x^2 + 1)');
t('factor(x^3 - x)','x*(x + 1)*(x - 1)');
t('factor(x^2 + 2*x + 1)','(x + 1)^2');
t('factor(3*x^2 - 12)','3*(x + 2)*(x - 2)');
t('factor(-x^2 + 1)','-(x + 1)*(x - 1)');
t('factor(x^2*y + x*y^2)','x*y*(x + y)');
t('factor((x^2-1)/(x^2+3*x+2))','(x - 1)/(x + 2)');
t('factor(360)','2^3*3^2*5');
t('factor(x^2 - 2)','x^2 - 2');
total++;if(!/nothing to factor/.test(fmtValue(item('factor(x^2 - 2)').v).alt||'')){fail++;console.log('BUG: no "nothing to factor" note');}
same('factor(x^3 - 2)','x^3 - 2',null,1e-6);   // irrational roots are shown to 8 digits
same('factor(6*x^4 - 5*x^3 - 13*x^2 + 5*x + 7)','6*x^4 - 5*x^3 - 13*x^2 + 5*x + 7');
// ---- simplify
t('simplify(sin(x)^2 + cos(x)^2)','1');
t('simplify((x^2-1)/(x-1))','x + 1');
t('simplify(exp(ln(x)))','x');
t('simplify(exp(x)*exp(2*x))','exp(3*x)');
t('simplify((x+1)^2 - x^2)','2*x + 1');
t('simplify(1 - cos(x)^2)','sin(x)^2');
t('simplify(2*sin(x)^2 + 2*cos(x)^2 + x)','x + 2');
t('simplify((x^3 - 1)/(x - 1))','x^2 + x + 1');
t('simplify(x^2 + 2*x + 1)','(x + 1)^2');
t('simplify(ln(exp(x+1)))','x + 1');
// usable inside diff (expand/factor/simplify return expressions)
t('diff(expand((x+1)^2))','2*x + 2');

// ---- limits
t('limit(sin(x)/x, x, 0)','1');
t('limit((1-cos(x))/x^2, x, 0)','1/2');
t('limit((sin(x)-x)/x^3, x, 0)','-1/6');
t('limit((exp(x)-1)/x, 0)','1');
t('limit((x^2-1)/(x-1), x, 1)','2');
t('limit(x^2+3, x, 2)','7');
t('limit((1+1/x)^x, x, inf)','e');
t('limit((1+2/x)^x, x, inf)','e^2');
t('limit((1-1/x)^x, x, inf)','e^(-1)');
t('limit(atan(x), x, inf)','pi/2');
t('limit(sqrt(x^2+x)-x, x, inf)','1/2');
t('limit((x^2+1)/(2*x^2-3), x, inf)','1/2');
t('limit(x/exp(x), x, inf)','0');
t('limit(x*exp(x), x, -inf)','0');
t('limit(exp(-1/x^2), x, 0)','0');
t('limit(x*ln(x), x, 0, right)','0');
t('limit(x^x, x, 0, right)','1');
t('limit(x^0.1, x, 0, right)','0');
t('limit(sqrt(x), x, 0, right)','0');
t('limit(1/x^2, x, 0)','∞');
t('limit(1/x, x, 0, right)','∞');
t('limit(1/x, x, 0, left)','-∞');
t('limit(ln(x), x, 0, right)','-∞');
t('limit(2^x/x^10, x, inf)','∞');
t('limit(floor(x), x, 1, left)','0');
t('limit(a1*x^2, x, 3)','9*a1');
t('limit(1/x, x, 0)',/ERR: The limit does not exist: from the left it is -∞, from the right ∞/);
t('limit(abs(x)/x, x, 0)',/ERR: The limit does not exist: from the left it is -1, from the right 1/);
t('limit(sin(1/x), x, 0)',/ERR: The limit does not exist: the expression keeps oscillating/);
t('limit(sin(x), x, inf)',/oscillating/);
t('limit(x*sin(x), x, inf)',/oscillating/);
t('limit(x^(1/3), x, 0)',/ERR: The expression is not defined \(or not real\) to the left.*right\)/);
t('limit(1/ln(x), x, 0, right)',/ERR: The limit could not be found reliably/);
t('limit(x)',/ERR: limit\(\) takes|ERR: Usage/);

// ---- series
t('series(exp(x))','1 + x + x^2/2 + x^3/6 + x^4/24 + x^5/120');
t('series(sin(x), x, 0, 9)','x - x^3/6 + x^5/120 - x^7/5040 + x^9/362880');
t('series(cos(x), x, 0, 8)','1 - x^2/2 + x^4/24 - x^6/720 + x^8/40320');
t('series(ln(1+x), x, 0, 5)','x - x^2/2 + x^3/3 - x^4/4 + x^5/5');
t('series(sqrt(1+x), x, 0, 3)','1 + x/2 - x^2/8 + x^3/16');
t('series(tan(x), x, 0, 7)','x + x^3/3 + 2*x^5/15 + 17*x^7/315');
t('series(1/(1-x), x, 0, 4)','1 + x + x^2 + x^3 + x^4');
t('series(exp(x), x, 1, 3)','e + e*(x - 1) + e*(x - 1)^2/2 + e*(x - 1)^3/6');
t('series(sin(x), x, pi/2, 4)','1 - (x - pi/2)^2/2 + (x - pi/2)^4/24');
t('series(exp(a1*x), x, 0, 3)','1 + a1*x + a1^2*x^2/2 + a1^3*x^3/6');
t('taylor(atan(x), x, 0, 7)','x - x^3/3 + x^5/5 - x^7/7');
t('series(ln(x), x, 0, 3)',/ERR: series\(\): no Taylor series at x = 0/);
t('series(exp(x), x, 0, 50)',/ERR: series\(\): the order must be/);

// ---- sums
t('sum(1, 2, 3)','6');                          // the list form still works
t('sum(k, k, 1, 100)','5.05k');
t('sum(1/k^2, k, 1, 10)','1.54977');
t('sum(1/k^2, k, 1, inf)','pi^2/6');
t('sum(1/k^4, k, 1, inf)','pi^4/90');
t('sum((-1)^(k+1)/k, k, 1, inf)','ln(2)');
t('sum((-1)^k/(2*k+1), k, 0, inf)','pi/4');
t('sum(1/fact(k), k, 0, inf)','e');
t('sum(1/2^k, k, 0, inf)','2');
t('sum(k/2^k, k, 1, inf)','2');
t('sum(1/(k*(k+1)), k, 1, inf)','1');
t('sum(1/k^3, k, 1, inf)','1.20206');
t('sum(sin(k)/k^2, k, 1, inf)','1.01396');
t('sum(1/k, k, 1, inf)',/ERR: The series diverges/);
t('sum(1, k, 1, inf)',/ERR: The series diverges: its terms do not go to 0/);
t('sum(k, k, 1, n)','n*(n + 1)/2');
t('sum(k^2, k, 1, n)','n*(n + 1)*(2*n + 1)/6');
t('sum(k^3, k, 1, n)','n^2*(n + 1)^2/4');
t('sum(2*k-1, k, 1, n)','n^2');
t('sum(2^k, k, 0, n)','2^(n + 1) - 1');
t('sum(x^k, k, 0, n)','(x^(n + 1) - 1)/(x - 1)');
t('sum(sin(k), k, 1, n)',/ERR: sum\(\) to a symbolic end/);
t('sum(k, k, 1.5, 3)',/ERR: sum\(\) limits must be whole numbers/);

// ---- edge cases found by fuzzing
t('series((3+4j)*sin(x), x, 0, 3)',/^\(3\+4j\)\*x \+ \(-0\.5-0\.666666666667j\)\*x\^3$/);   // complex coefficients
t('sum(sin(sin(1/k)), k, 0, 20)',/ERR: sum\(\): the term for k = 0 is undefined/);
t('sum(-e-fact(k), k, 1, inf)',/ERR: The series diverges: its terms do not go to 0/);
t('limit(sqrt(x-5), x, 0)',/ERR: limit\(\): the expression has no real values near x = 0/);
// ---- exact constants are not invented from approximate values
reset();
total++;{const it=item('sum(sin(k)/k^2, k, 1, inf)');if(it.v instanceof Sym){fail++;console.log('BUG: an approximate sum was shown as an exact constant');}}
// ---- LaTeX of the new functions
total++;{const s=latexText('limit(sin(x)/x, x, 0)');if(s!=='\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1'){fail++;console.log('BUG latex limit',s);}}
total++;{const s=latexText('sum(1/k^2, k, 1, inf)');if(s!=='\\sum_{k=1}^{\\infty} \\frac{1}{k^{2}} = \\frac{\\pi^{2}}{6}'){fail++;console.log('BUG latex sum',s);}}
total++;{const s=latexText('limit(1/x, x, 0, right)');if(s!=='\\lim_{x \\to 0^{+}} \\frac{1}{x} = \\infty'){fail++;console.log('BUG latex one-sided',s);}}

console.log(fail?fail+' failed of '+total:'all '+total+' passed');
