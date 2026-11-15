import { createStreetDetails } from './street-details.js';
import { createSkatingMotion } from './skating-motion.js';
import * as THREE from '../../vendor/three.module.js';
import { hazards, laneWidth } from './route.js';
import { towCars as traffic, towPose, freightExit } from './tow-traffic.js';

// The road moves beneath a stationary rider. All objects are allocated once.
export function createRunScene(scene, camera, models) {
  const originalFog = scene.fog.clone();
  const originalFar = camera.far;
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  root.add(new THREE.HemisphereLight('#b9d5ed', '#233544', 1.2));
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const materials = {};
  function material(color, glow = false) {
    const key = color + glow;
    return (materials[key] ??= new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.25,
      emissive: glow ? color : '#000000',
      emissiveIntensity: glow ? 0.7 : 0
    }));
  }
  function box(x, y, z, w, h, d, color, parent = root, glow = false) {
    const mesh = new THREE.Mesh(cube, material(color, glow));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  // Buildings and landmarks move as groups. Batch repeated boxes by material
  // once, preserving their local transforms and shared geometry.
  function batch(group) {
    const buckets = new Map();
    group.children.forEach((mesh) => {
      if (mesh.geometry !== cube || mesh.isInstancedMesh) return;
      if (!buckets.has(mesh.material)) buckets.set(mesh.material, []);
      buckets.get(mesh.material).push(mesh);
    });
    for (const [material, meshes] of buckets) {
      if (meshes.length < 2) continue;
      const instances = new THREE.InstancedMesh(cube, material, meshes.length);
      instances.castShadow = true;
      instances.receiveShadow = true;
      meshes.forEach((mesh, i) => {
        mesh.updateMatrix();
        instances.setMatrixAt(i, mesh.matrix);
        group.remove(mesh);
      });
      group.add(instances);
    }
  }
  function sign(text, x, y, z, w = 5) {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    function write(text) {
      ctx.fillStyle = '#101b28';
      ctx.fillRect(0, 0, 768, 128);
      ctx.strokeStyle = '#569cd6';
      ctx.lineWidth = 7;
      ctx.strokeRect(4, 4, 760, 120);
      ctx.fillStyle = '#f1c17b';
      ctx.font = 'bold 44px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(text, 384, 79, 730);
      texture.needsUpdate = true;
    }
    write(text);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w / 6),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    mesh.position.set(x, y, z);
    root.add(mesh);
    mesh.userData.write = write;
    return mesh;
  }
  box(0, -0.36, -60, 12, 0.3, 160, '#18232e');
  for (const side of [-1, 1]) box(side * 8, -0.25, -60, 4, 0.5, 160, '#374958');
  const markings = [];
  for (let i = 0; i < 28; i++)
    for (const x of [-1.7, 1.7]) markings.push(box(x, -0.195, -i * 5, 0.06, 0.01, 2.4, '#8cb0bb'));
  const blocks = [];
  for (let i = 0; i < 16; i++) {
    const group = new THREE.Group();
    root.add(group);
    const side = i % 2 ? 1 : -1,
      height = 4 + (i % 4) * 2.4;
    group.position.set(side * 11.5, 0, -Math.floor(i / 2) * 16);
    box(0, height / 2 - 0.3, 0, 7, height, 11, '#233544', group);
    for (let floor = 1; floor < height; floor += 2)
      for (const z of [-3.5, 0, 3.5])
        box(-side * 3.51, floor, z, 0.04, 0.9, 0.8, i % 3 ? '#75b2c9' : '#d2a56c', group, true);
    box(-side * 3.55, 0.8, 0, 0.05, 2, 3.5, '#485b68', group);
    for (let rib = 0; rib < 10; rib++)
      box(-side * 3.59, rib * 0.2, 0, 0.05, 0.045, 3.5, '#17232e', group);
    if (i % 3 === 0) {
      box(-side * 4.4, 2.7, 4, 0.12, 5.5, 0.12, '#718b99', group);
      box(-side * 4.4, 5.4, 4, 0.7, 0.12, 1.1, '#b6e4ea', group, true);
    }
    box(-side * 3.6, 2.3, 0, 0.04, 0.3, 1.3, '#c39c60', group, true);
    batch(group);
    blocks.push(group);
  }
  const exitRoad = new THREE.Group();
  root.add(exitRoad);
  box(19, 0.01, -16, 26, 0.02, 36, '#18232e', exitRoad);
  for (const x of [8, 12, 16, 20, 24]) box(x, 0.025, -16, 2, 0.01, 0.12, '#8cb0bb', exitRoad);
  const exitSign = sign('FREIGHT ACCESS / THROUGH ROUTE ↑', 6, 3.5, -60, 7);
  const streets = createStreetDetails(root, { box, sign, batch });
  const rider = models.rider;
  rider.position.set(0, 0, 3);
  rider.rotation.y = Math.PI / 2;
  root.add(rider);
  const skating = createSkatingMotion(rider);
  const hand = new THREE.Vector3(),
    rear = new THREE.Vector3();
  const board = rider.getObjectByName('board');
  const wheels = [];
  board.traverse((object) => {
    if (object.name === 'board-wheel') wheels.push(object);
  });
  const parcel = models.parcel;
  parcel.position.set(-0.35, 1.2, 2.5);
  parcel.rotation.set(0, Math.PI / 2, 0);
  root.add(parcel);
  const towCars = [];
  for (let i = 0; i < traffic.length; i++) {
    const car = models.cars[i % models.cars.length].clone(true);
    car.rotation.set(0, Math.PI / 2, 0);
    car.position.set((i - 1) * laneWidth, 0, -6);
    root.add(car);
    const indicator = box(-1.9, 0.65, 0.7, 0.14, 0.14, 0.14, '#ffbc59', car, true);
    car.userData.indicator = indicator;
    car.userData.wheels = [];
    car.traverse((object) => {
      if (object.name === 'car-wheel') car.userData.wheels.push(object);
    });
    towCars.push(car);
  }
  const obstacles = hazards.map((hazard, i) => {
    const group = new THREE.Group();
    root.add(group);
    group.position.x = hazard.lane * laneWidth;
    if (hazard.type === 'works') {
      box(0, 0.55, 0, 2.5, 1.1, 2, '#58606a', group);
      for (const x of [-0.9, 0, 0.9]) box(x, 0.6, 1.03, 0.18, 0.7, 0.03, '#e59f50', group);
      box(0, -0.18, -2, 3, 0.02, 6, '#39434b', group);
    } else if (hazard.type === 'van') {
      const car = models.cars[i % models.cars.length].clone(true);
      car.position.set(0, 0, 0);
      car.rotation.set(0, Math.PI / 2, 0);
      group.add(car);
      for (const x of [-1.4, 1.4]) box(x, -0.18, 0, 0.07, 0.02, 7, '#d7b275', group);
      for (const z of [4, 5.5, 7]) {
        box(0, 0.15, z, 0.4, 0.35, 0.4, '#e59f50', group);
        box(0, 0.33, z, 0.2, 0.1, 0.2, '#d9dfd5', group);
      }
    } else if (hazard.type === 'rail') {
      box(0, 0.3, 0, 2.7, 0.65, 0.35, '#e59f50', group);
      box(0, -0.18, -2, 2.8, 0.02, 4, '#39434b', group);
      box(0.9, 0.2, -3, 0.5, 0.4, 0.7, '#58606a', group);
      for (const x of [-0.9, 0, 0.9]) box(x, 0.3, 0.19, 0.12, 0.5, 0.02, '#14212b', group);
    } else {
      for (const x of [-1.35, 1.35]) box(x, 1.5, 0, 0.12, 3.3, 0.12, '#718b99', group);
      box(0, 1.55, 0, 2.8, 0.3, 0.25, '#e59f50', group);
      box(0, 3, 0, 2.8, 0.12, 0.12, '#718b99', group);
      box(1.2, 2.2, 0, 0.2, 1.3, 0.2, '#425f71', group);
    }
    return group;
  });
  const cableGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3()
  ]);
  const cable = new THREE.Line(cableGeometry, new THREE.LineBasicMaterial({ color: '#a9ebee' }));
  root.add(cable);
  const target = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.035, 6, 20),
    new THREE.MeshBasicMaterial({ color: '#8ab575' })
  );
  root.add(target);
  const lastJunction = new THREE.Group();
  root.add(lastJunction);
  box(-19, 0.01, 0, 26, 0.02, 36, '#18232e', lastJunction);
  for (const x of [-8, -12, -16, -20, -24])
    box(x, 0.025, 0, 2, 0.01, 0.12, '#8cb0bb', lastJunction);
  const billboard = sign('RadiKS / KOURIER ROUTE', -7, 6, -28, 7);
  const aim = new THREE.Vector3(),
    position = new THREE.Vector3();
  return {
    root,
    rider,
    parcel,
    box,
    sign,
    material,
    show() {
      rider.visible = parcel.visible = true;
      root.visible = true;
      scene.fog.near = 50;
      scene.fog.far = 105;
      camera.far = 140;
    },
    park() {
      rider.visible = parcel.visible = cable.visible = target.visible = false;
    },
    hide() {
      root.visible = false;
      scene.fog.near = originalFog.near;
      scene.fog.far = originalFog.far;
      camera.far = originalFar;
    },
    frame(state, reduced, blend = 1) {
      root.visible = true;
      streets.frame(state.distance);
      rider.position.set(state.x * laneWidth, state.height, 3);
      const carry = skating.frame(state, reduced);
      board.rotation.x = reduced ? 0 : (state.lane - state.x) * 0.12;
      wheels.forEach((wheel) => {
        wheel.rotation.z = -state.distance / 0.23;
      });
      rider.rotation.z = reduced ? 0 : (state.lane - state.x) * -0.1;
      root.updateMatrixWorld(true);
      parcel.position.copy(skating.body.localToWorld(hand.set(...carry)));
      parcel.rotation.z =
        (100 - state.condition) * 0.0008 +
        (reduced ? 0 : Math.sin(state.protection * 28) * Math.min(state.protection, 0.2));
      markings.forEach((m, i) => {
        m.position.z = 12 - ((Math.floor(i / 2) * 5 - (state.distance % 5) + 140) % 140);
      });
      blocks.forEach((b, i) => {
        b.position.z = 16 - ((Math.floor(i / 2) * 16 - (state.distance % 16) + 128) % 128);
        const world = state.distance + 3 - b.position.z;
        b.visible =
          world < 540 &&
          !(b.position.x < 0 && world > 490) &&
          !(
            b.position.x > 0 &&
            world > freightExit.distance - 15 &&
            world < freightExit.distance + 50
          );
      });
      exitRoad.position.z = 3 - (freightExit.distance - state.distance);
      exitSign.position.z = exitRoad.position.z + 10;
      obstacles.forEach((object, i) => {
        object.position.z = 3 - (hazards[i].distance - state.distance);
        object.visible = object.position.z > -65 && object.position.z < 8;
      });
      towCars.forEach((car, i) => {
        const pose = towPose(state.traffic[i], state);
        car.position.set(pose.x, 0, pose.z);
        car.rotation.y = pose.yaw;
        car.visible = pose.visible;
        car.userData.wheels.forEach((wheel) => {
          wheel.rotation.z = -state.traffic[i].distance / 0.39;
        });
        car.userData.indicator.visible =
          pose.signal && (reduced || Math.floor(state.elapsed * 3) % 2 === 0);
      });
      const selected = state.towed ? state.towId : state.targetId;
      const car = selected >= 0 ? towCars[selected] : null;
      target.visible = Boolean(car) && !state.towed;
      if (car) target.position.set(car.position.x, 0.65, car.position.z + 2.2);
      target.scale.setScalar(reduced ? 1 : 1 + Math.sin(state.elapsed * 4) * 0.12);
      cable.visible = state.towed && Boolean(car);
      const points = cableGeometry.attributes.position;
      skating.launcher.localToWorld(hand.set(0.2, 0, 0));
      points.setXYZ(0, hand.x, hand.y, hand.z);
      if (car) {
        car.updateMatrixWorld(true);
        car.localToWorld(rear.set(-2.17, 0.65, 0));
        points.setXYZ(1, rear.x, rear.y, rear.z);
      }
      points.needsUpdate = true;
      cableGeometry.computeBoundingSphere();
      lastJunction.position.z = 3 - (530 - state.distance);
      billboard.position.z = -30 + (state.distance % 90);
      billboard.visible = state.distance < 500;
      position.set(state.x * 0.35, 5.5, 13);
      camera.fov = camera.aspect < 0.8 ? 62 : 52;
      camera.updateProjectionMatrix();
      aim.set(state.x * 0.2, 0, -12);
      camera.position.lerp(position, blend);
      camera.lookAt(aim);
    }
  };
}
