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

import type { AlbumTrack } from './musicbrainz';

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
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
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
  items?: {
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
      thumbnails?: Record<string, { url?: string } | undefined>;
    };
  }[];
  error?: { code: number; message: string; errors?: { reason: string }[] };
};

export type YouTubeResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

// A YouTube video resolved for a specific album track. `official` is true when
// it came from the artist's "Artist - Topic" channel (licensed art-track
// audio); false when it fell back to a general search.
export type TrackResult = YouTubeResult & {
  trackNo: number;
  trackTitle: string;
  official: boolean;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Searches YouTube for every plausible upload of an album using the official
 * Data API v3. Returns up to 25 results so the user can pick/swap the right
 * one. Throws MissingYouTubeKeyError if the key isn't configured so the UI can
 * show a setup-needed message rather than a generic failure.
 *
 * search.list costs 100 quota units regardless of maxResults, so fetching 25
 * is the same cost as fetching 5.
 */
export async function searchAlbumVideos(
  artist: string,
  title: string,
  signal?: AbortSignal,
): Promise<YouTubeResult[]> {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
  if (!apiKey) {
    throw new MissingYouTubeKeyError();
  }
  const params = new URLSearchParams({
    part: 'snippet',
    q: `${artist} ${title} full album`,
    type: 'video',
    maxResults: '25',
    key: apiKey,
  });
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
    { signal: signal ?? AbortSignal.timeout(7000) },
  );
  if (!res.ok) {
    // Surface quota / key / auth specifics so the UI can explain the failure.
    let body: YTSearchResponse | undefined;
    try {
      body = (await res.json()) as YTSearchResponse;
    } catch {
      // ignore parse errors
    }
    const reason = body?.error?.errors?.[0]?.reason;
    throw new Error(
      `YouTube API ${res.status}${reason ? ` (${reason})` : ''}: ${
        body?.error?.message ?? res.statusText
      }`,
    );
  }
  const data = (await res.json()) as YTSearchResponse;
  const seen = new Set<string>();
  const out: YouTubeResult[] = [];
  for (const item of data.items ?? []) {
    const videoId = item.id?.videoId;
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    const sn = item.snippet ?? {};
    const thumb =
      sn.thumbnails?.medium?.url ??
      sn.thumbnails?.default?.url ??
      sn.thumbnails?.high?.url ??
      '';
    out.push({
      videoId,
      title: decodeEntities(sn.title ?? 'Untitled'),
      channelTitle: decodeEntities(sn.channelTitle ?? ''),
      thumbnailUrl: thumb,
    });
  }
  return out;
}

/**
 * Convenience wrapper kept for existing callers: returns the first result's
 * videoId (or null). Delegates to searchAlbumVideos.
 */
export async function findVideoIdForAlbum(
  artist: string,
  title: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const results = await searchAlbumVideos(artist, title, signal);
  return results[0]?.videoId ?? null;
}

// --- Per-track resolution via the artist's "Artist - Topic" channel ---------

type TopicChannel = { channelId: string; uploadsPlaylistId: string };

const TOPIC_CACHE_KEY = 'cal:yt-topic:v1';
// `null` is a cached negative (no Topic channel for this artist).
const topicMemo = new Map<string, TopicChannel | null>();

function normalizeArtistKey(artist: string): string {
  return artist.toLowerCase().trim();
}

function readTopicCache(): Record<string, TopicChannel | null> {
  try {
    return JSON.parse(localStorage.getItem(TOPIC_CACHE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeTopicCache(key: string, value: TopicChannel | null): void {
  try {
    const all = readTopicCache();
    all[key] = value;
    localStorage.setItem(TOPIC_CACHE_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable / full — memo cache still covers the session.
  }
}

// Strips punctuation, diacritics, feature credits and version/remaster suffixes
// so MusicBrainz track titles match the artist's Topic uploads.
export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(feat\.?[^)]*\)/g, '')
    .replace(/\bfeat\.?\b.*$/g, '')
    .replace(/[-–—(]\s*(\d{4}\s*)?(remaster(ed)?|mono|stereo|single|radio|deluxe)\b[^)]*\)?/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function apiKeyOrThrow(): string {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
  if (!apiKey) throw new MissingYouTubeKeyError();
  return apiKey;
}

async function ytFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, {
    signal: signal ?? AbortSignal.timeout(7000),
  });
  if (!res.ok) {
    let body: YTSearchResponse | undefined;
    try {
      body = (await res.json()) as YTSearchResponse;
    } catch {
      // ignore parse errors
    }
    const reason = body?.error?.errors?.[0]?.reason;
    throw new Error(
      `YouTube API ${res.status}${reason ? ` (${reason})` : ''}: ${
        body?.error?.message ?? res.statusText
      }`,
    );
  }
  return (await res.json()) as T;
}

/**
 * Finds the artist's auto-generated "Artist - Topic" channel and its uploads
 * playlist. The channel search costs 100 quota units, so the result (including
 * negatives) is cached per artist in memory and localStorage — replays and
 * other albums by the same artist then cost nothing.
 */
export async function resolveTopicChannel(
  artist: string,
  signal?: AbortSignal,
): Promise<TopicChannel | null> {
  const key = normalizeArtistKey(artist);
  if (topicMemo.has(key)) return topicMemo.get(key)!;
  const persisted = readTopicCache();
  if (key in persisted) {
    topicMemo.set(key, persisted[key]);
    return persisted[key];
  }

  const apiKey = apiKeyOrThrow();
  const search = await ytFetch<{
    items?: { snippet?: { title?: string; channelId?: string } }[];
  }>(
    `search?part=snippet&type=channel&maxResults=5&key=${apiKey}&q=${encodeURIComponent(
      `${artist} - Topic`,
    )}`,
    signal,
  );
  const want = `${normalizeArtistKey(artist)} - topic`;
  const match =
    search.items?.find(
      (it) => (it.snippet?.title ?? '').toLowerCase().trim() === want,
    ) ??
    search.items?.find((it) =>
      (it.snippet?.title ?? '').toLowerCase().includes('- topic'),
    );
  const channelId = match?.snippet?.channelId;

  let resolved: TopicChannel | null = null;
  if (channelId) {
    const ch = await ytFetch<{
      items?: {
        contentDetails?: { relatedPlaylists?: { uploads?: string } };
      }[];
    }>(`channels?part=contentDetails&id=${channelId}&key=${apiKey}`, signal);
    const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (uploads) resolved = { channelId, uploadsPlaylistId: uploads };
  }

  topicMemo.set(key, resolved);
  writeTopicCache(key, resolved);
  return resolved;
}

/**
 * Reads every upload from a channel's uploads playlist (1 quota unit/page).
 * Capped at `maxPages` so prolific artists don't blow the page budget.
 */
export async function listChannelUploads(
  uploadsPlaylistId: string,
  signal?: AbortSignal,
  maxPages = 10,
): Promise<YouTubeResult[]> {
  const apiKey = apiKeyOrThrow();
  const out: YouTubeResult[] = [];
  let pageToken = '';
  for (let page = 0; page < maxPages; page += 1) {
    const data = await ytFetch<{
      nextPageToken?: string;
      items?: {
        snippet?: {
          title?: string;
          channelTitle?: string;
          resourceId?: { videoId?: string };
          thumbnails?: Record<string, { url?: string } | undefined>;
        };
      }[];
    }>(
      `playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}` +
        `&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`,
      signal,
    );
    for (const it of data.items ?? []) {
      const sn = it.snippet ?? {};
      const videoId = sn.resourceId?.videoId;
      if (!videoId) continue;
      out.push({
        videoId,
        title: decodeEntities(sn.title ?? 'Untitled'),
        channelTitle: decodeEntities(sn.channelTitle ?? ''),
        thumbnailUrl:
          sn.thumbnails?.medium?.url ??
          sn.thumbnails?.default?.url ??
          sn.thumbnails?.high?.url ??
          '',
      });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return out;
}

/**
 * Fallback for a track with no Topic-channel match: best general video for
 * "artist track". Costs 100 quota units, so it only runs on misses.
 */
export async function searchTrackVideo(
  artist: string,
  track: string,
  signal?: AbortSignal,
): Promise<YouTubeResult | null> {
  const apiKey = apiKeyOrThrow();
  const data = await ytFetch<YTSearchResponse>(
    `search?part=snippet&type=video&maxResults=3&key=${apiKey}` +
      `&q=${encodeURIComponent(`${artist} ${track}`)}`,
    signal,
  );
  const item = (data.items ?? []).find((i) => i.id?.videoId);
  if (!item?.id?.videoId) return null;
  const sn = item.snippet ?? {};
  return {
    videoId: item.id.videoId,
    title: decodeEntities(sn.title ?? 'Untitled'),
    channelTitle: decodeEntities(sn.channelTitle ?? ''),
    thumbnailUrl:
      sn.thumbnails?.medium?.url ??
      sn.thumbnails?.default?.url ??
      sn.thumbnails?.high?.url ??
      '',
  };
}

/**
 * Resolves every album track to a playable video, preferring the artist's
 * Topic channel uploads and falling back to a general search per unmatched
 * track. Track order is preserved; unresolved tracks are dropped.
 */
export async function resolveAlbumTrackVideos(
  artist: string,
  tracks: AlbumTrack[],
  signal?: AbortSignal,
): Promise<TrackResult[]> {
  const topic = await resolveTopicChannel(artist, signal);
  const uploads = topic
    ? await listChannelUploads(topic.uploadsPlaylistId, signal)
    : [];
  const byTitle = new Map<string, YouTubeResult>();
  for (const u of uploads) {
    const k = normalizeTitle(u.title);
    if (k && !byTitle.has(k)) byTitle.set(k, u);
  }

  const out: TrackResult[] = [];
  for (const t of tracks) {
    const key = normalizeTitle(t.title);
    const hit = byTitle.get(key);
    if (hit) {
      out.push({
        ...hit,
        trackNo: t.position,
        trackTitle: t.title,
        official: true,
      });
      continue;
    }
    const fallback = await searchTrackVideo(artist, t.title, signal);
    if (fallback) {
      out.push({
        ...fallback,
        trackNo: t.position,
        trackTitle: t.title,
        official: false,
      });
    }
  }
  return out;
}

export type PlayerHandle = {
  cueVideo: (videoId: string) => void;
  loadVideo: (videoId: string) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  mute: () => void;
  unMute: () => void;
  getTime: () => { position: number; duration: number };
  destroy: () => void;
  onState: (cb: (state: number) => void) => () => void;
  onError: (cb: (code: number) => void) => () => void;
};

export async function createPlayer(container: HTMLElement): Promise<PlayerHandle> {
  await loadAPI();
  if (!window.YT?.Player) throw new Error('YouTube IFrame API failed to load');

  const stateListeners = new Set<(state: number) => void>();
  const errorListeners = new Set<(code: number) => void>();

  let player: YTPlayer | null = null;

  // YT.Player REPLACES the element it's given with an <iframe>. If we passed
  // the React-managed ref element directly, React StrictMode's
  // mount→cleanup→mount cycle would leave the surviving player attached to a
  // detached element (iframe never in the document → YouTube won't play).
  // Instead we append our own throwaway slot to a stable container; YT swaps
  // the slot for an iframe that stays inside the still-attached container.
  const slot = document.createElement('div');
  container.appendChild(slot);

  await new Promise<void>((resolve) => {
    player = new window.YT!.Player(slot, {
      // A real (non-1×1) size is required — YouTube refuses to start playback
      // in a 1×1 / zero-size player. The host element is moved off-screen by
      // the caller so it stays invisible.
      width: 320,
      height: 180,
      playerVars: {
        // Muted autoplay is always allowed by browsers, even outside a user
        // gesture; we unmute once playback actually starts (see HiddenYouTube).
        autoplay: 1,
        mute: 1,
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
    mute: () => player?.mute(),
    unMute: () => player?.unMute(),
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
