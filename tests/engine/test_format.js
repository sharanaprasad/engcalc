const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const api=new Function(engine+';return {execLine,fmtValue,CFG,STATE};')();
const {execLine,fmtValue,CFG,STATE}=api;
let fail=0,total=0;
function reset(){CFG.deg=false;CFG.mode='eng';CFG.digits=6;STATE.vars.clear();STATE.funcs.clear();STATE.solved.clear();STATE.ans=STATE.ans2=undefined;}
function run(line){const r=execLine(line);const it=r.items[r.items.length-1];if(!it)return'(nothing)';
  if(it.kind==='err')return'ERR: '+it.msg;
  if(it.kind==='val'||it.kind==='assign')return fmtValue(it.v).text;
  return it.kind.toUpperCase();}
function t(line,exp){total++;const got=run(line);const ok=exp instanceof RegExp?exp.test(got):got===exp;
  if(!ok){fail++;console.log('BUG',JSON.stringify(line),'=>',JSON.stringify(got),'expected',String(exp));}}

reset();
// Basic use
t('5MHz / 60us => M','83333.3 M');
t('5MHz / 60us','83.3333G');
t('1.2G / 3m => M','400000 M');
t('1u + 1n => n','1001 n');
t('1k * 1k => M','1 M');
t('10pF * 2.5k','25n');
t('10pF * 2.5k => n','25 n');
t('10pF * 2.5k => p','25000 p');
t('10pF * 2.5k => u','0.025 µ');
t('10pF * 2.5k => µ','0.025 µ');
t('10pF * 2.5k => meg','2.5e-14 M');

// Assignment stores raw
t('x = 10M => k','10000 k');
t('x','10M');  // raw
t('x => G','0.01 G');

// Bases
t('255 => hex','0xFF');
t('255 => bin','0b1111_1111');
t('255 => oct','0o377');
t('0xFF => bin','0b1111_1111');
t('0b1010 => dec','10');
t('1024 => hex','0x400');

// Modes
t('100 => sci','1e2');
t('100 => eng','100');
t('100 => fix','100');
t('1234567 => sci','1.23457e6');
t('0.00001 => eng','10µ');

// Complex
t('(1+2j)*1k => k','1 k + 2 k*j');
t('(3+4j) => k','0.003 k + 0.004 k*j');
t('5j => k','0.005 k*j');
t('(1+2j)*(3-4j)','11 + 2j');  // correct: (1+2j)(3-4j) = 11+2j
t('(1+2j)*(3-4j) => k','0.011 k + 0.002 k*j');

// Error cases - helpful
t('5 => xyz',/isn't a known format/);
t('5 => Hz',/isn't a known format/);
t('5 => deg',/°/);   // deg and rad are angle directives now
t('5 => DEG',/isn't a known format/);
t('(3+4j) => hex',/needs a real/);
t('5.5 => hex',/need an integer/);

// Doesn't collide with >>
t('3 >> 1','1');
t('3 >> 1 => k','0.001 k');
t('6 >> 1 => bin','0b11');
t('(1<<4) => hex','0x10');

// No spaces
t('5=>M','0.000005 M');  // JS .toString(5e-6) = '0.000005'
t('5 =>M','0.000005 M');
t('5=> M','0.000005 M');

// Negative
t('-1k => M','-0.001 M');

// Chained in semicolons
t('5 => k; 10 => M','0.00001 M');

// Doesn't apply to commands (they run before stripFormat)
reset();
t('help','(nothing)');  // help pushes to ui not items
t('vars','VARS');  // vars pushes to items as 'vars' kind
run('x=5');
t('vars','VARS');

// doesn't break regular eng-style parsing
reset();
t('5kHz','5k');
t('5MHz','5M');
t('5pF','5p');
t('5 nH',/^ERR/);  // space breaks the suffix glue
t('5 pF',/^ERR/);

// Format on expression with `ans`
reset();
run('5MHz / 60us');
t('ans','83.3333G');
t('ans => M','83333.3 M');
t('ans => G','83.3333 G');

// Error position retained
reset();
const r=execLine('fooxyz + 2 => M');
console.log('error pos test:',r.items[0].kind,r.items[0].msg,r.items[0].pos);

console.log(fail?fail+' failed of '+total:'all '+total+' passed');
