import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cloneDeliveredPizza } from '../../src/delivery/delivered-pizza.js';

test('the opened box keeps exact toppings and bite geometry without changing the kitchen', () => {
  const pizza = new THREE.Group();
  const slice = new THREE.Group();
  pizza.add(slice);
  slice.position.set(0.4, 0.2, 0.8);
  const crust = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial({ color: '#a56b3a' })
  );
  const bittenTopping = crust.clone();
  bittenTopping.visible = false;
  crust.position.set(0.7, 0.3, -0.5);
  slice.add(crust, bittenTopping);
  const delivered = cloneDeliveredPizza(pizza, 40);
  const copy = delivered.children[0];
  assert.notEqual(copy, slice);
  assert.equal(copy.children[0].geometry, crust.geometry);
  assert.equal(copy.children[0].material, crust.material);
  assert.deepEqual(copy.children[0].position, crust.position);
  assert.equal(copy.children[1].visible, false);
  assert.deepEqual(slice.position.toArray(), [0.4, 0.2, 0.8]);
  assert.notDeepEqual(copy.position.toArray(), [0, 0, 0]);
  const replay = cloneDeliveredPizza(pizza, 40);
  assert.deepEqual(replay.children[0].position, copy.position);
  assert.deepEqual(cloneDeliveredPizza(pizza, 100).children[0].position.toArray(), [0, 0, 0]);
});
