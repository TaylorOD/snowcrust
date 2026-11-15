import { createDeliveryRun } from '../src/delivery/run-model.js';
import { hazards } from '../src/delivery/route.js';
import { towPose } from '../src/delivery/tow-traffic.js';

// A repeatable successful player uses actions, never writes simulation state.
export function playDelivery(record = () => {}) {
  const r = createDeliveryRun();
  for (let i = 0; i < 120 * 100 && !r.state.arrived && !r.state.failed; i++) {
    const s = r.state;
    const act = (name) => {
      record({ at: s.elapsed, distance: s.distance, name });
      r.action(name);
    };
    if (i % 12 === 0) {
      const hazard = hazards.find(
        (h) =>
          h.distance > s.distance - 3 &&
          h.distance - s.distance <
            (['van', 'works'].includes(h.type) ? 20 : Math.max(4, s.speed * 0.36)) &&
          Math.abs(h.lane - s.x) < 0.6
      );
      if (hazard) {
        if (hazard.type === 'rail' && !s.jump) act('jump');
        else if (hazard.type === 'frame') act('duck');
        else if (['van', 'works'].includes(hazard.type) && Math.abs(s.x - s.lane) < 0.1) {
          const safe = [-1, 0, 1].filter(
            (l) =>
              Math.abs(l - s.lane) === 1 &&
              !hazards.some((h) => h.lane === l && Math.abs(h.distance - s.distance) < 25) &&
              !s.traffic.some(
                (c) => Math.abs(c.x - l) < 0.65 && Math.abs(c.distance - s.distance) < 8
              )
          );
          if (safe.length) act(safe[0] < s.lane ? 'left' : 'right');
        }
      }
      if (s.towed) {
        const c = s.traffic[s.towId];
        if (c.exit && c.distance > c.exit.distance - 22) act('hook');
      } else if (!s.protection && !s.hookFlight && !s.hookCooldown) {
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
  }

  return r.state;
}
