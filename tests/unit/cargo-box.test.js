import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCargoBox, carryGrip, cargoSize } from '../../src/delivery/cargo-box.js';

test('pickup, road and handoff share the same box dimensions and hinged lid', () => {
  const original = createCargoBox(THREE);
  for (const box of [original, original.clone(true), original.clone(true)]) {
    const bounds = new THREE.Box3().setFromObject(box);
    assert.ok(Math.abs(bounds.max.x - bounds.min.x - cargoSize) < 0.02);
    const lid = box.getObjectByName('cargo-lid');
    assert.ok(lid);
    lid.rotation.x = -1.7;
    box.updateMatrixWorld(true);
    assert.ok(new THREE.Box3().setFromObject(lid).max.y > 0.9);
  }
});
test('the carried box stays outside the torso through standing and crouching', () => {
  for (let bend = 0; bend <= 0.6; bend += 0.01) {
    const grip = carryGrip(bend);
    assert.ok(grip[2] - cargoSize / 2 > 0.3);
    assert.ok(grip[1] > 0.7);
  }
});
