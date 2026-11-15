import { hazards, routeLength, laneWidth } from './route.js';
import { createTraffic, advanceTraffic, towPose, availableTow } from './tow-traffic.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Pure simulation. Rendering and input share this state, so retry and tests
// follow the same route. Fixed substeps prevent tunnelling through obstacles.
export function createDeliveryRun({ assisted = false } = {}) {
  const state = {
    assisted,
    traffic: createTraffic(),
    distance: 0,
    elapsed: 0,
    lane: 0,
    x: 0,
    lean: 0,
    height: 0,
    crouch: false,
    condition: 100,
    speed: 14,
    towed: true,
    towId: 0,
    targetId: 0,
    paused: false,
    arrived: false,
    jump: 0,
    landing: 0,
    duck: 0,
    protection: 0,
    hits: 0,
    message: 'first tow attached'
  };
  const passed = new Set();
  let accumulator = 0;
  function action(name) {
    if (state.paused || state.arrived) return;
    if (name === 'left' || name === 'right') {
      const direction = name === 'left' ? -1 : 1;
      const lean = state.lean + direction * 0.7;
      if (state.towed && Math.abs(lean) <= 0.71) {
        state.lean = lean;
      } else {
        state.towed = false;
        state.lean = 0;
        state.lane = clamp(Math.round(state.x) + direction, -1, 1);
      }
    } else if (name === 'jump' && !state.jump) {
      state.jump = 0.91;
    } else if (name === 'duck') state.duck = 0.8;
    else if (name === 'hook') {
      if (state.towed) state.towed = false;
      else if (state.targetId >= 0 && !state.jump && Math.abs(state.x - state.lane) < 0.2) {
        state.towed = true;
        state.towId = state.targetId;
        state.lean = 0;
      }
    }
    state.message = state.towed
      ? 'tow attached / steer to carve / space to release'
      : 'free skating / catch a tow';
  }
  function step(dt) {
    state.protection = Math.max(0, state.protection - dt);
    state.landing = Math.max(0, state.landing - dt);
    const wasJumping = state.jump > 0;
    state.jump = Math.max(0, state.jump - dt);
    if (wasJumping && !state.jump) state.landing = 0.2;
    state.duck = Math.max(0, state.duck - dt);
    state.height =
      state.jump && state.jump < 0.85 ? Math.sin((1 - state.jump / 0.85) * Math.PI) * 1.6 : 0;
    state.crouch = state.duck > 0;
    if (state.towed) {
      const pose = towPose(state.traffic[state.towId], state);
      const target = clamp(pose.x / laneWidth + state.lean, -1, 1);
      state.lane = Math.round(target);
      state.x += (target - state.x) * Math.min(12 * dt, 1);
    } else state.x += (state.lane - state.x) * Math.min(12 * dt, 1);
    const scale = state.assisted ? 0.75 : 1;
    const car = state.traffic[state.towId];
    const gap = state.towed ? towPose(car, state).gap : 10;
    const desired =
      state.protection > 0.8 ? 5 : state.towed ? car.velocity + clamp((gap - 10) * 1.5, -3, 3) : 9;
    // Keep momentum on release and take up the line gradually on a catch.
    state.speed += clamp(desired * scale - state.speed, -6 * dt, 4 * dt);
    advanceTraffic(state.traffic, dt * scale, state);
    state.elapsed += dt;
    const before = state.distance;
    state.distance = Math.min(routeLength, before + state.speed * dt);
    state.targetId = availableTow(state);
    if (state.towed && car.exit && car.distance >= car.exit.distance - 56) {
      state.message = 'tow turning right / release to stay on route';
      if (car.distance >= car.exit.distance - 12) {
        state.towed = false;
        state.lean = 0;
        state.message = 'tow took the side street / catch another car';
      }
    }
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
      if (!state.assisted && inLane && !clears && !state.protection) {
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
