import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../state/playerStore';
import {
  createPlayer,
  searchAlbumVideos,
  MissingYouTubeKeyError,
  PLAYER_STATE,
  type PlayerHandle,
} from '../services/youtubePlayer';

// Mounts a hidden YouTube IFrame Player and drives it from the playerStore.
// The iframe needs a real size and must stay in the render tree (not
// display:none, not 1×1, not opacity:0) or YouTube refuses to start playback.
// We give it a normal 320×180 size but park it far off-screen so it's
// invisible while remaining a valid, playable player.
export function HiddenYouTube() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<PlayerHandle | null>(null);
  const cancelRef = useRef<AbortController | null>(null);
  // If a videoId is requested before the player finishes initializing, hold it
  // here and flush once the player is ready.
  const pendingVideoIdRef = useRef<string | null>(null);
  const album = usePlayerStore((s) => s.album);
  const phase = usePlayerStore((s) => s.phase);
  const currentVideoId = usePlayerStore((s) => s.currentVideoId);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setError = usePlayerStore((s) => s.setError);
  const setPhase = usePlayerStore((s) => s.setPhase);
  const setResults = usePlayerStore((s) => s.setResults);
  const setResultsLoading = usePlayerStore((s) => s.setResultsLoading);
  const setCurrentVideoId = usePlayerStore((s) => s.setCurrentVideoId);
  const advanceQueue = usePlayerStore((s) => s.advanceQueue);

  // Init player once.
  useEffect(() => {
    let cancelled = false;
    if (!targetRef.current) return;
    createPlayer(targetRef.current)
      .then((handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }
        handleRef.current = handle;
        // Flush any video that was requested before the player was ready.
        if (pendingVideoIdRef.current) {
          handle.loadVideo(pendingVideoIdRef.current);
          pendingVideoIdRef.current = null;
        }
        handle.onState((state) => {
          if (state === PLAYER_STATE.PLAYING) {
            // The player starts muted so autoplay is allowed even after the
            // async video search. Once it's actually playing, unmute so the
            // album is audible without a second click.
            handle.unMute();
            handle.setVolume(80);
            setIsPlaying(true);
            setPhase('playing');
          } else if (state === PLAYER_STATE.PAUSED) {
            setIsPlaying(false);
            setPhase('paused');
          } else if (state === PLAYER_STATE.ENDED) {
            // Auto-advance through the queue; only stop when it's empty.
            if (usePlayerStore.getState().queue.length > 0) {
              advanceQueue();
            } else {
              setIsPlaying(false);
              setPhase('idle');
            }
          }
        });
        handle.onError(() => {
          setError('Could not play this album from YouTube. Try a different sleeve.');
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'YouTube player failed to load');
      });
    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a new album becomes the target, fetch ALL YouTube candidates and
  // auto-select the first as the current video.
  useEffect(() => {
    cancelRef.current?.abort();
    if (!album) {
      handleRef.current?.stop();
      return;
    }
    const ac = new AbortController();
    cancelRef.current = ac;
    setError(undefined);
    setResultsLoading(true);
    searchAlbumVideos(album.artist, album.title, ac.signal)
      .then((results) => {
        if (ac.signal.aborted) return;
        setResults(results);
        if (results.length === 0) {
          setError('No YouTube result found for this album.');
          return;
        }
        setCurrentVideoId(results[0].videoId);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        setResultsLoading(false);
        if (err instanceof MissingYouTubeKeyError) {
          setError(
            'Set VITE_YOUTUBE_API_KEY in .env.local to enable playback. See docs/youtube-api-key.md.',
          );
          return;
        }
        const msg = err instanceof Error ? err.message : 'Search failed.';
        setError(msg);
      });
  }, [album, setError, setResults, setResultsLoading, setCurrentVideoId]);

  // Load whatever the store says is the current video. This single path serves
  // the initial pick, manual swaps from the panel, and queue auto-advance.
  useEffect(() => {
    if (!currentVideoId) return;
    const handle = handleRef.current;
    if (handle) {
      handle.loadVideo(currentVideoId);
    } else {
      pendingVideoIdRef.current = currentVideoId;
    }
  }, [currentVideoId]);

  // Stop / pause / resume reactions.
  useEffect(() => {
    if (!handleRef.current) return;
    if (phase === 'stopping') {
      handleRef.current.stop();
      // Allow the visual stop animation to play, then clear album + results.
      const t = window.setTimeout(() => {
        usePlayerStore.setState({
          album: undefined,
          phase: 'idle',
          position: 0,
          duration: 0,
          results: [],
          resultsLoading: false,
          queue: [],
          currentVideoId: undefined,
        });
      }, 600);
      return () => window.clearTimeout(t);
    }
    if (phase === 'paused') handleRef.current.pause();
    if (phase === 'playing') handleRef.current.play();
  }, [phase]);

  // Poll position while playing.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      const h = handleRef.current;
      if (!h) return;
      const { position, duration } = h.getTime();
      setProgress(position, duration);
    }, 500);
    return () => window.clearInterval(id);
  }, [phase, setProgress]);

  return (
    <div
      ref={mountRef}
      aria-hidden
      style={{
        position: 'fixed',
        left: -10000,
        top: 0,
        width: 320,
        height: 180,
        pointerEvents: 'none',
      }}
    >
      <div ref={targetRef} style={{ width: 320, height: 180 }} />
    </div>
  );
}
