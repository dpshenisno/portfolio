(() => {
 'use strict';
 const footer=document.querySelector('footer');if(!footer)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const canvas=document.createElement('canvas');canvas.className='footer-lens';canvas.setAttribute('aria-hidden','true');
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
 let frame=0,visible=false,dirty=true,ready=false,fallback=null,program,texture,uniforms;
 function fallbackLens(){if(fallback)return;canvas.remove();fallback=document.createElement('div');fallback.className='footer-lens-fallback';fallback.hidden=true;fallback.setAttribute('aria-hidden','true');document.body.append(fallback);}
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Footer shader unavailable');return s;}
 if(gl)try{
  const vs=shader(gl.VERTEX_SHADER,'attribute vec2 position;varying vec2 uv;void main(){uv=vec2((position.x+1.0)*.5,(1.0-position.y)*.5);gl_Position=vec4(position,0.,1.);}');
  const fs=shader(gl.FRAGMENT_SHADER,`
   #ifdef GL_FRAGMENT_PRECISION_HIGH
   precision highp float;
   #else
   precision mediump float;
   #endif
   varying vec2 uv;uniform sampler2D picture;uniform vec2 size;uniform vec2 band;uniform vec2 view;uniform float power;uniform float pixel;
   vec4 samplePhoto(vec2 p,float soft){
    vec2 v=p/size;vec4 c=texture2D(picture,clamp(v,vec2(.001),vec2(.999)),soft);
    float a=smoothstep(-pixel,pixel,p.x)*(1.-smoothstep(size.x-pixel,size.x+pixel,p.x))*smoothstep(-pixel,pixel,p.y)*(1.-smoothstep(size.y-pixel,size.y+pixel,p.y));
    return vec4(c.rgb*a,a);
   }
   void main(){
    vec2 p=vec2(uv.x*view.x-view.y,band.x+uv.y*band.y);
    float x=p.x/size.x-.5,edge=uv.y,envelope=edge*edge*edge,arch=max(0.,1.-4.*x*x);
    float spread=1.+power*envelope*(.24+.12*arch);
    vec2 q=vec2((.5+x/spread)*size.x,p.y-power*envelope*band.y*(.19+.08*arch));
    float soft=power*envelope*2.;vec2 trail=vec2(x*.8,-1.)*power*envelope*5.;
    vec4 a=samplePhoto(q-trail,soft),b=samplePhoto(q,soft),c=samplePhoto(q+trail,soft);
    vec4 average=a*.25+b*.5+c*.25;vec3 base=average.rgb/max(average.a,.0001);
    vec3 rgb=vec3(a.r/max(a.a,.0001),b.g/max(b.a,.0001),c.b/max(c.a,.0001));
    float fringe=power*envelope*.32*smoothstep(.2,.98,min(a.a,min(b.a,c.a)));
    gl_FragColor=vec4(mix(base,rgb,fringe),average.a*smoothstep(0.,.6,edge));
   }`);
  program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Footer lens unavailable');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  uniforms=Object.fromEntries(['picture','size','band','view','power','pixel'].map(name=>[name,gl.getUniformLocation(program,name)]));
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(uniforms.picture,0);document.body.append(canvas);ready=true;
 }catch{fallbackLens();}else fallbackLens();
 // Cache only the footer's plain background/text, rebuilt on layout/theme changes.
 // No DOM screenshot, page clone, or texture upload during ordinary scroll frames.
 function cachePicture(){
  const r=footer.getBoundingClientRect(),source=document.createElement('canvas');source.width=r.width>1100?2048:1024;source.height=512;
  const ctx=source.getContext('2d');ctx.scale(source.width/r.width,source.height/r.height);
  const style=getComputedStyle(footer);ctx.fillStyle=style.backgroundColor;ctx.fillRect(0,0,r.width,r.height);
  const border=footer.querySelector('.footer-bottom');if(border){const b=border.getBoundingClientRect();ctx.fillStyle=getComputedStyle(border).borderTopColor;ctx.fillRect(b.left-r.left,b.top-r.top,b.width,1);}
  footer.querySelectorAll('.label,.footer-gradient,.footer-cta>span,.footer-bottom a').forEach(el=>{
   const s=getComputedStyle(el),b=el.getBoundingClientRect(),font=parseFloat(s.fontSize),line=parseFloat(s.lineHeight)||font*1.2;
   ctx.font=s.fontWeight+' '+s.fontSize+' '+s.fontFamily;ctx.fillStyle=s.color==='rgba(0, 0, 0, 0)'?style.color:s.color;ctx.textBaseline='top';
   if('letterSpacing' in ctx)ctx.letterSpacing=s.letterSpacing==='normal'?'0px':s.letterSpacing;
   ctx.fillText(el.textContent.trim(),b.left-r.left,b.top-r.top+(line-font)/2);
  });
  gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.generateMipmap(gl.TEXTURE_2D);dirty=false;
 }
 function hide(){canvas.style.opacity='0';if(fallback)fallback.hidden=true;}
 function paint(){
  frame=0;if(document.hidden||reduced.matches||!visible){hide();return;}
  const r=footer.getBoundingClientRect(),bottom=Math.min(innerHeight,r.bottom),height=Math.min(innerHeight*.10,bottom-Math.max(0,r.top));
  if(height<2){hide();return;}const top=bottom-height,progress=Math.min(1,Math.max(0,(innerHeight-r.top)/(Math.min(r.height,innerHeight)*.85))),power=progress*progress*(3-2*progress);
  if(fallback){fallback.hidden=false;fallback.style.top=top+'px';fallback.style.height=height+'px';fallback.style.opacity=String(power*.7);return;}
  if(!ready)return;if(dirty)cachePicture();
  const viewport=document.documentElement.clientWidth,width=Math.round(Math.min(viewport*Math.min(devicePixelRatio||1,1.25),2304)),bufferHeight=Math.max(1,Math.round(height*width/viewport));
  if(canvas.width!==width||canvas.height!==bufferHeight){canvas.width=width;canvas.height=bufferHeight;gl.viewport(0,0,width,bufferHeight);}
  canvas.style.top=top+'px';canvas.style.height=height+'px';gl.useProgram(program);gl.uniform2f(uniforms.size,r.width,r.height);gl.uniform2f(uniforms.band,top-r.top,height);gl.uniform2f(uniforms.view,viewport,r.left);gl.uniform1f(uniforms.power,power);gl.uniform1f(uniforms.pixel,Math.max(1.25,viewport/width*1.35));gl.drawArrays(gl.TRIANGLES,0,6);canvas.style.opacity='1';
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();}).observe(footer);
 new ResizeObserver(()=>{dirty=true;schedule();}).observe(footer);
 new MutationObserver(()=>{dirty=true;schedule();}).observe(document.body,{attributes:true,attributeFilter:['class']});
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',()=>{dirty=true;schedule();},{passive:true});
 addEventListener('portfolio:scroll-frame',()=>{if(frame)cancelAnimationFrame(frame);paint();});document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',schedule);
 document.fonts.ready.then(()=>{dirty=true;schedule();});canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();ready=false;fallbackLens();schedule();});
 addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;hide();});
})();
