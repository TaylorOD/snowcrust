// One box is built for pickup and cloned for the ride and handoff.
// Named lid and damage parts survive cloning without duplicating dimensions.
export const cargoSize = 0.94;
export function createCargoBox(THREE) {
  const root = new THREE.Group();
  root.name = 'cargo-box';
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const card = new THREE.MeshStandardMaterial({ color: '#bbae85', roughness: 0.85 });
  const red = new THREE.MeshStandardMaterial({ color: '#a34a40', roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: '#293945' });
  function box(parent, x, y, z, w, h, d, material = card) {
    const mesh = new THREE.Mesh(cube, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  box(root, 0, 0, 0, cargoSize, 0.045, cargoSize);
  for (const x of [-0.46, 0.46]) box(root, x, 0.055, 0, 0.025, 0.12, cargoSize);
  for (const z of [-0.46, 0.46]) box(root, 0, 0.055, z, cargoSize, 0.12, 0.025);
  const hinge = new THREE.Group();
  hinge.position.set(-0.47, 0.12, 0);
  hinge.rotation.y = Math.PI / 2;
  root.add(hinge);
  const lid = new THREE.Group();
  lid.name = 'cargo-lid';
  hinge.add(lid);
  box(lid, 0, 0, 0.47, cargoSize, 0.025, cargoSize);
  box(lid, 0, 0.016, 0.47, 0.04, 0.006, 0.9, red);
  box(lid, 0.28, 0.018, 0.22, 0.2, 0.01, 0.14, dark);
  const dents = new THREE.Group();
  dents.name = 'cargo-dents';
  dents.visible = false;
  root.add(dents);
  for (const x of [-0.25, 0, 0.25])
    box(dents, x, 0.06, 0.478, 0.035, 0.055, 0.008, dark).rotation.z = 0.5;
  return root;
}
// Box centre stays outside the torso even in the deepest crouch.
export function carryGrip(bend = 0.12) {
  return [0.35, 1.1 - bend * 0.5, 0.82];
}
