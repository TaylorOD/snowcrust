import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { frameRoadCamera } from '../../src/delivery/road-camera.js';
import { laneWidth } from '../../src/delivery/route.js';

test('portrait keeps the courier and cargo inside the view in every lane', () => {
  for (const aspect of [320 / 720, 390 / 844, 0.79, 1.5]) {
    for (const x of [-1, -0.5, 0, 0.5, 1]) {
      for (const speed of [0, 8, 20]) {
        const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
        const position = new THREE.Vector3(),
          aim = new THREE.Vector3();
        frameRoadCamera(camera, { x, speed }, false, position, aim);
        camera.position.copy(position);
        camera.lookAt(aim);
        camera.updateMatrixWorld();
        // Include the box and a fully raised jump, not just the rider origin.
        for (const dx of [-0.8, 0.9]) {
          for (const y of [0, 3.2]) {
            const point = new THREE.Vector3(x * laneWidth + dx, y, 3.8).project(camera);
            assert.ok(Math.abs(point.x) < 0.9, `lane ${x} clipped at aspect ${aspect}`);
            assert.ok(Math.abs(point.y) < 0.9, 'jump or board left the view');
          }
        }
      }
    }
  }
});
