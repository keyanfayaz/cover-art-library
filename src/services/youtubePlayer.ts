// Lightweight wrapper around the YouTube IFrame Player API that finds a video
// for an album using the official YouTube Data API v3, and exposes
// play/pause/stop + state hooks.
//
// You need a free Google Cloud API key with "YouTube Data API v3" enabled:
//   https://console.cloud.google.com/apis/library/youtube.googleapis.com
// Paste it into `.env.local` at the project root as:
//   VITE_YOUTUBE_API_KEY=ya...xx
// Free quota is 10,000 units/day; search.list costs 100 units per call, so
// you can search 100 albums/day on the free tier.

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        options: YTPlayerOptions,
      ) => YTPlayer;
      PlayerState: { UNSTARTED: -1; ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayerOptions = {
  width?: number | string;
  height?: number | string;
  videoId?: string;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { data: number; target: YTPlayer }) => void;
    onError?: (e: { data: number; target: YTPlayer }) => void;
  };
};

type YTPlayer = {
  loadVideoById: (id: string) => void;
  cueVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (v: number) => void;
  destroy: () => void;
};

export const PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

let apiPromise: Promise<void> | null = null;
function loadAPI(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    if (typeof window === 'undefined') return;
    if (window.YT && window.YT.Player) return resolve();
    const existing = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      existing?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export class MissingYouTubeKeyError extends Error {
  constructor() {
    super(
      'Missing VITE_YOUTUBE_API_KEY. Add a key to .env.local — see ' +
        'docs/youtube-api-key.md for setup (free, ~5 minutes).',
    );
    this.name = 'MissingYouTubeKeyError';
  }
}

type YTSearchResponse = {
  items?: { id?: { videoId?: string }; snippet?: { title?: string } }[];
  error?: { code: number; message: string; errors?: { reason: string }[] };
};

/**
 * Resolves an artist+album to a YouTube videoId using the official Data API v3.
 * Throws MissingYouTubeKeyError if the key isn't configured so the UI can show
 * a setup-needed message rather than a generic failure.
 */
export async function findVideoIdForAlbum(
  artist: string,
  title: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
  if (!apiKey) {
    throw new MissingYouTubeKeyError();
  }
  const q = `${artist} ${title} full album`;
  const params = new URLSearchParams({
    part: 'snippet',
    q,
    type: 'video',
    maxResults: '5',
    // Prefer longer uploads (full albums are usually >20 min) when available.
    videoDuration: 'long',
    key: apiKey,
  });
  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
  const res = await fetch(url, {
    signal: signal ?? AbortSignal.timeout(7000),
  });
  if (!res.ok) {
    // Try once more without the long-duration filter — some albums are bundled
    // as a single video that YouTube classifies as "medium".
    if (res.status === 400 || res.status === 404) {
      params.delete('videoDuration');
      const retry = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
        { signal: signal ?? AbortSignal.timeout(7000) },
      );
      if (!retry.ok) return null;
      const data = (await retry.json()) as YTSearchResponse;
      return data.items?.[0]?.id?.videoId ?? null;
    }
    // 403 / quota exceeded / key issues: surface specifics for the user.
    let body: YTSearchResponse | undefined;
    try {
      body = (await res.json()) as YTSearchResponse;
    } catch {
      // ignore
    }
    const reason = body?.error?.errors?.[0]?.reason;
    throw new Error(
      `YouTube API ${res.status}${reason ? ` (${reason})` : ''}: ${
        body?.error?.message ?? res.statusText
      }`,
    );
  }
  const data = (await res.json()) as YTSearchResponse;
  // First long video wins; if nothing matched "long", drop the filter once.
  const found = data.items?.find((i) => i.id?.videoId)?.id?.videoId;
  if (found) return found;
  params.delete('videoDuration');
  const retry = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
    { signal: signal ?? AbortSignal.timeout(7000) },
  );
  if (!retry.ok) return null;
  const retryData = (await retry.json()) as YTSearchResponse;
  return retryData.items?.[0]?.id?.videoId ?? null;
}

export type PlayerHandle = {
  cueVideo: (videoId: string) => void;
  loadVideo: (videoId: string) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  getTime: () => { position: number; duration: number };
  destroy: () => void;
  onState: (cb: (state: number) => void) => () => void;
  onError: (cb: (code: number) => void) => () => void;
};

export async function createPlayer(target: HTMLElement): Promise<PlayerHandle> {
  await loadAPI();
  if (!window.YT?.Player) throw new Error('YouTube IFrame API failed to load');

  const stateListeners = new Set<(state: number) => void>();
  const errorListeners = new Set<(code: number) => void>();

  let player: YTPlayer | null = null;

  await new Promise<void>((resolve) => {
    player = new window.YT!.Player(target, {
      width: 1,
      height: 1,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        iv_load_policy: 3,
      },
      events: {
        onReady: () => resolve(),
        onStateChange: (e) => stateListeners.forEach((cb) => cb(e.data)),
        onError: (e) => errorListeners.forEach((cb) => cb(e.data)),
      },
    });
  });

  return {
    cueVideo: (id) => player?.cueVideoById(id),
    loadVideo: (id) => player?.loadVideoById(id),
    play: () => player?.playVideo(),
    pause: () => player?.pauseVideo(),
    stop: () => player?.stopVideo(),
    setVolume: (v) => player?.setVolume(v),
    getTime: () => {
      try {
        const position = player?.getCurrentTime() ?? 0;
        const duration = player?.getDuration() ?? 0;
        return { position, duration };
      } catch {
        return { position: 0, duration: 0 };
      }
    },
    destroy: () => player?.destroy(),
    onState: (cb) => {
      stateListeners.add(cb);
      return () => stateListeners.delete(cb);
    },
    onError: (cb) => {
      errorListeners.add(cb);
      return () => errorListeners.delete(cb);
    },
  };
}
