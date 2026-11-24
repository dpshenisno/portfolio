const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

for (const file of ['dist/contact-wave.js', ...['capture','controller','model','renderer'].map(n => `dist/vendor/distortion-waves/${n}.js`)]) {
  const check = spawnSync(process.execPath, ['--check','--input-type=module'], { input: fs.readFileSync(file), encoding:'utf8' });
  assert.equal(check.status, 0, check.stderr);
}
new vm.Script(fs.readFileSync('dist/liquid-interactions.js','utf8'));
for (const file of ['dist/index.html','dist/sber/index.html']) {
  const html = fs.readFileSync(file,'utf8');
  assert.equal((html.match(/type="module" src="[^\"]*contact-wave\.js/g) || []).length, 1);
  assert.equal((html.match(/contact-wave\.css/g) || []).length, 1);
  assert.match(html, /liquid-interactions\.js\?v=33/);
}

// Exercise our lifecycle adapter without requiring a GPU/browser.
const calls = [], events = {}, buttonEvents = {}, timers = new Map();
let tid = 0, captureOptions, observer;
class Element {
  constructor() { this.dataset = {}; this.attrs = {}; this.children = []; this.style = {}; }
  setAttribute(k,v) { this.attrs[k] = v; }
  append(el) { this.children.push(el); el.parentElement = this; }
  remove() { calls.push('remove'); }
  matches() { return false; }
  getBoundingClientRect() { return {left:20,top:40,width:120,height:48}; }
  addEventListener(n,fn) { buttonEvents[n] = fn; }
}
const button = new Element(), body = new Element(); body.append(button);
const reduced = { matches:false, addEventListener(n,fn) { events.motion = fn; } };
const document = { body, hidden:false, documentElement:new Element(),
  querySelector: () => button, createElement: () => new Element(),
  addEventListener(n,fn) { events['document:'+n] = fn; } };
class Controller {
  constructor(root) { calls.push('create'); this.root = root; }
  update(o) { this.opts = o; calls.push('update'); }
  prepare() { calls.push('prepare'); return this.opts.capture({width:1200,height:800,scale:1}); }
  play(o) { assert.equal(o.source,button); calls.push('play'); }
  destroy() { calls.push('destroy'); }
}
const context = {
  WaveController:Controller, snapshot:async (el,o) => { assert.equal(el,body); captureOptions=o; return {canvas:{}}; },
  document, window:{}, matchMedia:()=>reduced, MutationObserver:class {constructor(fn){observer=fn;}observe(){}},
  addEventListener(n,fn){events[n]=fn;}, getComputedStyle:() => ({width:'120px',height:'48px',getPropertyValue:()=> '#FDFDFC'}),
  innerWidth:1200, innerHeight:800, devicePixelRatio:2,
  setTimeout(fn,ms) { timers.set(++tid,{fn,ms}); return tid; }, clearTimeout(id){timers.delete(id);}
};
vm.runInNewContext(fs.readFileSync('dist/contact-wave.js','utf8').replace(/^import .*;\r?\n/gm,''),context);
(async () => {
  const api=context.window.portfolioContactWave;
  assert.equal(calls.length,0,'no idle renderer or snapshot');
  buttonEvents.pointerenter(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls.slice(0,3),['create','update','update']);
  assert.equal(captureOptions.skip(document.body.children.at(-1)),true);
  assert.equal(captureOptions.skip(button),true);
  assert.equal(captureOptions.force(body).height,'800px');
  assert.equal(api.play(),true);
  assert.equal(calls.at(-1),'play');
  assert.ok(!timers.size,'prewarm disposal cannot interrupt the wave');
  events.scroll(); assert.equal(calls.at(-2),'destroy','scroll cancels stale screen lens');
  buttonEvents.focus(); await new Promise(resolve => setImmediate(resolve));
  document.hidden=true; events['document:visibilitychange']();
  assert.equal(calls.at(-2),'destroy');
  document.hidden=false; reduced.matches=true;
  const before=calls.length; assert.equal(api.play(),false); assert.equal(calls.length,before);
  reduced.matches=false; buttonEvents.pointerenter(); await new Promise(resolve => setImmediate(resolve));
  events.pagehide(); assert.equal(calls.at(-2),'destroy');
  console.log('PASS: modules, both routes, idle behavior, prewarm, viewport capture, scrolling cancellation, visibility, reduced motion and page teardown.');
})().catch(e => {console.error(e);process.exitCode=1;});
