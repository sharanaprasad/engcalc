const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const api=new Function(engine+';return {execLine,fmtValue,CFG,STATE,FUNCS,CONSTS,parseBig,solveEquations,peek};')();
const {execLine,fmtValue,CFG,STATE}=api;
let fail=0,total=0;
function reset(){CFG.deg=false;CFG.mode='eng';CFG.digits=6;STATE.vars.clear();STATE.funcs.clear();STATE.solved.clear();STATE.ans=STATE.ans2=undefined;}
function run(line){const r=execLine(line);const it=r.items[r.items.length-1];if(!it)return'(nothing)';
  if(it.kind==='err')return'ERR: '+it.msg;
  if(it.kind==='val'||it.kind==='assign')return fmtValue(it.v).text;
  if(it.kind==='solve')return it.rows.map(x=>x.name+'='+fmtValue(x.v).text).join(', ');
  return it.kind.toUpperCase();}
function t(line,exp){total++;const got=run(line);const ok=exp instanceof RegExp?exp.test(got):got===exp;
  if(!ok){fail++;console.log('BUG',JSON.stringify(line),'=>',JSON.stringify(got),'expected',String(exp));}}

reset();
// Binary / hex / oct grouping fixes
t('bin(0)','0b0');
t('bin(1)','0b1');
t('bin(7)','0b111');
t('bin(15)','0b1111');
t('bin(16)','0b1_0000');     // was 0b0001_0000
t('bin(31)','0b1_1111');
t('bin(255)','0b1111_1111');
t('bin(256)','0b1_0000_0000');
t('bin(1024)','0b100_0000_0000');
t('hex(0)','0x0');
t('hex(15)','0xF');
t('hex(255)','0xFF');
t('hex(65535)','0xFFFF');
t('hex(0xFFFFFF)','0xFF_FFFF'); // was 0xFFFFFF
t('hex(0x100000000)','0x1_0000_0000');
t('oct(0)','0o0');
t('oct(8)','0o10');
t('oct(64)','0o100');
t('tobase(0,2)','0b0');
t('tobase(5,2)','0b101');
t('tobase(16,2)','0b1_0000');
t('tobase(255,16)','0xFF');
t('tobase(0xFFFFFF,16)','0xFF_FFFF');

// Complex display
t('(1+2j)/(3+4j)','440m + 80m*j');
t('(0.5+0.5j)','500m + 500m*j');
t('1u*j','1µ*j');
t('(2k+3kj)','2k + 3k*j');
t('5m-3kj','5m - 3k*j');
t('(1+j)*(1-j)','2');
t('1+2j','1 + 2j');
t('3j','3j');
t('-3j','-3j');
t('0+3j','3j');

// Core regression
t('10p * 2.5k','25n');
t('4k7',/Unknown name 'k7'/);
t('phase(1+j)','0.785398 rad');
t('phase_deg(1+j)','45°');
t('sind(30)','500m');
t('2^10','1.024k');

// Solver still works
reset();
t('solve 2x+y=5; x-y=1','x=2, y=1');
t('solve x+y+z=6; x-y+z=2; x+y-z=0','x=1, y=2, z=3');
run('x=5');
t('solve x=10','x=10');
t('x','10');

// ans behavior
reset();
run('5+3');
t('ans','8');
run('5');
t('ans','5');
t('ans2','8');  // preserved
t('ans','5');
t('ans2','8');  // still preserved

console.log(fail?fail+' failed of '+total:'all '+total+' passed');
