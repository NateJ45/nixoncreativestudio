/* LIQUID: hand-written WebGL2. A stable-fluids sim at low resolution pushes a displacement
   field; a full-resolution composite uses it to warp marbled color, footage and the letters. */
(() => {
'use strict';
const N = window.NCS, $ = (s, r = document) => r.querySelector(s);
const main = $('#top');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M8.5 3.5 13 8l-4.5 4.5"/></svg>';
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

/* ---------- Stops: palette = 4 saturated inks, chip = the solid label color (black text passes) ---------- */
const site = (slug) => N.sites.findIndex((s) => s.slug === slug);
const LOOK = {
  'stone-steps-50k':                  { pal: ['#E8002D', '#FF5A00', '#FF2E93', '#8A1CFF'], chip: '#FFB800' },
  'mas-monograms':                    { pal: ['#FF4D00', '#FF0F7B', '#00A8C8', '#FF8A00'], chip: '#FFD000' },
  'presbyterian-academy':             { pal: ['#008F4C', '#00A88C', '#0A5CFF', '#7AB800'], chip: '#C6F000' },
  'theology-matters':                 { pal: ['#00B4FF', '#00D0C8', '#FF0A78', '#0A7CFF'], chip: '#FF8FB3' },
  'first-baptist-muncie':             { pal: ['#FFE000', '#FF9500', '#FF2E93', '#FFF04D'], chip: '#FFE000' },
  'reid-design':                      { pal: ['#008CD8', '#00A878', '#FF2E93', '#0A5CFF'], chip: '#00E5A0' },
  'foundation-for-reformed-theology': { pal: ['#00A050', '#FF0A78', '#0090D8', '#FF5A00'], chip: '#C6FF00' },
  'first-presbyterian-orangeburg':    { pal: ['#00989C', '#FF5A00', '#0A7CFF', '#FF0A78'], chip: '#FFC400' },
};
const STOPS = [
  { id: 'hero', words: null, rows: ['I BUILD', 'WEBSITES THAT', 'PULL THEIR', 'WEIGHT.'], tall: ['I BUILD', 'WEBSITES', 'THAT PULL', 'THEIR', 'WEIGHT.'], vid: site('first-baptist-muncie'), pal: ['#F01400', '#FF0A78', '#FF6A00', '#0A7CFF'], chip: '#FFE500' },
  ...N.sites.map((s, i) => ({ id: s.slug, words: s.name.toUpperCase().split(' '), vid: i, ...LOOK[s.slug] })),
  { id: 'prices', perSlot: N.tiers.map((t) => t.from), vid: site('stone-steps-50k'), pal: ['#0050FF', '#00C8FF', '#FF2E00', '#00149E'], chip: '#FFE500' },
  { id: 'quote', words: ['SPORTS', 'CAR'], vid: site('theology-matters'), pal: ['#00D0C8', '#00B4FF', '#FFE100', '#FF0A78'], chip: '#FFFFFF' },
  { id: 'start', rows: ['START', 'A PROJECT'], vid: site('reid-design'), pal: ['#00C46A', '#00E0E0', '#FFE100', '#FF3D7F'], chip: '#FFE500' },
];

/* ---------- DOM (real text, real links) ---------- */
function buildDOM() {
  const sub1 = N.sub.split('. ')[0] + '.';
  const sub2 = N.sub.slice(sub1.length).trim();
  const fw = (t) => `<span class="fallback-word" aria-hidden="true">${t}</span>`;
  let html = `<section class="stop hero" data-stop="0" style="--chip:${STOPS[0].chip}"><div class="pin">
    <h1 class="sr">${N.line.lead} ${N.line.heavy}</h1><div class="slot">${fw(N.line.lead + ' ' + N.line.heavy)}</div>
    <div class="strip lead"><p>${sub1}</p><a class="btn" href="#work">See the work ${ARROW}</a></div></div></section>`;
  N.sites.forEach((s, i) => {
    html += `<article class="stop" data-stop="${i + 1}" ${i === 0 ? 'id="work"' : ''} style="--chip:${STOPS[i + 1].chip}"><div class="pin">
      <div class="slot">${fw(s.name)}</div>
      <div class="strip"><div><p class="meta">${s.sector}, ${s.host}</p><h2>${s.name}</h2></div><p class="hook">${s.hook}</p>
      <a class="btn" href="${s.study}">See the study<span class="sr"> of ${s.name}</span> ${ARROW}</a></div></div></article>`;
  });
  html += `<section class="stop" data-stop="9" id="prices" style="--chip:${STOPS[9].chip}"><div class="pin price">
    <div class="tiers-head"><h2>What it costs</h2><a class="btn" href="${N.links.services}">See the services ${ARROW}</a></div>
    <ul class="tiers">${N.tiers.map((t) => `<li class="tier"><div class="slot">${fw(t.from)}</div><div class="info"><h3>${t.name}</h3><p><span>From ${t.from}.</span> ${t.who}</p></div></li>`).join('')}</ul>
    </div></section>`;
  html += `<section class="stop" data-stop="10" style="--chip:${STOPS[10].chip}"><div class="pin">
    <div class="slot" aria-hidden="true"></div>
    <figure class="panel"><blockquote><p>“${N.quote.text}”</p></blockquote><figcaption>${N.quote.by}, ${N.quote.role}</figcaption></figure>
    </div></section>`;
  html += `<section class="stop" data-stop="11" id="start" style="--chip:${STOPS[11].chip}"><div class="pin">
    <h2 class="sr">Start a project</h2><div class="slot">${fw('Start a project')}</div>
    <div class="panel cta">
      <div><a class="big" href="mailto:${N.contact.email}">${N.contact.email}</a><a class="big" href="tel:+1${N.contact.phone.replace(/\D/g, '')}">${N.contact.phone}</a></div>
      <div><p>${N.contact.reply}</p><p>${N.contact.free}</p><a class="btn" href="${N.links.contact}">Start a project ${ARROW}</a></div>
      <p class="fine">${sub2} ${N.contact.place}.</p>
    </div></div></section>`;
  main.innerHTML = html;
  $('#nav-about').href = N.links.about;
}
buildDOM();

/* ---------- GL bootstrap ---------- */
const canvas = $('#stage');
const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
const floatOK = gl && (gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
const pauseBtn = $('#pause');
if (!gl || !floatOK) { document.documentElement.classList.add('nogl'); pauseBtn.hidden = true; return; }
gl.getExtension('OES_texture_float_linear');
canvas.addEventListener('webglcontextlost', () => { document.documentElement.classList.add('nogl'); pauseBtn.hidden = true; slots.forEach((s) => s.el.pause()); });

const VS = `#version 300 es
out vec2 vUv; void main(){ vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2); vUv=p; gl_Position=vec4(p*2.-1.,0.,1.); }`;
const HEAD = `#version 300 es
precision highp float; precision highp sampler2D; in vec2 vUv; out vec4 o;
`;
function shader(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n'));
  return s;
}
const vsObj = shader(gl.VERTEX_SHADER, VS);
function program(fs) {
  const p = gl.createProgram(); gl.attachShader(p, vsObj); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, HEAD + fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i), nm = a.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}
const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);

function makeTex(w, h, ifmt, fmt, type, filter, wrap, data = null) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data);
  return t;
}
function fbo(w, h, ifmt, fmt, filter = gl.LINEAR, wrap = gl.CLAMP_TO_EDGE) {
  const tex = makeTex(w, h, ifmt, fmt, gl.HALF_FLOAT, filter, wrap);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  return { tex, fb, w, h, ok: gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE };
}
const dfbo = (w, h, i, f) => { let a = fbo(w, h, i, f), b = fbo(w, h, i, f); return { get read() { return a; }, get write() { return b; }, swap() { const c = a; a = b; b = c; }, free() { [a, b].forEach(free); } }; };
const free = (x) => { gl.deleteTexture(x.tex); gl.deleteFramebuffer(x.fb); };
function bind(unit, tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); return unit; }
function blit(target) {
  if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, target.w, target.h); }
  else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/* ---------- Shaders ---------- */
const FS = {
  noise: `
vec2 h2(vec2 p,float s){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)))+s; return -1.+2.*fract(sin(p)*43758.5453); }
float gn(vec2 x,float per,float s){ vec2 i=floor(x),f=fract(x),u=f*f*f*(f*(f*6.-15.)+10.);
  #define G(a,b) dot(h2(mod(i+vec2(a,b),per),s),f-vec2(a,b))
  return mix(mix(G(0.,0.),G(1.,0.),u.x),mix(G(0.,1.),G(1.,1.),u.x),u.y); }
float sm(vec2 uv,float s){ return clamp((gn(uv*3.,3.,s)*.82+gn(uv*6.,6.,s+3.)*.18)*1.75+.5,0.,1.); }
float fbm(vec2 uv,float s){ float a=0.; a+=gn(uv*4.,4.,s)*.6; a+=gn(uv*8.,8.,s+3.)*.28; a+=gn(uv*16.,16.,s+7.)*.12; return clamp(a*1.55+.5,0.,1.); }
void main(){ o=vec4(sm(vUv,1.),fbm(vUv,11.),fbm(vUv,23.),sm(vUv,37.)); }`,
  splat: `
uniform sampler2D uSrc; uniform float uAsp; uniform int uN; uniform vec4 uS[5]; uniform float uR[5];
void main(){ vec2 v=texture(uSrc,vUv).xy; for(int i=0;i<uN;i++){ vec2 d=vUv-uS[i].xy; d.x*=uAsp; v+=uS[i].zw*exp(-dot(d,d)/uR[i]); } o=vec4(v,0.,1.); }`,
  advect: `
uniform sampler2D uVel,uSrc; uniform vec2 uTexel; uniform float uDt,uKeep;
void main(){ vec2 c=vUv-uDt*texture(uVel,vUv).xy*uTexel; vec2 e=uTexel;
  vec2 a=texture(uSrc,c).xy, n=.25*(texture(uSrc,c+vec2(e.x,0.)).xy+texture(uSrc,c-vec2(e.x,0.)).xy+texture(uSrc,c+vec2(0.,e.y)).xy+texture(uSrc,c-vec2(0.,e.y)).xy);
  o=vec4(uKeep*mix(a,n,.28),0.,1.); }`,
  disp: `
uniform sampler2D uVel,uSrc; uniform vec2 uTexel; uniform float uDt,uKeep;
void main(){ vec2 dl=uDt*texture(uVel,vUv).xy*uTexel; vec2 c=vUv-dl,e=uTexel;
  vec4 a=texture(uSrc,c), n=.25*(texture(uSrc,c+vec2(e.x,0.))+texture(uSrc,c-vec2(e.x,0.))+texture(uSrc,c+vec2(0.,e.y))+texture(uSrc,c-vec2(0.,e.y)));
  vec4 m=mix(a,n,.12); o=vec4(uKeep*(m.xy-dl),m.z*uKeep*uKeep,1.); }`,
  curl: `
uniform sampler2D uVel; uniform vec2 uTexel;
void main(){ float L=texture(uVel,vUv-vec2(uTexel.x,0.)).y,R=texture(uVel,vUv+vec2(uTexel.x,0.)).y,B=texture(uVel,vUv-vec2(0.,uTexel.y)).x,T=texture(uVel,vUv+vec2(0.,uTexel.y)).x; o=vec4(.5*(R-L-T+B),0.,0.,1.); }`,
  vort: `
uniform sampler2D uVel,uCurl; uniform vec2 uTexel; uniform float uDt,uK;
void main(){ float L=texture(uCurl,vUv-vec2(uTexel.x,0.)).x,R=texture(uCurl,vUv+vec2(uTexel.x,0.)).x,B=texture(uCurl,vUv-vec2(0.,uTexel.y)).x,T=texture(uCurl,vUv+vec2(0.,uTexel.y)).x,C=texture(uCurl,vUv).x;
  vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L)); f=f/(length(f)+1e-4)*uK*C; f.y*=-1.; o=vec4(texture(uVel,vUv).xy+f*uDt,0.,1.); }`,
  div: `
uniform sampler2D uVel; uniform vec2 uTexel;
void main(){ float L=texture(uVel,vUv-vec2(uTexel.x,0.)).x,R=texture(uVel,vUv+vec2(uTexel.x,0.)).x,B=texture(uVel,vUv-vec2(0.,uTexel.y)).y,T=texture(uVel,vUv+vec2(0.,uTexel.y)).y; o=vec4(.5*(R-L+T-B),0.,0.,1.); }`,
  press: `
uniform sampler2D uP,uDiv; uniform vec2 uTexel;
void main(){ float L=texture(uP,vUv-vec2(uTexel.x,0.)).x,R=texture(uP,vUv+vec2(uTexel.x,0.)).x,B=texture(uP,vUv-vec2(0.,uTexel.y)).x,T=texture(uP,vUv+vec2(0.,uTexel.y)).x; o=vec4((L+R+B+T-texture(uDiv,vUv).x)*.25,0.,0.,1.); }`,
  grad: `
uniform sampler2D uP,uVel; uniform vec2 uTexel;
void main(){ float L=texture(uP,vUv-vec2(uTexel.x,0.)).x,R=texture(uP,vUv+vec2(uTexel.x,0.)).x,B=texture(uP,vUv-vec2(0.,uTexel.y)).x,T=texture(uP,vUv+vec2(0.,uTexel.y)).x; o=vec4(texture(uVel,vUv).xy-.5*vec2(R-L,T-B),0.,1.); }`,
  ink: `
uniform sampler2D uSrc; uniform float uAsp; uniform int uN; uniform vec4 uS[5]; uniform float uR[5];
void main(){ vec4 v=texture(uSrc,vUv); for(int i=0;i<uN;i++){ vec2 d=vUv-uS[i].xy; d.x*=uAsp; v.z+=uS[i].z*exp(-dot(d,d)/uR[i]); } o=v; }`,
  scale: `uniform sampler2D uSrc; uniform float uK; void main(){ o=vec4(texture(uSrc,vUv).x*uK,0.,0.,1.); }`,
  comp: (q) => `
uniform sampler2D uVel,uDisp,uNoise,uSA,uSB,uVA,uVB;
uniform vec3 uPA[4],uPB[4];
uniform vec2 uRes,uCov,uFocusA,uFocusB;
uniform float uTime,uT,uTV,uVelK;
const int SEQ[6]=int[6](0,1,0,2,0,3);
#define Q ${q}

vec3 bands(vec3 p[4],float x,float aa){
  float i=floor(x),f=x-i;
  vec3 c=p[SEQ[int(mod(i,6.))]],n=p[SEQ[int(mod(i+1.,6.))]];
  c*=mix(1.06,.74,f*f);                      // ink pools darker toward the next contour
  return mix(c,n*1.06,smoothstep(1.-aa,1.,f));
}
float sdf(sampler2D t,vec2 p){ return texture(t,vec2(p.x,1.-p.y)).r; }
vec3 grade(vec3 c){ c=pow(c,vec3(1.18)); float l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,1.45); return clamp(c,0.,1.); }
vec3 vid(sampler2D t,vec2 p,vec2 e){
  p=vec2(p.x,1.-p.y);
#if Q>=2
  return vec3(texture(t,p+e).r,texture(t,p).g,texture(t,p-e).b);
#else
  return texture(t,p).rgb;
#endif
}
void main(){
  vec2 uv=vUv; float asp=uRes.x/uRes.y; vec2 A=vec2(asp,1.);
  vec2 ts=1./vec2(textureSize(uDisp,0));
  vec4 D4=.25*(texture(uDisp,uv+ts*vec2(.75,.75))+texture(uDisp,uv+ts*vec2(-.75,.75))+texture(uDisp,uv+ts*vec2(.75,-.75))+texture(uDisp,uv+ts*vec2(-.75,-.75)));
  vec2 D=D4.xy; float wake=clamp(D4.z,0.,2.5);
  vec2 V=texture(uVel,uv).xy*uVelK;            // screen-height units per second
  float spd=length(V);

  /* flood front: fingered, advected by the fluid */
  vec2 fp=(uv+D)*A;
  vec4 nf=texture(uNoise,fp*.26+vec2(.13,uTime*.004));
  vec4 ng=texture(uNoise,fp*.71-vec2(uTime*.006,.31));
  float S=uv.y*.5+.5*mix(nf.g,ng.b,.22);        // 0..1 arrival order, bottom first
  float Th=mix(-.012,1.012,uT);
  float flood=smoothstep(S-.006,S+.006,Th);
  float wS=max(length(vec2(dFdx(S),dFdy(S))),1e-5);
  float front=1.-smoothstep(1.5,5.,abs(S-Th)/wS);
  /* the letters reform over a much wider band than the color */
  float kL=smoothstep(S-.2,S+.2,mix(-.2,1.2,uT));
  float melt=4.*kL*(1.-kL);

  /* marbled surface */
  vec2 q=fp*1.25;
  vec2 w=texture(uNoise,q*.09+vec2(0.,uTime*.0045)).ra-.5;
  vec2 w2=texture(uNoise,(q+w*2.)*.13-vec2(uTime*.0065,0.)).ar-.5;
  vec2 nq=q*.11+w*.5+w2*.55;
  float f=texture(uNoise,nq).r;
  float fx=f*9.+D.y*5.+wake*4.2;
  float ge=.0035;
  vec2 gf=vec2(texture(uNoise,nq+vec2(ge,0.)).r-f,texture(uNoise,nq+vec2(0.,ge)).r-f)/ge;  // per noise-uv
  float gscale=.11*1.25/uRes.y;                                  // noise-uv per device pixel
  float aa=clamp(length(gf)*9.*gscale*1.5,.003,.5);
  vec3 cA=bands(uPA,fx,aa),cB=bands(uPB,fx+1.7,aa);
  vec3 col=mix(cA,cB,flood);
  {float fr=fract(fx); float gfl=length(gf)+1e-4; float lip=smoothstep(.0,.05,fr)*(1.-smoothstep(.05,.2,fr));
   float lp=dot(gf/gfl,normalize(vec2(-.5,.8))); col+=lip*max(lp,0.)*.34; col*=1.-lip*max(-lp,0.)*.4;}
  /* wet gloss: thick paint under one window light */
  vec2 gh=gf*.16; gh+=V*.35;
  vec3 N1=normalize(vec3(-gh,1.));
  float spec=pow(max(dot(N1,normalize(vec3(-.42,.62,.66))),0.),60.);
  col+=spec*.22;
  col=mix(col,col*.1,front*.92);                // dark meniscus along the flood edge
  col+=(1.-smoothstep(5.,8.,abs(S-Th+wS*7.)/wS))*.5*(1.-flood);

  /* letters */
  float dn=texture(uNoise,vec2(uv.x*asp*.34,.37)).r, dn2=texture(uNoise,vec2(uv.x*asp*1.13,.71)).g;
  float dr=melt*melt*(.03+.34*dn*dn+.1*dn2*dn2);
  vec2 Dl=D/(1.+length(D)*9.);
  vec2 p=uv+Dl*.42; p.y+=dr;               // drip: sample above, so the shape runs down
  p+=(vec2(nf.r,nf.a)-.5)*melt*.07;
  float dA=sdf(uSA,p),dB=sdf(uSB,p),d=mix(dA,dB,kL);
  d+=melt*(texture(uNoise,fp*.44+vec2(uTime*.01,.2)).a-.5)*.05;
  float pxA=max(fwidth(d),1./uRes.y);
  float inside=smoothstep(-pxA*.8,pxA*.8,d);

  /* contact shadow keeps the windows cut into the surface */
  vec2 so=vec2(.0045/asp*1.,.0085);
  float dS=mix(sdf(uSA,p+so),sdf(uSB,p+so),kL);
  float sh=smoothstep(-pxA,pxA,dS);
  col=mix(col,col*col*.16,sh);

  vec2 grd;
#if Q>=1
  {float e=.0025;
   float ax=mix(sdf(uSA,p+vec2(e/asp,0.)),sdf(uSB,p+vec2(e/asp,0.)),kL),ay=mix(sdf(uSA,p+vec2(0.,e)),sdf(uSB,p+vec2(0.,e)),kL);
   grd=vec2(ax-mix(dA,dB,kL),ay-mix(dA,dB,kL));}
#else
  grd=vec2(dFdx(d),dFdy(d));
#endif
  grd/=max(length(grd),1e-5);
  float bev=1.-smoothstep(0.,.0065,d);

  /* footage: lens at the bevel, pushed by the same fluid, melting at the ink line */
  vec2 vp=uv+Dl*.8+grd*bev*bev*vec2(.012/asp,.012);
  vec2 e=(Dl*.02+grd*bev*.0015+V*.0012);
  float ST=uv.y*.42+.58*mix(nf.a,ng.g,.25);
  float Tv=mix(-.012,1.012,uTV);
  float inkK=smoothstep(ST-.005,ST+.005,Tv);
  float near=exp(-abs(ST-Tv)*34.);
  vec2 sm=vec2(0.,near*near*.05*sign(ST-Tv));
  vec2 va=(vp+sm-.5)*uCov+uFocusA, vb=(vp-sm-.5)*uCov+uFocusB;
  vec3 fA=inkK<.999?vid(uVA,va,e):vec3(0.), fB=inkK>.001?vid(uVB,vb,e):vec3(0.);
  vec3 foot=grade(mix(fA,fB,inkK));
  /* ink line inside the letters takes the color of the incoming flood */
  float wST=max(length(vec2(dFdx(ST),dFdy(ST))),1e-5);
  float inkEdge=1.-smoothstep(1.6,3.4,abs(ST-Tv)/wST*(uRes.y/1000.>1.?1.:1.));
  foot=mix(foot,cB*1.05,inkEdge);
  { float wr=sin(wake*14.)*.5+.5; foot=mix(foot,mix(cA,cB,flood)*1.25,smoothstep(.05,.9,wake)*.55*wr); }

  /* glass: rim of light on the upper-left edges, weight on the lower-right */
  float lit=dot(grd,normalize(vec2(.5,-.8)));
  foot+=bev*bev*max(lit,0.)*.2;
  foot*=1.-bev*bev*max(-lit,0.)*.14;

  col=mix(col,foot,inside);
  /* a hair of dark at the cut edge, for type that reads over any footage */
  col*=1.-.72*(1.-smoothstep(.0009,.0032,abs(d+.0012)));
  o=vec4(col,1.);
}`,
};

const P = {};
for (const k of ['noise', 'ink', 'splat', 'advect', 'disp', 'curl', 'vort', 'div', 'press', 'grad', 'scale']) P[k] = program(FS[k]);
let compQ = -1;
function buildComp(q) { if (compQ === q) return; if (P.comp) gl.deleteProgram(P.comp.p); P.comp = program(FS.comp(q)); compQ = q; }

/* ---------- Bake tileable noise once ---------- */
const noiseFB = fbo(512, 512, gl.RGBA16F, gl.RGBA, gl.LINEAR, gl.REPEAT);
gl.useProgram(P.noise.p); blit(noiseFB);

/* ---------- Quality tiers ---------- */
const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 768;
const TIERS = [
  { q: 0, dpr: 1,    sim: 64,  jacobi: 6,  sdf: 640,  vort: false, videos: 2 },
  { q: 1, dpr: 1.35, sim: 96,  jacobi: 10, sdf: 900,  vort: false,  videos: 3 },
  { q: 2, dpr: 1.75, sim: 144, jacobi: 18, sdf: 1400, vort: false,  videos: 3 },
];
let tier = coarse ? 1 : 2;
const forced = new URLSearchParams(location.search).get('tier');
if (forced) tier = +forced;

/* ---------- Size + sim buffers ---------- */
let W = 0, H = 0, cssW = 0, cssH = 0, simW = 0, simH = 0, vel, press, div, curl, disp;
function buildSim() {
  [vel, press, disp].forEach((x) => x && x.free()); [div, curl].forEach((x) => x && free(x));
  const t = TIERS[tier], asp = cssW / cssH;
  simH = asp > 1 ? t.sim : Math.round(t.sim / asp); simW = asp > 1 ? Math.round(t.sim * asp) : t.sim;
  vel = dfbo(simW, simH, gl.RG16F, gl.RG);
  disp = dfbo(simW, simH, gl.RGBA16F, gl.RGBA);
  press = dfbo(simW, simH, gl.R16F, gl.RED);
  div = fbo(simW, simH, gl.R16F, gl.RED, gl.NEAREST);
  curl = fbo(simW, simH, gl.R16F, gl.RED, gl.NEAREST);
}
function sizeCanvas() {
  const t = TIERS[tier], r = canvas.getBoundingClientRect();
  cssW = Math.round(r.width); cssH = Math.round(r.height);
  const dpr = Math.min(devicePixelRatio || 1, t.dpr);
  W = Math.round(cssW * dpr); H = Math.round(cssH * dpr);
  canvas.width = W; canvas.height = H;
}

/* ---------- Posters + video slots (at most three elements decode) ---------- */
const whiteTex = makeTex(1, 1, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR, gl.CLAMP_TO_EDGE, new Uint8Array([255, 255, 255, 255]));
const posters = N.sites.map((s) => {
  const e = { tex: whiteTex, img: new Image() };
  e.img.onload = () => { e.tex = makeTex(1, 1, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR, gl.CLAMP_TO_EDGE); gl.bindTexture(gl.TEXTURE_2D, e.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, e.img); dirty = true; };
  e.img.src = s.poster;
  return e;
});
const vHolder = document.createElement('div');
vHolder.setAttribute('aria-hidden', 'true');
vHolder.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1';
document.body.append(vHolder);
const slots = [0, 1, 2].map(() => {
  const el = document.createElement('video');
  el.muted = true; el.defaultMuted = true; el.loop = true; el.playsInline = true; el.setAttribute('playsinline', ''); el.preload = 'auto'; el.setAttribute('muted', '');
  vHolder.append(el);
  const s = { el, site: -1, tex: null, w: 0, h: 0, ready: false, dirty: false, uploads: 0 };
  const onFrame = () => { s.dirty = true; el.requestVideoFrameCallback(onFrame); };
  if (el.requestVideoFrameCallback) el.requestVideoFrameCallback(onFrame);
  else el.addEventListener('timeupdate', () => { s.dirty = true; });
  s.rvfc = !!el.requestVideoFrameCallback;
  el.addEventListener('loadeddata', () => { s.dirty = true; });
  return s;
});
function assignVideos(active, preload) {
  if (still) { slots.forEach((s) => { if (!s.el.paused) s.el.pause(); }); return; }
  const lim = TIERS[tier].videos;
  const want = [...new Set([...active, ...(preload ?? [])])].slice(0, lim);
  slots.forEach((s, i) => { if (i >= lim && s.site >= 0) { s.el.pause(); s.el.removeAttribute('src'); s.el.load(); s.site = -1; s.ready = false; } });
  const used = slots.slice(0, lim);
  for (const siteId of want) {
    if (used.some((s) => s.site === siteId)) continue;
    const s = used.find((x) => !want.includes(x.site));
    if (!s) break;
    s.site = siteId; s.ready = false; s.el.src = N.sites[siteId].video; s.el.load();
  }
  for (const s of used) {
    if (s.site < 0) continue;
    const on = active.includes(s.site) && !paused;
    if (on && s.el.paused) { const pr = s.el.play(); if (pr) pr.catch(() => {}); }
    else if (!on && !s.el.paused) s.el.pause();
  }
}
function uploadVideos() {
  let n = 0;
  for (const s of slots) {
    if (s.site < 0 || !s.dirty || s.el.readyState < 2) continue;
    if (compQ === 0 && n >= 1) continue;
    s.dirty = !s.rvfc && !s.el.paused;
    if (!s.tex) s.tex = makeTex(1, 1, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, s.tex);
    const vw = s.el.videoWidth, vh = s.el.videoHeight;
    if (s.w !== vw || s.h !== vh) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, s.el); s.w = vw; s.h = vh; }
    else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, s.el);
    s.ready = true; s.uploads++; n++;
  }
}
const texFor = (siteId) => {
  const s = slots.find((x) => x.site === siteId && x.ready);
  return s ? s.tex : posters[siteId].tex;
};

/* ---------- Masks: type in a 2D canvas, signed distance in a worker ---------- */
const workerSrc = `
const INF=1e20;
function edt1d(g,o,st,len,v,z,f,d){ v[0]=0;z[0]=-INF;z[1]=INF;f[0]=g[o];
  for(let q=1,k=0,s=0;q<len;q++){ f[q]=g[o+q*st]; const q2=q*q;
    do{ const r=v[k]; s=(f[q]-f[r]+q2-r*r)/(q-r)/2; }while(s<=z[k]&&--k>-1);
    k++; v[k]=q;z[k]=s;z[k+1]=INF; }
  for(let q=0,k=0;q<len;q++){ while(z[k+1]<q)k++; const r=v[k],qr=q-r; g[o+q*st]=f[r]+qr*qr; } }
function edt(g,w,h){ const m=Math.max(w,h),f=new Float64Array(m),z=new Float64Array(m+1),v=new Uint32Array(m);
  for(let x=0;x<w;x++)edt1d(g,x,w,h,v,z,f); for(let y=0;y<h;y++)edt1d(g,y*w,1,w,v,z,f); }
onmessage=(e)=>{ const {id,a,w,h}=e.data,n=w*h,gi=new Float64Array(n),go=new Float64Array(n);
  for(let i=0;i<n;i++){ const c=a[i]/255; if(c===1){go[i]=0;gi[i]=INF;} else if(c===0){go[i]=INF;gi[i]=0;}
    else { const t=.5-c; go[i]=t>0?t*t:0; gi[i]=t<0?t*t:0; } }
  edt(go,w,h); edt(gi,w,h);
  const out=new Float32Array(n); for(let i=0;i<n;i++)out[i]=(Math.sqrt(gi[i])-Math.sqrt(go[i]))/h;
  postMessage({id,out,w,h},[out.buffer]); };`;
const worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' })));
const STRETCH = [['extra-condensed', 62.5], ['condensed', 75], ['semi-condensed', 87.5], ['normal', 100], ['semi-expanded', 112.5], ['expanded', 125], ['extra-expanded', 150]];
const mctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
const mcache = new Map();
function mstretch(text, key) {
  const k = key + '|' + text;
  if (mcache.has(k)) return mcache.get(k);
  mctx.font = `900 ${key} 200px Anybody`;
  if ('fontKerning' in mctx) mctx.fontKerning = 'normal';
  const m = mctx.measureText(text), c = mctx.measureText('H');
  const ink = /[$,]/.test(text);
  const r = { w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, l: m.actualBoundingBoxLeft, cap: ink ? m.actualBoundingBoxAscent + m.actualBoundingBoxDescent : c.actualBoundingBoxAscent, desc: ink ? m.actualBoundingBoxDescent : 0 };
  mcache.set(k, r); return r;
}
function bestStretch(text, w, h) {
  let best = null;
  for (const [key] of STRETCH) {
    const r = mstretch(text, key), fs = 200 * h / r.cap, sx = w / (r.w * fs / 200), score = Math.abs(Math.log(sx));
    if (!best || score < best.score) best = { key, fs, sx, score, r };
  }
  return best;
}
function partitions(words, nLines) {
  const out = [];
  const go = (start, left, acc) => {
    if (left === 1) { out.push([...acc, words.slice(start).join(' ')]); return; }
    for (let i = start + 1; i <= words.length - left + 1; i++) go(i, left - 1, [...acc, words.slice(start, i).join(' ')]);
  };
  go(0, nLines, []); return out;
}
function rowsFor(lines, rect, gap) {
  const wt = lines.map((l) => Math.pow(1 / Math.max(l.replace(/ /g, '').length, 6), .62)), sum = wt.reduce((a, b) => a + b, 0);
  const avail = rect.h - gap * (lines.length - 1);
  return wt.map((x) => x / sum * avail);
}
function chooseLines(words, rect, gap) {
  let best = null;
  for (let n = 1; n <= Math.min(words.length, 5); n++) for (const lines of partitions(words, n)) {
    const rows = rowsFor(lines, rect, gap); let score = 0;
    lines.forEach((l, i) => { const b = bestStretch(l, rect.w, rows[i]); score += Math.pow(Math.max(0, Math.abs(Math.log(b.sx)) - .08), 1.5) * (b.sx < 1 ? 1.5 : 1); });
    if (lines.some((l) => l === 'OF' || l === 'FOR')) score += 5;
    if (lines.some((l) => /(^| )(OF|FOR)$/.test(l) === false && /^(OF|FOR) /.test(l))) score += .02;
    score = score / lines.length + n * .012;
    if (!best || score < best.score) best = { score, lines };
  }
  return best.lines;
}
function drawLine(ctx, text, x, y, w, h) {
  const b = bestStretch(text, w, h);
  ctx.font = `900 ${b.key} ${b.fs}px Anybody`;
  const k = b.fs / 200;
  ctx.save(); ctx.translate(x, y + h); ctx.scale(b.sx, 1);
  ctx.fillText(text, b.r.l * k, -b.r.desc * k); ctx.restore();
}
function slotRects(i) {
  const sec = main.querySelector(`[data-stop="${i}"]`), pin = sec.querySelector('.pin');
  const pr = pin.getBoundingClientRect();
  return [...sec.querySelectorAll('.slot')].map((el) => { const r = el.getBoundingClientRect(); return { x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height }; });
}
const maskCanvas = document.createElement('canvas');
const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
let sdfW = 0, sdfH = 0, maskGen = 0;
const sdfs = new Array(STOPS.length).fill(null);
const blankSDF = makeTex(1, 1, gl.R16F, gl.RED, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, new Float32Array([-0.25]));
let queue = [], busy = false;
function renderMask(i) {
  const st = STOPS[i], s = sdfW / cssW, ctx = maskCtx;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, sdfW, sdfH); ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.setTransform(s, 0, 0, s, 0, 0);
  const rects = slotRects(i);
  if (st.perSlot) st.perSlot.forEach((t, j) => { const r = rects[j]; drawLine(ctx, t, r.x, r.y, r.w, r.h); });
  else {
    const r = rects[0], gap = Math.max(6, Math.min(r.w, r.h) * .018);
    const portrait = r.h > r.w * 1.05;
    const lines = (portrait && st.tall) || st.rows || chooseLines(st.words, r, gap);
    st.lines = lines;
    const rows = rowsFor(lines, r, gap); let y = r.y;
    lines.forEach((l, j) => { drawLine(ctx, l, r.x, y, r.w, rows[j]); y += rows[j] + gap; });
  }
  const img = ctx.getImageData(0, 0, sdfW, sdfH).data, a = new Uint8Array(sdfW * sdfH);
  for (let k = 0; k < a.length; k++) a[k] = img[k * 4 + 3];
  return a;
}
function pumpMasks() {
  if (busy || !queue.length) return;
  queue.sort((a, b) => Math.abs(a - stopCur) - Math.abs(b - stopCur));
  const i = queue.shift(), a = renderMask(i);
  busy = true; worker.postMessage({ id: i, gen: maskGen, a, w: sdfW, h: sdfH }, [a.buffer]);
}
worker.onmessage = (e) => {
  busy = false;
  const { id, out, w, h } = e.data;
  if (w === sdfW && h === sdfH) {
    if (sdfs[id]) gl.deleteTexture(sdfs[id]);
    sdfs[id] = makeTex(w, h, gl.R16F, gl.RED, gl.FLOAT, gl.LINEAR, gl.CLAMP_TO_EDGE, out);
    lastSDF[id] = out; dirty = true;
  } else queue.push(id);
  pumpMasks();
};
const lastSDF = [];
function rebuildMasks() {
  const t = TIERS[tier], asp = cssW / cssH, long = Math.min(t.sdf, Math.max(cssW, cssH) * Math.min(devicePixelRatio || 1, 1.5));
  sdfW = Math.round(asp >= 1 ? long : long * asp); sdfH = Math.round(asp >= 1 ? long / asp : long);
  maskCanvas.width = sdfW; maskCanvas.height = sdfH; maskGen++;
  queue = STOPS.map((_, i) => i); pumpMasks();
}

/* ---------- Scroll map: native scroll drives a float stop position ---------- */
let tops = [], viewH = innerHeight;
function measure() {
  viewH = innerHeight;
  tops = [...main.children].map((el) => el.offsetTop + main.offsetTop);
}
function scrollStop() {
  const y = scrollY, n = tops.length;
  for (let i = n - 1; i >= 1; i--) {
    if (y >= tops[i]) return i;
    if (y > tops[i] - viewH) { const t = (y - (tops[i] - viewH)) / viewH; return i - 1 + t; }
  }
  return 0;
}

/* ---------- Pointer ---------- */
const queueSplat = [];
let lastP = null;
function pointerAt(x, y, t) {
  if (still || paused) return;
  if (lastP) {
    const dt = Math.max(t - lastP.t, 4) / 1000, dx = x - lastP.x, dy = y - lastP.y;
    if (t - lastP.t < 120 && (dx || dy)) {
      queueSplat.push({ x: x / cssW, y: 1 - y / cssH, vx: dx / dt, vy: -dy / dt });
      if (queueSplat.length > 3) queueSplat.shift();
    }
  }
  lastP = { x, y, t };
}
addEventListener('pointermove', (e) => pointerAt(e.clientX, e.clientY, e.timeStamp), { passive: true });
addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) pointerAt(t.clientX, t.clientY, e.timeStamp); }, { passive: true });
addEventListener('touchstart', () => { lastP = null; }, { passive: true });

/* ---------- Pause + reduced motion ---------- */
let paused = false, still = reduced.matches, dirty = true;
function setPaused(v) {
  paused = v;
  pauseBtn.setAttribute('aria-pressed', String(v));
  pauseBtn.querySelector('.lbl').textContent = v ? 'Play motion' : 'Pause motion';
  still = v && reduced.matches;
  if (v) { intro = 1; slots.forEach((s) => { if (!s.el.paused) s.el.pause(); }); }
  dirty = true; last = performance.now();
}
pauseBtn.addEventListener('click', () => setPaused(!paused));
reduced.addEventListener('change', () => setPaused(reduced.matches));

/* ---------- Simulation step ---------- */
function runSplats(list) {
  if (!list.length) return;
  const p = P.splat; gl.useProgram(p.p);
  gl.uniform1i(p.u.uSrc, bind(0, vel.read.tex));
  gl.uniform1f(p.u.uAsp, cssW / cssH); gl.uniform1i(p.u.uN, Math.min(list.length, 5));
  const a = new Float32Array(20), r = new Float32Array(5);
  list.slice(0, 5).forEach((s, i) => { a.set([s.x, s.y, s.fx, s.fy], i * 4); r[i] = s.r; });
  gl.uniform4fv(p.u.uS, a); gl.uniform1fv(p.u.uR, r);
  blit(vel.write); vel.swap();
}
function stepSim(dt, splats, inkSplats) {
  const t = TIERS[tier], tx = 1 / simW, ty = 1 / simH;
  gl.disable(gl.BLEND);
  if (t.vort) {
    let p = P.curl; gl.useProgram(p.p); gl.uniform2f(p.u.uTexel, tx, ty); gl.uniform1i(p.u.uVel, bind(0, vel.read.tex)); blit(curl);
    p = P.vort; gl.useProgram(p.p); gl.uniform2f(p.u.uTexel, tx, ty); gl.uniform1f(p.u.uDt, dt); gl.uniform1f(p.u.uK, simH * .05);
    gl.uniform1i(p.u.uVel, bind(0, vel.read.tex)); gl.uniform1i(p.u.uCurl, bind(1, curl.tex)); blit(vel.write); vel.swap();
  }
  runSplats(splats);
  let p = P.div; gl.useProgram(p.p); gl.uniform2f(p.u.uTexel, tx, ty); gl.uniform1i(p.u.uVel, bind(0, vel.read.tex)); blit(div);
  p = P.scale; gl.useProgram(p.p); gl.uniform1f(p.u.uK, .75); gl.uniform1i(p.u.uSrc, bind(0, press.read.tex)); blit(press.write); press.swap();
  p = P.press; gl.useProgram(p.p); gl.uniform2f(p.u.uTexel, tx, ty); gl.uniform1i(p.u.uDiv, bind(1, div.tex));
  for (let i = 0; i < t.jacobi; i++) { gl.uniform1i(p.u.uP, bind(0, press.read.tex)); blit(press.write); press.swap(); }
  p = P.grad; gl.useProgram(p.p); gl.uniform2f(p.u.uTexel, tx, ty); gl.uniform1i(p.u.uP, bind(0, press.read.tex)); gl.uniform1i(p.u.uVel, bind(1, vel.read.tex)); blit(vel.write); vel.swap();
  p = P.advect; gl.useProgram(p.p); gl.uniform2f(p.u.uTexel, tx, ty); gl.uniform1f(p.u.uDt, dt); gl.uniform1f(p.u.uKeep, Math.exp(-dt * 1.15));
  gl.uniform1i(p.u.uVel, bind(0, vel.read.tex)); gl.uniform1i(p.u.uSrc, bind(0, vel.read.tex)); blit(vel.write); vel.swap();
  if (inkSplats.length) {
    p = P.ink; gl.useProgram(p.p); gl.uniform1i(p.u.uSrc, bind(0, disp.read.tex)); gl.uniform1f(p.u.uAsp, cssW / cssH); gl.uniform1i(p.u.uN, Math.min(inkSplats.length, 5));
    const a = new Float32Array(20), r = new Float32Array(5);
    inkSplats.slice(0, 5).forEach((q, i) => { a.set([q.x, q.y, q.a, 0], i * 4); r[i] = q.r; });
    gl.uniform4fv(p.u.uS, a); gl.uniform1fv(p.u.uR, r); blit(disp.write); disp.swap();
  }
  p = P.disp; gl.useProgram(p.p); gl.uniform2f(p.u.uTexel, tx, ty); gl.uniform1f(p.u.uDt, dt); gl.uniform1f(p.u.uKeep, Math.exp(-dt * .62));
  gl.uniform1i(p.u.uVel, bind(0, vel.read.tex)); gl.uniform1i(p.u.uSrc, bind(1, disp.read.tex)); blit(disp.write); disp.swap();
}

/* ---------- Composite ---------- */
const palCache = STOPS.map((s) => new Float32Array(s.pal.flatMap(hex)));
const introPal = new Float32Array([...hex('#0a0a0c'), ...hex('#14141a'), ...hex('#0a0a0c'), ...hex('#14141a')]);
let intro = 0, stopCur = 0, stopTarget = 0;
function draw(time) {
  const iA = Math.floor(stopCur), iB = Math.min(iA + 1, STOPS.length - 1), t = stopCur - iA;
  const sA = STOPS[iA], sB = STOPS[iB];
  const p = P.comp; gl.useProgram(p.p);
  const introing = intro < 1;
  gl.uniform1i(p.u.uVel, bind(0, vel.read.tex)); gl.uniform1i(p.u.uDisp, bind(1, disp.read.tex)); gl.uniform1i(p.u.uNoise, bind(2, noiseFB.tex));
  gl.uniform1i(p.u.uSA, bind(3, introing ? blankSDF : (sdfs[iA] || blankSDF)));
  gl.uniform1i(p.u.uSB, bind(4, introing ? (sdfs[0] || blankSDF) : (sdfs[iB] || sdfs[iA] || blankSDF)));
  /* hero: two sites marbled together in the letters; every other stop: one, until the next melts in */
  const heroV = iA === 0 && !introing;
  const vA = heroV ? sA.vid : sA.vid, vB = sB.vid;
  gl.uniform1i(p.u.uVA, bind(5, texFor(vA))); gl.uniform1i(p.u.uVB, bind(6, texFor(vB)));
  gl.uniform3fv(p.u.uPA, introing ? introPal : palCache[iA]); gl.uniform3fv(p.u.uPB, introing ? palCache[0] : palCache[iB]);
  const asp = cssW / cssH, va = 1.6;
  const cx = asp < va ? asp / va : 1, cy = asp < va ? 1 : va / asp;
  gl.uniform2f(p.u.uCov, cx, cy); gl.uniform2f(p.u.uFocusA, .5, .5); gl.uniform2f(p.u.uFocusB, .5, .5);
  gl.uniform2f(p.u.uRes, W, H); gl.uniform1f(p.u.uTime, time);
  gl.uniform1f(p.u.uVelK, 1 / simH);
  gl.uniform1f(p.u.uT, introing ? intro : t);
  gl.uniform1f(p.u.uTV, iA === 0 ? .38 + .62 * t : t);
  blit(null);
}
function currentVideos() {
  const iA = Math.floor(stopCur), iB = Math.min(iA + 1, STOPS.length - 1), t = stopCur - iA;
  const active = t > 0.001 || iA === 0 ? [STOPS[iA].vid, STOPS[iB].vid] : [STOPS[iA].vid];
  const dir = stopTarget >= stopCur ? 1 : -1;
  const n = STOPS[clamp(Math.round(stopCur) + dir, 0, STOPS.length - 1)];
  return { active, preload: [n.vid, STOPS[iB].vid] };
}

/* ---------- Frame loop + adaptive quality ---------- */
let last = performance.now(), tSim = 0, lastScroll = scrollY, frames = 0, statT = performance.now(), slowAcc = 0, slowN = 0, lastDrop = performance.now();
const hud = { fps: 0, tier, frameMs: 0, samples: [] };
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) { last = now; return; }
  const raw = (now - last) / 1000; last = now;
  const dt = Math.min(raw, 1 / 30);

  const target = scrollStop(); stopTarget = target;
  const moving = !still && !paused;
  if (still) stopCur = Math.round(target);
  else stopCur += (target - stopCur) * (1 - Math.exp(-dt * 9));
  if (Math.abs(stopCur - target) < .0005) stopCur = target;

  const v = currentVideos();
  assignVideos(v.active, v.preload);
  pumpMasks();

  if (moving) {
    tSim += dt;
    if (intro < 1 && sdfs[0]) intro = Math.min(1, intro + dt / 1.5);
    const splats = [], inks = [];
    const pxToGrid = simH / cssH;
    for (const s of queueSplat) {
      const m = Math.hypot(s.vx, s.vy), lim = 4200, k = m > lim ? lim / m : 1;
      splats.push({ x: s.x, y: s.y, fx: s.vx * k * pxToGrid * .95, fy: s.vy * k * pxToGrid * .95, r: .0065 });
      inks.push({ x: s.x, y: s.y, a: Math.min(m * k / 2600, 1) * .55, r: .0028 });
    }
    queueSplat.length = 0;
    const dy = scrollY - lastScroll; lastScroll = scrollY;
    if (Math.abs(dy) > .5) {
      const f = clamp(dy / Math.max(raw, .008), -2200, 2200) * pxToGrid * .22 * Math.min(1, dt * 30);
      splats.push({ x: .28 + .12 * Math.sin(tSim * 3.1), y: .5, fx: f * .35 * Math.sin(tSim * 2.3), fy: f, r: .05 });
      splats.push({ x: .74 + .1 * Math.cos(tSim * 2.7), y: .46, fx: -f * .3 * Math.cos(tSim * 1.9), fy: f * .75, r: .035 });
    }
    /* a slow unseen stir keeps the surface alive with nobody touching it */
    const a = tSim * .41, x = .5 + .46 * Math.sin(a * 1.3), y = .5 + .44 * Math.sin(a * 2.1 + 1.2);
    splats.push({ x, y, fx: Math.cos(a * 1.3) * simH * .34 * dt, fy: Math.cos(a * 2.1 + 1.2) * simH * .46 * dt, r: .03 });
    stepSim(dt, splats, inks);
    uploadVideos();
    draw(tSim);
  } else if (dirty || Math.abs(lastDrawn - stopCur) > 1e-4) {
    lastScroll = scrollY;
    if (still) intro = 1;
    uploadVideos();
    draw(tSim);
    lastDrawn = stopCur; dirty = false;
  } else if (slots.some((s) => s.dirty && s.el.readyState >= 2 && s.ready === false)) { uploadVideos(); dirty = true; }
  frames++;
  if (now - statT > 500) { hud.fps = frames * 1000 / (now - statT); frames = 0; statT = now; hud.samples.push(+hud.fps.toFixed(1)); if (hud.samples.length > 120) hud.samples.shift(); }
  if (moving && !forced) {
    slowAcc += raw; slowN++;
    if (slowN >= 45) {
      const avg = slowAcc / slowN; slowAcc = 0; slowN = 0;
      hud.frameMs = avg * 1000;
      if (avg > 1 / 42 && tier > 0 && now - lastDrop > 2000) { tier--; hud.tier = tier; lastDrop = now; applyTier(); }
    }
  }
}
let lastDrawn = -1;

function applyTier() {
  buildComp(TIERS[tier].q); sizeCanvas(); buildSim();
  dirty = true;
}
function layout(full = true) {
  sizeCanvas(); measure();
  if (full) { buildComp(TIERS[tier].q); buildSim(); rebuildMasks(); }
  dirty = true;
}
let rsz, lastW = innerWidth, lastH = innerHeight;
addEventListener('resize', () => {
  /* mobile address-bar collapse must not rebuild anything */
  const big = innerWidth !== lastW || Math.abs(innerHeight - lastH) > 140;
  measure();
  if (!big) return;
  lastW = innerWidth; lastH = innerHeight;
  clearTimeout(rsz); rsz = setTimeout(() => layout(true), 180);
});
addEventListener('scroll', () => { dirty = true; }, { passive: true });

/* Test hook (read-only numbers for the Playwright suite) */
window.__liquid = {
  hud, get stop() { return stopCur; }, get intro() { return intro; }, get tier() { return tier; },
  get slots() { return slots.map((s) => ({ site: s.site, ready: s.ready, paused: s.el.paused, uploads: s.uploads, t: +s.el.currentTime.toFixed(2) })); },
  get masks() { return sdfs.map(Boolean); }, stops: STOPS,
  /* boundary contrast: walks the letter edge, compares footage just inside to color just outside */
  edgeContrast() {
    const i = Math.round(stopCur), sd = lastSDF[i]; if (!sd) return null;
    draw(tSim);
    const px = new Uint8Array(W * H * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const lin = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
    const L = (x, y) => { const k = (Math.round(H - 1 - y * (H - 1)) * W + Math.round(x * (W - 1))) * 4; return .2126 * lin(px[k]) + .7152 * lin(px[k + 1]) + .0722 * lin(px[k + 2]); };
    const ratios = [];
    for (let y = 2; y < sdfH - 2; y += 3) for (let x = 2; x < sdfW - 2; x += 3) {
      const d = sd[y * sdfW + x]; if (Math.abs(d) > .002) continue;
      const gx = sd[y * sdfW + x + 1] - sd[y * sdfW + x - 1], gy = sd[(y + 1) * sdfW + x] - sd[(y - 1) * sdfW + x], l = Math.hypot(gx, gy) || 1;
      const st = 7 * sdfW / cssW;
      const fx = x / sdfW, fy = y / sdfH, ox = gx / l * st / sdfW, oy = gy / l * st / sdfH;
      const a = L(fx + ox, fy + oy), b = L(fx - ox, fy - oy);
      ratios.push((Math.max(a, b) + .05) / (Math.min(a, b) + .05));
    }
    ratios.sort((a, b) => a - b);
    return { n: ratios.length, p10: ratios[ratios.length * .1 | 0], median: ratios[ratios.length >> 1], under15: ratios.filter((r) => r < 1.5).length / ratios.length };
  },
};

/* Start */
const fontReady = Promise.race([document.fonts.load('900 200px Anybody', 'WEIGHT$0,'), new Promise((r) => setTimeout(r, 3000))]);
fontReady.then(() => {
  layout(true);
  if (still) { setPaused(true); intro = 1; }
  if (scrollY > 10) intro = 1;
  stopCur = scrollStop();
  requestAnimationFrame(frame);
});
})();
