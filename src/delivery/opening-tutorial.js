import { nextLaneHazard } from './road-guidance.js';
import { recoveryFeedback } from './recovery-feedback.js';

// Lessons follow the current lane and tow, so a missed obstacle or an early
// release cannot leave the player waiting for a scripted tutorial step.
export function openingLesson(state) {
  if (state.paused || state.failed || state.approaching || state.arrived || recoveryFeedback(state))
    return null;
  const car = state.towed ? state.traffic[state.towId] : null;
  if (car?.exit && car.distance >= car.exit.distance - 62)
    return { message: 'tow taking the exit / space or release tow', actions: ['hook'] };
  const hazard = nextLaneHazard(state);
  if (hazard) {
    // Leave time to read and react, then clear the full collision volume.
    const close = hazard.distance - state.distance <= Math.max(8, state.speed * 0.6);
    if (hazard.type === 'rail')
      return {
        message:
          state.jump > 0
            ? 'jumping / steer if you need another lane'
            : close
              ? 'jump now / ↑ or swipe up'
              : 'barrier ahead / jump close to it or change lanes',
        actions: state.jump > 0 ? [] : close ? ['jump'] : ['left', 'right']
      };
    if (hazard.type === 'frame')
      return {
        message:
          state.duck > 0
            ? 'ducking / steer if you need another lane'
            : close
              ? 'duck now / ↓ or swipe down'
              : 'low beam ahead / duck close to it or change lanes',
        actions: state.duck > 0 ? [] : close ? ['duck'] : ['left', 'right']
      };
    return { message: 'blocked lane / ← → or swipe sideways', actions: ['left', 'right'] };
  }
  if (!state.towed && state.targetId >= 0 && !state.hookFlight && !state.hookCooldown)
    return { message: 'bumper in reach / space or fire poon', actions: ['hook'] };
  if (state.distance < 35 && state.towed)
    return {
      message: 'already towed / ← → or swipe to steer',
      actions: ['left', 'right']
    };
  return null;
}
