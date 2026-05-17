import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useFocusStore } from '../state/focusStore';
import { useLibraryStore } from '../state/libraryStore';
import { ROOM_CAMERA, focusCameraTarget, gridTransform } from '../lib/geometry';
import { dampVec3 } from '../lib/tween';

export function CameraRig() {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const view = useFocusStore((s) => s.view);
  const gridId = useFocusStore((s) => s.gridId);
  const returnToRoom = useFocusStore((s) => s.returnToRoom);
  const grids = useLibraryStore((s) => s.grids);

  const target = useMemo(() => {
    if (view === 'grid' && gridId) {
      const grid = grids.find((g) => g.id === gridId);
      if (grid) {
        const t = gridTransform(grid.wall, grid.rows, grid.cols);
        return focusCameraTarget(t);
      }
    }
    return { position: ROOM_CAMERA.position.clone(), lookAt: ROOM_CAMERA.lookAt.clone() };
  }, [view, gridId, grids]);

  const lookAtCurrent = useRef(new THREE.Vector3().copy(ROOM_CAMERA.lookAt));

  useFrame((_, dt) => {
    const lambda = 5;
    dampVec3(camera.position, target.position, lambda, dt);
    dampVec3(lookAtCurrent.current, target.lookAt, lambda, dt);
    if (controls.current) {
      controls.current.target.copy(lookAtCurrent.current);
      controls.current.update();
    } else {
      camera.lookAt(lookAtCurrent.current);
    }
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'grid') returnToRoom();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, returnToRoom]);

  const focused = view === 'grid';

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      enablePan={false}
      enableZoom={!focused}
      minDistance={focused ? 1.0 : 1.5}
      maxDistance={focused ? 3.5 : 5.5}
      minPolarAngle={focused ? Math.PI / 2.7 : Math.PI / 4}
      maxPolarAngle={focused ? Math.PI / 1.85 : Math.PI / 2.05}
      minAzimuthAngle={focused ? -0.4 : -Infinity}
      maxAzimuthAngle={focused ? 0.4 : Infinity}
      rotateSpeed={focused ? 0.25 : 0.45}
    />
  );
}
