import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { WALL, gridDimensions } from '../lib/geometry';
import { useLibraryStore } from '../state/libraryStore';
import { useNavStore } from '../state/navStore';
import { PageGrid } from './PageGrid';

const DURATION = 0.4;
const GRID = gridDimensions();
const SLIDE = GRID.width + 1.6;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function setGroupOpacity(group: THREE.Group, opacity: number) {
  group.traverse((node) => {
    const mat = (node as THREE.Mesh).material as THREE.Material | undefined;
    if (mat && 'opacity' in mat) {
      mat.transparent = true;
      (mat as THREE.MeshStandardMaterial).opacity = opacity;
      mat.depthWrite = opacity > 0.95;
    }
  });
}

const ctrlBtn =
  'flex h-7 w-7 items-center justify-center rounded-full text-amber-100 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:text-amber-100/25 disabled:hover:bg-transparent';

function PageControlsOverlay() {
  const pages = useLibraryStore((s) => s.pages);
  const addPage = useLibraryStore((s) => s.addPage);
  const removePage = useLibraryStore((s) => s.removePage);
  const pageIndex = useNavStore((s) => s.pageIndex);
  const nextPage = useNavStore((s) => s.nextPage);
  const prevPage = useNavStore((s) => s.prevPage);
  const goToPage = useNavStore((s) => s.goToPage);
  const returnToRoom = useNavStore((s) => s.returnToRoom);

  const total = pages.length;
  const current = Math.min(pageIndex, total - 1);
  // The first page is the permanent default — it can't be removed.
  const canRemove = current > 0;
  const [confirming, setConfirming] = useState(false);

  // Cancel a pending confirm if the user navigates away.
  useEffect(() => {
    setConfirming(false);
  }, [current]);

  const onAdd = () => {
    addPage();
    goToPage(useLibraryStore.getState().pages.length - 1);
  };
  const onRemoveConfirmed = () => {
    const id = pages[current]?.id;
    setConfirming(false);
    if (!id || !canRemove) return;
    removePage(id);
    goToPage(current - 1);
  };

  return (
    <Html
      transform={false}
      center
      zIndexRange={[20, 0]}
      position={[0, GRID.height / 2 + 0.32, 0.06]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1 whitespace-nowrap rounded-full bg-black/65 px-2 py-1 backdrop-blur-md"
        style={{ pointerEvents: 'auto' }}
      >
        <button onClick={prevPage} disabled={current === 0} className={ctrlBtn} aria-label="Previous page">
          ‹
        </button>
        <div className="min-w-[84px] text-center text-xs uppercase tracking-widest text-amber-200/80">
          Page {current + 1} / {total}
        </div>
        <button
          onClick={nextPage}
          disabled={current >= total - 1}
          className={ctrlBtn}
          aria-label="Next page"
        >
          ›
        </button>
        <div className="mx-1 h-5 w-px bg-white/15" />
        <button
          onClick={onAdd}
          className="rounded-full px-3 py-1 text-xs font-medium text-amber-100 hover:bg-white/15"
        >
          + Add page
        </button>
        {canRemove && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-full px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20"
          >
            Remove page
          </button>
        )}
        {canRemove && confirming && (
          <span className="flex items-center gap-1">
            <span className="px-2 text-xs font-medium text-amber-100/90">
              Remove this page?
            </span>
            <button
              onClick={onRemoveConfirmed}
              className="rounded-full bg-red-500/80 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500"
            >
              Remove
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-full px-3 py-1 text-xs font-medium text-amber-100 hover:bg-white/15"
            >
              Cancel
            </button>
          </span>
        )}
        <div className="mx-1 h-5 w-px bg-white/15" />
        <button
          onClick={returnToRoom}
          className="rounded-full px-3 py-1 text-xs font-medium text-amber-100 hover:bg-white/15"
        >
          ← Room
        </button>
      </div>
    </Html>
  );
}

type Transition = { fromIdx: number; toIdx: number; dir: 1 | -1 };

export function PageWall() {
  const pages = useLibraryStore((s) => s.pages);
  const view = useNavStore((s) => s.view);
  const pageIndex = useNavStore((s) => s.pageIndex);
  const nextPage = useNavStore((s) => s.nextPage);
  const prevPage = useNavStore((s) => s.prevPage);
  const focusWall = useNavStore((s) => s.focusWall);

  const displayedIdx = useRef(0);
  const progress = useRef(0);
  const [trans, setTrans] = useState<Transition | null>(null);
  const fromRef = useRef<THREE.Group>(null);
  const toRef = useRef<THREE.Group>(null);

  // Kick off a slide whenever the target page changes.
  useEffect(() => {
    if (pageIndex === displayedIdx.current) return;
    const dir: 1 | -1 = pageIndex > displayedIdx.current ? 1 : -1;
    progress.current = 0;
    setTrans({ fromIdx: displayedIdx.current, toIdx: pageIndex, dir });
  }, [pageIndex]);

  // When a page is removed, snap (no slide) to the now-current page so we
  // never animate from/to a page index that just shifted under us.
  const prevLen = useRef(pages.length);
  useEffect(() => {
    if (pages.length < prevLen.current) {
      const idx = useNavStore.getState().pageIndex;
      displayedIdx.current = Math.max(0, Math.min(idx, pages.length - 1));
      setTrans(null);
    }
    prevLen.current = pages.length;
  }, [pages.length]);

  // Arrow keys + trackpad horizontal swipe (only while focused on the wall).
  useEffect(() => {
    if (view !== 'wall') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextPage();
      else if (e.key === 'ArrowLeft') prevPage();
    };
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < 30 || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      const now = performance.now();
      if (now - last < 450) return;
      last = now;
      if (e.deltaX > 0) nextPage();
      else prevPage();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
    };
  }, [view, nextPage, prevPage]);

  useFrame((_, dt) => {
    if (!trans) return;
    progress.current = Math.min(1, progress.current + dt / DURATION);
    const e = easeInOutCubic(progress.current);
    if (fromRef.current) {
      fromRef.current.position.x = -trans.dir * SLIDE * e;
      setGroupOpacity(fromRef.current, 1 - e);
    }
    if (toRef.current) {
      toRef.current.position.x = trans.dir * SLIDE * (1 - e);
      setGroupOpacity(toRef.current, e);
    }
    if (progress.current >= 1) {
      displayedIdx.current = trans.toIdx;
      setTrans(null);
    }
  });

  const safeIdx = Math.max(0, Math.min(displayedIdx.current, pages.length - 1));
  const fromPage = trans ? pages[trans.fromIdx] : undefined;
  const toPage = trans ? pages[trans.toIdx] : undefined;
  const interactive = view === 'wall' && !trans;

  const padX = GRID.width + 0.4;
  const padY = GRID.height + 0.4;

  return (
    <group position={WALL.position} rotation={[0, WALL.rotationY, 0]}>
      {/* Click target to focus the wall from room view. */}
      {view === 'room' && (
        <mesh
          position={[0, 0, 0.04]}
          onClick={(e) => {
            e.stopPropagation();
            focusWall();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <planeGeometry args={[padX, padY]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {view === 'wall' && !trans && <PageControlsOverlay />}

      {trans ? (
        <>
          {fromPage && (
            <group ref={fromRef} key={`from-${fromPage.id}`}>
              <PageGrid page={fromPage} interactive={false} />
            </group>
          )}
          {toPage && (
            <group ref={toRef} key={`to-${toPage.id}`}>
              <PageGrid page={toPage} interactive={false} />
            </group>
          )}
        </>
      ) : (
        pages[safeIdx] && (
          <group key={pages[safeIdx].id}>
            <PageGrid page={pages[safeIdx]} interactive={interactive} />
          </group>
        )
      )}
    </group>
  );
}
