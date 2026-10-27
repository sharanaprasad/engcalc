// Plots: sampling, ticks, interpolation, markers, plot() / bode() builders, and the drawing routine on a recording canvas
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const engine=script.split('/* ============================ UI')[0];
const api=new Function(engine+';return {execLine,fmtValue,CFG,STATE,plotSample,plotDraw,plotYAt,plotCross,plotCSV,plotRange,niceTicks,logTicks,plotFmt,PlotSpec,PLOT_THEMES,FUNCS};')();
const {execLine,CFG,STATE,plotSample,plotDraw,plotYAt,plotCross,plotCSV,plotRange,niceTicks,logTicks,plotFmt,PlotSpec,PLOT_THEMES}=api;
let fail=0,total=0;
function reset(){CFG.deg=false;CFG.mode='eng';CFG.digits=6;STATE.vars.clear();STATE.funcs.clear();STATE.solved.clear();STATE.ans=STATE.ans2=undefined;}
const ok=(c,m)=>{total++;if(!c){fail++;console.log('FAIL',m);}};
const close=(a,b,tol)=>Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b));
function item(line){const r=execLine(line);return r.items[r.items.length-1];}
function spec(line){const it=item(line);if(it.kind!=='plot'){fail++;total++;console.log('FAIL',line,'did not give a plot:',it.kind,it.msg||'');return null;}return it.spec;}
function err(line,re){total++;const it=item(line);if(it.kind!=='err'||!re.test(it.msg)){fail++;console.log('FAIL',line,'expected error',re,'got',it.kind,it.msg||'');}}
reset();

// ---- plot() argument parsing
let s=spec('plot(sin(x), 0, 6.28)');
ok(s&&s.xvar==='x'&&s.xmin===0&&s.xmax===6.28&&s.xscale==='lin'&&s.traces.length===1,'plot(expr,a,b) infers the variable and range');
s=spec('plot(1/sqrt(1+(f/1k)^2), f, 10, 1M, logx)');
ok(s.xvar==='f'&&s.xscale==='log'&&s.xmin===10&&s.xmax===1e6,'explicit variable, engineering-notation range and logx flag');
s=spec('plot(sin(t), right(cos(t)*100), 0, 6)');
ok(s.traces.length===2&&s.traces[0].axis==='L'&&s.traces[1].axis==='R','right(...) puts a trace on the right axis');
s=spec('plot(w^2, 3*w, 1, 100, loglog)');
ok(s.xscale==='log'&&s.axes.L.scale==='log'&&s.xvar==='w','loglog sets both axes to log');
s=spec('plot(sin(x), cos(x), x, 0, 3, stacked)');
ok(s.layout==='stacked'&&s.traces.length===2,'stacked flag');
execLine('R1 = 2.2k');
s=spec('plot(R1*x, 0, 10)');
ok(s.xvar==='x','a defined variable is a constant, not the plot variable');
s=spec('plot(sin(tt), 0, 1)');
ok(s.xvar==='tt','any variable name is accepted');
err('plot(x*y, 0, 10)',/several unknown names \(x, y\)/);
err('plot(x, 0, 0, logx)',/above 0/);
err('plot(x!, 0, 5)',/can't handle/);
err('plot(x)',/takes 3–9 argument/);
err('plot(x, 0)',/takes 3–9 argument/);
err('plot(sin(x), 0, abc)',/range end|Unknown name/);
err('plot(p1, p2, p3, p4, p5, 0, 1)',/1 to 3 expressions/);
reset();

// ---- bode(): rad/s by default, Hz with the last argument
s=spec('bode(1/(1+s/1k), 10, 1M)');
ok(s.xvar==='w'&&s.xunit==='rad/s'&&s.xscale==='log'&&s.layout==='stacked'&&s.traces.length===2,'bode defaults: rad/s, log, stacked');
ok(s.traces[0].as==='db'&&s.traces[1].as==='phase'&&s.traces[1].axis==='R'&&s.axes.L.unit==='dB'&&s.axes.R.unit==='°','bode: dB on the left, phase on the right');
let d=plotSample(s);
let i0=plotYAt(d,0,1000,true),p0=plotYAt(d,1,1000,true);
ok(close(i0,-3.0103,2e-3),'bode magnitude at the corner is -3.01 dB: '+i0);
ok(close(p0,-45,2e-3),'bode phase at the corner is -45 degrees: '+p0);
s=spec('bode(1/(1+s/1k), 10, 1M, hz)');
ok(s.xvar==='f'&&s.xunit==='Hz','bode(..., hz) uses Hz');
d=plotSample(s);
const fc=1000/(2*Math.PI);
ok(close(plotYAt(d,0,fc,true),-3.0103,2e-3),'bode in Hz: -3 dB at w/(2*pi): '+plotYAt(d,0,fc,true));
execLine('H1(s)=1/(s^2+s+1)');
s=spec('bode(H1, 0.01, 100)');
d=plotSample(s);
ok(close(plotYAt(d,0,1,true),0,5e-2)&&close(plotYAt(d,1,1,true),-90,2e-3),'bode of a user function: H(j1) has phase -90: '+plotYAt(d,1,1,true));
ok(plotYAt(d,1,100,true)>-180.5&&plotYAt(d,1,100,true)<-179,'second-order phase tends to -180: '+plotYAt(d,1,100,true));
err('bode(5, 1, 10)',/transfer function of s/);
err('bode(1/(1+s), 0, 10)',/above 0/);
err('bode(1/(1+s), 1, 10, khz)',/can only be hz/);
err('bode(1/(1+s), 1)',/bode\(H/);
reset();

// ---- sampling
let sp=new PlotSpec({xvar:'x',xmin:0,xmax:10,n:11,traces:[{expr:'x^2',as:'auto',axis:'L',label:''}]});
d=plotSample(sp);
ok(d.xs.length===11&&d.xs[0]===0&&d.xs[10]===10&&d.series[0].ys[3]===9,'linear grid and values');
sp=new PlotSpec({xvar:'f',xmin:10,xmax:1e5,n:5,xscale:'log',traces:[{expr:'f',as:'auto',axis:'L',label:''}]});
d=plotSample(sp);
ok(d.xs.every((x,i)=>i===0||close(x/d.xs[i-1],10,1e-9)),'log grid is geometric: '+d.xs.join(','));
sp=new PlotSpec({xvar:'w',xmin:0.01,xmax:100,n:301,xscale:'log',traces:[{expr:'1/(j*w)^3',as:'phase',axis:'L',label:''}]});
d=plotSample(sp);
ok(d.series[0].ys.every(y=>close(y,90,1e-9)||close(y,-270,1e-9)),'phase of 1/(jw)^3 is a constant');
ok(new Set(d.series[0].ys.map(y=>Math.round(y))).size===1,'phase unwrapping gives one continuous value, not a jump');
sp=new PlotSpec({xvar:'w',xmin:1,xmax:1e4,n:400,xscale:'log',traces:[{expr:'1/((1+j*w/10)*(1+j*w/100)*(1+j*w/1000))',as:'phase',axis:'L',label:''}]});
d=plotSample(sp);
ok(d.series[0].ys.every((y,i,a)=>i===0||Math.abs(y-a[i-1])<20)&&d.series[0].ys[399]<-250,'a 3-pole phase passes -180 without wrapping: '+d.series[0].ys[399]);
sp=new PlotSpec({xvar:'x',xmin:-1,xmax:1,n:21,traces:[{expr:'ln(x)',as:'auto',axis:'L',label:''},{expr:'1/x',as:'auto',axis:'L',label:''}]});
d=plotSample(sp);
ok(d.series[1].ys.some(y=>Number.isNaN(y)),'1/x at exactly 0 becomes a gap, not a crash');
sp=new PlotSpec({xvar:'x',xmin:0,xmax:1,traces:[{expr:'3*y',as:'auto',axis:'L',label:''}]});
total++;try{plotSample(sp);fail++;console.log('FAIL unknown name should throw');}catch(e){if(!/Trace 1: Unknown name 'y'/.test(e.message)){fail++;console.log('FAIL message',e.message);}}
sp=new PlotSpec({xvar:'x',xmin:0,xmax:1,traces:[{expr:'',as:'auto',axis:'L',label:''}]});
total++;try{plotSample(sp);fail++;console.log('FAIL empty should throw');}catch(e){if(!/at least one trace/.test(e.message)){fail++;console.log('FAIL message',e.message);}}
sp=new PlotSpec({xvar:'x',xmin:0,xmax:1,xscale:'log',traces:[{expr:'x',as:'auto',axis:'L',label:''}]});
total++;try{plotSample(sp);fail++;console.log('FAIL log from 0 should throw');}catch(e){if(!/above 0/.test(e.message)){fail++;console.log('FAIL message',e.message);}}
sp=new PlotSpec({xvar:'x',xmin:0,xmax:1,traces:[{expr:'[1 2]',as:'auto',axis:'L',label:''}]});
total++;try{plotSample(sp);fail++;console.log('FAIL matrix should throw');}catch(e){if(!/not a matrix/.test(e.message)){fail++;console.log('FAIL message',e.message);}}
// a defined variable and a user function can be used in a trace
execLine('R1 = 2');execLine('g1(x) = x^2 + R1');
sp=new PlotSpec({xvar:'x',xmin:0,xmax:3,n:4,traces:[{expr:'g1(x)',as:'auto',axis:'L',label:''}]});
d=plotSample(sp);
ok(d.series[0].ys.join(',')==='2,3,6,11','user functions and variables work inside a trace: '+d.series[0].ys);
reset();
// modes
sp=new PlotSpec({xvar:'w',xmin:1,xmax:1,n:2,traces:[]});
sp=new PlotSpec({xvar:'w',xmin:1,xmax:2,n:2,traces:['re','im','mag','db','phase','phaserad','auto'].map(m=>({expr:'3+4j',as:m,axis:'L',label:m}))});
d=plotSample(sp);
const v=d.series.map(q=>q.ys[0]);
ok(v[0]===3&&v[1]===4&&v[2]===5&&close(v[3],20*Math.log10(5),1e-12)&&close(v[4],53.1301,1e-6)&&close(v[5],0.927295,1e-6)&&v[6]===5,'plot modes of 3+4j: '+v.join(' '));

// ---- ticks, ranges, formatting
ok(niceTicks(0,10,5).join(',')==='0,2,4,6,8,10','nice linear ticks: '+niceTicks(0,10,5));
ok(niceTicks(-60,0,6).join(',')==='-60,-50,-40,-30,-20,-10,0','nice ticks for a dB axis: '+niceTicks(-60,0,6));
let lt=logTicks(10,1e5);
ok(lt.major.join(',')==='10,100,1000,10000,100000'&&lt.minor.length===4*8,'log ticks: '+lt.major.join(',')+' minors '+lt.minor.length);
ok(logTicks(2,5).major.length===0&&logTicks(2,5).minor.join(',')==='2,3,4,5','a log range inside one decade still gets ticks');
ok(plotFmt(1500)==='1.5k'&&plotFmt(2.2e-6)==='2.2µ'&&plotFmt(0)==='0'&&plotFmt(-3.0103,4)==='-3.01','number formatting: '+[plotFmt(1500),plotFmt(2.2e-6),plotFmt(-3.0103,4)]);
sp=new PlotSpec({xvar:'x',xmin:0,xmax:10,n:50,traces:[{expr:'x*6-30',as:'auto',axis:'L',label:''}]});
d=plotSample(sp);let r=plotRange(sp,d,'L');
ok(r.lo===-30&&r.hi===30&&!r.log,'range of -30..30: '+JSON.stringify(r));
sp.axes.L.min=-10;sp.axes.L.max=5;r=plotRange(sp,d,'L');
ok(r.lo===-10&&r.hi===5,'user min/max override the automatic range');
sp.axes.L.min=null;sp.axes.L.max=null;sp.axes.L.scale='log';sp.traces[0].expr='x';d=plotSample(sp);r=plotRange(sp,d,'L');
ok(r.log&&r.lo>0&&r.hi>=10,'log axis range is positive: '+JSON.stringify(r));
ok(plotRange(sp,{xs:[0],series:[]},'R')===null,'an axis without traces has no range');

// ---- interpolation and crossings (the basis of manual markers)
sp=new PlotSpec({xvar:'x',xmin:0,xmax:10,n:11,traces:[{expr:'2*x',as:'auto',axis:'L',label:''}]});
d=plotSample(sp);
ok(close(plotYAt(d,0,3.5,false),7,1e-12),'linear interpolation between samples');
ok(Number.isNaN(plotYAt(d,0,11,false))&&Number.isNaN(plotYAt(d,0,-1,false)),'outside the range gives NaN');
ok(plotCross(d,0,7,false).length===1&&close(plotCross(d,0,7,false)[0],3.5,1e-12),'crossing of y = 7 is at x = 3.5');
ok(plotCross(d,0,100,false).length===0,'no crossing above the data');
sp=new PlotSpec({xvar:'x',xmin:0,xmax:6.2832,n:600,traces:[{expr:'sin(x)',as:'auto',axis:'L',label:''}]});
d=plotSample(sp);
const cr=plotCross(d,0,0.5,false);
ok(cr.length===2&&close(cr[0],Math.asin(0.5),1e-4)&&close(cr[1],Math.PI-Math.asin(0.5),1e-4),'sin(x)=0.5 crosses twice, at the right places: '+cr);
s=spec('bode(1/(1+s/1k), 10, 1M)');d=plotSample(s);
const x3=plotCross(d,0,-3,true);
ok(x3.length===1&&close(x3[0],1000,6e-3),'-3 dB crossing of the RC low-pass is at the corner: '+x3);
const x45=plotCross(d,1,-45,true);
ok(x45.length===1&&close(x45[0],1000,6e-3),'-45 degree crossing is at the corner: '+x45);
reset();

// ---- CSV
sp=new PlotSpec({xvar:'t',xmin:0,xmax:2,n:3,traces:[{expr:'t',as:'auto',axis:'L',label:'a'},{expr:'1/(t-1)',as:'auto',axis:'L',label:'b, with comma'}]});
d=plotSample(sp);
const csv=plotCSV(sp,d).trim().split('\n');
ok(csv[0]==='t,a,"b, with comma"'&&csv[1]==='0,0,-1'&&csv[2]==='1,1,'&&csv[3]==='2,2,1','CSV rows, quoting and gaps: '+csv.join(' | '));

// ---- drawing on a recording canvas
function mockCtx(){
  const c={calls:[],texts:[],fills:[]};
  const rec=n=>(...a)=>{c.calls.push(n);if(n==='fillText')c.texts.push(a[0]);if(n==='fillRect')c.fills.push(a);};
  ['beginPath','moveTo','lineTo','stroke','fillRect','strokeRect','fill','arc','clip','rect','save','restore','translate','rotate','setLineDash','fillText','scale','closePath'].forEach(n=>{c[n]=rec(n);});
  c.measureText=t=>({width:String(t).length*6});
  return c;
}
function draw(spec,opts,theme){
  const d=plotSample(spec),ctx=mockCtx();
  const g=plotDraw(ctx,1000,563,spec,d,PLOT_THEMES[theme||'light'],opts||{});
  return {ctx,g,d};
}
s=spec('bode(1/(1+s/1k), 10, 1M)');
let out=draw(s);
ok(out.ctx.calls.filter(c=>c==='stroke').length>20,'drawing strokes grid lines and curves');
ok(out.ctx.texts.includes('Bode plot')&&out.ctx.texts.some(t=>/Angular frequency\s+\(rad\/s\)/.test(t)),'title and x caption are drawn');
ok(out.ctx.texts.some(t=>/Magnitude\s+\(dB\)/.test(t))&&out.ctx.texts.some(t=>/Phase\s+\(°\)/.test(t)),'both y captions are drawn');
ok(out.ctx.texts.includes('100')&&out.ctx.texts.includes('1k')&&out.ctx.texts.includes('100k'),'log x tick labels use engineering notation');
ok(out.g.panels.length===2&&out.g.panels[0].rect.y<out.g.panels[1].rect.y,'stacked layout makes two panels');
ok(close(out.g.xAt(out.g.plot.x),10,1e-9)&&close(out.g.xAt(out.g.plot.right),1e6,1e-9),'pointer to x mapping covers the range');
out=draw(spec('plot(sin(t), right(cos(t)*100), 0, 6.28)'));
ok(out.g.panels.length===1&&out.g.panels[0].axes.join('')==='LR','overlay layout has one panel with two y axes');
s=spec('bode(1/(1+s/1k), 10, 1M)');
s.markers=[{x:1000,trace:0,label:'',guides:true},{x:1000,trace:1,label:'corner\n-45',guides:true},{x:5e5,trace:0,label:'x',guides:false},{x:2e7,trace:0,label:'off range'}];
out=draw(s);
ok(out.ctx.texts.some(t=>/1k.*-3\.01/.test(t)),'default marker label shows x and y: '+out.ctx.texts.filter(t=>/1k/.test(t)).join('|'));
ok(out.ctx.texts.includes('corner')&&out.ctx.texts.includes('-45'),'a custom multi-line marker label is drawn');
s.markers[1].label='fc = 1.59k\\n-3 dB';out=draw(s);
ok(out.ctx.texts.includes('fc = 1.59k')&&out.ctx.texts.includes('-3 dB'),'a typed backslash-n in a label becomes a line break: '+out.ctx.texts.filter(x=>/fc|dB/.test(x)).join('|'));
s.markers[1].label='corner\n-45';
ok(!out.ctx.texts.includes('off range'),'a marker outside the range is not drawn');
ok(out.g.boxes.length===3,'three markers placed: '+out.g.boxes.length);
out=draw(s,{cursorX:2500});
ok(out.ctx.texts.some(t=>/^Magnitude = /.test(t))&&out.ctx.texts.some(t=>/^w = 2\.5k/.test(t)),'the hover readout lists every trace at the pointer: '+out.ctx.texts.filter(t=>/=/.test(t)).join('|'));
out=draw(s,{cursorX:5},'dark');
ok(out.ctx.texts.length>5,'a cursor outside the range is ignored and drawing still works in the dark theme');
// other layouts and axis types must not throw
for(const line of ['plot(x^2, 0, 3)','plot(exp(-x), x, 0, 5, logy)','plot(x, x^2, 1, 100, loglog)','plot(sin(x), 0, 6, stacked)','plot(x, 3, 3.0001)']){
  total++;
  try{const sp2=spec(line);if(!sp2)continue;const o=draw(sp2,{cursorX:(sp2.xmin+sp2.xmax)/2});if(!(o.ctx.calls.length>10))throw new Error('nothing drawn');}
  catch(e){fail++;console.log('FAIL drawing',line,e.message);}
}
console.log(fail?fail+' FAILED of '+total:'all '+total+' passed');
process.exit(fail?1:0);
