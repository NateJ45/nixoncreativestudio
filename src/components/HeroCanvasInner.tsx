/* ============================================================================
   HeroCanvasInner
   ============================================================================
   Foundation, edit with care.

   The heavy half of the hero WebGL background: the Three.js + react-three-fiber
   shader that draws the domain-warped flow of brand colors (navy base, NCS blue
   + sky highlights, a faint amber bloom) with a cursor-tracking bloom.

   This module is loaded LAZILY by HeroCanvas.tsx via a dynamic import, so the
   ~235KB Three.js chunk is split out and only fetched once the browser is idle
   (after the hero has painted). Keeping three / @react-three/fiber imported only
   here is what keeps them out of the initial bundle and off the LCP path. Edit
   the GLSL below to retune the look; keep it subtle and on-brand (not neon).

   By the time this mounts, HeroCanvas has already confirmed motion is OK and
   WebGL is supported, so there are no guards here. It still pauses rendering
   (frameloop "never") when the hero is off screen or the tab is hidden.
   ============================================================================ */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

// Fullscreen quad: ignore the camera and map the [2,2] plane straight to clip
// space so it always fills the viewport.
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec2  uMouse; // 0..1, smoothed pointer position (gl uv space)
  uniform float uDark;  // 1.0 = dark theme (navy flow), 0.0 = light theme (pastel wash)

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.0 + vec2(1.3, 1.7);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 uv = vUv;
    vec2 p = vec2(uv.x * aspect, uv.y) * 1.5;
    float t = uTime * 0.09;

    // Domain warp: offset the sample point by another noise field so the
    // pattern flows and swirls instead of drifting rigidly.
    vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t * 0.55));
    float f = fbm(p + 2.6 * q);

    // Theme-aware palette. uDark=1 reproduces the dark navy flow exactly; uDark=0
    // swaps the same field to a soft, light pastel wash for light mode (a very
    // light blue-white base with gentle sky/blue variation, so it reads bright
    // and airy rather than as dark clouds on white).
    vec3 base  = mix(vec3(0.925, 0.946, 0.980), vec3(0.039, 0.086, 0.157), uDark);
    vec3 blue  = mix(vec3(0.690, 0.808, 0.940), vec3(0.204, 0.471, 0.741), uDark);
    vec3 sky   = mix(vec3(0.769, 0.878, 0.972), vec3(0.251, 0.667, 0.929), uDark);
    vec3 amber = mix(vec3(1.000, 0.902, 0.757), vec3(1.000, 0.639, 0.204), uDark);

    vec3 col = base;
    col = mix(col, blue, clamp(f * 1.5, 0.0, 1.0));
    col = mix(col, sky, clamp(pow(f, 2.0) * 1.4, 0.0, 1.0) * 0.6);
    col = mix(col, amber, clamp(q.y * 0.5, 0.0, 1.0) * mix(0.06, 0.10, uDark));
    // Bright flowing streaks along the crests: strong on dark, very gentle on
    // light (where adding light sky would only wash toward white).
    col += sky * smoothstep(0.74, 1.0, f) * mix(0.05, 0.18, uDark);

    // Soft sky bloom that tracks the cursor (aspect-corrected).
    vec2 m  = vec2(uMouse.x * aspect, uMouse.y);
    vec2 pu = vec2(uv.x * aspect, uv.y);
    col = mix(col, sky, smoothstep(0.45, 0.0, distance(pu, m)) * mix(0.10, 0.18, uDark));

    // Vignette: moody edges on dark; barely-there on light so it never greys the
    // bright surface.
    float vig = smoothstep(1.3, 0.22, length(uv - 0.5));
    col *= mix(mix(0.97, 1.01, vig), mix(0.78, 1.10, vig), uDark);

    // Left-bias: fade the whole flow back to the (theme) base on the RIGHT, so
    // the colour lives on the left half (around the headline) and the device
    // side stays calmer. (GLSL smoothstep needs edge0 < edge1, so the left
    // weighting is 1.0 - smoothstep, not swapped edges.) The long falloff keeps
    // it a soft horizontal gradient, no hard seam.
    col = mix(base, col, 1.0 - smoothstep(0.34, 0.95, uv.x));

    gl_FragColor = vec4(col, 1.0);
  }
`;

function ShaderPlane() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  // Smoothed pointer: target is set on pointermove, current eases toward it.
  const target = useRef(new THREE.Vector2(0.5, 0.5));
  const current = useRef(new THREE.Vector2(0.5, 0.5));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      // Initial theme read; the anti-FOUC script has already set .dark before
      // React hydrates, so this is accurate on first paint.
      uDark: { value: document.documentElement.classList.contains('dark') ? 1 : 0 },
    }),
    [],
  );

  // Keep the shader palette in sync with the live theme: the ThemeToggle flips
  // the .dark class on <html>, so watch that and update uDark.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      if (material.current) {
        material.current.uniforms.uDark.value = root.classList.contains('dark') ? 1 : 0;
      }
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      target.current.set(e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((_, delta) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value += delta;
    // ease current toward target (frame-rate independent)
    current.current.lerp(target.current, Math.min(1, delta * 3));
    material.current.uniforms.uMouse.value.copy(current.current);
  });

  useEffect(() => {
    if (material.current) {
      material.current.uniforms.uResolution.value.set(size.width, size.height);
    }
  }, [size]);

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function HeroCanvasInner() {
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always');
  const wrapRef = useRef<HTMLDivElement>(null);

  // Pause rendering when the hero is off screen or the tab is hidden, so the
  // shader never burns cycles on a page nobody is looking at.
  useEffect(() => {
    const el = wrapRef.current;
    let onScreen = true;
    let pageVisible = !document.hidden;
    const sync = () => setFrameloop(onScreen && pageVisible ? 'always' : 'never');

    const io = el
      ? new IntersectionObserver(
          ([entry]) => {
            onScreen = entry.isIntersecting;
            sync();
          },
          { threshold: 0 },
        )
      : null;
    if (el && io) io.observe(el);

    const onVisibility = () => {
      pageVisible = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
        style={{ width: '100%', height: '100%' }}
      >
        <ShaderPlane />
      </Canvas>
    </div>
  );
}
