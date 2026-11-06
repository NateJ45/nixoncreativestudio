/* FLYTHROUGH: hand-written WebGL2 flight through client sites.
   The camera moves along +Z through a chain of saturated rooms. Each room ends in a wall with
   a screen in it. The screen is a grid of instanced tiles that burst forward as the camera
   punches through, opening a true hole into the next room. */
(function () {
  'use strict';
  var N = window.NCS, doc = document, root = doc.documentElement;
  var FLY = root.classList.contains('fly');
  var $ = function (s) { return doc.querySelector(s); };

  /* ---------- palette: every room is a saturated field, ink chosen for 4.5:1 ---------- */
  var ROOMS = [
    { bg: '#E8FF00', ink: '#000000', a: '#FF3B00', b: '#00C8FF' },            // hero
    { bg: '#FF3B00', ink: '#000000', a: '#FFE600', b: '#FF9EE6' },            // Stone Steps
    { bg: '#0B2BFF', ink: '#FFFFFF', a: '#D6006A', b: '#00083F' },            // MAS
    { bg: '#00E676', ink: '#000000', a: '#FFF200', b: '#FFFFFF' },            // Presbyterian Academy
    { bg: '#FF2E7A', ink: '#000000', a: '#FFD400', b: '#FF9A00' },            // Theology Matters
    { bg: '#5A12FF', ink: '#FFFFFF', a: '#16003F', b: '#C4009A' },            // First Baptist
    { bg: '#FFA400', ink: '#000000', a: '#FF4A00', b: '#FFFFFF' },            // Reid
    { bg: '#00D5E8', ink: '#000000', a: '#FFFFFF', b: '#FFE600' },            // FRT
    { bg: '#FF4FC3', ink: '#20000A', a: '#FFE600', b: '#FF8A00' },            // Orangeburg
    { bg: '#0B2BFF', ink: '#FFFFFF', a: '#D6006A', b: '#00083F' },            // prices
    { bg: '#FF2E7A', ink: '#000000', a: '#FFD400', b: '#FF9A00' },            // quote
    { bg: '#E8FF00', ink: '#000000', a: '#FF3B00', b: '#00C8FF' },            // start
  ];
  function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
  ROOMS.forEach(function (r) { r.c = hex(r.bg); r.ci = hex(r.ink); r.ca = hex(r.a); r.cb = hex(r.b); r.lightInk = r.ink === '#FFFFFF'; });

  /* ---------- DOM from facts ---------- */
  var rooms = $('#rooms');
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function words(s) { return s.split(' ').map(function (w) { return '<span class="w">' + esc(w) + '</span>'; }).join(' '); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var firstSentence = N.sub.split('. ')[0] + '.';
  var secondSentence = N.sub.split('. ').slice(1).join('. ');

  var html = '<div class="room hero" data-i="0" style="--bg:' + ROOMS[0].bg + ';--ink:' + ROOMS[0].ink + '">' +
    '<div class="copy"><h1 class="name"><span class="lead">' + words(N.line.lead) + '</span>' + words(N.line.heavy) + '</h1>' +
    '<p class="hook"><span>' + esc(firstSentence) + '</span></p>' +
    (FLY ? '<p class="meta cue">Scroll to fly through 8 client sites</p>' : '') + '</div></div>';
  N.sites.forEach(function (s, k) {
    var i = k + 1, R = ROOMS[i];
    html += '<article class="room' + (i % 2 === 0 ? ' flip' : '') + '" data-i="' + i + '" style="--bg:' + R.bg + ';--ink:' + R.ink + '">' +
      '<div class="copy"><p class="meta">' + esc(s.sector) + ' / ' + esc(s.host) + '</p>' +
      '<h2 class="name">' + words(s.name) + '</h2>' +
      '<p class="hook"><span>' + esc(s.hook) + '</span></p>' +
      '<a class="go" href="' + s.study + '" aria-label="Read the ' + esc(s.name) + ' study">Read the study<span class="ar" aria-hidden="true"></span></a></div>' +
      (FLY ? '' : '<img class="poster" src="' + s.poster + '" alt="The ' + esc(s.name) + ' website" loading="lazy" width="1120" height="700">') +
      '</article>';
  });
  rooms.innerHTML = html;

  $('#nav-about').href = N.links.about;

  $('#prices').innerHTML = '<h2 id="h-prices" class="sec-h">What it costs</h2><ul class="tiers">' + N.tiers.map(function (t) {
    return '<li class="tier"><h3>' + esc(t.name) + '</h3><p><span class="from">from</span><span class="amt">' + esc(t.from) + '</span></p><p class="who">' + esc(t.who) + '</p></li>';
  }).join('') + '</ul><p class="tiers-more"><a class="go" href="' + N.links.services + '">See what each one includes<span class="ar" aria-hidden="true"></span></a></p>';

  $('#quote').innerHTML = '<div class="q-panel"><figure><blockquote>' + esc(N.quote.text) + '</blockquote><figcaption>' + esc(N.quote.by) + '<span>' + esc(N.quote.role) + '</span></figcaption></figure></div>';

  var tel = N.contact.phone.replace(/[^\d]/g, '');
  $('#start').innerHTML = '<div class="cta"><h2 id="h-start">Start a project.</h2>' +
    '<a class="big" id="mail" href="mailto:' + N.contact.email + '">' + N.contact.email + '</a>' +
    '<a class="big tel" id="phone" href="tel:+1' + tel + '">' + N.contact.phone + '</a>' +
    '<div class="notes"><p>' + esc(N.contact.reply) + '</p><p>' + esc(N.contact.free) + '</p><p>' + esc(secondSentence) + '</p></div>' +
    '<p class="foot"><span>Nixon Creative Studio</span><span>' + esc(N.contact.place) + '</span><a href="' + N.links.work + '">All work</a><a href="' + N.links.contact + '">Contact page</a></p></div>';

  /* Fit a heading into a box by binary search on font-size. */
  function fitText(el, box, minPx, maxPx, tooBig) {
    var lo = minPx, hi = maxPx;
    for (var it = 0; it < 12; it++) {
      var m = (lo + hi) / 2;
      el.style.fontSize = m + 'px';
      if (tooBig(m)) hi = m; else lo = m;
    }
    el.style.fontSize = lo + 'px';
    return lo;
  }
  function fitEnding() {
    var cta = $('.cta'); if (!cta) return;
    var w = cta.clientWidth - parseFloat(getComputedStyle(cta).paddingLeft) * 2;
    ['#mail', '#phone'].forEach(function (id) {
      var el = $(id); el.style.display = 'inline-block'; el.style.whiteSpace = 'nowrap';
      var cap = id === '#phone' ? Math.min(w * .2, 200) : 170;
      fitText(el, w, 16, cap, function () { return el.getBoundingClientRect().width > w * .985; });
      el.style.display = 'block';
    });
  }

  var uiPause = $('#pause');
  if (!FLY) { /* Still mode: composed, static. */
    rooms.querySelectorAll('.room').forEach(function (r) { r.style.setProperty('--stretch', '100%'); });
    var fitStill = function () {
      fitEnding();
      rooms.querySelectorAll('.name').forEach(function (n) {
        var copy = n.parentNode, w = copy.clientWidth;
        fitText(n, w, 26, Math.min(innerWidth * (n.tagName === 'H1' ? .15 : .085), n.tagName === 'H1' ? 210 : 120), function () { return n.scrollWidth > w + 1 || maxWord(n) > w; });
      });
    };
    fontsReady().then(fitStill);
    addEventListener('resize', fitStill);
    $('#work').id = 'work-unused';
    rooms.querySelector('[data-i="1"]').id = 'work';
    return;
  }
  function fontsReady() {
    var sets = [doc.fonts.load('900 120px Anybody'), doc.fonts.load('500 14px "Martian Mono"')];
    return Promise.race([Promise.all(sets), new Promise(function (r) { setTimeout(r, 2500); })]);
  }

  /* ---------- GL setup ---------- */
  var cv = $('#gl');
  var gl = cv.getContext('webgl2', { antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!gl) { root.className = 'still'; location.reload(); return; }
  var aniso = gl.getExtension('EXT_texture_filter_anisotropic');

  function compile(vs, fs) {
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, '#version 300 es\nprecision highp float;\n' + s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o), s); return o; }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'a_corner');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p: p, u: u };
  }

  /* Planes: walls, slabs, streaks, SDF type. One instanced draw per range. */
  var spriteVS = [
    'layout(location=0) in vec2 a_corner;',
    'layout(location=1) in vec3 i_c; layout(location=2) in vec2 i_h; layout(location=3) in vec2 i_om;',
    'layout(location=4) in vec4 i_col; layout(location=5) in vec4 i_uv;',
    'uniform mat4 u_vp; uniform float u_mirror, u_floor, u_time, u_stretch;',
    'out vec2 v_uv; out vec4 v_col; flat out float v_mode; out vec3 v_w; out float v_dist;',
    'void main(){',
    ' float o=i_om.x, m=i_om.y; vec3 p=i_c; vec2 c=a_corner;',
    ' if(o<.5){ p+=vec3(i_h.x*c.x,i_h.y*c.y,0.); }',
    ' else if(o<1.5){ float s=(m<.5)?(1.+u_stretch*2.5):1.; p+=vec3(0.,i_h.y*c.y,i_h.x*c.x*s); }',
    ' else { float s=(m<.5)?(1.+u_stretch*2.5):1.; p+=vec3(i_h.x*c.x,0.,i_h.y*c.y*s); }',
    ' if(m>.5 && m<2.5 && i_c.y>2.) p.y+=sin(u_time*.7+i_c.z*.31)*.28;',
    ' if(u_mirror>.5) p.y=2.*u_floor-p.y;',
    ' v_w=p; v_uv=mix(i_uv.xy,i_uv.zw,c*.5+.5); v_col=i_col; v_mode=m;',
    ' gl_Position=u_vp*vec4(p,1.); v_dist=gl_Position.w;',
    '}'].join('\n');
  var spriteFS = [
    'uniform sampler2D u_atlas; uniform float u_mirror, u_floor, u_room, u_len;',
    'in vec2 v_uv; in vec4 v_col; flat in float v_mode; in vec3 v_w; in float v_dist; out vec4 o;',
    'void main(){',
    ' if(u_mirror>.5 && v_w.y>u_floor) discard;',
    ' vec4 c=v_col;',
    ' if(v_mode>2.5){', // wall panel lines
    '  vec3 q=v_w; vec2 g; vec3 n=normalize(cross(dFdx(q),dFdy(q)));',
    '  vec3 an=abs(n);',
    '  if(an.y>.5) g=q.xz*vec2(1./10.,1./22.); else if(an.x>.5) g=q.yz*vec2(1./7.25,1./22.); else g=q.xy/vec2(10.,7.25);',
    '  vec2 w=fwidth(g)+1e-4; vec2 l=1.-smoothstep(vec2(0.),w*1.3,abs(fract(g-.5)-.5));',
    '  float fade=clamp(1.-max(w.x,w.y)*3.,0.,1.);',
    '  c.rgb=mix(c.rgb,c.rgb*v_col.a,max(l.x,l.y)*fade);',
    '  c.a=1.;',
    ' } else if(v_mode>.5){',
    '  float d=texture(u_atlas,v_uv).r; float w=max(fwidth(d),.004)*.75;',
    '  float a=(v_mode<1.5)?smoothstep(.5-w,.5+w,d):(smoothstep(.40-w,.40+w,d)-smoothstep(.56-w,.56+w,d));',
    '  c.a*=a; if(c.a<.004) discard;',
    ' }',
    ' if(v_mode<2.5) c.a*=smoothstep(.4,4.,v_dist);',
    ' if(u_mirror>.5){ float h=u_floor-(2.*u_floor-v_w.y); c.a*=(v_mode>2.5)?1.:exp(h*.075); }',
    ' o=c;',
    '}'].join('\n').replace("  c.rgb*=mix(i_shade_near(),1.,1.)*1.;\n", '');
  var spriteP = compile(spriteVS, spriteFS);

  /* Screen tiles: instanced grid sampling one video or poster texture. */
  var tileVS = [
    'layout(location=0) in vec2 a_corner; layout(location=1) in vec4 i_t;',
    'uniform mat4 u_vp; uniform vec3 u_c; uniform vec2 u_hs, u_grid; uniform float u_q, u_yaw, u_mirror, u_floor;',
    'out vec2 v_uv; out float v_loc; out float v_dist; out float v_y;',
    'mat3 rot(vec3 a,float t){float s=sin(t),c=cos(t),k=1.-c; a=normalize(a);',
    ' return mat3(k*a.x*a.x+c,k*a.x*a.y+a.z*s,k*a.z*a.x-a.y*s, k*a.x*a.y-a.z*s,k*a.y*a.y+c,k*a.y*a.z+a.x*s, k*a.z*a.x+a.y*s,k*a.y*a.z-a.x*s,k*a.z*a.z+c);}',
    'void main(){',
    ' vec2 cell=(i_t.xy+.5)/u_grid; vec2 p0=(cell*2.-1.)*u_hs; vec2 he=u_hs/u_grid;',
    ' float d=length((cell*2.-1.))/1.414;',
    ' float loc=smoothstep(d*.62+i_t.z*.08,d*.62+i_t.z*.08+.34,u_q);',
    ' float over=max(u_q-1.,0.);',
    ' vec2 dir=normalize(p0+vec2(.001))*(1.+(i_t.w-.5)*.5);',
    ' vec3 off=vec3(dir*(loc*loc*(5.+i_t.z*16.)+over*(1.5+i_t.w*3.)),loc*(1.+i_t.w*7.)+over*(4.+i_t.z*26.));',
    ' off.y-=over*over*i_t.w*.5;',
    ' vec3 lp=vec3(a_corner*he*(1.-loc*.06),0.);',
    ' if(loc>.001) lp=rot(vec3(i_t.w-.5,i_t.z-.5,.35),loc*(1.+i_t.z*3.)+over*i_t.w*2.)*lp;',
    ' vec3 pos=vec3(p0,0.)+lp+off;',
    ' float cy=cos(u_yaw),sy=sin(u_yaw); pos=vec3(cy*pos.x+sy*pos.z,pos.y,-sy*pos.x+cy*pos.z);',
    ' pos+=u_c;',
    ' if(u_mirror>.5) pos.y=2.*u_floor-pos.y;',
    ' v_uv=(i_t.xy+a_corner*.5+.5)/u_grid; v_loc=loc; v_y=pos.y;',
    ' gl_Position=u_vp*vec4(pos,1.); v_dist=gl_Position.w;',
    '}'].join('\n');
  var tileFS = [
    'uniform sampler2D u_tex; uniform vec3 u_tint; uniform float u_mirror, u_floor, u_q, u_sat; uniform vec3 u_shade;',
    'in vec2 v_uv; in float v_loc; in float v_dist; in float v_y; out vec4 o;',
    'void main(){',
    ' vec3 c=texture(u_tex,v_uv).rgb;',
    ' float l=dot(c,vec3(.299,.587,.114)); c=clamp(mix(vec3(l),c,u_sat),0.,1.);',
    ' c=mix(c,u_tint,v_loc*.74);',
    ' float a=smoothstep(.3,2.2,v_dist)*(1.-smoothstep(2.4,3.2,u_q));',
    ' if(u_mirror>.5){ float h=u_floor-(2.*u_floor-v_y); a*=exp(h*.09)*.8; }',
    ' if(a<.01) discard; o=vec4(c,a);',
    '}'].join('\n');
  var tileP = compile(tileVS, tileFS);

  /* Post: radial speed blur, chroma split, burst lens. */
  var postVS = 'layout(location=0) in vec2 a_corner; out vec2 v; void main(){ v=a_corner*.5+.5; gl_Position=vec4(a_corner,0.,1.); }';
  function postFS(n) {
    return [
      'uniform sampler2D u_t; uniform vec2 u_vpc; uniform float u_amt,u_burst,u_asp,u_time;',
      'in vec2 v; out vec4 o; const int N=' + n + ';',
      'float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+u_time)*43758.5453);}',
      'void main(){',
      ' vec2 d=v-u_vpc; float r=length(d*vec2(u_asp,1.));',
      ' vec2 uv=u_vpc+d*(1.-u_burst*.42*r*r+u_burst*.12*sin(r*16.-u_burst*9.)*r);',
      ' vec2 dd=uv-u_vpc; float jit=h(gl_FragCoord.xy);',
      ' float amt=u_amt*smoothstep(.0,.55,r)*.36; vec3 c=vec3(0.);',
      ' for(int i=0;i<N;i++){ float t=(float(i)+jit)/float(N);',
      '  float s=1.-amt*t; float ca=(u_amt*.05+u_burst*.05)*r;',
      '  c.r+=texture(u_t,u_vpc+dd*s*(1.+ca)).r; c.g+=texture(u_t,u_vpc+dd*s).g; c.b+=texture(u_t,u_vpc+dd*s*(1.-ca)).b; }',
      ' c/=float(N);',
      ' o=vec4(c+(jit-.5)/255.,1.);',
      '}'].join('\n');
  }
  var postP = null;

  var quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  /* ---------- quality tiers (adapts down from measured frame time) ---------- */
  var coarse = matchMedia('(pointer:coarse)').matches || Math.min(innerWidth, innerHeight) < 520;
  var TIERS = [
    { dpr: 1, post: 0, msaa: 0, mirror: false, grid: [10, 6], every: 2, vmip: false },
    { dpr: 1.25, post: 4, msaa: 0, mirror: true, grid: [12, 8], every: 1, vmip: false },
    { dpr: 1.5, post: 6, msaa: 0, mirror: true, grid: [16, 10], every: 1, vmip: false },
    { dpr: 2, post: 10, msaa: 4, mirror: true, grid: [24, 15], every: 1, vmip: true },
  ];
  var tierN = coarse ? 1 : 3, tier = TIERS[tierN];
  var forced = new URLSearchParams(location.search).get('tier');
  if (forced !== null) { tierN = +forced; tier = TIERS[tierN]; }

  /* ---------- world constants ---------- */
  var L = 110, FLOOR = -12, CEIL = 17, WALL = 30, SHW = 12, SHH = 7.5, NR = ROOMS.length, SHATTER = 18, D_DWELL = L * .5;

  /* ---------- SDF atlas ---------- */
  var ATLAS = 2048, atlasData = new Uint8Array(ATLAS * ATLAS), glyphs = {}, shelfX = 2, shelfY = 2, shelfH = 0;
  function edt1d(f, n, d, v, z) {
    var k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
    for (var q = 1; q < n; q++) {
      var s;
      do { var r = v[k]; s = (f[q] - f[r] + q * q - r * r) / (2 * q - 2 * r); } while (s <= z[k] && --k > -1);
      k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
    }
    k = 0;
    for (q = 0; q < n; q++) { while (z[k + 1] < q) k++; var r2 = v[k]; d[q] = (q - r2) * (q - r2) + f[r2]; }
  }
  function edt(grid, w, h) {
    var m = Math.max(w, h), f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1), x, y;
    for (x = 0; x < w; x++) { for (y = 0; y < h; y++) f[y] = grid[y * w + x]; edt1d(f, h, d, v, z); for (y = 0; y < h; y++) grid[y * w + x] = d[y]; }
    for (y = 0; y < h; y++) { for (x = 0; x < w; x++) f[x] = grid[y * w + x]; edt1d(f, w, d, v, z); for (x = 0; x < w; x++) grid[y * w + x] = d[x]; }
  }
  var wc = doc.createElement('canvas'), wx = wc.getContext('2d', { willReadFrequently: true });
  function addWord(text, px) {
    var key = text + '@' + px; if (glyphs[key]) return glyphs[key];
    var sp = 14, font = '900 extra-expanded ' + px + 'px Anybody, Arial Black, Arial, sans-serif';
    wx.font = font; var tw = Math.ceil(wx.measureText(text).width);
    var w = Math.min(tw + sp * 2 + 4, ATLAS - 4), h = Math.ceil(px * 1.08) + sp * 2;
    wc.width = w; wc.height = h;
    wx.font = font; wx.textBaseline = 'alphabetic'; wx.fillStyle = '#fff';
    wx.scale(Math.min(1, (w - sp * 2) / tw), 1);
    wx.fillText(text, sp + 1, sp + px * .86);
    var img = wx.getImageData(0, 0, w, h).data, n = w * h, a = new Float64Array(n), b = new Float64Array(n), i;
    for (i = 0; i < n; i++) { var al = img[i * 4 + 3] / 255; if (al <= 0) { a[i] = 1e20; b[i] = 0; } else if (al >= 1) { a[i] = 0; b[i] = 1e20; } else { var e = .5 - al; a[i] = e > 0 ? e * e : 0; b[i] = e < 0 ? e * e : 0; } }
    edt(a, w, h); edt(b, w, h);
    if (shelfX + w + 2 > ATLAS) { shelfX = 2; shelfY += shelfH + 2; shelfH = 0; }
    if (shelfY + h > ATLAS) return null;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      i = y * w + x; var d = Math.sqrt(a[i]) - Math.sqrt(b[i]);
      atlasData[(shelfY + y) * ATLAS + shelfX + x] = Math.max(0, Math.min(255, Math.round((.5 - d / (sp * 2)) * 255)));
    }
    var g = { u0: shelfX / ATLAS, v0: (shelfY + h) / ATLAS, u1: (shelfX + w) / ATLAS, v1: shelfY / ATLAS, asp: w / h };
    glyphs[key] = g; shelfX += w + 2; shelfH = Math.max(shelfH, h);
    return g;
  }

  /* ---------- static instance data ---------- */
  var INST = 15, data = [], ranges = [];
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function push(x, y, z, hx, hy, orient, mode, col, alpha, g) {
    data.push(x, y, z, hx, hy, orient, mode, col[0], col[1], col[2], alpha, g ? g.u0 : 0, g ? g.v0 : 0, g ? g.u1 : 0, g ? g.v1 : 0);
  }
  function mul(c, k) { return [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)]; }
  function mix3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  function roomWords(i) {
    if (i === 0) return ['PULL', 'THEIR', 'WEIGHT', N.contact.place.split(',')[0].toUpperCase()];
    if (i <= 8) { var s = N.sites[i - 1]; return s.name.toUpperCase().split(' ').filter(function (w) { return !/^(THE|OF|FOR)$/.test(w); }).concat(s.sector.toUpperCase()); }
    if (i === 9) return N.tiers.map(function (t) { return t.name.toUpperCase(); }).concat(N.tiers.map(function (t) { return t.from; }));
    if (i === 10) return ['STATION', 'WAGON', 'SPORTS', 'CAR'];
    return ['START', 'A', 'PROJECT', 'CINCINNATI'];
  }
  function roomTail(i) {
    if (i >= 1 && i <= 8) return N.sites[i - 1].host;
    if (i === 0) return N.contact.place;
    if (i === 9) return 'WHAT IT COSTS';
    if (i === 10) return 'THEOLOGY MATTERS';
    return N.contact.email;
  }

  function buildWorld() {
    data.length = 0; ranges.length = 0;
    for (var i = 0; i < NR; i++) {
      var R = ROOMS[i], z0 = i * L, z1 = z0 + L, zm = z0 + L / 2, r = rng(4242 + i * 97);
      var start = data.length / INST, base = R.c, line = R.lightInk ? 1.35 : .93;
      var shadeUp = R.lightInk ? .86 : .97, shadeSide = R.lightInk ? .93 : 1.04, shadeEnd = R.lightInk ? 1.08 : 1.1;
      /* walls: orient 1 for sides, 2 for ceiling, end wall in four pieces around the hole */
      push(-WALL, (FLOOR + CEIL) / 2, zm, L / 2, (CEIL - FLOOR) / 2, 1, 3, mul(base, shadeSide), line);
      push(WALL, (FLOOR + CEIL) / 2, zm, L / 2, (CEIL - FLOOR) / 2, 1, 3, mul(base, shadeSide), line);
      push(0, CEIL, zm, WALL, L / 2, 2, 3, mul(base, shadeUp), line);
      var y0 = FLOOR - 40, h = CEIL - y0;
      push(-(WALL + SHW) / 2, y0 + h / 2, z1, (WALL - SHW) / 2, h / 2, 0, 3, mul(base, shadeEnd), line);
      push((WALL + SHW) / 2, y0 + h / 2, z1, (WALL - SHW) / 2, h / 2, 0, 3, mul(base, shadeEnd), line);
      push(0, (CEIL + SHH) / 2, z1, SHW, (CEIL - SHH) / 2, 0, 3, mul(base, shadeEnd), line);
      push(0, (-SHH + y0) / 2, z1, SHW, (-SHH - y0) / 2, 0, 3, mul(base, shadeEnd), line);
      var wallsEnd = data.length / INST;
      /* floor drawn separately, translucent over the reflection */
      push(0, FLOOR, zm, WALL, L / 2, 2, 3, base, line);
      var floorEnd = data.length / INST;

      var items = [];
      function item(z, f) { items.push([z, f]); }
      /* portal frame in the next room's color */
      if (i < NR - 1) (function () {
        var c = ROOMS[i + 1].c, t = .55, zz = z1 - .05;
        item(zz, function () {
          push(0, SHH + t, zz, SHW + t * 2, t, 0, 0, c, 1); push(0, -SHH - t, zz, SHW + t * 2, t, 0, 0, c, 1);
          push(-SHW - t, 0, zz, t, SHH, 0, 0, c, 1); push(SHW + t, 0, zz, t, SHH, 0, 0, c, 1);
        });
      })();
      /* giant hanging and standing words */
      var ws = roomWords(i), wn = ws.length;
      ws.forEach(function (w, j) {
        var g = addWord(w, 120); if (!g) return;
        var zz = z0 + L * (.1 + .8 * ((j + .4) / wn)) + (r() - .5) * 5;
        if (Math.abs(zz - (zm + 20)) < 8) zz += 14;
        var hy = 4.5 + r() * 3.5, hx = hy * g.asp, side = j % 2 ? 1 : -1;
        if (hx > 34) { hx = 34; hy = hx / g.asp; }
        var clear = 7 + r() * 2.5, x = side * (clear + hx * .96);
        var stand = j % 3 !== 1, y = stand ? FLOOR + hy * .87 : CEIL - hy * .87;
        var col = j % 2 ? R.ca : R.cb, mode = (j % 4 === 3) ? 2 : 1;
        item(zz, function () { push(x, y, zz, hx, hy, 0, mode, col, 1, g); });
      });
      /* wall type: host or label running along the walls */
      var tail = addWord(roomTail(i).toUpperCase(), 72);
      if (tail) [0, 1].forEach(function (k) {
        var hy = 3.4, hx = hy * tail.asp, zz = z0 + L * (.22 + .4 * k), s = k ? 1 : -1;
        var col = k ? R.ca : R.cb;
        item(zz, function () {
          var g = s > 0 ? { u0: tail.u1, v0: tail.v0, u1: tail.u0, v1: tail.v1 } : tail;
          push(s * (WALL - .05), 6 - k * 9, zz, hx, hy, 1, 1, col, 1, g);
        });
      });
      /* full-height color fins that stand off the walls and whip past */
      var slabs = 12;
      for (var k = 0; k < slabs; k++) (function (k) {
        var zz = z0 + L * (.06 + .84 * (k + r() * .7) / slabs), s = k % 2 ? 1 : -1, hx = 1 + r() * r() * 3.2;
        var x = s * (WALL - hx), col = [R.ca, R.cb][(k >> 1) % 2], hy = (CEIL - FLOOR) / 2;
        item(zz, function () { push(x, (CEIL + FLOOR) / 2, zz, hx, hy, 0, 0, col, 1); });
      })(k);
      /* gates you fly through: thick frames that nest around the screen ahead */
      [.14, .3, .62, .76, .9].forEach(function (zr, k) {
        var zz = z0 + L * zr, t = .5 + (k % 3) * .55, col = k % 2 ? R.cb : R.ca, ix = 22 + (k % 2) * 3, top = 12.5 - (k % 2) * 1.5, bot = FLOOR;
        item(zz, function () {
          push(0, top + t, zz, ix + t * 2, t, 0, 0, col, 1);
          push(-ix - t, (top + bot) / 2, zz, t, (top - bot) / 2, 0, 0, col, 1);
          push(ix + t, (top + bot) / 2, zz, t, (top - bot) / 2, 0, 0, col, 1);
        });
      });
      /* the next world's name printed huge on the end wall, around the screen */
      if (i < NR - 1) (function () {
        var nm = i < 8 ? N.sites[i].name.toUpperCase() : (i === 8 ? 'WHAT IT COSTS' : (i === 9 ? 'THEOLOGY MATTERS' : 'START A PROJECT'));
        var g = addWord(nm, 110); if (!g) return;
        var zz = z1 - .08, hx = 29.5, hy = hx / g.asp; if (hy > 3.9) { hy = 3.9; hx = hy * g.asp; }
        item(zz, function () { push(0, SHH + 1.1 + (CEIL - SHH - 1.1) / 2, zz, hx, hy, 0, 1, R.ca, 1, g); });
      })();
      /* type lying flat on the floor, streaking under the camera */
      var flats = i === 0 ? ['CHURCHES SCHOOLS', 'NONPROFITS SMALL BUSINESSES'] : [roomTail(i).toUpperCase(), roomTail(i).toUpperCase()];
      [.68, .84].forEach(function (zr, k) {
        var flat = addWord(flats[k], 72); if (!flat) return;
        var hx = 26, hy = Math.min(hx / flat.asp * 2.6, 9), zz = z0 + L * zr, col = k ? R.cb : R.ca;
        item(zz - hy, function () { push(0, FLOOR + .05, zz, hx, hy, 2, 1, col, 1, flat); });
      });
      /* streak bars along walls, floor and ceiling */
      var nst = 44;
      for (k = 0; k < nst; k++) (function () {
        var zz = z0 + r() * L, len = 3 + r() * 11, th = .05 + r() * r() * .4, kind = r(), col = r() < .5 ? R.ca : R.cb;
        item(zz, function () {
          if (kind < .4) { var yy = FLOOR + r() * (CEIL - FLOOR); push(r() < .5 ? -WALL + .03 : WALL - .03, yy, zz, len, th, 1, 0, col, .85); }
          else if (kind < .75) push(-WALL + r() * WALL * 2, FLOOR + .03, zz, th, len, 2, 0, col, .8);
          else push(-WALL + r() * WALL * 2, CEIL - .03, zz, th, len, 2, 0, col, .8);
        });
      })();
      items.sort(function (a, b) { return b[0] - a[0]; }).forEach(function (it) { it[1](); });
      ranges.push({ walls: [start, wallsEnd - start], floor: [wallsEnd, 1], items: [floorEnd, data.length / INST - floorEnd] });
    }
    var inst = new Float32Array(data);
    var vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, inst, gl.STATIC_DRAW);
    return vb;
  }

  /* ---------- textures ---------- */
  function newTex(unit) { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); return t; }
  function mipped(t) { gl.bindTexture(gl.TEXTURE_2D, t); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4); }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  var posterTex = N.sites.map(function (s, k) {
    var t = newTex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([200, 200, 200, 255]));
    var im = new Image(); im.decoding = 'async'; im.onload = function () { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); mipped(t); dirty = true; }; im.src = s.poster;
    return t;
  });

  /* Label screens for the two portals without a client site. */
  function labelTex(lines, bg, fg) {
    var c = doc.createElement('canvas'); c.width = 1120; c.height = 700; var x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 1120, 700); x.fillStyle = fg; x.textBaseline = 'alphabetic';
    var size = 210; x.font = '900 extra-expanded ' + size + 'px Anybody, Arial Black, sans-serif';
    var wmax = Math.max.apply(null, lines.map(function (l) { return x.measureText(l).width; }));
    size = size * Math.min(1, 1040 / wmax); x.font = '900 extra-expanded ' + size + 'px Anybody, Arial Black, sans-serif';
    lines.forEach(function (l, i) { x.fillText(l, 40, 660 - (lines.length - 1 - i) * size * .92); });
    var t = newTex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); mipped(t); return t;
  }

  /* ---------- video pool: at most 3 decoders, posters everywhere else ---------- */
  var box = doc.createElement('div'); box.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;overflow:hidden;pointer-events:none';
  doc.body.appendChild(box);
  var pool = [0, 1, 2].map(function () {
    var v = doc.createElement('video'); v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto'; v.width = 2; v.height = 2; v.tabIndex = -1; v.setAttribute('aria-hidden', 'true');
    box.appendChild(v);
    var slot = { v: v, site: -1, tex: null, fresh: false, ready: false, uploads: 0 };
    slot.tex = newTex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    if (v.requestVideoFrameCallback) { var cb = function () { slot.fresh = true; v.requestVideoFrameCallback(cb); }; v.requestVideoFrameCallback(cb); }
    return slot;
  });
  var paused = false, lastAssign = 0;
  function assignVideos(now, room, zf) {
    if (now - lastAssign < 140) return; lastAssign = now;
    var want = [];
    function add(i) { var s = (i === 10) ? 3 : (i >= 1 && i <= 8 ? i - 1 : -1); if (s >= 0 && want.indexOf(s) < 0) want.push(s); }
    add(room); add(room + 1); if (zf > .55) add(room + 2);
    want = want.slice(0, 3);
    pool.forEach(function (sl) { if (sl.site >= 0 && want.indexOf(sl.site) < 0) { sl.v.pause(); sl.site = -1; sl.ready = false; } });
    want.forEach(function (s) {
      if (pool.some(function (sl) { return sl.site === s; })) return;
      var sl = pool.filter(function (x) { return x.site < 0; })[0]; if (!sl) return;
      sl.site = s; sl.ready = false; sl.fresh = false; sl.v.src = N.sites[s].video;
      if (!paused) { var p = sl.v.play(); if (p && p.catch) p.catch(function () {}); }
    });
    pool.forEach(function (sl) { if (sl.site >= 0 && !paused && sl.v.paused) { var p = sl.v.play(); if (p && p.catch) p.catch(function () {}); } });
  }
  function slotFor(s) { for (var i = 0; i < 3; i++) if (pool[i].site === s && pool[i].ready) return pool[i]; return null; }
  function texFor(i) {
    if (i === 9) return tLabelPrices; if (i === 11) return tLabelStart;
    var s = i === 10 ? 3 : i - 1;
    var sl = slotFor(s); return sl ? sl.tex : posterTex[s];
  }
  var frameN = 0;
  function uploadVideos() {
    pool.forEach(function (sl) {
      if (sl.site < 0 || sl.v.readyState < 2) return;
      var has = !!sl.v.requestVideoFrameCallback;
      if (has ? !sl.fresh : (sl.v.paused && sl.ready)) return;
      if (tier.every > 1 && frameN % tier.every) return;
      sl.fresh = false;
      gl.bindTexture(gl.TEXTURE_2D, sl.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sl.v);
      if (tier.vmip) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
      else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      sl.ready = true; sl.uploads++;
    });
  }

  /* ---------- tile grids ---------- */
  function makeGrid(c, r) {
    var a = new Float32Array(c * r * 4), q = rng(1234 + c * 31), n = 0;
    for (var y = 0; y < r; y++) for (var x = 0; x < c; x++) { a[n++] = x; a[n++] = y; a[n++] = q(); a[n++] = q(); }
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, a, gl.STATIC_DRAW);
    return { buf: b, c: c, r: r, n: c * r };
  }
  var grids = {}; function grid(c, r) { var k = c + 'x' + r; return grids[k] || (grids[k] = makeGrid(c, r)); }

  /* ---------- FBO ---------- */
  var W = 0, H = 0, fbo = null, msFbo = null, colorTex = null, depthRb = null, msColor = null, msDepth = null;
  function freeFbo() { [fbo, msFbo].forEach(function (f) { if (f) gl.deleteFramebuffer(f); }); if (colorTex) gl.deleteTexture(colorTex); [depthRb, msColor, msDepth].forEach(function (r) { if (r) gl.deleteRenderbuffer(r); }); fbo = msFbo = colorTex = depthRb = msColor = msDepth = null; }
  function setupFbo() {
    freeFbo(); if (!tier.post) { postP = null; return; }
    colorTex = newTex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTex, 0);
    if (tier.msaa) {
      msFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
      msColor = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, msColor); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, tier.msaa, gl.RGBA8, W, H); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msColor);
      msDepth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, msDepth); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, tier.msaa, gl.DEPTH_COMPONENT24, W, H); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msDepth);
    } else {
      depthRb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    postP = compile(postVS, postFS(tier.post));
  }

  /* ---------- layout and scroll map ---------- */
  var stage = $('#stage'), track = $('#track'), vw = 0, vh = 0, aspect = 1, focal = 1.92, portrait = false;
  var stops = [], layers = [], roomEls = [].slice.call(rooms.querySelectorAll('.room')), dwellY = [], lens = [];
  function lensFor(i) {
    if (portrait) return [0, -.26];
    var side = (i % 2 === 0 && i > 0) ? -1 : 1;
    return [side * .46, .3];
  }
  function panelRect(i) {
    if (portrait) return [-.93, .93, -.95, -.47];
    var flip = i % 2 === 0, w = .78, x0 = flip ? -.97 : .97 - w, h = w * .625 * aspect, y1 = -.92 + h;
    return [x0, x0 + w, -.92, y1];
  }
  function panelWorld(i) {
    var r = panelRect(i), s = lensFor(i), d = 20;
    var x0 = (r[0] - s[0]) * d * aspect / focal, x1 = (r[1] - s[0]) * d * aspect / focal, y0 = (r[2] - s[1]) * d / focal, y1 = (r[3] - s[1]) * d / focal;
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, hx: Math.abs(x1 - x0) / 2, hy: Math.abs(y1 - y0) / 2, z: (i + .5) * L + d };
  }

  function layout() {
    vw = stage.clientWidth; vh = stage.clientHeight; aspect = vw / vh; portrait = aspect < 1;
    focal = portrait ? 1.43 : (aspect < 1.25 ? 1.6 : 1.92);
    var dpr = Math.min(devicePixelRatio || 1, tier.dpr);
    W = Math.round(vw * dpr); H = Math.round(vh * dpr); cv.width = W; cv.height = H;
    setupFbo();

    /* Text boxes and name fit. */
    var head = 64, foot = 64;
    roomEls.forEach(function (el) {
      var i = +el.dataset.i, copy = el.querySelector('.copy'), name = el.querySelector('.name');
      var wFrac = portrait ? 1 : (aspect < 1.5 ? .5 : (i === 0 ? (vh < 500 ? .54 : .64) : .55));
      var W_ = vw * wFrac - 24, maxH = portrait ? vh * (i === 0 ? .56 : .47) - head + 10 : vh - head - foot;
      copy.style.setProperty('--copyw', W_ + 'px');
      el.style.setProperty('--stretch', portrait ? '76%' : (vw < 700 ? '80%' : (i === 0 ? '125%' : '112%')));
      el.querySelectorAll('.w,.meta,.hook,.go').forEach(function (x) { x.style.transform = 'none'; });
      fitText(name, W_, 18, Math.min(vh * .4, vw * .24), function () {
        return name.scrollWidth > W_ + 1 || copy.offsetHeight > maxH || maxWord(name) > W_;
      });
    });
    fitEnding();

    /* Depth layers. */
    layers = roomEls.map(function (el, n) {
      var i = +el.dataset.i, s = lensFor(i);
      var vpx = (s[0] * .5 + .5) * vw, vpy = (.5 - s[1] * .5) * vh, list = [], seq = [11.5, 15, 12.8, 17, 13.6, 16];
      el.querySelectorAll('.w,.meta,.hook,.go').forEach(function (x, k) {
        var r = x.getBoundingClientRect();
        var d = x.classList.contains('w') ? seq[k % seq.length] : (x.classList.contains('meta') ? 19 : 10.5);
        x.style.setProperty('--ox', (vpx - r.left) + 'px'); x.style.setProperty('--oy', (vpy - r.top) + 'px');
        list.push({ el: x, d: d, w: x.classList.contains('w') });
      });
      return { el: el, i: i, list: list, vpx: vpx, vpy: vpy, on: false };
    });

    /* Scroll stops: y in px to camera coordinate c (room index + fraction). */
    var h0 = 1.25 * vh, hs = 2.3 * vh, y = h0;
    stops = [[0, .5], [h0, 1]];
    dwellY = [0];
    for (var i = 1; i <= 8; i++) { dwellY[i] = y + hs * .5; y += hs; stops.push([y, i + 1]); }
    var H_ = y + vh * 1.02;
    track.style.height = H_ + 'px';
    $('#work').style.top = dwellY[1] + 'px';
    var pr = $('#prices'), qu = $('#quote'), st = $('#start');
    var pT = pr.offsetTop, qT = qu.offsetTop, sT = st.offsetTop, pH = pr.offsetHeight, qH = qu.offsetHeight, sH = st.offsetHeight;
    var mid = function (t, hh) { return t + hh / 2 - vh / 2; };
    var pm = Math.max(y + 1, mid(pT, pH)), g1 = (pT + pH + qT) / 2 - vh / 2, qm = mid(qT, qH), g2 = (qT + qH + sT) / 2 - vh / 2;
    var end = doc.documentElement.scrollHeight - innerHeight;
    stops.push([pm, 9.5], [g1, 10], [qm, 10.5], [g2, 11], [Math.max(g2 + 1, end), 11.5]);
    dirty = true;
  }
  function maxWord(name) { var m = 0; name.querySelectorAll('.w').forEach(function (w) { m = Math.max(m, w.offsetWidth); }); return m; }

  function cAt(y) {
    if (y <= stops[0][0]) return stops[0][1];
    for (var i = 1; i < stops.length; i++) if (y <= stops[i][0]) { var a = stops[i - 1], b = stops[i]; return a[1] + (b[1] - a[1]) * (y - a[0]) / Math.max(1, b[0] - a[0]); }
    return stops[stops.length - 1][1];
  }
  window.__yFor = function (c) { for (var i = 1; i < stops.length; i++) if (c <= stops[i][1]) { var a = stops[i - 1], b = stops[i]; return a[0] + (b[0] - a[0]) * (c - a[1]) / (b[1] - a[1]); } return stops[stops.length - 1][0]; };
  function shape(t) { var x = 2 * t - 1; return .08 * t + .92 * (.5 + .5 * x * x * x); }
  function zOf(c) { var i = Math.floor(c), t = c - i; return (i + shape(t)) * L; }

  /* ---------- pointer ---------- */
  var ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  /* ---------- camera ---------- */
  var cam = { z: zOf(.5), vz: 0, speed: 0, x: 0, y: 0, roll: 0, time: 0 }, dirty = true, lastT = 0;
  var VP = new Float32Array(16);
  function buildVP(sx, sy) {
    var near = .25, far = 300, A = (far + near) / (far - near), B = -2 * far * near / (far - near);
    var yaw = ptr.sx * .035, pitch = ptr.sy * .022, roll = cam.roll;
    var cy = Math.cos(yaw), sya = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), srr = Math.sin(roll);
    /* R = Rz * Rx * Ry */
    var r00 = cr * cy + srr * sp * sya, r01 = -srr * cp, r02 = -cr * sya + srr * sp * cy;
    var r10 = srr * cy - cr * sp * sya, r11 = cr * cp, r12 = -srr * sya - cr * sp * cy;
    var r20 = cp * sya, r21 = sp, r22 = cp * cy;
    var tx = -(r00 * cam.x + r01 * cam.y + r02 * cam.z), ty = -(r10 * cam.x + r11 * cam.y + r12 * cam.z), tz = -(r20 * cam.x + r21 * cam.y + r22 * cam.z);
    var fx = focal / aspect, fy = focal;
    /* column-major P*V with lens shift */
    VP[0] = fx * r00 + sx * r20; VP[1] = fy * r10 + sy * r20; VP[2] = A * r20; VP[3] = r20;
    VP[4] = fx * r01 + sx * r21; VP[5] = fy * r11 + sy * r21; VP[6] = A * r21; VP[7] = r21;
    VP[8] = fx * r02 + sx * r22; VP[9] = fy * r12 + sy * r22; VP[10] = A * r22; VP[11] = r22;
    VP[12] = fx * tx + sx * tz; VP[13] = fy * ty + sy * tz; VP[14] = A * tz + B; VP[15] = tz;
  }

  /* ---------- draw helpers ---------- */
  var vaoS, vaoT, instBuf, tLabelPrices, tLabelStart, tAtlas;
  function bindSprites(offset) {
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    var st = INST * 4, o = offset * st;
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, st, o);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, st, o + 12);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, st, o + 20);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, st, o + 28);
    gl.vertexAttribPointer(5, 4, gl.FLOAT, false, st, o + 44);
  }
  function drawRange(rg) { if (!rg[1]) return; bindSprites(rg[0]); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, rg[1]); }
  function useSprites(mirror) {
    gl.useProgram(spriteP.p); gl.bindVertexArray(vaoS);
    var u = spriteP.u;
    gl.uniformMatrix4fv(u.u_vp, false, VP); gl.uniform1f(u.u_mirror, mirror ? 1 : 0); gl.uniform1f(u.u_floor, FLOOR); gl.uniform1f(u.u_time, cam.time); gl.uniform1f(u.u_stretch, cam.speed); gl.uniform1f(u.u_len, L);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tAtlas); gl.uniform1i(u.u_atlas, 0);
  }
  function useTiles(mirror) {
    gl.useProgram(tileP.p); gl.bindVertexArray(vaoT);
    var u = tileP.u; gl.uniformMatrix4fv(u.u_vp, false, VP); gl.uniform1f(u.u_mirror, mirror ? 1 : 0); gl.uniform1f(u.u_floor, FLOOR); gl.uniform1i(u.u_tex, 0);
    gl.activeTexture(gl.TEXTURE0);
  }
  function drawScreen(tex, cx, cy, cz, hx, hy, q, yaw, tint, g, sat) {
    var u = tileP.u;
    gl.bindBuffer(gl.ARRAY_BUFFER, g.buf); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 16, 0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform3f(u.u_c, cx, cy, cz); gl.uniform2f(u.u_hs, hx, hy); gl.uniform2f(u.u_grid, g.c, g.r); gl.uniform1f(u.u_q, q); gl.uniform1f(u.u_yaw, yaw); gl.uniform3fv(u.u_tint, tint); gl.uniform1f(u.u_sat, sat);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, g.n);
  }
  function portalQ(i) { return 1 - ((i + 1) * L - cam.z) / SHATTER; } // portal at end of room i

  function drawRoom(i, nearest, mirrorOk) {
    if (i < 0 || i >= NR) return;
    var rg = ranges[i], R = ROOMS[i], g = grid(tier.grid[0], tier.grid[1]), one = grid(1, 1), panels = i >= 1 && i <= 8 && nearest;
    /* reflection pass */
    if (mirrorOk) {
      gl.depthMask(true); gl.disable(gl.BLEND);
      useSprites(true); drawRange(rg.walls);
      useTiles(true); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      if (panels) { var pw = panelWorld(i); drawScreen(texFor(i), pw.x, pw.y, pw.z, pw.hx, pw.hy, 0, 0, R.c, one, 1.05); }
      if (i < NR - 1) drawScreen(texFor(i + 1), 0, 0, (i + 1) * L, SHW, SHH, Math.max(0, portalQ(i)), 0, ROOMS[i + 1].c, nearest ? g : one, 1.05);
      useSprites(true); gl.depthMask(false); drawRange(rg.items); gl.depthMask(true);
      useSprites(false);
      gl.uniform1f(spriteP.u.u_mirror, 0);
      gl.enable(gl.BLEND); gl.blendColor(0, 0, 0, .74); gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA); drawRange(rg.floor);
    } else {
      gl.disable(gl.BLEND); useSprites(false); drawRange(rg.floor);
    }
    /* direct pass */
    gl.disable(gl.BLEND); useSprites(false); drawRange(rg.walls);
    useTiles(false); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (i < NR - 1) drawScreen(texFor(i + 1), 0, 0, (i + 1) * L, SHW, SHH, Math.max(0, portalQ(i)), 0, ROOMS[i + 1].c, nearest ? g : one, 1.05);
    if (nearest && i > 0) { var qp = portalQ(i - 1); if (qp < 3.2) drawScreen(texFor(i), 0, 0, i * L, SHW, SHH, qp, 0, R.c, g, 1.05); }
    if (panels) {
      var pw2 = panelWorld(i);
      gl.useProgram(spriteP.p); gl.bindVertexArray(vaoS);
      drawFrame(pw2, R);
      useTiles(false);
      drawScreen(texFor(i), pw2.x, pw2.y, pw2.z, pw2.hx, pw2.hy, 0, 0, R.c, one, 1.05);
    }
    useSprites(false); gl.depthMask(false); drawRange(rg.items); gl.depthMask(true);
  }
  /* Thick ink frame around the room's own site panel, drawn from a tiny dynamic buffer. */
  var frameBuf;
  function drawFrame(p, R) {
    var t = .22, d = new Float32Array(INST), z = p.z + .04, col = R.ink === '#FFFFFF' ? R.cb : R.ci;
    d.set([p.x, p.y, z, p.hx + t, p.hy + t, 0, 0, col[0], col[1], col[2], 1, 0, 0, 0, 0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, frameBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, d);
    useSprites(false);
    var st = INST * 4;
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, st, 0);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, st, 12);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, st, 20);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, st, 28);
    gl.vertexAttribPointer(5, 4, gl.FLOAT, false, st, 44);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1);
  }

  /* ---------- DOM layers follow the same camera ---------- */
  var odo = $('#odo'), lastOdo = '', lastThemeRoom = -1, themeMeta = $('meta[name="theme-color"]');
  function updateDom(room, zf, sx, sy, dtSmooth) {
    layers.forEach(function (ly) {
      var i = ly.i, near = i === room || i === room - 1 || i === room + 1;
      var active = i === room;
      if (!near) { if (ly.on) { ly.on = false; ly.el.classList.remove('on'); } return; }
      if (active !== ly.on) { ly.on = active; ly.el.classList.toggle('on', active); }
      if (!active) return;
      var dwell = (i + .5) * L;
      var vx = (sx * .5 + .5) * vw - ly.vpx, vy = (.5 - sy * .5) * vh - ly.vpy;
      for (var k = 0; k < ly.list.length; k++) {
        var a = ly.list[k], dist = dwell + a.d - cam.z, s = a.d / Math.max(dist, .05);
        if (s > 7) s = 7;
        var op = Math.min(1, Math.max(0, (s - .34) / .2));
        if (i === 0 && cam.z < dwell) op = 1;
        var out = dist / a.d; if (out < .55) op *= Math.max(0, (out - .22) / .33);
        var fp = focal * vh * .5;
        var px = -(cam.x) * fp / a.d * .4 * s, py = (cam.y) * fp / a.d * .4 * s;
        a.el.style.transform = 'translate3d(' + (vx * (1 - Math.min(s, 1)) + px).toFixed(1) + 'px,' + (vy * (1 - Math.min(s, 1)) + py).toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
        a.el.style.opacity = op.toFixed(3);
      }
    });
    if (room !== lastThemeRoom) { lastThemeRoom = room; themeMeta.setAttribute('content', ROOMS[room].bg); stage.style.background = ROOMS[room].bg; }
    var t = room >= 1 && room <= 8 ? pad(room) + ' / 08' : '';
    if (t !== lastOdo) { odo.textContent = t; lastOdo = t; }
  }

  /* ---------- end-section tilt, driven by scroll only ---------- */
  var tilts = [];
  function updateTilts(y) {
    for (var i = 0; i < tilts.length; i++) {
      var t = tilts[i], c = t.top + t.h / 2 - y - vh / 2, k = Math.max(-1, Math.min(1, c / vh));
      if (Math.abs(k) >= 1) continue;
      t.el.style.transform = 'perspective(1400px) translateZ(' + (-Math.abs(k) * 220).toFixed(1) + 'px) rotateX(' + (k * t.rx).toFixed(2) + 'deg) rotateY(' + (k * t.ry).toFixed(2) + 'deg)';
    }
  }
  function collectTilts() {
    tilts = [];
    [].slice.call(doc.querySelectorAll('.tier,.q-panel')).forEach(function (el, i) {
      el.style.transform = 'none'; var r = el.getBoundingClientRect();
      tilts.push({ el: el, top: r.top + scrollY, h: r.height, rx: el.classList.contains('tier') ? 16 : 10, ry: el.classList.contains('tier') ? (i - 1) * 12 : -6 });
    });
  }

  /* ---------- frame ---------- */
  var stats = window.__fly = { ms: [], tier: function () { return tierN; }, uploads: function () { return pool.map(function (s) { return { site: s.site, ready: s.ready, up: s.uploads, t: s.v.currentTime, paused: s.v.paused }; }); }, cam: cam };
  var slowCount = 0, msHist = [], firstFrames = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(.05, (now - lastT) / 1000 || .016); lastT = now;
    var targetZ = zOf(cAt(window.scrollY));
    var oldZ = cam.z;
    cam.z += (targetZ - cam.z) * (1 - Math.exp(-dt * 8));
    if (Math.abs(targetZ - cam.z) < .0015) cam.z = targetZ;
    var vz = (cam.z - oldZ) / Math.max(dt, .001);
    cam.vz += (vz - cam.vz) * .25;
    cam.speed = Math.min(1, Math.abs(cam.vz) / 150);
    ptr.sx += (ptr.x - ptr.sx) * (1 - Math.exp(-dt * 4)); ptr.sy += (ptr.y - ptr.sy) * (1 - Math.exp(-dt * 4));
    if (!paused) cam.time += dt;

    var room = Math.min(NR - 1, Math.max(0, Math.floor(cam.z / L))), zf = cam.z / L - room;
    var bell = 1 - smooth(.1, .32, Math.abs(zf - .5));
    var ls = lensFor(room), sx = ls[0] * bell, sy = ls[1] * bell;
    /* last room's end: never leaves the dwell point */
    var sway = 1;
    cam.x = ptr.sx * 2.2 * (.4 + .6 * bell) + Math.sin(cam.time * .31) * .5 * sway * bell;
    cam.y = -ptr.sy * 1.3 * (.4 + .6 * bell) + Math.sin(cam.time * .23 + 1.) * .3 * sway * bell;
    cam.roll = Math.sin(cam.z * .021) * .05 * (1 - bell) * Math.min(1, cam.speed * 3) * (room % 2 ? 1 : -1) + ptr.sx * -.012;

    assignVideos(now, room, zf);
    var settled = Math.abs(cam.vz) < .01 && Math.abs(ptr.x - ptr.sx) + Math.abs(ptr.y - ptr.sy) < .002;
    if (paused && settled && !dirty) return;
    dirty = false; frameN++;

    uploadVideos();
    buildVP(sx, sy);

    var target = tier.post ? (tier.msaa ? msFbo : fbo) : null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, W, H);
    var c = ROOMS[room].c; gl.clearColor(c[0], c[1], c[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);

    if (room + 1 < NR) drawRoom(room + 1, false, false);
    drawRoom(room, true, tier.mirror);
    gl.depthMask(true);

    /* burst lens at the plane of each portal */
    var dPass = Math.min(Math.abs(cam.z - room * L), Math.abs(cam.z - (room + 1) * L));
    var burst = Math.exp(-dPass / 7) * Math.min(1, cam.speed * 2.2);
    if (tier.post) {
      if (tier.msaa) { gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbo); gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.useProgram(postP.p); gl.bindVertexArray(vaoP);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, colorTex);
      gl.uniform1i(postP.u.u_t, 0); gl.uniform2f(postP.u.u_vpc, sx * .5 + .5, sy * .5 + .5);
      gl.uniform1f(postP.u.u_amt, cam.speed); gl.uniform1f(postP.u.u_burst, burst); gl.uniform1f(postP.u.u_asp, aspect); gl.uniform1f(postP.u.u_time, (now * .001) % 7);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    updateDom(room, zf, sx, sy, dt);
    updateTilts(window.scrollY);

    /* adaptive quality */
    stats.ms.push(dt * 1000); if (stats.ms.length > 600) stats.ms.shift();
    msHist.push(dt * 1000); if (msHist.length > 50) msHist.shift();
    firstFrames++;
    if (firstFrames > 90 && msHist.length === 50 && forced === null) {
      var avg = msHist.reduce(function (a, b) { return a + b; }, 0) / 50;
      if (avg > 23 && tierN > 0 && !doc.hidden) { tierN--; tier = TIERS[tierN]; msHist.length = 0; firstFrames = 0; setupSize(); }
    }
  }
  function setupSize() { var dpr = Math.min(devicePixelRatio || 1, tier.dpr); W = Math.round(vw * dpr); H = Math.round(vh * dpr); cv.width = W; cv.height = H; setupFbo(); dirty = true; }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  /* ---------- pause ---------- */
  uiPause.addEventListener('click', function () {
    paused = !paused;
    uiPause.setAttribute('aria-pressed', String(paused));
    uiPause.querySelector('.lbl').textContent = paused ? 'Play motion' : 'Pause motion';
    pool.forEach(function (s) { if (s.site >= 0) { if (paused) s.v.pause(); else { var p = s.v.play(); if (p && p.catch) p.catch(function () {}); } } });
    lastAssign = 0; dirty = true;
  });
  doc.addEventListener('visibilitychange', function () { pool.forEach(function (s) { if (s.site < 0) return; if (doc.hidden) s.v.pause(); else if (!paused) { var p = s.v.play(); if (p && p.catch) p.catch(function () {}); } }); });

  /* Keyboard: focusing a link in a room flies there. */
  rooms.addEventListener('focusin', function (e) {
    var r = e.target.closest('.room'); if (!r) return;
    var y = dwellY[+r.dataset.i]; if (y === undefined) return;
    if (Math.abs(scrollY - y) > 4) { scrollTo({ top: y, behavior: 'instant' }); cam.z = zOf(cAt(y)); cam.vz = 0; dirty = true; }
  });

  /* ---------- boot ---------- */
  var vaoP;
  fontsReady().then(function () {
    instBuf = buildWorld();
    tAtlas = newTex();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, ATLAS, ATLAS, 0, gl.RED, gl.UNSIGNED_BYTE, atlasData);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    mipped(tAtlas);
    tLabelPrices = labelTex(['What', 'it costs'], '#FFFFFF', '#0B2BFF');
    tLabelStart = labelTex(['Start a', 'project'], '#000000', '#E8FF00');

    vaoS = gl.createVertexArray(); gl.bindVertexArray(vaoS);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    [1, 2, 3, 4, 5].forEach(function (a) { gl.enableVertexAttribArray(a); gl.vertexAttribDivisor(a, 1); });
    bindSprites(0);

    vaoT = gl.createVertexArray(); gl.bindVertexArray(vaoT);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribDivisor(1, 1);

    vaoP = gl.createVertexArray(); gl.bindVertexArray(vaoP);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    frameBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, frameBuf); gl.bufferData(gl.ARRAY_BUFFER, INST * 4, gl.DYNAMIC_DRAW);

    layout(); collectTilts();
    cam.z = zOf(cAt(window.scrollY));
    var rt = 0, lastW = innerWidth, lastH = innerHeight;
    addEventListener('resize', function () {
      if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 130) return; // mobile URL bar
      lastW = innerWidth; lastH = innerHeight;
      clearTimeout(rt); rt = setTimeout(function () { layout(); collectTilts(); }, 120);
    });
    requestAnimationFrame(frame);
  });
})();
