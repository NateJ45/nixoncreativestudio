/* ============================================================================
   HeroCanvas
   ============================================================================
   Foundation, edit with care.

   A WebGL hero background: a single fullscreen shader quad drawing a slow,
   organic drift of brand colors (navy base, NCS blue and sky highlights, a
   faint amber bloom). It is atmosphere, not particles or neon, so it reads as
   premium for a warm studio rather than a generic "techy" hero.

   This layers OVER the CSS .bg-aurora fallback in Hero.astro. It only mounts
   when it is genuinely safe and useful:
     - prefers-reduced-motion: reduce  -> renders nothing (the static aurora shows)
     - no WebGL support                -> renders nothing (aurora shows)
   and it stops rendering (frameloop "never") whenever the hero is scrolled off
   screen or the tab is hidden, so it never burns GPU in the background. DPR is
   capped and powerPreference is "low-power" to stay gentle on older laptops.

   Hydrated with client:only="react" (R3F does not server-render); the aurora
   beneath it means there is never a blank frame before this mounts.
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
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Aspect-correct coordinates so the drift is not stretched.
    vec2 uv = vUv;
    vec2 p = uv * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    float t = uTime * 0.025;

    float n1 = fbm(p * 1.6 + vec2(t, t * 0.6));
    float n2 = fbm(p * 2.4 - vec2(t * 0.8, t));
    float nA = fbm(p * 1.2 + vec2(-t * 0.5, t * 0.4));

    vec3 navy  = vec3(0.039, 0.086, 0.157); // #0A1628
    vec3 blue  = vec3(0.204, 0.471, 0.741); // #3478BD
    vec3 sky   = vec3(0.251, 0.667, 0.929); // #40AAED
    vec3 amber = vec3(1.000, 0.639, 0.204); // #FFA334

    vec3 col = navy;
    col = mix(col, blue, smoothstep(0.35, 0.78, n1) * 0.55);
    col = mix(col, sky,  smoothstep(0.55, 0.92, n2) * 0.30);
    // One quiet warm bloom so the field is not all-blue.
    col = mix(col, amber, smoothstep(0.62, 0.96, nA) * 0.10);

    // Gentle vignette keeps the edges moody and the center alive.
    float vig = smoothstep(1.25, 0.20, length(uv - 0.5));
    col *= mix(0.82, 1.06, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function ShaderPlane() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
    }),
    // size handled in the effect below; uniforms object stays stable
    [],
  );

  useFrame((_, delta) => {
    if (material.current) material.current.uniforms.uTime.value += delta;
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

export default function HeroCanvas() {
  const [enabled, setEnabled] = useState(false);
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always');
  const wrapRef = useRef<HTMLDivElement>(null);

  // Decide once on mount whether to render at all.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      const probe = document.createElement('canvas');
      const ok = !!(probe.getContext('webgl2') || probe.getContext('webgl'));
      if (!ok) return;
    } catch {
      return;
    }
    setEnabled(true);
  }, []);

  // Pause rendering when the hero is off-screen or the tab is hidden.
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);

  if (!enabled) return null;

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
