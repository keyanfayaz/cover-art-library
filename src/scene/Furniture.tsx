import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOM } from '../lib/geometry';
import { usePlayerStore } from '../state/playerStore';

const COUCH_COLOR = '#3a3025';
const COUCH_CUSHION = '#4a3d2e';
const WOOD_DARK = '#2a1d12';
const WOOD_MID = '#4a3220';
const SPEAKER_COLOR = '#1d1410';
const SPEAKER_FRONT = '#0c0908';
const PLANT_LEAF = '#2f5a30';
const PLANT_LEAF_LIGHT = '#3f7a3a';
const POT = '#5b3a24';

function Couch({ position }: { position: [number, number, number] }) {
  const W = 2.4;
  const D = 0.95;
  const seatH = 0.45;
  const backH = 0.75;
  const armW = 0.18;
  const cushionGap = 0.02;
  const cushionW = (W - armW * 2 - cushionGap * 2) / 3;
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, seatH / 2, 0]}>
        <boxGeometry args={[W, seatH, D]} />
        <meshStandardMaterial color={COUCH_COLOR} roughness={0.95} />
      </mesh>
      {/* Seat cushions */}
      {[-1, 0, 1].map((i) => (
        <mesh
          key={i}
          position={[i * (cushionW + cushionGap), seatH + 0.08, 0.02]}
        >
          <boxGeometry args={[cushionW - 0.02, 0.16, D - 0.1]} />
          <meshStandardMaterial color={COUCH_CUSHION} roughness={0.95} />
        </mesh>
      ))}
      {/* Back rest */}
      <mesh position={[0, seatH + backH / 2 + 0.05, -D / 2 + 0.12]}>
        <boxGeometry args={[W - armW * 2, backH, 0.22]} />
        <meshStandardMaterial color={COUCH_COLOR} roughness={0.95} />
      </mesh>
      {/* Back cushions */}
      {[-1, 0, 1].map((i) => (
        <mesh
          key={`bc-${i}`}
          position={[i * (cushionW + cushionGap), seatH + backH / 2 + 0.05, -D / 2 + 0.32]}
        >
          <boxGeometry args={[cushionW - 0.04, backH - 0.1, 0.18]} />
          <meshStandardMaterial color={COUCH_CUSHION} roughness={0.95} />
        </mesh>
      ))}
      {/* Arms */}
      {[-1, 1].map((s) => (
        <mesh key={`arm-${s}`} position={[s * (W / 2 - armW / 2), seatH + 0.18, 0]}>
          <boxGeometry args={[armW, 0.36, D]} />
          <meshStandardMaterial color={COUCH_COLOR} roughness={0.95} />
        </mesh>
      ))}
      {/* Legs */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh key={`leg-${i}`} position={[sx * (W / 2 - 0.08), 0.06, sz * (D / 2 - 0.08)]}>
          <boxGeometry args={[0.06, 0.12, 0.06]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Credenza({ position }: { position: [number, number, number] }) {
  const W = 1.8;
  const H = 0.55;
  const D = 0.45;
  return (
    <group position={position}>
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={WOOD_MID} roughness={0.65} metalness={0.05} />
      </mesh>
      {/* Drawers */}
      {[-1, 0, 1].map((i) => (
        <mesh key={i} position={[i * (W / 3), H / 2, D / 2 + 0.001]}>
          <planeGeometry args={[W / 3 - 0.02, H - 0.05]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
      ))}
      {/* Drawer pulls */}
      {[-1, 0, 1].map((i) => (
        <mesh key={`p-${i}`} position={[i * (W / 3), H / 2, D / 2 + 0.02]}>
          <boxGeometry args={[0.12, 0.025, 0.025]} />
          <meshStandardMaterial color="#bda57c" roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
      {/* Legs */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh key={`l-${i}`} position={[sx * (W / 2 - 0.06), 0.04, sz * (D / 2 - 0.06)]}>
          <boxGeometry args={[0.05, 0.08, 0.05]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// Tonearm angles around the pivot (Y axis). REST is parked outboard; PLAY drops the
// needle over the platter. Tuned visually against the geometry below.
const TONEARM_REST_Y = -0.55;
const TONEARM_PLAY_Y = 0.55;
// Vertical lift: when not playing, the arm is raised slightly (cueing lever).
const TONEARM_REST_X = -0.06;
const TONEARM_PLAY_X = 0;
// 33⅓ rpm in rad/s (slightly exaggerated for legibility).
const PLATTER_RPM = 33.33;
const PLATTER_OMEGA = (PLATTER_RPM / 60) * 2 * Math.PI;

function Turntable({ position }: { position: [number, number, number] }) {
  const platterRef = useRef<THREE.Group>(null);
  const tonearmRef = useRef<THREE.Group>(null);
  const spinSpeedRef = useRef(0);

  useFrame((_, dt) => {
    const state = usePlayerStore.getState();
    const phase = state.phase;
    const isPlaying = state.isPlaying;
    const needleDown = phase === 'playing' || phase === 'paused';

    // Platter angular velocity: ramps up when playing, decelerates otherwise.
    const targetSpeed = isPlaying ? PLATTER_OMEGA : 0;
    spinSpeedRef.current = THREE.MathUtils.damp(spinSpeedRef.current, targetSpeed, 3, dt);
    if (platterRef.current) {
      platterRef.current.rotation.y -= spinSpeedRef.current * dt;
    }

    // Tonearm angle.
    if (tonearmRef.current) {
      const targetY = needleDown ? TONEARM_PLAY_Y : TONEARM_REST_Y;
      const targetX = needleDown ? TONEARM_PLAY_X : TONEARM_REST_X;
      tonearmRef.current.rotation.y = THREE.MathUtils.damp(
        tonearmRef.current.rotation.y,
        targetY,
        5,
        dt,
      );
      tonearmRef.current.rotation.x = THREE.MathUtils.damp(
        tonearmRef.current.rotation.x,
        targetX,
        6,
        dt,
      );
    }
  });

  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.5, 0.08, 0.4]} />
        <meshStandardMaterial color="#0e0c0a" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Platter assembly — spins as one group */}
      <group ref={platterRef} position={[-0.05, 0.085, 0]}>
        <mesh>
          <cylinderGeometry args={[0.16, 0.16, 0.012, 48]} />
          <meshStandardMaterial color="#1a1816" roughness={0.4} metalness={0.4} />
        </mesh>
        {/* Vinyl record */}
        <mesh position={[0, 0.007, 0]}>
          <cylinderGeometry args={[0.155, 0.155, 0.002, 48]} />
          <meshStandardMaterial color="#08070a" roughness={0.25} metalness={0.6} />
        </mesh>
        {/* Label */}
        <mesh position={[0, 0.009, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.001, 32]} />
          <meshStandardMaterial color="#bd3a2c" roughness={0.7} />
        </mesh>
        {/* Off-center pinhole on the label so the spin is visible */}
        <mesh position={[0.018, 0.0095, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.0005, 8]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Spindle */}
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.018, 12]} />
          <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      {/* Tonearm pivot post (static) */}
      <mesh position={[0.18, 0.085, -0.14]}>
        <cylinderGeometry args={[0.025, 0.025, 0.04, 16]} />
        <meshStandardMaterial color="#9a8a78" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Tonearm — rotates around the pivot when playing */}
      <group
        ref={tonearmRef}
        position={[0.18, 0.107, -0.14]}
        rotation={[TONEARM_REST_X, TONEARM_REST_Y, 0]}
      >
        {/* Arm extending in -X from pivot */}
        <mesh position={[-0.16, 0, 0]}>
          <boxGeometry args={[0.32, 0.012, 0.012]} />
          <meshStandardMaterial color="#cccccc" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Headshell at the tip */}
        <mesh position={[-0.32, -0.005, 0]}>
          <boxGeometry args={[0.025, 0.018, 0.022]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
        </mesh>
        {/* Counterweight on the +X side of the pivot */}
        <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.04, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

function Speaker({ position }: { position: [number, number, number] }) {
  const W = 0.34;
  const H = 1.05;
  const D = 0.36;
  return (
    <group position={position}>
      {/* Stand */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[W * 0.9, 0.12, D * 0.9]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.12 + H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={SPEAKER_COLOR} roughness={0.85} />
      </mesh>
      {/* Front baffle */}
      <mesh position={[0, 0.12 + H / 2, D / 2 + 0.001]}>
        <planeGeometry args={[W - 0.04, H - 0.04]} />
        <meshStandardMaterial color={SPEAKER_FRONT} roughness={0.95} />
      </mesh>
      {/* Tweeter */}
      <mesh position={[0, 0.12 + H * 0.78, D / 2 + 0.002]}>
        <circleGeometry args={[0.045, 32]} />
        <meshStandardMaterial color="#1a1a1d" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Mid driver */}
      <mesh position={[0, 0.12 + H * 0.55, D / 2 + 0.002]}>
        <circleGeometry args={[0.07, 32]} />
        <meshStandardMaterial color="#0d0d10" roughness={0.55} />
      </mesh>
      {/* Woofer */}
      <mesh position={[0, 0.12 + H * 0.27, D / 2 + 0.002]}>
        <circleGeometry args={[0.115, 32]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.65} />
      </mesh>
    </group>
  );
}

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Pot */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.22, 0.18, 0.36, 24]} />
        <meshStandardMaterial color={POT} roughness={0.95} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.205, 0.205, 0.02, 24]} />
        <meshStandardMaterial color="#1a1208" roughness={1} />
      </mesh>
      {/* Foliage clumps — stylized icospheres */}
      {[
        [0, 0.85, 0, 0.5, PLANT_LEAF],
        [0.18, 0.7, 0.12, 0.34, PLANT_LEAF_LIGHT],
        [-0.16, 0.78, -0.1, 0.32, PLANT_LEAF],
        [0.1, 1.05, -0.14, 0.28, PLANT_LEAF_LIGHT],
        [-0.1, 1.0, 0.16, 0.26, PLANT_LEAF],
        [0.14, 1.18, 0.05, 0.22, PLANT_LEAF_LIGHT],
      ].map((p, i) => {
        const [x, y, z, r, c] = p as [number, number, number, number, string];
        return (
          <mesh key={i} position={[x, y, z]}>
            <icosahedronGeometry args={[r, 1]} />
            <meshStandardMaterial color={c} roughness={0.95} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

function FloorLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.05, 24]} />
        <meshStandardMaterial color="#1c1612" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.6, 12]} />
        <meshStandardMaterial color="#1c1612" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.28, 24, 1, true]} />
        <meshStandardMaterial color="#e8d6a8" roughness={0.85} side={2} emissive="#ffb869" emissiveIntensity={0.45} />
      </mesh>
      <pointLight position={[0, 1.55, 0]} intensity={5} distance={4} color="#ffd28a" />
    </group>
  );
}

export function Furniture() {
  const z0 = -ROOM.depth / 2;
  return (
    <group>
      {/* Listening setup against the back wall */}
      <Credenza position={[0, 0, z0 + 0.45 / 2 + 0.05]} />
      <Turntable position={[0, 0.55, z0 + 0.55]} />
      <Speaker position={[-1.65, 0, z0 + 0.45]} />
      <Speaker position={[1.65, 0, z0 + 0.45]} />

      {/* Couch — facing the back wall */}
      <Couch position={[0, 0, 1.0]} />

      {/* Plants in corners */}
      <Plant position={[-ROOM.width / 2 + 0.55, 0, ROOM.depth / 2 - 0.55]} scale={1.0} />
      <Plant position={[ROOM.width / 2 - 0.55, 0, -ROOM.depth / 2 + 1.6]} scale={0.85} />
      <Plant position={[-ROOM.width / 2 + 0.55, 0, -ROOM.depth / 2 + 1.4]} scale={0.75} />

      {/* Floor lamp — beside the couch */}
      <FloorLamp position={[-2.3, 0, 1.1]} />

      {/* Coffee table in front of the couch */}
      <group position={[0, 0, 0.4]}>
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[1.1, 0.04, 0.55]} />
          <meshStandardMaterial color={WOOD_MID} roughness={0.45} metalness={0.1} />
        </mesh>
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <mesh key={i} position={[sx * 0.5, 0.21, sz * 0.24]}>
            <boxGeometry args={[0.04, 0.42, 0.04]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
