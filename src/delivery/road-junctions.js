import * as THREE from '../../vendor/three.module.js';
import { roadExits, laneWidth } from './route.js';

// The fork follows the same 24 metre turn as traffic. Its wide apron leaves
// room for cars entering from any lane without painting a fourth player lane.
export function createRoadJunctions(root, { box, batch }) {
  const green = new THREE.MeshBasicMaterial({ color: '#a9dfb0' });
  const amber = new THREE.MeshBasicMaterial({ color: '#efb45f' });
  const asphalt = new THREE.MeshStandardMaterial({ color: '#223440', roughness: 0.9 });
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(-0.25, -1.8);
  arrowShape.lineTo(0.25, -1.8);
  arrowShape.lineTo(0.25, 0.5);
  arrowShape.lineTo(0.85, 0.5);
  arrowShape.lineTo(0, 1.8);
  arrowShape.lineTo(-0.85, 0.5);
  arrowShape.lineTo(-0.25, 0.5);
  arrowShape.closePath();
  const arrowGeometry = new THREE.ShapeGeometry(arrowShape);

  function arrow(group, x, z, yaw, material) {
    const marker = new THREE.Mesh(arrowGeometry, material);
    marker.rotation.set(-Math.PI / 2, 0, 0);
    const turn = new THREE.Group();
    turn.rotation.y = yaw;
    turn.position.set(x, 0.04, z);
    turn.add(marker);
    group.add(turn);
  }

  function panel(title, direction, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0c1d29';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = ctx.fillStyle = color;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 246);
    ctx.textAlign = 'center';
    ctx.font = 'bold 58px monospace';
    ctx.fillText(title, 256, 80, 480);
    ctx.font = 'bold 76px monospace';
    ctx.fillText(direction, 256, 184, 480);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(3, 2),
      new THREE.MeshBasicMaterial({ map: texture })
    );
  }

  const junctions = roadExits.map((exit) => {
    const group = new THREE.Group();
    root.add(group);
    const signs = [];
    // Advance signs and pavement arrows repeat the same directions. A rider
    // who loses the tow still sees exactly where the delivery road continues.
    for (const z of [62, 6]) {
      const gantry = new THREE.Group();
      gantry.position.z = z;
      group.add(gantry);
      for (const x of [-6.5, 6.5]) box(x, 3.5, 0, 0.18, 7, 0.25, '#647d8e', gantry);
      box(0, 7, 0, 13.2, 0.22, 0.3, '#647d8e', gantry);
      for (const x of [-1.6, 1.6]) box(x, 6.8, 0, 0.12, 0.4, 0.15, '#647d8e', gantry);
      const delivery = panel('DELIVERY', '↑ AHEAD', '#a9dfb0');
      delivery.position.set(-exit.side * 1.6, 5.6, 0.2);
      gantry.add(delivery);
      const turn = panel(
        exit.side > 0 ? 'FREIGHT' : 'TRAFFIC',
        exit.side > 0 ? 'EXIT →' : '← EXIT',
        '#efb45f'
      );
      turn.position.set(exit.side * 1.6, 5.6, 0.2);
      gantry.add(turn);
      signs.push(gantry);
      batch(gantry);
    }
    for (const z of [80, 52, 25, 4, -18])
      for (const lane of [-1, 0, 1]) arrow(group, lane * laneWidth, z, 0, green);

    // A curved strip replaces the old rectangular side street. A separate
    // edge and amber arrows make the branch visible without relying on text.
    const vertices = [];
    const edge = [];
    for (let i = 0; i <= 32; i++) {
      const angle = ((i / 32) * Math.PI) / 2;
      for (const radius of [18, 30])
        vertices.push(
          exit.side * (24 - radius * Math.cos(angle)),
          0.015,
          -radius * Math.sin(angle)
        );
      edge.push(
        new THREE.Vector3(exit.side * (24 - 30 * Math.cos(angle)), 0.05, -30 * Math.sin(angle))
      );
    }
    const indices = [];
    for (let i = 0; i < 32; i++) {
      const n = i * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const surface = new THREE.Mesh(geometry, asphalt);
    surface.material.side = THREE.DoubleSide;
    group.add(surface);
    const border = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(edge),
      new THREE.LineBasicMaterial({ color: '#efb45f' })
    );
    group.add(border);
    box(exit.side * 38, 0, -24, 28, 0.03, 12, '#223440', group);
    for (const angle of [0.55, 0.9, 1.25, Math.PI / 2])
      arrow(
        group,
        exit.side * 24 * (1 - Math.cos(angle)),
        -24 * Math.sin(angle),
        -exit.side * angle,
        amber
      );
    // Short luminous posts trace the far edge of the fork, outside the lanes.
    for (const angle of [0.7, 1, 1.3, Math.PI / 2]) {
      const x = exit.side * (24 - 30 * Math.cos(angle));
      const z = -30 * Math.sin(angle);
      if (Math.abs(x) < 6.5) continue;
      box(x, 0.55, z, 0.18, 1.1, 0.18, '#efb45f', group, true);
    }
    batch(group);
    return { exit, group, signs };
  });
  return {
    frame(distance) {
      junctions.forEach(({ exit, group, signs }) => {
        group.position.z = 3 - (exit.distance - distance);
        group.visible = distance > exit.distance - 180 && distance < exit.distance + 65;
        // Passed gantries must not cross the chase camera or hide the rider.
        signs.forEach((gantry) => {
          gantry.visible = group.position.z + gantry.position.z < 1;
        });
      });
    }
  };
}
