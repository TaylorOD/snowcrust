const clamp = (value) => Math.max(0, Math.min(1, value));

// Presentation follows actual road speed. Releasing the cable keeps the fast
// camera and coasting stance until rolling resistance has spent the momentum.
export function rideFeel(state) {
  const pace = clamp(((state.speed ?? 14) - 14) / 7);
  const pull = state.towBlend ?? (state.towed ? 1 : 0);
  const push =
    state.towed || state.approaching || state.jump || state.crouch
      ? 0
      : clamp((17 - (state.speed ?? 14)) / 3) * (1 - pull);
  return { pace, pull, push };
}
