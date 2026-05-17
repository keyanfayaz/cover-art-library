import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCurrentTheme } from '../state/themeStore';

// Color-cycling dance floor tiles, centered under the coffee-table/couch area.
// Renders only for the 'disco' theme.

const GRID_X = 6;
const GRID_Z = 4;
const TILE_SIZE = 0.5;
const FLOOR_Y = 0.012; // just above the rug to avoid z-fighting

const PALETTE = [
  new THREE.Color('#ff2d6a'),
  new THREE.Color('#1de9ff'),
  new THREE.Color('#8c52ff'),
  new THREE.Color('#ffd60a'),
  new THREE.Color('#39ff14'),
  new THREE.Color('#ff7a00'),
];

export function DanceFloor() {
  const theme = useCurrentTheme();
  if (theme.id !== 'disco') return null;
  return <DanceFloorInner />;
}

// Fixed cycling speed so the floor reads the same whether music is playing.
const SPEED = 1.2;

function DanceFloorInner() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Per-tile offset so colors don't all cycle in lockstep.
  const offsets = useMemo(() => {
    const arr: number[] = [];
    for (let z = 0; z < GRID_Z; z++) {
      for (let x = 0; x < GRID_X; x++) {
        const dx = x - (GRID_X - 1) / 2;
        const dz = z - (GRID_Z - 1) / 2;
        arr.push(Math.sqrt(dx * dx + dz * dz) * 0.4);
      }
    }
    return arr;
  }, []);

  // Place tiles once.
  useMemo(() => {
    if (!meshRef.current) return;
    let i = 0;
    for (let z = 0; z < GRID_Z; z++) {
      for (let x = 0; x < GRID_X; x++) {
        const px = (x - (GRID_X - 1) / 2) * TILE_SIZE;
        const pz = (z - (GRID_Z - 1) / 2) * TILE_SIZE + 0.4; // under couch/table
        dummy.position.set(px, FLOOR_Y, pz);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(TILE_SIZE * 0.92, TILE_SIZE * 0.92, 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        i++;
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  const tRef = useRef(0);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    tRef.current += dt * SPEED;
    const t = tRef.current;
    const count = GRID_X * GRID_Z;
    for (let i = 0; i < count; i++) {
      const phase = (t * 0.6 + offsets[i]) % PALETTE.length;
      const a = Math.floor(phase);
      const b = (a + 1) % PALETTE.length;
      const f = phase - a;
      color.copy(PALETTE[a]).lerp(PALETTE[b], f);
      // Brightness pulse so tiles "blink" subtly with the beat.
      const beat = Math.max(0, Math.sin(t * 1.8 + offsets[i] * 4));
      const k = 0.45 + beat * 0.55;
      color.multiplyScalar(k);
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  const count = GRID_X * GRID_Z;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
