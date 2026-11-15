import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryRun } from '../../src/delivery/run-model.js';
import { routeLength, runTimeLimit } from '../../src/delivery/route.js';
import { createTraffic, advanceTraffic, towPose } from '../../src/delivery/tow-traffic.js';
import { playDelivery } from '../delivery-pilot.js';
function advance(run, seconds, dt = 1 / 120) {
  for (let t = 0; t < seconds; t += dt) run.update(dt);
}

test('doing nothing fails without ghosting through the first barrier', () => {
  const run = createDeliveryRun();
  advance(run, 100);
  assert.equal(run.state.arrived, false);
  assert.equal(run.state.failed, true);
  assert.match(run.state.failure, /time expired/);
  assert.ok(run.state.distance < 80);
  assert.equal(run.state.hits, 1);
});
test('a skilled run delivers intact with two sustained tows', () => {
  const state = playDelivery();
  assert.equal(state.arrived, true);
  assert.equal(state.condition, 100);
  assert.equal(state.catches, 2);
  assert.ok(state.towSeconds > 40);
  assert.ok(state.elapsed > 60 && state.elapsed < 80);
  assert.equal(state.distance, routeLength);
});
test('one input moves exactly one lane, including rapid reversals', () => {
  const run = createDeliveryRun();
  run.action('left');
  advance(run, 0.2);
  assert.equal(run.state.x, -1);
  run.action('right');
  run.action('right');
  advance(run, 0.2);
  assert.equal(run.state.x, 1);
  run.action('right');
  advance(run, 0.2);
  assert.equal(run.state.x, 1);
});
test('hooking has travel time and supplies acceleration', () => {
  const run = createDeliveryRun({ startTowed: false });
  run.action('hook');
  assert.equal(run.state.towed, false);
  advance(run, 0.3);
  assert.equal(run.state.towed, true);
  advance(run, 2);
  assert.ok(run.state.speed > 16);
  run.action('left');
  advance(run, 0.2);
  assert.equal(run.state.x, -1);
  assert.equal(run.state.towed, true);
});
test('release preserves momentum and requires a separate input', () => {
  const run = createDeliveryRun({ startTowed: false });
  run.action('hook');
  advance(run, 2);
  const speed = run.state.speed;
  run.action('hook');
  advance(run, 0.1);
  assert.equal(run.state.towed, false);
  assert.ok(run.state.speed > speed - 0.3);
});
test('a missed hook cannot attach to another lane or teleport the rider', () => {
  const run = createDeliveryRun({ startTowed: false });
  run.action('left');
  advance(run, 0.2);
  run.action('hook');
  advance(run, 0.3);
  assert.equal(run.state.towed, false);
  assert.match(run.state.message, /miss/);
  assert.equal(run.state.x, -1);
});
test('pause freezes traffic, inputs, cooldowns and the clock', () => {
  const run = createDeliveryRun();
  run.action('hook');
  advance(run, 1);
  run.setPaused(true);
  const snapshot = structuredClone(run.state);
  run.action('right');
  advance(run, 15);
  assert.deepEqual(run.state, snapshot);
});
test('failure freezes the run and ignores further actions', () => {
  const run = createDeliveryRun();
  advance(run, 100);
  const snapshot = structuredClone(run.state);
  run.action('hook');
  run.action('jump');
  advance(run, 3);
  assert.deepEqual(run.state, snapshot);
});
test('a missed exit shows the turn then cuts the line without ending the delivery', () => {
  const run = createDeliveryRun();
  Object.assign(run.state, { towed: true, distance: 410, lane: 0, x: 0 });
  Object.assign(run.state.traffic[0], { distance: 423 });
  run.update(1 / 120);
  assert.equal(run.state.failed, false);
  assert.equal(run.state.towed, true);
  Object.assign(run.state, { distance: 437 });
  Object.assign(run.state.traffic[0], { distance: 449 });
  run.update(1 / 120);
  assert.equal(run.state.failed, false);
  assert.equal(run.state.towed, false);
  assert.equal(run.state.condition, 85);
  assert.match(run.state.message, /late release/);
});
test('jump and duck each clear their own obstacle', () => {
  for (const [distance, action] of [
    [76, 'jump'],
    [150, 'duck']
  ]) {
    const run = createDeliveryRun({ startTowed: false });
    run.state.distance = distance;
    run.state.traffic = [];
    run.action(action);
    advance(run, 0.9);
    assert.equal(run.state.condition, 100);
  }
});
test('duck cancels a jump for a following low beam', () => {
  const run = createDeliveryRun();
  run.action('jump');
  advance(run, 0.2);
  assert.ok(run.state.height > 0);
  run.action('duck');
  run.update(1 / 120);
  assert.equal(run.state.height, 0);
  assert.equal(run.state.crouch, true);
});
test('traffic advances forward and leaves space between cars', () => {
  const traffic = createTraffic();
  for (let t = 0; t < 75; t += 1 / 120) {
    const before = traffic.map((c) => c.distance);
    advanceTraffic(traffic, 1 / 120);
    traffic.forEach((car, i) => {
      assert.ok(car.distance >= before[i]);
      for (let j = i + 1; j < traffic.length; j++)
        if (Math.abs(car.x - traffic[j].x) < 0.65)
          assert.ok(Math.abs(car.distance - traffic[j].distance) > 8.5);
    });
  }
});
test('a car about to exit is not offered as a fresh target', () => {
  const car = createTraffic()[0];
  car.distance = 380;
  assert.equal(towPose(car, { distance: 360 }).reachable, false);
});
test('frame rate does not change unattended collision or failure results', () => {
  const a = createDeliveryRun(),
    b = createDeliveryRun();
  advance(a, 100, 1 / 30);
  advance(b, 100, 1 / 120);
  assert.equal(a.state.failure, b.state.failure);
  assert.equal(a.state.condition, b.state.condition);
  assert.equal(a.state.distance, b.state.distance);
  assert.ok(a.state.elapsed >= runTimeLimit);
});
test('assisted mode remains an explicit accessible way to reach the same address', () => {
  const run = createDeliveryRun({ assisted: true });
  advance(run, 180);
  assert.equal(run.state.arrived, true);
  assert.equal(run.state.condition, 100);
});

test('the playable road continues the opening tow at speed', () => {
  const run = createDeliveryRun();
  assert.equal(run.state.towed, true);
  assert.equal(run.state.towId, 0);
  assert.equal(run.state.catches, 1);
  assert.ok(run.state.speed >= 17);
});
