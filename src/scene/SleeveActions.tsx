import { Html } from '@react-three/drei';
import { useLibraryStore } from '../state/libraryStore';

type Props = {
  pageId: string;
  row: number;
  col: number;
  onChipEnter?: () => void;
  onChipLeave?: () => void;
};

// Small ✕ button shown in the top-right corner of a placed sleeve on hover.
// Clicking it removes the album from the slot (slot becomes empty).
export function SleeveActions({ pageId, row, col, onChipEnter, onChipLeave }: Props) {
  const setSlotAlbum = useLibraryStore((s) => s.setSlotAlbum);

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSlotAlbum(pageId, row, col, undefined);
  };

  return (
    <Html
      transform={false}
      center
      zIndexRange={[100, 0]}
      style={{ pointerEvents: 'none' }}
      // Top-right corner of the sleeve, slightly proud of it. Local space:
      // sleeve is W×H = 0.34×0.34 centered on origin, so corner ≈ (0.17, 0.17).
      position={[0.18, 0.18, 0.06]}
    >
      <button
        type="button"
        onClick={onDelete}
        onMouseEnter={onChipEnter}
        onMouseLeave={onChipLeave}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Remove album"
        title="Remove album"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/80 text-sm text-amber-100 shadow-lg backdrop-blur hover:bg-red-500 hover:text-white active:scale-95"
        style={{ pointerEvents: 'auto' }}
      >
        ✕
      </button>
    </Html>
  );
}
