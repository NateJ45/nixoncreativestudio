/* Ribbon: a film strip in real 3D, hand-written WebGL2, no libraries. */
(() => {
'use strict';
const NCS = window.NCS;
const $ = (s, r = document) => r.querySelector(s);
const params = new URLSearchParams(location.search);

/* ------------------------------------------------------------------ palette
   ground, shadow color, ink. Dark inks sit on bright hues with bright colored
   shadows; white inks on deep hues with deep shadows, so 4.5:1 holds in both. */
const BLACK = '#07070B', WHITE = '#FFFFFF';
const PAL = {
  hero:  { g: '#D4FF00', s: '#FF5B2E', ink: BLACK },
  prices:{ g: '#FFEA00', s: '#FF6A00', ink: BLACK },
  say:   { g: '#FF3B1D', s: '#B8002E', ink: BLACK },
  start: { g: '#D4FF00', s: '#FF2BA6', ink: BLACK },
};
const SITE_PAL = [
  { g: '#DC1E08', s: '#7A0A2E', ink: WHITE }, // Stone Steps
  { g: '#0A45FF', s: '#001B8A', ink: WHITE }, // MAS Monograms
  { g: '#00D45A', s: '#009A7A', ink: BLACK }, // Presbyterian Academy
  { g: '#D6003F', s: '#4E0036', ink: WHITE }, // Theology Matters
  { g: '#5A14FF', s: '#1A006E', ink: WHITE }, // FBC Muncie
  { g: '#FFB300', s: '#F2540F', ink: BLACK }, // Reid Design
  { g: '#00D2C8', s: '#0088B8', ink: BLACK }, // Foundation for Reformed Theology
  { g: '#FF2A93', s: '#E60AC0', ink: BLACK }, // First Pres Orangeburg
];
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
window.__palette = { PAL, SITE_PAL };

/* ------------------------------------------------------------------ build DOM */
const pad2 = (n) => String(n).padStart(2, '0');
const rideEl = $('#work');
NCS.sites.forEach((s, i) => {
  const p = SITE_PAL[i];
  const a = document.createElement('article');
  a.className = 'site ' + (i % 2 ? 'b' : 'a');
  a.style.setProperty('--ink', p.ink); a.style.setProperty('--g', p.g);
  a.dataset.i = i;
  a.innerHTML = `<div class="site-in"><div class="site-txt">
    <img class="poster" alt="${s.name} website" loading="lazy" width="1120" height="700" data-src="${s.poster}">
    <p class="chip num">${pad2(i + 1)} of 08, ${s.sector}</p>
    <h2${s.name.length > 24 ? ' class="long"' : ''}><a data-gl href="${s.study}">${s.name}</a></h2>
    <p class="chip hook">${s.hook}</p>
    <a class="see" href="${s.study}" aria-label="See the ${s.name} study">See the study at ${s.host}</a>
  </div></div>`;
  rideEl.appendChild(a);
});
$('#sub').innerHTML = NCS.sub;
$('#navAbout').href = NCS.links.about;
$('#svcLink').href = NCS.links.services;
$('#tiers').innerHTML = NCS.tiers.map((t) => `<li class="tier"><b>${t.name}</b><div><span class="from">from</span><span class="amt">${t.from}</span></div><p class="who">${t.who}</p></li>`).join('');
$('#quote').textContent = '“' + NCS.quote.text + '”';
$('#by').textContent = NCS.quote.by;
$('#role').textContent = NCS.quote.role;
const mail = $('#mail'); mail.textContent = NCS.contact.email; mail.href = 'mailto:' + NCS.contact.email;
const tel = $('#tel'); tel.textContent = NCS.contact.phone; tel.href = 'tel:+1' + NCS.contact.phone.replace(/\D/g, '');
$('#reply').textContent = NCS.contact.reply;
$('#free').textContent = NCS.contact.free;
$('#place').textContent = NCS.contact.place;
for (const [id, p] of [['top', PAL.hero], ['prices', PAL.prices], ['say', PAL.say], ['start', PAL.start]]) {
  const el = document.getElementById(id); el.style.setProperty('--ink', p.ink); el.style.setProperty('--g', p.g);
}
document.querySelectorAll('.tier').forEach((t, i) => t.style.setProperty('--tc', ['#D4FF00', '#FFEA00', '#FF2A93'][i]));

/* headline: justified poster lines, each fit to the column */
const h1 = $('#headline');
let h1Mode = '';
function buildHeadline() {
  const portrait = innerWidth / innerHeight < 1;
  const mode = portrait ? 'p' : 'l';
  if (mode === h1Mode) return;
  h1Mode = mode;
  const heavy = NCS.line.heavy; // "pull their weight."
  const words = heavy.split(' ');
  const lines = portrait ? words : [words[0] + ' ' + words[1], words[2]];
  h1.innerHTML = `<span class="ln lead" data-gl>${NCS.line.lead}</span>` + lines.map((l) => `<span class="ln" data-gl>${l}</span>`).join('');
}
function fitType() {
  buildHeadline();
  const ls = [...h1.querySelectorAll('.ln')];
  const w = h1.parentElement.clientWidth - parseFloat(getComputedStyle(h1.parentElement).paddingLeft) * 2;
  ls.forEach((l) => { l.style.fontSize = '100px'; });
  const ws = ls.map((l) => l.getBoundingClientRect().width);
  const portrait = h1Mode === 'p';
  let sizes;
  if (portrait) sizes = ls.map((l, i) => w / ws[i] * 100);
  else {
    const heavy = w / ws[1] * 100;
    sizes = [Math.min(w / ws[0] * 100, heavy * .42), heavy, heavy];
  }
  const footH = $('.hero-foot').getBoundingClientRect().height;
  const availH = Math.max(120, innerHeight - parseFloat(getComputedStyle($('.hero')).paddingTop) - footH - 36);
  const lh = portrait ? 1.0 : .96;
  h1.style.lineHeight = lh;
  const total = sizes.reduce((a, b) => a + b * lh, 0);
  const k = Math.min(1, availH / total);
  ls.forEach((l, i) => { l.style.fontSize = (sizes[i] * k).toFixed(1) + 'px'; });
  document.querySelectorAll('[data-fit]').forEach((el) => {
    el.style.fontSize = '100px';
    const cw = el.parentElement.clientWidth - parseFloat(getComputedStyle(el.parentElement).paddingLeft) * 2;
    const ew = el.getBoundingClientRect().width;
    el.style.fontSize = Math.min(cw / ew * 100, innerHeight * .24).toFixed(1) + 'px';
  });
}

/* ------------------------------------------------------------------ motion state */
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = prefersReduced.matches && !params.has('motion');
let paused = reduced;
const pauseBtn = $('#pause');
const setPauseUI = () => {
  $('#pauseLabel').textContent = paused ? 'Play motion' : 'Pause motion';
  $('#pauseIcon').setAttribute('d', paused ? 'M2 1l10 6-10 6z' : 'M2 1h3.6v12H2zM8.4 1H12v12H8.4z');
  pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
};
setPauseUI();

/* ------------------------------------------------------------------ WebGL */
const canvas = $('#gl');
const gl = params.has('nogl') ? null : canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance', desynchronized: false });
if (!gl) {
  document.documentElement.classList.add('no-gl');
  document.querySelectorAll('img[data-src]').forEach((i) => { i.src = i.dataset.src; });
  canvas.remove();
  // Hue still follows the page without WebGL.
  document.querySelectorAll('.site').forEach((a) => { a.style.background = a.style.getPropertyValue('--g'); });
  document.fonts.ready.then(fitType); fitType(); addEventListener('resize', fitType);
  pauseBtn.hidden = true;
  return;
}

const compile = (type, src) => {
  const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) + '\n' + src);
  return sh;
};
const program = (vs, fs) => {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); const nm = a.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, a.name); }
  return { p, u };
};

/* Film layout, in half-widths of the strip:
   image 1.52 tall, 2.432 long, frame pitch 2.592, perforations outside. */
const PITCH = 2.592;
const FILM_GLSL = `
const float PITCH = ${PITCH.toFixed(3)};
float perfD(float s, float a){
  float P = PITCH/8.0;
  float ss = mod(s, P) - P*.5;
  vec2 q = abs(vec2(ss, abs(a) - .895)) - vec2(.085, .048) + .024;
  return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - .024;
}`;

const RIBBON_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aUV;
uniform mat4 uVP;
out vec3 vP; out vec3 vN; out vec2 vUV;
void main(){ vP=aP; vN=aN; vUV=aUV; gl_Position=uVP*vec4(aP,1.); }`;

const RIBBON_FS = `#version 300 es
precision highp float; precision highp int; precision highp sampler2DArray;
in vec3 vP; in vec3 vN; in vec2 vUV; out vec4 o;
uniform vec3 uCam, uKey, uG, uSh;
uniform highp sampler2DShadow uSM; uniform mat4 uLVP; uniform float uSelf, uSMsize, uBias;
uniform sampler2DArray uPost; uniform sampler2D uV0, uV1, uV2, uEdge;
uniform int uSlot[8]; uniform vec3 uHue[8];
${FILM_GLSL}
float selfShadow(vec3 P, vec3 N){
  vec4 l = uLVP*vec4(P + N*.02, 1.); vec3 c = l.xyz*.5+.5;
  if(c.x<0.||c.y<0.||c.x>1.||c.y>1.) return 1.;
  float t = 2.2/uSMsize, z = c.z-uBias, r = 0.;
  r += texture(uSM,vec3(c.xy+vec2(-t,-t*.4),z));
  r += texture(uSM,vec3(c.xy+vec2( t*.4,-t),z));
  r += texture(uSM,vec3(c.xy+vec2(-t*.4, t),z));
  r += texture(uSM,vec3(c.xy+vec2( t, t*.4),z));
  return r*.25;
}
void main(){
  float a = vUV.x, s = vUV.y;
  float pd = perfD(s,a), pw = fwidth(pd)*.75 + 1e-4;
  float cov = smoothstep(-pw, pw, pd);
  if(cov < .04) discard;
  bool front = gl_FrontFacing;
  vec3 N = normalize(vN); if(!front) N = -N;
  vec3 V = normalize(uCam - vP);
  float fr = s/PITCH, ff = floor(fr), u = fr-ff;
  int id = int(mod(ff, 8.));
  float x = (u-.5)*PITCH;
  vec2 q = abs(vec2(x, a)) - vec2(1.216, .76) + .05;
  float imgD = length(max(q,0.)) + min(max(q.x,q.y),0.) - .05;
  float iw = fwidth(imgD)*.75 + 1e-4;
  float inImg = 1.-smoothstep(-iw, iw, imgD);
  vec2 uv = vec2(x/2.432 + .5, .5 - a/1.52);
  vec3 hue = uHue[id];
  // film base
  vec3 base = front ? vec3(.022,.022,.03) : hue;
  vec3 col = base;
  vec2 duvx = vec2(dFdx(s)/PITCH*(PITCH/2.432), -dFdx(a)/1.52);
  vec2 duvy = vec2(dFdy(s)/PITCH*(PITCH/2.432), -dFdy(a)/1.52);
  float emit = 0.;
  if(inImg > .001){
    vec3 img;
    if(front){
      int sl = uSlot[id];
      if(sl==0) img = textureGrad(uV0,uv,duvx,duvy).rgb;
      else if(sl==1) img = textureGrad(uV1,uv,duvx,duvy).rgb;
      else if(sl==2) img = textureGrad(uV2,uv,duvx,duvy).rgb;
      else img = textureGrad(uPost,vec3(uv,float(id)),duvx,duvy).rgb;
      emit = inImg;
    } else {
      // read through the back of the film: mirrored, stained with the site's hue
      vec2 m = vec2(1.-uv.x, uv.y);
      float l = dot(textureGrad(uPost,vec3(m,float(id)),duvx,duvy).rgb, vec3(.3,.6,.1));
      img = hue*mix(.62,1.08,l);
    }
    col = mix(col, img, inImg);
  }
  // edge printing, like film stock
  float ae = abs(a);
  if(front && ae > .775 && ae < .835){
    float ev = (ae-.775)/.06;
    float rowv = (float(id)+ (a>0.?1.-ev:ev))/8.;
    float e = textureGrad(uEdge, vec2(u, rowv), vec2(dFdx(s)/PITCH,0.), vec2(dFdy(s)/PITCH,0.)).a;
    col = mix(col, mix(hue,vec3(1.),.25), e);
  }
  // light
  float ndl = dot(N, normalize(uKey));
  float wrap = ndl*.5+.5;
  float sh = uSelf > .5 ? selfShadow(vP, N) : 1.;
  float lit = mix(.34, 1.1, smoothstep(.12,.92,wrap));
  lit = mix(lit*.52, lit, sh);
  vec3 tint = mix(uSh*.55+.18, vec3(1.), smoothstep(.2,.95,lit));
  vec3 C = col * lit * tint;
  if(emit>0.) C = mix(C, col*mix(.52,1.,sh)*mix(.74,1.04,smoothstep(.25,.85,wrap)), emit*.85);
  float nv = max(dot(N,V),0.);
  float F = pow(1.-nv, 3.);
  vec3 R = reflect(-V,N);
  // two softboxes, set off axis so a frame facing camera stays clean
  float box1 = smoothstep(.70,.93, dot(R, normalize(vec3(-.72,.62,.32)))) ;
  float box2 = smoothstep(.86,.97, dot(R, normalize(vec3(.8,-.2,.55))));
  float spec = pow(max(dot(R,normalize(uKey)),0.), 90.);
  float gloss = front ? 1. : .55;
  C += (box1*.5*vec3(1.,.99,.96) + box2*.24*(uG*.6+.4) + spec*.4) * gloss * mix(.35,1.,sh) * mix(1.,.42,emit);
  C += F*(uG*.95+.05)*.95;
  // air: the far run sinks into the ground color
  float fog = smoothstep(-.8,-2.2,vP.z)*.34;
  C = mix(C, uG, fog);
  // the deepest run prints as a ghost in the shadow hue, so letters in front stay clean
  C = mix(C, mix(uSh,uG,.15), smoothstep(-2.1,-2.75,vP.z)*.76);
  o = vec4(C, cov);
}`;

const SHADOW_FS = `#version 300 es
precision highp float;
in vec3 vP; in vec3 vN; in vec2 vUV;
${FILM_GLSL}
void main(){ if(perfD(vUV.y, vUV.x) < 0.) discard; }`;

const FS_TRI = `#version 300 es
out vec2 vNdc;
void main(){ vec2 p = vec2((gl_VertexID==1)?3.:-1., (gl_VertexID==2)?3.:-1.); vNdc=p; gl_Position=vec4(p,1.,1.); }`;

const GROUND_SHADOW_FS = `#version 300 es
precision highp float;
in vec2 vNdc; out vec4 o;
uniform mat4 uIVP, uLVP; uniform vec3 uCam, uPn; uniform float uPd, uPen;
uniform highp sampler2D uSM;
uniform int uTaps;
float ign(vec2 p){ return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715)))); }
void main(){
  vec4 f = uIVP*vec4(vNdc,1.,1.); vec3 ray = normalize(f.xyz/f.w-uCam);
  float t = -(dot(uPn,uCam)+uPd)/dot(uPn,ray);
  vec3 P = uCam+ray*t;
  vec3 c = (uLVP*vec4(P,1.)).xyz*.5+.5;
  if(c.x<0.||c.y<0.||c.x>1.||c.y>1.){ o=vec4(0.); return; }
  float ang = ign(gl_FragCoord.xy)*6.2832;
  float sr = .02, bs=0., bn=0.;
  int n = uTaps;
  for(int i=0;i<n;i++){
    float fi=float(i)+.5, r=sqrt(fi/float(n)), th=fi*2.39996+ang;
    float d=texture(uSM,c.xy+vec2(cos(th),sin(th))*r*sr).r;
    if(d<c.z-.0015){bs+=d;bn+=1.;}
  }
  if(bn<.5){ o=vec4(0.); return; }
  float pen = clamp((c.z-bs/bn)*uPen,.0028,.024);
  float lit=0.;
  for(int i=0;i<n;i++){
    float fi=float(i)+.5, r=sqrt(fi/float(n)), th=fi*2.39996+ang;
    float d=texture(uSM,c.xy+vec2(cos(th),sin(th))*r*pen).r;
    lit+=step(c.z-.0015,d);
  }
  o=vec4(1.-lit/float(n),0.,0.,1.);
}`;

const GROUND_FS = `#version 300 es
precision highp float;
in vec2 vNdc; out vec4 o;
uniform sampler2D uShade; uniform vec2 uTexel;
uniform vec3 uGa,uGb,uSa,uSb; uniform float uWipe, uTime, uAspect;
float ign(vec2 p){ return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715)))); }
void main(){
  vec2 uv=vNdc*.5+.5;
  float s=0.;
  s+=texture(uShade,uv+uTexel*vec2(-1.3,-.7)).r;
  s+=texture(uShade,uv+uTexel*vec2(1.3,-.7)).r;
  s+=texture(uShade,uv+uTexel*vec2(-.7,1.3)).r;
  s+=texture(uShade,uv+uTexel*vec2(.7,1.3)).r;
  s*=.25;
  // the new hue arrives as a wave front, bending like the film
  float edge = mix(1.75,-1.75,uWipe);
  float bend = .28*sin(vNdc.y*2.1+uWipe*5.)+.1*sin(vNdc.y*5.3-uWipe*7.);
  float m = smoothstep(edge-.16, edge+.16, vNdc.x*1.+bend);
  vec3 g=mix(uGa,uGb,m), sh=mix(uSa,uSb,m);
  // bright crest riding the wave front
  float crest = exp(-pow((vNdc.x+bend-edge)/.13,2.))*step(.001,uWipe)*step(uWipe,.999);
  g = g + crest*.12;
  vec3 col = mix(g,sh,s*.96);
  // a broad lighting falloff in the same hue family
  float fall = dot(vNdc,vec2(-.26,.42));
  col *= 1.+fall*.05;
  col += (ign(gl_FragCoord.xy)-.5)/255.;
  o=vec4(col,1.);
}`;

const BLUR_FS = `#version 300 es
precision mediump float;
in vec2 vNdc; out vec4 o; uniform sampler2D uT; uniform vec2 uD;
void main(){ vec2 uv=vNdc*.5+.5;
  float s=texture(uT,uv).r*.227;
  s+=(texture(uT,uv+uD*1.385).r+texture(uT,uv-uD*1.385).r)*.316;
  s+=(texture(uT,uv+uD*3.231).r+texture(uT,uv-uD*3.231).r)*.0703;
  o=vec4(s,0.,0.,1.); }`;

const TYPE_VS = `#version 300 es
uniform vec4 uRect; uniform vec4 uZ; uniform mat4 uW; uniform mat4 uLVP; uniform float uMode;
out vec2 vUV; out vec3 vWP;
void main(){
  vec2 c = vec2(gl_VertexID==1||gl_VertexID==3?1.:0., gl_VertexID>=2?1.:0.);
  vUV = c;
  // corners: 0 tl,1 tr,2 bl,3 br
  int id = gl_VertexID;
  vec3 w = uW[id].xyz; vWP = w;
  if(uMode>.5){ gl_Position = uLVP*vec4(w,1.); return; }
  vec2 p = mix(uRect.xy, uRect.zw, c);
  gl_Position = vec4(p, uZ[id], 1.);
}`;

const TYPE_FS = `#version 300 es
precision highp float;
in vec2 vUV; in vec3 vWP; out vec4 o;
uniform sampler2D uT; uniform vec3 uInk, uSh; uniform float uA, uSelf, uBias, uSMsize;
uniform highp sampler2DShadow uSM; uniform mat4 uLVP;
uniform sampler2D uShade; uniform vec2 uRes; uniform vec3 uGa,uGb,uSa,uSb; uniform float uWipe;
void main(){
  vec4 tx = texture(uT,vUV);
  float a = tx.a;
  if(a<.003) discard;
  vec3 ink = uInk;
  // The halo is painted the exact ground color, so it disappears on the ground and
  // only shows where the film runs behind a letter: a clean cut-out edge.
  vec2 ndc = gl_FragCoord.xy/uRes*2.-1.;
  float edge = mix(1.75,-1.75,uWipe);
  float bend = .28*sin(ndc.y*2.1+uWipe*5.)+.1*sin(ndc.y*5.3-uWipe*7.);
  float m = smoothstep(edge-.16, edge+.16, ndc.x+bend);
  vec3 halo = mix(mix(uGa,uGb,m),mix(uSa,uSb,m),texture(uShade,gl_FragCoord.xy/uRes).r*.96);
  if(uSelf>.5){
    vec3 c = (uLVP*vec4(vWP+vec3(0.,0.,.01),1.)).xyz*.5+.5;
    float t=2.5/uSMsize, z=c.z-uBias, r=0.;
    r+=texture(uSM,vec3(c.xy+vec2(-t,-t),z));
    r+=texture(uSM,vec3(c.xy+vec2(t,-t),z));
    r+=texture(uSM,vec3(c.xy+vec2(-t,t),z));
    r+=texture(uSM,vec3(c.xy+vec2(t,t),z));
    ink = mix(ink*.8+uSh*.2, ink, r*.25);
  }
  float f = smoothstep(.25,.75,tx.r);
  float A=a*uA;
  o=vec4(mix(halo,ink,f)*A,A);
}`;

const TYPE_SHADOW_FS = `#version 300 es
precision highp float;
in vec2 vUV; in vec3 vWP; uniform sampler2D uT; uniform float uA;
void main(){ if(texture(uT,vUV).a*uA<.5) discard; }`;

const pRibbon = program(RIBBON_VS, RIBBON_FS);
const pShadow = program(RIBBON_VS, SHADOW_FS);
const pGroundS = program(FS_TRI, GROUND_SHADOW_FS);
const pGround = program(FS_TRI, GROUND_FS);
const pBlur = program(FS_TRI, BLUR_FS);
const pType = program(TYPE_VS, TYPE_FS);
const pTypeS = program(TYPE_VS, TYPE_SHADOW_FS);
const emptyVAO = gl.createVertexArray();
const smCmp = gl.createSampler();
gl.samplerParameteri(smCmp, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
gl.samplerParameteri(smCmp, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
gl.samplerParameteri(smCmp, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.samplerParameteri(smCmp, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.samplerParameteri(smCmp, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.samplerParameteri(smCmp, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

/* ------------------------------------------------------------------ quality */
const TIERS = [
  { dpr: 2,    sm: 1536, groundDiv: 2, taps: 16, rows: 460, cols: 4, vids: 3, self: 1, sim: 1, post: 640 },
  { dpr: 1.6,  sm: 1024, groundDiv: 3, taps: 12, rows: 340, cols: 3, vids: 3, self: 1, sim: 1, post: 560 },
  { dpr: 1.3,  sm: 768,  groundDiv: 4, taps: 10, rows: 240, cols: 2, vids: 2, self: 0, sim: 1, post: 448 },
  { dpr: 1,    sm: 512,  groundDiv: 5, taps: 8,  rows: 170, cols: 1, vids: 1, self: 0, sim: 0, post: 448 },
];
const isPhone = /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 900);
let tier = params.has('q') ? +params.get('q') : (isPhone ? 2 : 0);
if (!isPhone && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) tier = Math.max(tier, 1);
let Q = TIERS[tier];

/* ------------------------------------------------------------------ textures */
const tex2D = (filter = gl.LINEAR) => {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
};
const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
const applyAniso = (target) => { if (aniso) gl.texParameterf(target, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(tier < 2 ? 8 : 4, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); };

// Poster array: one layer per site, always resident.
const PW = Q.post, PH = Math.round(PW * 700 / 1120);
const postTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D_ARRAY, postTex);
gl.texStorage3D(gl.TEXTURE_2D_ARRAY, Math.floor(Math.log2(PW)) + 1, gl.RGBA8, PW, PH, 8);
gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
applyAniso(gl.TEXTURE_2D_ARRAY);
// Until a poster arrives, a layer holds the site's paper color.
{
  const c0 = document.createElement('canvas'); c0.width = PW; c0.height = PH; const x0 = c0.getContext('2d', { willReadFrequently: true });
  NCS.sites.forEach((s, i) => {
    x0.fillStyle = s.paper; x0.fillRect(0, 0, PW, PH);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, PW, PH, 1, gl.RGBA, gl.UNSIGNED_BYTE, c0);
  });
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  let pending = NCS.sites.length;
  NCS.sites.forEach((s, i) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => {
      x0.drawImage(im, 0, 0, PW, PH);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, postTex);
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, PW, PH, 1, gl.RGBA, gl.UNSIGNED_BYTE, c0);
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      if (--pending === 0) state.postersReady = true;
      dirty = true;
    };
    im.src = s.poster;
  });
}

// Edge printing atlas
const edgeTex = tex2D(gl.LINEAR_MIPMAP_LINEAR);
function buildEdge() {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 512; const x = c.getContext('2d');
  x.textBaseline = 'middle'; x.fillStyle = '#fff';
  NCS.sites.forEach((s, i) => {
    x.font = '500 40px "DM Mono", monospace';
    const y = i * 64 + 32;
    x.textAlign = 'left';
    x.fillText(`${pad2(i + 1)}A  ${s.name.toUpperCase()}`, 70, y);
    x.textAlign = 'right';
    x.fillText(`${s.host.toUpperCase()}  ${s.sector.toUpperCase()}`, 1980, y);
    x.fillRect(4, y - 2, 40, 4);
  });
  gl.bindTexture(gl.TEXTURE_2D, edgeTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  applyAniso(gl.TEXTURE_2D);
}

// Live video slots: at most three decoders, assigned to whatever is nearest the front.
const slots = [];
for (let i = 0; i < 3; i++) {
  const t = tex2D(gl.LINEAR_MIPMAP_LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  const v = document.createElement('video');
  v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto';
  v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
  v.style.cssText = 'position:fixed;width:2px;height:2px;left:-9px;top:0;opacity:0;pointer-events:none';
  document.body.appendChild(v);
  const slot = { v, t, site: -1, ready: false, fresh: false, uploads: 0 };
  const hook = () => {
    slot.fresh = true;
    if (slot.v.requestVideoFrameCallback) slot.v.requestVideoFrameCallback(hook);
  };
  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(hook);
  slots.push(slot);
}
const assignVideo = (slot, site) => {
  slot.site = site; slot.ready = false; slot.fresh = false;
  if (site < 0) { slot.v.pause(); slot.v.removeAttribute('src'); slot.v.load(); return; }
  slot.v.src = NCS.sites[site].video;
  if (!paused) slot.v.play().catch(() => {});
  else slot.v.load();
};
let lastAssign = 0;
function scheduleVideos(q, now) {
  if (reduced) return;
  if (now - lastAssign < 180) return;
  lastAssign = now;
  const center = Math.round(q);
  const wanted = [];
  const order = [0, 1, -1];
  for (let i = 0; i < Q.vids; i++) wanted.push(((center + order[i]) % 8 + 8) % 8);
  // Keep slots already on a wanted site; reassign the rest.
  const free = [];
  slots.forEach((sl, i) => {
    if (i >= Q.vids) { if (sl.site !== -1) assignVideo(sl, -1); return; }
    if (!wanted.includes(sl.site)) free.push(sl);
  });
  wanted.forEach((w) => {
    if (slots.slice(0, Q.vids).some((sl) => sl.site === w)) return;
    const sl = free.shift(); if (sl) assignVideo(sl, w);
  });
}
function uploadVideos() {
  let budget = tier >= 2 ? 1 : 3;
  for (const sl of slots) {
    if (sl.site < 0 || budget <= 0) continue;
    const v = sl.v;
    if (v.readyState < 2) continue;
    if (!sl.ready || sl.fresh || !v.requestVideoFrameCallback) {
      gl.bindTexture(gl.TEXTURE_2D, sl.t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
      gl.generateMipmap(gl.TEXTURE_2D);
      sl.ready = true; sl.fresh = false; sl.uploads++; budget--;
    }
  }
}

/* ------------------------------------------------------------------ type in the scene */
const typeItems = [];
const stretchKw = (st) => { const n = parseFloat(st); if (n <= 62.5) return 'extra-condensed'; if (n <= 75) return 'condensed'; if (n <= 87.5) return 'semi-condensed'; if (n >= 125) return 'expanded'; return 'normal'; };
function wrapWords(el) {
  if (el.dataset.wrapped === el.textContent) return;
  const txt = el.textContent;
  el.innerHTML = txt.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
  el.dataset.wrapped = el.textContent;
}
function rasterItem(it) {
  const el = it.el; wrapWords(el);
  const words = [...el.querySelectorAll('.w')];
  const er = el.getBoundingClientRect();
  const cs = getComputedStyle(words[0]);
  const scale = Math.min(2, Math.max(1.5, devicePixelRatio || 1)) * (tier >= 2 ? .9 : 1);
  const rects = words.map((w) => w.getBoundingClientRect());
  const pad = parseFloat(cs.fontSize) * .14;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  rects.forEach((r) => { x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); });
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const W = Math.ceil((x1 - x0) * scale), H = Math.ceil((y1 - y0) * scale);
  const c = document.createElement('canvas'); c.width = Math.max(4, W); c.height = Math.max(4, H);
  const x = c.getContext('2d');
  const font = `${cs.fontStyle === 'italic' ? 'italic ' : ''}${cs.fontWeight} ${stretchKw(cs.fontStretch)} ${parseFloat(cs.fontSize)}px ${cs.fontFamily}`;
  x.scale(scale, scale);
  x.font = font; x.textBaseline = 'alphabetic'; x.lineJoin = 'round'; x.miterLimit = 2;
  if ('letterSpacing' in x && cs.letterSpacing !== 'normal') x.letterSpacing = cs.letterSpacing;
  if ('fontKerning' in x) x.fontKerning = 'normal';
  const m = x.measureText('Hg');
  const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
  const place = (fn) => words.forEach((w, i) => {
    const r = rects[i];
    fn(w.textContent, r.left - x0, r.top + (r.height - (asc + desc)) / 2 + asc - y0);
  });
  x.strokeStyle = '#000'; x.lineWidth = Math.max(3, parseFloat(cs.fontSize) * .028);
  place((t, a, b) => x.strokeText(t, a, b));
  x.fillStyle = '#f00';
  place((t, a, b) => x.fillText(t, a, b));
  if (!it.tex) it.tex = tex2D(gl.LINEAR_MIPMAP_LINEAR);
  gl.bindTexture(gl.TEXTURE_2D, it.tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.generateMipmap(gl.TEXTURE_2D);
  it.ox = x0 - er.left; it.oy = y0 - er.top; it.w = x1 - x0; it.h = y1 - y0;
  it.ok = true;
}
function collectType() {
  typeItems.length = 0;
  document.querySelectorAll('[data-gl]').forEach((el) => {
    const site = el.closest('.site');
    const sec = el.closest('section');
    const pal = site ? SITE_PAL[+site.dataset.i] : (sec.id === 'top' ? PAL.hero : sec.id === 'prices' ? PAL.prices : PAL.start);
    typeItems.push({ el, tex: null, ok: false, site: site ? +site.dataset.i : -1, ink: hex(pal.ink), sh: hex(pal.s), alpha: 1 });
  });
}

/* ------------------------------------------------------------------ the path
   Control points are authored in screen-relative units: x in half-widths,
   y in half-heights, z in world units. Index 5 is the "front station": the frame
   centered there always faces camera with its image upright. */
const STATION = 5;
const SETS_L = {
  hero: { W: .84, pts: [
    [-1.8, 1.25, -2.2, 0], [-1.25, 1.02, -1.9, 0], [-.62, .92, -1.7, .4], [-.15, .5, -1.3, 1.25], [.25, -.1, -.75, .55],
    [.66, -.2, -.45, 0], [1.1, -.16, -.5, 0], [1.42, .25, -.7, -.7], [1.12, .86, -1.2, -1.8], [.35, .78, -1.7, -3.1],
    [-.45, .3, -2.3, -3.8], [-1.02, -.3, -1.7, -4.4], [-1.05, -.78, -.1, -5.0], [-.42, -.88, .55, -5.7], [.32, -1.0, 1.25, -6.28], [1.05, -1.5, 2.6, -6.28]] },  a: { W: .92, pts: [
    [-1.9, 1.75, -1.6, 2.2], [-1.3, 1.42, -1.1, 1.5], [-.82, 1.05, -.2, .85], [-.34, .62, .75, .28], [.02, .3, 1.05, 0],
    [.42, .28, 1.12, 0], [.82, .3, 1.05, 0], [1.2, .28, .35, -.5], [1.32, .86, -.85, -1.3], [.82, 1.36, -1.9, -2.3],
    [.0, 1.2, -2.6, -3.14], [-1.05, .05, -2.75, -3.8], [-.55, -.6, -2.9, -4.6], [.3, -.74, -2.4, -5.3], [1.08, -1.02, .7, -5.9], [1.5, -1.6, 3.1, -6.28]] },
  b: { W: .92, pts: [
    [-1.8, -1.7, 3.2, 6.28], [-1.32, -1.12, 1.6, 5.4], [-1.28, -.42, 1.08, 3.7], [-1.14, .16, .95, 1.8], [-.82, .3, 1.05, 0],
    [-.42, .28, 1.12, 0], [-.06, .32, 1.02, 0], [.2, .8, .3, -.8], [.5, 1.42, -.8, -1.7], [1.2, 1.5, -1.8, -2.6],
    [1.36, .1, -2.95, -3.14], [.72, -.58, -3.0, -3.8], [-.2, -.72, -2.85, -4.6], [-1.0, -.1, -2.3, -5.3], [-1.5, .5, -1.6, -5.9], [-1.9, .9, -.8, -6.28]] },
  prices: { W: .74, pts: [
    [-1.9, .75, -2.6, 0], [-1.35, .9, -2.3, 0], [-.8, 1.0, -1.9, .3], [-.3, .78, -1.6, .1], [.1, .7, -1.3, 0],
    [.5, .68, -1.15, 0], [.92, .6, -1.3, 0], [1.22, .3, -1.5, -.9], [1.12, -.4, -1.6, -2.0], [.62, -.9, -2.1, -3.14],
    [-.1, -.5, -2.6, -3.9], [-.82, -.86, -2.4, -4.6], [-1.15, -.3, -2.0, -5.3], [-1.4, .15, -1.4, -5.9], [-1.65, .6, -.9, -6.28], [-1.95, 1.0, -.4, -6.28]] },  say: { W: .9, pts: [
    [-1.9, -1.4, -.8, 0], [-1.3, -1.25, -1.2, .4], [-.82, -1.16, -1.6, .9], [-.3, -1.06, -1.0, .4], [.08, -1.02, -.4, 0],
    [.5, -1.04, -.2, 0], [.92, -.98, -.4, 0], [1.2, -.46, -1.2, -1.0], [1.14, .4, -1.9, -2.1], [.72, 1.05, -2.4, -3.14],
    [.0, 1.22, -2.6, -3.9], [-.72, 1.04, -2.4, -4.6], [-1.16, .4, -2.0, -5.3], [-1.26, -.3, -1.4, -5.9], [-1.5, -.9, -.6, -6.28], [-1.95, -1.3, 0, -6.28]] },
  start: { W: .62, pts: [
    [-1.85, 1.2, -2.2, 0], [-1.25, .86, -1.8, .3], [-.62, .7, -1.6, .7], [-.08, .36, -1.0, 1.3], [.26, -.2, .55, .4],
    [.64, -.5, .9, 0], [1.02, -.5, .85, 0], [1.3, -.05, .25, -.8], [1.02, .62, .42, -1.9], [.45, .9, -1.2, -3.14],
    [-.3, .4, -2.5, -3.9], [-.96, -.2, -2.2, -4.6], [-1.1, -.86, -.8, -5.3], [-.44, -1.12, .7, -5.9], [.34, -1.32, 2.2, -6.28], [1.0, -1.8, 3.6, -6.28]] },};
const SETS_P = {
  hero: { W: .46, pts: [
    [-2.4, 1.0, -2.0, 0], [-1.5, .92, -1.7, 0], [-.6, .95, -1.5, .5], [.4, .62, -1.3, 1.3], [.5, .12, -1.0, .7],
    [.05, -.18, -.5, 0], [.8, -.2, -.5, 0], [1.6, 0, -.8, -.7], [1.5, .42, -1.2, -1.8], [.5, .66, -1.8, -3.1],
    [-.6, .32, -2.4, -3.8], [-1.5, -.15, -1.7, -4.4], [-1.5, -.62, -.3, -5.0], [-.7, -.62, .3, -5.7], [.4, -.6, .6, -6.28], [1.9, -.86, 1.1, -6.28]] },
  a: { W: .57, pts: [
    [-3.0, 1.1, -1.6, 2.2], [-2.3, 1.08, -1.0, 1.5], [-1.6, .98, -.1, .85], [-1.0, .66, .9, .28], [-.62, .54, 1.05, 0],
    [0, .5, 1.12, 0], [.62, .54, 1.05, 0], [1.25, .5, .35, -.5], [1.7, .92, -.85, -1.3], [1.05, 1.14, -1.9, -2.3],
    [.0, 1.02, -2.6, -3.14], [-1.2, .96, -2.75, -3.8], [-1.75, .4, -2.9, -4.6], [-1.3, .06, -2.3, -5.3], [-2.0, -.3, -1.0, -5.9], [-2.8, -.8, .6, -6.28]] },
  b: { W: .57, pts: [
    [-3.0, .4, 2.0, 2.2], [-2.3, .5, 1.4, 1.5], [-1.7, .56, 1.1, .85], [-1.15, .58, 1.02, .28], [-.62, .52, 1.05, 0],
    [0, .5, 1.12, 0], [.62, .52, 1.05, 0], [1.25, .62, .35, -.5], [1.9, 1.05, -.85, -1.3], [1.05, 1.22, -1.9, -2.3],
    [.0, .96, -2.6, -3.14], [1.1, .3, -2.75, -3.8], [1.8, .05, -2.9, -4.6], [2.1, .35, -2.3, -5.3], [2.4, .8, -1.0, -5.9], [2.9, 1.2, .6, -6.28]] },
  prices: { W: .5, pts: [
    [-3, 1.1, -1.4, 0], [-2, 1.05, -1, 0], [-1.3, .98, -.1, .3], [-.8, .9, .3, .1], [-.4, .82, .4, 0],
    [.1, .8, .5, 0], [.6, .82, .4, 0], [1.3, .7, -.3, -.9], [1.7, .1, -1.3, -2.0], [.9, -.5, -2.1, -3.14],
    [-.3, -.2, -2.6, -3.9], [-1.5, -.6, -2.4, -4.6], [-1.8, -.1, -2.0, -5.3], [-2.2, .3, -1.4, -5.9], [-2.6, .7, -.9, -6.28], [-3, 1, -.4, -6.28]] },
  say: { W: .55, pts: [
    [-3, -1.25, -.8, 0], [-2, -1.15, -1.2, .4], [-1.3, -1.05, -1.6, .9], [-.8, -.98, -1.0, .4], [-.4, -.95, -.4, 0],
    [.1, -.93, -.2, 0], [.6, -.95, -.4, 0], [1.3, -.5, -1.2, -1.0], [1.6, .4, -1.9, -2.1], [1.0, 1.0, -2.4, -3.14],
    [.0, 1.06, -2.6, -3.9], [-1.0, .9, -2.4, -4.6], [-1.6, .4, -2.0, -5.3], [-1.8, -.3, -1.4, -5.9], [-2.2, -.8, -.6, -6.28], [-3, -1.2, 0, -6.28]] },
  start: { W: .46, pts: [
    [-3, 1.15, -2.2, 0], [-2, .9, -1.8, .3], [-1.3, .6, -1.2, .7], [-.9, .4, -.2, .3], [-.5, .3, .5, 0],
    [.1, .28, .75, 0], [.7, .3, .6, 0], [1.5, .3, -.1, -.8], [1.6, .04, -1.2, -1.9], [.6, -.02, -2.0, -3.14],
    [-.4, .06, -2.5, -3.9], [-1.4, -.2, -2.2, -4.6], [-1.6, -.86, -.8, -5.3], [-.6, -1.1, .3, -5.9], [.5, -1.3, 1.0, -6.28], [1.4, -1.6, 2.0, -6.28]] },
};

/* ------------------------------------------------------------------ math */
const FOV = 38 * Math.PI / 180, VH = 2, D = VH / Math.tan(FOV / 2);
const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lookAt = (e, t, u) => {
  const z = norm([e[0] - t[0], e[1] - t[1], e[2] - t[2]]), x = norm(cross(u, z)), y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]);
};
const persp = (f, asp, n, fr) => { const t = 1 / Math.tan(f / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (fr + n) / (n - fr), -1, 0, 0, 2 * fr * n / (n - fr), 0]); };
const ortho = (x, y, n, fr) => new Float32Array([1 / x, 0, 0, 0, 0, 1 / y, 0, 0, 0, 0, -2 / (fr - n), 0, 0, 0, -(fr + n) / (fr - n), 1]);
const invert = (m) => {
  const a = m, b = new Float32Array(16);
  const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
  const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
  const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
  b[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d; b[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d; b[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d; b[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d;
  b[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d; b[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d; b[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d; b[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d;
  b[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d; b[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d; b[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d; b[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d;
  b[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d; b[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d; b[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d; b[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d;
  return b;
};
const xform = (m, v) => { const w = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15]; return [(m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12]) / w, (m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13]) / w, (m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]) / w]; };
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/* ------------------------------------------------------------------ mesh + sim */
let ROWS, COLS, verts, vBuf, iBuf, vao, indexCount, X, Y, Z, TW, TX, TY, TZ, BX, BY, BZ, NX, NY, NZ, SS, LL;
let dx, dy, dz, dr, vx, vy, vz, vr;
const FINE_SUB = 40, FINE = 15 * FINE_SUB + 1;
const fx = new Float32Array(FINE), fy = new Float32Array(FINE), fz = new Float32Array(FINE), ft = new Float32Array(FINE), fl = new Float32Array(FINE);
function buildMesh() {
  ROWS = Q.rows + 1; COLS = Q.cols + 1;
  const F = Float32Array;
  X = new F(ROWS); Y = new F(ROWS); Z = new F(ROWS); TW = new F(ROWS); TX = new F(ROWS); TY = new F(ROWS); TZ = new F(ROWS);
  BX = new F(ROWS); BY = new F(ROWS); BZ = new F(ROWS); NX = new F(ROWS); NY = new F(ROWS); NZ = new F(ROWS); SS = new F(ROWS); LL = new F(ROWS);
  dx = new F(ROWS); dy = new F(ROWS); dz = new F(ROWS); dr = new F(ROWS); vx = new F(ROWS); vy = new F(ROWS); vz = new F(ROWS); vr = new F(ROWS);
  verts = new F(ROWS * COLS * 8);
  if (vao) { gl.deleteVertexArray(vao); gl.deleteBuffer(vBuf); gl.deleteBuffer(iBuf); }
  vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  vBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vBuf); gl.bufferData(gl.ARRAY_BUFFER, verts.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
  const idx = new Uint32Array((ROWS - 1) * (COLS - 1) * 6);
  let k = 0;
  for (let i = 0; i < ROWS - 1; i++) for (let j = 0; j < COLS - 1; j++) {
    const a = i * COLS + j, b = (i + 1) * COLS + j, c = i * COLS + j + 1, d = (i + 1) * COLS + j + 1;
    idx[k++] = a; idx[k++] = b; idx[k++] = c; idx[k++] = c; idx[k++] = b; idx[k++] = d;
  }
  iBuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  indexCount = idx.length;
  gl.bindVertexArray(null);
}

const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
const cps = new Float32Array(16 * 4);
function evalPath(hw) {
  // Sample the Catmull-Rom densely, measure arc length.
  let n = 0, total = 0;
  for (let s = 0; s < 15; s++) {
    const a = Math.max(0, s - 1) * 4, b = s * 4, c = (s + 1) * 4, d = Math.min(15, s + 2) * 4;
    const last = s === 14 ? FINE_SUB + 1 : FINE_SUB;
    for (let k = 0; k < last; k++) {
      const t = k / FINE_SUB;
      const x = cr(cps[a], cps[b], cps[c], cps[d], t) * hw;
      const y = cr(cps[a + 1], cps[b + 1], cps[c + 1], cps[d + 1], t) * VH;
      const z = cr(cps[a + 2], cps[b + 2], cps[c + 2], cps[d + 2], t);
      const w = cr(cps[a + 3], cps[b + 3], cps[c + 3], cps[d + 3], t);
      if (n) total += Math.hypot(x - fx[n - 1], y - fy[n - 1], z - fz[n - 1]);
      fx[n] = x; fy[n] = y; fz[n] = z; ft[n] = w; fl[n] = total; n++;
    }
  }
  const Lst = fl[STATION * FINE_SUB];
  const ds = total / (ROWS - 1);
  let j = 0;
  for (let i = 0; i < ROWS; i++) {
    const L = i * ds;
    while (j < FINE - 2 && fl[j + 1] < L) j++;
    const u = Math.min(1, Math.max(0, (L - fl[j]) / Math.max(1e-5, fl[j + 1] - fl[j])));
    X[i] = lerp(fx[j], fx[j + 1], u); Y[i] = lerp(fy[j], fy[j + 1], u); Z[i] = lerp(fz[j], fz[j + 1], u); TW[i] = lerp(ft[j], ft[j + 1], u);
    LL[i] = L - Lst;
  }
  return { Lst, ds };
}

const state = { y: 0, vy: 0, p: 0, q: 0, creep: 0, wipe: 0, a: 0, b: 0, flutter: 0, postersReady: false };
const ptr = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, active: 0, px: 0, py: 0 };
let time = 0, dirty = true;

function simulate(dt, hw) {
  const R = ROWS, C2 = .24, K = .018, DAMP = .955;
  const scale = (R - 1) / 460; // keep wave speed similar across mesh densities
  const c2 = Math.min(.45, C2 * scale * scale + .05);
  const pxw = ptr.x * hw, pyw = ptr.y * VH;
  const pow = ptr.active;
  const pvx = ptr.vx, pvy = ptr.vy;
  for (let i = 1; i < R - 1; i++) {
    const persp = D / Math.max(.4, D - Z[i]);
    const sx = X[i] * persp, sy = Y[i] * persp;
    const ddx = sx - pxw, ddy = sy - pyw;
    const dd = ddx * ddx + ddy * ddy;
    const f = Math.exp(-dd / 2.4) * pow;
    let ax = c2 * (dx[i - 1] + dx[i + 1] - 2 * dx[i]) - K * dx[i];
    let ay = c2 * (dy[i - 1] + dy[i + 1] - 2 * dy[i]) - K * dy[i];
    let az = c2 * (dz[i - 1] + dz[i + 1] - 2 * dz[i]) - K * dz[i];
    let ar = c2 * (dr[i - 1] + dr[i + 1] - 2 * dr[i]) - K * dr[i];
    if (f > .002) {
      // A moving pointer drags the band with it and presses it back in depth.
      ax += f * (pvx * .17 - ddx * .006);
      ay += f * (pvy * .17 - ddy * .006);
      az += f * (-.008 - Math.hypot(pvx, pvy) * .05);
      ar += f * (pvx * .12 - pvy * .07);
    }
    vx[i] = (vx[i] + ax) * DAMP; vy[i] = (vy[i] + ay) * DAMP; vz[i] = (vz[i] + az) * DAMP; vr[i] = (vr[i] + ar) * DAMP;
  }
  for (let i = 1; i < R - 1; i++) { dx[i] += vx[i]; dy[i] += vy[i]; dz[i] += vz[i]; dr[i] += vr[i]; }
}

function buildVerts(filmOff, W, t) {
  const { Lst, ds } = lastPath;
  const R = ROWS;
  for (let i = 0; i < R; i++) { X[i] += dx[i]; Y[i] += dy[i]; Z[i] += dz[i]; }
  for (let i = 0; i < R; i++) {
    const a = Math.max(0, i - 1), b = Math.min(R - 1, i + 1);
    const x = X[b] - X[a], y = Y[b] - Y[a], z = Z[b] - Z[a], l = Math.hypot(x, y, z) || 1;
    TX[i] = x / l; TY[i] = y / l; TZ[i] = z / l;
  }
  // Parallel transport outward from the station, so the frame there faces camera
  // and the twists elsewhere stay stable while the path morphs.
  const st = Math.max(1, Math.min(R - 2, Math.round(Lst / ds)));
  { let bx = -TY[st], by = TX[st], bz = 0; const l = Math.hypot(bx, by) || 1; BX[st] = bx / l; BY[st] = by / l; BZ[st] = bz; }
  const pt = (from, i) => {
    const d = BX[from] * TX[i] + BY[from] * TY[i] + BZ[from] * TZ[i];
    let bx = BX[from] - d * TX[i], by = BY[from] - d * TY[i], bz = BZ[from] - d * TZ[i];
    const l = Math.hypot(bx, by, bz) || 1; BX[i] = bx / l; BY[i] = by / l; BZ[i] = bz / l;
  };
  for (let i = st + 1; i < R; i++) pt(i - 1, i);
  for (let i = st - 1; i >= 0; i--) pt(i + 1, i);
  const tw0 = TW[st] + dr[st];
  let v = 0;
  const COLSm = COLS - 1;
  for (let i = 0; i < R; i++) {
    const tx = TX[i], ty = TY[i], tz = TZ[i];
    let bx = BX[i], by = BY[i], bz = BZ[i];
    let nx = ty * bz - tz * by, ny = tz * bx - tx * bz, nz = tx * by - ty * bx;
    const th = TW[i] + dr[i] - tw0;
    if (Math.abs(th) > 1e-4) {
      const c = Math.cos(th), s = Math.sin(th);
      const b2x = bx * c + nx * s, b2y = by * c + ny * s, b2z = bz * c + nz * s;
      nx = nx * c - bx * s; ny = ny * c - by * s; nz = nz * c - bz * s;
      bx = b2x; by = b2y; bz = b2z;
    }
    const L = LL[i];
    const away = sstep(1.6 * W, 4.2 * W, Math.abs(L));
    const bowA = (.16 * away + .04 * state.flutter) * W * Math.sin(L * .62 / W + t * .32);
    const ripA = (.05 * away + .05 * state.flutter) * W;
    const ph = L * 2.6 / W - t * 1.7;
    const s = L / W + filmOff;
    const px = X[i], py = Y[i], pz = Z[i];
    for (let j = 0; j < COLS; j++) {
      const a = COLSm > 0 ? (j / COLSm) * 2 - 1 : (j ? 1 : -1);
      const off = bowA * (a * a - .4) + ripA * Math.sin(ph + a * 1.5);
      verts[v++] = px + bx * a * W + nx * off;
      verts[v++] = py + by * a * W + ny * off;
      verts[v++] = pz + bz * a * W + nz * off;
      const db = 2 * a * bowA / W + ripA * 1.5 * Math.cos(ph + a * 1.5) / W;
      const dl = ripA * 2.6 / W * Math.cos(ph + a * 1.5);
      let mx = nx - bx * db - tx * dl, my = ny - by * db - ty * dl, mz = nz - bz * db - tz * dl;
      const ml = Math.hypot(mx, my, mz) || 1;
      verts[v++] = mx / ml; verts[v++] = my / ml; verts[v++] = mz / ml;
      verts[v++] = a; verts[v++] = s;
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
}

/* ------------------------------------------------------------------ frame buffers */
let smTex, smFb, smSize = 0, shadeTex, shadeFb, shade2Tex, shade2Fb, shadeW = 0, shadeH = 0;
function buildShadowMap() {
  smSize = Q.sm;
  if (smTex) { gl.deleteTexture(smTex); gl.deleteFramebuffer(smFb); }
  smTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, smTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, smSize, smSize);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  smFb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, smFb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, smTex, 0);
  gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function buildShade(w, h) {
  const sw = Math.max(32, Math.round(w / Q.groundDiv)), sh = Math.max(32, Math.round(h / Q.groundDiv));
  if (sw === shadeW && sh === shadeH) return;
  shadeW = sw; shadeH = sh;
  if (shadeTex) { gl.deleteTexture(shadeTex); gl.deleteFramebuffer(shadeFb); gl.deleteTexture(shade2Tex); gl.deleteFramebuffer(shade2Fb); }
  shadeTex = tex2D(gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, sw, sh, 0, gl.RED, gl.UNSIGNED_BYTE, null);
  shadeFb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, shadeFb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadeTex, 0);
  shade2Tex = tex2D(gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, sw, sh, 0, gl.RED, gl.UNSIGNED_BYTE, null);
  shade2Fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, shade2Fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shade2Tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

/* ------------------------------------------------------------------ layout */
let stops = [], vw = 1, vh = 1, sW = 1, sH = 1, resScale = 1, portrait = false, rideH = 1, rideY0 = 0;
function resize(full) {
  vw = innerWidth; vh = canvas.clientHeight || innerHeight;
  portrait = vw / vh < 1;
  const dpr = Math.min(devicePixelRatio || 1, Q.dpr) * resScale;
  const w = Math.round(vw * dpr), h = Math.round(vh * dpr);
  if (w !== sW || h !== sH) { canvas.width = sW = w; canvas.height = sH = h; }
  buildShade(sW, sH);
  dirty = true;
}
function measure() {
  const y = scrollY;
  const top = (el) => el.getBoundingClientRect().top + y;
  const sets = portrait ? SETS_P : SETS_L;
  const secStop = (el, set, pal, q) => {
    const r = el.getBoundingClientRect();
    const c = r.top + y + Math.max(0, (r.height - innerHeight) / 2);
    return { y: c, set: sets[set], pal, q, creep: 1, side: 0 };
  };
  stops = [{ y: 0, set: sets.hero, pal: PAL.hero, q: -1, creep: 1, side: -1 }];
  const arts = [...document.querySelectorAll('.site')];
  const sh = arts[0].getBoundingClientRect().height;
  rideH = sh; rideY0 = top(arts[0]) + (sh - innerHeight) / 2;
  arts.forEach((a, i) => {
    stops.push({ y: rideY0 + i * sh, set: i % 2 ? sets.b : sets.a, pal: SITE_PAL[i], q: i, creep: 0, side: portrait ? 0 : (i % 2 ? 1 : -1) });
  });
  stops.push(secStop($('#prices'), 'prices', PAL.prices, 8));
  stops.push(secStop($('#say'), 'say', PAL.say, 9));
  const maxS = document.documentElement.scrollHeight - innerHeight;
  const st = secStop($('#start'), 'start', PAL.start, 10);
  st.y = Math.min(st.y, maxS); stops.push(st);
  stops.forEach((s, i) => { if (i && s.y <= stops[i - 1].y) s.y = stops[i - 1].y + 1; });
  stops.forEach((s) => { s.ga = hex(s.pal.g); s.sa = hex(s.pal.s); });
  dirty = true;
}

function pickStop(y) {
  let k = 0;
  while (k < stops.length - 2 && y >= stops[k + 1].y) k++;
  const a = stops[k], b = stops[k + 1];
  const f = Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
  return { k, a, b, f };
}

/* ------------------------------------------------------------------ DOM sync */
let siteEls = [];
const setThemeColor = (() => { const m = $('#themeColor'); let last = ''; return (c) => { if (c !== last) { m.content = c; last = c; document.documentElement.style.background = c; } }; })();

/* ------------------------------------------------------------------ render */
let lastPath = null, frameCount = 0;
const fps = { t0: 0, frames: 0, last: 0, value: 0, samples: [], cpu: 0 };
let adaptAcc = 0, adaptN = 0, lastT = 0, smoothY = null;
const uploadSlot = new Int32Array(8);
const hueArr = new Float32Array(24);
SITE_PAL.forEach((p, i) => hueArr.set(hex(p.g), i * 3));

function render(now) {
  const dt = Math.min(.05, Math.max(.001, (now - lastT) / 1000)); lastT = now;
  const moving = !paused;
  if (moving) time += dt;
  const yNow = scrollY;
  if (smoothY === null) smoothY = yNow;
  // Light spring on the 3D side only. The page itself scrolls natively.
  const prevSmooth = smoothY;
  const follow = reduced ? 1 : 1 - Math.exp(-dt * 11);
  smoothY += (yNow - smoothY) * follow;
  const scrollV = (smoothY - prevSmooth) / Math.max(1, vh) / dt; // viewports per second
  state.flutter += (Math.min(1.5, Math.abs(scrollV) * .9) - state.flutter) * .08;

  // Reduced motion shows a composed still for the nearest stop.
  let sy = smoothY;
  if (reduced) { let best = stops[0]; for (const s of stops) if (Math.abs(s.y - yNow) < Math.abs(best.y - yNow)) best = s; sy = best.y; }
  const { k, a, b, f } = pickStop(sy);
  const tMorph = sstep(.08, .92, f), tFilm = sstep(.16, .84, f), tWipe = sstep(.24, .76, f);

  // Blend control sets.
  const sa = a.set, sb = b.set;
  for (let i = 0; i < 16; i++) for (let c = 0; c < 4; c++) cps[i * 4 + c] = lerp(sa.pts[i][c], sb.pts[i][c], tMorph);
  const aspect = vw / vh, hw = VH * aspect;
  // Width follows the shorter screen dimension.
  const wScale = portrait ? (aspect / .4615) : Math.min(1, aspect / 1.6);
  const shortScreen = !portrait && vh < 500;
  const W = lerp(sa.W, sb.W, tMorph) * wScale * (shortScreen ? .84 : 1);
  // Landscape phones: slide the composition away from the text column.
  if (shortScreen) { const sd = lerp(a.side, b.side, tMorph); for (let i = 0; i < 16; i++) cps[i * 4] -= sd * .24; }

  // Pointer spring
  ptr.vx = (ptr.tx - ptr.x) * hw; ptr.vy = (ptr.ty - ptr.y) * VH;
  ptr.x += (ptr.tx - ptr.x) * .16; ptr.y += (ptr.ty - ptr.y) * .16;
  ptr.active += ((ptr.want || 0) - ptr.active) * .08;
  // Parallax pull on the whole path toward the pointer.
  const pull = reduced ? 0 : 1;
  for (let i = 0; i < 16; i++) {
    const depth = cps[i * 4 + 2];
    cps[i * 4] += ptr.x * .035 * pull * (depth + 1.5) * .5;
    cps[i * 4 + 1] += ptr.y * .03 * pull * (depth + 1.5) * .5;
  }
  lastPath = evalPath(hw);
  if (Q.sim && moving) {
    simulate(dt, hw);
    // scroll kicks a traveling wave through the band
    if (Math.abs(scrollV) > .02) { const kick = Math.min(.03, Math.abs(scrollV) * .008) * Math.sign(scrollV); for (let i = 2; i < 8; i++) { vz[i] += kick; vz[ROWS - 1 - i] -= kick; } }
  }

  // Film position
  const creepW = lerp(a.creep, b.creep, tFilm);
  if (moving && !reduced) state.creep += dt * .1 * creepW;
  if (creepW >= .999 && state.creep > 8) state.creep -= 8;
  if (creepW < .001) state.creep = 0;
  const qq = lerp(a.q, b.q, tFilm) + state.creep * creepW + Math.sin(time * .35) * .004;
  state.q = qq;
  const filmOff = PITCH * (qq + .5);

  buildVerts(filmOff, W, time);

  // Decoders follow the front.
  scheduleVideos(qq, now);
  if (moving || !frameCount) uploadVideos();
  for (let i = 0; i < 8; i++) {
    let sl = -1;
    for (let j = 0; j < Q.vids; j++) if (slots[j].site === i && slots[j].ready) sl = j;
    uploadSlot[i] = sl;
  }

  // Camera: rides with the scroll, leans with the pointer.
  const swayX = Math.sin(time * .17) * .05 + ptr.x * .22;
  const swayY = Math.cos(time * .13) * .035 + ptr.y * .16;
  const rollA = Math.max(-.05, Math.min(.05, scrollV * .022));
  const cam = [swayX, swayY, D];
  const target = [swayX * .1, swayY * .1, 0];
  const up = [Math.sin(rollA), Math.cos(rollA), 0];
  const view = lookAt(cam, target, up);
  const proj = persp(FOV, aspect, .2, 40);
  const vp = mul(proj, view), ivp = invert(vp);

  // Shadow light swings with the composition, so the shadow falls away from the text.
  const side = lerp(a.side, b.side, tMorph);
  const L = norm([side * .26 - .02, .34, .92]);
  const lc = [0, -.2, -1.2];
  const lview = lookAt([lc[0] + L[0] * 14, lc[1] + L[1] * 14, lc[2] + L[2] * 14], lc, [0, 1, 0]);
  const ex = hw * 1.5 + 2.5, ey = VH * 1.5 + 2.5;
  const lvp = mul(ortho(ex, ey, 1, 30), lview);

  // --- shadow pass
  gl.bindFramebuffer(gl.FRAMEBUFFER, smFb);
  gl.viewport(0, 0, smSize, smSize);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LESS);
  gl.disable(gl.BLEND); gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(pShadow.p);
  gl.uniformMatrix4fv(pShadow.u.uVP, false, lvp);
  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0);
  gl.bindVertexArray(emptyVAO);

  // letters cast too
  const typeDraws = [];
  const dvw = vw, dvh = vh;
  for (const it of typeItems) {
    const r = it.el.getBoundingClientRect();
    if (r.bottom < -vh * .4 || r.top > vh * 1.4) continue;
    if (!it.ok) rasterItem(it);
    const al = it.site >= 0 ? siteAlpha(it.site, sy) : 1;
    if (al < .01) continue;
    const l = r.left + it.ox, t = r.top + it.oy, x1 = l + it.w, y1 = t + it.h;
    const n = [l / dvw * 2 - 1, 1 - t / dvh * 2, x1 / dvw * 2 - 1, 1 - y1 / dvh * 2];
    const corners = [[n[0], n[1]], [n[2], n[1]], [n[0], n[3]], [n[2], n[3]]];
    const zs = new Float32Array(4), ws = new Float32Array(16);
    corners.forEach((c, i) => {
      const far = xform(ivp, [c[0], c[1], 1]);
      const dir = [far[0] - cam[0], far[1] - cam[1], far[2] - cam[2]];
      const tt = -cam[2] / dir[2];
      const P = [cam[0] + dir[0] * tt, cam[1] + dir[1] * tt, 0];
      ws.set([P[0], P[1], 0, 1], i * 4);
      zs[i] = xform(vp, P)[2];
    });
    typeDraws.push({ it, n, zs, ws, al });
  }
  gl.useProgram(pTypeS.p);
  gl.disable(gl.CULL_FACE);
  gl.uniformMatrix4fv(pTypeS.u.uLVP, false, lvp);
  gl.uniform1f(pTypeS.u.uMode, 1);
  gl.activeTexture(gl.TEXTURE0); gl.uniform1i(pTypeS.u.uT, 0);
  for (const d of typeDraws) {
    if (d.it.site >= 0) continue;
    gl.bindTexture(gl.TEXTURE_2D, d.it.tex);
    gl.uniform1f(pTypeS.u.uA, d.al);
    gl.uniformMatrix4fv(pTypeS.u.uW, false, d.ws);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // --- ground shadow, low resolution
  const pn = norm([0, .16, 1]), gp = [0, 0, -3.0];
  const pd = -dot(pn, gp);
  gl.bindFramebuffer(gl.FRAMEBUFFER, shadeFb);
  gl.viewport(0, 0, shadeW, shadeH);
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
  gl.useProgram(pGroundS.p);
  gl.uniformMatrix4fv(pGroundS.u.uIVP, false, ivp); gl.uniformMatrix4fv(pGroundS.u.uLVP, false, lvp);
  gl.uniform3fv(pGroundS.u.uCam, cam); gl.uniform3fv(pGroundS.u.uPn, pn); gl.uniform1f(pGroundS.u.uPd, pd);
  gl.uniform1f(pGroundS.u.uPen, .2); gl.uniform1i(pGroundS.u.uTaps, Q.taps);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, smTex); gl.uniform1i(pGroundS.u.uSM, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  // two blur passes melt the sampling noise out of the penumbra
  gl.useProgram(pBlur.p); gl.uniform1i(pBlur.u.uT, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, shade2Fb); gl.bindTexture(gl.TEXTURE_2D, shadeTex);
  gl.uniform2f(pBlur.u.uD, 1 / shadeW, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindFramebuffer(gl.FRAMEBUFFER, shadeFb); gl.bindTexture(gl.TEXTURE_2D, shade2Tex);
  gl.uniform2f(pBlur.u.uD, 0, 1 / shadeH); gl.drawArrays(gl.TRIANGLES, 0, 3);

  // --- main
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, sW, sH);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(pGround.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shadeTex); gl.uniform1i(pGround.u.uShade, 0);
  gl.uniform2f(pGround.u.uTexel, 1 / shadeW, 1 / shadeH);
  gl.uniform3fv(pGround.u.uGa, a.ga); gl.uniform3fv(pGround.u.uGb, b.ga);
  gl.uniform3fv(pGround.u.uSa, a.sa); gl.uniform3fv(pGround.u.uSb, b.sa);
  gl.uniform1f(pGround.u.uWipe, tWipe); gl.uniform1f(pGround.u.uTime, time); gl.uniform1f(pGround.u.uAspect, aspect);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // Ribbon
  const gNow = lerp3(a.ga, b.ga, tWipe), shNow = lerp3(a.sa, b.sa, tWipe);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  const u = pRibbon.u;
  gl.useProgram(pRibbon.p);
  gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniformMatrix4fv(u.uLVP, false, lvp);
  gl.uniform3fv(u.uCam, cam);
  gl.uniform3fv(u.uKey, norm([-.5 + ptr.x * .3, .62 + ptr.y * .25, .62]));
  gl.uniform3fv(u.uG, gNow); gl.uniform3fv(u.uSh, shNow);
  gl.uniform1f(u.uSelf, Q.self); gl.uniform1f(u.uSMsize, smSize); gl.uniform1f(u.uBias, .0016);
  gl.uniform3fv(u.uHue, hueArr);
  gl.uniform1iv(u.uSlot, uploadSlot);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, smTex); gl.uniform1i(u.uSM, 0); gl.bindSampler(0, smCmp);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D_ARRAY, postTex); gl.uniform1i(u.uPost, 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, slots[0].t); gl.uniform1i(u.uV0, 2);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, slots[1].t); gl.uniform1i(u.uV1, 3);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, slots[2].t); gl.uniform1i(u.uV2, 4);
  gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, edgeTex); gl.uniform1i(u.uEdge, 5);
  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0);
  gl.bindVertexArray(emptyVAO);
  gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE); gl.bindSampler(0, null);

  // Letters, depth-tested against the band: it passes in front of them and behind them.
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
  gl.useProgram(pType.p);
  const tu = pType.u;
  gl.uniform1f(tu.uMode, 0); gl.uniformMatrix4fv(tu.uLVP, false, lvp);
  gl.uniform1f(tu.uSelf, Q.self); gl.uniform1f(tu.uBias, .0016); gl.uniform1f(tu.uSMsize, smSize);
  gl.activeTexture(gl.TEXTURE0); gl.uniform1i(tu.uT, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, smTex); gl.uniform1i(tu.uSM, 1); gl.bindSampler(1, smCmp);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, shadeTex); gl.uniform1i(tu.uShade, 2);
  gl.uniform2f(tu.uRes, sW, sH); gl.uniform1f(tu.uWipe, tWipe);
  gl.uniform3fv(tu.uGa, a.ga); gl.uniform3fv(tu.uGb, b.ga); gl.uniform3fv(tu.uSa, a.sa); gl.uniform3fv(tu.uSb, b.sa);
  gl.activeTexture(gl.TEXTURE0);
  for (const d of typeDraws) {
    gl.bindTexture(gl.TEXTURE_2D, d.it.tex);
    gl.uniform4f(tu.uRect, d.n[0], d.n[1], d.n[2], d.n[3]);
    gl.uniform4fv(tu.uZ, d.zs);
    gl.uniformMatrix4fv(tu.uW, false, d.ws);
    gl.uniform3fv(tu.uInk, d.it.ink); gl.uniform3fv(tu.uSh, d.it.sh);
    gl.uniform1f(tu.uA, d.al);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  gl.disable(gl.BLEND); gl.depthMask(true); gl.bindSampler(1, null);

  // DOM follows: fade site text, set page color.
  if (!reduced) syncSiteDom(smoothY);
  else syncSiteDom(sy);
  const cNow = tWipe < .5 ? a.pal.g : b.pal.g;
  setThemeColor(cNow);

  frameCount++;
  state.y = yNow; state.a = k; state.wipe = tWipe;
}

function siteAlpha(i, y) {
  const p = (y - rideY0) / rideH;
  const el = siteEls[i];
  if (el && el.contains(document.activeElement)) return 1;
  return 1 - sstep(.3, .5, Math.abs(p - i));
}
const lastOp = new Float32Array(8).fill(-1);
function syncSiteDom(y) {
  for (let i = 0; i < siteEls.length; i++) {
    const a = siteAlpha(i, y);
    if (Math.abs(a - lastOp[i]) > .005) {
      lastOp[i] = a;
      siteEls[i].firstElementChild.style.opacity = a.toFixed(3);
      siteEls[i].firstElementChild.classList.toggle('off', a < .05);
    }
  }
}

/* ------------------------------------------------------------------ loop + adapt */
function frame(now) {
  requestAnimationFrame(frame);
  const needRender = !paused || dirty || Math.abs(scrollY - (smoothY ?? scrollY)) > .3;
  const cpu0 = performance.now();
  if (needRender) { render(now); dirty = false; }
  fps.cpu = performance.now() - cpu0;
  // measurement + adaptive quality
  if (fps.last) {
    const d = now - fps.last;
    if (d < 250) {
      fps.samples.push(d); if (fps.samples.length > 600) fps.samples.shift();
      if (!paused && !params.has('noadapt') && document.visibilityState === 'visible') {
        adaptAcc += d; adaptN++;
        if (adaptN >= 50) {
          const avg = adaptAcc / adaptN; adaptAcc = 0; adaptN = 0;
          if (avg > 25) stepDown();
        }
      }
    }
  }
  fps.last = now;
}
function stepDown() {
  // First trim resolution, then drop a tier.
  if (resScale > .8) { resScale = +(resScale - .1).toFixed(2); resize(); return; }
  if (tier < 3) {
    tier++; Q = TIERS[tier]; resScale = 1;
    buildMesh(); buildShadowMap(); shadeW = 0; resize();
    slots.forEach((s, i) => { if (i >= Q.vids && s.site !== -1) assignVideo(s, -1); });
  }
}

/* ------------------------------------------------------------------ events */
addEventListener('pointermove', (e) => {
  ptr.tx = e.clientX / innerWidth * 2 - 1; ptr.ty = 1 - e.clientY / innerHeight * 2; ptr.want = 1; if (paused) return; dirty = true;
}, { passive: true });
document.addEventListener('pointerleave', () => { ptr.want = 0; });
addEventListener('pointerdown', (e) => { ptr.x = ptr.tx = e.clientX / innerWidth * 2 - 1; ptr.y = ptr.ty = 1 - e.clientY / innerHeight * 2; ptr.want = 1; }, { passive: true });
addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') ptr.want = 0; }, { passive: true });
addEventListener('pointercancel', () => { ptr.want = 0; }, { passive: true });
addEventListener('scroll', () => { dirty = true; }, { passive: true });
pauseBtn.addEventListener('click', () => {
  if (reduced) { reduced = false; }
  paused = !paused;
  setPauseUI();
  slots.forEach((s) => { if (s.site < 0) return; if (paused) s.v.pause(); else s.v.play().catch(() => {}); });
  dirty = true;
});
prefersReduced.addEventListener('change', (e) => {
  reduced = e.matches; paused = reduced; setPauseUI();
  slots.forEach((s) => { if (s.site >= 0) { if (paused) s.v.pause(); else s.v.play().catch(() => {}); } });
  dirty = true;
});
// Keyboard: when focus lands on a site's link, bring that site to its stop.
document.addEventListener('focusin', (e) => {
  const art = e.target.closest && e.target.closest('.site');
  if (art && e.target.matches(':focus-visible')) {
    const i = +art.dataset.i; const y = rideY0 + i * rideH;
    window.scrollTo({ top: y, behavior: 'auto' });
  }
});
let rwTimer = 0, lastW = innerWidth;
function relayout() {
  const widthChanged = innerWidth !== lastW; lastW = innerWidth;
  resize();
  const wasPortrait = h1Mode;
  fitType();
  if (widthChanged || wasPortrait !== h1Mode || !typeItems.length) { collectType(); }
  measure();
  dirty = true;
}
addEventListener('resize', () => { clearTimeout(rwTimer); rwTimer = setTimeout(relayout, 90); }, { passive: true });
visualViewport && visualViewport.addEventListener('resize', () => { dirty = true; }, { passive: true });

/* ------------------------------------------------------------------ start */
buildMesh(); buildShadowMap();
fitType();
siteEls = [...document.querySelectorAll('.site')];
resize(); measure();
const fontsReady = Promise.all([
  document.fonts.load('900 100px Anybody'), document.fonts.load('500 40px "DM Mono"'), document.fonts.load('600 16px "Schibsted Grotesk"'),
]).catch(() => {});
fontsReady.then(() => document.fonts.ready).then(() => {
  fitType(); buildEdge(); collectType(); measure();
  document.querySelectorAll('[data-gl]').forEach(wrapWords);
  document.documentElement.classList.add('gl-on');
  dirty = true;
  window.__R.ready = true;
});
// Layout can shift when the document finishes; keep stops honest.
addEventListener('load', () => measure());

window.__R = {
  ready: false, state, slots, fps, get tier() { return tier; }, get res() { return [sW, sH]; }, get frameCount() { return frameCount; },
  stepDown,
};
requestAnimationFrame(frame);
})();
