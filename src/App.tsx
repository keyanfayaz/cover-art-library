import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { Library } from './scene/Library';
import { HUD } from './ui/HUD';
import { AlbumPicker } from './ui/AlbumPicker';
import { PlayerBar } from './ui/PlayerBar';
import { HiddenYouTube } from './components/HiddenYouTube';
import { useFocusStore } from './state/focusStore';
import { useLibraryStore, libraryHasAnyAlbum } from './state/libraryStore';

function FirstRunHint() {
  const view = useFocusStore((s) => s.view);
  const grids = useLibraryStore((s) => s.grids);
  const empty = !libraryHasAnyAlbum({ grids });
  if (!empty || view !== 'room') return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center">
      <div className="rounded-full bg-black/60 px-5 py-2 text-sm text-amber-100/90 shadow-lg backdrop-blur">
        Click any wall to start hanging album art.
      </div>
    </div>
  );
}

export default function App() {
  const focusGrid = useFocusStore((s) => s.focusGrid);
  const view = useFocusStore((s) => s.view);
  const returnToRoom = useFocusStore((s) => s.returnToRoom);

  useEffect(() => {
    const homeGridId = useLibraryStore.getState().homeGridId;
    if (homeGridId) focusGrid(homeGridId);
  }, [focusGrid]);

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
          if (view === 'grid') returnToRoom();
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
