import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Landing hero WebGL (home.md §1) — a horizontal ribbon of ~400 glowing
 * particles forming an audio waveform; scrolling the first 100vh scrubs the
 * ribbon into an ECG pulse shape (QRS spikes). teal-400 → violet-500,
 * additive blending on ink-950.
 */

const COUNT = 420;
const SPAN = 22; // world units wide

/** ECG pulse shape: flat baseline with repeating QRS complexes. */
function ecgY(x: number): number {
  const period = 5.5;
  const p = ((x % period) + period) % period;
  // QRS: small q dip, tall R spike, S dip
  if (p > 2.0 && p <= 2.25) return -0.5 * ((p - 2.0) / 0.25);
  if (p > 2.25 && p <= 2.6) return -0.5 + 4.6 * ((p - 2.25) / 0.35);
  if (p > 2.6 && p <= 2.95) return 4.1 - 5.6 * ((p - 2.6) / 0.35);
  if (p > 2.95 && p <= 3.25) return -1.5 + 1.5 * ((p - 2.95) / 0.3);
  // gentle T wave
  if (p > 3.6 && p <= 4.6) return Math.sin(((p - 3.6) / 1.0) * Math.PI) * 0.55;
  return 0;
}

function waveY(x: number, t: number): number {
  return (
    Math.sin(x * 0.9 + t * 1.1) * 1.15 +
    Math.sin(x * 1.7 - t * 0.7) * 0.55 +
    Math.sin(x * 3.1 + t * 1.9) * 0.28
  );
}

function makeDotTexture(): THREE.Texture {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.85)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function Ribbon() {
  const pointsRef = useRef<THREE.Points>(null);
  const scrollRef = useRef(0);
  const fadeRef = useRef(0);

  const { geometry, baseX, jitter, material } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const baseX = new Float32Array(COUNT);
    const jitter = new Float32Array(COUNT);
    const teal = new THREE.Color("#2DD4BF");
    const violet = new THREE.Color("#8B5CF6");
    const tmp = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const t = i / (COUNT - 1);
      const x = -SPAN / 2 + t * SPAN + (Math.random() - 0.5) * 0.35;
      baseX[i] = x;
      jitter[i] = (Math.random() - 0.5) * (t > 0.55 ? (t - 0.55) * 4.2 : 0.25);
      tmp.copy(teal).lerp(violet, t);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.22,
      map: makeDotTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    return { geometry, baseX, jitter, material };
  }, []);

  useFrame(({ clock }) => {
    // scroll morph 0→1 across first 100vh
    const target = Math.min(Math.max(window.scrollY / window.innerHeight, 0), 1);
    scrollRef.current += (target - scrollRef.current) * 0.08;
    // fade in over ~1.5s
    fadeRef.current = Math.min(fadeRef.current + 0.012, 0.95);
    material.opacity = fadeRef.current;

    const pts = pointsRef.current;
    if (!pts) return;
    const t = clock.elapsedTime;
    const morph = scrollRef.current;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const x = baseX[i];
      const drift = x + t * 0.4; // slow rightward drift for the ECG trace
      const wy = waveY(x, t) + jitter[i] * 0.4;
      const ey = ecgY(drift) + jitter[i] * 0.06;
      arr[i * 3 + 1] = wy * (1 - morph) + ey * morph;
    }
    pos.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

export default function HeroWaveScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 50 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Ribbon />
    </Canvas>
  );
}
