import * as THREE from '../../vendor/three.module.js';
import { createGeometry } from '../scene/geometry.js';

// Original physical delivery locations. Shared doorway geometry stays pooled
// while each caller gets the right address, materials and street furniture.
export function createArrivalSet(root, { steel, dark, pale }) {
  const { box } = createGeometry(root);
  const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
  let kind = 'storage';
  const details = {};
  for (const name of ['storage', 'motel', 'mews', 'checkpoint']) {
    details[name] = new THREE.Group();
    root.add(details[name]);
  }
  box(24, 0.3, 18, steel, root, 0, -0.3, 0);
  const facade = box(9, 5, 3, steel, root, 0, 2.2, -3);
  box(3, 3, 0.1, dark, root, 0, 1.2, -1.44);
  const door = new THREE.Group();
  root.add(door);
  door.position.set(0, 0, -1.35);
  box(2.8, 2.8, 0.12, steel, door, 0, 1.1, 0);
  const ribs = new THREE.Group();
  door.add(ribs);
  for (let i = 0; i < 14; i++) box(2.8, 0.04, 0.04, dark, ribs, 0, -0.2 + i * 0.2, 0.08);
  for (const child of door.children) child.position.x += 1.4;
  door.position.x = -1.4;
  const light = new THREE.PointLight('#ffd49c', 30, 14, 2);
  light.position.set(0, 4, 2);
  root.add(light);
  root.add(new THREE.HemisphereLight('#c6e0ee', '#33404a', 1));
  for (const x of [-3.7, 3.7]) {
    box(0.8, 1.3, 0.05, material('#91bccb'), root, x, 2.1, -1.44);
    box(1.2, 0.15, 0.4, dark, root, x, 1.4, -1.3);
  }
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 1024;
  labelCanvas.height = 256;
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 1.4),
    new THREE.MeshBasicMaterial({ map: labelTexture })
  );
  sign.position.set(0, 4, -1.42);
  root.add(sign);
  function label(destination, customer) {
    kind = destination.kind;
    for (const [name, group] of Object.entries(details)) group.visible = name === kind;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = '#0c1922';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#569cd6';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 1016, 248);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8ba77';
    ctx.font = 'bold 48px monospace';
    ctx.fillText(destination.name, 512, 85, 970);
    ctx.fillStyle = '#c4e0eb';
    ctx.font = '34px monospace';
    ctx.fillText(destination.address, 512, 155, 970);
    ctx.fillText(customer.name, 512, 212, 970);
    labelTexture.needsUpdate = true;
    facade.material = destination.kind === 'motel' ? pale : steel;
  }

  const orange = material('#b97638'),
    blue = material('#478bb0');
  const green = new THREE.MeshStandardMaterial({
    color: '#82ab69',
    emissive: '#31552b',
    emissiveIntensity: 0.6
  });
  const storage = details.storage;
  for (let i = 0; i < 3; i++) {
    box(0.8, 0.7, 0.8, pale, storage, -3 + (i % 2) * 0.85, 0.2 + Math.floor(i / 2) * 0.7, 0);
    box(0.06, 0.72, 0.82, dark, storage, -3 + (i % 2) * 0.85, 0.2 + Math.floor(i / 2) * 0.7, 0);
  }
  box(0.8, 0.05, 0.5, orange, storage, 3, 1, -1.1);
  box(0.08, 0.7, 0.08, dark, storage, 3, 0.6, -1.1);
  const motel = details.motel;
  box(8.6, 0.18, 1.6, pale, motel, 0, 3.1, -0.9);
  for (let i = 0; i < 11; i++) box(0.35, 0.2, 1.65, blue, motel, -4 + i * 0.8, 3.1, -0.9);
  box(1.1, 0.8, 0.6, dark, motel, -3, 0.3, -0.8);
  for (let i = 0; i < 6; i++) box(0.9, 0.035, 0.03, steel, motel, -3, 0.1 + i * 0.1, -0.48);
  const mews = details.mews;
  box(1, 1.5, 0.8, steel, mews, 3.2, 0.6, 0);
  box(0.7, 0.8, 0.04, dark, mews, 3.2, 0.8, 0.42);
  box(0.13, 0.13, 0.04, green, mews, 3.2, 1.1, 0.45);
  box(0.3, 1.3, 0.3, dark, mews, -3.8, 0.5, 1);
  const gate = new THREE.Group();
  gate.position.set(-3.8, 1.15, 1);
  mews.add(gate);
  box(2.1, 0.12, 0.15, pale, gate, 1, 0, 0);
  for (let i = 0; i < 4; i++) box(0.15, 0.13, 0.16, orange, gate, 0.2 + i * 0.5, 0, 0);
  const booth = details.checkpoint;
  box(8.8, 0.3, 1.8, blue, booth, 0, 3.15, -0.8);
  for (const x of [-3.4, 3.4]) {
    box(0.25, 1.1, 0.25, orange, booth, x, 0.4, 1);
    box(0.27, 0.2, 0.27, dark, booth, x, 0.65, 1);
  }
  return {
    show: label,
    frame(seconds) {
      const t = Math.max(0, Math.min(1, (seconds - 0.5) / 1.4));
      const opened = t * t * (3 - 2 * t);
      ribs.visible = kind === 'storage';
      door.scale.y = kind === 'storage' ? 1 - opened * 0.94 : 1;
      door.position.y = kind === 'storage' ? opened * 2.3 : 0;
      door.rotation.y = kind === 'storage' ? 0 : -opened * 1.6;
      gate.rotation.z = opened * 1.3;
    }
  };
}
