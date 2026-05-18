import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PAGE_ROWS, PAGE_COLS } from '../lib/geometry';

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

export type Page = {
  id: string;
  slots: Slot[];
};

export type Library = {
  version: 3;
  pages: Page[];
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

function makePage(): Page {
  return { id: crypto.randomUUID(), slots: makeSlots(PAGE_ROWS, PAGE_COLS) };
}

const defaultLibrary: Library = {
  version: 3,
  pages: [makePage()],
};

type LibraryActions = {
  setSlotAlbum: (pageId: string, row: number, col: number, album: Album | undefined) => void;
  addPage: () => void;
  removePage: (pageId: string) => void;
  resetLibrary: () => void;
};

export const useLibraryStore = create<Library & LibraryActions>()(
  persist(
    (set) => ({
      ...defaultLibrary,
      setSlotAlbum: (pageId, row, col, album) =>
        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === pageId
              ? {
                  ...page,
                  slots: page.slots.map((slot) =>
                    slot.row === row && slot.col === col ? { ...slot, album } : slot,
                  ),
                }
              : page,
          ),
        })),
      addPage: () => set((state) => ({ pages: [...state.pages, makePage()] })),
      removePage: (pageId) =>
        set((state) => {
          // The first page is the permanent default and can never be removed,
          // and there must always be at least one page.
          if (state.pages.length <= 1 || state.pages[0]?.id === pageId) {
            return state;
          }
          return { pages: state.pages.filter((p) => p.id !== pageId) };
        }),
      resetLibrary: () => set({ ...defaultLibrary, pages: [makePage()] }),
    }),
    {
      name: 'cal:library:v3',
      version: 3,
    },
  ),
);

export function libraryHasAnyAlbum(library: { pages: Page[] }): boolean {
  return library.pages.some((p) => p.slots.some((slot) => slot.album));
}
