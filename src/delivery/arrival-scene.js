import { carryGrip } from './cargo-box.js';
import { routeLength } from './route.js';
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
export function createArrivalScene(scene, camera, riderModel, parcelModel) {
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
  const parcel = parcelModel.clone(true);
  root.add(parcel);
  const lid = parcel.getObjectByName('cargo-lid');
  const dents = parcel.getObjectByName('cargo-dents');
  rider.getObjectByName('launcher').visible = false;
  let displayedPizza = null,
    damage = 0;
  let startFov = 52;
  const startRotation = new THREE.Quaternion();
  const endRotation = new THREE.Quaternion();
  const cameraStart = new THREE.Vector3(),
    cameraTarget = new THREE.Vector3();
  const carryStart = new THREE.Vector3();
  const hold = new THREE.Vector3(),
    restHand = new THREE.Vector3();
  const carry = new THREE.Vector3(),
    destination = new THREE.Vector3(0, 1.12, 0.8);
  return {
    preview(address, caller) {
      doorstep.show(address, caller);
      doorstep.frame(0);
      rider.visible = board.visible = parcel.visible = customer.visible = false;
    },
    approach(distance) {
      root.visible = distance > routeLength - 105;
      root.position.z = -1 - (routeLength - distance);
    },
    show(pizza, result, address, caller, carried = null) {
      cameraStart.copy(camera.position);
      startRotation.copy(camera.quaternion);
      startFov = camera.fov;
      root.position.z = -1;
      carryStart.copy(carried ?? new THREE.Vector3(1.05, 1.08, 3));
      carryStart.z += 1;
      rider.visible = board.visible = parcel.visible = customer.visible = true;
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
      rider.position.set(2.1 - park * 0.7 - transfer * 0.55, 0, 4 - park * 2.2);
      board.position.set(2.1, 0, 4 - park * 2.2);
      board.rotation.set(0, Math.PI / 2 + (park * Math.PI) / 2, 0);
      body.position.y = -park * 0.3;
      body.position.z = 0;
      for (const [side, x] of [
        ['back', -0.2],
        ['front', 0.2]
      ]) {
        limb(side + '-thigh', [0, 0.9, 0], [x, 0.65, 0], 0.12);
        const stride = Math.sin((park + transfer) * Math.PI * 2 + (side === 'front' ? 0 : Math.PI));
        const lift = Math.max(0, stride) * 0.07;
        const footX = x + stride * 0.1;
        limb(side + '-shin', [x, 0.65, 0], [footX, 0.42 + lift, 0], 0.105);
        rider.getObjectByName(side + '-knee').position.set(x, 0.65, 0);
        rider.getObjectByName(side + '-shoe').position.set(footX, lift, 0);
      }
      const release = handedSeconds === null ? 0 : ease((handedSeconds - 1.5) / 0.8);
      torso.position.set(0, 1.15, 0);
      torso.rotation.z = 0;
      head.position.set(0, 1.8, 0);
      head.rotation.y = 0;
      rider.rotation.y = Math.PI / 2 + (park * Math.PI) / 2;
      root.updateMatrixWorld(true);
      // Derive the box from the same grip used on the road. It follows the
      // body through parking, then moves between the two people's hands.
      const grip = carryGrip(0);
      carry.set(grip[0], grip[1] + 0.04, grip[2]);
      body.localToWorld(carry);
      root.worldToLocal(carry);
      if (park < 1) carry.lerp(carryStart, 1 - park);
      parcel.position.copy(carry).lerp(destination, transfer);
      parcel.rotation.set(0, rider.rotation.y * (1 - transfer), 0);
      parcel.updateMatrixWorld(true);
      for (const [side, z] of [
        ['left', 0.25],
        ['right', -0.25]
      ]) {
        // Hands stay on the near edge until the customer has taken the load.
        hold.set(side === 'left' ? 0.22 : -0.22, -0.025, 0.24);
        parcel.localToWorld(hold);
        body.worldToLocal(hold);
        hold.lerp(restHand.set(0.12, 0.85, z), release);
        const shoulder = [0, 1.4, z];
        const elbow = [0.2, 1.12, z + (hold.z - z) * 0.5];
        limb(side + '-upper-arm', shoulder, elbow, 0.085);
        limb(side + '-forearm', elbow, hold.toArray(), 0.07);
        rider.getObjectByName(side + '-elbow').position.set(...elbow);
      }
      doorstep.frame(seconds);
      headset.rotation.x = handedSeconds === null ? 0 : -ease(handedSeconds / 1.2) * 1.2;
      lid.rotation.x = handedSeconds === null ? 0 : -ease((handedSeconds - 1.6) / 1.6) * 1.7;
      hands.forEach((hand) => {
        hand.position.y = 1.03 + transfer * 0.03;
      });
      const reveal = handedSeconds === null ? 0 : ease((handedSeconds - 1.5) / 2.5);
      if (camera.aspect < 0.8) cameraTarget.set(3 - reveal * 1.5, 5.5 - reveal, 13 - reveal * 6);
      else cameraTarget.set(4.5 - reveal * 2.4, 4.5 - reveal * 1.1, 8 - reveal * 4.8);
      const cameraBlend = reduced ? 1 : ease(seconds / 1.5);
      camera.fov = startFov + ((camera.aspect < 0.8 ? 58 : 42) - startFov) * cameraBlend;
      camera.position.lerpVectors(cameraStart, cameraTarget, reduced ? 1 : ease(seconds / 0.8));
      camera.lookAt(0, 1.2, -0.7);
      endRotation.copy(camera.quaternion);
      camera.quaternion.slerpQuaternions(startRotation, endRotation, cameraBlend);
      camera.updateProjectionMatrix();
    }
  };
}
