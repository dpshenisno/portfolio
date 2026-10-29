(() => {
'use strict';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(pointer:fine)');
const root=document.documentElement;
let frame=0,target=scrollY,lastApplied=scrollY,lastTime=0,direction=0;
const limit=()=>Math.max(0,(document.scrollingElement||root).scrollHeight-innerHeight);
const clamp=y=>Math.max(0,Math.min(limit(),y));
function cancel(){if(frame)cancelAnimationFrame(frame);frame=0;lastTime=0;target=lastApplied=scrollY;direction=0;root.classList.remove('wheel-smoothing');}
function emit(){dispatchEvent(new Event('portfolio:scroll-frame'));}
function tick(time){
 frame=0;
 if(reduced.matches||document.hidden){cancel();return;}
 const dt=lastTime?Math.min(48,time-lastTime):16.67;lastTime=time;
 target=clamp(target);
 const remaining=target-scrollY;
 const eased=remaining*(1-Math.exp(-dt/95));
 const step=Math.abs(eased)<1?Math.sign(remaining)*Math.min(1,Math.abs(remaining)):eased;
 const next=Math.abs(remaining)<1.25?target:scrollY+step;
 root.classList.add('wheel-smoothing');
 scrollTo({top:next,behavior:'instant'});lastApplied=scrollY;
 // Source photo and distortion are painted together, avoiding a trailing rectangle.
 emit();
 if(Math.abs(target-scrollY)>1.25)frame=requestAnimationFrame(tick);
 else{scrollTo({top:target,behavior:'instant'});lastApplied=scrollY;emit();lastTime=0;direction=0;root.classList.remove('wheel-smoothing');}
}
function nestedCanScroll(node,delta){
 for(let el=node instanceof Element?node:node?.parentElement;el&&el!==document.body;el=el.parentElement){
  if(el.matches('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return true;
  if(el.scrollHeight<=el.clientHeight+1)continue;
  if(!/(auto|scroll)/.test(getComputedStyle(el).overflowY))continue;
  if((delta<0&&el.scrollTop>0)||(delta>0&&el.scrollTop+el.clientHeight<el.scrollHeight-1))return true;
 }
 return false;
}
addEventListener('wheel',event=>{
 if(reduced.matches||!fine.matches||event.ctrlKey||event.metaKey||event.shiftKey||!event.cancelable||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
 const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
 if(!delta||nestedCanScroll(event.target,delta))return;
 const sign=Math.sign(delta);
 if(!frame||direction&&sign!==direction)target=scrollY;
 direction=sign;
 const next=clamp(target+delta);
 if(next===target&&!frame)return;
 event.preventDefault();target=next;
 if(!frame){lastTime=0;frame=requestAnimationFrame(tick);}
},{passive:false});
// Let browser navigation, keyboard scrolling, touch, and scrollbar dragging take over immediately.
addEventListener('scroll',()=>{if(Math.abs(scrollY-lastApplied)>2)cancel();},{passive:true});
addEventListener('pointerdown',cancel,{passive:true});addEventListener('touchstart',cancel,{passive:true});
addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Escape'].includes(event.key))cancel();});
addEventListener('resize',cancel,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});reduced.addEventListener('change',cancel);
})();
