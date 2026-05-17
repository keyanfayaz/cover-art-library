import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore, type PlayingAlbum } from '../state/playerStore';
import { useLibraryStore } from '../state/libraryStore';
import { slotWorldPosition, FRAME } from '../lib/geometry';

// Where the sleeve "lands" — leaning on the floor next to the credenza, beside the right speaker.
const STAND_POSITION = new THREE.Vector3(1.45, 0.42, -3.0);
const STAND_ROT_Y = -Math.PI * 0.13;
const STAND_ROT_X = -0.18; // lean back

const FLY_DURATION = 0.9; // seconds
const STOP_DURATION = 0.55;

const W = FRAME.size;
const H = FRAME.size;
const D = FRAME.depth;

function PlayingSleeveInner({ album }: { album: PlayingAlbum }) {
  const phase = usePlayerStore((s) => s.phase);
  const setPhase = usePlayerStore((s) => s.setPhase);
  const grids = useLibraryStore((s) => s.grids);

  const groupRef = useRef<THREE.Group>(null);
  const opacityRef = useRef(0);
  const phaseTimerRef = useRef(0);
  const lastPhaseRef = useRef(phase);

  const sourceInfo = useMemo(() => {
    const grid = grids.find((g) => g.id === album.sourceGridId);
    if (!grid) return null;
    return slotWorldPosition(
      grid.wall,
      grid.rows,
      grid.cols,
      album.sourceRow,
      album.sourceCol,
    );
  }, [album.sourceGridId, album.sourceRow, album.sourceCol, grids]);

  // Load texture defensively. If the cover URL fails (CORS, 404, bad URL),
  // we keep `texture` null and fall back to a plain dark sleeve — never throwing
  // out of render and tripping R3F's ErrorBoundary (which would tear down the scene).
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      album.coverUrl,
      (tex) => {
        if (cancelled) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        setTexture(tex);
      },
      undefined,
      () => {
        // Swallow load errors; placeholder stays.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [album.coverUrl]);

  // Reset the phase timer each time we enter flying or stopping.
  useEffect(() => {
    if (phase !== lastPhaseRef.current) {
      phaseTimerRef.current = 0;
      lastPhaseRef.current = phase;
    }
  }, [phase]);

  // Initialize position to source on mount.
  useEffect(() => {
    if (groupRef.current && sourceInfo) {
      groupRef.current.position.copy(sourceInfo.position);
      groupRef.current.rotation.set(0, sourceInfo.rotationY, 0);
    }
  }, [sourceInfo]);

  useFrame((_, dt) => {
    if (!groupRef.current || !sourceInfo) return;
    phaseTimerRef.current += dt;

    if (phase === 'flying') {
      const t = Math.min(1, phaseTimerRef.current / FLY_DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      const pos = sourceInfo.position.clone().lerp(STAND_POSITION, eased);
      pos.y += Math.sin(t * Math.PI) * 0.55; // arc up and down
      groupRef.current.position.copy(pos);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        sourceInfo.rotationY,
        STAND_ROT_Y,
        eased,
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(0, STAND_ROT_X, eased);
      // Add a small spin while flying
      groupRef.current.rotation.z = Math.sin(t * Math.PI * 1.4) * 0.2;
      opacityRef.current = THREE.MathUtils.damp(opacityRef.current, 1, 14, dt);
      if (t >= 1) setPhase('playing');
    } else if (phase === 'stopping') {
      const t = Math.min(1, phaseTimerRef.current / STOP_DURATION);
      opacityRef.current = 1 - t;
    } else {
      // playing / paused / idle-while-album-still-set: settle at stand
      groupRef.current.position.lerp(STAND_POSITION, 1 - Math.pow(0.001, dt));
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        STAND_ROT_Y,
        6,
        dt,
      );
      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x,
        STAND_ROT_X,
        6,
        dt,
      );
      groupRef.current.rotation.z = THREE.MathUtils.damp(
        groupRef.current.rotation.z,
        0,
        6,
        dt,
      );
      opacityRef.current = THREE.MathUtils.damp(opacityRef.current, 1, 8, dt);
    }

    groupRef.current.visible = opacityRef.current > 0.01;
    groupRef.current.traverse((node) => {
      const mesh = node as THREE.Mesh;
      const mat = mesh.material as THREE.Material | undefined;
      if (mat && 'opacity' in mat) {
        (mat as THREE.MeshStandardMaterial).transparent = true;
        (mat as THREE.MeshStandardMaterial).opacity = opacityRef.current;
        mat.depthWrite = opacityRef.current > 0.95;
      }
    });
  });

  if (!sourceInfo) return null;

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[W + 0.02, H + 0.02, D]} />
        <meshStandardMaterial color="#1c1612" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, D / 2 + 0.001]}>
        <planeGeometry args={[W, H]} />
        {texture ? (
          <meshStandardMaterial map={texture} roughness={0.55} metalness={0.05} />
        ) : (
          <meshStandardMaterial color="#222" roughness={0.7} />
        )}
      </mesh>
    </group>
  );
}

export function PlayingSleeve() {
  const album = usePlayerStore((s) => s.album);
  if (!album) return null;
  return <PlayingSleeveInner album={album} />;
}
