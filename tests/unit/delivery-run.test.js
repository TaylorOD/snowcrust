import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryRun } from '../../src/delivery/run-model.js';
import { hazards, routeLength } from '../../src/delivery/route.js';
import { towCars, towPose } from '../../src/delivery/tow-traffic.js';
function advance(run, seconds, dt = 1 / 60) {
  for (let t = 0; t < seconds; t += dt) run.update(dt);
}
test('a finite delivery finishes even when the cargo is damaged', () => {
  const run = createDeliveryRun();
  advance(run, 90);
  assert.equal(run.state.distance, routeLength);
  assert.equal(run.state.arrived, true);
  assert.ok(run.state.condition < 100);
});
test('pause freezes movement, damage and delivery time', () => {
  const run = createDeliveryRun();
  advance(run, 2);
  run.setPaused(true);
  const snapshot = { ...run.state };
  advance(run, 30);
  run.action('left');
  assert.deepEqual(run.state, snapshot);
});
test('lane changes release the tow and stay inside the road', () => {
  const run = createDeliveryRun();
  run.action('left');
  run.action('left');
  advance(run, 1);
  assert.equal(run.state.lane, -1);
  assert.equal(run.state.towed, false);
  assert.ok(run.state.x >= -1);
});
test('assisted delivery reaches the same address without collision penalties', () => {
  const run = createDeliveryRun({ assisted: true });
  advance(run, 90);
  assert.equal(run.state.arrived, true);
  assert.equal(run.state.condition, 100);
});
test('all authored hazards leave two clear lanes and ample recovery distance', () => {
  hazards.forEach((h, i) => {
    assert.ok([-1, 0, 1].includes(h.lane));
    if (i) assert.ok(h.distance - hazards[i - 1].distance >= 35);
  });
});
test('different frame rates produce the same route result', () => {
  const a = createDeliveryRun(),
    b = createDeliveryRun();
  advance(a, 90, 1 / 30);
  advance(b, 90, 1 / 120);
  assert.equal(a.state.hits, b.state.hits);
  assert.equal(a.state.condition, b.state.condition);
  assert.equal(a.state.distance, b.state.distance);
});

test('tows warn before turning and release before the car leaves its lane', () => {
  const run = createDeliveryRun();
  advance(run, 2);
  assert.match(run.state.message, /exit/);
  advance(run, 2);
  assert.equal(run.state.towed, false);
  assert.equal(run.state.condition, 100);
  for (const car of towCars) {
    assert.equal(towPose(car, car.end - 30).signal, true);
    assert.equal(towPose(car, car.end - 15).reachable, false);
    for (let d = car.start; d < car.end; d += 0.25) {
      const pose = towPose(car, d);
      if (!pose.reachable) continue;
      assert.ok(pose.z <= -7, 'a reachable car stays ahead of the landing area');
      for (const h of hazards) {
        if (h.lane === car.lane) assert.ok(Math.abs(3 - (h.distance - d) - pose.z) > 8);
      }
    }
  }
});

test('the harpoon cannot attach across lanes or during a jump', () => {
  const run = createDeliveryRun();
  run.action('left');
  advance(run, 0.1);
  run.action('hook');
  assert.equal(run.state.towed, false);
  run.action('right');
  advance(run, 0.5);
  run.action('jump');
  run.action('hook');
  assert.equal(run.state.towed, false);
});

test('a timely jump clears a rail and a duck clears an overhead frame', () => {
  for (const [type, action] of [
    ['rail', 'jump'],
    ['frame', 'duck']
  ]) {
    const hazard = hazards.find((h) => h.type === type);
    const run = createDeliveryRun();
    Object.assign(run.state, {
      distance: hazard.distance - 4,
      lane: hazard.lane,
      x: hazard.lane,
      towed: false
    });
    // Pass earlier hazards in other lanes before starting the action window.
    run.update(1 / 120);
    run.state.condition = 100;
    run.state.protection = 0;
    run.action(action);
    advance(run, 0.7);
    assert.equal(run.state.condition, 100);
  }
});
