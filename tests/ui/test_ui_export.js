// clear (command, button, Ctrl+L) wipes variables too; the Export dialog builds a valid SVG and PNG pipeline
const {JSDOM}=require('jsdom');
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const errors=[];
let lastSrc='';
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
  beforeParse(w){
    w.addEventListener('error',e=>errors.push('window error: '+e.message));
    // jsdom has no image decoding or canvas: fake just enough to exercise the export pipeline
    w.Image=function(){
      const el=w.document.createElement('img');
      Object.defineProperty(el,'src',{configurable:true,set(v){this._s=v;if(String(v).startsWith('data:'))lastSrc=v;setTimeout(()=>el.onload&&el.onload(),0);},get(){return this._s;}});
      return el;
    };
    w.HTMLCanvasElement.prototype.getContext=function(){return {drawImage(){}};};
    w.HTMLCanvasElement.prototype.toBlob=function(cb){cb(new w.Blob(['png'],{type:'image/png'}));};
    w.URL.createObjectURL=()=>'blob:fake';w.URL.revokeObjectURL=()=>{};
  }});
const w=dom.window,d=w.document;
let fail=0;
const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}else console.log('ok  ',m);};
const inp=d.getElementById('inp'),log=d.getElementById('log'),vars=d.getElementById('varlist');
const run=s=>{inp.value=s;inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return log.lastElementChild?log.lastElementChild.textContent.replace(/\s+/g,' '):'';};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  // ---- clear wipes variables, functions and ans as well
  run('x = 5');run('y = 7');run('F1(t) = t^2');run('2+3');
  ok(vars.textContent.includes('x')&&vars.textContent.includes('F1'),'variables panel lists x and F1');
  run('clear');
  ok(log.children.length===0,'clear command empties the screen');
  ok(vars.querySelectorAll('.vname').length===0,'clear command empties the variables panel');
  ok(/Unknown name 'x'/.test(run('x')),'x is gone after clear');
  ok(/No previous result/.test(run('ans')),'ans is gone after clear');
  ok(/Unknown function 'F1'/.test(run('F1(2)')),'F1 is gone after clear');
  run('z = 3');
  d.getElementById('btnClear').click();
  ok(log.children.length===0&&/Unknown name 'z'/.test(run('z')),'Clear button wipes screen and variables');
  run('w1 = 9');
  inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'l',ctrlKey:true,bubbles:true}));
  ok(log.children.length===0&&/Unknown name 'w1'/.test(run('w1')),'Ctrl+L wipes screen and variables');
  run('delall');

  // ---- export dialog
  run('R1 = 2.2k');run('R1 * 3');run('sin(pi/6)');run('[1 2; 3 4] * [5; 6]');run('diff(x^3)');
  d.getElementById('btnExport').click();
  ok(!d.getElementById('exp').hidden,'Export opens the dialog');
  await wait(400);
  ok(/calculations? ·/.test(d.getElementById('expMsg').textContent),'preview rendered: '+d.getElementById('expMsg').textContent);
  ok(!!d.querySelector('#expPrev img'),'preview image shown');
  ok(lastSrc.startsWith('data:image/svg+xml'),'an SVG data URL is drawn to the canvas');
  const svg=decodeURIComponent(lastSrc.slice(lastSrc.indexOf(',')+1));
  const doc=new w.DOMParser().parseFromString(svg,'image/svg+xml');
  ok(!doc.querySelector('parsererror'),'the SVG is well-formed XML');
  ok(svg.includes('foreignObject')&&svg.includes('--bg:#ffffff'),'light theme is applied by default');
  const plain=doc.documentElement.textContent.replace(/\s+/g,' ');
ok(plain.includes('diff(x^3)')&&plain.includes('3*x^2'),'the last calculation (diff) is in the image');
  ok(svg.includes('mtx'),'matrix table markup is in the image');
  // only the last N
  d.getElementById('expN').value='2';d.getElementById('expN').dispatchEvent(new w.Event('input',{bubbles:true}));
  await wait(400);
  const svg2=decodeURIComponent(lastSrc.slice(lastSrc.indexOf(',')+1));
  ok(svg2.includes('3*x^2')&&svg2.includes('mtx')&&!svg2.includes('sin(pi/6)'),'N = 2 keeps only the last two calculations');
  // dark theme
  d.getElementById('expTheme').value='dark';d.getElementById('expTheme').dispatchEvent(new w.Event('change',{bubbles:true}));
  await wait(400);
  const svg3=decodeURIComponent(lastSrc.slice(lastSrc.indexOf(',')+1));
  ok(!svg3.includes('--bg:#ffffff')&&svg3.includes('--bg:#0b1020'),'dark theme switches the colours');
  // download triggers an anchor click with a .png name
  let dl='';
  const origCreate=d.createElement.bind(d);
  d.createElement=function(t){const el=origCreate(t);if(t==='a'){el.click=function(){dl=this.download;};}return el;};
  d.getElementById('expPng').click();
  ok(/^engcalc_\d{8}_\d{6}\.png$/.test(dl),'Download PNG uses a timestamped .png name: '+dl);
  d.createElement=origCreate;
  // close
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  ok(d.getElementById('exp').hidden,'Esc closes the dialog');
  // nothing to export
  d.getElementById('btnClear').click();
  d.getElementById('btnExport').click();
  await wait(400);
  ok(/Nothing to export/.test(d.getElementById('expMsg').textContent),'empty log gives a clear message');
  ok(errors.length===0,'no script errors '+errors.join('; '));
  console.log(fail?fail+' FAILED':'all passed');
  process.exit(fail?1:0);
})();
