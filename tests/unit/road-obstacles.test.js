import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleHazardCues } from '../../src/delivery/road-guidance.js';
import { hazards } from '../../src/delivery/route.js';
import { createDeliveryRun } from '../../src/delivery/run-model.js';

test('every hazard has an advance warning with at least two seconds at cruise', () => {
  for (const hazard of hazards) {
    assert.ok(visibleHazardCues(hazard.distance - 42).includes(hazard));
    assert.ok(!visibleHazardCues(hazard.distance + 0.01).includes(hazard));
  }
});

test('markers only identify the nearest upcoming hazard in each lane', () => {
  for (let distance = 0; distance < 960; distance++) {
    const cues = visibleHazardCues(distance);
    assert.equal(new Set(cues.map((h) => h.lane)).size, cues.length);
    for (const cue of cues) {
      assert.equal(
        cue,
        hazards.find((h) => h.lane === cue.lane && h.distance >= distance)
      );
      assert.ok(cue.distance - distance <= 60);
    }
  }
  assert.equal(visibleHazardCues(430).length, 2);
});

// Each visual type must still tell the truth about the collision rules.
for (const [type, action, safe] of [
  ['rail', 'jump', true],
  ['rail', 'duck', false],
  ['frame', 'duck', true],
  ['frame', 'jump', false],
  ['works', 'left', true],
  ['works', 'jump', false],
  ['van', 'right', true],
  ['van', 'duck', false]
]) {
  test(type + ' with ' + action + (safe ? ' clears' : ' blocks'), () => {
    const hazard = hazards.find((h) => h.type === type);
    const run = createDeliveryRun({ startTowed: false });
    Object.assign(run.state, {
      distance: hazard.distance - 7,
      lane: hazard.lane,
      x: hazard.lane,
      traffic: []
    });
    run.action(action);
    for (let i = 0; i < 110; i++) run.update(1 / 120);
    assert.equal(run.state.condition === 100, safe);
    assert.equal(run.state.distance > hazard.distance + 2, safe);
  });
}
