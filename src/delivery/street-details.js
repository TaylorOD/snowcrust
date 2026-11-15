import * as THREE from '../../vendor/three.module.js';
import { freightExit } from './tow-traffic.js';

// Landmarks have fixed addresses along the route. They explain the road's
// changing rhythm without replacing the existing geometric art.
export function createStreetDetails(root, { box, sign, batch }) {
  const landmarks = [];
  function place(distance) {
    const group = new THREE.Group();
    root.add(group);
    landmarks.push({ distance, group });
    return group;
  }
  function label(group, text, x, y, width) {
    const panel = sign(text, x, y, 0, width);
    group.add(panel);
    (group.userData.labels ??= []).push(panel);
  }
  const dispatch = place(28);
  box(-8, 3.2, 0, 4, 0.25, 10, '#284656', dispatch);
  box(-7.9, 1.5, -2, 0.15, 3, 6, '#35677d', dispatch);
  label(dispatch, 'C0saN0stra / DISPATCH', -7, 3.7, 6);
  for (let i = 0; i < 4; i++) {
    box(-6.3, 0.02, i * 2 - 3, 1, 0.02, 0.08, '#d7b275', dispatch);
    box(-7, 0.3, i * 1.2 - 2, 0.5, 0.6, 0.6, '#847250', dispatch);
  }

  const overpass = place(195);
  box(0, 7, 0, 23, 0.8, 24, '#263a47', overpass);
  for (const x of [-7, 7]) {
    for (const z of [-9, 9]) box(x, 3.2, z, 0.8, 6.4, 0.8, '#465967', overpass);
    box(x, 6.5, 0, 0.12, 0.08, 23, '#60b3ce', overpass, true);
  }
  for (const z of [-7, 0, 7]) box(0, 6.5, z, 10, 0.06, 0.15, '#a5c3cf', overpass, true);
  label(overpass, 'RadiKS / THROUGH ROUTE', 0, 5.4, 8);

  const utilities = place(265);
  box(-7.4, 0.8, 0, 1.5, 1.6, 3, '#3c5661', utilities);
  for (const z of [-1, 0, 1]) box(-6.6, 1.1, z, 0.05, 0.45, 0.5, '#86b7c4', utilities, true);
  label(utilities, 'SERVICE CREW / KEEP CLEAR', -6, 2.4, 5);

  const boundary = place(380);
  boundary.userData.hideAfterPassing = true;
  for (const x of [-6.3, 6.3]) box(x, 2.6, 0, 0.35, 5.2, 0.35, '#77909c', boundary);
  box(0, 5.2, 0, 13, 0.3, 0.4, '#425f71', boundary);
  label(boundary, 'FRANCHISE BOUNDARY / KOURIERS THROUGH', 0, 4.7, 10);
  box(7.2, 1.2, 3, 2, 2.4, 3, '#254453', boundary);
  box(6.15, 1.6, 3, 0.06, 0.7, 1.5, '#81b9b0', boundary, true);

  const exitPost = place(freightExit.distance - 10);
  box(6, 1.7, 0, 0.15, 3.4, 0.15, '#718b99', exitPost);
  const neighborhood = place(505);
  label(neighborhood, 'DELIVERY ACCESS / SLOW TRAFFIC', 0, 4, 9);
  for (const x of [-6, 6]) {
    box(x, 2, 0, 0.12, 4, 0.12, '#718b99', neighborhood);
    box(x, 1.1, 7, 0.7, 2.2, 0.5, '#334e58', neighborhood);
    box(x, 1.8, 7.3, 0.5, 0.3, 0.04, '#82ab69', neighborhood, true);
  }
  landmarks.forEach(({ group }) => batch(group));
  return {
    frame(distance) {
      landmarks.forEach(({ distance: at, group }) => {
        group.position.z = 3 - (at - distance);
        group.visible =
          group.position.z < 30 &&
          group.position.z > -110 &&
          !(group.userData.hideAfterPassing && group.position.z >= 3);
        // The chase camera sits behind the rider. Passed signs must not fill it.
        group.userData.labels?.forEach((panel) => {
          panel.visible = group.position.z < -2;
        });
      });
    }
  };
}
