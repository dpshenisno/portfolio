(() => {
 'use strict';
 const button=document.querySelector('.glow-trigger');if(!button)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,layer=null,start=0,origin=null;
 function clear(){if(frame)cancelAnimationFrame(frame);frame=0;if(layer)layer.remove();layer=null;button.classList.remove('is-emitting');}
 function pulse(){
  clear();button.classList.add('is-emitting');
  const r=button.getBoundingClientRect();origin={x:r.left+r.width*.5,y:r.top+r.height*.5};
  layer=document.createElement('div');layer.className='site-color-wave';layer.setAttribute('aria-hidden','true');
  layer.style.setProperty('--wave-x',origin.x+'px');layer.style.setProperty('--wave-y',origin.y+'px');document.body.append(layer);
  if(reduced.matches){layer.classList.add('wave-reduced');setTimeout(clear,220);return;}
  const max=Math.hypot(Math.max(origin.x,innerWidth-origin.x),Math.max(origin.y,innerHeight-origin.y))+170;
  start=performance.now();
  function paint(now){
   if(document.hidden){clear();return;}const t=Math.min(1,(now-start)/1750),ease=1-Math.pow(1-t,2.1);
   layer.style.setProperty('--wave-radius',(ease*max)+'px');layer.style.opacity=String(Math.sin(Math.PI*Math.min(1,t*1.25))*.62*(1-t*.25));
   if(t<1)frame=requestAnimationFrame(paint);else clear();
  }
  frame=requestAnimationFrame(paint);
 }
 button.addEventListener('click',pulse);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 reduced.addEventListener('change',clear);addEventListener('pagehide',clear);
})();
