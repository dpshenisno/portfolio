(() => {
 'use strict';
 try {
  const raw=sessionStorage.getItem('portfolio-project-arrival');
  if(!raw)return;sessionStorage.removeItem('portfolio-project-arrival');
  const data=JSON.parse(raw);
  if(Date.now()-data.time>10000||data.path!==location.pathname)return;
  const html=document.documentElement;
  html.style.setProperty('--route-x',Math.max(0,Math.min(innerWidth,data.x))+'px');
  html.style.setProperty('--route-y',Math.max(0,Math.min(innerHeight,data.y))+'px');
  html.classList.add('project-arrival');
  // Cross-document snapshots are ready before the first revealed frame.
  addEventListener('pagereveal',event=>{
   if(event.viewTransition)event.viewTransition.finished.finally(()=>html.classList.remove('project-arrival'));
  },{once:true});
  addEventListener('pageshow',()=>setTimeout(()=>html.classList.remove('project-arrival'),1600),{once:true});
 }catch{}
})();
