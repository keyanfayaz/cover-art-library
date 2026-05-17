import * as THREE from 'three';

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

export function dampVec3(out: THREE.Vector3, target: THREE.Vector3, lambda: number, dt: number) {
  out.x = damp(out.x, target.x, lambda, dt);
  out.y = damp(out.y, target.y, lambda, dt);
  out.z = damp(out.z, target.z, lambda, dt);
}
