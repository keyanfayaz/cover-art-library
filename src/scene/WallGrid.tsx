import { useMemo } from 'react';
import * as THREE from 'three';
import { frameLocalPosition, gridTransform } from '../lib/geometry';
import type { WallGrid as GridData } from '../state/libraryStore';
import { useFocusStore } from '../state/focusStore';
import { VinylSleeve } from './VinylSleeve';
import { EmptySlot } from './EmptySlot';

type Props = { grid: GridData };

export function WallGrid({ grid }: Props) {
  const transform = useMemo(
    () => gridTransform(grid.wall, grid.rows, grid.cols),
    [grid.wall, grid.rows, grid.cols],
  );
  const view = useFocusStore((s) => s.view);
  const focusedId = useFocusStore((s) => s.gridId);
  const focusGrid = useFocusStore((s) => s.focusGrid);
  const selectSlot = useFocusStore((s) => s.selectSlot);
  const isFocused = view === 'grid' && focusedId === grid.id;
  const allowSlotInteraction = isFocused;

  const padX = transform.totalWidth + 0.4;
  const padY = transform.totalHeight + 0.4;

  return (
    <group
      position={transform.position}
      rotation={[0, transform.rotationY, 0]}
    >
      {/* Click target to focus this grid */}
      <mesh
        position={[0, 0, 0.005]}
        visible={!isFocused}
        onClick={(e) => {
          if (isFocused) return;
          e.stopPropagation();
          focusGrid(grid.id);
        }}
        onPointerOver={(e) => {
          if (isFocused) return;
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <planeGeometry args={[padX, padY]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {grid.slots.map((slot) => {
        const pos = frameLocalPosition(slot.row, slot.col, grid.rows, grid.cols);
        if (slot.album) {
          // Filled sleeves are always hoverable so play/edit chips can appear.
          // Click-on-body behavior is decided inside VinylSleeve based on view.
          return (
            <VinylSleeve
              key={`${slot.row}-${slot.col}`}
              album={slot.album}
              position={pos}
              gridId={grid.id}
              row={slot.row}
              col={slot.col}
              hoverable
              onEdit={() => selectSlot(slot.row, slot.col)}
            />
          );
        }
        return (
          <EmptySlot
            key={`${slot.row}-${slot.col}`}
            position={pos}
            active={allowSlotInteraction}
            onClick={
              allowSlotInteraction ? () => selectSlot(slot.row, slot.col) : undefined
            }
          />
        );
      })}
    </group>
  );
}
