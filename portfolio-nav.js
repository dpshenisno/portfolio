(() => {
 'use strict';
 const root=document.querySelector('.portfolio-home');if(!root)return;
 const buttons=[...document.querySelectorAll('.project-pill')],panels=[...document.querySelectorAll('.showcase-project')],sections=[...document.querySelectorAll('.portfolio-sections a')],work=document.querySelector('#work');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let active=0,animation=null;
 function choose(index,focus=false){
  if(index<0||index>=buttons.length)return;
  const changed=index!==active;active=index;
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  panels.forEach((panel,i)=>{panel.hidden=i!==index;});
  if(animation)animation.cancel();
  if(changed&&!reduced.matches)animation=panels[index].animate([{opacity:.2,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:550,easing:'cubic-bezier(.22,1,.36,1)'});
  if(focus)buttons[index].focus();
  if(work.getBoundingClientRect().bottom<100||work.getBoundingClientRect().top<-180)work.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
 }
 buttons.forEach((button,index)=>{
  button.addEventListener('click',()=>choose(index));
  button.addEventListener('keydown',event=>{
   let next=index;if(['ArrowDown','ArrowRight'].includes(event.key))next=(index+1)%buttons.length;else if(['ArrowUp','ArrowLeft'].includes(event.key))next=(index+buttons.length-1)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;
   event.preventDefault();choose(next,true);
  });
 });
 // All six images start loading and decoding before the first project change.
 panels.forEach(panel=>panel.querySelectorAll('img').forEach(image=>{image.loading='eager';image.decoding='async';if(image.decode)image.decode().catch(()=>{});}));
 const awards=document.querySelector('.original-achievements');let frame=0,awardVisible=false;
 function paint(){
  frame=0;if(document.hidden)return;
  if(awards&&awardVisible&&!reduced.matches){
   const r=awards.getBoundingClientRect(),progress=Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight*.72))),rest=1-progress;
   awards.style.setProperty('--award-left-turn',(-14*rest)+'deg');awards.style.setProperty('--award-right-turn',(14*rest)+'deg');awards.style.setProperty('--award-right-y',(-96*rest)+'px');awards.style.setProperty('--award-trophy-y',(22*rest)+'px');awards.style.setProperty('--award-trophy-right-y',(-16*rest)+'px');
  }
  let current=null;for(const link of sections){const target=document.querySelector(link.hash);if(target&&target.getBoundingClientRect().top<innerHeight*.45)current=link;}
  sections.forEach(link=>{if(link===current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
 }
 function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(paint);}
 if(awards)new IntersectionObserver(entries=>{awardVisible=entries[0].isIntersecting;awards.classList.toggle('is-award-visible',awardVisible&&!reduced.matches);schedule();},{rootMargin:'60px'}).observe(awards);
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});addEventListener('portfolio:scroll-frame',()=>{if(frame)cancelAnimationFrame(frame);paint();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}else schedule();});reduced.addEventListener('change',schedule);
 addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);if(animation)animation.cancel();frame=0;});schedule();
})();
