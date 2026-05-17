import * as THREE from 'three';

export const ROOM = {
  width: 9,
  depth: 7,
  height: 3.2,
};

export type WallId = 'back' | 'left' | 'front';

export type GridConfig = {
  id: string;
  wall: WallId;
  label: string;
  rows: number;
  cols: number;
};

export const FRAME = {
  size: 0.34,
  depth: 0.025,
  gap: 0.07,
};

export const DEFAULT_GRIDS: GridConfig[] = [
  { id: 'back', wall: 'back', label: 'Main wall', rows: 4, cols: 7 },
  { id: 'left', wall: 'left', label: 'Side wall', rows: 3, cols: 4 },
  { id: 'front', wall: 'front', label: 'Entry wall', rows: 3, cols: 4 },
];

export type GridTransform = {
  position: [number, number, number];
  rotationY: number;
  totalWidth: number;
  totalHeight: number;
  centerY: number;
};

export function gridDimensions(rows: number, cols: number) {
  const stride = FRAME.size + FRAME.gap;
  const width = cols * FRAME.size + (cols - 1) * FRAME.gap;
  const height = rows * FRAME.size + (rows - 1) * FRAME.gap;
  return { width, height, stride };
}

export function gridTransform(wall: WallId, rows: number, cols: number): GridTransform {
  const { width: gW, height: gH } = gridDimensions(rows, cols);
  const { width: roomW, depth: roomD } = ROOM;
  const halfW = roomW / 2;
  const halfD = roomD / 2;
  const wallOffset = 0.015;
  const centerY = wall === 'back' ? 1.85 : 1.55;

  switch (wall) {
    case 'back':
      return {
        position: [0, centerY, -halfD + wallOffset],
        rotationY: 0,
        totalWidth: gW,
        totalHeight: gH,
        centerY,
      };
    case 'left':
      return {
        position: [-halfW + wallOffset, centerY, 0],
        rotationY: Math.PI / 2,
        totalWidth: gW,
        totalHeight: gH,
        centerY,
      };
    case 'front':
      return {
        position: [0, centerY, halfD - wallOffset],
        rotationY: Math.PI,
        totalWidth: gW,
        totalHeight: gH,
        centerY,
      };
  }
}

export function frameLocalPosition(
  row: number,
  col: number,
  rows: number,
  cols: number,
): [number, number, number] {
  const { width, height, stride } = gridDimensions(rows, cols);
  const startX = -width / 2 + FRAME.size / 2;
  const startY = height / 2 - FRAME.size / 2;
  const x = startX + col * stride;
  const y = startY - row * stride;
  return [x, y, FRAME.depth / 2];
}

export function slotWorldPosition(
  wall: WallId,
  rows: number,
  cols: number,
  row: number,
  col: number,
): { position: THREE.Vector3; rotationY: number } {
  const t = gridTransform(wall, rows, cols);
  const local = frameLocalPosition(row, col, rows, cols);
  const m = new THREE.Matrix4();
  m.makeRotationY(t.rotationY);
  m.setPosition(t.position[0], t.position[1], t.position[2]);
  const worldVec = new THREE.Vector3(local[0], local[1], local[2]).applyMatrix4(m);
  return { position: worldVec, rotationY: t.rotationY };
}

export function focusCameraTarget(t: GridTransform): {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
} {
  const [px, py, pz] = t.position;
  const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), t.rotationY);
  const distance = Math.max(t.totalWidth, t.totalHeight) * 0.85 + 0.6;
  const camPos = new THREE.Vector3(px, py, pz).add(forward.clone().multiplyScalar(distance));
  const lookAt = new THREE.Vector3(px, py, pz);
  return { position: camPos, lookAt };
}

export const ROOM_CAMERA = {
  position: new THREE.Vector3(-2.4, 1.65, 2.6),
  lookAt: new THREE.Vector3(1.4, 1.4, -2.2),
};

export const WINDOW_WALL = {
  windowCount: 2,
  windowWidth: 1.8,
  windowHeight: 2.0,
  windowSillY: 0.55,
  windowGap: 0.45,
};
