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
      </div>
    </div>
  );
}
