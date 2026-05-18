import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { FRAME } from '../lib/geometry';
import type { Album } from '../state/libraryStore';
import { usePlayerStore } from '../state/playerStore';
import { SleeveActions } from './SleeveActions';

const W = FRAME.size;
const H = FRAME.size;
const D = FRAME.depth;

type Props = {
  album: Album;
  position: [number, number, number];
  pageId: string;
  row: number;
  col: number;
  hoverable?: boolean;
};

function FrameTextured({ album, position, pageId, row, col, hoverable }: Props) {
  const texture = useTexture(album.coverUrl);
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
  }, [texture]);
  // Hover state has a small grace period so moving the mouse from the 3D sleeve
  // to the DOM action chip doesn't unmount the chip mid-hover.
  const [hovered, setHovered] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const showChip = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setHovered(true);
  }, []);
  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setHovered(false);
      hideTimerRef.current = null;
    }, 220);
  }, []);
  useEffect(() => () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
  }, []);
  const play = usePlayerStore((s) => s.play);
  const playingAlbum = usePlayerStore((s) => s.album);

  const liftZ = hovered && hoverable ? 0.025 : 0;
  const isPlaying = playingAlbum?.mbid === album.mbid;

  // Clicking a placed sleeve always plays it. Use the ✎ chip to open the
  // picker for replace/remove. Keeps the primary action obvious.
  const handleBodyClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    play({
      mbid: album.mbid,
      title: album.title,
      artist: album.artist,
      coverUrl: album.coverUrl,
      sourcePageId: pageId,
      sourceRow: row,
      sourceCol: col,
    });
  };

  return (
    <group position={position}>
      {/* Frame border */}
      <mesh position={[0, 0, liftZ]}>
        <boxGeometry args={[W + 0.02, H + 0.02, D]} />
        <meshStandardMaterial
          color={isPlaying ? '#3a2a16' : '#1c1612'}
          roughness={0.6}
          metalness={0.1}
          emissive={isPlaying ? '#f0a040' : '#000000'}
          emissiveIntensity={isPlaying ? 0.25 : 0}
        />
      </mesh>
      {/* Cover art */}
      <mesh
        position={[0, 0, liftZ + D / 2 + 0.001]}
        onClick={handleBodyClick}
        onPointerOver={(e) => {
          if (!hoverable) return;
          e.stopPropagation();
          showChip();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          if (!hoverable) return;
          scheduleHide();
          document.body.style.cursor = 'auto';
        }}
      >
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={texture} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Hover-revealed corner ✕ to remove this album. */}
      {hovered && hoverable && (
        <SleeveActions
          pageId={pageId}
          row={row}
          col={col}
          onChipEnter={showChip}
          onChipLeave={scheduleHide}
        />
      )}
    </group>
  );
}

function FrameFallback({ position }: Props) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[W + 0.02, H + 0.02, D]} />
        <meshStandardMaterial color="#1c1612" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function VinylSleeve(props: Props) {
  return (
    <Suspense fallback={<FrameFallback {...props} />}>
      <FrameTextured {...props} />
    </Suspense>
  );
}
