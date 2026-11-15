import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryRun } from '../../src/delivery/run-model.js';
import { roadGuidance } from '../../src/delivery/road-guidance.js';

test('exit and damage warnings take priority over ordinary tow guidance', () => {
  const { state } = createDeliveryRun();
  state.traffic[0].distance = 380;
  assert.match(roadGuidance(state), /turning right/);
  state.protection = 1;
  state.message = 'cargo impact / keep moving';
  assert.equal(roadGuidance(state), state.message);
});

test('the low beam gets an early action cue', () => {
  const { state } = createDeliveryRun();
  state.distance = 310;
  assert.match(roadGuidance(state), /duck or carve/);
});

test('catch guidance requires a reachable target and accounts for jumping', () => {
  const { state } = createDeliveryRun();
  state.towed = false;
  assert.match(roadGuidance(state), /bumper in reach/);
  state.jump = 0.5;
  assert.match(roadGuidance(state), /land to catch/);
  state.targetId = -1;
  state.traffic = [];
  assert.match(roadGuidance(state), /watch for a bumper/);
});
