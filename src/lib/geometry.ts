import * as THREE from 'three';

export const ROOM = {
  width: 9,
  depth: 7,
  height: 3.2,
};

export const PAGE_ROWS = 4;
export const PAGE_COLS = 7;

export const FRAME = {
  size: 0.34,
  depth: 0.025,
  gap: 0.07,
};

export type GridTransform = {
  position: [number, number, number];
  rotationY: number;
  totalWidth: number;
  totalHeight: number;
  centerY: number;
};

export function gridDimensions(rows: number = PAGE_ROWS, cols: number = PAGE_COLS) {
  const stride = FRAME.size + FRAME.gap;
  const width = cols * FRAME.size + (cols - 1) * FRAME.gap;
  const height = rows * FRAME.size + (rows - 1) * FRAME.gap;
  return { width, height, stride };
}

// The single wall every page is hung on (the room's back wall).
export function wallTransform(): GridTransform {
  const { width: gW, height: gH } = gridDimensions();
  const halfD = ROOM.depth / 2;
  const wallOffset = 0.015;
  const centerY = 1.85;
  return {
    position: [0, centerY, -halfD + wallOffset],
    rotationY: 0,
    totalWidth: gW,
    totalHeight: gH,
    centerY,
  };
}

export const WALL = wallTransform();

export function frameLocalPosition(
  row: number,
  col: number,
  rows: number = PAGE_ROWS,
  cols: number = PAGE_COLS,
): [number, number, number] {
  const { width, height, stride } = gridDimensions(rows, cols);
  const startX = -width / 2 + FRAME.size / 2;
  const startY = height / 2 - FRAME.size / 2;
  const x = startX + col * stride;
  const y = startY - row * stride;
  return [x, y, FRAME.depth / 2];
}

// World position of a slot on the current (centered) page. Pages only ever play
// while centered on the wall, so no slide offset is needed here.
export function slotWorldPosition(
  row: number,
  col: number,
): { position: THREE.Vector3; rotationY: number } {
  const t = WALL;
  const local = frameLocalPosition(row, col);
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

// Camera framing for the one wall when focused on it.
export const WALL_CAMERA = focusCameraTarget(WALL);

// Pulled-back vantage for looking around the rest of the room.
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
