(() => {
'use strict';
const hero=document.querySelector('.hero'), scene=document.querySelector('.hero-art');
if(!hero||!scene)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'), mobile=matchMedia('(max-width: 640px)');
const bg=scene.querySelector('.hero-bg'), device=scene.querySelector('.hero-device');
const canvas=document.createElement('canvas');canvas.className='hero-lens';canvas.setAttribute('aria-hidden','true');
const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
if(!gl){console.warn('Hero lens: WebGL unavailable, keeping original image.');return;}
const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=vec2((position.x+1.0)*.5,(1.0-position.y)*.5);gl_Position=vec4(position,0.0,1.0);}`;
const fragment=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;uniform sampler2D backdrop;uniform sampler2D laptop;uniform vec2 size;uniform vec2 band;uniform vec2 viewport;uniform float radius;uniform vec4 cover;uniform mat3 deviceInverse;uniform vec3 backgroundScale;uniform float power;
vec4 sceneAt(vec2 p,float softness){
 vec2 b=(p-backgroundScale.yz)/backgroundScale.x;
 vec2 buv=(b-cover.xy)/cover.zw;
 vec3 color=texture2D(backdrop,clamp(buv,0.001,0.999),softness).rgb;
 vec3 d=deviceInverse*vec3(p,1.0);vec2 t=d.xy/d.z;
 if(t.x>0.0&&t.x<1.0&&t.y>0.0&&t.y<1.0){vec4 layer=texture2D(laptop,t,softness);color=color*(1.0-layer.a)+layer.rgb;}
 // Premultiply before filtering, so blurred transparent edges cannot turn white.
 vec2 q=abs(p-size*.5)-(size*.5-vec2(radius));
 float distanceToPhoto=length(max(q,0.0))+min(max(q.x,q.y),0.0)-radius;
 float alpha=1.0-smoothstep(-1.5,1.5,distanceToPhoto);
 return vec4(color*alpha,alpha);
}
void main(){
 vec2 p=vec2(uv.x*viewport.x-viewport.y,band.x+uv.y*band.y);
 // Smooth boundary: displacement and its first derivative vanish below the band.
 float x=p.x/size.x-.5;
 float arch=clamp(1.0-4.0*x*x,0.0,1.0);
 // A shallow curved boundary, feathered only where displacement is subpixel.
 float extent=.82+.18*arch;
 float edge=max(0.0,1.0-uv.y/extent);
 float lens=edge*edge*edge;
 // Inverse lens mapping spreads the photo sideways instead of squeezing it.
 float spread=1.0+power*lens*(.24+.08*arch);
 // A convex, one-direction pull; slope stays positive even at maximum strength.
 float pull=power*(.10+.10*arch)*lens;
 vec2 samplePoint=vec2((.5+x/spread)*size.x,p.y+band.y*pull);
 // Reference: directional diffusion grows toward the viewport edge.
 // Five shared taps filter geometry, alpha, and color together in one pass.
 float diffusion=power*edge*edge*min(band.y*.10,10.0);
 float softness=power*edge*edge*2.5;
 vec2 trail=vec2(x*.24,1.0)*diffusion;
 vec4 a=sceneAt(samplePoint-trail*1.8,softness);
 vec4 b=sceneAt(samplePoint-trail*.65,softness);
 vec4 c=sceneAt(samplePoint,softness);
 vec4 d=sceneAt(samplePoint+trail*.65,softness);
 vec4 e=sceneAt(samplePoint+trail*1.8,softness);
 vec4 soft=a*.12+b*.23+c*.30+d*.23+e*.12;
 // Reuse the same taps for dispersion rather than rendering RGB layers separately.
 vec4 red=a*.22+b*.30+c*.28+d*.15+e*.05;
 vec4 blue=a*.05+b*.15+c*.28+d*.30+e*.22;
 float fringe=clamp(power*edge*edge*.82,0.0,.9);
 vec3 filtered=vec3(mix(soft.r,red.r,fringe),soft.g,mix(soft.b,blue.b,fringe));
 float alpha=max(soft.a,max(mix(soft.a,red.a,fringe),mix(soft.a,blue.a,fringe)));
 float feather=smoothstep(0.0,.18,edge);
 gl_FragColor=vec4(filtered/max(alpha,.0001),alpha*feather);
}`;
let program;
function fail(error){if(error)console.warn('Hero lens:',error.message||String(error));canvas.remove();if(frame)cancelAnimationFrame(frame);frame=0;ready=false;}
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error(gl.getShaderInfoLog(s)||'Shader unavailable');}return s;}
let frame=0,ready=false,visible=true,lastInput=performance.now(),lastFrame=0,lastPaint=0,slowFrames=0,resolution=1;
try{
 program=gl.createProgram();const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Program unavailable');gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
}catch(error){fail(error);return;}
const uniforms=Object.fromEntries(['backdrop','laptop','size','band','viewport','radius','cover','deviceInverse','backgroundScale','power'].map(name=>[name,gl.getUniformLocation(program,name)]));
function texture(source,unit,name){
 // Cache a power-of-two texture pyramid once; mip sampling provides smooth
 // diffusion between the directional taps without a full-frame blur pass.
 const cached=document.createElement('canvas');cached.width=1024;cached.height=1024;cached.getContext('2d').drawImage(source,0,0,1024,1024);source=cached;
 const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.generateMipmap(gl.TEXTURE_2D);gl.uniform1i(uniforms[name],unit);}
const original=new Image();original.src=device.querySelector('image').getAttribute('href');
function loaded(image){return image.complete&&image.naturalWidth?Promise.resolve():new Promise((resolve,reject)=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',reject,{once:true});});}
Promise.all([loaded(bg),loaded(original)]).then(()=>{
 if(gl.isContextLost())return;
 // Rasterize the existing vector contour once; never upload textures during scroll.
 const mask=document.createElement('canvas');mask.width=768;mask.height=693;const ctx=mask.getContext('2d');ctx.scale(mask.width/960,mask.height/866);ctx.translate(-740,0);ctx.beginPath();const points=device.querySelector('polygon').getAttribute('points').trim().split(/\s+/).map(p=>p.split(',').map(Number));points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(original,0,0,2048,1355);
 texture(bg,0,'backdrop');texture(mask,1,'laptop');document.body.append(canvas);ready=true;wake();
}).catch(fail);
// Four projected SVG corners -> inverse homography, preserving its CSS rotation.
function inverseDevice(){
 const style=getComputedStyle(device),m=new DOMMatrix(style.transform==='none'?undefined:style.transform),origin=style.transformOrigin.split(' ').map(parseFloat);
 const w=device.clientWidth,h=device.clientHeight,fit=Math.min(w/960,h/866),cw=960*fit,ch=866*fit,ox=(w-cw)/2,oy=(h-ch)/2;
 const sw=scene.clientWidth,sh=scene.clientHeight,perspective=parseFloat(getComputedStyle(scene).perspective)||1600;
 const corners=[[ox,oy],[ox+cw,oy],[ox+cw,oy+ch],[ox,oy+ch]].map(([x,y])=>{const p=m.transformPoint(new DOMPoint(x-origin[0],y-origin[1],0));const px=p.x+origin[0]+(parseFloat(style.left)||0),py=p.y+origin[1]+(parseFloat(style.top)||0),k=1/(1-p.z/perspective);return [sw/2+(px-sw/2)*k,sh/2+(py-sh/2)*k];});
 const target=[[0,0],[1,0],[1,1],[0,1]],a=[];
 corners.forEach(([x,y],i)=>{const [u,v]=target[i];a.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);});
 for(let c=0;c<8;c++){let pivot=c;for(let r=c+1;r<8;r++)if(Math.abs(a[r][c])>Math.abs(a[pivot][c]))pivot=r;[a[c],a[pivot]]=[a[pivot],a[c]];const d=a[c][c];if(Math.abs(d)<1e-8)return null;for(let k=c;k<=8;k++)a[c][k]/=d;for(let r=0;r<8;r++)if(r!==c){const t=a[r][c];for(let k=c;k<=8;k++)a[r][k]-=t*a[c][k];}}
 const v=a.map(row=>row[8]);return new Float32Array([v[0],v[3],v[6],v[1],v[4],v[7],v[2],v[5],1]);
}
function stop(){if(frame)cancelAnimationFrame(frame);frame=0;canvas.style.opacity='0';lastFrame=lastPaint=0;}
function wake(){if(!ready||!visible||document.hidden||reduced.matches)return;if(!frame)frame=requestAnimationFrame(paint);}
function paint(now){
 frame=0;if(!ready||!visible||document.hidden||reduced.matches){stop();return;}
 const paintStarted=performance.now();lastFrame=now;
 const rect=hero.getBoundingClientRect(),w=scene.clientWidth,h=scene.clientHeight;
 if(rect.bottom<=0||rect.top>=innerHeight){stop();return;}
 const scrollProgress=Math.min(1,Math.max(0,(80-rect.top)/(h*.8)));
 const eased=Math.min(1,scrollProgress*2.4);
 const strength=eased*eased*(3-2*eased)*(mobile.matches?.95:1.3);
 if(strength<.001){stop();return;}
 const overscan=Math.min(28,innerHeight*.035)*Math.min(1,strength);
 const canvasTop=Math.max(0,rect.top-overscan);
 const bandTop=canvasTop-rect.top,bandHeight=Math.min(rect.bottom-canvasTop,innerHeight*.10);
 const viewportWidth=document.documentElement.clientWidth;
 if(bandHeight<2){stop();return;}
 const width=Math.min(viewportWidth,mobile.matches?680:1100)*resolution,height=Math.max(1,Math.round(bandHeight*width/viewportWidth));
 if(canvas.width!==Math.round(width)||canvas.height!==height){canvas.width=Math.round(width);canvas.height=height;gl.viewport(0,0,canvas.width,canvas.height);}
 canvas.style.top=canvasTop+'px';canvas.style.height=bandHeight+'px';
 const inv=inverseDevice();if(!inv){stop();return;}
 const scale=Math.max(w/bg.naturalWidth,h/bg.naturalHeight),bw=bg.naturalWidth*scale,bh=bg.naturalHeight*scale;
 const bs=getComputedStyle(bg),bm=new DOMMatrix(bs.transform==='none'?undefined:bs.transform),bo=bs.transformOrigin.split(' ').map(parseFloat);
 gl.uniform2f(uniforms.size,w,h);gl.uniform2f(uniforms.band,bandTop,bandHeight);gl.uniform2f(uniforms.viewport,viewportWidth,rect.left);gl.uniform1f(uniforms.radius,Math.min(parseFloat(getComputedStyle(hero).borderTopLeftRadius)||0,w/2,h/2));gl.uniform4f(uniforms.cover,(w-bw)/2,(h-bh)/2,bw,bh);gl.uniformMatrix3fv(uniforms.deviceInverse,false,inv);gl.uniform3f(uniforms.backgroundScale,bm.a,bo[0]*(1-bm.a)+bm.e,bo[1]*(1-bm.a)+bm.f);
 // Position determines the lens. Keep the composited frame when scrolling stops.
 gl.uniform1f(uniforms.power,strength);gl.drawArrays(gl.TRIANGLES,0,6);canvas.style.opacity='1';
 const cost=performance.now()-paintStarted;slowFrames=cost>12?slowFrames+1:Math.max(0,slowFrames-1);if(slowFrames>=3){resolution=Math.max(.6,resolution*.8);slowFrames=0;}
 // No idle animation loop: the next input requests the next frame.
}
addEventListener('scroll',()=>{lastInput=performance.now();wake();},{passive:true});
// Smooth wheel frames update the source transforms first, then this portal in the same frame.
addEventListener('portfolio:scroll-frame',()=>{if(frame)cancelAnimationFrame(frame);frame=0;lastInput=performance.now();paint(lastInput);});
addEventListener('resize',()=>{stop();wake();},{passive:true});
const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop();else wake();},{threshold:0});observer.observe(hero);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else wake();});reduced.addEventListener('change',()=>{if(reduced.matches)stop();else wake();});document.fonts.ready.then(wake);canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail();});
})();
