import { ROOM } from '../lib/geometry';
import { useCurrentTheme } from '../state/themeStore';

export function Lighting() {
  const t = useCurrentTheme();
  const { height } = ROOM;
  const accent = t.warmAccentBoost;
  return (
    <>
      <ambientLight intensity={t.ambient.intensity} color={t.ambient.color} />
      {/* Daylight pouring through the windows on the right wall */}
      <directionalLight
        position={[ROOM.width / 2 + t.keyLight.position[0] - 4.5, height + t.keyLight.position[1] - 4, t.keyLight.position[2]]}
        intensity={t.keyLight.intensity}
        color={t.keyLight.color}
      />
      {/* Warm interior accents along the back wall */}
      <pointLight
        position={[-2.2, height - 0.4, -ROOM.depth / 2 + 0.6]}
        intensity={5 * accent}
        distance={5}
        color="#ffd28a"
      />
      <pointLight
        position={[2.2, height - 0.4, -ROOM.depth / 2 + 0.6]}
        intensity={5 * accent}
        distance={5}
        color="#ffd28a"
      />
      {/* Cooler ambient fill near the seating area */}
      <pointLight
        position={[0, height - 0.3, 1.5]}
        intensity={t.cool.intensity}
        distance={5}
        color={t.cool.color}
      />
    </>
  );
}
