import { usePlayerStore } from '../state/playerStore';
import type { TrackResult } from '../services/youtubePlayer';

type Props = {
  open: boolean;
  onClose: () => void;
};

// Scrollable panel that rises above the media bar. Lists the current album's
// tracks (resolved to official "Artist - Topic" videos where possible) so the
// user can jump to a track or add it to the queue.
export function ResultsQueuePanel({ open, onClose }: Props) {
  const album = usePlayerStore((s) => s.album);
  const tracks = usePlayerStore((s) => s.tracks);
  const tracksLoading = usePlayerStore((s) => s.tracksLoading);
  const error = usePlayerStore((s) => s.error);
  const queue = usePlayerStore((s) => s.queue);
  const currentVideoId = usePlayerStore((s) => s.currentVideoId);
  const playVideoNow = usePlayerStore((s) => s.playVideoNow);
  const enqueue = usePlayerStore((s) => s.enqueue);
  const enqueueAlbum = usePlayerStore((s) => s.enqueueAlbum);

  if (!open || !album) return null;

  const queuedIds = new Set(queue.map((q) => q.videoId));

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-20 z-20 mx-auto flex max-h-[55vh] max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-neutral-950/90 backdrop-blur-xl">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-amber-100/50">
            Tracks
          </div>
          <div className="truncate text-sm font-semibold text-amber-50">
            {album.title} — {album.artist}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {tracks.length > 0 && (
            <button
              onClick={() => enqueueAlbum(album, tracks)}
              className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-amber-100 hover:bg-white/20"
            >
              Queue album
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close results"
            className="flex h-8 w-8 items-center justify-center rounded-full text-amber-100/70 hover:bg-white/10 hover:text-amber-50"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="overflow-y-auto">
        {tracksLoading ? (
          <div className="px-4 py-6 text-sm text-amber-100/70">
            Finding official tracks…
          </div>
        ) : error && tracks.length === 0 ? (
          <div className="px-4 py-6 text-sm text-red-300">{error}</div>
        ) : tracks.length === 0 ? (
          <div className="px-4 py-6 text-sm text-amber-100/60">No tracks.</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {tracks.map((r: TrackResult) => {
              const isCurrent = r.videoId === currentVideoId;
              const isQueued = queuedIds.has(r.videoId);
              return (
                <li
                  key={r.videoId}
                  className={isCurrent ? 'bg-amber-300/10' : ''}
                >
                  <div className="flex items-center gap-3 px-4 py-2">
                    <button
                      onClick={() => playVideoNow(r)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="w-5 flex-shrink-0 text-right text-xs tabular-nums text-amber-100/40">
                        {r.trackNo}
                      </span>
                      <img
                        src={r.thumbnailUrl}
                        alt=""
                        className="h-12 w-16 flex-shrink-0 rounded object-cover bg-neutral-800"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.visibility =
                            'hidden';
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-medium text-amber-50">
                          {r.trackTitle}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="truncate text-xs text-amber-100/60">
                            {r.channelTitle}
                          </span>
                          {r.official && (
                            <span className="flex-shrink-0 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                              Official
                            </span>
                          )}
                          {isCurrent && (
                            <span className="flex-shrink-0 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-semibold text-neutral-900">
                              Now playing
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => enqueue(r)}
                      disabled={isCurrent || isQueued}
                      aria-label="Add to queue"
                      title={isQueued ? 'Already queued' : 'Add to queue'}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-amber-100 hover:bg-white/20 disabled:opacity-30"
                    >
                      {isQueued ? '✓' : '+'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
