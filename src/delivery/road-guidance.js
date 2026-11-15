import { hazards } from './route.js';
import { towPose } from './tow-traffic.js';

// One useful instruction at a time. Damage and exits take priority over hints.
export function roadGuidance(state) {
  if (state.failed) return state.failure;
  if (state.approaching) return 'address ahead / braking for the door';
  if (state.messageTime > 0) return state.message;
  if (state.towed) {
    const car = state.traffic[state.towId];
    if (car.exit && car.distance >= car.exit.distance - 62)
      return 'tow turning ' + (car.exit.side > 0 ? 'right' : 'left') + ' / release now';
  }
  const hazard = hazards.find(
    (h) =>
      h.distance > state.distance - 3 &&
      h.distance - state.distance < Math.max(35, state.speed * 2.5) &&
      Math.abs(h.lane - state.x) < 0.65
  );
  if (hazard)
    return hazard.type === 'frame'
      ? 'low beam / duck or change lanes'
      : hazard.type === 'rail'
        ? 'barrier / jump or change lanes'
        : 'blocked lane / steer clear';
  if (state.towed) return 'poon locked / steer freely / space to release';
  if (state.targetId >= 0) return 'bumper in reach / space to fire';
  const next = state.traffic
    .filter((car) => {
      const pose = towPose(car, state);
      return pose.gap > 6 && pose.gap < 40 && Math.abs(car.x) <= 1;
    })
    .sort((a, b) => a.distance - b.distance)[0];
  if (next && Math.abs(next.x - state.x) > 0.35)
    return 'tow ahead / move ' + (next.x < state.x ? 'left' : 'right');
  return 'free skating / watch for a bumper';
}
