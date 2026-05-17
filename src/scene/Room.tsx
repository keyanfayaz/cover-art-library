import { ROOM, WINDOW_WALL } from '../lib/geometry';

const FLOOR_COLOR = '#3d2818';
const WALL_COLOR = '#e6dcc8';
const WALL_DARK = '#cdc1ac';
const CEILING_COLOR = '#1a1612';
const TRIM_COLOR = '#7a5a3a';

const FRAME_THICKNESS = 0.06;

function WindowedWall() {
  const { depth, height } = ROOM;
  const x = ROOM.width / 2;
  const { windowCount, windowWidth, windowHeight, windowSillY, windowGap } = WINDOW_WALL;
  const totalWindowsWidth = windowCount * windowWidth + (windowCount - 1) * windowGap;
  const startZ = -totalWindowsWidth / 2;
  const sillTop = windowSillY + windowHeight;
  const wallNormal = [-1, 0, 0] as const;

  const sidePanels: JSX.Element[] = [];
  // Below windows (full width)
  sidePanels.push(
    <mesh key="below" position={[x - 0.001, windowSillY / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[depth, windowSillY]} />
      <meshStandardMaterial color={WALL_DARK} roughness={0.95} side={2} />
    </mesh>,
  );
  // Above windows (full width)
  sidePanels.push(
    <mesh
      key="above"
      position={[x - 0.001, sillTop + (height - sillTop) / 2, 0]}
      rotation={[0, -Math.PI / 2, 0]}
    >
      <planeGeometry args={[depth, height - sillTop]} />
      <meshStandardMaterial color={WALL_DARK} roughness={0.95} side={2} />
    </mesh>,
  );
  // Vertical strips at edges and between windows
  const stripBoundsZ: { from: number; to: number }[] = [];
  stripBoundsZ.push({ from: -depth / 2, to: startZ });
  for (let i = 0; i < windowCount - 1; i++) {
    const winEnd = startZ + (i + 1) * windowWidth + i * windowGap;
    stripBoundsZ.push({ from: winEnd, to: winEnd + windowGap });
  }
  stripBoundsZ.push({ from: startZ + totalWindowsWidth, to: depth / 2 });

  stripBoundsZ.forEach((bound, i) => {
    const w = bound.to - bound.from;
    if (w <= 0.001) return;
    const cz = (bound.from + bound.to) / 2;
    sidePanels.push(
      <mesh
        key={`strip-${i}`}
        position={[x - 0.001, windowSillY + windowHeight / 2, cz]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[w, windowHeight]} />
        <meshStandardMaterial color={WALL_DARK} roughness={0.95} side={2} />
      </mesh>,
    );
  });

  // Window frames + glass
  const frames: JSX.Element[] = [];
  for (let i = 0; i < windowCount; i++) {
    const cz = startZ + i * (windowWidth + windowGap) + windowWidth / 2;
    const cy = windowSillY + windowHeight / 2;
    // No glass plane — leave the cutout fully open so scene.background is visible.
    // Frame: top, bottom, left, right, plus a horizontal mullion at mid-height
    const t = FRAME_THICKNESS;
    const frameDepth = 0.06;
    // top
    frames.push(
      <mesh key={`fr-top-${i}`} position={[x - 0.02, cy + windowHeight / 2 - t / 2, cz]}>
        <boxGeometry args={[frameDepth, t, windowWidth]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.6} />
      </mesh>,
    );
    // bottom
    frames.push(
      <mesh key={`fr-bot-${i}`} position={[x - 0.02, cy - windowHeight / 2 + t / 2, cz]}>
        <boxGeometry args={[frameDepth, t, windowWidth]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.6} />
      </mesh>,
    );
    // left
    frames.push(
      <mesh key={`fr-l-${i}`} position={[x - 0.02, cy, cz - windowWidth / 2 + t / 2]}>
        <boxGeometry args={[frameDepth, windowHeight, t]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.6} />
      </mesh>,
    );
    // right
    frames.push(
      <mesh key={`fr-r-${i}`} position={[x - 0.02, cy, cz + windowWidth / 2 - t / 2]}>
        <boxGeometry args={[frameDepth, windowHeight, t]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.6} />
      </mesh>,
    );
    // mid mullion
    frames.push(
      <mesh key={`fr-mid-${i}`} position={[x - 0.02, cy, cz]}>
        <boxGeometry args={[frameDepth, t * 0.7, windowWidth]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.6} />
      </mesh>,
    );
  }

  void wallNormal;
  return (
    <group>
      {sidePanels}
      {frames}
    </group>
  );
}

export function Room() {
  const { width, depth, height } = ROOM;
  return (
    <group>
      {/* Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Rug under the couch */}
      <mesh position={[0, 0.005, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 2.4]} />
        <meshStandardMaterial color="#5a3a2c" roughness={0.95} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={CEILING_COLOR} roughness={1} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, height / 2, -depth / 2]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.9} side={2} />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, height / 2, depth / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.9} side={2} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={WALL_DARK} roughness={0.9} side={2} />
      </mesh>
      {/* Right wall = windowed */}
      <WindowedWall />
      {/* Floor baseboards (subtle) */}
      <mesh position={[0, 0.05, -depth / 2 + 0.01]}>
        <boxGeometry args={[width, 0.1, 0.02]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.05, depth / 2 - 0.01]}>
        <boxGeometry args={[width, 0.1, 0.02]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.7} />
      </mesh>
      <mesh position={[-width / 2 + 0.01, 0.05, 0]}>
        <boxGeometry args={[0.02, 0.1, depth]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.7} />
      </mesh>
    </group>
  );
}
