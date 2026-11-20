import test from 'node:test';
import assert from 'node:assert/strict';
import { exitRamp, rampLength } from '../../src/delivery/exit-ramp.js';
import { createTraffic, advanceTraffic, towPose } from '../../src/delivery/tow-traffic.js';

test('both ramps merge every lane into a shallow forward path within the pavement', () => {
  for (const side of [-1, 1]) {
    for (const start of [-3.4, 0, 3.4]) {
      assert.equal(exitRamp(0, side, start).x, start);
      assert.equal(exitRamp(0, side, start).yaw, Math.PI / 2);
      for (let distance = 0; distance <= rampLength; distance += 0.5) {
        const pose = exitRamp(distance, side, start);
        const center = exitRamp(distance, side);
        assert.ok(Math.abs(pose.x - center.x) + 1.3 < center.halfWidth);
        assert.ok(Math.abs(pose.yaw - Math.PI / 2) < Math.PI / 6);
        assert.equal(pose.forward, distance);
      }
      assert.ok(
        Math.abs(exitRamp(59.999, side, start).yaw - exitRamp(60.001, side, start).yaw) < 0.001
      );
    }
  }
});

test('departing traffic keeps moving forward and follows the rendered ramp', () => {
  const car = createTraffic()[0];
  car.distance = car.exit.distance;
  const previous = towPose(car, { distance: 420 });
  advanceTraffic([car], 1 / 120);
  const after = towPose(car, { distance: 420 });
  assert.ok(after.distance > previous.distance);
  const from = car.x * 3.4;
  for (let i = 0; i < 600; i++) advanceTraffic([car], 1 / 120);
  const pose = towPose(car, { distance: 420 });
  assert.ok(pose.distance > previous.distance + 99);
  assert.ok(pose.x > from);
  assert.ok(Math.abs(pose.yaw - Math.PI / 2) < Math.PI / 6);
});
