import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { Library } from './scene/Library';
import { HUD } from './ui/HUD';
import { AlbumPicker } from './ui/AlbumPicker';
import { PlayerBar } from './ui/PlayerBar';
import { HiddenYouTube } from './components/HiddenYouTube';
import { useNavStore } from './state/navStore';
import { useLibraryStore, libraryHasAnyAlbum } from './state/libraryStore';

function FirstRunHint() {
  const pages = useLibraryStore((s) => s.pages);
  const view = useNavStore((s) => s.view);
  const empty = !libraryHasAnyAlbum({ pages });
  if (!empty) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center">
      <div className="rounded-full bg-black/60 px-5 py-2 text-sm text-amber-100/90 shadow-lg backdrop-blur">
        {view === 'room'
          ? 'Click the wall to start hanging album art.'
          : 'Click a frame to add album art — swipe or use ‹ › to flip pages.'}
      </div>
    </div>
  );
}

export default function App() {
  const pickerOpen = useNavStore((s) => s.pickerOpen);
  const closePicker = useNavStore((s) => s.closePicker);
  const view = useNavStore((s) => s.view);
  const returnToRoom = useNavStore((s) => s.returnToRoom);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows={false}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: SRGBColorSpace,
        }}
        camera={{ fov: 55, near: 0.1, far: 80, position: [-2.4, 1.65, 2.6] }}
        onPointerMissed={() => {
          if (pickerOpen) closePicker();
          else if (view === 'wall') returnToRoom();
        }}
      >
        <Suspense fallback={null}>
          <Library />
        </Suspense>
      </Canvas>
      <HUD />
      <AlbumPicker />
      <PlayerBar />
      <FirstRunHint />
      <HiddenYouTube />
    </div>
  );
}
