(() => {
 'use strict';
 const root=document.querySelector('.home-orbit');if(!root)return;
 const stage=root.querySelector('.orbit-stage'),gallery=root.querySelector('.orbit-gallery'),cards=[...root.querySelectorAll('.orbit-card')];
 const projects=window.portfolioOrbitProjects||[];if(cards.length!==6||projects.length!==6)return;
 const preview=root.querySelector('.orbit-preview'),main=root.querySelector('.orbit-main-image'),mainLink=root.querySelector('.orbit-main-link'),ncils=root.querySelector('.orbit-ncils-art');
 const cutouts=[...root.querySelectorAll('.orbit-cutout')],name=root.querySelector('.orbit-project-name'),kind=root.querySelector('.orbit-project-kind'),description=root.querySelector('.orbit-project-description'),link=root.querySelector('.orbit-project-link');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),touch=matchMedia('(hover: none)');
 // Angular velocity in radians/second. A fast reveal settles into a quiet orbit.
 const START=8.8,CRUISE=.055,DECAY=.88,STOP_TIME=.19,RESUME_TIME=.6;
 let angle=-Math.PI/2,speed=reduced.matches?0:START,elapsed=0,introDone=false,active=-1,visible=true,frame=0,last=0,tiltFrame=0,point=null;
 let rx=0,ry=0,hoverPoint=null,opening=null;
 function placePreview(){
  if(active<0)return;
  const w=stage.clientWidth,h=stage.clientHeight;
  const width=Math.min(w<600?w*.73:w*.36,w<600?350:460,Math.max(200,(h-190)*16/9));
  const height=width*9/16+150;
  const card=cards[active].getBoundingClientRect(),bounds=stage.getBoundingClientRect();
  const cx=card.left+card.width/2-bounds.left,cy=card.top+card.height/2-bounds.top;
  const margin=width*.58+12;
  const x=Math.max(margin,Math.min(w-margin,cx));
  const y=Math.max(height/2+20,Math.min(h-height/2-12,cy));
  preview.style.setProperty('--preview-width',width+'px');
  preview.style.setProperty('--preview-x',x+'px');preview.style.setProperty('--preview-y',y+'px');
  preview.style.setProperty('--preview-origin-x',(cx-x+width/2)+'px');preview.style.setProperty('--preview-origin-y',(cy-y+height/2)+'px');
 }
 function layout(){
  const w=stage.clientWidth,h=stage.clientHeight;
  const cardWidth=w<600?Math.min(118,Math.max(88,w*.27)):Math.min(212,Math.max(142,w*.15));
  root.style.setProperty('--orbit-card-width',cardWidth+'px');root.style.setProperty('--orbit-art-scale',String(cardWidth/762));
  rx=Math.max(0,Math.min(w*.385,(w-cardWidth)/2-(w<600?10:22)));
  ry=Math.max(0,Math.min(h*.36,(h-cardWidth*559/762)/2-16));paintCards();placePreview();
 }
 function paintCards(){cards.forEach((card,i)=>{const a=angle+i*Math.PI/3,depth=(Math.sin(a)+1)/2,scale=(.91+depth*.1)*(i===0?1.12:1);card.style.transform=`translate3d(${Math.cos(a)*rx}px,${Math.sin(a)*ry}px,0) translate(-50%,-50%) rotate(${-Math.cos(a)*4}deg) scale(${scale})`;card.style.zIndex=String(1+Math.round(depth*6));});}
 function stopFrame(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}
 function wake(){if(reduced.matches||document.hidden||!visible)return;if(!frame)frame=requestAnimationFrame(tick);}
 function tick(now){
  frame=0;if(document.hidden||!visible||reduced.matches){last=0;return;}
  const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;elapsed+=dt;
  const target=active>=0?0:introDone?CRUISE:CRUISE+(START-CRUISE)*Math.exp(-elapsed/DECAY);
  const old=speed,tau=active>=0?STOP_TIME:RESUME_TIME;speed+=(target-speed)*(1-Math.exp(-dt/tau));
  angle=(angle+(old+speed)*.5*dt)%(Math.PI*2);paintCards();
  if(active>=0&&speed<.001){speed=0;last=0;return;}wake();
 }
 function setDestination(el,p){el.href=p.href;if(p.href.startsWith('https:')){el.target='_blank';el.rel='noopener';}else{el.removeAttribute('target');el.removeAttribute('rel');}}
 function activate(index){
  if(index===active)return;const p=projects[index];active=index;introDone=true;
  cards.forEach((c,i)=>c.classList.toggle('is-active',i===index));
  placePreview();preview.dataset.flagship=String(index===0);
  const hasImage=!!p.cover;main.hidden=!hasImage;ncils.hidden=hasImage;
  if(hasImage){main.src='./assets/'+p.cover;main.alt='Проект '+p.name;}
  cutouts.forEach((box,i)=>{const image=box.querySelector('img'),placeholder=box.querySelector('.orbit-cutout-placeholder');image.hidden=!p.cuts[i];placeholder.hidden=!!p.cuts[i];if(p.cuts[i])image.src='./assets/'+p.cuts[i];});
  name.textContent=p.name;kind.textContent=p.kind;description.textContent=p.description;setDestination(mainLink,p);setDestination(link,p);mainLink.setAttribute('aria-label','Открыть проект '+p.name);
  preview.inert=false;preview.setAttribute('aria-hidden','false');preview.classList.add('is-visible');root.classList.add('is-project-open');
  if(opening)opening.cancel();
  if(!reduced.matches&&preview.animate)opening=preview.animate([{opacity:0,filter:'blur(5px)',transform:'translate(-50%,-50%) scale(.52)'},{opacity:1,filter:'blur(0px)',transform:'translate(-50%,-50%) scale(1)'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});
  wake();
 }
 function reset(){
  active=-1;hoverPoint=null;if(opening)opening.cancel();opening=null;cards.forEach(c=>c.classList.remove('is-active'));preview.classList.remove('is-visible');preview.setAttribute('aria-hidden','true');preview.inert=true;root.classList.remove('is-project-open');
  preview.style.removeProperty('--preview-rx');preview.style.removeProperty('--preview-ry');if(tiltFrame)cancelAnimationFrame(tiltFrame);tiltFrame=0;point=null;wake();
 }
 cards.forEach((card,index)=>{
  card.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;if(Number.isFinite(e.clientX)){if(active>=0&&hoverPoint&&Math.hypot(e.clientX-hoverPoint.x,e.clientY-hoverPoint.y)<4)return;hoverPoint={x:e.clientX,y:e.clientY};}activate(index);});
  card.addEventListener('focus',()=>activate(index));
  card.addEventListener('click',e=>{if(touch.matches&&active!==index){e.preventDefault();activate(index);}});
 });
 // Keep the inspection open while the pointer crosses to its anchored preview.
 root.addEventListener('pointerleave',()=>{if(!root.contains(document.activeElement))reset();});
 root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget))reset();});
 root.addEventListener('pointermove',e=>{
  if(active<0||reduced.matches||e.pointerType==='touch')return;point={x:e.clientX,y:e.clientY};if(tiltFrame)return;
  tiltFrame=requestAnimationFrame(()=>{tiltFrame=0;if(!point||active<0)return;const r=stage.getBoundingClientRect();const x=Math.max(-1,Math.min(1,(point.x-r.left)/r.width*2-1)),y=Math.max(-1,Math.min(1,(point.y-r.top)/r.height*2-1));preview.style.setProperty('--preview-rx',(-y*3)+'deg');preview.style.setProperty('--preview-ry',(x*4)+'deg');});
 });
 document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))reset();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')reset();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopFrame();if(tiltFrame)cancelAnimationFrame(tiltFrame);tiltFrame=0;}else wake();});
 reduced.addEventListener('change',()=>{stopFrame();speed=0;introDone=true;if(reduced.matches){paintCards();}else wake();});
 const visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stopFrame();else wake();},{threshold:0});visibility.observe(root);
 const resizing=new ResizeObserver(layout);resizing.observe(stage);layout();wake();
 document.addEventListener('portfolio:project-departure',()=>{visible=false;stopFrame();if(opening)opening.finish();});
 addEventListener('pageshow',event=>{if(event.persisted){visible=true;wake();}});
 addEventListener('pagehide',()=>{stopFrame();if(tiltFrame)cancelAnimationFrame(tiltFrame);});
})();
