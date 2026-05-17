const CAA_BASE = 'https://coverartarchive.org/release-group';

export type CoverSize = 250 | 500 | 1200;

const checkedHasArt = new Map<string, boolean>();

export function coverUrl(mbid: string, size: CoverSize = 500): string {
  return `${CAA_BASE}/${mbid}/front-${size}`;
}

export async function hasCoverArt(mbid: string, signal?: AbortSignal): Promise<boolean> {
  if (checkedHasArt.has(mbid)) return checkedHasArt.get(mbid)!;
  try {
    const res = await fetch(`${CAA_BASE}/${mbid}`, { method: 'GET', signal });
    const ok = res.ok;
    checkedHasArt.set(mbid, ok);
    return ok;
  } catch {
    return false;
  }
}
