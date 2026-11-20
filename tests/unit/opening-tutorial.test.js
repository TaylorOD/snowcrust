import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryRun } from '../../src/delivery/run-model.js';
import { openingLesson } from '../../src/delivery/opening-tutorial.js';

test('the first ride starts towed and explains steering without stopping the road', () => {
  const run = createDeliveryRun();
  assert.match(openingLesson(run.state).message, /already towed/);
  run.action('left');
  run.update(0.2);
  assert.equal(run.state.lane, -1);
  assert.equal(run.state.towed, true);
  assert.ok(run.state.distance > 0);
});

for (const assisted of [false, true]) {
  test('following jump and duck timing clears the first hazards, assisted=' + assisted, () => {
    const run = createDeliveryRun({ assisted });
    const used = new Set();
    let pending = null;
    while (run.state.distance < 165 && run.state.elapsed < 20) {
      const lesson = openingLesson(run.state);
      for (const name of ['jump', 'duck'])
        if (!pending && lesson?.actions.length === 1 && lesson.actions[0] === name)
          pending = { name, at: run.state.elapsed + 0.2 };
      if (pending && run.state.elapsed >= pending.at) {
        const { name } = pending;
        used.add(name);
        run.action(name);
        pending = null;
      }
      run.update(1 / 60);
    }
    assert.deepEqual([...used], ['jump', 'duck']);
    assert.equal(run.state.hits, 0);
    assert.ok(run.state.distance >= 165);
  });
}

test('lessons follow the actual lane instead of asking for a jump at an empty lane', () => {
  const { state } = createDeliveryRun();
  Object.assign(state, { distance: 73, x: 0 });
  assert.deepEqual(openingLesson(state).actions, ['jump']);
  state.x = 1;
  assert.equal(openingLesson(state), null);
});

test('exit lesson follows the current tow and a new catch is taught only in reach', () => {
  const { state } = createDeliveryRun();
  Object.assign(state, { distance: 365 });
  state.traffic[0].distance = 380;
  assert.match(openingLesson(state).message, /release tow/);
  state.towed = false;
  state.distance = 420;
  state.x = -1;
  state.targetId = -1;
  assert.equal(openingLesson(state), null);
  state.targetId = 1;
  assert.match(openingLesson(state).message, /fire poon/);
  state.hookFlight = 0.2;
  assert.equal(openingLesson(state), null);
});

test('hits, pause, arrival and failure suppress tutorial highlights', () => {
  for (const key of ['paused', 'failed', 'approaching', 'arrived']) {
    const { state } = createDeliveryRun();
    state[key] = true;
    assert.equal(openingLesson(state), null);
  }
  const { state } = createDeliveryRun();
  state.lastImpact = { cause: 'rail', before: 100, after: 65, at: 0 };
  state.protection = 1.2;
  assert.equal(openingLesson(state), null);
});
