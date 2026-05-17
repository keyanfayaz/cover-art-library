import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../state/playerStore';
import {
  createPlayer,
  findVideoIdForAlbum,
  MissingYouTubeKeyError,
  PLAYER_STATE,
  type PlayerHandle,
} from '../services/youtubePlayer';

// Mounts a hidden YouTube IFrame Player and drives it from the playerStore.
// We render a tiny off-screen 1×1 div as the mount target. The iframe must be
// in the DOM (not display:none) for autoplay/audio to work in most browsers,
// so we use position:fixed and clip it.
export function HiddenYouTube() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<PlayerHandle | null>(null);
  const cancelRef = useRef<AbortController | null>(null);
  const album = usePlayerStore((s) => s.album);
  const phase = usePlayerStore((s) => s.phase);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setError = usePlayerStore((s) => s.setError);
  const setPhase = usePlayerStore((s) => s.setPhase);

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
        handle.setVolume(80);
        handle.onState((state) => {
          if (state === PLAYER_STATE.PLAYING) {
            setIsPlaying(true);
            setPhase('playing');
          } else if (state === PLAYER_STATE.PAUSED) {
            setIsPlaying(false);
            setPhase('paused');
          } else if (state === PLAYER_STATE.ENDED) {
            setIsPlaying(false);
            setPhase('idle');
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

  // Whenever a new album becomes the target, find a video and load it.
  useEffect(() => {
    cancelRef.current?.abort();
    if (!album) {
      handleRef.current?.stop();
      return;
    }
    const ac = new AbortController();
    cancelRef.current = ac;
    setError(undefined);
    findVideoIdForAlbum(album.artist, album.title, ac.signal)
      .then((videoId) => {
        if (ac.signal.aborted) return;
        if (!videoId) {
          setError('No YouTube result found for this album.');
          return;
        }
        handleRef.current?.loadVideo(videoId);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        if (err instanceof MissingYouTubeKeyError) {
          setError(
            'Set VITE_YOUTUBE_API_KEY in .env.local to enable playback. See docs/youtube-api-key.md.',
          );
          return;
        }
        const msg = err instanceof Error ? err.message : 'Search failed.';
        setError(msg);
      });
  }, [album, setError]);

  // Stop / pause / resume reactions.
  useEffect(() => {
    if (!handleRef.current) return;
    if (phase === 'stopping') {
      handleRef.current.stop();
      // Allow the visual stop animation to play, then clear album.
      const t = window.setTimeout(() => {
        usePlayerStore.setState({ album: undefined, phase: 'idle', position: 0, duration: 0 });
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
        bottom: 0,
        right: 0,
        width: 1,
        height: 1,
        pointerEvents: 'none',
        opacity: 0,
        overflow: 'hidden',
      }}
    >
      <div ref={targetRef} style={{ width: 1, height: 1 }} />
    </div>
  );
}
