import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryRun } from '../../src/delivery/run-model.js';
import { hazards, routeLength } from '../../src/delivery/route.js';
import {
  towCars,
  towPose,
  trafficLane,
  createTraffic,
  advanceTraffic
} from '../../src/delivery/tow-traffic.js';
function advance(run, seconds, dt = 1 / 60) {
  for (let t = 0; t < seconds; t += dt) run.update(dt);
}
test('a finite delivery finishes even when the cargo is damaged', () => {
  const run = createDeliveryRun();
  advance(run, 90);
  assert.equal(run.state.distance, routeLength);
  assert.equal(run.state.arrived, true);
  assert.ok(run.state.condition >= 0);
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

test('the first car supports a continuous twenty second tow', () => {
  const run = createDeliveryRun();
  advance(run, 20);
  assert.equal(run.state.towed, true);
  assert.equal(run.state.towId, 0);
  assert.equal(run.state.condition, 100);
  assert.ok(Math.abs(towPose(run.state.traffic[0], run.state).gap - 10) < 0.1);
});

test('traffic advances without reversing or overlapping', () => {
  const traffic = createTraffic();
  for (let t = 0; t < 90; t += 1 / 120) {
    const before = traffic.map((car) => car.distance);
    advanceTraffic(traffic, 1 / 120);
    traffic.forEach((car, i) => {
      assert.ok(car.distance >= before[i]);
      for (let j = i + 1; j < traffic.length; j++) {
        if (Math.abs(car.x - traffic[j].x) < 0.65)
          assert.ok(Math.abs(car.distance - traffic[j].distance) >= 8.5);
      }
    });
  }
});

test('release keeps momentum and smoothly slows the rider', () => {
  const run = createDeliveryRun();
  advance(run, 2);
  run.action('hook');
  run.update(1 / 60);
  assert.ok(run.state.speed > 13.8);
  advance(run, 2);
  assert.equal(run.state.speed, 9);
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

test('traffic clears authored road obstructions', () => {
  for (const car of towCars)
    for (const hazard of hazards) {
      if (car.lowProfile && hazard.type === 'frame') continue;
      for (let distance = hazard.distance - 6; distance <= hazard.distance + 6; distance += 0.5) {
        assert.ok(Math.abs(trafficLane(car, distance).x - hazard.lane) > 0.8);
      }
    }
});

test('following traffic leaves space for the rider', () => {
  const run = createDeliveryRun();
  for (let i = 0; i < 40 * 120 && !run.state.arrived; i++) {
    run.update(1 / 120);
    for (const car of run.state.traffic) {
      if (Math.abs(car.x - run.state.x) < 0.55)
        assert.ok(Math.abs(car.distance - run.state.distance) > 3.5);
    }
  }
});

test('carving and jumping preserve the tow until an intentional release', () => {
  const run = createDeliveryRun();
  run.action('left');
  advance(run, 1);
  assert.equal(run.state.towed, true);
  assert.ok(run.state.x < -0.6);
  run.action('jump');
  advance(run, 0.4);
  assert.equal(run.state.towed, true);
  assert.ok(run.state.height > 1);
  run.action('hook');
  assert.equal(run.state.towed, false);
});

test('the first tow warns for at least three seconds before its side street', () => {
  const run = createDeliveryRun();
  let warnedAt = null;
  while (run.state.towed && run.state.elapsed < 60) {
    if (run.state.distance > 332 && run.state.distance < 339) run.action('duck');
    run.update(1 / 120);
    if (warnedAt === null && /turning right/.test(run.state.message)) warnedAt = run.state.elapsed;
  }
  assert.ok(warnedAt > 20);
  assert.ok(run.state.elapsed - warnedAt >= 3);
  assert.match(run.state.message, /side street/);
});

test('several cars are visible at dispatch', () => {
  const run = createDeliveryRun();
  assert.ok(
    run.state.traffic.filter((car) => towPose(car, run.state).visible && car.distance > 0).length >=
      4
  );
});

test('the side street turn stays inside its cleared opening', () => {
  const car = createTraffic()[0];
  for (let d = 430; d <= 480; d += 0.1) {
    car.distance = d;
    car.x = trafficLane(car, d).x;
    const pose = towPose(car, { distance: 400 });
    if (pose.x > 6 && pose.x < 32) {
      assert.ok(pose.distance >= 428 && pose.distance <= 464);
      assert.ok(pose.yaw >= 0 && pose.yaw <= Math.PI / 2);
    }
  }
});

test('traffic contact prevents passing through a car and only damages once', () => {
  const run = createDeliveryRun();
  Object.assign(run.state, { towed: false, speed: 14 });
  run.state.traffic = [{ start: 4, distance: 5.1, speed: 7, velocity: 7, lane: 0, x: 0 }];
  advance(run, 0.3);
  assert.equal(run.state.hits, 1);
  assert.equal(run.state.condition, 90);
  assert.ok(run.state.traffic[0].distance - run.state.distance >= 5);
  assert.equal(run.state.lane, 0);
  advance(run, 1.5);
  assert.equal(run.state.hits, 1);
});

test('a low coupe passes a beam that its rider must duck under', () => {
  assert.equal(trafficLane(towCars[0], 340).x, 0);
  const run = createDeliveryRun();
  advance(run, 32);
  assert.ok(run.state.hits > 0);
  assert.ok(run.state.condition < 100);
});

test('the last twenty metres coast into the doorstep position', () => {
  const run = createDeliveryRun();
  while (run.state.distance < 545) run.update(1 / 60);
  assert.equal(run.state.approaching, true);
  assert.equal(run.state.towed, false);
  const lane = run.state.lane;
  run.action('left');
  assert.equal(run.state.lane, lane);
  advance(run, 10);
  assert.equal(run.state.arrived, true);
  assert.ok(Math.abs(run.state.x * 3.4 - 2.1) < 0.01);
  assert.equal(run.state.speed, 4);
});

test('through traffic turns away before the delivery forecourt', () => {
  for (const car of createTraffic().slice(1)) {
    car.distance = 550;
    car.x = trafficLane(car, car.distance).x;
    const pose = towPose(car, { distance: 540 });
    assert.ok(pose.x < -15);
    assert.ok(pose.distance < 535);
  }
});
