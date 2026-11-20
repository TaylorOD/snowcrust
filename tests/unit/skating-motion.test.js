import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSkatingMotion } from '../../src/delivery/skating-motion.js';

function rig() {
  const rider = new THREE.Group();
  for (const name of [
    'body',
    'torso',
    'head',
    'launcher',
    'board',
    'back-thigh',
    'back-shin',
    'front-thigh',
    'front-shin',
    'back-knee',
    'front-knee',
    'back-shoe',
    'front-shoe',
    'left-upper-arm',
    'left-forearm',
    'right-upper-arm',
    'right-forearm',
    'left-elbow',
    'right-elbow'
  ]) {
    const joint = new THREE.Group();
    joint.name = name;
    rider.add(joint);
  }
  return rider;
}

test('crouching clears the overhead beam without shrinking the rider', () => {
  const rider = rig();
  const motion = createSkatingMotion(rider);
  motion.frame({ crouch: true, towed: true, jump: 0, elapsed: 0, landing: 0 }, false);
  assert.equal(rider.getObjectByName('body').scale.y, 1);
  // Helmet extends about 0.3m above the head origin. Beam underside is 1.4m.
  assert.ok(rider.getObjectByName('head').position.y + 0.3 < 1.4);
  assert.equal(rider.getObjectByName('front-shoe').position.y, 0);
});

test('the push foot reaches the road while the front foot stays planted', () => {
  const rider = rig();
  const motion = createSkatingMotion(rider);
  motion.frame({ crouch: false, towed: false, jump: 0, elapsed: Math.PI / 4, landing: 0 }, false);
  assert.ok(rider.getObjectByName('back-shoe').position.y < 0);
  assert.equal(rider.getObjectByName('front-shoe').position.y, 0);
});

test('fast coasting keeps both feet on the board after release', () => {
  const rider = rig();
  createSkatingMotion(rider).frame(
    { speed: 19, towBlend: 0, towed: false, elapsed: Math.PI / 4 },
    false
  );
  for (const side of ['front', 'back']) {
    assert.equal(rider.getObjectByName(side + '-shoe').position.y, 0);
    assert.ok(Math.abs(rider.getObjectByName(side + '-shoe').position.z) < 0.1);
  }
});
