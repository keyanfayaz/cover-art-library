import { create } from 'zustand';
import { useLibraryStore } from './libraryStore';

export type ViewMode = 'room' | 'wall';

type NavState = {
  view: ViewMode;
  pageIndex: number;
  selectedSlot?: { row: number; col: number };
  pickerOpen: boolean;
};

type NavActions = {
  focusWall: () => void;
  returnToRoom: () => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (index: number) => void;
  selectSlot: (row: number, col: number) => void;
  closePicker: () => void;
};

function clamp(index: number): number {
  const n = useLibraryStore.getState().pages.length;
  return Math.max(0, Math.min(index, n - 1));
}

export const useNavStore = create<NavState & NavActions>((set, get) => ({
  view: 'room',
  pageIndex: 0,
  pickerOpen: false,
  focusWall: () => set({ view: 'wall' }),
  returnToRoom: () => set({ view: 'room', selectedSlot: undefined, pickerOpen: false }),
  nextPage: () =>
    set({ pageIndex: clamp(get().pageIndex + 1), selectedSlot: undefined, pickerOpen: false }),
  prevPage: () =>
    set({ pageIndex: clamp(get().pageIndex - 1), selectedSlot: undefined, pickerOpen: false }),
  goToPage: (index) =>
    set({ pageIndex: clamp(index), selectedSlot: undefined, pickerOpen: false }),
  selectSlot: (row, col) => set({ selectedSlot: { row, col }, pickerOpen: true }),
  closePicker: () => set({ pickerOpen: false, selectedSlot: undefined }),
}));
