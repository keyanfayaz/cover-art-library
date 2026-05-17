import { useState } from 'react';
import { FRAME } from '../lib/geometry';

const W = FRAME.size - 0.02;
const H = FRAME.size - 0.02;

type Props = {
  position: [number, number, number];
  onClick?: () => void;
  active: boolean;
};

export function EmptySlot({ position, onClick, active }: Props) {
  const [hovered, setHovered] = useState(false);
  const opacity = active ? (hovered ? 0.45 : 0.18) : 0.06;
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          if (!onClick) return;
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          if (!active) return;
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          if (!active) return;
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial color="#fff5d6" transparent opacity={opacity} />
      </mesh>
    </group>
  );
}
