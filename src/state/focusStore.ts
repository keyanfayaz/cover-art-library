import { create } from 'zustand';

export type ViewMode = 'room' | 'grid';

type FocusState = {
  view: ViewMode;
  gridId?: string;
  selectedSlot?: { row: number; col: number };
  pickerOpen: boolean;
};

type FocusActions = {
  focusGrid: (gridId: string) => void;
  returnToRoom: () => void;
  selectSlot: (row: number, col: number) => void;
  closePicker: () => void;
};

export const useFocusStore = create<FocusState & FocusActions>((set) => ({
  view: 'room',
  pickerOpen: false,
  focusGrid: (gridId) => set({ view: 'grid', gridId, selectedSlot: undefined, pickerOpen: false }),
  returnToRoom: () => set({ view: 'room', gridId: undefined, selectedSlot: undefined, pickerOpen: false }),
  selectSlot: (row, col) => set({ selectedSlot: { row, col }, pickerOpen: true }),
  closePicker: () => set({ pickerOpen: false, selectedSlot: undefined }),
}));
