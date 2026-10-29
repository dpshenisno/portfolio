(() => {
 const gallery=document.querySelector('[data-gradient-grain]');if(!gallery)return;
 const preference=matchMedia('(prefers-reduced-motion: reduce)');let visible=false;
 function sync(){gallery.classList.toggle('grain-active',visible&&!document.hidden&&!preference.matches);}
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0});observer.observe(gallery);
 document.addEventListener('visibilitychange',sync);preference.addEventListener('change',sync);
})();

(() => {
 const cards=[...document.querySelectorAll('.gradient-tile')];
 const notes=[...document.querySelectorAll('.project-note')];
 if(!cards.length)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let active=null,frame=0,point=null;
 function activate(card){active=card;cards.forEach(c=>c.classList.toggle('is-active',c===card));notes.forEach((n,i)=>n.classList.toggle('is-active',cards[i]===card));}
 function reset(){if(frame)cancelAnimationFrame(frame);frame=0;point=null;cards.forEach(c=>{for(const k of ['--card-x','--card-y','--card-rx','--card-ry'])c.style.removeProperty(k);});activate(null);}
 cards.forEach(card=>{
  card.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')activate(card);});
  card.addEventListener('focus',()=>activate(card));
  card.addEventListener('blur',reset);
  card.addEventListener('pointermove',e=>{
   if(e.pointerType==='touch'||reduced.matches)return;
   point={x:e.clientX,y:e.clientY,card};if(frame)return;
   frame=requestAnimationFrame(()=>{frame=0;if(!point||active!==point.card)return;const r=card.getBoundingClientRect();const x=Math.max(-1,Math.min(1,(point.x-r.left)/r.width*2-1));const y=Math.max(-1,Math.min(1,(point.y-r.top)/r.height*2-1));card.style.setProperty('--card-rx',`${-y*9}deg`);card.style.setProperty('--card-ry',`${x*12}deg`);card.style.setProperty('--card-x',`${x*4}px`);card.style.setProperty('--card-y',`${y*3}px`);});
  });
  card.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')reset();});
  card.addEventListener('click',e=>{if(matchMedia('(hover: none)').matches&&active!==card){e.preventDefault();activate(card);}});
 });
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.gradient-tile'))reset();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
})();
