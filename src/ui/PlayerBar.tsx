import { usePlayerStore } from '../state/playerStore';

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

  if (!album) return null;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  let statusText = album.artist;
  if (phase === 'flying' || phase === 'landing') statusText = `Cueing up… · ${album.artist}`;
  else if (phase === 'stopping') statusText = `Lifting needle… · ${album.artist}`;
  else if (error) statusText = error;

  return (
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
  );
}
