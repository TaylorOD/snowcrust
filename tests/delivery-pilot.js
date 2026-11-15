import { createDeliveryRun } from '../src/delivery/run-model.js';
import { hazards } from '../src/delivery/route.js';
import { towPose } from '../src/delivery/tow-traffic.js';

// A repeatable successful player uses actions, never writes simulation state.
export function playDelivery(record = () => {}, options = {}) {
  const r = createDeliveryRun();
  let released = false,
    hookAfter = 0;
  if (options.noTow) r.action('hook');
  for (let i = 0; i < 120 * 100 && !r.state.arrived && !r.state.failed; i++) {
    const s = r.state;
    const act = (name) => {
      record({ at: s.elapsed, distance: s.distance, name });
      r.action(name);
    };
    if (!released && options.releaseAt !== undefined && s.distance >= options.releaseAt) {
      if (s.towed) act('hook');
      released = true;
      hookAfter = s.elapsed + (options.hookDelay ?? 5);
    }
    if (options.waitUntil && s.elapsed < options.waitUntil) {
      r.update(1 / 120);
      continue;
    }
    if (i % 12 === 0) {
      const hazard = hazards.find(
        (h) =>
          h.distance > s.distance - 3 &&
          h.distance - s.distance <
            (['van', 'works'].includes(h.type) ? 20 : Math.max(4, s.speed * 0.36)) &&
          Math.abs(h.lane - s.x) < 0.6
      );
      if (hazard && !(options.hitFirst && s.distance < 82 && !s.hits)) {
        if (hazard.type === 'rail' && !s.jump) act('jump');
        else if (hazard.type === 'frame') act('duck');
        else if (['van', 'works'].includes(hazard.type) && Math.abs(s.x - s.lane) < 0.1) {
          const safe = [-1, 0, 1].filter(
            (l) =>
              Math.abs(l - s.lane) === 1 &&
              !hazards.some(
                (h) =>
                  h.lane === l &&
                  ['van', 'works'].includes(h.type) &&
                  Math.abs(h.distance - s.distance) < 25
              ) &&
              !s.traffic.some(
                (c) => Math.abs(c.x - l) < 0.65 && Math.abs(c.distance - s.distance) < 8
              )
          );
          if (safe.length) {
            const crossing = hazards.find(
              (h) => h.lane === safe[0] && Math.abs(h.distance - s.distance) < 6
            );
            if (crossing?.type === 'rail' && s.height < 0.8) {
              if (!s.jump) act('jump');
            } else if (crossing?.type === 'frame' && !s.crouch) act('duck');
            else act(safe[0] < s.lane ? 'left' : 'right');
          }
        }
      }
      if (s.towed) {
        const c = s.traffic[s.towId];
        if (!options.missExit && c.exit && c.distance > c.exit.distance - 22) act('hook');
      } else if (
        !options.noTow &&
        s.elapsed >= hookAfter &&
        !s.protection &&
        !s.hookFlight &&
        !s.hookCooldown
      ) {
        if (s.targetId >= 0) act('hook');
        else {
          const c = s.traffic.find((c) => {
            const p = towPose(c, s);
            return (
              p.reachable &&
              Math.abs(c.x - s.x) > 0.7 &&
              Math.abs(c.x) <= 1 &&
              !s.traffic.some(
                (o) => Math.abs(o.x - c.x) < 0.65 && Math.abs(o.distance - s.distance) < 8
              ) &&
              !hazards.some(
                (h) => Math.abs(h.lane - c.x) < 0.6 && Math.abs(h.distance - s.distance) < 25
              )
            );
          });
          if (c && !hazard && Math.abs(s.lane - s.x) < 0.1) act(c.x < s.x ? 'left' : 'right');
        }
      }
    }
    r.update(1 / 120);
    options.observe?.(s);
  }

  return r.state;
}
