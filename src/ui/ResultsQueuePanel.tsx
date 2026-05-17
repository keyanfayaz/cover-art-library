import { usePlayerStore } from '../state/playerStore';
import type { YouTubeResult } from '../services/youtubePlayer';

type Props = {
  open: boolean;
  onClose: () => void;
};

// Scrollable panel that rises above the media bar. Lists every YouTube
// candidate for the current album so the user can swap which one plays and
// build a small queue that auto-advances.
export function ResultsQueuePanel({ open, onClose }: Props) {
  const album = usePlayerStore((s) => s.album);
  const results = usePlayerStore((s) => s.results);
  const resultsLoading = usePlayerStore((s) => s.resultsLoading);
  const error = usePlayerStore((s) => s.error);
  const queue = usePlayerStore((s) => s.queue);
  const currentVideoId = usePlayerStore((s) => s.currentVideoId);
  const playVideoNow = usePlayerStore((s) => s.playVideoNow);
  const enqueue = usePlayerStore((s) => s.enqueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const moveInQueue = usePlayerStore((s) => s.moveInQueue);

  if (!open || !album) return null;

  const queuedIds = new Set(queue.map((q) => q.videoId));

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-20 z-20 mx-auto flex max-h-[55vh] max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-neutral-950/90 backdrop-blur-xl">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-amber-100/50">
            YouTube results
          </div>
          <div className="truncate text-sm font-semibold text-amber-50">
            {album.title} — {album.artist}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close results"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-amber-100/70 hover:bg-white/10 hover:text-amber-50"
        >
          ✕
        </button>
      </div>

      <div className="overflow-y-auto">
        {/* Up next queue */}
        {queue.length > 0 && (
          <div className="border-b border-white/10">
            <div className="px-4 pb-1 pt-3 text-[10px] uppercase tracking-widest text-amber-100/50">
              Up next · {queue.length}
            </div>
            <ul className="divide-y divide-white/5">
              {queue.map((q, i) => (
                <li
                  key={q.videoId}
                  className="flex items-center gap-3 px-4 py-2"
                >
                  <img
                    src={q.thumbnailUrl}
                    alt=""
                    className="h-9 w-12 flex-shrink-0 rounded object-cover bg-neutral-800"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-amber-50">
                      {q.title}
                    </div>
                    <div className="truncate text-[11px] text-amber-100/50">
                      {q.channelTitle}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() => moveInQueue(q.videoId, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="flex h-7 w-7 items-center justify-center rounded text-amber-100/70 hover:bg-white/10 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveInQueue(q.videoId, 1)}
                      disabled={i === queue.length - 1}
                      aria-label="Move down"
                      className="flex h-7 w-7 items-center justify-center rounded text-amber-100/70 hover:bg-white/10 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeFromQueue(q.videoId)}
                      aria-label="Remove from queue"
                      className="flex h-7 w-7 items-center justify-center rounded text-amber-100/70 hover:bg-red-500/80 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Results list */}
        {resultsLoading ? (
          <div className="px-4 py-6 text-sm text-amber-100/70">Searching YouTube…</div>
        ) : error && results.length === 0 ? (
          <div className="px-4 py-6 text-sm text-red-300">{error}</div>
        ) : results.length === 0 ? (
          <div className="px-4 py-6 text-sm text-amber-100/60">No results.</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {results.map((r: YouTubeResult) => {
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
                          {r.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="truncate text-xs text-amber-100/60">
                            {r.channelTitle}
                          </span>
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
