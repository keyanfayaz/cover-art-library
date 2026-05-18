import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavStore } from '../state/navStore';
import { useLibraryStore, type Album, type Page } from '../state/libraryStore';
import { PAGE_ROWS, PAGE_COLS } from '../lib/geometry';
import { searchAlbums, type SearchResult } from '../services/musicbrainz';
import { SearchResults } from './SearchResults';

function findNextEmptySlot(
  page: Page,
  fromRow: number,
  fromCol: number,
): { row: number; col: number } | null {
  const total = PAGE_ROWS * PAGE_COLS;
  const startIdx = fromRow * PAGE_COLS + fromCol;
  for (let offset = 1; offset <= total; offset++) {
    const idx = (startIdx + offset) % total;
    const row = Math.floor(idx / PAGE_COLS);
    const col = idx % PAGE_COLS;
    const slot = page.slots.find((s) => s.row === row && s.col === col);
    if (slot && !slot.album) return { row, col };
  }
  return null;
}

export function AlbumPicker() {
  const pickerOpen = useNavStore((s) => s.pickerOpen);
  const closePicker = useNavStore((s) => s.closePicker);
  const selectSlot = useNavStore((s) => s.selectSlot);
  const pageIndex = useNavStore((s) => s.pageIndex);
  const selectedSlot = useNavStore((s) => s.selectedSlot);
  const setSlotAlbum = useLibraryStore((s) => s.setSlotAlbum);
  const pages = useLibraryStore((s) => s.pages);

  const currentPage = pages[Math.min(pageIndex, pages.length - 1)];
  const pageId = currentPage?.id;

  const currentAlbum = useMemo(() => {
    if (!currentPage || !selectedSlot) return undefined;
    return currentPage.slots.find(
      (slot) => slot.row === selectedSlot.row && slot.col === selectedSlot.col,
    )?.album;
  }, [currentPage, selectedSlot]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!pickerOpen) {
      setQuery('');
      setResults([]);
      setLoading(false);
      setError(undefined);
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError(undefined);
      return;
    }
    setLoading(true);
    setError(undefined);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const handle = window.setTimeout(async () => {
      try {
        const r = await searchAlbums(query, ac.signal);
        if (!ac.signal.aborted) {
          setResults(r);
          setLoading(false);
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Search failed');
        setLoading(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(handle);
      ac.abort();
    };
  }, [query, pickerOpen]);

  if (!pickerOpen || !pageId || !selectedSlot) return null;

  const handlePick = (r: SearchResult) => {
    const album: Album = {
      mbid: r.mbid,
      title: r.title,
      artist: r.artist,
      coverUrl: r.coverUrl,
      year: r.year,
    };
    setSlotAlbum(pageId, selectedSlot.row, selectedSlot.col, album);
    const updated = useLibraryStore.getState().pages.find((p) => p.id === pageId);
    if (updated) {
      const next = findNextEmptySlot(updated, selectedSlot.row, selectedSlot.col);
      if (next) selectSlot(next.row, next.col);
    }
  };

  const handleRemove = () => {
    setSlotAlbum(pageId, selectedSlot.row, selectedSlot.col, undefined);
  };

  return (
    <div className="pointer-events-auto absolute right-0 top-0 z-30 flex h-full w-[380px] flex-col border-l border-white/10 bg-neutral-950/85 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-200/60">
            Frame · row {selectedSlot.row + 1}, col {selectedSlot.col + 1}
          </div>
          <div className="mt-0.5 text-sm font-medium text-amber-50">
            {currentAlbum
              ? `${currentAlbum.title} — ${currentAlbum.artist}`
              : 'Pick an album'}
          </div>
        </div>
        <button
          onClick={closePicker}
          className="rounded-md px-2 py-1 text-amber-100/70 hover:bg-white/10"
          aria-label="Close picker"
        >
          ✕
        </button>
      </div>
      <div className="px-4 pb-3">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artist or album"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/40 focus:border-amber-200/60"
        />
        {currentAlbum && (
          <button
            onClick={handleRemove}
            className="mt-2 text-xs text-red-300 hover:text-red-200"
          >
            Remove album from this frame
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <SearchResults results={results} loading={loading} error={error} onPick={handlePick} />
      </div>
    </div>
  );
}
