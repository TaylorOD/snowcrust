import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryRun } from '../../src/delivery/run-model.js';
import { roadGuidance } from '../../src/delivery/road-guidance.js';
import { recoveryFeedback } from '../../src/delivery/recovery-feedback.js';
import { playDelivery } from '../delivery-pilot.js';

function advance(run, seconds) {
  for (let i = 0; i < Math.ceil(seconds * 120); i++) run.update(1 / 120);
}

function hitHazard(run, distance, lane) {
  Object.assign(run.state, { distance: distance - 1, lane, x: lane, speed: 14 });
  advance(run, 0.02);
}

for (const lane of [-1, 0, 1]) {
  test('traffic collision in lane ' + lane + ' reports damage and permits steering', () => {
    const run = createDeliveryRun({ startTowed: false });
    Object.assign(run.state, { x: lane, lane });
    run.state.traffic = [{ ...run.state.traffic[0], x: lane, lane, distance: 4 }];
    advance(run, 0.02);
    assert.equal(run.state.lastImpact.cause, 'traffic');
    assert.equal(run.state.condition, 65);
    assert.match(recoveryFeedback(run.state).title, /100% → 65%/);
    run.action(lane === 1 ? 'left' : 'right');
    advance(run, 0.2);
    assert.notEqual(run.state.x, lane);
    assert.ok(run.state.protection > 0);
    assert.equal(run.state.condition, 65);
  });
}

test('remaining at one barrier cannot repeatedly drain cargo or hide the way out', () => {
  const run = createDeliveryRun({ startTowed: false });
  run.state.traffic = [];
  hitHazard(run, 80, 0);
  advance(run, 4);
  assert.equal(run.state.hits, 1);
  assert.equal(run.state.condition, 65);
  assert.equal(run.state.blocked, 'rail');
  assert.ok(run.state.distance < 80);
  assert.equal(recoveryFeedback(run.state).progress, 0);
  assert.match(recoveryFeedback(run.state).instruction, /jump or steer now/);
  run.action('right');
  advance(run, 1);
  assert.equal(run.state.blocked, null);
  assert.ok(run.state.distance > 80);
  assert.equal(recoveryFeedback(run.state), null);
});

test('protection prevents stacked damage but does not make the next obstacle intangible', () => {
  const run = createDeliveryRun({ startTowed: false });
  run.state.traffic = [];
  hitHazard(run, 80, 0);
  hitHazard(run, 155, 0);
  assert.equal(run.state.hits, 1);
  assert.equal(run.state.condition, 65);
  assert.equal(run.state.blocked, 'frame');
  assert.ok(run.state.distance < 155);
  assert.match(recoveryFeedback(run.state).instruction, /duck or steer now/);
});

test('separate impacts record actual loss through failure and retry starts clean', () => {
  const run = createDeliveryRun({ startTowed: false });
  run.state.traffic = [];
  hitHazard(run, 80, 0);
  advance(run, 1.3);
  hitHazard(run, 200, 1);
  assert.equal(run.state.condition, 30);
  assert.equal(run.state.lastImpact.before, 65);
  advance(run, 1.3);
  hitHazard(run, 275, -1);
  assert.equal(run.state.condition, 0);
  assert.equal(run.state.lastImpact.before, 30);
  assert.equal(run.state.lastImpact.after, 0);
  assert.equal(run.state.failed, true);
  assert.equal(recoveryFeedback(run.state), null);
  const snapshot = structuredClone(run.state);
  run.action('right');
  run.action('hook');
  advance(run, 2);
  assert.deepEqual(run.state, snapshot);
  const retry = createDeliveryRun();
  assert.equal(retry.state.condition, 100);
  assert.equal(retry.state.lastImpact, null);
  assert.equal(retry.state.blocked, null);
  assert.equal(recoveryFeedback(retry.state), null);
});

test('hook readiness follows the real cooldown rather than the protection timer', () => {
  const run = createDeliveryRun({ startTowed: false });
  run.state.traffic = [{ ...run.state.traffic[0], distance: 4 }];
  advance(run, 0.02);
  run.state.traffic[0].distance = run.state.distance + 11;
  run.state.targetId = 0;
  assert.match(recoveryFeedback(run.state).instruction, /poon ready/);
  run.action('hook');
  assert.ok(run.state.hookFlight > 0);
  assert.match(recoveryFeedback(run.state).instruction, /poon away/);
  advance(run, 0.3);
  assert.equal(run.state.towed, true);
  assert.ok(run.state.protection > 0);
  assert.match(recoveryFeedback(run.state).instruction, /tow attached/);
});

test('pause freezes recovery and hides its notice behind the pause menu', () => {
  const run = createDeliveryRun({ startTowed: false });
  run.state.traffic = [];
  hitHazard(run, 80, 0);
  const protection = run.state.protection;
  run.setPaused(true);
  advance(run, 3);
  assert.equal(run.state.protection, protection);
  assert.equal(recoveryFeedback(run.state), null);
  run.setPaused(false);
  assert.ok(recoveryFeedback(run.state).progress > 0);
});

test('a crash still ends at the delivery address with replacement towing available', () => {
  const state = playDelivery(() => {}, { hitFirst: true });
  assert.equal(state.arrived, true);
  assert.equal(state.distance, 960);
  assert.equal(state.condition, 65);
  assert.ok(state.catches > 1);
  assert.equal(recoveryFeedback(state), null);
});

test('moving clear removes stale impact instructions from road guidance', () => {
  const run = createDeliveryRun({ startTowed: false });
  run.state.traffic = [];
  hitHazard(run, 80, 0);
  run.action('right');
  advance(run, 0.3);
  assert.equal(run.state.blocked, null);
  assert.ok(run.state.messageTime > 0);
  assert.doesNotMatch(roadGuidance(run.state), /blocked|jump/);
});

test('recovery guidance does not send the rider back into a blocked lane for a tow', () => {
  const run = createDeliveryRun({ startTowed: false });
  Object.assign(run.state, { distance: 198, x: 0, lane: 0, targetId: -1, messageTime: 0 });
  run.state.traffic = [{ ...run.state.traffic[0], distance: 210, x: 1, lane: 1 }];
  assert.doesNotMatch(roadGuidance(run.state), /move right/);
});
