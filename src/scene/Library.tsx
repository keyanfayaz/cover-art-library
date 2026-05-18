import { Room } from './Room';
import { PageWall } from './PageWall';
import { Furniture } from './Furniture';
import { Lighting } from './Lighting';
import { CameraRig } from './CameraRig';
import { PlayingSleeve } from './PlayingSleeve';
import { Sky } from './Sky';
import { DiscoLights } from './DiscoLights';
import { DanceFloor } from './DanceFloor';

export function Library() {
  return (
    <>
      <Sky />
      <Lighting />
      <Room />
      <Furniture />
      <PageWall />
      <PlayingSleeve />
      <DiscoLights />
      <DanceFloor />
      <CameraRig />
    </>
  );
}
