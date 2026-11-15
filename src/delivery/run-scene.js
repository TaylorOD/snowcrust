import * as THREE from '../../vendor/three.module.js';
import { hazards, laneWidth, routeLength } from './route.js';

// The road moves beneath a stationary rider. All objects are allocated once.
export function createRunScene(scene, camera, models) {
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
  function sign(text, x, y, z, w = 5) {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#101b28';
    ctx.fillRect(0, 0, 768, 128);
    ctx.strokeStyle = '#569cd6';
    ctx.lineWidth = 7;
    ctx.strokeRect(4, 4, 760, 120);
    ctx.fillStyle = '#f1c17b';
    ctx.font = 'bold 44px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 384, 79, 730);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w / 6),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    mesh.position.set(x, y, z);
    root.add(mesh);
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
    blocks.push(group);
  }
  const rider = models.rider;
  rider.position.set(0, 0, 3);
  rider.rotation.y = Math.PI / 2;
  root.add(rider);
  const body = rider.children[1];
  const parcel = models.parcel;
  parcel.position.set(-0.35, 1.2, 2.5);
  parcel.rotation.set(0, Math.PI / 2, 0);
  root.add(parcel);
  const towCars = [];
  for (let i = 0; i < 3; i++) {
    const car = models.cars[i].clone(true);
    car.rotation.set(0, Math.PI / 2, 0);
    car.position.set((i - 1) * laneWidth, 0, -6);
    root.add(car);
    towCars.push(car);
  }
  const obstacles = hazards.map((hazard, i) => {
    const group = new THREE.Group();
    root.add(group);
    group.position.x = hazard.lane * laneWidth;
    if (hazard.type === 'van') {
      const car = models.cars[i % models.cars.length].clone(true);
      car.position.set(0, 0, 0);
      car.rotation.set(0, Math.PI / 2, 0);
      group.add(car);
    } else if (hazard.type === 'rail') {
      box(0, 0.3, 0, 2.7, 0.65, 0.35, '#e59f50', group);
      for (const x of [-0.9, 0, 0.9]) box(x, 0.3, 0.19, 0.12, 0.5, 0.02, '#14212b', group);
    } else {
      for (const x of [-1.35, 1.35]) box(x, 1.5, 0, 0.12, 3.3, 0.12, '#718b99', group);
      box(0, 1.55, 0, 2.8, 0.3, 0.25, '#e59f50', group);
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
  const destination = sign('U-Stor-It / DELIVERY', 0, 4, -80, 9);
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
      root.visible = true;
    },
    hide() {
      root.visible = false;
    },
    frame(state, reduced, blend = 1) {
      root.visible = true;
      rider.position.set(state.x * laneWidth, state.height, 3);
      body.scale.y = state.crouch ? 0.65 : 1;
      rider.rotation.z = reduced ? 0 : (state.lane - state.x) * -0.1;
      parcel.position.set(
        state.x * laneWidth - 0.35,
        state.height + (state.crouch ? 0.8 : 1.2),
        2.5
      );
      parcel.rotation.z = (100 - state.condition) * 0.0008;
      markings.forEach((m, i) => {
        m.position.z = 12 - ((Math.floor(i / 2) * 5 - (state.distance % 5) + 140) % 140);
      });
      blocks.forEach((b, i) => {
        b.position.z = 16 - ((Math.floor(i / 2) * 16 - (state.distance % 16) + 128) % 128);
      });
      obstacles.forEach((object, i) => {
        object.position.z = 3 - (hazards[i].distance - state.distance);
        object.visible = object.position.z > -65 && object.position.z < 8;
      });
      towCars.forEach((car, i) => {
        car.position.z = -7 - Math.abs(i - 1 - state.lane) * 9;
        car.visible = state.distance < routeLength - 35;
      });
      target.position.set(state.lane * laneWidth, 0.65, -4.7);
      target.visible = state.distance < routeLength - 35 && !state.towed;
      cable.visible = state.towed;
      const points = cableGeometry.attributes.position;
      points.setXYZ(0, state.x * laneWidth, 1.1 + state.height, 2.4);
      points.setXYZ(1, state.lane * laneWidth, 0.65, -4.8);
      points.needsUpdate = true;
      cableGeometry.computeBoundingSphere();
      destination.position.z = 3 - (routeLength - state.distance);
      billboard.position.z = -30 + (state.distance % 90);
      position.set(0, 8, 20);
      camera.fov = camera.aspect < 0.8 ? 64 : 42;
      camera.updateProjectionMatrix();
      aim.set(0, 0.7, -12);
      camera.position.lerp(position, blend);
      camera.lookAt(aim);
    }
  };
}
