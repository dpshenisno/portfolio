const themeButton=document.querySelector('.theme');
function setTheme(dark){document.body.classList.toggle('dark',dark);themeButton.setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');themeButton.setAttribute('aria-pressed',String(dark));}
try{setTheme(localStorage.getItem('portfolio-theme')==='dark')}catch{}
themeButton.addEventListener('click',()=>{const dark=!document.body.classList.contains('dark');setTheme(dark);try{localStorage.setItem('portfolio-theme',dark?'dark':'light')}catch{}});
const cursor=document.querySelector('.cursor');
if(matchMedia('(hover:hover) and (pointer:fine)').matches){document.body.classList.add('custom-cursor');document.addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';cursor.style.opacity='1';cursor.classList.toggle('active',!!e.target.closest('a,button'))});document.addEventListener('pointerleave',()=>cursor.style.opacity='0');window.addEventListener('blur',()=>cursor.style.opacity='0');}
