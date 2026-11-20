import * as THREE from '../../vendor/three.module.js';

// Keep the cable separate from the rider and traffic drawing. The endpoint is
// captured when released so it reels back from the old bumper, not a new target.
export function createTowLine(root) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(27), 3));
  const material = new THREE.LineBasicMaterial({ color: '#a9ebee' });
  const line = new THREE.Line(geometry, material);
  root.add(line);
  const end = new THREE.Vector3();
  const released = new THREE.Vector3();
  let previousElapsed = -1,
    previousDistance = 0,
    active = false,
    returnAt = -1;
  return {
    frame(state, hand, bumper, reduced) {
      if (state.elapsed < previousElapsed) {
        active = false;
        returnAt = -1;
      }
      const flying = state.hookFlight > 0;
      const attached = state.towed && Boolean(bumper);
      if (active && !attached && !flying) {
        released.copy(end);
        previousDistance = state.distance;
        returnAt = state.elapsed;
      }
      active = attached || flying;
      const returning = !active && returnAt >= 0 && state.elapsed - returnAt < 0.28;
      line.visible = active || returning;
      if (attached) end.copy(bumper);
      else if (flying) {
        if (bumper) end.copy(bumper);
        else end.set(hand.x, hand.y, hand.z - 16);
        end.lerpVectors(hand, end, 1 - state.hookFlight / 0.24);
      } else if (returning) {
        end.copy(released);
        end.z += state.distance - previousDistance;
        end.lerp(hand, (state.elapsed - returnAt) / 0.28);
      }
      material.color.set(attached || bumper ? '#a9ebee' : '#efb45f');
      const sag = attached ? 0.06 + (1 - (state.towBlend ?? 1)) * 0.5 : 0.2;
      const points = geometry.attributes.position;
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        points.setXYZ(
          i,
          hand.x + (end.x - hand.x) * t,
          hand.y + (end.y - hand.y) * t - (reduced ? 0 : Math.sin(t * Math.PI) * sag),
          hand.z + (end.z - hand.z) * t
        );
      }
      points.needsUpdate = true;
      geometry.computeBoundingSphere();
      previousElapsed = state.elapsed;
    }
  };
}
