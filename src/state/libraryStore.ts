import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_GRIDS, type WallId } from '../lib/geometry';

export type Album = {
  mbid: string;
  title: string;
  artist: string;
  coverUrl: string;
  year?: number;
};

export type Slot = {
  row: number;
  col: number;
  album?: Album;
};

export type WallGrid = {
  id: string;
  label: string;
  wall: WallId;
  rows: number;
  cols: number;
  slots: Slot[];
};

export type Library = {
  version: 2;
  grids: WallGrid[];
  homeGridId?: string;
};

function makeSlots(rows: number, cols: number): Slot[] {
  const slots: Slot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({ row: r, col: c });
    }
  }
  return slots;
}

const defaultLibrary: Library = {
  version: 2,
  grids: DEFAULT_GRIDS.map((g) => ({
    id: g.id,
    label: g.label,
    wall: g.wall,
    rows: g.rows,
    cols: g.cols,
    slots: makeSlots(g.rows, g.cols),
  })),
};

type LibraryActions = {
  setSlotAlbum: (gridId: string, row: number, col: number, album: Album | undefined) => void;
  setHomeGrid: (gridId: string | undefined) => void;
  resetLibrary: () => void;
};

export const useLibraryStore = create<Library & LibraryActions>()(
  persist(
    (set) => ({
      ...defaultLibrary,
      setSlotAlbum: (gridId, row, col, album) =>
        set((state) => ({
          grids: state.grids.map((grid) =>
            grid.id === gridId
              ? {
                  ...grid,
                  slots: grid.slots.map((slot) =>
                    slot.row === row && slot.col === col ? { ...slot, album } : slot,
                  ),
                }
              : grid,
          ),
        })),
      setHomeGrid: (gridId) => set({ homeGridId: gridId }),
      resetLibrary: () => set({ ...defaultLibrary, homeGridId: undefined }),
    }),
    {
      name: 'cal:library:v2',
      version: 2,
    },
  ),
);

export function libraryHasAnyAlbum(library: { grids: WallGrid[] }): boolean {
  return library.grids.some((g) => g.slots.some((slot) => slot.album));
}
