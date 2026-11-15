import { laneWidth } from './route.js';

// Portrait follows the rider, not the road centre. Otherwise the outside
// lanes leave the narrow view even though the controls still work.
export function frameRoadCamera(camera, state, reduced, position, aim) {
  const portrait = camera.aspect < 0.8;
  const riderX = state.x * laneWidth;
  position.set(portrait ? riderX : state.x * 0.4, portrait ? 4.5 : 3.6, portrait ? 15.5 : 10.5);
  aim.set(portrait ? riderX : state.x * 0.25, 1.2, portrait ? -15 : -24);
  camera.fov = (portrait ? 68 : 57) + (reduced ? 0 : Math.min(10, state.speed * 0.5));
  camera.updateProjectionMatrix();
}
