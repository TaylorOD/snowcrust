import { resolveTrafficContact } from './traffic-contact.js';
import { hazards, routeLength, approachStart, laneWidth, runTimeLimit } from './route.js';
import {
  createTraffic,
  advanceTraffic,
  towPose,
  availableTow,
  trafficSpeed
} from './tow-traffic.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const laneDuration = 0.18;

// Fixed steps keep collisions and input identical at different display rates.
// The player owns their lane even while attached. The tow only supplies speed.
export function createDeliveryRun({ assisted = false, startTowed = true } = {}) {
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
    speed: startTowed ? trafficSpeed : 14,
    towed: startTowed,
    towId: 0,
    targetId: 0,
    paused: false,
    arrived: false,
    approaching: false,
    failed: false,
    failure: '',
    jump: 0,
    landing: 0,
    duck: 0,
    protection: 0,
    hits: 0,
    hookFlight: 0,
    hookCooldown: 0,
    hookId: -1,
    messageTime: 3,
    towSeconds: 0,
    catches: startTowed ? 1 : 0,
    cleared: 0,
    message: startTowed
      ? 'poon locked / steer, jump and duck'
      : 'bumper ahead / space to fire the poon'
  };
  const passed = new Set(),
    contacts = new Set(),
    hazardHits = new Set();
  let accumulator = 0,
    laneFrom = 0,
    laneTime = laneDuration;
  function message(text, seconds = 1.5) {
    state.message = text;
    state.messageTime = seconds;
  }
  function fail(reason) {
    if (state.assisted) return;
    state.failed = true;
    state.failure = reason;
    state.towed = false;
    state.hookFlight = 0;
    state.speed = 0;
    message(reason, 10);
  }
  function action(name) {
    if (state.paused || state.arrived || state.failed || state.approaching) return;
    if (name === 'left' || name === 'right') {
      const next = clamp(state.lane + (name === 'left' ? -1 : 1), -1, 1);
      if (next !== state.lane) {
        laneFrom = state.x;
        laneTime = 0;
        state.lane = next;
      }
    } else if (name === 'jump' && !state.jump) {
      state.duck = 0;
      state.jump = 0.91;
    } else if (name === 'duck') {
      // A downward swipe cancels a jump, useful when a beam follows a hurdle.
      state.jump = 0;
      state.duck = 0.85;
    } else if (name === 'hook' && !state.hookCooldown) {
      state.hookCooldown = 0.45;
      if (state.towed) {
        state.towed = false;
        message('released / keep your momentum');
      } else {
        state.hookId = availableTow(state);
        state.hookFlight = 0.24;
        message(state.hookId >= 0 ? 'poon away' : 'miss / line up a bumper');
      }
    }
  }
  function impact(amount, text) {
    if (state.assisted || state.protection) return;
    state.condition = Math.max(0, state.condition - amount);
    state.hits++;
    state.protection = 1.2;
    state.towed = false;
    state.hookFlight = 0;
    message(text, 2);
    if (!state.condition) fail('cargo lost / retry the delivery');
  }
  function step(dt) {
    const previousX = state.x,
      before = state.distance;
    state.approaching = state.distance >= approachStart;
    state.protection = Math.max(0, state.protection - dt);
    state.messageTime = Math.max(0, state.messageTime - dt);
    state.hookCooldown = Math.max(0, state.hookCooldown - dt);
    state.landing = Math.max(0, state.landing - dt);
    const wasJumping = state.jump > 0;
    state.jump = Math.max(0, state.jump - dt);
    if (wasJumping && !state.jump) state.landing = 0.2;
    state.duck = Math.max(0, state.duck - dt);
    state.height =
      state.jump && state.jump < 0.85 ? Math.sin((1 - state.jump / 0.85) * Math.PI) * 1.6 : 0;
    state.crouch = state.duck > 0;
    laneTime = Math.min(laneDuration, laneTime + dt);
    const t = laneTime / laneDuration;
    state.x = laneFrom + (state.lane - laneFrom) * t * t * (3 - 2 * t);
    if (state.approaching) {
      state.towed = false;
      state.hookFlight = 0;
      state.lane = 2.1 / laneWidth;
      state.x += (state.lane - state.x) * Math.min(8 * dt, 1);
      laneFrom = state.x;
    }
    const scale = state.assisted ? 0.75 : 1;
    advanceTraffic(state.traffic, dt * scale, state);
    if (state.hookFlight > 0) {
      state.hookFlight = Math.max(0, state.hookFlight - dt);
      if (!state.hookFlight && state.hookId >= 0) {
        const car = state.traffic[state.hookId];
        const pose = towPose(car, state);
        if (pose.reachable && Math.abs(car.x - state.x) < 0.65) {
          state.towed = true;
          state.towId = state.hookId;
          state.catches++;
          message('poon locked / stay clear of traffic');
        } else message('miss / bumper moved out of reach');
      }
    }
    const car = state.traffic[state.towId];
    const gap = state.towed ? towPose(car, state).gap : 10;
    const desired = state.approaching
      ? Math.max(2, Math.min(8, (routeLength - before) * 0.6))
      : state.protection > 0.6
        ? 4
        : state.towed
          ? Math.max(0, car.velocity + clamp((gap - 11) * 2, -4, 5))
          : 14;
    // Slow rolling resistance preserves useful momentum between two catches.
    const braking = state.towed || state.approaching || state.protection ? 16 : 1.8;
    state.speed += clamp(desired * scale - state.speed, -braking * dt, 14 * dt);
    state.elapsed += dt;
    if (state.towed) state.towSeconds += dt;
    state.distance = Math.min(routeLength, before + state.speed * dt);
    const contact = resolveTrafficContact(state, previousX, before);
    for (const car of contacts)
      if (Math.abs(car.distance - state.distance) > 9) contacts.delete(car);
    if (contact && !contacts.has(contact)) {
      contacts.add(contact);
      impact(35, 'traffic hit / cargo damaged');
    }
    state.targetId = availableTow(state);
    if (state.towed && car.exit && car.distance >= car.exit.distance - 62) {
      message('tow turning ' + (car.exit.side > 0 ? 'right' : 'left') + ' / release now', 0.2);
      if (car.distance >= car.exit.distance + 18) {
        if (state.assisted) state.towed = false;
        else {
          impact(15, 'late release / line cut / keep straight');
          state.towed = false;
        }
      }
    }
    for (const hazard of hazards) {
      const reach = hazard.type === 'van' ? 3.7 : hazard.type === 'works' ? 2.2 : 1.1;
      if (passed.has(hazard.id) || hazard.distance > state.distance + reach) continue;
      if (hazard.distance < before - reach) {
        passed.add(hazard.id);
        continue;
      }
      const inLane = Math.abs(state.x - hazard.lane) < 0.62;
      const clears =
        hazard.type === 'rail'
          ? state.height > 0.7
          : hazard.type === 'frame'
            ? state.crouch
            : false;
      if (inLane && !clears && !state.assisted) {
        // Solid objects stop forward travel. They never let an invulnerable
        // rider ghost through the mesh. Steering, jumping or ducking frees them.
        state.distance = Math.max(before, hazard.distance - reach);
        state.speed = 0;
        if (!hazardHits.has(hazard.id)) {
          hazardHits.add(hazard.id);
          impact(
            35,
            hazard.type === 'frame' ? 'low beam / duck to clear' : 'blocked / find a clear lane'
          );
        }
      } else if (state.distance > hazard.distance + reach) {
        passed.add(hazard.id);
        if (inLane && clears) state.cleared++;
      }
    }
    if (!state.assisted && state.elapsed >= runTimeLimit)
      fail('route time expired / catch faster traffic');
    state.arrived = !state.failed && state.distance >= routeLength;
  }
  return {
    state,
    action,
    setPaused(value) {
      state.paused = value;
    },
    update(seconds) {
      if (state.paused || state.arrived || state.failed) return;
      accumulator += Math.max(0, Math.min(seconds, 0.25));
      while (accumulator >= 1 / 120 && !state.arrived && !state.failed) {
        step(1 / 120);
        accumulator -= 1 / 120;
      }
    }
  };
}
