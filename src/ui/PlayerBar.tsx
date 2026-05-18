import { useState } from 'react';
import { usePlayerStore } from '../state/playerStore';
import { ResultsQueuePanel } from './ResultsQueuePanel';
import { QueuePanel } from './QueuePanel';

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayerBar() {
  const album = usePlayerStore((s) => s.album);
  const phase = usePlayerStore((s) => s.phase);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const error = usePlayerStore((s) => s.error);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const stop = usePlayerStore((s) => s.stop);
  const queueCount = usePlayerStore((s) => s.queue.length);
  // 'results' and 'queue' panels share the same slot above the bar, so only
  // one is open at a time.
  const [openPanel, setOpenPanel] = useState<'none' | 'results' | 'queue'>(
    'none',
  );
  const toggle = (p: 'results' | 'queue') =>
    setOpenPanel((cur) => (cur === p ? 'none' : p));

  if (!album) return null;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  let statusText = album.artist;
  if (phase === 'flying' || phase === 'landing') statusText = `Cueing up… · ${album.artist}`;
  else if (phase === 'stopping') statusText = `Lifting needle… · ${album.artist}`;
  else if (error && phase !== 'playing') statusText = error;

  return (
    <>
      <ResultsQueuePanel
        open={openPanel === 'results'}
        onClose={() => setOpenPanel('none')}
      />
      <QueuePanel
        open={openPanel === 'queue'}
        onClose={() => setOpenPanel('none')}
      />

      {/* Toggles: bottom-left, just above the media bar. */}
      <div className="pointer-events-auto absolute bottom-[5.25rem] left-4 z-30 flex items-center gap-2">
        <button
          onClick={() => toggle('results')}
          aria-label={
            openPanel === 'results' ? 'Hide tracks' : 'Show tracks'
          }
          title="Album tracks"
          className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-neutral-950/85 px-3 text-amber-100 shadow-lg backdrop-blur-xl hover:bg-neutral-900"
        >
          <span className="text-xs leading-none">
            {openPanel === 'results' ? '▼' : '▲'}
          </span>
          <span className="text-[11px] font-medium">Tracks</span>
        </button>
      </div>

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex h-20 items-center gap-4 border-t border-white/10 bg-neutral-950/85 px-4 backdrop-blur-xl">
      <img
        src={album.coverUrl}
        alt=""
        className="h-14 w-14 flex-shrink-0 rounded object-cover bg-neutral-800"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-amber-50">{album.title}</div>
        <div className="truncate text-xs text-amber-100/70">{statusText}</div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-amber-100/60">
          <span className="tabular-nums">{formatTime(position)}</span>
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-amber-300/80 transition-[width] duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>
      <button
        onClick={() => toggle('queue')}
        aria-label={openPanel === 'queue' ? 'Hide queue' : 'Show queue'}
        title="Play queue"
        className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 text-amber-100 hover:bg-white/20"
      >
        <span className="text-xs leading-none">
          {openPanel === 'queue' ? '▼' : '▲'}
        </span>
        <span className="text-[11px] font-medium">Queue</span>
        {queueCount > 0 && (
          <span className="rounded-full bg-amber-300 px-1.5 text-[10px] font-semibold text-neutral-900">
            {queueCount}
          </span>
        )}
      </button>
      <div className="flex flex-shrink-0 items-center gap-2">
        {isPlaying ? (
          <button
            onClick={pause}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-amber-100 hover:bg-white/20"
            aria-label="Pause"
          >
            ❚❚
          </button>
        ) : (
          <button
            onClick={resume}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-300 text-neutral-900 hover:bg-amber-200"
            aria-label="Play"
          >
            ▶
          </button>
        )}
        <button
          onClick={stop}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-amber-100 hover:bg-white/20"
          aria-label="Stop"
        >
          ■
        </button>
      </div>
      </div>
    </>
  );
}
