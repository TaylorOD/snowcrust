import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryRun } from '../../src/delivery/run-model.js';
import { roadGuidance } from '../../src/delivery/road-guidance.js';
test('failed runs show the reason instead of another tow hint', () => {
  const { state } = createDeliveryRun();
  Object.assign(state, { failed: true, failure: 'cargo lost' });
  assert.equal(roadGuidance(state), 'cargo lost');
});
test('obstacles get action guidance before contact', () => {
  const { state } = createDeliveryRun();
  Object.assign(state, { distance: 55, messageTime: 0 });
  assert.match(roadGuidance(state), /jump or change lanes/);
  state.distance = 140;
  assert.match(roadGuidance(state), /duck or change lanes/);
});
test('exit warning takes priority over obstacles', () => {
  const { state } = createDeliveryRun();
  Object.assign(state, { towed: true, distance: 365, messageTime: 0 });
  state.traffic[0].distance = 380;
  assert.match(roadGuidance(state), /release now/);
});
