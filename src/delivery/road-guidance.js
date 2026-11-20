import { hazards, roadExits } from './route.js';
import { towPose } from './tow-traffic.js';

// One useful instruction at a time. Damage and exits take priority over hints.
export function roadGuidance(state) {
  if (state.failed) return state.failure;
  if (state.approaching) return 'address ahead / braking for the door';
  if (state.messageTime > 0 && state.protection > 0 && state.messageKind !== 'impact')
    return state.message;
  if (state.towed) {
    const car = state.traffic[state.towId];
    if (car.exit && car.distance >= car.exit.distance - 62)
      return 'tow turning ' + (car.exit.side > 0 ? 'right' : 'left') + ' / release now';
  }
  const hazard = nextLaneHazard(state);
  if (hazard)
    return hazard.type === 'frame'
      ? 'low beam / duck or change lanes'
      : hazard.type === 'rail'
        ? 'barrier / jump or change lanes'
        : 'blocked lane / steer clear';
  if (state.messageTime > 0 && state.messageKind !== 'impact') return state.message;
  if (state.towed) return 'poon locked / steer freely / space to release';
  if (state.targetId >= 0) return 'bumper in reach / space to fire';
  const next = state.traffic
    .filter((car) => {
      const pose = towPose(car, state);
      return (
        pose.gap > 6 &&
        pose.gap < 40 &&
        Math.abs(car.x) <= 1 &&
        !hazards.some(
          (hazard) =>
            Math.abs(hazard.lane - car.x) < 0.65 &&
            hazard.distance > state.distance - 4 &&
            hazard.distance < state.distance + 25
        )
      );
    })
    .sort((a, b) => a.distance - b.distance)[0];
  if (next && Math.abs(next.x - state.x) > 0.35)
    return 'tow ahead / move ' + (next.x < state.x ? 'left' : 'right');
  return 'free skating / watch for a bumper';
}

export function nextLaneHazard(state) {
  return hazards.find(
    (h) =>
      h.distance > state.distance - 3 &&
      h.distance - state.distance < Math.max(35, state.speed * 2.5) &&
      Math.abs(h.lane - state.x) < 0.65
  );
}

// The junction remains visible even after a hit or a change of tow car.
export function roadExitNotice(state) {
  if (state.failed || state.approaching || state.paused) return null;
  const exit = roadExits.find(
    (item) => item.distance >= state.distance - 20 && item.distance - state.distance <= 120
  );
  if (!exit) return null;
  const remaining = Math.max(0, Math.ceil(exit.distance - state.distance));
  const attached = state.towed && state.traffic[state.towId]?.exit?.distance === exit.distance;
  return {
    title: exit.name + (exit.side > 0 ? ' → ' : ' ← ') + remaining + ' m',
    instruction: attached
      ? 'release tow / delivery stays straight ↑'
      : 'keep straight ↑ / this is not your exit'
  };
}

// One marker per lane keeps farther hazards from covering the next decision.
export function visibleHazardCues(distance) {
  const lanes = new Set();
  return hazards.filter((hazard) => {
    const gap = hazard.distance - distance;
    if (gap < 0 || gap > 60 || lanes.has(hazard.lane)) return false;
    lanes.add(hazard.lane);
    return true;
  });
}
