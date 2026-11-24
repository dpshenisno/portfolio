(() => {
 'use strict';
 const root=document.querySelector('.home-orbit');if(!root)return;
 const stage=root.querySelector('.orbit-stage'),cards=[...root.querySelectorAll('.orbit-card')],projects=window.portfolioOrbitProjects||[];
 if(cards.length!==6||projects.length!==6)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),touch=matchMedia('(hover: none)');
 const START=8.8,CRUISE=.055,DECAY=.88,STOP_TIME=.19,RESUME_TIME=.6;
 let angle=-Math.PI/2,speed=reduced.matches?0:START,elapsed=0,introDone=false,active=-1,visible=true,frame=0,last=0,tiltFrame=0,point=null,rx=0,ry=0,closeTimer=0,opening=null,activation=0,hoverPoint=null;
 const template=root.querySelector('.orbit-preview');
 function destination(el,p){el.href=p.href;if(p.href.startsWith('https:')){el.target='_blank';el.rel='noopener';}else{el.removeAttribute('target');el.removeAttribute('rel');}}
 // Each project owns its DOM and immutable image sources; no shared image swapping.
 const panels=projects.map((p,index)=>{
  const panel=index?template.cloneNode(true):template;if(index)stage.append(panel);
  panel.dataset.project=String(index);panel.dataset.flagship=String(index===0);
  const main=panel.querySelector('.orbit-main-image'),ncils=panel.querySelector('.orbit-ncils-art');
  main.hidden=!p.cover;ncils.hidden=!!p.cover;
  if(p.cover){main.src='./assets/'+p.cover;main.alt='Проект '+p.name;main.loading='eager';main.decoding='async';}else main.removeAttribute('src');
  panel.querySelectorAll('.orbit-cutout').forEach((box,i)=>{
   const image=box.querySelector('img'),placeholder=box.querySelector('.orbit-cutout-placeholder');image.hidden=!p.cuts[i];placeholder.hidden=!!p.cuts[i];
   if(p.cuts[i]){image.src='./assets/'+p.cuts[i];image.loading='eager';image.decoding='async';}else image.removeAttribute('src');
  });
  panel.querySelector('.orbit-project-name').textContent=p.name;panel.querySelector('.orbit-project-kind').textContent=p.kind;panel.querySelector('.orbit-project-description').textContent=p.description;
  destination(panel.querySelector('.orbit-main-link'),p);destination(panel.querySelector('.orbit-project-link'),p);panel.querySelector('.orbit-main-link').setAttribute('aria-label','Открыть проект '+p.name);
  const images=[...panel.querySelectorAll('img')].filter(img=>img.getAttribute('src'));
  const ready=Promise.all(images.map(img=>img.decode?img.decode().catch(()=>{}):Promise.resolve()));
  panel.addEventListener('pointerenter',cancelClose);
  panel.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch'&&!cards[index].contains(event.relatedTarget))scheduleClose();});
  return {panel,ready};
 });
 function cancelClose(){clearTimeout(closeTimer);closeTimer=0;}
 function scheduleClose(){if(active<0||closeTimer)return;closeTimer=setTimeout(()=>{closeTimer=0;const panel=panels[active]?.panel;if(panel?.contains(document.activeElement)||cards[active]?.contains(document.activeElement))return;reset();},180);}
 function placePreview(){
  if(active<0)return;const panel=panels[active].panel,w=stage.clientWidth,h=stage.clientHeight;
  const width=Math.min(w<600?w*.68:w*.36,w<600?350:460,Math.max(200,(h-210)*16/9)),height=width*9/16+150;
  const card=cards[active].getBoundingClientRect(),bounds=stage.getBoundingClientRect(),cx=card.left+card.width/2-bounds.left,cy=card.top+card.height/2-bounds.top;
  const margin=width*.6+24,x=Math.max(margin,Math.min(w-margin,cx)),y=Math.max(height/2+42,Math.min(h-height/2-30,cy));
  for(const [key,value] of Object.entries({'--preview-width':width,'--preview-x':x,'--preview-y':y,'--preview-origin-x':cx-x+width/2,'--preview-origin-y':cy-y+height/2}))panel.style.setProperty(key,value+'px');
 }
 function paintCards(){cards.forEach((card,i)=>{const a=angle+i*Math.PI/3,depth=(Math.sin(a)+1)/2,scale=(.91+depth*.1)*(i===0?1.08:1);card.style.transform=`translate3d(${Math.cos(a)*rx}px,${Math.sin(a)*ry}px,0) translate(-50%,-50%) rotate(${-Math.cos(a)*4}deg) scale(${scale})`;card.style.zIndex=String(1+Math.round(depth*6));});}
 function layout(){const w=stage.clientWidth,h=stage.clientHeight,cardWidth=w<600?Math.min(108,Math.max(88,w*.25)):Math.min(190,Math.max(142,w*.135));root.style.setProperty('--orbit-card-width',cardWidth+'px');rx=Math.max(0,Math.min(w*.385,(w-cardWidth)/2-(w<600?14:34)));ry=Math.max(0,Math.min(h*.34,(h-cardWidth*1.18)/2-28));paintCards();placePreview();}
 function stopFrame(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}
 function wake(){if(reduced.matches||document.hidden||!visible)return;if(!frame)frame=requestAnimationFrame(tick);}
 function tick(now){frame=0;if(document.hidden||!visible||reduced.matches){last=0;return;}const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;elapsed+=dt;const target=active>=0?0:introDone?CRUISE:CRUISE+(START-CRUISE)*Math.exp(-elapsed/DECAY),old=speed,tau=active>=0?STOP_TIME:RESUME_TIME;speed+=(target-speed)*(1-Math.exp(-dt/tau));angle=(angle+(old+speed)*.5*dt)%(Math.PI*2);paintCards();if(active>=0&&speed<.001){speed=0;last=0;return;}wake();}
 function hidePanels(){panels.forEach(({panel})=>{panel.classList.remove('is-visible');panel.setAttribute('aria-hidden','true');panel.inert=true;});}
 function activate(index){
  cancelClose();if(index===active)return;active=index;introDone=true;const token=++activation;
  if(opening)opening.cancel();hidePanels();cards.forEach(c=>c.classList.remove('is-active'));placePreview();wake();
  panels[index].ready.then(()=>{
   if(token!==activation||active!==index)return;const panel=panels[index].panel;
   panel.inert=false;panel.setAttribute('aria-hidden','false');panel.classList.add('is-visible');root.classList.add('is-project-open');cards[index].classList.add('is-active');
   if(!reduced.matches&&panel.animate)opening=panel.animate([{opacity:0,filter:'blur(5px)',transform:'translate(-50%,-50%) scale(.52)'},{opacity:1,filter:'blur(0px)',transform:'translate(-50%,-50%) scale(1)'}],{duration:700,easing:'cubic-bezier(.45,0,.25,1)'});
  });
 }
 function reset(){cancelClose();active=-1;activation++;hoverPoint=null;if(opening)opening.cancel();opening=null;hidePanels();cards.forEach(c=>c.classList.remove('is-active'));root.classList.remove('is-project-open');if(tiltFrame)cancelAnimationFrame(tiltFrame);tiltFrame=0;point=null;wake();}
 cards.forEach((card,index)=>{
  card.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;if(Number.isFinite(event.clientX)){if(active>=0&&hoverPoint&&Math.hypot(event.clientX-hoverPoint.x,event.clientY-hoverPoint.y)<4)return;hoverPoint={x:event.clientX,y:event.clientY};}activate(index);});
  card.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch'&&!panels[index].panel.contains(event.relatedTarget))scheduleClose();});
  card.addEventListener('focus',()=>activate(index));card.addEventListener('click',event=>{if(touch.matches&&active!==index){event.preventDefault();activate(index);}});
 });
 root.addEventListener('pointerleave',()=>scheduleClose());
 root.addEventListener('focusout',event=>{if(active>=0&&!panels[active].panel.contains(event.relatedTarget)&&!cards[active].contains(event.relatedTarget))scheduleClose();});
 root.addEventListener('pointermove',event=>{
  if(active<0||event.pointerType==='touch')return;const panel=panels[active].panel;
  if(panel.contains(event.target)||cards[active].contains(event.target))cancelClose();else scheduleClose();
  if(reduced.matches)return;point={x:event.clientX,y:event.clientY};if(tiltFrame)return;
  tiltFrame=requestAnimationFrame(()=>{tiltFrame=0;if(!point||active<0)return;const r=panels[active].panel.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(point.x-r.left)/r.width*2-1)),y=Math.max(-1,Math.min(1,(point.y-r.top)/r.height*2-1));panels[active].panel.style.setProperty('--preview-rx',(-y*3)+'deg');panels[active].panel.style.setProperty('--preview-ry',(x*4)+'deg');});
 });
 document.addEventListener('pointerdown',event=>{if(!root.contains(event.target))reset();});document.addEventListener('keydown',event=>{if(event.key==='Escape')reset();});
 document.addEventListener('visibilitychange',()=>{root.classList.toggle('is-orbit-visible',visible&&!document.hidden);if(document.hidden){stopFrame();if(tiltFrame)cancelAnimationFrame(tiltFrame);tiltFrame=0;}else wake();});
 reduced.addEventListener('change',()=>{stopFrame();speed=0;introDone=true;if(reduced.matches)paintCards();else wake();});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;root.classList.toggle('is-orbit-visible',visible&&!document.hidden);if(!visible)stopFrame();else wake();},{threshold:0}).observe(root);
 new ResizeObserver(layout).observe(stage);layout();wake();
 document.addEventListener('portfolio:project-departure',()=>{visible=false;stopFrame();cancelClose();if(opening)opening.finish();});
 addEventListener('pageshow',event=>{if(event.persisted){visible=true;reset();}});addEventListener('pagehide',()=>{stopFrame();cancelClose();if(tiltFrame)cancelAnimationFrame(tiltFrame);});
})();
