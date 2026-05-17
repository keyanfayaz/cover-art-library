import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeId = 'rainforest' | 'winter' | 'disco';

export type ThemeDef = {
  id: ThemeId;
  label: string;
  // Tonemapped JPG used as the visible sky (sampled by a basic material on a
  // surrounding sphere).
  ldr: string;
  // Original HDR used to build a PMREM for IBL on materials in the room.
  hdr: string;
  // Whether this is a daylight scene (drives some lighting decisions).
  daylight: boolean;
  // Background brightness multiplier — kept for parity with future HDR sky path.
  backgroundIntensity: number;
  // IBL (image-based lighting) intensity for materials.
  envIntensity: number;
  // Sun/key light direction (relative to the room center) and color.
  keyLight: {
    position: [number, number, number];
    intensity: number;
    color: string;
  };
  ambient: { intensity: number; color: string };
  // Whether the warm interior accent lamps should be on. At night and in winter,
  // we want them brighter to make the room feel inviting against the cold/dark outside.
  warmAccentBoost: number;
  // Color of the rug accent for visual cohesion (subtle).
  cool: { intensity: number; color: string };
};

export const THEMES: Record<ThemeId, ThemeDef> = {
  rainforest: {
    id: 'rainforest',
    label: 'Rainforest',
    ldr: '/textures/rainforest.jpg',
    hdr: '/textures/rainforest_1k.hdr',
    daylight: true,
    // Multiplied with the LDR sky texture; tuned visually so the canopy/sky
    // doesn't saturate to white.
    backgroundIntensity: 0.18,
    envIntensity: 0.6,
    keyLight: {
      position: [6, 4, 0],
      intensity: 1.4,
      color: '#dff2c8',
    },
    ambient: { intensity: 0.35, color: '#fff1d8' },
    warmAccentBoost: 1.0,
    cool: { intensity: 2.4, color: '#cfe6ff' },
  },
  winter: {
    id: 'winter',
    label: 'Winter day',
    ldr: '/textures/winter.jpg',
    hdr: '/textures/winter_1k.hdr',
    daylight: true,
    // Snow is very bright; lower multiplier keeps detail.
    backgroundIntensity: 0.6,
    envIntensity: 0.7,
    keyLight: {
      position: [6, 4, 0],
      intensity: 1.7,
      color: '#e3edff',
    },
    ambient: { intensity: 0.4, color: '#e8f0ff' },
    warmAccentBoost: 1.4,
    cool: { intensity: 3.0, color: '#cfe2ff' },
  },
  disco: {
    id: 'disco',
    label: 'Disco',
    ldr: '/textures/disco.jpg',
    hdr: '/textures/disco_1k.hdr',
    daylight: false,
    // Shanghai cityscape neon; keep the city readable but not blown.
    backgroundIntensity: 0.6,
    envIntensity: 0.2,
    keyLight: {
      // Cool city-light tint coming through the windows.
      position: [6, 3, 0],
      intensity: 0.35,
      color: '#7a6cff',
    },
    ambient: { intensity: 0.06, color: '#1d1b2e' },
    // Warm accents pull back so the colored disco lights dominate.
    warmAccentBoost: 0.25,
    cool: { intensity: 0.4, color: '#2a3060' },
  },
};

export const THEME_ORDER: ThemeId[] = ['rainforest', 'winter', 'disco'];

type ThemeState = { themeId: ThemeId };
type ThemeActions = {
  setTheme: (id: ThemeId) => void;
  cycleTheme: () => void;
};

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set, get) => ({
      themeId: 'rainforest',
      setTheme: (id) => set({ themeId: id }),
      cycleTheme: () => {
        const idx = THEME_ORDER.indexOf(get().themeId);
        const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
        set({ themeId: next });
      },
    }),
    {
      name: 'cal:theme:v1',
      version: 2,
      // Migrate any persisted 'night' to 'disco' so existing users land on
      // a valid theme after the rename.
      migrate: (persisted: unknown) => {
        const p = persisted as { themeId?: string } | undefined;
        if (p?.themeId === 'night') return { themeId: 'disco' as ThemeId };
        return p as { themeId: ThemeId };
      },
    },
  ),
);

export function useCurrentTheme(): ThemeDef {
  const id = useThemeStore((s) => s.themeId);
  return THEMES[id];
}
