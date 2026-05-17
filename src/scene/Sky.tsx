import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { useCurrentTheme } from '../state/themeStore';

// Render the sky as a giant inside-out sphere surrounding the room. We use a
// real mesh (not scene.background) because that proved unreliable through this
// scene's window geometry. The HDR is still loaded for IBL via scene.environment.
const SKY_RADIUS = 60;

export function Sky() {
  const theme = useCurrentTheme();
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const ldrCache = useRef<Map<string, THREE.Texture>>(new Map());
  const hdrCache = useRef<Map<string, THREE.Texture>>(new Map());
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  // LDR for visible sky.
  useEffect(() => {
    let cancelled = false;
    const cached = ldrCache.current.get(theme.ldr);
    if (cached) {
      setTex(cached);
      return;
    }
    new THREE.TextureLoader().load(theme.ldr, (loaded) => {
      if (cancelled) {
        loaded.dispose();
        return;
      }
      loaded.colorSpace = THREE.SRGBColorSpace;
      ldrCache.current.set(theme.ldr, loaded);
      setTex(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [theme.ldr]);

  // HDR → PMREM → scene.environment for IBL.
  useEffect(() => {
    let cancelled = false;
    const cached = hdrCache.current.get(theme.hdr);
    if (cached) {
      scene.environment = cached;
      scene.environmentIntensity = theme.envIntensity;
      return;
    }
    new RGBELoader().load(theme.hdr, (loaded) => {
      if (cancelled) {
        loaded.dispose();
        return;
      }
      loaded.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(gl);
      pmrem.compileEquirectangularShader();
      const env = pmrem.fromEquirectangular(loaded).texture;
      pmrem.dispose();
      loaded.dispose();
      hdrCache.current.set(theme.hdr, env);
      scene.environment = env;
      scene.environmentIntensity = theme.envIntensity;
    });
    return () => {
      cancelled = true;
    };
  }, [theme.hdr, theme.envIntensity, scene, gl]);

  // Keep IBL intensity in sync.
  useEffect(() => {
    scene.environmentIntensity = theme.envIntensity;
    // Clear scene.background so our sphere is what's seen through the window.
    scene.background = null;
  }, [theme.envIntensity, scene]);

  const geom = useMemo(() => new THREE.SphereGeometry(SKY_RADIUS, 64, 32), []);
  const fallbackColor = theme.daylight ? '#cfd9cf' : '#0e1121';

  // Build the material imperatively the moment we have a texture so the shader
  // is compiled with USE_MAP enabled from the start. Re-create on theme change
  // and dispose the old one. Without this, a meshBasicMaterial that started
  // life without a map will ignore one added later (the GLSL define is set at
  // compile time).
  const skyMat = useMemo(() => {
    if (!tex) {
      return new THREE.MeshBasicMaterial({
        color: fallbackColor,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      });
    }
    const c = theme.backgroundIntensity;
    return new THREE.MeshBasicMaterial({
      map: tex,
      color: new THREE.Color(c, c, c),
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      toneMapped: true,
    });
  }, [tex, theme.backgroundIntensity, fallbackColor]);

  useEffect(() => () => skyMat.dispose(), [skyMat]);

  return (
    <mesh
      geometry={geom}
      material={skyMat}
      renderOrder={-100}
      frustumCulled={false}
    />
  );
}
