(() => {
 'use strict';
 const cache=new Map();
 function ready(url){
  const key=new URL(url,document.baseURI).href;if(cache.has(key))return cache.get(key).promise;
  const image=new Image();image.decoding='async';
  const promise=new Promise(resolve=>{image.onload=()=>{if(image.decode)image.decode().catch(()=>{}).then(resolve);else resolve();};image.onerror=resolve;image.src=key;});
  cache.set(key,{image,promise});return promise;
 }
 window.portfolioAssets={ready};
 if(document.querySelector('.home-orbit,.portfolio-home'))new Set((window.portfolioOrbitProjects||[]).flatMap(p=>[p.cover,...p.cuts]).filter(Boolean)).forEach(file=>ready('./assets/'+file));
 document.querySelectorAll('main img').forEach(image=>{image.loading='eager';image.decoding='async';if(image.decode)image.decode().catch(()=>{});});
})();
