// length(x, unit): unit names are lengths only inside the call; everything outside keeps its old meaning
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const {execLine,CFG,STATE}=new Function(engine+';return {execLine,CFG,STATE};')();
let fail=0,total=0;
function reset(){CFG.deg=false;CFG.mode='eng';CFG.digits=6;STATE.vars.clear();STATE.funcs.clear();STATE.solved.clear();STATE.ans=STATE.ans2=undefined;}
const ok=(c,m)=>{total++;if(!c){fail++;console.log('FAIL',m);}};
const close=(a,b)=>Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
function item(line){const r=execLine(line);return r.items[r.items.length-1];}
function num(line){const it=item(line);const v=it.v;return v&&typeof v==='object'?v.num:v;}
function text(line){const it=item(line);return it.kind==='err'?'ERR '+it.msg:(it.v&&it.v.text);}
function err(line,re){total++;const it=item(line);if(it.kind!=='err'||!re.test(it.msg)){fail++;console.log('FAIL',line,'expected error',re,'got',it.kind,it.msg||'');}}
reset();

// conversions
ok(close(num('length(5*in + 3*ft, cm)'),104.14),'5 in + 3 ft in cm');
ok(text('length(5*in + 3*ft, cm)')==='104.14 cm','displayed with its unit');
ok(close(num('length(1*mt, ft)'),1/0.3048),'metre to feet');
ok(close(num('length(1*mi, km)'),1.609344),'mile to km');
ok(close(num('length(12*in, ft)'),1),'12 in = 1 ft');
ok(close(num('length(3*ft, yd)'),1),'3 ft = 1 yd');
ok(close(num('length(1*nmi, mt)'),1852),'nautical mile');
ok(close(num('length(1*mil, um)'),25.4),'thou to um');
ok(close(num('length(1*µm, nm)'),1000),'micro sign unit');
ok(close(num('length(5*mm, um)'),5000),'5 mm in um');
ok(close(num('length(5mm, um)'),5000),'glued suffix input works too');
ok(close(num('length(1, in)'),1/0.0254),'plain number is metres');
ok(close(num('length(2*ft, mt) * 2'),1.2192),'result usable in further arithmetic');
reset();execLine('L = 6');
ok(close(num('length(L*in, cm)'),15.24),'variables inside the call');
reset();execLine('x = length(2*ft, cm)');
ok(close(STATE.vars.get('x') instanceof Object?STATE.vars.get('x').num:STATE.vars.get('x'),60.96),'stored value is the number in the chosen unit');

// errors
reset();
err('length(3*ft, foo)',/length unit.*mt, km, cm/);
err('length(3*ft)',/2 arguments/);
err('length(3*ft, 2)',/length unit/);
err('length(matrix [1 2], cm)',/matrices/);
err('length(1+2j, cm)',/real/);

// nothing outside length() changed
reset();
ok(close(num('5m'),0.005),'5m is still milli');
ok(close(num('5mm'),0.005),'5mm is still 0.005');
ok(close(num('5km'),5000),'5km unchanged');
err('5*in',/Unknown name 'in'/);
err('5*ft',/Unknown name 'ft'/);
err('3ft',/multiplication/);
ok(text('100 to M')==='0.0001 M','to M unchanged');
ok(/deg/.test(text('pi in deg'))||close(num('pi in deg'),180),'in deg unchanged');

// a user variable named like a unit: inside the call the unit wins, outside the variable is untouched
reset();execLine('cm = 3');
ok(close(num('length(cm, mm)'),10),'inside length() cm is the unit');
ok(close(num('cm'),3),'outside it is still the variable');

// "length" as a variable name: warned, and the function keeps working
reset();
const a=item('length = 5');
ok(a.kind==='assign'&&a.warns.some(w=>/built-in function/.test(w)),'warns when length is used as a variable');
ok(close(num('length'),5),'the variable is readable');
ok(close(num('length(2*ft, cm)'),60.96),'length(...) still converts after length = 5');
ok(close(num('length(length*ft, cm)'),152.4),'and the variable can be used inside it');

console.log(fail?fail+' of '+total+' FAILED':'all '+total+' passed');
process.exit(fail?1:0);
