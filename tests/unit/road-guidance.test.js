import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryRun } from '../../src/delivery/run-model.js';
import { roadGuidance, roadExitNotice } from '../../src/delivery/road-guidance.js';
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

test('exit notice follows the road after losing or changing tow cars', () => {
  const state = { distance: 350, towed: false, traffic: [], towId: 0 };
  assert.match(roadExitNotice(state).title, /freight exit.*80 m/);
  assert.match(roadExitNotice(state).instruction, /not your exit/);
  state.towed = true;
  state.traffic = [{ exit: { distance: 430 } }];
  assert.match(roadExitNotice(state).instruction, /release tow/);
  state.traffic[0].exit.distance = 910;
  assert.match(roadExitNotice(state).instruction, /not your exit/);
});
