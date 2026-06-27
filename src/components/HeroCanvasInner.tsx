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

    vec3 navy  = vec3(0.039, 0.086, 0.157); // #0A1628
    vec3 blue  = vec3(0.204, 0.471, 0.741); // #3478BD
    vec3 sky   = vec3(0.251, 0.667, 0.929); // #40AAED
    vec3 amber = vec3(1.000, 0.639, 0.204); // #FFA334

    vec3 col = navy;
    col = mix(col, blue, clamp(f * 1.5, 0.0, 1.0));
    col = mix(col, sky, clamp(pow(f, 2.0) * 1.4, 0.0, 1.0) * 0.6);
    col = mix(col, amber, clamp(q.y * 0.5, 0.0, 1.0) * 0.10);
    // Bright flowing streaks along the crests of the warped field.
    col += sky * smoothstep(0.74, 1.0, f) * 0.18;

    // Soft sky bloom that tracks the cursor (aspect-corrected).
    vec2 m  = vec2(uMouse.x * aspect, uMouse.y);
    vec2 pu = vec2(uv.x * aspect, uv.y);
    col = mix(col, sky, smoothstep(0.45, 0.0, distance(pu, m)) * 0.18);

    // Vignette keeps the edges moody and the centre alive.
    float vig = smoothstep(1.3, 0.22, length(uv - 0.5));
    col *= mix(0.78, 1.10, vig);

    // Right-bias: fade the whole flow back to the navy base on the left so the
    // colour lives on the right half (behind the device scene) and the headline
    // side stays calm. The smoothstep gives a long, soft horizontal falloff
    // instead of a hard seam where the flow used to meet the scrim.
    col = mix(navy, col, smoothstep(0.2, 0.66, uv.x));

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
    }),
    [],
  );

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
