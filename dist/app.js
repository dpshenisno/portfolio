const body = document.body;
const themeButton = document.querySelector('.theme');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
function setTheme(dark) {
  body.classList.toggle('dark', dark);
  themeButton.setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
  themeButton.setAttribute('aria-pressed', String(dark));
}
try { setTheme(localStorage.getItem('portfolio-theme') === 'dark'); } catch {}
themeButton.addEventListener('click', () => {
  const dark = !body.classList.contains('dark');
  setTheme(dark);
  try { localStorage.setItem('portfolio-theme', dark ? 'dark' : 'light'); } catch {}
});

const menuButton = document.querySelector('.menu-toggle');
const menuPanel = document.querySelector('.menu-panel');
const menuShell = document.querySelector('.menu-shell');
function setMenu(open, restoreFocus = false) {
  body.classList.toggle('menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  menuPanel.inert = !open;
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
document.addEventListener('click', event => {
  if (!menuShell.contains(event.target)) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && body.classList.contains('menu-open')) setMenu(false, true);
});
menuPanel.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
menuShell.addEventListener('focusout', () => {
  requestAnimationFrame(() => { if (!menuShell.contains(document.activeElement)) setMenu(false); });
});

// Preserve short Russian words with their following word, including later edits.
const shortWords = /(^|[\s(«„])((?:во?|ко?|со?|у|о(?:б|бо)?|на|по|из|за|от|до|для|при|без|над|под|не|и|а|но|или)) +(?=\S)/giu;
const textWalker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
while (textWalker.nextNode()) {
  const node = textWalker.currentNode;
  if (!node.parentElement.closest('script,style,svg')) {
    node.nodeValue = node.nodeValue.replace(shortWords, '$1$2\u00a0').replace(shortWords, '$1$2\u00a0');
  }
}

const cursor = document.querySelector('.cursor');
if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
  body.classList.add('custom-cursor');
  document.addEventListener('pointermove', event => {
    cursor.style.left = event.clientX + 'px';
    cursor.style.top = event.clientY + 'px';
    cursor.style.opacity = '1';
    cursor.classList.toggle('active', !!event.target.closest('a,button'));
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => cursor.style.opacity = '0');
  window.addEventListener('blur', () => cursor.style.opacity = '0');
}

const hero = document.querySelector('.hero');
if (hero) {
const laptop = document.querySelector('.hero-device');
const lead = document.querySelector('[data-write]');
const title = document.querySelector('[data-title-write]');
const details = document.querySelector('.intro aside');
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
let animatedChars = [];
let titleChars = [];
let revealObserver;
let detailsTimer = null;
let detailsShown = false;
let latestLeadReveal = 0;
function prepareWriter(element) {
  const chars = [];
  const accessible = document.createElement('span');
  accessible.className = 'sr-only';
  accessible.textContent = element.textContent;
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  for (const token of element.textContent.split(/( +)/)) {
    if (/^ +$/.test(token)) { visual.append(document.createTextNode(token)); continue; }
    const word = document.createElement('span');
    word.className = 'write-word';
    for (const character of token) {
      const span = document.createElement('span');
      span.className = 'write-char';
      span.textContent = character;
      word.append(span);
      chars.push(span);
    }
    visual.append(word);
  }
  element.replaceChildren(accessible, visual);
  return chars;
}
const writerProgress = new WeakMap();
function paintWriter(chars, progress) {
  if (writerProgress.get(chars) === progress) return;
  writerProgress.set(chars, progress);
  const position = progress * (chars.length + 8);
  chars.forEach((character, index) => {
    const phase = clamp((position - index) / 8);
    character.style.setProperty('--char-opacity', .16 + phase * .84);
    character.style.setProperty('--char-blur', (1 - phase) * 1.5 + 'px');
  });
}
function revealDetails(reveal) {
  latestLeadReveal = reveal;
  if (detailsShown) return;
  if (reveal < 1) { clearTimeout(detailsTimer); detailsTimer = null; return; }
  if (detailsTimer !== null) return;
  // Finish the last character's CSS fade before beginning the details fade.
  detailsTimer = setTimeout(() => {
    detailsTimer = null;
    if (latestLeadReveal >= 1) {
      details.classList.add('is-visible');
      detailsShown = true;
    }
  }, 200);
}
function setupMotion() {
  if (motionPreference.matches) return;
  body.classList.add('reveal-ready');
  details.classList.add('details-gated');
  document.querySelectorAll('.section .label,.section h2,.section h3,.section p:not(.lead),aside dl,.text-link,figcaption,.footer-cta,.footer-bottom').forEach(element => {
    if (!element.closest('.intro aside')) element.classList.add('text-reveal');
  });
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .1, rootMargin: '0px 0px -35px 0px' });
  document.querySelectorAll('.text-reveal').forEach(element => revealObserver.observe(element));
  animatedChars = prepareWriter(lead);
  titleChars = prepareWriter(title);
  paintWriter(titleChars, 0);
  let started;
  function animateTitle(time) {
    if (motionPreference.matches) return;
    if (started === undefined) started = time;
    const progress = clamp((time - started - 120) / 1100);
    paintWriter(titleChars, progress);
    if (progress < 1) requestAnimationFrame(animateTitle);
  }
  requestAnimationFrame(animateTitle);
}
setupMotion();
let framePending = false;
function paintMotion() {
  framePending = false;
  if (motionPreference.matches) return;
  const heroRect = hero.getBoundingClientRect();
  const scroll = Math.max(0, 80 - heroRect.top);
  const progress = clamp(scroll / (heroRect.height * .85));
  hero.style.setProperty('--hero-expand', clamp(scroll / (heroRect.height * .65)));
  hero.style.setProperty('--hero-round', Math.pow(clamp(scroll / (heroRect.height * 1.35)), 1.65));
  laptop.style.setProperty('--laptop-x', progress * 8 + 'deg');
  laptop.style.setProperty('--laptop-y', progress * -13 + 'deg');
  laptop.style.setProperty('--laptop-z', progress * -7 + 'deg');
  const titleBottom = title.getBoundingClientRect().bottom;
  hero.style.setProperty('--hero-copy-opacity', clamp((titleBottom-innerHeight*.28)/(innerHeight*.30)));
  const rect = lead.getBoundingClientRect();
  const height = innerHeight;
  const reveal = clamp((height * .94 - rect.top) / (height * .36 + rect.height * .26));
  paintWriter(animatedChars, reveal);
  revealDetails(reveal);
}
function scheduleMotion() {
  if (!framePending) { framePending = true; requestAnimationFrame(paintMotion); }
}
addEventListener('scroll', scheduleMotion, { passive: true });
addEventListener('portfolio:scroll-frame', paintMotion);
addEventListener('resize', scheduleMotion, { passive: true });
motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) {
    body.classList.remove('reveal-ready');
    clearTimeout(detailsTimer);
    detailsTimer = null;
    hero.style.setProperty('--hero-expand', '0');
    hero.style.setProperty('--hero-round', '0');
    laptop.style.setProperty('--laptop-x', '0deg');
    laptop.style.setProperty('--laptop-y', '0deg');
    laptop.style.setProperty('--laptop-z', '0deg');
  } else {
    paintWriter(titleChars, 1);
    scheduleMotion();
  }
});
scheduleMotion();
document.fonts.ready.then(scheduleMotion);



}
const contact=document.querySelector('footer');
let contactFrame=0,contactPoint=null;
function paintContact(){contactFrame=0;if(!contactPoint)return;contact.style.setProperty('--contact-x',contactPoint.x+'px');contact.style.setProperty('--contact-y',contactPoint.y+'px');contact.style.setProperty('--contact-arrow-x',Math.max(-10,Math.min(10,contactPoint.x*.025))+'px');contact.style.setProperty('--contact-arrow-y',Math.max(-7,Math.min(7,contactPoint.y*.025))+'px');}
if(matchMedia('(hover:hover) and (pointer:fine)').matches){
 contact.addEventListener('pointermove',event=>{if(motionPreference.matches)return;const r=contact.getBoundingClientRect();contactPoint={x:event.clientX-r.left-r.width/2,y:event.clientY-r.top-r.height/2};contact.classList.add('contact-active');if(!contactFrame)contactFrame=requestAnimationFrame(paintContact);},{passive:true});
 contact.addEventListener('pointerleave',()=>{contact.classList.remove('contact-active');contactPoint={x:0,y:0};if(!contactFrame)contactFrame=requestAnimationFrame(paintContact);});
}

// Home: focus and pointer expose the same project preview; touch stays visible.
document.querySelectorAll('.project-row').forEach(row=>{row.addEventListener('pointerenter',()=>row.classList.add('is-active'));row.addEventListener('pointerleave',()=>row.classList.remove('is-active'));});
