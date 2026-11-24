(() => {
 'use strict';
 const button=document.querySelector('.theme');if(!button)return;
 const html=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let busy=false,frame=0,transition=null,prism=null;
 function cancelFrame(){if(frame)cancelAnimationFrame(frame);frame=0;}
 function cleanup(){cancelFrame();if(prism)prism.remove();prism=null;transition=null;html.classList.remove('theme-transitioning');for(const key of ['--theme-wave-x','--theme-wave-y','--theme-wave-radius','--theme-wave-opacity'])html.style.removeProperty(key);button.disabled=false;button.removeAttribute('aria-busy');busy=false;}
 window.portfolioThemeTransition=async (dark,apply)=>{
  if(busy)return;
  if(reduced.matches||document.hidden||typeof document.startViewTransition!=='function'){apply();return;}
  busy=true;button.disabled=true;button.setAttribute('aria-busy','true');let applied=false;
  const update=()=>{if(applied)return;applied=true;apply();};
  const r=button.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
  const radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y))+110;
  html.style.setProperty('--theme-wave-x',x+'px');html.style.setProperty('--theme-wave-y',y+'px');html.style.setProperty('--theme-wave-radius','0px');html.style.setProperty('--theme-wave-opacity','0');html.classList.add('theme-transitioning');
  try{
   transition=document.startViewTransition(()=>{
    update();
    // A separate snapshot draws the prismatic rim above the theme reveal.
    prism=document.createElement('div');prism.className='theme-prism-capture';prism.setAttribute('aria-hidden','true');document.body.append(prism);
   });
   transition.ready.then(()=>{
    const start=performance.now();
    function paint(now){
     frame=0;const t=Math.min(1,(now-start)/1100),ease=1-Math.pow(1-t,2.4);
     html.style.setProperty('--theme-wave-radius',(radius*ease)+'px');html.style.setProperty('--theme-wave-opacity',String(Math.sin(Math.PI*t)*.7));
     if(t<1)frame=requestAnimationFrame(paint);
    }
    frame=requestAnimationFrame(paint);
   }).catch(()=>{});
   await transition.finished;
  }catch{update();}
  finally{cleanup();}
 };
 function finish(){cancelFrame();if(transition)transition.skipTransition();}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();});
 reduced.addEventListener('change',()=>{if(reduced.matches)finish();});addEventListener('pagehide',finish);
})();
