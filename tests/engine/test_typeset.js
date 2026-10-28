// texHtml(): the built-in typesetter (LaTeX subset -> HTML + CSS) used for symbolic results and offline LaTeX previews.
// Checks the markup for each construct, then fuzzes it with everything the LaTeX writer can produce:
// tags must balance, no TeX command may leak through as text, and every \frac / \left must become its HTML form.
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const {texHtml,latexText,texVal,execLine,fmtValue,CFG,STATE,Sym}=new Function(engine+';return {texHtml,latexText,texVal,execLine,fmtValue,CFG,STATE,Sym};')();
let fail=0,total=0;
const ok=(c,m)=>{total++;if(!c){fail++;console.log('BUG',m);}};
const text=h=>h.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const count=(s,re)=>(s.match(re)||[]).length;
/* tags balance (wbr is void, <path .../> closes itself) */
function balanced(h){
  const st=[];const re=/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;let m;
  while((m=re.exec(h))){
    const tag=m[2].toLowerCase();
    if(tag==='wbr'||m[3])continue;
    if(m[1]){if(st.pop()!==tag)return false;}else st.push(tag);
  }
  return st.length===0;
}
function t(tex,checks,label){
  const h=texHtml(tex);
  ok(balanced(h),'unbalanced tags for '+tex+': '+h);
  for(const [what,cond] of checks)ok(cond(h),(label||tex)+': '+what+'\n   '+h);
}

// ---- constructs
t('\\frac{1}{2}',[['fraction grid',h=>/class="mfr"><span class="mfn"><span class="mn">1<\/span><\/span><span class="mfd"><span class="mn">2/.test(h)],['text',h=>text(h)==='12']]);
t('x^{2}',[['superscript',h=>h.includes('<i>x</i><sup><span class="mn">2</span></sup>')]]);
t('R_{1}',[['subscript',h=>h.includes('<i>R</i><sub><span class="mn">1</span></sub>')]]);
t('R_{1}^{2}',[['both scripts stacked',h=>h.includes('class="mss2"')]]);
t('\\left(\\frac{a}{b}\\right)^{2}',[['tall base: scripts beside it',h=>h.includes('class="msc"')&&h.includes('class="mlr"')],['two stretchy brackets',h=>count(h,/class="mdl"/g)===2]]);
t('\\sqrt{x + 1}',[['root',h=>h.includes('class="msq"')&&h.includes('class="msqa"')&&!h.includes('msqi')]]);
t('\\sqrt[3]{x}',[['root index',h=>/class="msqi"><span class="mn">3/.test(h)]]);
t('\\left|x\\right|',[['bars',h=>count(h,/class="mdl"/g)===2]]);
t('\\left\\lfloor x\\right\\rfloor',[['floor brackets',h=>count(h,/class="mdl"/g)===2]]);
t('\\mathcal{L}\\left\\{f\\right\\}',[['script L',h=>text(h).startsWith('\u2112')],['braces',h=>count(h,/class="mdl"/g)===2]]);
t('\\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}',[['matrix 2x2',h=>count(h,/<tr>/g)===2&&count(h,/<td>/g)===4&&h.includes('mmat')]]);
t('\\begin{aligned}\nx &= 1 \\\\\ny &= 2 \\\\\nz &= 3\n\\end{aligned}',[['3 aligned rows',h=>count(h,/<tr>/g)===3&&count(h,/class="mal0"/g)===3]]);
t('\\int_{0}^{\\infty} e^{-x} \\, dx',[['integral with limits',h=>h.includes('class="mint"')&&h.includes('class="mil"')&&text(h).includes('\u221e')]]);
t('\\int x \\, dx',[['plain integral',h=>h.includes('class="mint"')&&!h.includes('mil')]]);
t('\\sum_{k=1}^{\\infty} \\frac{1}{k^{2}}',[['sum with limits above and below',h=>h.includes('mlim mlbig')&&/mlt">[^]*\u221e/.test(h)]]);
t('\\lim_{x \\to 0^{+}} f',[['limit underneath',h=>h.includes('class="mlim"')&&text(h).includes('x\u21920+')]]);
t('\\omega_{0} = \\frac{1}{\\sqrt{L C}}',[['greek italic',h=>h.includes('<i>\u03c9</i>')],['equals is a relation',h=>h.includes('<span class="mrel">=</span>')]]);
t('\\Omega',[['capital greek upright',h=>h==='<span class="mx">\u03a9</span>']]);
t('2.2\\,\\mathrm{k}\\Omega',[['suffix upright',h=>h.includes('<span class="mrm">k</span>')&&text(h)==='2.2k\u03a9']]);
t('-x + 1',[['leading minus is a sign',h=>h.startsWith('<span class="mx">\u2212<i>x</i>')],['binary plus spaced',h=>h.includes('<span class="mbin">+</span>')]]);
t('x - -1',[['second minus is a sign',h=>count(h,/class="mbin"/g)===1]]);
t('e^{-2t}',[['minus in exponent is a sign',h=>!h.includes('mbin')&&text(h)==='e\u22122t']]);
t('30^{\\circ}',[['degree sign',h=>text(h)==='30\u00b0']]);
t("y'' + y'",[['primes',h=>text(h)==='y\u2032\u2032+y\u2032']]);
t('a < b',[['escaped',h=>h.includes('&lt;')]]);
t('\\sin^{2}(x)',[['function power',h=>/class="mop">sin<\/span><sup>/.test(h)]]);
t('2x \\sin(x)',[['thin space before a function',h=>h.includes('<span class="mth"></span><span class="mop">sin</span>')]]);
t('\\operatorname{sinc}(x)',[['operator name upright',h=>h.includes('<span class="mop">sinc</span>')]]);
t('A^{\\mathsf{T}}',[['transpose T',h=>h.includes('class="msf"')]]);
t('a \\bmod b',[['mod',h=>text(h)==='amodb'&&h.includes('mbin')]]);
t('\\mathtt{0xFF}',[['hex literal monospace',h=>h.includes('class="mtt"')]]);
t('\\mathrm{undefined}',[['undefined as a word',h=>text(h)==='undefined']]);
t('\\foo{x}',[['unknown command shown by name',h=>text(h).includes('foo')]]);
t('x + y + z',[['wrap points after operators',h=>count(h,/<wbr>/g)===2]]);
t('\\frac{x + y}{2}',[['no wrap points inside a fraction',h=>count(h,/<wbr>/g)===0]]);
t('',[['empty',h=>h==='<span class="mx"></span>']]);
t('\\frac{1}',[['broken input does not throw',h=>h.includes('mfr')]]);
t('x^',[['dangling script',h=>text(h)==='x']]);

// ---- symbolic results through fmtValue
function item(line){const r=execLine(line);return r.items[r.items.length-1];}
CFG.pretty=true;
{const v=item('LT(t*exp(-2*t))').v,f=fmtValue(v);
 ok(f.pretty&&f.html.includes('class="mx"')&&f.html.includes('mfr'),'LT result typeset: '+f.html);
 ok(f.text==='1/(s + 2)^2'&&f.plain.includes('1/(s + 2)^2'),'text and plain forms kept: '+f.text);}
{const f=fmtValue(item('integ(x*exp(x))').v);ok(text(f.html).endsWith('+C'),'indefinite integral shows + C: '+text(f.html));}
CFG.pretty=false;
{const f=fmtValue(item('LT(t*exp(-2*t))').v);ok(!f.pretty&&!f.html.includes('class="mx"'),'pretty off: plain text');}
CFG.pretty=true;
ok(!fmtValue(2.5).html.includes('mx'),'numbers are not typeset');

// ---- fuzz: everything the LaTeX writer produces must typeset cleanly
const bad=[];let n=0;
function chk(tex,src){
  n++;let h;
  try{h=texHtml(tex);}catch(e){bad.push(['THROW',src,String(e&&e.stack||e).slice(0,160)]);return;}
  if(!balanced(h))bad.push(['TAGS',src,tex]);
  const tx=text(h).replace(/undefined/g,'');
  if(/\\|[{}^_]|NaN|undefined|\[object/.test(tx.replace(/[{}]/g,'')))bad.push(['LEAK',src,tex+'  ->  '+tx]);
  if(count(tex,/\\frac/g)!==count(h,/class="mfr"/g))bad.push(['FRAC',src,tex]);
  if(count(tex,/\\left/g)!==count(h,/class="mlr"/g))bad.push(['LEFT',src,tex]);
  if(count(tex,/\\sqrt/g)!==count(h,/class="msq"/g))bad.push(['SQRT',src,tex]);
}
const atoms=['0','1','-1','2.5','1e300','1e-300','3+4j','-2j','j','pi','e','x','y','s','t','R1','inf','1k','10p','5MHz','4.7k','2u','0xFF','[1 2; 3 4]','[1;2]','x_1','omega','(x+1)','-x','2.2kΩ','5meg','.5','C_load','Vout'];
const fns=['sin','exp','sqrt','cbrt','abs','ln','log','log10','diff','integ','LT','ILT','par','u','delta','fact','conj','floor','ceil','re','phase','sind','limit','sum','foo'];
const ops=['+','-','*','/','^','%','@','&','|','<<','>>'];
let sd=11;const rnd=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};const pick=a=>a[Math.floor(rnd()*a.length)];
const lt=e=>{try{return latexText(e);}catch(err){return null;}};
for(const a of atoms){for(const f of fns){const s=f+'('+a+')',x=lt(s);if(x!==null)chk(x,s);}for(const o of ops){const s='x'+o+a,x=lt(s);if(x!==null)chk(x,s);}}
for(let k=0;k<4000;k++){
  let e=pick(atoms);const dep=1+Math.floor(rnd()*4);
  for(let q=0;q<dep;q++){const r=rnd();e=r<0.4?pick(fns)+'('+e+')':r<0.85?'('+e+')'+pick(ops)+pick(atoms):e+' = '+pick(atoms);}
  const x=lt(e);if(x!==null)chk(x,e);
}
['x = 1; y = 2','a1 = 1k; b1 = 2*a1',"dsolve(y'' + 3*y' + 2*y = u(t), y(0)=0, y'(0)=0)",'limit(sin(x)/x, x, 0, right)','sum(1/k^2, k, 1, inf)','integ(x^2, x, 0, 1)'].forEach(s=>{const x=lt(s);if(x!==null)chk(x,s);else bad.push(['NOLATEX',s,'']);});
// real symbolic results
STATE.vars.clear();STATE.funcs.clear();
['diff(x^2*sin(x))','diff(atan(x/(1+x)))','diff(sqrt(1+x^2))','integ(x*exp(x))','integ(1/(1+x^2))','LT(t*exp(-2*t)*sin(3*t))','ILT(1/(s^2+3*s+2))','ILT(exp(-2*s)/(s+1))',
 'series(exp(x), x, 0, 6)','series(sin(x)/x, x, 0, 6)','expand((x+1)^5)','factor(x^3 - 6*x^2 + 11*x - 6)','factor((x^2-1)/(x^2+3*x+2))','simplify(sin(x)^2 + cos(x)^2 + x)',
 'sum(k^2, k, 1, n)',"dsolve(y'' + 4*y = sin(2*t), y(0)=0, y'(0)=0)","dsolve(y' + y = u(t-2))",'diff(x^(1/3))','diff(abs(x)*x)','LT(cos(3*t)*exp(-t)*t^2)'].forEach(s=>{
  const it=item(s);if(!it||!(it.v instanceof Sym)){bad.push(['NOSYM',s,it&&it.msg]);return;}
  chk(texVal(it.v).s,s);
});
const u=new Map();bad.forEach(b=>{const k=b[0]+String(b[2]).slice(0,30);if(!u.has(k))u.set(k,b);});
total++;if(u.size){fail++;console.log('BUG fuzz:',n,'inputs,',u.size,'kinds of problem');[...u.values()].slice(0,15).forEach(b=>console.log('  ',JSON.stringify(b)));}

console.log(n+' fuzz inputs typeset');
console.log(fail?fail+' failed of '+total:'all '+total+' passed');
process.exit(fail?1:0);
