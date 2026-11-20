const causes = {
  rail: 'barrier hit',
  frame: 'beam hit',
  works: 'roadworks hit',
  van: 'parked car hit',
  traffic: 'traffic hit',
  exit: 'late release'
};

// Protection prevents another cargo penalty. It never locks steering or firing.
// Keep the blocked instruction after protection ends until the lane is clear.
export function recoveryFeedback(state) {
  if (state.failed || state.paused || state.approaching || state.arrived) return null;
  const hit = state.lastImpact;
  const age = hit ? state.elapsed - hit.at : Infinity;
  if (!state.blocked && age >= 3) return null;
  const title =
    hit && age < 3
      ? causes[hit.cause] + ' / cargo ' + hit.before + '% → ' + hit.after + '%'
      : 'lane blocked / cargo ' + state.condition + '%';
  const movement =
    state.blocked === 'rail'
      ? 'jump or steer now'
      : state.blocked === 'frame'
        ? 'duck or steer now'
        : state.blocked
          ? 'steer to a clear lane'
          : 'steer now';
  const tow = state.towed
    ? 'tow attached'
    : state.hookFlight > 0
      ? 'poon away'
      : state.hookCooldown > 0
        ? 'poon rearming'
        : state.targetId >= 0
          ? 'poon ready'
          : 'find a bumper';
  return {
    title,
    instruction: movement + ' / ' + tow,
    protection:
      state.protection > 0
        ? 'cargo protected ' + (Math.ceil(state.protection * 10) / 10).toFixed(1) + 's'
        : 'protection ended',
    progress: Math.max(0, Math.min(1, state.protection / 1.2)),
    impact: Math.max(0, 1 - age / 0.35)
  };
}
