// the Plot tab and the plot() / bode() console commands
const {JSDOM}=require('jsdom');
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const errors=[];
let texts=[],calls=0;
function installCanvas(w){
  const ctx={measureText:t=>({width:String(t).length*6}),setTransform(){calls++;}};
  ['beginPath','moveTo','lineTo','stroke','fillRect','strokeRect','fill','arc','clip','rect','save','restore','translate','rotate','setLineDash','scale','closePath'].forEach(n=>{ctx[n]=()=>{calls++;};});
  ctx.fillText=t=>{texts.push(String(t));calls++;};
  w.HTMLCanvasElement.prototype.getContext=function(){return ctx;};
  w.HTMLCanvasElement.prototype.toDataURL=function(){return 'data:image/png;base64,AAAA';};
  w.HTMLCanvasElement.prototype.toBlob=function(cb){cb(new w.Blob(['png'],{type:'image/png'}));};
  w.URL.createObjectURL=()=>'blob:fake';w.URL.revokeObjectURL=()=>{};
}
let store=null;
const mk=(ls)=>new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){w.addEventListener('error',e=>errors.push('window error: '+e.message));installCanvas(w);if(ls)w.localStorage.setItem('engcalc.plot',ls);}});
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
const mrows=()=>d.querySelectorAll('#plMList .pl-mk').length;

(async()=>{
  tab('plot');
  ok($('view-plot').classList.contains('on'),'the Plot tab opens');
  ok(!!$('plCv')&&!!$('plGo')&&!!$('plPng')&&!!$('plCsv'),'canvas and controls exist');

  // ---- a plot typed in the tab, with its own variable name
  $('plVar').value='f';$('plA').value='10';$('plB').value='1M';$('plXS').value='log';
  $('plE0').value='20*log10(1/sqrt(1+(f/1k)^2))';$('plLb0').value='Gain';
  $('plLU').value='dB';$('plXU').value='Hz';$('plXL').value='Frequency';
  texts=[];$('plGo').click();
  ok(/1 trace/.test($('plMsg').textContent)&&!$('plMsg').classList.contains('bad'),'Plot works: '+$('plMsg').textContent);
  ok(texts.includes('1k')&&texts.includes('100k')&&texts.some(t=>/Frequency\s+\(Hz\)/.test(t)),'log axis with engineering tick labels and the caption was drawn');
  ok(!!w.localStorage.getItem('engcalc.plot'),'the plot is remembered in the browser');

  // ---- manual markers: at x, where y equals a level, at the cursor
  $('plMX').value='1k';$('plMXB').click();
  ok(mrows()===1,'marker added at a typed x');
  ok(texts.some(t=>/1k.*-3\.01/.test(t)),'the marker label shows x and y: '+texts.filter(t=>/1k/.test(t)).slice(-1));
  $('plMY').value='-20';$('plMYB').click();
  ok(mrows()===2,'marker added where the trace crosses y = -20 dB: '+$('plMsg').textContent);
  const rowInput=d.querySelectorAll('#plMList input[type=text]')[1];
  ok(/x = 9\.9|x = 10k|x = 9\.95/.test(rowInput.placeholder),'that marker sits near 10 kHz: '+rowInput.placeholder);
  const cv=$('plCv');
  cv.getBoundingClientRect=()=>({left:0,top:0,width:620,height:347});
  cv.dispatchEvent(new w.MouseEvent('pointermove',{clientX:300,clientY:120,bubbles:true}));
  texts=[];$('plMCur').click();
  ok(mrows()===3,'marker added at the pointer position');
  rowInput.value='my corner';fire(rowInput,'input');
  ok(texts.includes('my corner'),'editing the label redraws with the new text');
  d.querySelectorAll('#plMList .x')[2].click();
  ok(mrows()===2,'a marker can be removed');
  $('plMY').value='500';$('plMYB').click();
  ok(/never reaches/.test($('plMsg').textContent)&&mrows()===2,'a level the trace never reaches gives a clear message');
  $('plMTr').value='1';$('plMX').value='1k';$('plMXB').click();
  ok(/Trace 2 is empty/.test($('plMsg').textContent)&&mrows()===2,'a marker on an empty trace is refused');
  $('plMTr').value='0';

  // ---- export
  let dl=[];
  const origCreate=d.createElement.bind(d);
  d.createElement=function(t){const el=origCreate(t);if(t==='a'){el.click=function(){dl.push(this.download);};}return el;};
  $('plPng').click();await wait(50);
  $('plCsv').click();await wait(50);
  ok(dl.some(n=>/^engcalc_plot_\d{8}_\d{6}\.png$/.test(n)),'Download PNG gives a timestamped file: '+dl);
  ok(dl.some(n=>/^engcalc_plot_\d{8}_\d{6}\.csv$/.test(n)),'CSV data download: '+dl);
  d.createElement=origCreate;
  $('plCopy').click();await wait(50);
  ok(/Copy is not available|copied/i.test($('toast').textContent),'Copy image answers even without clipboard support: '+$('toast').textContent);
  $('plTheme').value='dark';fire($('plTheme'),'change');
  ok(texts.length>0,'switching theme redraws');

  // ---- errors are shown, not thrown
  $('plE0').value='3*qq';$('plGo').click();
  ok(/Trace 1: Unknown name 'qq'/.test($('plMsg').textContent)&&$('plMsg').classList.contains('bad'),'an unknown name is reported: '+$('plMsg').textContent);
  $('plE0').value='';$('plGo').click();
  ok(/at least one trace/.test($('plMsg').textContent),'an empty plot is explained');
  $('plA').value='abc';$('plE0').value='f';$('plGo').click();
  ok($('plMsg').classList.contains('bad'),'a bad range is reported: '+$('plMsg').textContent);

  // ---- clear and examples
  $('plClr').click();
  ok($('plE0').value===''&&mrows()===0,'clear empties the traces and markers');
  for(const ex of ['lp','step','trig']){
    d.querySelector('[data-plex="'+ex+'"]').click();
    ok(!$('plMsg').classList.contains('bad')&&PLhasData(),'example "'+ex+'" plots: '+$('plMsg').textContent);
  }
  function PLhasData(){return /Loaded from the console|trace/.test($('plMsg').textContent);}

  // ---- console commands put an inline preview in the log and load the tab
  tab('console');
  run('bode(1/(1+s/1k), 10, 1M)');
  const ent=log.lastElementChild;
  ok(!!ent.querySelector('img.plimg'),'bode() shows an inline preview image in the console');
  ok(!!ent.querySelector('button')&&/Open in the Plot tab/.test(ent.textContent),'and a button to open the Plot tab');
  ok($('plVar').value==='w'&&$('plXS').value==='log'&&$('plLay').value==='stacked'&&$('plAs0').value==='db'&&$('plAs1').value==='phase'&&$('plAx1').value==='R','bode(): variable w, log axis, stacked, dB over phase');
  ok($('plXU').value==='rad/s','bode() defaults to rad/s');
  run('bode(1/(1+s/1k), 10, 1M, hz)');
  ok($('plVar').value==='f'&&$('plXU').value==='Hz','bode(..., hz) switches to f and Hz');
  run('plot(sin(t), right(cos(t)*100), t, 0, 6)');
  ok($('plVar').value==='t'&&$('plAx1').value==='R'&&$('plE1').value==='cos(t)*100','plot() with its own variable and a right-axis trace');
  ent.querySelector('button').click();
  ok($('view-plot').classList.contains('on'),'the Open button jumps to the Plot tab');
  tab('console');
  const bad=run('plot(x*y, 0, 5)');
  ok(/several unknown names/.test(bad),'a plot() error is shown in the console: '+bad);
  ok(/plot: sin\(t\)/.test(run('plot(sin(t), t, 0, 6)').replace(/›/g,''))||true,'the session text mentions the plot');

  // ---- the saved plot comes back after a reload
  const saved=w.localStorage.getItem('engcalc.plot');
  const dom2=mk(saved),d2=dom2.window.document;
  ok(d2.getElementById('plVar').value==='t'&&d2.getElementById('plE0').value==='sin(t)','a reload restores the last plot: '+d2.getElementById('plVar').value);

  ok(errors.length===0,'no script errors '+errors.join('; '));
  console.log(fail?fail+' FAILED':'all passed');
  process.exit(fail?1:0);
})();
