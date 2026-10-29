// 3D plots: plot3d() / curve3d() builders, grid sampling, projection drawing on a recording canvas, contour lines, CSV
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const api=new Function(engine+';return {execLine,CFG,STATE,Plot3Spec,plot3Sample,plot3Draw,plot3ZAt,plot3CSV,p3Color,p3Rgb,p3Nice,PLOT_THEMES};')();
const {execLine,CFG,STATE,Plot3Spec,plot3Sample,plot3Draw,plot3ZAt,plot3CSV,p3Color,p3Rgb,p3Nice,PLOT_THEMES}=api;
let fail=0,total=0;
function reset(){CFG.deg=false;CFG.mode='eng';CFG.digits=6;STATE.vars.clear();STATE.funcs.clear();STATE.solved.clear();STATE.ans=STATE.ans2=undefined;}
const ok=(c,m)=>{total++;if(!c){fail++;console.log('FAIL',m);}};
const close=(a,b,tol)=>Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b));
function item(line){const r=execLine(line);return r.items[r.items.length-1];}
function spec(line){const it=item(line);if(it.kind!=='plot3'){fail++;total++;console.log('FAIL',line,'did not give a 3D plot:',it.kind,it.msg||'');return null;}return it.spec;}
function err(line,re){total++;const it=item(line);if(it.kind!=='err'||!re.test(it.msg)){fail++;console.log('FAIL',line,'expected error',re,'got',it.kind,it.msg||'');}}
function mockCtx(){
  const c={calls:[],texts:[],fills:0,moves:[],lines:[],strokeStyles:[]};
  const rec=n=>(...a)=>{c.calls.push(n);if(n==='fillText')c.texts.push(a[0]);if(n==='fill')c.fills++;if(n==='moveTo')c.moves.push(a);if(n==='lineTo')c.lines.push(a);};
  ['beginPath','moveTo','lineTo','stroke','fillRect','strokeRect','fill','arc','clip','rect','save','restore','translate','rotate','setLineDash','fillText','scale','closePath'].forEach(n=>{c[n]=rec(n);});
  c.measureText=t=>({width:String(t).length*6});
  return c;
}
function draw(sp,theme,W,H){
  const d=plot3Sample(sp),ctx=mockCtx();
  const g=plot3Draw(ctx,W||1000,H||563,sp,d,PLOT_THEMES[theme||'light'],{});
  return {ctx,g,d};
}
reset();

// ---- plot3d() argument forms
let s=spec('plot3d(sin(x)*cos(y), x, -3, 3, y, -3, 3)');
ok(s&&s.mode==='surface'&&s.xvar==='x'&&s.yvar==='y'&&s.xmin===-3&&s.xmax===3&&s.ymin===-3&&s.ymax===3&&s.style==='surface'&&s.n===41,'named variables, ranges and the default style');
s=spec('plot3d(x^2+y^2, -2, 2, -1, 1)');
ok(s.xvar==='x'&&s.yvar==='y'&&s.xmin===-2&&s.ymax===1,'unnamed: the unknown names are x and y');
s=spec('plot3d(a*b, 0, 1, 0, 2)');
ok(s.xvar==='a'&&s.yvar==='b'&&s.xmax===1&&s.ymax===2,'unnamed: any two names, alphabetical (first range goes to the first name)');
s=spec('plot3d(sin(x), -3, 3, -1, 1)');
ok(s.xvar==='x'&&s.yvar==='y','a surface that only uses x is still a surface over x and y');
s=spec('plot3d(5, -1, 1, -1, 1)');
ok(s.xvar==='x'&&s.yvar==='y','a constant plots as a plane');
s=spec('plot3d(r*sin(p), r, 0, 2, p, 0, 3)');
ok(s.xvar==='r'&&s.yvar==='p','any variable names');
s=spec('plot3d(x*y, 1k, 3k, 1M, 2M, -1, 1)'.replace('1k, 3k, 1M, 2M, -1, 1','x, 1k, 3k, y, 1M, 2M'));
ok(s.xmin===1000&&s.xmax===3000&&s.ymin===1e6&&s.ymax===2e6,'engineering-notation ranges');
s=spec('plot3d(x*y, 3, -3, 2, -2)');
ok(s.xmin===-3&&s.xmax===3&&s.ymin===-2&&s.ymax===2,'a reversed range is put in order');
for(const st of ['wire','contour','heat','surface']){
  s=spec('plot3d(x*y, -1, 1, -1, 1, '+st+')');
  ok(s.style===st,'style flag '+st);
}
s=spec('plot3d(x*y, -1, 1, -1, 1, contour)');
ok(s.n===81,'contour / heat default to a finer grid');
execLine('R1 = 2.2k');
s=spec('plot3d(R1*x*y, -1, 1, -1, 1)');
ok(s.xvar==='x'&&s.yvar==='y','a defined variable is a constant, not a plot variable');
execLine('f1(x,y)=x^2+y^2');
s=spec('plot3d(f1(x,y), -1, 1, -1, 1)');
let d=plot3Sample(s);
ok(close(plot3ZAt(d,0.5,0.5),0.5,2e-2),'your own functions work: f1(0.5,0.5) = '+plot3ZAt(d,0.5,0.5));
reset();
err('plot3d(x*y*z, -1, 1, -1, 1)',/found 3 unknown names \(x, y, z\)/);
err('plot3d(x*y)',/plot3d\(expr/);
err('plot3d(x*y, -1, 1)',/plot3d\(expr/);
err('plot3d(x*y, x, -1, 1, y, -1)',/plot3d\(expr/);
err('plot3d(x*y, -1, 1, -1, 1, wire, heat)',/Pick one style/);
err('plot3d(x*y, x, -1, 1, x, -1, 1)',/different names/);
err('plot3d(x*y*a, x, -1, 1, y, -1, 1)',/does not know a/);
err('plot3d(x*y, 3, -1, 1, y, -1, 1)',/Name both variables/);
err('plot3d(x*y, -1, 1, -1, abc)',/Unknown name|real number/);
err('plot3d(x!, -1, 1, -1, 1)',/can't handle/);

// ---- sampling
s=spec('plot3d(x*y, x, -2, 2, y, -1, 1)');s.n=21;
d=plot3Sample(s);
ok(d.mode==='surface'&&d.n===21&&d.xs.length===21&&d.ys.length===21&&d.z.length===21&&d.z[0].length===21,'a 21 x 21 grid');
ok(d.xs[0]===-2&&d.xs[20]===2&&d.ys[0]===-1&&d.ys[20]===1,'the grid covers the ranges');
ok(close(d.z[20][20],2,1e-12)&&close(d.z[0][20],-2,1e-12)&&close(d.z[20][0],-2,1e-12)&&close(d.z[0][0],2,1e-12),'z = x*y at the four corners (rows are y, columns are x)');
ok(d.lim[2].lo<=-2&&d.lim[2].hi>=2&&d.lim[2].ticks.includes(0),'the z limits contain the data and the ticks include 0: '+JSON.stringify(d.lim[2]));
ok(close(plot3ZAt(d,1,0.5),0.5,1e-9)&&close(plot3ZAt(d,-1.3,0.2),-0.26,2e-2),'bilinear read-out: z(1, 0.5) = '+plot3ZAt(d,1,0.5));
ok(Number.isNaN(plot3ZAt(d,5,0))&&Number.isNaN(plot3ZAt(d,0,-3)),'outside the grid there is no value');
s.n=3;ok(plot3Sample(s).n===5,'the grid has at least 5 points per side');
s.n=999;ok(plot3Sample(s).n===150,'and at most 150');
s.n=21;s.zmin=-1;s.zmax=1;
d=plot3Sample(s);
ok(d.lim[2].lo===-1&&d.lim[2].hi===1&&d.z.every(r=>r.every(v=>v>=-1&&v<=1)),'z min / z max clip the surface');
s=spec('plot3d(sqrt(x), x, -1, 1, y, 0, 1)');s.n=11;
d=plot3Sample(s);
ok(d.z.some(r=>r.some(Number.isNaN))&&d.z.some(r=>r.some(Number.isFinite)),'complex or undefined points become holes, not errors');
ok(d.complexSkipped===5*11&&d.z.every(r=>r.slice(0,5).every(Number.isNaN)&&r.slice(5).every(Number.isFinite)),'sqrt(x) is empty exactly where x < 0, and the skipped points are counted: '+d.complexSkipped);
s=spec('plot3d(ln(x*y), x, -1, 0, y, 0, 1)');
let t=null;try{plot3Sample(s);}catch(e){t=e.message;}
ok(/complex everywhere.*mag\(/.test(t||''),'a surface with no real value anywhere says to use mag(): '+t);
s=spec('plot3d(1/(x*0), x, -1, 1, y, -1, 1)');
t=null;try{plot3Sample(s);}catch(e){t=e.message;}
ok(t!==null,'a surface that is infinite everywhere is an error: '+t);
s=spec('plot3d(x+j*y, x, -1, 1, y, -1, 1)');s.n=9;
d=plot3Sample(s);
ok(d.complexSkipped===72&&Number.isFinite(d.z[4][0])&&Number.isNaN(d.z[0][0]),'a complex surface keeps only its real points (y = 0 row): '+d.complexSkipped);
s=spec('plot3d(mag(x+j*y), x, -1, 1, y, -1, 1)');s.n=9;
d=plot3Sample(s);
ok(d.complexSkipped===0&&close(d.z[8][8],Math.SQRT2,1e-12),'mag(...) plots the magnitude of a complex expression');
s=spec('plot3d(re(exp(j*x))*im(exp(j*y)), x, -3, 3, y, -3, 3)');s.n=9;
d=plot3Sample(s);
ok(d.complexSkipped===0,'re(...) and im(...) give real surfaces');
s=spec('plot3d(exp(j*x)*exp(-j*x)*y, x, -1, 1, y, -1, 1)');s.n=9;
d=plot3Sample(s);
ok(d.complexSkipped===0,'rounding noise in the imaginary part (1e-17) is not treated as complex');
s=spec('plot3d(x*y, x, -1, 1, y, -1, 1)');s.expr='';
t=null;try{plot3Sample(s);}catch(e){t=e.message;}
ok(/Type an expression/.test(t||''),'an empty expression is explained: '+t);
s.expr='x*y';s.xmin=1;s.xmax=1;t=null;try{plot3Sample(s);}catch(e){t=e.message;}
ok(/two different numbers/.test(t||''),'a zero-width range is refused: '+t);
s.xmin=-1;s.xmax=1;s.expr='qq*x';t=null;try{plot3Sample(s);}catch(e){t=e.message;}
ok(/Unknown name 'qq'/.test(t||''),'an unknown name is reported: '+t);
s.expr='[1 2;3 4]*x';
t=null;try{plot3Sample(s);}catch(e){t=e.message;}
ok(t!==null,'a matrix result is refused: '+t);
// nice limits
let nn=p3Nice(-0.93,1.04);
ok(nn.lo<=-0.93&&nn.hi>=1.04&&nn.ticks.length>=3,'p3Nice extends to tidy values: '+JSON.stringify(nn));
nn=p3Nice(2,2);ok(nn.lo<2&&nn.hi>2,'p3Nice pads a flat range');

// ---- curve3d()
s=spec('curve3d(cos(t), sin(t), t/5, t, 0, 6*pi)');
ok(s&&s.mode==='curve'&&s.tvar==='t'&&s.exprs.length===3&&close(s.tmax,6*Math.PI,1e-12),'curve3d with a named variable');
s=spec('curve3d(cos(u), sin(u), u, 0, 7)');
ok(s.tvar==='u','curve3d infers the variable');
s=spec('curve3d(1, 2, 3, 0, 1)');
ok(s.tvar==='t','curve3d with constants uses t');
err('curve3d(cos(t), sin(t), 0, 1)',/curve3d\(x\(t\)/);
err('curve3d(cos(t), sin(u), t, 0, 1)',/several unknown names/);
err('curve3d(cos(t), sin(t), t*a, t, 0, 1)',/does not know a/);
err('curve3d(cos(t), sin(t), t, 5, 0, 1)',/variable name/);
s=spec('curve3d(cos(t), sin(t), t/5, t, 0, 6*pi)');
d=plot3Sample(s);
ok(d.mode==='curve'&&d.n===400&&d.c.length===3&&d.ts[0]===0,'curve samples');
ok(close(d.c[0][0],1,1e-12)&&close(d.c[1][0],0,1e-12)&&close(d.c[2][399],6*Math.PI/5,1e-12),'curve endpoints');
ok(d.lim[0].lo<=-1&&d.lim[0].hi>=1&&d.lim[2].hi>=3.7,'curve limits contain the data: '+JSON.stringify(d.lim.map(l=>[l.lo,l.hi])));

// ---- drawing: surface
s=spec('plot3d(sin(x)*cos(y), x, -3, 3, y, -3, 3)');s.n=21;s.title='Egg';
let out=draw(s);
ok(out.g.mode==='3d','a surface draws in 3D mode');
ok(out.ctx.fills===400,'one filled polygon per grid cell: '+out.ctx.fills);
ok(out.ctx.texts.includes('Egg')&&out.ctx.texts.includes('x')&&out.ctx.texts.includes('y')&&out.ctx.texts.includes('z'),'title and axis names are drawn: '+out.ctx.texts.filter(t=>/^[A-Za-z]/.test(t)).join('|'));
ok(out.ctx.texts.includes('-2')&&out.ctx.texts.includes('2')&&out.ctx.texts.includes('1'),'tick labels are drawn');
s.xlabel='Voltage';s.ylabel='Current';s.zlabel='Power';
out=draw(s);
ok(out.ctx.texts.includes('Voltage')&&out.ctx.texts.includes('Current')&&out.ctx.texts.includes('Power'),'custom axis names replace x, y, z');
s.style='wire';out=draw(s);
ok(out.ctx.fills===400,'wireframe still hides lines behind the front with filled cells');
// holes
s=spec('plot3d(sqrt(x), x, -1, 1, y, 0, 1)');s.n=11;
out=draw(s);
ok(out.ctx.fills===50,'undefined cells are not drawn (5 of 10 columns x 10 rows): '+out.ctx.fills);
// views
s=spec('plot3d(x*y, -1, 1, -1, 1)');s.n=9;
for(const [az,el,zm] of [[0,3,1],[-55,28,1],[90,90,1],[180,45,2],[-180,60,0.5],[400,-20,9]]){
  s.az=az;s.el=el;s.zoom=zm;
  let thrown=null;try{out=draw(s);}catch(e){thrown=e.message;}
  ok(thrown===null&&out.ctx.fills===64,'view az '+az+' el '+el+' zoom '+zm+' draws all 64 cells '+(thrown||''));
}
// painter's algorithm: on a flat plane the far cells are higher on the screen, so the first corner of each filled cell
// must never move up the screen as drawing goes on (far to near)
for(const az of [0,180]){
  s=spec('plot3d(0, -1, 1, -1, 1)');s.n=9;s.az=az;s.el=30;
  const d2=plot3Sample(s),ctx=mockCtx();let path=[];const ys=[];
  const mv=ctx.moveTo,fillFn=ctx.fill;
  ctx.moveTo=(...a)=>{path=[a];mv(...a);};
  ctx.fill=()=>{if(path.length)ys.push(path[0][1]);fillFn();};
  plot3Draw(ctx,800,600,s,d2,PLOT_THEMES.light,{});
  const cells=ys.slice(-64);
  let mono=cells.length===64;for(let i=1;i<cells.length;i++)if(cells[i]<cells[i-1]-1e-6)mono=false;
  ok(mono&&cells[63]-cells[0]>20,'cells are painted far to near at az '+az+': '+cells[0].toFixed(1)+' ... '+cells[63].toFixed(1));
}
// colours
const light=PLOT_THEMES.light,dark=PLOT_THEMES.dark;
ok(p3Color(light,0)==='rgb('+[158,197,244]+')'&&p3Color(light,1)==='rgb('+[13,54,107]+')','light theme ramp: light blue (low) to dark navy (high)');
ok(p3Color(dark,0)==='rgb('+[24,79,149]+')'&&p3Color(dark,1)==='rgb('+[205,226,251]+')','dark theme ramp is reversed: high values are the lightest');
ok(p3Color(light,-5)===p3Color(light,0)&&p3Color(light,9)===p3Color(light,1)&&p3Color(light,NaN)===p3Color(light,0),'the ramp clamps out-of-range and NaN');
const mid=p3Rgb(light,0.5);ok(mid.every(v=>v>0&&v<255),'a middle colour');
ok(p3Rgb(light,0.5,0.5).every((v,i)=>v<=mid[i]),'a brightness factor below 1 darkens');
// monotonic lightness along the light ramp
{let prev=1e9,mono=true;for(let i=0;i<=20;i++){const c=p3Rgb(light,i/20),l=0.299*c[0]+0.587*c[1]+0.114*c[2];if(l>prev+1e-9)mono=false;prev=l;}ok(mono,'the light-theme ramp gets steadily darker with height');}

// ---- drawing: contour and heat (top view)
s=spec('plot3d(x, -1, 1, -1, 1, contour)');s.n=41;s.title='Ramp';
out=draw(s);
ok(out.g.mode==='flat'&&!!out.g.rect&&out.g.xAt(out.g.rect.x)<=-0.999&&out.g.xAt(out.g.rect.x+out.g.rect.w)>=0.999,'contour is a flat view with a pointer-to-x mapping');
ok(close(out.g.yAt(out.g.rect.y),1,1e-9)&&close(out.g.yAt(out.g.rect.y+out.g.rect.h),-1,1e-9),'and y grows upwards');
ok(out.ctx.fills===0&&out.ctx.calls.filter(c=>c==='fillRect').length>1600,'cells are painted as rectangles');
{
  /* z = x: every contour is a vertical line, so each moveTo / lineTo pair shares its x */
  const pairs=out.ctx.moves.length,vert=out.ctx.moves.every((m,i)=>true);
  const mvs=out.ctx.moves.slice(-400),lns=out.ctx.lines.slice(-400);
  let segs=0,bad=0;
  const seg=[];
  out.ctx.moves.forEach(()=>0);
  // pair each moveTo with the lineTo drawn right after it (contour segments are the only moveTo/lineTo pairs with beginPath before a stroke batch)
  const c2=mockCtx();const order=[];
  ['moveTo','lineTo'].forEach(n=>{const f=c2[n];c2[n]=(...a)=>{order.push([n,a]);f(...a);};});
  plot3Draw(c2,1000,563,s,plot3Sample(s),PLOT_THEMES.light,{});
  for(let i=0;i+1<order.length;i++){
    if(order[i][0]==='moveTo'&&order[i+1][0]==='lineTo'&&order[i+1][1][1]!==order[i][1][1]){/* tick marks are horizontal or vertical short strokes; contours are vertical */}
    if(order[i][0]==='moveTo'&&order[i+1][0]==='lineTo'){segs++;if(Math.abs(order[i][1][0]-order[i+1][1][0])>1e-6&&Math.abs(order[i][1][1]-order[i+1][1][1])>1e-6)bad++;}
  }
  ok(segs>20&&bad===0,'contour lines of z = x are straight vertical lines (marching squares): '+segs+' segments, '+bad+' slanted');
}
ok(out.ctx.texts.includes('Ramp')&&out.ctx.texts.includes('z'),'title and colour-bar name are drawn');
s=spec('plot3d(x^2+y^2, -2, 2, -2, 2, contour)');
out=draw(s);
ok(out.ctx.calls.filter(c=>c==='stroke').length>10,'a paraboloid has several contour levels');
s=spec('plot3d(x*y, -1, 1, -1, 1, contour)');s.n=21;
let thrown=null;try{out=draw(s);}catch(e){thrown=e.message;}
ok(thrown===null,'saddle points (ambiguous marching-squares cells) draw without trouble');
s=spec('plot3d(x*y, -1, 1, -1, 1, heat)');
out=draw(s);
ok(out.g.mode==='flat'&&out.ctx.calls.filter(c=>c==='stroke').length<40,'heat view has no contour lines');
s=spec('plot3d(sqrt(x), x, -1, 1, y, 0, 1, heat)');s.n=11;
thrown=null;try{out=draw(s);}catch(e){thrown=e.message;}
ok(thrown===null,'holes in a flat view draw without trouble');

// ---- drawing: curve
s=spec('curve3d(cos(t), sin(t), t/5, t, 0, 6*pi)');s.title='Helix';
out=draw(s,'dark');
ok(out.g.mode==='3d'&&out.ctx.texts.includes('Helix')&&out.ctx.texts.includes('x')&&out.ctx.texts.includes('z'),'a curve draws with its title and axis names');
ok(out.ctx.calls.filter(c=>c==='arc').length===2,'start and end markers');
ok(out.ctx.fills===2,'only the two end markers are filled (no colour bar for a curve)');
s=spec('curve3d(1/t, t, t, t, -1, 1)');
thrown=null;try{out=draw(s);}catch(e){thrown=e.message;}
ok(thrown===null,'a curve through a singularity breaks the line instead of failing');
s=spec('curve3d(t, t, t, t, 0, 0)');
t=null;try{plot3Sample(s);}catch(e){t=e.message;}
ok(/two different numbers/.test(t||''),'a curve needs a real parameter range: '+t);

// ---- CSV
s=spec('plot3d(x*y, x, 0, 1, y, 0, 2)');s.n=5;
let csv=plot3CSV(s,plot3Sample(s)).trim().split('\n');
ok(csv[0]==='x,y,z'&&csv.length===26&&csv[1]==='0,0,0'&&csv[25]==='1,2,2','surface CSV: x,y,z rows (header + 25): '+csv[0]+' | '+csv[25]);
s=spec('curve3d(cos(t), sin(t), t, t, 0, 1)');s.nt=10;
csv=plot3CSV(s,plot3Sample(s)).trim().split('\n');
ok(csv[0]==='t,x,y,z'&&csv.length===11&&csv[1]==='0,1,0,0','curve CSV');
s=spec('plot3d(sqrt(x), x, -1, 1, y, 0, 1)');s.n=5;
csv=plot3CSV(s,plot3Sample(s));
ok(/,\n/.test(csv),'undefined points are empty cells in the CSV');

console.log(fail?fail+' of '+total+' FAILED':'all '+total+' passed');
process.exit(fail?1:0);
