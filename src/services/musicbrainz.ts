import { coverUrl, hasCoverArt } from './coverArt';

const MB_BASE = 'https://musicbrainz.org/ws/2';
const MIN_GAP_MS = 1100;

let lastRequest = 0;
let queue: Promise<unknown> = Promise.resolve();

async function throttledFetch(url: string, signal?: AbortSignal): Promise<Response> {
  const run = async () => {
    const wait = Math.max(0, lastRequest + MIN_GAP_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequest = Date.now();
    return fetch(url, {
      headers: { Accept: 'application/json' },
      signal,
    });
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next as Promise<Response>;
}

export type MBReleaseGroup = {
  id: string;
  title: string;
  'primary-type': string | null;
  'secondary-types': string[];
  'first-release-date': string;
  'artist-credit': { name: string; artist: { id: string; name: string } }[];
};

type MBSearchResponse = {
  'release-groups': MBReleaseGroup[];
};

export type SearchResult = {
  mbid: string;
  title: string;
  artist: string;
  year?: number;
  thumbUrl: string;
  coverUrl: string;
};

const EXCLUDED_SECONDARY = new Set(['Compilation', 'Remix', 'DJ-mix', 'Mixtape/Street']);

function escapeLucene(input: string): string {
  return input.replace(/([+\-!(){}[\]^"~*?:\\/]|&&|\|\|)/g, '\\$1');
}

function pickYear(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const m = /^(\d{4})/.exec(date);
  return m ? parseInt(m[1], 10) : undefined;
}

export async function searchAlbums(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const q = `${escapeLucene(trimmed)} AND primarytype:Album`;
  const url = `${MB_BASE}/release-group/?query=${encodeURIComponent(q)}&fmt=json&limit=50`;
  const res = await throttledFetch(url, signal);
  if (!res.ok) throw new Error(`MusicBrainz error: ${res.status}`);
  const data = (await res.json()) as MBSearchResponse;
  const groups = data['release-groups'] ?? [];

  const filtered = groups.filter((g) => {
    if (g['primary-type'] !== 'Album') return false;
    const sec = g['secondary-types'] ?? [];
    return !sec.some((t) => EXCLUDED_SECONDARY.has(t));
  });

  const dedupMap = new Map<string, MBReleaseGroup>();
  for (const g of filtered) {
    const artist = g['artist-credit']?.[0]?.name ?? '';
    const key = `${artist.toLowerCase().trim()}::${g.title.toLowerCase().trim()}`;
    const existing = dedupMap.get(key);
    if (!existing) {
      dedupMap.set(key, g);
      continue;
    }
    const a = existing['first-release-date'] || '9999';
    const b = g['first-release-date'] || '9999';
    if (b < a) dedupMap.set(key, g);
  }

  const candidates = Array.from(dedupMap.values()).slice(0, 30);

  const checks = await Promise.all(
    candidates.map(async (g) => ({ g, ok: await hasCoverArt(g.id, signal) })),
  );

  return checks
    .filter((c) => c.ok)
    .map(({ g }) => ({
      mbid: g.id,
      title: g.title,
      artist: g['artist-credit']?.[0]?.name ?? 'Unknown',
      year: pickYear(g['first-release-date']),
      thumbUrl: coverUrl(g.id, 250),
      coverUrl: coverUrl(g.id, 500),
    }))
    .slice(0, 25);
}
