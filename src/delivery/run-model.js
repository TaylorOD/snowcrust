import { hazards, routeLength } from './route.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Pure simulation. Rendering and input share this state, so retry and tests
// follow the same route. Fixed substeps prevent tunnelling through obstacles.
export function createDeliveryRun({ assisted = false } = {}) {
  const state = {
    distance: 0,
    elapsed: 0,
    lane: 0,
    x: 0,
    height: 0,
    crouch: false,
    condition: 100,
    speed: 11,
    towed: true,
    paused: false,
    arrived: false,
    jump: 0,
    duck: 0,
    protection: 0,
    hits: 0,
    message: 'first tow attached'
  };
  const passed = new Set();
  let accumulator = 0;
  const towAvailable = () => state.distance < routeLength - 35;
  function action(name) {
    if (state.paused || state.arrived) return;
    if (name === 'left' || name === 'right') {
      const lane = clamp(state.lane + (name === 'left' ? -1 : 1), -1, 1);
      if (lane !== state.lane) {
        state.towed = false;
        state.lane = lane;
      }
    } else if (name === 'jump' && !state.jump) {
      state.towed = false;
      state.jump = 0.85;
    } else if (name === 'duck') state.duck = 0.8;
    else if (name === 'hook' && towAvailable()) state.towed = !state.towed;
    state.message = state.towed
      ? 'tow attached / release before turning'
      : 'free skating / catch a tow';
  }
  function step(dt) {
    state.elapsed += dt;
    state.protection = Math.max(0, state.protection - dt);
    state.jump = Math.max(0, state.jump - dt);
    state.duck = Math.max(0, state.duck - dt);
    state.height = state.jump ? Math.sin((1 - state.jump / 0.85) * Math.PI) * 1.6 : 0;
    state.crouch = state.duck > 0;
    state.x += (state.lane - state.x) * Math.min(12 * dt, 1);
    state.speed = state.protection > 0.8 ? 5 : state.towed ? 14 : 9;
    const before = state.distance;
    state.distance = Math.min(routeLength, before + state.speed * dt);
    if (!towAvailable()) state.towed = false;
    for (const hazard of hazards) {
      if (passed.has(hazard.id) || hazard.distance > state.distance + 1.5) continue;
      passed.add(hazard.id);
      const inLane = Math.abs(state.x - hazard.lane) < 0.65;
      const clears =
        hazard.type === 'rail'
          ? state.height > 0.65
          : hazard.type === 'frame'
            ? state.crouch
            : false;
      if (!assisted && inLane && !clears && !state.protection) {
        state.condition = Math.max(0, state.condition - (hazard.type === 'van' ? 15 : 5));
        state.hits++;
        state.protection = 1.5;
        state.towed = false;
        state.message = 'cargo impact / keep moving';
      }
    }
    state.arrived = state.distance >= routeLength;
  }
  return {
    state,
    action,
    setPaused(value) {
      state.paused = value;
    },
    update(seconds) {
      if (state.paused || state.arrived) return;
      accumulator += Math.max(0, Math.min(seconds, 0.25));
      while (accumulator >= 1 / 120 && !state.arrived) {
        step(1 / 120);
        accumulator -= 1 / 120;
      }
    }
  };
}
