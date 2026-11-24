(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let wave=null,animation=null,leaving=false,navigateTimer=0,telegramRetry=false;
 function clearWave(){if(animation)animation.cancel();animation=null;if(wave)wave.remove();wave=null;}
 function pulse(x,y,duration=1400){
  clearWave();if(reduced.matches)return;
  wave=document.createElement('div');wave.className='site-color-wave liquid-click-wave';wave.setAttribute('aria-hidden','true');
  wave.style.setProperty('--wave-x',x+'px');wave.style.setProperty('--wave-y',y+'px');
  document.body.append(wave);
  const radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y))+140;
  animation=wave.animate([
   {'--wave-radius':'0px',opacity:0,offset:0},
   {'--wave-radius':radius*.45+'px',opacity:.42,offset:.28},
   {'--wave-radius':radius+'px',opacity:0,offset:1}
  ],{duration,easing:'cubic-bezier(.45,0,.55,1)',fill:'forwards'});
  animation.finished.then(clearWave,()=>{});
 }
 function ordinaryClick(event){return event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey&&!event.defaultPrevented;}
 const contact=document.querySelector('.contact-floating');
 const logo=document.querySelector('.hero-logo');let scrollFrame=0;
 function cancelLogoScroll(){if(scrollFrame){cancelAnimationFrame(scrollFrame);scrollFrame=0;document.documentElement.style.removeProperty('scroll-behavior');}}
 if(logo)logo.addEventListener('click',event=>{
  if(!ordinaryClick(event))return;const target=document.querySelector(logo.getAttribute('href'));if(!target)return;
  event.preventDefault();cancelLogoScroll();const start=scrollY,end=start+target.getBoundingClientRect().top-80;
  if(reduced.matches){scrollTo({top:end,behavior:'instant'});return;}
  const started=performance.now();document.documentElement.style.setProperty('scroll-behavior','auto');
  function move(now){const t=Math.min(1,(now-started)/1300),ease=t*t*(3-2*t);scrollTo({top:start+(end-start)*ease,behavior:'instant'});dispatchEvent(new Event('portfolio:scroll-frame'));if(t<1)scrollFrame=requestAnimationFrame(move);else{scrollFrame=0;document.documentElement.style.removeProperty('scroll-behavior');}}
  scrollFrame=requestAnimationFrame(move);
 });
 addEventListener('wheel',cancelLogoScroll,{passive:true});addEventListener('touchstart',cancelLogoScroll,{passive:true});addEventListener('keydown',cancelLogoScroll);
 if(contact)contact.addEventListener('click',event=>{
  if(!ordinaryClick(event)||telegramRetry)return;event.preventDefault();if(leaving)return;leaving=true;
  const r=contact.getBoundingClientRect();contact.classList.add('is-emitting');contact.setAttribute('aria-busy','true');
  if(!window.portfolioContactWave?.play())pulse(r.left+r.width/2,r.top+r.height/2,1400);
  navigateTimer=setTimeout(()=>{
   // Keep the short delay within transient user activation; never replace this tab.
   const tab=window.open('about:blank','_blank');
   if(tab){tab.opener=null;tab.location.replace(contact.href);}
   else{telegramRetry=true;contact.classList.add('telegram-retry');contact.querySelector('span').textContent='Открыть Telegram ↗';contact.setAttribute('aria-label','Открыть Telegram в новой вкладке');}
   contact.classList.remove('is-emitting');contact.removeAttribute('aria-busy');leaving=false;
  },reduced.matches?0:1350);
 });
 document.addEventListener('click',event=>{
  const anchor=event.target.closest?.('a');if(!anchor||!ordinaryClick(event))return;
  const target=new URL(anchor.href,location.href);
  if(!document.querySelector('.home-orbit,.portfolio-home')||target.origin!==location.origin||!target.pathname.endsWith('/sber/'))return;
  event.preventDefault();if(leaving)return;leaving=true;
  const r=anchor.getBoundingClientRect(),x=event.detail?event.clientX:r.left+r.width/2,y=event.detail?event.clientY:r.top+r.height/2;
  try{sessionStorage.setItem('portfolio-project-arrival',JSON.stringify({x,y,path:target.pathname,time:Date.now()}));}catch{}
  document.documentElement.style.setProperty('--route-x',x+'px');document.documentElement.style.setProperty('--route-y',y+'px');
  document.documentElement.classList.add('project-departure');
  document.dispatchEvent(new Event('portfolio:project-departure'));
  pulse(x,y,1600);
  navigateTimer=setTimeout(()=>location.assign(target.href),reduced.matches?0:850);
 });
 function reset(){clearTimeout(navigateTimer);navigateTimer=0;leaving=false;clearWave();document.documentElement.classList.remove('project-departure');if(contact){contact.classList.remove('is-emitting');contact.removeAttribute('aria-busy');}}
 addEventListener('pagehide',()=>{clearWave();window.portfolioContactWave?.stop();clearTimeout(navigateTimer);cancelLogoScroll();});
 addEventListener('pageshow',event=>{if(event.persisted)reset();});
})();
