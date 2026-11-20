import * as THREE from '../../vendor/three.module.js';
import { hazards, laneWidth } from './route.js';
import { visibleHazardCues } from './road-guidance.js';

export function createRoadObstacles(root, { box, batch, models }) {
  const markerMaterials = new Map();
  function marker(text, color) {
    if (!markerMaterials.has(text)) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#101b28';
      ctx.fillRect(0, 0, 512, 200);
      ctx.strokeStyle = ctx.fillStyle = color;
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, 500, 188);
      ctx.font = 'bold 88px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 104, 480);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      markerMaterials.set(text, new THREE.MeshBasicMaterial({ map }));
    }
    return new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.25), markerMaterials.get(text));
  }
  const objects = hazards.map((hazard, index) => {
    const group = new THREE.Group();
    group.position.x = hazard.lane * laneWidth;
    root.add(group);
    const rail = hazard.type === 'rail';
    const frame = hazard.type === 'frame';
    const color = rail ? '#ffbd57' : frame ? '#7bddf4' : '#ff8273';
    if (rail) {
      // A low, solid hurdle with feet. Nothing above it suggests ducking.
      box(0, 0.3, 0, 2.7, 0.65, 0.35, color, group);
      for (const x of [-1.1, 1.1]) box(x, -0.08, 0, 0.25, 0.2, 0.9, '#39434b', group);
      for (const x of [-0.9, -0.3, 0.3, 0.9]) {
        const stripe = box(x, 0.3, 0.19, 0.18, 0.58, 0.03, '#14212b', group);
        stripe.rotation.z = -0.3;
      }
      box(0, 0.65, 0, 2.7, 0.07, 0.4, color, group, true);
    } else if (frame) {
      // Open floor and a broad overhead beam make the crouch clearance explicit.
      for (const x of [-1.35, 1.35]) {
        box(x, 0.8, 0, 0.16, 2, 0.35, '#496777', group);
        box(x, -0.12, 0, 0.4, 0.15, 1, '#496777', group);
      }
      box(0, 1.55, 0, 2.8, 0.3, 0.4, color, group);
      box(0, 1.37, 0.22, 2.65, 0.07, 0.04, color, group, true);
      for (const x of [-0.8, 0, 0.8]) box(x, 1.55, 0.22, 0.35, 0.3, 0.03, '#14212b', group);
    } else if (hazard.type === 'works') {
      // Full height closed fence, never a pile of pickup shaped crates.
      box(0, 1, 0, 2.7, 2.4, 1.6, '#46525b', group);
      for (const angle of [-0.7, 0.7]) {
        const brace = box(0, 1, 0.83, 0.2, 2.6, 0.06, color, group, true);
        brace.rotation.z = angle;
      }
    } else {
      const car = models.cars[index % models.cars.length].clone(true);
      car.position.set(0, 0, 0);
      car.rotation.set(0, Math.PI / 2, 0);
      group.add(car);
      for (const x of [-0.85, 0.85]) box(x, 0.7, 2.2, 0.22, 0.15, 0.06, color, group, true);
    }
    batch(group);
    const cue = marker(rail ? '↑ JUMP' : frame ? '↓ DUCK' : '× STEER', color);
    group.add(cue);
    return { group, cue, hazard };
  });
  return {
    frame(distance) {
      const cues = visibleHazardCues(distance);
      objects.forEach(({ group, cue, hazard }) => {
        const gap = hazard.distance - distance;
        group.position.z = 3 - gap;
        group.visible = gap > -5 && gap < 100;
        cue.visible = cues.includes(hazard);
        const scale = Math.max(1, gap / 16);
        cue.scale.setScalar(scale);
        cue.position.y = 3.6 + scale * 0.4;
      });
    }
  };
}
