import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryRun } from '../../src/delivery/run-model.js';
import { hazards, routeLength } from '../../src/delivery/route.js';
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
