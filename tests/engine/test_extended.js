const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const api=new Function(engine+';return {execLine,fmtValue,CFG,STATE,FUNCS,CONSTS,exOf,parseBig,solveEquations,peek};')();
const {execLine,fmtValue,CFG,STATE}=api;
let fail=0,total=0;
function run(line){const r=execLine(line);const it=r.items[r.items.length-1];if(!it)return'NOITEM';
  if(it.kind==='err')return'ERR: '+it.msg;
  if(it.kind==='val'||it.kind==='assign')return fmtValue(it.v).text;
  if(it.kind==='solve')return it.rows.map(r=>r.name+'='+fmtValue(r.v).text).join(', ');
  return it.kind.toUpperCase();}
function t(line,exp){total++;const got=run(line);const ok=exp instanceof RegExp?exp.test(got):got===exp;
  if(!ok){fail++;console.log('FAIL',JSON.stringify(line),'=>',JSON.stringify(got),'expected',String(exp));}}
const near=(a,b,tol=1e-9)=>Math.abs(a-b)<=tol*(1+Math.abs(b));
function num(line){const r=execLine(line);const it=r.items[r.items.length-1];if(!it||it.kind==='err')throw new Error(line+' -> '+(it&&it.msg));let v=it.v;if(v&&v.num!==undefined)v=v.num;return v;}
function chk(line,exp,tol){total++;let got;try{got=num(line);}catch(e){fail++;console.log('FAIL',e.message);return;}
  if(typeof exp==='object'){ if(typeof got==='number')got={re:got,im:0}; if(!(near(got.re,exp.re,tol)&&near(got.im,exp.im,tol))){fail++;console.log('FAIL',line,'=>',JSON.stringify(got),'expected',JSON.stringify(exp));} }
  else if(!near(got,exp,tol)){fail++;console.log('FAIL',line,'=>',got,'expected',exp);} }

// ---- variable naming rules the user asked about
t('a1=3','3'); t('2a1',/Write 2\*a1/); t('a1*2','6'); t('2 a1',/Missing operator/); t('10*a1','30');   // explicit-*
t('C1=5','5'); t('2C1',/Write 2\*C1/); t('3*C1+C1','20');   // explicit-*
t('k1=2','2'); t('4*k1','8'); t('4k2',/Write 4\*k2/);   // explicit-*
t('m1=3','3'); t('3*m1','9'); t('3m2',/Write 3\*m2/);   // explicit-*
t('p=3',/ERR/); t('del a1 C1 k1 m1','INFO');
t('4k7',/Write 4\*k7/); t('2a1',/Write 2\*a1/);   // explicit-*
t('R1=1k; R2=2.2k; R1+R2','3.2k'); t('2*R1','2k'); t('R1*2*R2','4.4M'); t('2R1',/Write 2\*R1/);   // explicit-*
t('tau=5','5'); t('tau*2','10'); t('tau(1k,1n)','1µ'); t('del tau','INFO');
t('V=5','5'); t('5V',/ERR.*ambiguous/); t('del V','INFO');
// ---- phase / angle behaviour with toggle
t('rad','INFO'); t('phase(1+j)','0.785398 rad'); t('phase_deg(1+j)','45°'); t('phase_rad(1+j)','0.785398 rad');
t('phase_deg(1+j)','45°'); t('phase_rad(1+j)','0.785398 rad');
t('phase_deg(-1)','180°'); t('phase_deg(-1-j)','-135°'); t('phase_deg(j)','90°'); t('phase_deg(1)','0°');
t('asind(1)','90°'); t('atand(1)','45°'); t('acosd(-1)','180°'); t('atan2d(1,1)','45°');
t('phase_deg(1+j)*2','90'); t('sin(phase(1+j))',/707\.107m/);
t('sind(30)','500m'); t('cosd(60)','500m'); t('tand(45)','1'); t('sind(90)','1'); t('cosd(90)','0'); t('sind(-90)','-1'); t('cosd(180)','-1'); t('sind(360)','0'); t('tand(180)','0');
t('sin(30+60j)',/\+/);
t('5@(90 in rad)','5j'); t('5@(180 in rad)','-5'); t('polar(2,45 in rad)',/1\.41421 \+ 1\.41421j/);
t('rad','INFO'); t('sin(pi/2)','1'); t('cos(pi)','-1'); t('5@pi/2','-2.5'); t('polar(2,pi/4)',/1\.41421 \+ 1\.41421j/); t('tan(pi/4)','1');
t('asin(1)','1.5708 rad'); t('acos(0)','1.5708 rad');
// ---- bases
t('dec(0xFFFF)','65535'); t('dec(0b1010_1010)','170'); t('hex(65535)','0xFFFF'); t('bin(170)','0b1010_1010'); t('hex(0b11111111)','0xFF');
t('0xFF','255'); t('0b1111','15'); t('0o17','15'); t('0xFF + 0b1','256');
t('tobase(255,16)','0xFF'); t('tobase(255,2)','0b1111_1111'); t('tobase(255,36)','73 (base 36)'); t('tobase(35,36)','Z (base 36)'); t('tobase(-10,2)','-0b1010');
t('twos(-5,8)',/0b1111_1011 = 0xFB/); t('twos(5,8)',/0b0000_0101 = 0x05/); t('twos(-1,16)',/0xFFFF/); t('twos(200,8)',/0xC8/); t('twos(300,8)',/ERR.*fit/);
t('signed(0xFF,8)','-1'); t('signed(0x80,8)','-128'); t('signed(0x7F,8)','127'); t('signed(0xFFFFFFFF,32)','-1'); t('signed(300,8)',/ERR/);
t('hex(-255)','-0xFF'); t('0xFF & 0x0F','15'); t('0xF0 | 0x0F','255'); t('1<<10','1.024k'); t('~0','-1');
// ---- solver
t('solve 2*x+y-z=8; -3*x-y+2*z=-11; -2*x+y+2*z=-3','x=2, y=3, z=-1');
t('x','2'); t('y+z','2');
t('solve x+y+z+w=10; 2*x-y+z-w=-1; x+2*y-z+w=6; x-y+2*z+3*w=17','x=1, y=2, z=3, w=4');
t('solve r1=1;r2=2','r1=1, r2=2');
t('solve 2*r1+3*r2=8; r1-r2=-1','r1=1, r2=2');
t('solve x,y: 3*x+2*y=12; x-y=1','x=2.8, y=1.8');
t('solve (1k+2k)*i1 - 2k*i2 = 5; -2k*i1 + (2k+3k)*i2 = 0',/i1=2\.27273m, i2=909\.091µ/);
t('solve x+y=3; x+y=4',/ERR.*unique/);
t('solve x+y=3; 2*x+2*y=6',/ERR.*unique/);
t('solve x*y=3; x+y=4','x1=1, y1=3, x2=3, y2=1');   // nonlinear systems: Newton from many starts
t('solve x+y+z=3; x-y=0',/ERR.*equation\(s\)/);
t('solve 2*(x+y)=10; x-y=2','x=3.5, y=1.5');
t('solve x/2 + y/3 = 1; x - y = 0','x=1.2, y=1.2');
t('solve x + 2j*y = 3; x - y = 0',/\+|j/);
t('solve 1 = 2',/ERR/);
t('solve',/ERR.*Usage/);
t('solve x=1; y=',/ERR/);
t('solve p+q=3; p-q=1',/ERR.*suffix/);
t('solve sin(1)*x+y=2; x-y=0',/x=/);
t('solve sin(x)+y=2; x-y=0',/^x=1\.10606, y=1\.10606/);
// ---- independent math identities (random complex points)
function rnd(){return (Math.random()*2-1)*3;}
for(let i=0;i<40;i++){
  const a=rnd().toFixed(4),b=rnd().toFixed(4);
  const z=`(${a}+${b}j)`;
  execLine('rad');
  chk(`sin(${z})^2+cos(${z})^2`,{re:1,im:0},1e-9);
  chk(`exp(ln(${z}))`,{re:+a,im:+b},1e-9);
  chk(`sqrt(${z})^2`,{re:+a,im:+b},1e-9);
  chk(`sinh(${z})^2-cosh(${z})^2`,{re:-1,im:0},1e-9);
  chk(`tan(atan(${z}))`,{re:+a,im:+b},1e-8);
  chk(`sin(asin(${z}))`,{re:+a,im:+b},1e-8);
  chk(`cos(acos(${z}))`,{re:+a,im:+b},1e-8);
  chk(`sinh(asinh(${z}))`,{re:+a,im:+b},1e-8);
  chk(`cosh(acosh(${z}))`,{re:+a,im:+b},1e-8);
  chk(`tanh(atanh(${z}))`,{re:+a,im:+b},1e-8);
  chk(`mag(${z})`,Math.hypot(+a,+b),1e-12);
  chk(`phase_rad(${z})`,Math.atan2(+b,+a),1e-12);
  chk(`${z}*conj(${z})`,{re:Math.hypot(+a,+b)**2,im:0},1e-9);
  chk(`(${z}/(2-3j))*(2-3j)`,{re:+a,im:+b},1e-9);
  chk(`${z}^3`,(()=>{const A=+a,B=+b;return {re:A*A*A-3*A*B*B,im:3*A*A*B-B*B*B};})(),1e-9);
  chk(`${z}^0.5`,(()=>{const m=Math.hypot(+a,+b),th=Math.atan2(+b,+a);return {re:Math.sqrt(m)*Math.cos(th/2),im:Math.sqrt(m)*Math.sin(th/2)};})(),1e-9);
  const x=rnd()*20;
  chk(`sind(${x})`,Math.sin(x*Math.PI/180),1e-9);chk(`cosd(${x})`,Math.cos(x*Math.PI/180),1e-9);chk(`tand(${x})`,Math.tan(x*Math.PI/180),1e-7);
  chk(`phase_deg(${z})`,Math.atan2(+b,+a)*180/Math.PI,1e-12);
  chk(`sin(${x})`,Math.sin(x),1e-9);chk(`phase(${z})`,Math.atan2(+b,+a),1e-12);
}
// ---- spot values vs known references
chk('ln(10)',Math.LN10,1e-12); chk('log(100)',2); chk('log2(8)',3); chk('logb(125,5)',3,1e-12); chk('exp(2)',Math.exp(2),1e-12);
chk('cbrt(27)',3); chk('2^0.5',Math.SQRT2,1e-12); chk('10!',3628800); chk('170!',7.257415615307994e306,1e-12);
chk('par(100,100,100)',100/3,1e-12); chk('gcd(1071,462)',21); chk('lcm(21,6)',42); chk('nCr(10,3)',120); chk('nPr(10,3)',720);
chk('median(5,1,9,3)',4); chk('std(1,2,3,4)',Math.sqrt(5/3),1e-12); chk('7%3',1); chk('-7%3',-1);
chk('dB10(100)',20); chk('dB20(100)',40); chk('undB20(40)',100,1e-12); chk('dBm(0.1)',20,1e-12); chk('undBm(0)',1e-3,1e-12);
chk('round(2.675,2)',2.68,1e-9); chk('floor(-0.5)',-1); chk('ceil(-0.5)',0); chk('trunc(-0.5)',0); chk('sign(0)',0);
chk('hypot(5,12)',13); chk('sq(1.5)',2.25); chk('abs(3-4j)',5); chk('re(2.5k+3j)',2500); chk('im(2.5k+3j)',3);
chk('vrms(1)',1/Math.SQRT2,1e-12); chk('vpp(1)',2*Math.SQRT2,1e-12); chk('wavelength(1G)',0.299792458,1e-9);
chk('Xc(1u,1k)',1/(2*Math.PI*1e3*1e-6),1e-12); chk('Xl(1m,1k)',2*Math.PI,1e-12); chk('f0(1u,1u)',1/(2*Math.PI*1e-6),1e-12);
chk('fc_rc(1k,159.155n)',1000,1e-5); chk('gamma(150)',0.5,1e-12); chk('vswr(0.5)',3,1e-12); chk('rl(0.5)',6.0205999,1e-7);
chk('enob(74)',(74-1.76)/6.02,1e-12); chk('sndr(12)',6.02*12+1.76,1e-12); chk('ui(10G)',1e-10,1e-12); chk('nyq(10G)',5e9,1e-12);
chk('skin(1M)',Math.sqrt(2*1.68e-8/(2*Math.PI*1e6*1.25663706212e-6)),1e-9);
// numbers
const eq=[['1u',1e-6],['1µ',1e-6],['1μ',1e-6],['3.3n',3.3e-9],['100f',1e-13],['2a',2e-18],['1.5T',1.5e12],['1P',1e15],['2G',2e9],['1meg',1e6],['0.5m',5e-4],['1e3k',1e6],['2.2e-3u',2.2e-9]];
for(const [s,v] of eq) chk(s,v,1e-12);
for(const s of ['10pF','10pF','2.2kΩ','5MHz','3.3V','1mA','2uA','100mV','50ohm','1GHz','10nH','1mm','1km','3dB','1dBm']) { total++; const r=run(s); if(/ERR/.test(r)){fail++;console.log('FAIL unit',s,r);} }
console.log(fail?`${fail} FAILED of ${total}`:`all ${total} passed`);
