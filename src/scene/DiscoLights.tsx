import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOM } from '../lib/geometry';
import { useCurrentTheme } from '../state/themeStore';

// Renders the disco-specific lighting + mirror ball. Active only when the
// current theme is 'disco'. Animations speed up while a record is playing.
export function DiscoLights() {
  const theme = useCurrentTheme();
  if (theme.id !== 'disco') return null;
  return <DiscoLightsInner />;
}

const COLORS = [
  '#ff2d6a', // hot pink
  '#1de9ff', // cyan
  '#8c52ff', // violet
  '#ffd60a', // amber
  '#39ff14', // electric green
  '#ff7a00', // orange
];

const BEAM_SPOTS = 6;
const PULSE_LIGHTS = 4;
const UPLIGHTS = 4;

const BPM = 110; // visual cadence; not literal beats
const BEAT_HZ = BPM / 60;
// Fixed speed multiplier — disco lights run at the same rate whether music is
// playing or not so the room doesn't feel jittery between songs.
const SPEED = 1.2;

function DiscoLightsInner() {
  const speedRef = useRef(SPEED);
  return (
    <group>
      <MirrorBall speedRef={speedRef} />
      <PulsingLights speedRef={speedRef} />
      <BackWallUplights speedRef={speedRef} />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Mirror ball: small reflective sphere hung from the ceiling, with N spotlights
// rotating around its center to fake the beams sweeping across the room.
// ──────────────────────────────────────────────────────────────────────────────

const BALL_POS = new THREE.Vector3(0, ROOM.height - 0.45, 0.4);
const BALL_RADIUS = 0.18;

function MirrorBall({ speedRef }: { speedRef: React.MutableRefObject<number> }) {
  const ballRef = useRef<THREE.Mesh>(null);
  const beamsRef = useRef<THREE.Group>(null);
  const ballTexture = useMemo(() => createMirrorBallTexture(), []);

  useFrame((_, dt) => {
    const s = speedRef.current;
    if (ballRef.current) {
      ballRef.current.rotation.y += dt * 0.6 * s;
    }
    if (beamsRef.current) {
      beamsRef.current.rotation.y += dt * 0.45 * s;
    }
  });

  return (
    <group>
      {/* Cord */}
      <mesh position={[BALL_POS.x, ROOM.height - 0.22, BALL_POS.z]}>
        <cylinderGeometry args={[0.005, 0.005, 0.36, 6]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* The ball */}
      <mesh ref={ballRef} position={BALL_POS}>
        <sphereGeometry args={[BALL_RADIUS, 32, 24]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={1}
          roughness={0.05}
          map={ballTexture}
          envMapIntensity={3}
        />
      </mesh>
      {/* Beam spotlights rotating with the ball. Each spot is white, narrow,
          and shines outward. As the group rotates they sweep across the walls. */}
      <group ref={beamsRef} position={BALL_POS}>
        {Array.from({ length: BEAM_SPOTS }).map((_, i) => (
          <Beam key={i} index={i} />
        ))}
      </group>
    </group>
  );
}

function Beam({ index }: { index: number }) {
  const angle = (index / BEAM_SPOTS) * Math.PI * 2;
  const tilt = index % 2 === 0 ? -0.35 : -0.55;
  const target = useMemo(() => {
    const t = new THREE.Object3D();
    t.position.set(Math.cos(angle) * 5, Math.sin(tilt) * 5, Math.sin(angle) * 5);
    return t;
  }, [angle, tilt]);
  return (
    <>
      <primitive object={target} />
      <spotLight
        position={[0, 0, 0]}
        target={target}
        intensity={6}
        distance={8}
        angle={0.18}
        penumbra={0.6}
        decay={1.2}
        color="#ffffff"
      />
    </>
  );
}

// Build a quick "mirror ball" texture (white facets with thin dark gridlines)
// so the ball has visual sparkle even without a real cubemap reflection.
function createMirrorBallTexture(): THREE.Texture {
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#dadce4';
  ctx.fillRect(0, 0, size, size);
  const tilesX = 24;
  const tilesY = 12;
  for (let y = 0; y < tilesY; y++) {
    for (let x = 0; x < tilesX; x++) {
      // Subtle facet brightness variation.
      const v = 0.7 + Math.random() * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${v.toFixed(2)})`;
      const w = size / tilesX;
      const h = size / tilesY;
      ctx.fillRect(x * w + 1, y * h + 1, w - 2, h - 2);
    }
  }
  // Gridlines
  ctx.strokeStyle = 'rgba(20,20,28,0.85)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= tilesX; x++) {
    ctx.beginPath();
    ctx.moveTo(x * (size / tilesX), 0);
    ctx.lineTo(x * (size / tilesX), size);
    ctx.stroke();
  }
  for (let y = 0; y <= tilesY; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * (size / tilesY));
    ctx.lineTo(size, y * (size / tilesY));
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ──────────────────────────────────────────────────────────────────────────────
// Pulsing colored point lights placed around the room.
// ──────────────────────────────────────────────────────────────────────────────

function PulsingLights({ speedRef }: { speedRef: React.MutableRefObject<number> }) {
  const lightsRef = useRef<(THREE.PointLight | null)[]>([]);
  const positions = useMemo<[number, number, number][]>(
    () => [
      [-2.5, 2.4, 1.2],
      [2.5, 2.4, 1.2],
      [-2.5, 2.4, -1.2],
      [2.5, 2.4, -1.2],
    ],
    [],
  );
  const colors = useMemo(
    () => positions.map((_, i) => new THREE.Color(COLORS[i % COLORS.length])),
    [positions],
  );
  const phases = useMemo(() => positions.map((_, i) => (i * Math.PI) / 2), [positions]);
  const tRef = useRef(0);

  useFrame((_, dt) => {
    const s = speedRef.current;
    tRef.current += dt * s;
    const t = tRef.current;
    for (let i = 0; i < PULSE_LIGHTS; i++) {
      const light = lightsRef.current[i];
      if (!light) continue;
      // Per-light pulse on the beat.
      const phase = phases[i];
      const beat = Math.sin(t * BEAT_HZ * Math.PI * 2 + phase);
      const pulse = 0.35 + Math.max(0, beat) ** 2 * 1.1;
      light.intensity = pulse * 12;
      // Slowly cycle colors.
      const cycle = (t * 0.12 + i * 0.18) % 1;
      const hueIdx = Math.floor(cycle * COLORS.length);
      const target = new THREE.Color(COLORS[hueIdx]);
      colors[i].lerp(target, 0.04);
      light.color.copy(colors[i]);
    }
  });

  return (
    <>
      {positions.map((pos, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            lightsRef.current[i] = el;
          }}
          position={pos}
          intensity={6}
          distance={4.5}
          decay={1.6}
        />
      ))}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Back-wall uplighting: colored spots at floor level near the back wall,
// pointing up the wall behind the main art grid.
// ──────────────────────────────────────────────────────────────────────────────

function BackWallUplights({ speedRef }: { speedRef: React.MutableRefObject<number> }) {
  const lightsRef = useRef<(THREE.SpotLight | null)[]>([]);
  const tRef = useRef(0);

  const slots = useMemo<{ x: number; color: string }[]>(() => {
    const xs = Array.from({ length: UPLIGHTS }, (_, i) => -3.2 + (i * 6.4) / (UPLIGHTS - 1));
    return xs.map((x, i) => ({ x, color: COLORS[(i * 2) % COLORS.length] }));
  }, []);

  // Make stable target objects pointing straight up at the wall.
  const targets = useMemo(() => {
    return slots.map((s) => {
      const obj = new THREE.Object3D();
      obj.position.set(s.x, ROOM.height - 0.2, -ROOM.depth / 2 + 0.2);
      return obj;
    });
  }, [slots]);

  useFrame((_, dt) => {
    const sp = speedRef.current;
    tRef.current += dt * sp;
    const t = tRef.current;
    slots.forEach((_s, i) => {
      const light = lightsRef.current[i];
      if (!light) return;
      // Slight intensity wobble.
      const beat = Math.sin(t * BEAT_HZ * Math.PI * 2 + i * 1.3);
      light.intensity = 4 + Math.max(0, beat) * 3;
      // Cycle base color in.
      const phase = (t * 0.1 + i * 0.25) % 1;
      const idx = Math.floor(phase * COLORS.length);
      const c = new THREE.Color(COLORS[idx]);
      light.color.lerp(c, 0.03);
    });
  });

  return (
    <group>
      {targets.map((t, i) => (
        <primitive key={`tgt-${i}`} object={t} />
      ))}
      {slots.map((s, i) => (
        <spotLight
          key={i}
          ref={(el) => {
            lightsRef.current[i] = el;
          }}
          position={[s.x, 0.1, -ROOM.depth / 2 + 0.6]}
          target={targets[i]}
          intensity={4}
          distance={6}
          angle={0.6}
          penumbra={0.7}
          decay={1.4}
          color={s.color}
        />
      ))}
    </group>
  );
}
