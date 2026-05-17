import { create } from 'zustand';

export type PlayingAlbum = {
  mbid: string;
  title: string;
  artist: string;
  coverUrl: string;
  // Source location on a wall, used to animate the sleeve flying onto the turntable.
  sourceGridId: string;
  sourceRow: number;
  sourceCol: number;
};

export type PlayerPhase = 'idle' | 'flying' | 'landing' | 'playing' | 'paused' | 'stopping' | 'error';

type PlayerState = {
  album?: PlayingAlbum;
  phase: PlayerPhase;
  isPlaying: boolean;
  position: number;
  duration: number;
  error?: string;
};

type PlayerActions = {
  play: (album: PlayingAlbum) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setPhase: (phase: PlayerPhase) => void;
  setIsPlaying: (v: boolean) => void;
  setProgress: (position: number, duration: number) => void;
  setError: (err: string | undefined) => void;
};

export const usePlayerStore = create<PlayerState & PlayerActions>((set) => ({
  album: undefined,
  phase: 'idle',
  isPlaying: false,
  position: 0,
  duration: 0,
  error: undefined,

  play: (album) =>
    set({
      album,
      phase: 'flying',
      isPlaying: false,
      position: 0,
      duration: 0,
      error: undefined,
    }),
  pause: () => set({ isPlaying: false, phase: 'paused' }),
  resume: () => set({ isPlaying: true, phase: 'playing' }),
  stop: () =>
    set({
      phase: 'stopping',
      isPlaying: false,
    }),
  setPhase: (phase) => set({ phase }),
  setIsPlaying: (isPlaying) =>
    set((s) => ({
      isPlaying,
      phase: isPlaying ? 'playing' : s.phase === 'playing' ? 'paused' : s.phase,
    })),
  setProgress: (position, duration) => set({ position, duration }),
  setError: (error) =>
    set((state) => ({
      error,
      // Only mutate phase to 'error' on setting an error; clearing leaves the
      // current phase alone (unless we're already in 'error', then go idle).
      phase: error ? 'error' : state.phase === 'error' ? 'idle' : state.phase,
    })),
}));
