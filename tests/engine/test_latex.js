// latex(): calculator syntax and symbolic results -> LaTeX source
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const {execLine,latexText,texWrap,fmtValue,CFG,STATE}=new Function(engine+';return {execLine,latexText,texWrap,fmtValue,CFG,STATE};')();
let fail=0,total=0;
function reset(){CFG.mode='eng';CFG.digits=6;STATE.vars.clear();STATE.funcs.clear();STATE.solved.clear();STATE.ans=STATE.ans2=undefined;}
function L(src,exp,opts){total++;let got;try{got=latexText(src,opts);}catch(e){got='ERR: '+e.message;}
  const ok=exp instanceof RegExp?exp.test(got):got===exp;
  if(!ok){fail++;console.log('BUG',JSON.stringify(src),'=>',JSON.stringify(got),'expected',String(exp));}}
function C(line,exp){total++;const r=execLine(line);const it=r.items[r.items.length-1];
  const got=!it?'(nothing)':it.kind==='tex'?it.tex:it.kind==='err'?'ERR: '+it.msg:it.kind+': '+(it.v!==undefined?fmtValue(it.v).text:'');
  const ok=exp instanceof RegExp?exp.test(got):got===exp;
  if(!ok){fail++;console.log('BUG console',JSON.stringify(line),'=>',JSON.stringify(got),'expected',String(exp));}}
reset();

// ---- fractions, powers, products
L('(s+1)/(s^2+3*s+2)','\\frac{s + 1}{s^{2} + 3s + 2}');
L('x^2 - 3*x + 2 = 0','x^{2} - 3x + 2 = 0');
L('1/(2*pi*sqrt(L*C))','\\frac{1}{2\\pi \\sqrt{L C}}');
L('a*b/c','\\frac{a b}{c}');
L('1/2*x','\\frac{1}{2} x');
L('x^(1/2)','x^{\\frac{1}{2}}');
L('(a+b)^2','(a + b)^{2}');
L('(1/x)^2','\\left(\\frac{1}{x}\\right)^{2}');
L('-x^2','-x^{2}');
L('(-2)^2','(-2)^{2}');
L('-x/2','-\\frac{x}{2}');
L('e^(-t/tau)','e^{-\\frac{t}{\\tau}}');
L('x-(y-z)','x - (y - z)');
L('x+(-y)','x - y');
L('2*(x+1)','2(x + 1)');
L('(x+1)*(x-1)','(x + 1)(x - 1)');
L('x*(-3)','x \\cdot (-3)');
L('2*3','2 \\cdot 3');
L('2*x*y','2x y');
L('2*pi*f*L','2\\pi f L');
L('2*sqrt(2)','2\\sqrt{2}');
L('2*(1/3)','2 \\cdot \\frac{1}{3}');
L('x % 3','x \\bmod 3');
// ---- multiplication styles
L('2*x*y','2 \\cdot x \\cdot y',{mul:'cdot'});
L('2*x','2 \\times x',{mul:'times'});
// ---- numbers keep the typed form
L('2.2k*R1','2.2\\,\\mathrm{k} \\cdot R_{1}');
L('10pF','10\\,\\mathrm{pF}');
L('5MHz/60us','\\frac{5\\,\\mathrm{MHz}}{60\\,\\mu \\mathrm{s}}');
L('2.2kΩ','2.2\\,\\mathrm{k}\\Omega');
L('4.7u','4.7\\,\\mu');
L('5meg','5\\,\\mathrm{M}');
L('1e-9','10^{-9}');
L('2.5e3','2.5 \\times 10^{3}');
L('3+4j','3 + 4j');
L('0xFF','\\mathtt{0xFF}');
L('.5','0.5');
// ---- names
L('R1','R_{1}');
L('R_load','R_{\\mathrm{load}}');
L('C_L','C_{L}');
L('omega0*tau','\\omega_{0} \\tau');
L('Omega','\\Omega');
L('theta_1','\\theta_{1}');
L('eps0','\\varepsilon_{0}');
L('gain','\\mathrm{gain}');
L('inf','\\infty');
// ---- functions
L('sin(x)^2+cos(x)^2','\\sin^{2}(x) + \\cos^{2}(x)');
L('exp(-2*t)*sin(3*t)','e^{-2t} \\sin(3t)');
L('asin(x)','\\arcsin(x)');
L('abs(x-1)','\\left|x - 1\\right|');
L('log(8,2)','\\log_{2}(8)');
L('log10(x)','\\log_{10}(x)');
L('ln(x)','\\ln(x)');
L('sqrt(x^2+1)','\\sqrt{x^{2} + 1}');
L('cbrt(8)','\\sqrt[3]{8}');
L('conj(z)','\\overline{z}');
L('par(R1,R2)','R_{1} \\parallel R_{2}');
L('sind(30)','\\sin(30^{\\circ})');
L('sin(90 in rad)','\\sin(90^{\\circ})');
L('u(t-1)','u(t - 1)');
L('delta(t)','\\delta(t)');
L('5!','5!');
L('5@(pi/6)','5 \\angle \\frac{\\pi}{6}');
L('floor(x)','\\left\\lfloor x\\right\\rfloor');
L('dBm(p)','\\operatorname{dBm}(p)');
L('phase_deg(z)','\\operatorname{phase\\_deg}(z)');
L('sin(x/2)','\\sin\\left(\\frac{x}{2}\\right)');
// ---- matrices
L('[1 2; 3 4]','\\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}');
L("A'",'A^{\\mathsf{T}}');
// ---- statements
L('A = [1 2; 3 4]','A = \\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}');
L('H(s) = 1/(R*C*s + 1)','H(s) = \\frac{1}{R C s + 1}');
L('x += 2','x \\mathrel{+}= 2');
L('x = 10M to k','x = 10\\,\\mathrm{M}');
L('2*x+y-z=8; -3*x-y+2*z=-11','\\begin{aligned}\n2x + y - z &= 8 \\\\\n-3x - y + 2z &= -11\n\\end{aligned}');
L('a = 1\nb^2','\\begin{aligned}\na &= 1 \\\\\n& b^{2}\n\\end{aligned}');
L('solve x,y: 3*x+2*y=12; x-y=1',/^\\begin\{aligned\}\n3x \+ 2y &= 12/);
// ---- calculus and Laplace show their result
L('diff(x^2*sin(x))','\\frac{d}{dx} \\left(x^{2} \\sin(x)\\right) = 2x \\sin(x) + x^{2} \\cos(x)');
L('diff(sin(t),t,2)','\\frac{d^{2}}{dt^{2}} \\sin(t) = -\\sin(t)');
L('integ(x*exp(x))','\\int x e^{x} \\, dx = x e^{x} - e^{x} + C');
L('integ(exp(-x^2),-inf,inf)','\\int_{-\\infty}^{\\infty} e^{-x^{2}} \\, dx \\approx 1.77245');
L('integ(1/x, x, 1, e)','\\int_{1}^{e} \\frac{1}{x} \\, dx = 1');
L('LT(exp(-2*t)*sin(3*t))','\\mathcal{L}\\left\\{e^{-2t} \\sin(3t)\\right\\} = \\frac{3}{(s + 2)^{2} + 9}');
L('ILT(1/(s^2+3*s+2))','\\mathcal{L}^{-1}\\left\\{\\frac{1}{s^{2} + 3s + 2}\\right\\} = e^{-t} - e^{-2t}');
L('diff(x^2*sin(x))','\\frac{d}{dx} \\left(x^{2} \\sin(x)\\right)',{res:false});
L('cos(x) = x','\\cos(x) = x');   // a built-in on the left is an equation, not a definition
L('solve(x*exp(x) = 2, x, 0, 5)','x e^{x} = 2');
L('eq: x^2 + y^2 = 1; x = y','\\begin{aligned}\nx^{2} + y^{2} &= 1 \\\\\nx &= y\n\\end{aligned}');
// ---- errors
L('2x',/ERR: '2x': multiplication must be written with \*/);
L('',/ERR: Nothing to convert/);
L('x = = 2',/ERR/);
L('a = 1\n2y',/ERR: .*2y.*\(in: 2y\)/);
// ---- wrapping
total++;if(texWrap('x','inline')!=='$x$'||texWrap('x','display')!=='\\[\nx\n\\]'||!/^\\begin\{equation\}\nx\n\\end\{equation\}$/.test(texWrap('x','equation'))||texWrap('x','none')!=='x'){fail++;console.log('BUG texWrap');}

// ---- console: latex(...) and "latex ..." lines, latex() inside a statement
C('latex((s+1)/(s^2+3*s+2))','\\frac{s + 1}{s^{2} + 3s + 2}');
C('latex x^2 - 3*x + 2 = 0','x^{2} - 3x + 2 = 0');
C('latex (x+1)/2','\\frac{x + 1}{2}');
C('latex(diff(x^2))','\\frac{d}{dx} x^{2} = 2x');
C('R1 = 2.2k; latex(R1*10n)','R_{1} \\cdot 10\\,\\mathrm{n}');
C('latex(R1)','R_{1} = 2200');
C('H1(s) = 1/(s+1)','def: ');
C('latex(H1)','H_{1}(s) = \\frac{1}{s + 1}');
C('G1 = LT(exp(-t))',/^assign/);
C('latex(G1)','G_{1} = \\frac{1}{s + 1}');
C('integ(x*exp(x))',/^val/);
C('latex(ans)','x e^{x} - e^{x} + C');
C('latex(1/x)+1',/ERR: latex\(\) gives LaTeX text, not a number/);
C('y = latex(x)',/ERR: latex\(\) gives LaTeX text/);
C('latex(a, b)',/ERR: Unexpected ','/);
C('latex(2x)',/ERR: '2x'/);
C('latex',/ERR/);
total++;if(STATE.vars.has('y')){fail++;console.log('BUG: failed assignment stored y');}
// latex output must not change ans
reset();execLine('5');execLine('latex(x^2)');total++;if(STATE.ans!==5){fail++;console.log('BUG: latex changed ans to',STATE.ans);}

console.log(fail?fail+' failed of '+total:'all '+total+' passed');
