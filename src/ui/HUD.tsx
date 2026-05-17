import { useFocusStore } from '../state/focusStore';
import { useLibraryStore } from '../state/libraryStore';
import { THEMES, THEME_ORDER, useThemeStore } from '../state/themeStore';

const THEME_ICON: Record<string, string> = {
  rainforest: '🌿',
  winter: '❄️',
  disco: '🪩',
};

function ThemeSwitcher() {
  const themeId = useThemeStore((s) => s.themeId);
  const setTheme = useThemeStore((s) => s.setTheme);
  return (
    <div className="flex items-center gap-1 rounded-full bg-black/55 p-1 backdrop-blur-md">
      {THEME_ORDER.map((id) => {
        const t = THEMES[id];
        const active = id === themeId;
        return (
          <button
            key={id}
            onClick={() => setTheme(id)}
            title={t.label}
            className={`flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium transition-colors ${
              active
                ? 'bg-amber-100/90 text-neutral-900'
                : 'text-amber-100/70 hover:bg-white/10'
            }`}
          >
            <span aria-hidden>{THEME_ICON[id]}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function HUD() {
  const view = useFocusStore((s) => s.view);
  const gridId = useFocusStore((s) => s.gridId);
  const focusGrid = useFocusStore((s) => s.focusGrid);
  const returnToRoom = useFocusStore((s) => s.returnToRoom);
  const homeGridId = useLibraryStore((s) => s.homeGridId);
  const setHomeGrid = useLibraryStore((s) => s.setHomeGrid);
  const grids = useLibraryStore((s) => s.grids);

  const focusedGrid = grids.find((g) => g.id === gridId);
  const isHome = focusedGrid && homeGridId === focusedGrid.id;

  const goHome = () => {
    if (homeGridId) focusGrid(homeGridId);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4">
      <div className="pointer-events-auto rounded-2xl bg-black/55 px-4 py-2 backdrop-blur-md">
        <div className="text-base font-semibold tracking-wide text-amber-100">Stacks</div>
        <div className="text-[11px] uppercase tracking-widest text-amber-200/70">
          listening room
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <ThemeSwitcher />
        {view === 'room' && homeGridId && (
          <button
            onClick={goHome}
            className="rounded-full bg-amber-100/90 px-4 py-2 text-sm font-medium text-neutral-900 shadow hover:bg-amber-50"
          >
            Open home wall
          </button>
        )}

        {view === 'grid' && focusedGrid && (
          <>
            <div className="rounded-full bg-black/55 px-3 py-1 text-xs uppercase tracking-widest text-amber-200/80">
              {focusedGrid.label}
            </div>
            <button
              onClick={() => setHomeGrid(isHome ? undefined : focusedGrid.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium shadow ${
                isHome
                  ? 'bg-amber-300 text-neutral-900 hover:bg-amber-200'
                  : 'bg-white/10 text-amber-100 hover:bg-white/20'
              }`}
            >
              {isHome ? '★ Home wall' : 'Set as home'}
            </button>
            <button
              onClick={returnToRoom}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-white/20"
            >
              ← Back to room
            </button>
          </>
        )}
      </div>
    </div>
  );
}
