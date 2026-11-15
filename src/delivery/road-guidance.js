import { hazards } from './route.js';
import { towPose } from './tow-traffic.js';

// One useful instruction at a time. Damage and exits take priority over hints.
export function roadGuidance(state) {
  if (state.approaching) return 'address ahead / coasting to the door';
  if (state.protection > 0) return state.message;
  if (state.towed) {
    const car = state.traffic[state.towId];
    if (car.exit && car.distance >= car.exit.distance - 56)
      return 'tow turning ' + (car.exit.side > 0 ? 'right' : 'left') + ' / release now';
    const hazard = hazards.find(
      (h) =>
        h.distance > state.distance &&
        h.distance - state.distance < 40 &&
        Math.abs(h.lane - state.x) < 0.65
    );
    if (hazard) {
      if (hazard.type === 'frame') return 'low beam ahead / duck or carve';
      if (hazard.type === 'rail') return 'rail ahead / jump or carve';
      return 'blocked lane ahead / steer clear';
    }
    return 'tow attached / steer once to carve';
  }
  if (state.targetId >= 0)
    return state.jump ? 'land to catch the bumper' : 'bumper in reach / catch tow';
  const next = state.traffic
    .filter((car) => {
      const pose = towPose(car, state);
      return (
        pose.gap >= 7 &&
        pose.gap < 45 &&
        Math.abs(car.x) <= 1 &&
        (!car.exit || car.distance < car.exit.distance - 12)
      );
    })
    .sort((a, b) => a.distance - b.distance)[0];
  if (next && Math.abs(next.x - state.x) > 0.35)
    return 'tow ahead / move ' + (next.x < state.x ? 'left' : 'right') + ' to line up';
  return 'free skating / watch for a bumper';
}
