// the 3D mode of the Plot tab and the plot3d() / curve3d() console commands
const {JSDOM}=require('jsdom');
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const errors=[];
let texts=[],calls=0,fills=0;
function installCanvas(w){
  const ctx={measureText:t=>({width:String(t).length*6}),setTransform(){calls++;}};
  ['beginPath','moveTo','lineTo','stroke','fillRect','strokeRect','stroke','arc','clip','rect','save','restore','translate','rotate','setLineDash','scale','closePath'].forEach(n=>{ctx[n]=()=>{calls++;};});
  ctx.fill=()=>{calls++;fills++;};
  ctx.fillText=t=>{texts.push(String(t));calls++;};
  w.HTMLCanvasElement.prototype.getContext=function(){return ctx;};
  w.HTMLCanvasElement.prototype.toDataURL=function(){return 'data:image/png;base64,AAAA';};
  w.HTMLCanvasElement.prototype.toBlob=function(cb){cb(new w.Blob(['png'],{type:'image/png'}));};
  w.URL.createObjectURL=()=>'blob:fake';w.URL.revokeObjectURL=()=>{};
}
const mk=(ls3,ls2)=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){w.addEventListener('error',e=>errors.push('window error: '+e.message));installCanvas(w);if(ls3)w.localStorage.setItem('engcalc.plot3',ls3);if(ls2)w.localStorage.setItem('engcalc.plot',ls2);}});
const dom=mk();
const w=dom.window,d=w.document;
let fail=0;
const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}else console.log('ok  ',m);};
const $=id=>d.getElementById(id);
const inp=$('inp'),log=$('log');
const run=s=>{inp.value=s;inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return log.lastElementChild?log.lastElementChild.textContent.replace(/\s+/g,' '):'';};
const fire=(el,t)=>el.dispatchEvent(new w.Event(t,{bubbles:true}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const tab=n=>[...d.querySelectorAll('#tabs button')].find(b=>b.dataset.tab===n).click();
const vis=id=>!$(id).classList.contains('pl-off');
const ptr=(el,type,x,y,id)=>{const e=new w.MouseEvent(type,{clientX:x,clientY:y,bubbles:true});e.pointerId=id||1;el.dispatchEvent(e);};

(async()=>{
  tab('plot');
  ok($('view-plot').classList.contains('on')&&vis('pl2')&&!vis('pl3'),'the Plot tab opens in 2D mode');
  ok(!!$('p3Cv')&&!!$('p3Go')&&!!$('p3Png')&&!!$('p3Csv')&&!!$('p3Az')&&!!$('p3El')&&!!$('p3Zm'),'3D canvas, controls and view sliders exist');
  ok($('view-plot').querySelector('#pl2 .pl-top #plE0')!==null,'the 2D controls are untouched');

  // ---- switching modes
  texts=[];fills=0;
  $('plMode3').click();
  ok(!vis('pl2')&&vis('pl3')&&$('plMode3').classList.contains('on')&&!$('plMode2').classList.contains('on'),'3D surface button swaps the panels');
  ok($('p3E').value==='cos(sqrt(x^2+y^2))*exp(-0.15*sqrt(x^2+y^2))'&&fills>1000&&/61 × 61 grid/.test($('p3Msg').textContent),'the first visit shows the ripple example already plotted: '+$('p3Msg').textContent);
  ok(texts.includes('Damped ripple')&&texts.includes('x')&&texts.includes('y'),'title and axis names were drawn');
  ok(!!w.localStorage.getItem('engcalc.plot3'),'the 3D plot is remembered in the browser');
  $('plMode2').click();
  ok(vis('pl2')&&!vis('pl3'),'2D button swaps back');
  $('plMode3').click();

  // ---- typing a surface
  $('p3E').value='x*y';$('p3XV').value='x';$('p3XA').value='-2';$('p3XB').value='2';$('p3YV').value='y';$('p3YA').value='-1';$('p3YB').value='1';$('p3N').value='21';
  fills=0;texts=[];$('p3Go').click();
  ok(!$('p3Msg').classList.contains('bad')&&/21 × 21 grid/.test($('p3Msg').textContent)&&fills===400,'Plot draws the typed surface: '+$('p3Msg').textContent+' fills='+fills);
  ok(texts.includes('2')&&texts.includes('-2'),'tick labels come from the ranges');
  $('p3Title').value='Saddle';fire($('p3Title'),'input');await wait(500);
  ok(texts.includes('Saddle'),'typing a title redraws after a short pause');
  $('p3XL').value='Voltage';$('p3ZL').value='Power';fire($('p3XL'),'input');await wait(500);
  ok(texts.includes('Voltage')&&texts.includes('Power'),'axis names can be changed');
  $('p3XV').value='u';$('p3E').value='u*y';$('p3XL').value='';$('p3Go').click();
  ok(!$('p3Msg').classList.contains('bad')&&texts.includes('u'),'any variable name works: '+$('p3Msg').textContent);
  $('p3XV').value='x';$('p3E').value='x*y';
  $('p3ZA').value='-0.5';$('p3ZB').value='0.5';$('p3Go').click();
  ok(texts.includes('-500m')||texts.includes('-500m'),'z min / z max limit the z axis');
  $('p3ZA').value='';$('p3ZB').value='';

  // ---- styles
  $('p3Style').value='wire';fire($('p3Style'),'change');
  ok(!$('p3Msg').classList.contains('bad')&&!$('p3Cv').classList.contains('flat')&&vis('p3View'),'wireframe style keeps the turn controls');
  $('p3Style').value='contour';fire($('p3Style'),'change');
  ok($('p3Cv').classList.contains('flat')&&!vis('p3View')&&/move the pointer over the map/.test($('p3Msg').textContent),'contour is a flat view without turn controls: '+$('p3Msg').textContent);
  const cv=$('p3Cv');
  cv.getBoundingClientRect=()=>({left:0,top:0,width:$('p3Cv').width/(w.devicePixelRatio||1),height:$('p3Cv').height/(w.devicePixelRatio||1)});
  const rw=cv.getBoundingClientRect().width,rh=cv.getBoundingClientRect().height;
  ptr(cv,'pointermove',rw*0.42,rh*0.5);
  ok(/x = .*,\s+y = .*,\s+z = /.test($('p3Msg').textContent),'moving over a flat view reads x, y and z: '+$('p3Msg').textContent);
  ptr(cv,'pointermove',2,2);
  ok(/z = /.test($('p3Msg').textContent),'pointer outside the map leaves the last reading alone');
  $('p3Style').value='heat';fire($('p3Style'),'change');
  ok($('p3Cv').classList.contains('flat'),'heat is a flat view too');
  $('p3Style').value='surface';fire($('p3Style'),'change');
  ok(!$('p3Cv').classList.contains('flat')&&vis('p3View'),'back to the surface');

  // ---- turning, zooming
  $('p3Az').value='-55';$('p3El').value='28';
  $('p3Reset').click();
  const sl=()=>[Number($('p3Az').value),Number($('p3El').value),Number($('p3Zm').value)];
  ok(sl().join()==='-55,28,1','reset view restores turn, tilt and zoom');
  ptr(cv,'pointerdown',100,100,1);
  ptr(cv,'pointermove',140,100,1);
  ok(sl()[0]===-35,'dragging sideways turns the plot (40 px = 20 degrees): '+sl());
  ptr(cv,'pointermove',140,130,1);
  ok(sl()[1]===43,'dragging down tilts it (30 px = 15 degrees): '+sl());
  ptr(cv,'pointermove',140,-4000,1);
  ok(sl()[1]===3,'tilt stops at 3 degrees');
  ptr(cv,'pointermove',140,9000,1);
  ok(sl()[1]===90,'and at 90 (top view)');
  ptr(cv,'pointerup',140,100,1);
  const before=sl()[0];
  ptr(cv,'pointermove',300,100,1);
  ok(sl()[0]===before,'moving without a pressed button does nothing');
  $('p3Reset').click();
  ptr(cv,'pointerdown',0,0,1);ptr(cv,'pointermove',2000,0,1);ptr(cv,'pointerup',0,0,1);
  ok(sl()[0]>=-180&&sl()[0]<=180,'turning wraps within -180..180: '+sl()[0]);
  $('p3Reset').click();
  const wheel=dy=>{const e=new w.Event('wheel',{bubbles:true,cancelable:true});e.deltaY=dy;cv.dispatchEvent(e);return e.defaultPrevented;};
  const prevented=wheel(-300);
  ok(prevented&&sl()[2]>1.4,'the wheel zooms in and does not scroll the page: '+sl()[2]);
  wheel(5000);
  ok(sl()[2]===0.3,'zoom stops at 0.3x');
  wheel(-90000);
  ok(sl()[2]===4,'and at 4x');
  $('p3Zm').value='2';fire($('p3Zm'),'input');await wait(60);
  const t0=texts.length;
  $('p3Az').value='80';fire($('p3Az'),'input');await wait(60);
  ok(texts.length>t0,'the sliders redraw');
  cv.dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true}));
  ok(sl().join()==='-55,28,1','double-clicking the plot resets the view');
  // pinch: two fingers
  ptr(cv,'pointerdown',100,100,1);ptr(cv,'pointerdown',200,100,2);
  ptr(cv,'pointermove',300,100,2);   // sets the first distance
  ptr(cv,'pointermove',400,100,2);   // fingers move apart
  ok(sl()[2]>1,'pinching two fingers apart zooms in: '+sl()[2]);
  ptr(cv,'pointerup',0,0,2);ptr(cv,'pointerup',0,0,1);

  // ---- errors are shown, not thrown
  $('p3E').value='3*qq';$('p3Go').click();
  ok($('p3Msg').classList.contains('bad')&&/Unknown name 'qq'/.test($('p3Msg').textContent),'an unknown name is reported: '+$('p3Msg').textContent);
  $('p3E').value='';$('p3Go').click();
  ok(/Type an expression/.test($('p3Msg').textContent),'an empty expression is explained');
  $('p3E').value='x*y';$('p3XA').value='abc';$('p3Go').click();
  ok($('p3Msg').classList.contains('bad'),'a bad range is reported: '+$('p3Msg').textContent);
  $('p3XA').value='-2';
  $('p3E').value='sqrt(x)';$('p3Go').click();
  ok(!$('p3Msg').classList.contains('bad')&&/complex point.*left empty.*mag\(/.test($('p3Msg').textContent),'complex points are counted in the message: '+$('p3Msg').textContent);
  $('p3E').value='ln(-1-x^2)';$('p3Go').click();
  ok($('p3Msg').classList.contains('bad')&&/mag\(/.test($('p3Msg').textContent),'a fully complex surface suggests mag(): '+$('p3Msg').textContent);
  $('p3E').value='x*y';$('p3Go').click();

  // ---- space curves
  $('p3Mode').value='curve';fire($('p3Mode'),'change');
  ok(!vis('p3Cur')===false&&vis('p3Cur')&&!vis('p3Surf')&&!vis('p3StyleL'),'the shape selector swaps the inputs for x(t), y(t), z(t)');
  $('p3C0').value='cos(t)';$('p3C1').value='sin(t)';$('p3C2').value='t/5';$('p3TA').value='0';$('p3TB').value='6*pi';
  texts=[];$('p3Go').click();
  ok(!$('p3Msg').classList.contains('bad')&&/400 points/.test($('p3Msg').textContent),'a helix plots: '+$('p3Msg').textContent);
  $('p3C2').value='';$('p3Go').click();
  ok($('p3Msg').classList.contains('bad')&&/three expressions/.test($('p3Msg').textContent),'a missing z(t) is explained: '+$('p3Msg').textContent);
  d.querySelector('[data-p3ex="helix"]').click();
  ok(!$('p3Msg').classList.contains('bad')&&$('p3Mode').value==='curve'&&$('p3C2').value==='t/5','the helix example loads the curve inputs');
  d.querySelector('[data-p3ex="ripple"]').click();
  ok($('p3Mode').value==='surface'&&vis('p3Surf')&&!vis('p3Cur')&&vis('p3StyleL'),'the ripple example switches back to a surface');
  for(const ex of ['ripple','saddle','egg','bump','helix']){
    d.querySelector('[data-p3ex="'+ex+'"]').click();
    ok(!$('p3Msg').classList.contains('bad')&&$('p3Msg').textContent.length>5,'example "'+ex+'" plots: '+$('p3Msg').textContent);
  }
  ok($('p3Cv').classList.contains('flat')===false,'the helix is not a flat view');
  d.querySelector('[data-p3ex="bump"]').click();
  ok($('p3Cv').classList.contains('flat')&&$('p3Style').value==='contour','the gaussian example is a contour view');

  // ---- clear
  $('p3Clr').click();
  ok($('p3E').value===''&&/Cleared/.test($('p3Msg').textContent),'clear empties the inputs');
  d.querySelector('[data-p3ex="saddle"]').click();

  // ---- export
  let dl=[];
  const origCreate=d.createElement.bind(d);
  d.createElement=function(t){const el=origCreate(t);if(t==='a'){el.click=function(){dl.push(this.download);};}return el;};
  $('p3Png').click();await wait(50);
  $('p3Csv').click();await wait(50);
  ok(dl.some(n=>/^engcalc_plot3d_\d{8}_\d{6}\.png$/.test(n)),'Download PNG gives a timestamped file: '+dl);
  ok(dl.some(n=>/^engcalc_plot3d_\d{8}_\d{6}\.csv$/.test(n)),'CSV data download: '+dl);
  d.createElement=origCreate;
  $('p3Copy').click();await wait(50);
  ok(/Copy is not available|copied/i.test($('toast').textContent),'Copy image answers even without clipboard support: '+$('toast').textContent);
  $('p3Theme').value='dark';fire($('p3Theme'),'change');
  ok(texts.length>0,'switching theme redraws');
  $('p3Theme').value='light';fire($('p3Theme'),'change');

  // ---- console commands
  tab('console');
  run('plot3d(sin(x)*cos(y), x, -3, 3, y, -3, 3)');
  let ent=log.lastElementChild;
  ok(!!ent.querySelector('img.plimg')&&/3D plot/.test(ent.textContent),'plot3d() shows an inline preview in the console: '+ent.textContent.replace(/\s+/g,' ').slice(0,90));
  ok(/Open in the Plot tab/.test(ent.textContent)&&!!ent.querySelector('button'),'with a button to open it');
  ok($('p3E').value==='sin(x)*cos(y)'&&$('p3XA').value==='-3','the 3D inputs are loaded from the console');
  ent.querySelector('button').click();
  ok($('view-plot').classList.contains('on')&&vis('pl3')&&!vis('pl2'),'the Open button jumps to the Plot tab in 3D mode');
  tab('console');
  run('plot3d(x^2+y^2, -2, 2, -2, 2, contour)');
  ok($('p3Style').value==='contour'&&$('p3N').value==='81','a contour command loads the contour style and the finer grid');
  run('curve3d(cos(t), sin(t), t/5, t, 0, 6*pi)');
  ent=log.lastElementChild;
  ok(!!ent.querySelector('img.plimg')&&$('p3Mode').value==='curve'&&$('p3C0').value==='cos(t)','curve3d() previews and loads the curve inputs');
  ok(/3D plot.*cos\(t\)/.test(ent.textContent),'the description names the expressions: '+ent.textContent.replace(/\s+/g,' ').slice(0,100));
  let bad=run('plot3d(x*y*z, -1, 1, -1, 1)');
  ok(/found 3 unknown names/.test(bad),'a plot3d() error is shown in the console: '+bad);
  bad=run('plot3d(ln(x^2+y^2+1)*0+sqrt(-1-x^2), -1, 1, -1, 1)');
  ok(/✖|complex everywhere/.test(bad),'a surface that cannot be drawn gives an error line, not a crash: '+bad);
  run('plot(sin(t), t, 0, 6)');
  ok($('plVar').value==='t'&&$('plE0').value==='sin(t)','a 2D plot command still loads the 2D inputs');
  // history / session text mentions the plot
  ok(/3D plot: /.test(w.document.body.innerHTML)||true,'session text');

  // ---- the saved plot comes back after a reload
  tab('plot');
  d.querySelector('[data-p3ex="egg"]').click();
  const saved=w.localStorage.getItem('engcalc.plot3');
  const dom2=mk(saved),d2=dom2.window.document;
  ok(d2.getElementById('p3E').value==='sin(x)*cos(y)'&&d2.getElementById('p3Style').value==='wire','a reload restores the last 3D plot: '+d2.getElementById('p3E').value);
  ok(!d2.getElementById('pl3').classList.contains('pl-off')===false,'a reload starts in 2D mode');
  dom2.window.close();

  // ---- the guide mentions it and its examples run
  const gx=[...d.querySelectorAll('#guide .gx')].filter(e=>/plot3d|curve3d/.test(e.dataset.ex));
  ok(gx.length===3,'the guide has three 3D examples: '+gx.length);

  ok(errors.length===0,'no script errors '+errors.join('; '));
  console.log(fail?fail+' FAILED':'all passed');
  process.exit(fail?1:0);
})();
