import test from 'node:test';
import assert from 'node:assert/strict';
import { playDelivery } from '../delivery-pilot.js';
import { trafficSpeed } from '../../src/delivery/tow-traffic.js';

for (const releaseAt of [0, 100, 200, 300, 400, 500, 600, 700, 800]) {
  for (const hookDelay of [2, 5, 10]) {
    test(`release at ${releaseAt}m and wait ${hookDelay}s still permits delivery`, () => {
      const state = playDelivery(() => {}, { releaseAt, hookDelay });
      assert.equal(state.arrived, true, state.failure);
      assert.ok(state.condition > 0);
      assert.ok(state.elapsed < 90);
    });
  }
}
test('the delivery can finish without catching any replacement car', () => {
  const state = playDelivery(() => {}, { noTow: true });
  assert.equal(state.arrived, true);
  assert.equal(state.catches, 1);
  assert.equal(state.condition, 100);
});
test('an early crash and fifteen seconds of hesitation remain recoverable', () => {
  for (const options of [{ hitFirst: true }, { waitUntil: 15 }]) {
    const state = playDelivery(() => {}, options);
    assert.equal(state.arrived, true);
    assert.equal(state.hits, 1);
    assert.equal(state.condition, 65);
  }
});
test('missing both exit releases costs cargo but does not change the destination', () => {
  const state = playDelivery(() => {}, { missExit: true });
  assert.equal(state.arrived, true);
  assert.equal(state.distance, 960);
  assert.equal(state.condition, 70);
});
test('a clean tow holds cruising speed instead of queueing behind traffic', () => {
  let slowest = Infinity,
    longestTow = 0,
    currentTow = 0;
  const state = playDelivery(() => {}, {
    observe(s) {
      if (s.towed) {
        slowest = Math.min(slowest, s.traffic[s.towId].velocity);
        currentTow += 1 / 120;
        longestTow = Math.max(longestTow, currentTow);
      } else currentTow = 0;
    }
  });
  assert.equal(state.arrived, true);
  assert.ok(slowest >= trafficSpeed - 0.01, `tow slowed to ${slowest}`);
  assert.ok(longestTow >= 18, `longest tow was ${longestTow}`);
});
