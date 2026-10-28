const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const api=new Function(engine+';return {execLine,fmtValue,CFG,STATE,FUNCS,CONSTS,parseBig,solveEquations,peek};')();
const {execLine,fmtValue,CFG,STATE}=api;
let fail=0,total=0,bugs=[];
function reset(){CFG.deg=false;CFG.mode='eng';CFG.digits=6;STATE.vars.clear();STATE.funcs.clear();STATE.solved.clear();STATE.ans=STATE.ans2=undefined;}
function run(line){const r=execLine(line);const it=r.items[r.items.length-1];if(!it)return'(nothing)';
  if(it.kind==='err')return'ERR: '+it.msg;
  if(it.kind==='val'||it.kind==='assign')return fmtValue(it.v).text;
  if(it.kind==='solve')return it.rows.map(x=>x.name+'='+fmtValue(x.v).text).join(', ');
  return it.kind.toUpperCase();}
function t(line,exp,note){total++;const got=run(line);const ok=exp instanceof RegExp?exp.test(got):got===exp;
  if(!ok){fail++;bugs.push({line,got,exp:String(exp),note});console.log('BUG',JSON.stringify(line),'=>',JSON.stringify(got),'expected',String(exp));}}

// --- Previously-found bugs that must be gone ---
reset();
t('(1+2j)/(3+4j)','440m + 80m*j','complex suffix spacing');
t('1u*j','1µ*j','small complex with suffix');
t('bin(0)','0b0','bin padding small');
t('bin(1)','0b1','bin padding small');
t('bin(7)','0b111','bin small');
t('bin(15)','0b1111','bin exactly 4');
t('bin(16)','0b1_0000','bin > 4 bits');
t('bin(255)','0b1111_1111','bin padded 4-group');
t('hex(0)','0x0','hex 0');
t('hex(255)','0xFF','hex 2 digits');
t('hex(65535)','0xFFFF','hex 4 digits');
t('hex(0xFFFFFF)','0xFF_FFFF','hex > 8 grouping');
t('oct(0)','0o0','octal 0');
t('oct(64)','0o100','octal');
t('tobase(0,2)','0b0','tobase bin 0');
t('tobase(0,16)','0x0','tobase hex 0');
t('tobase(5,2)','0b101','tobase small bin');
t('tobase(15,2)','0b1111','tobase bin exactly 4');
t('tobase(16,2)','0b1_0000','tobase bin > 4');

// solve existing var
reset();
run('x=5');
t('solve x=10','x=10','solve existing var');
t('x','10','value after solve');
t('x+=1','11','assign op after solve');
t('x','11','value after assign');

// ans/ans2 preservation
reset();
run('5+3');
t('ans','8','ans ref');
run('5');
t('ans','5','ans ref after new result');
t('ans2','8','ans2 preserved after ans ref');
t('ans2','8','ans2 preserved on repeat');

// Solve with other defined vars (unknowns auto-detected)
reset();
run('a_big=100');
t('solve a_big + x = 150','x=50','solve with defined var');
t('x','50','x stored');
t('a_big','100','a_big unchanged');

// Solve with ALL defined vars (fallback)
reset();
run('a=5; b=6');
t('solve a + b = 11',/suffix/,'a is a suffix letter — correctly refused as unknown');
reset();
run('x=1; y=2');
t('solve x+y=5; x-y=-1','x=2, y=3','all defined, re-solve 2 unknowns');
t('x','2','x updated');
t('y','3','y updated');

// --- More regression battery ---
console.log('--- Regression battery ---');
reset();

// Parser
t('.5','500m');
t('5.','5');
t('(((1)))','1');
t('-5^2','-25');
t('2^3^2','512');
t('(2^3)^2','64');
t('2^-3','125m');
t('0xFF+1','256');
t('0b10|0b01','3');
t('0o17','15');
t('1e+5','100k');
t('1e-5','10µ');

// Suffix / resistor
t('4k7',/Write 4\*k7/);   // explicit-*
t('2.2u','2.2µ');
t('100p','100p');
t('5MHz','5M');
t('10nH','10n');
t('1Hz','1');
t('1 Hz',/ERR/);
t('5meg','5M');
t('5MEG',/ERR/); // case-sensitive

// Variables
run('x=5'); run('y=3');
t('x+y','8');
t('x*y','15');
t('x/y','1.66667');
t('2*x+3*y','19');
t('x(y)',/x\*\(/); t('x*(y)','15');   // explicit-*
run('r1=1k; r2=2.2k');
t('par(r1,r2)','687.5');
t('r1+r2','3.2k');
t('2*r1','2k');

// User functions
reset();
run('sq_x(a_x,b_x) = a_x^2+b_x^2');
t('sq_x(3,4)','25');
t('sq_x(1k,2k)','5M');
run('cube(x) = x^3');
t('cube(2)','8');
t('cube(cube(2))','512');

// Complex
reset();
t('j^2','-1');
t('j^3','-1j');
t('(1+j)^2','2j');
t('(3+4j)*(3-4j)','25');
t('mag(3+4j)','5');
t('phase_deg(1+j)','45°');
t('phase_rad(1+j)','0.785398 rad');
t('conj(3+4j)','3 - 4j');
t('re(2+3j)','2');
t('im(2+3j)','3');
t('abs(-3-4j)','5');
t('sqrt(-9)','3j');
t('exp(j*pi)','-1');

// Angles are always radians; degrees via *d functions and 'in deg'
reset();
t('sin(pi/6)','500m');
t('cos(pi/3)','500m');
t('phase(1+j)','0.785398 rad');
t('asin(0.5)','0.523599 rad');
t('sind(30)','500m');
t('cosd(60)','500m');
t('phase_deg(1+j)','45°');
t('phase_rad(1+j)','0.785398 rad');
t('asind(0.5)','30°');
t('atan2d(1,1)','45°');
t('asin(0.5) in deg','30°');
t('sin(30 in rad)','500m');
t('sin(90 in rad)','1');
t('5@(pi/6)','4.33013 + 2.5j');
t('deg','INFO');
t('sin(pi/6)','500m');

// Trig edge
t('sin(0)','0');
t('cos(0)','1');
t('tan(0)','0');
t('sind(90)','1');
t('cosd(90)','0');
t('sind(180)','0');
t('sind(360)','0');
t('cosd(360)','1');
t('tand(45)','1');
t('tand(135)','-1');
run('rad');
t('sin(pi)','0');
t('cos(pi)','-1');
t('sin(pi/2)','1');
t('tan(pi/4)','1');

// Bases + bits
reset();
t('hex(255)','0xFF');
t('bin(10)','0b1010');
t('oct(64)','0o100');
t('dec(0xFFFF)','65535');
t('tobase(255,16)','0xFF');
t('tobase(255,36)','73 (base 36)');
t('tobase(0,36)','0 (base 36)');
t('twos(-1,8)','0b1111_1111 = 0xFF');
t('twos(0,8)','0b0000_0000 = 0x00');
t('twos(-128,8)','0b1000_0000 = 0x80');
t('twos(127,8)','0b0111_1111 = 0x7F');
t('signed(0xFF,8)','-1');
t('signed(0x80,8)','-128');
t('signed(0x7F,8)','127');
t('0xFF & 0x0F','15');
t('0xF0 | 0x0F','255');
t('1<<4','16');
t('32>>2','8');
t('xor(0xAA,0x55)','255');
t('~0','-1');
t('~255','-256');

// Big integer in base converter (via API)
const b1=api.parseBig('DEADBEEF',16);
if(b1!==3735928559n){fail++;total++;console.log('BUG parseBig DEADBEEF');}else{total++;}
const b2=api.parseBig('0xff',16);
if(b2!==255n){fail++;total++;console.log('BUG parseBig 0xff');}else{total++;}
const b3=api.parseBig('-0x10',10);
if(b3!==-16n){fail++;total++;console.log('BUG parseBig negative');}else{total++;}
const b4=api.parseBig('ff_ff',16);
if(b4!==65535n){fail++;total++;console.log('BUG parseBig underscores');}else{total++;}

// Solver
reset();
t('solve x=5','x=5');
t('solve 2*x+y=5; x-y=1','x=2, y=1');
t('solve x+y+z=6; x-y+z=2; x+y-z=0','x=1, y=2, z=3');
t('solve x+y+z+w=10; x-y+z-w=-2; x+y-z-w=-4; x-y-z+w=0','x=1, y=2, z=3, w=4');
t('solve x,y,z: x+y+z=6; 2*x+y-z=1; x-y+z=2','x=1, y=2, z=3');
t('solve (1k)*i1 + (2k)*(i1-i2) = 5; (2k)*(i2-i1) + (3k)*i2 = 0',/i1=.*m, i2=/);
t('solve x+y=3; x+y=4',/No unique/);
t('solve x*y=1',/unknown|not linear/i);
t('solve 0=0',/ERR/);

// Mode and digits
reset();
run('mode fix');
run('digits 10');
t('1/3',/0.3333333333/);
run('digits 3');
t('3.14159','3.14');
run('mode sci');
t('1000','1e3');
run('mode eng');
run('digits 6');
t('1000','1k');

// Formatting edges
t('0','0');
t('-0','0');
t('1','1');
t('999.999','999.999');
t('1e-15','1f');
t('1e-18','1a');
t('1e-21','1e-21');  // no attosuffix below
t('1e15','1P');
t('1e18','1e18');  // no suffix above P
t('1/0',/∞/);
t('-1/0',/-∞/);
t('0*(1/0)',/undefined|NaN/);

// Operators mixed
t('5%3','2');
t('-5%3','-2');  // JS modulo: sign follows dividend
t('5+3*2','11');
t('5-3-2','0');
t('(5+3)*2','16');

// Error messages & positions
reset();
let r=execLine('foo + 2');
if(r.items[0].kind!=='err'||r.items[0].pos!==0){fail++;total++;console.log('BUG err pos foo:',r.items[0]);}else{total++;}
r=execLine('1 + bar');
if(r.items[0].kind!=='err'||r.items[0].pos!==4){fail++;total++;console.log('BUG err pos bar:',r.items[0]);}else{total++;}

// Reserved names
reset();
t('pi=3',/reserved/);
t('e=3',/reserved/);
t('j=3',/reserved/);
t('ans=5',/reserved/);
t('sin=3','3');  // can shadow functions as vars
t('sin(0)','0'); // function still works
run('del sin');
t('sin(0)','0');

// Const name shadowing
reset();
t('c=5','5');
t('2*c','10');  // c is now a var not a constant
run('del c');
t('c','299.792M');  // speed of light restored

// Multiple assignment ops
reset();
run('x=10');
t('x+=5','15');
t('x-=3','12');
t('x*=2','24');
t('x/=4','6');
t('x^=2','36');

// Help/clear/other commands
reset();
run('x=5');
t('del x','INFO');
t('x',/Unknown/);
run('y=1');
t('delall','INFO');
t('y',/Unknown/);

// Nested parens in function args
reset();
t('sin(cos(0))','841.471m');
t('max(1,sin(pi/2),2)','2');
t('par(par(1k,1k),par(2k,2k))','333.333');  // par(500,1k) = 1/(1/500+1/1000) = 1000/3
t('f0(10n*(2),1p*(5))','503.292M');

if(bugs.length){bugs.slice(0,20).forEach(b=>console.log(' -',b.line,'=>',b.got,'wanted',b.exp));}
console.log(fail?fail+' failed of '+total:'all '+total+' passed');
