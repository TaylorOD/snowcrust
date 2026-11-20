import test from 'node:test';
import assert from 'node:assert/strict';
import { rideFeel } from '../../src/delivery/ride-feel.js';
import { createDeliveryRun } from '../../src/delivery/run-model.js';

test('release keeps the speed cue and coasts before pushing again', () => {
  const run = createDeliveryRun();
  const before = rideFeel(run.state);
  run.action('hook');
  assert.equal(run.state.speed, 20);
  assert.equal(rideFeel(run.state).pace, before.pace);
  run.update(0.2);
  assert.ok(run.state.speed > 19);
  assert.equal(rideFeel(run.state).push, 0);
  assert.ok(run.state.towBlend > 0 && run.state.towBlend < 0.2);
  assert.equal(rideFeel({ speed: 14, towed: false }).push, 1);
});

test('a catch builds the towing pose while speed increases without a jump', () => {
  const run = createDeliveryRun({ startTowed: false });
  run.action('hook');
  run.update(0.25);
  assert.equal(run.state.towed, true);
  assert.ok(run.state.speed > 14 && run.state.speed < 16);
  assert.ok(run.state.towBlend > 0 && run.state.towBlend < 0.5);
  const snapshot = structuredClone(run.state);
  run.state.paused = true;
  run.update(2);
  assert.equal(run.state.towBlend, snapshot.towBlend);
});
