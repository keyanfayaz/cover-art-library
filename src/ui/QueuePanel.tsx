import { useState } from 'react';
import { usePlayerStore } from '../state/playerStore';
import type { QueueItem } from '../state/playerStore';

type Props = {
  open: boolean;
  onClose: () => void;
};

type AlbumGroup = {
  mbid: string;
  title: string;
  artist: string;
  coverUrl: string;
  items: QueueItem[];
};

// Groups consecutive queue entries by album, preserving play order.
function groupByAlbum(queue: QueueItem[]): AlbumGroup[] {
  const groups: AlbumGroup[] = [];
  for (const q of queue) {
    const last = groups[groups.length - 1];
    if (last && last.mbid === q.albumMbid) {
      last.items.push(q);
    } else {
      groups.push({
        mbid: q.albumMbid,
        title: q.albumTitle,
        artist: q.albumArtist,
        coverUrl: q.albumCoverUrl,
        items: [q],
      });
    }
  }
  return groups;
}

// Separate panel that shows the up-next queue grouped by album, with per-track
// reorder/remove and per-album removal.
export function QueuePanel({ open, onClose }: Props) {
  const queue = usePlayerStore((s) => s.queue);
  const moveInQueue = usePlayerStore((s) => s.moveInQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const removeAlbumFromQueue = usePlayerStore((s) => s.removeAlbumFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (!open) return null;

  const groups = groupByAlbum(queue);
  const toggleCollapsed = (key: string) =>
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-20 z-20 mx-auto flex max-h-[55vh] max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-neutral-950/90 backdrop-blur-xl">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-amber-100/50">
            Up next · {queue.length}
          </div>
          <div className="truncate text-sm font-semibold text-amber-50">
            {groups.length} album{groups.length === 1 ? '' : 's'} queued
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-amber-100 hover:bg-red-500/70 hover:text-white"
            >
              Clear queue
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close queue"
            className="flex h-8 w-8 items-center justify-center rounded-full text-amber-100/70 hover:bg-white/10 hover:text-amber-50"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="overflow-y-auto">
        {queue.length === 0 ? (
          <div className="px-4 py-6 text-sm text-amber-100/60">
            Queue is empty. Add tracks or queue an album from the Tracks panel.
          </div>
        ) : (
          groups.map((g, gi) => {
            const groupKey = `${g.mbid}-${gi}`;
            const isCollapsed = collapsed[groupKey];
            return (
            <div key={groupKey} className="border-b border-white/10">
              <div className="flex items-center gap-3 bg-white/[0.03] px-4 py-2">
                <button
                  onClick={() => toggleCollapsed(groupKey)}
                  aria-label={isCollapsed ? 'Expand album' : 'Collapse album'}
                  aria-expanded={!isCollapsed}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="w-3 flex-shrink-0 text-xs text-amber-100/50">
                    {isCollapsed ? '▸' : '▾'}
                  </span>
                  <img
                    src={g.coverUrl}
                    alt=""
                    className="h-9 w-9 flex-shrink-0 rounded object-cover bg-neutral-800"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.visibility =
                        'hidden';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-amber-50">
                      {g.title}
                    </div>
                    <div className="truncate text-[11px] text-amber-100/50">
                      {g.artist} · {g.items.length} track
                      {g.items.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => removeAlbumFromQueue(g.mbid)}
                  aria-label="Remove album from queue"
                  title="Remove album"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-amber-100/70 hover:bg-red-500/80 hover:text-white"
                >
                  ✕
                </button>
              </div>
              {!isCollapsed && (
              <ul className="divide-y divide-white/5">
                {g.items.map((q) => {
                  const idx = queue.findIndex((x) => x.videoId === q.videoId);
                  return (
                    <li
                      key={q.videoId}
                      className="flex items-center gap-3 px-4 py-2 pl-6"
                    >
                      <span className="w-5 flex-shrink-0 text-right text-xs tabular-nums text-amber-100/40">
                        {q.trackNo}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-amber-50">
                          {q.trackTitle}
                        </div>
                        <div className="truncate text-[11px] text-amber-100/50">
                          {q.channelTitle}
                          {q.official ? ' · Official' : ''}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <button
                          onClick={() => moveInQueue(q.videoId, -1)}
                          disabled={idx === 0}
                          aria-label="Move up"
                          className="flex h-7 w-7 items-center justify-center rounded text-amber-100/70 hover:bg-white/10 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveInQueue(q.videoId, 1)}
                          disabled={idx === queue.length - 1}
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
                  );
                })}
              </ul>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
