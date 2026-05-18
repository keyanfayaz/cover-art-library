import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useNavStore } from '../state/navStore';
import { WALL_CAMERA, ROOM_CAMERA } from '../lib/geometry';
import { dampVec3 } from '../lib/tween';

export function CameraRig() {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const view = useNavStore((s) => s.view);
  const returnToRoom = useNavStore((s) => s.returnToRoom);

  const target = useMemo(() => {
    if (view === 'wall') {
      return { position: WALL_CAMERA.position.clone(), lookAt: WALL_CAMERA.lookAt.clone() };
    }
    return { position: ROOM_CAMERA.position.clone(), lookAt: ROOM_CAMERA.lookAt.clone() };
  }, [view]);

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
      if (e.key === 'Escape' && view === 'wall') returnToRoom();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, returnToRoom]);

  const focused = view === 'wall';

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
