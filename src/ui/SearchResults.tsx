import type { SearchResult } from '../services/musicbrainz';

type Props = {
  results: SearchResult[];
  loading: boolean;
  error?: string;
  onPick: (r: SearchResult) => void;
};

export function SearchResults({ results, loading, error, onPick }: Props) {
  if (loading) {
    return <div className="px-4 py-6 text-sm text-amber-100/70">Searching MusicBrainz…</div>;
  }
  if (error) {
    return <div className="px-4 py-6 text-sm text-red-300">{error}</div>;
  }
  if (results.length === 0) {
    return (
      <div className="px-4 py-6 text-sm text-amber-100/60">
        Type an artist or album. Singles and re-issues are filtered out.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-white/5">
      {results.map((r) => (
        <li key={r.mbid}>
          <button
            onClick={() => onPick(r)}
            className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/5"
          >
            <img
              src={r.thumbUrl}
              alt=""
              className="h-12 w-12 rounded object-cover bg-neutral-800"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-amber-50">{r.title}</div>
              <div className="truncate text-xs text-amber-100/60">
                {r.artist}
                {r.year ? ` · ${r.year}` : ''}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
