import { useLibraryStore } from '../state/libraryStore';
import { Room } from './Room';
import { WallGrid } from './WallGrid';
import { Furniture } from './Furniture';
import { Lighting } from './Lighting';
import { CameraRig } from './CameraRig';
import { PlayingSleeve } from './PlayingSleeve';
import { Sky } from './Sky';
import { DiscoLights } from './DiscoLights';
import { DanceFloor } from './DanceFloor';

export function Library() {
  const grids = useLibraryStore((s) => s.grids);
  return (
    <>
      <Sky />
      <Lighting />
      <Room />
      <Furniture />
      {grids.map((grid) => (
        <WallGrid key={grid.id} grid={grid} />
      ))}
      <PlayingSleeve />
      <DiscoLights />
      <DanceFloor />
      <CameraRig />
    </>
  );
}
