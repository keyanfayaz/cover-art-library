import { frameLocalPosition } from '../lib/geometry';
import type { Page } from '../state/libraryStore';
import { useNavStore } from '../state/navStore';
import { VinylSleeve } from './VinylSleeve';
import { EmptySlot } from './EmptySlot';

type Props = { page: Page; interactive: boolean };

// Renders one page's slots in local space. The parent (PageWall) owns the
// wall transform and the slide offset.
export function PageGrid({ page, interactive }: Props) {
  const selectSlot = useNavStore((s) => s.selectSlot);

  return (
    <>
      {page.slots.map((slot) => {
        const pos = frameLocalPosition(slot.row, slot.col);
        if (slot.album) {
          return (
            <VinylSleeve
              key={`${slot.row}-${slot.col}`}
              album={slot.album}
              position={pos}
              pageId={page.id}
              row={slot.row}
              col={slot.col}
              hoverable={interactive}
            />
          );
        }
        return (
          <EmptySlot
            key={`${slot.row}-${slot.col}`}
            position={pos}
            active={interactive}
            onClick={interactive ? () => selectSlot(slot.row, slot.col) : undefined}
          />
        );
      })}
    </>
  );
}
