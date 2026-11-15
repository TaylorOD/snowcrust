import * as THREE from '../../vendor/three.module.js';
import { createGeometry } from '../scene/geometry.js';
import { createArrivalSet } from './arrival-set.js';
import { cloneDeliveredPizza } from './delivered-pizza.js';
const ease = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

// A reusable doorstep set. Only the pizza meshes are cloned per order, and
// those clones share kitchen geometry and materials rather than allocating GPU resources.
export function createArrivalScene(scene, camera, riderModel) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const { box, ball } = createGeometry(root);
  const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
  const steel = material('#3d5364'),
    dark = material('#172633'),
    pale = material('#c1b18d');
  const skin = material('#b98a6a'),
    cloth = material('#526678');
  const doorstep = createArrivalSet(root, { steel, dark, pale });
  const customer = new THREE.Group();
  root.add(customer);
  customer.position.set(0, 0, -0.3);
  box(0.65, 0.8, 0.4, cloth, customer, 0, 1.1, 0);
  ball(0, 1.78, 0, 0.24, 0.28, 0.23, skin, customer);
  for (const x of [-0.2, 0.2]) {
    box(0.22, 0.75, 0.23, dark, customer, x, 0.4, 0);
    box(0.25, 0.12, 0.4, dark, customer, x, 0.04, 0.09);
  }
  const headset = new THREE.Group();
  headset.position.set(0, 1.88, 0);
  customer.add(headset);
  box(0.53, 0.14, 0.16, dark, headset, 0, -0.08, 0.2);
  for (const x of [-0.25, 0.25]) box(0.07, 0.18, 0.3, dark, headset, x, -0.02, 0);
  const hands = [];
  for (const x of [-0.44, 0.44]) {
    box(0.18, 0.45, 0.2, cloth, customer, x, 1.2, 0.05);
    box(0.16, 0.16, 0.6, skin, customer, x, 1.02, 0.32);
    hands.push(ball(x, 1.03, 0.62, 0.11, 0.08, 0.13, skin, customer));
  }
  const rider = riderModel.clone(true);
  root.add(rider);
  rider.rotation.set(0, Math.PI / 2, 0);
  const board = rider.getObjectByName('board');
  const body = rider.getObjectByName('body');
  root.add(board);
  const torso = rider.getObjectByName('torso'),
    head = rider.getObjectByName('head');
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0);
  function limb(name, from, to, width) {
    const mesh = rider.getObjectByName(name);
    a.set(...from);
    b.set(...to).sub(a);
    mesh.position.copy(a).addScaledVector(b, 0.5);
    mesh.scale.set(width, b.length(), width);
    mesh.quaternion.setFromUnitVectors(up, b.normalize());
  }
  const parcel = new THREE.Group();
  root.add(parcel);
  box(1.45, 0.1, 1.45, pale, parcel);
  for (const x of [-0.71, 0.71]) box(0.04, 0.2, 1.45, pale, parcel, x, 0.08, 0);
  for (const z of [-0.71, 0.71]) box(1.45, 0.2, 0.04, pale, parcel, 0, 0.08, z);
  const hinge = new THREE.Group();
  parcel.add(hinge);
  hinge.position.set(-0.72, 0.18, 0);
  hinge.rotation.y = Math.PI / 2;
  const lid = new THREE.Group();
  hinge.add(lid);
  box(1.45, 0.045, 1.45, pale, lid, 0, 0, 0.72);
  box(1.3, 0.008, 0.05, material('#a34a40'), lid, 0, 0.03, 0.72);
  const dents = new THREE.Group();
  parcel.add(dents);
  for (let i = 0; i < 3; i++)
    box(0.05, 0.08, 0.01, dark, dents, -0.4 + i * 0.2, 0.05, 0.75).rotation.z = 0.5;
  let displayedPizza = null,
    damage = 0;
  const cameraStart = new THREE.Vector3(),
    cameraTarget = new THREE.Vector3();
  const carry = new THREE.Vector3(),
    destination = new THREE.Vector3(0, 1.12, 0.8);
  return {
    show(pizza, result, address, caller) {
      cameraStart.copy(camera.position);
      root.visible = true;
      doorstep.show(address, caller);
      headset.visible = address.kind === 'motel';
      cloth.color.set(
        address.kind === 'mews' ? '#847344' : address.kind === 'checkpoint' ? '#42738c' : '#526678'
      );
      displayedPizza?.removeFromParent();
      displayedPizza = cloneDeliveredPizza(pizza, result.condition);
      damage = (100 - result.condition) / 100;
      parcel.add(displayedPizza);
      dents.visible = damage > 0;
    },
    hide() {
      root.visible = false;
      displayedPizza?.removeFromParent();
      displayedPizza = null;
    },
    frame(seconds, handedSeconds, reduced) {
      const park = ease(seconds / 2);
      const transfer = handedSeconds === null ? 0 : ease(handedSeconds / 1.5);
      rider.position.set(2.1 - transfer * 0.8, 0, 4 - park * 2.2 - transfer * 0.5);
      board.position.set(2.1 - park * 1.1, 0, 4 - park * 2.2);
      board.rotation.set(0, Math.PI / 2 + (park * Math.PI) / 2, 0);
      body.position.y = -park * 0.3;
      body.position.z = 0;
      for (const [side, x] of [
        ['back', -0.2],
        ['front', 0.2]
      ]) {
        limb(side + '-thigh', [0, 0.9, 0], [x, 0.65, 0], 0.12);
        const stride = Math.sin(transfer * Math.PI * 2 + (side === 'front' ? 0 : Math.PI));
        const lift = Math.max(0, stride) * 0.07;
        const footX = x + stride * 0.1;
        limb(side + '-shin', [x, 0.65, 0], [footX, 0.42 + lift, 0], 0.105);
        rider.getObjectByName(side + '-knee').position.set(x, 0.65, 0);
        rider.getObjectByName(side + '-shoe').position.set(footX, lift, 0);
      }
      const release = handedSeconds === null ? 0 : ease((handedSeconds - 1.5) / 0.8);
      const handX = (0.65 + transfer * 0.25) * (1 - release) + release * 0.25;
      const handY = 1.34 - release * 0.4;
      const handZ = transfer * 0.5 * (1 - release);
      rider.getObjectByName('launcher').position.set(handX, handY, handZ - 0.25);
      torso.position.set(0, 1.15, 0);
      torso.rotation.z = 0;
      head.position.set(0, 1.8, 0);
      head.rotation.y = 0;
      rider.rotation.y = Math.PI / 2 + (park * Math.PI) / 2;
      for (const [side, z] of [
        ['left', 0.25],
        ['right', -0.25]
      ]) {
        limb(side + '-upper-arm', [0, 1.4, z], [0.3, 1.15, z], 0.085);
        limb(side + '-forearm', [0.3, 1.15, z], [handX, handY, z + handZ], 0.07);
        rider.getObjectByName(side + '-elbow').position.set(0.3, 1.15, z);
      }
      doorstep.frame(seconds);
      headset.rotation.x = handedSeconds === null ? 0 : -ease(handedSeconds / 1.2) * 1.2;
      carry.set(1.05, 1.08, 4 - park * 2.2);
      parcel.position.copy(carry).lerp(destination, transfer);
      parcel.rotation.set(0, (1 - transfer) * 0.2, 0);
      lid.rotation.x = handedSeconds === null ? 0 : -ease((handedSeconds - 1.6) / 1.6) * 1.85;
      hands.forEach((hand) => {
        hand.position.y = 1.03 + transfer * 0.03;
      });
      const reveal = handedSeconds === null ? 0 : ease((handedSeconds - 1.5) / 2.5);
      cameraTarget.set(4.5 - reveal * 2.4, 4.5 + reveal * 0.5, 9 - reveal * 4.2);
      camera.fov = camera.aspect < 0.8 ? 58 : 42;
      camera.position.lerpVectors(cameraStart, cameraTarget, reduced ? 1 : ease(seconds / 0.8));
      camera.lookAt(0, 1.2, 0.3);
      camera.updateProjectionMatrix();
    }
  };
}
