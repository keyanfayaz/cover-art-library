import { create } from 'zustand';
import type { TrackResult } from '../services/youtubePlayer';

export type PlayingAlbum = {
  mbid: string;
  title: string;
  artist: string;
  coverUrl: string;
  // Source location on a page, used to animate the sleeve flying onto the turntable.
  sourcePageId: string;
  sourceRow: number;
  sourceCol: number;
};

// A queued track carries its album so the queue panel can group by album.
export type QueueItem = TrackResult & {
  albumMbid: string;
  albumTitle: string;
  albumArtist: string;
  albumCoverUrl: string;
};

export type PlayerPhase = 'idle' | 'flying' | 'landing' | 'playing' | 'paused' | 'stopping' | 'error';

type PlayerState = {
  album?: PlayingAlbum;
  phase: PlayerPhase;
  isPlaying: boolean;
  position: number;
  duration: number;
  error?: string;
  // Resolved per-track videos for the current album (shown in the Results
  // panel). `queue` is the album-grouped play queue; `currentVideoId` is the
  // one actually loaded in the player.
  tracks: TrackResult[];
  tracksLoading: boolean;
  queue: QueueItem[];
  currentVideoId?: string;
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
  // Tracks / queue.
  setTracks: (tracks: TrackResult[]) => void;
  setTracksLoading: (v: boolean) => void;
  setCurrentVideoId: (id: string | undefined) => void;
  playVideoNow: (r: TrackResult) => void;
  enqueue: (r: TrackResult) => void;
  enqueueAlbum: (album: PlayingAlbum, tracks: TrackResult[]) => void;
  removeFromQueue: (videoId: string) => void;
  removeAlbumFromQueue: (albumMbid: string) => void;
  clearQueue: () => void;
  moveInQueue: (videoId: string, dir: -1 | 1) => void;
  advanceQueue: () => void;
};

function toQueueItem(album: PlayingAlbum, r: TrackResult): QueueItem {
  return {
    ...r,
    albumMbid: album.mbid,
    albumTitle: album.title,
    albumArtist: album.artist,
    albumCoverUrl: album.coverUrl,
  };
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set) => ({
  album: undefined,
  phase: 'idle',
  isPlaying: false,
  position: 0,
  duration: 0,
  error: undefined,
  tracks: [],
  tracksLoading: false,
  queue: [],
  currentVideoId: undefined,

  play: (album) =>
    set({
      album,
      phase: 'flying',
      isPlaying: false,
      position: 0,
      duration: 0,
      error: undefined,
      tracks: [],
      tracksLoading: true,
      currentVideoId: undefined,
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

  setTracks: (tracks) => set({ tracks, tracksLoading: false }),
  setTracksLoading: (tracksLoading) => set({ tracksLoading }),
  setCurrentVideoId: (currentVideoId) => set({ currentVideoId }),
  playVideoNow: (r) =>
    set((s) => ({
      currentVideoId: r.videoId,
      isPlaying: false,
      // If the user picks a queued item directly, drop it from the queue.
      queue: s.queue.filter((q) => q.videoId !== r.videoId),
      // Recover from an error state when the user manually picks a video.
      phase: s.phase === 'error' || s.phase === 'idle' ? 'playing' : s.phase,
      error: undefined,
    })),
  enqueue: (r) =>
    set((s) => {
      if (!s.album) return s;
      if (r.videoId === s.currentVideoId) return s;
      if (s.queue.some((q) => q.videoId === r.videoId)) return s;
      return { queue: [...s.queue, toQueueItem(s.album, r)] };
    }),
  enqueueAlbum: (album, tracks) =>
    set((s) => {
      const have = new Set(s.queue.map((q) => q.videoId));
      const additions = tracks
        .filter((t) => !have.has(t.videoId))
        .map((t) => toQueueItem(album, t));
      return { queue: [...s.queue, ...additions] };
    }),
  removeFromQueue: (videoId) =>
    set((s) => ({ queue: s.queue.filter((q) => q.videoId !== videoId) })),
  removeAlbumFromQueue: (albumMbid) =>
    set((s) => ({ queue: s.queue.filter((q) => q.albumMbid !== albumMbid) })),
  clearQueue: () => set({ queue: [] }),
  moveInQueue: (videoId, dir) =>
    set((s) => {
      const i = s.queue.findIndex((q) => q.videoId === videoId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.queue.length) return s;
      const next = s.queue.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return { queue: next };
    }),
  advanceQueue: () =>
    set((s) => {
      if (s.queue.length > 0) {
        const [nextItem, ...rest] = s.queue;
        return {
          queue: rest,
          currentVideoId: nextItem.videoId,
          isPlaying: false,
          phase: 'playing',
        };
      }
      // Nothing queued — wind the record down like a manual stop.
      return { phase: 'stopping', isPlaying: false };
    }),
}));
