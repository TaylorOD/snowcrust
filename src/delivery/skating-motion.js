import { carryGrip } from './cargo-box.js';
// Animate the existing articulated model. Joint endpoints stay connected and
// feet stay on the board except for the free skating push.
export function createSkatingMotion(rider) {
  const names = [
    'body',
    'torso',
    'head',
    'launcher',
    'board',
    'back-thigh',
    'back-shin',
    'front-thigh',
    'front-shin',
    'back-knee',
    'front-knee',
    'back-shoe',
    'front-shoe',
    'left-upper-arm',
    'left-forearm',
    'right-upper-arm',
    'right-forearm',
    'left-elbow',
    'right-elbow'
  ];
  const parts = Object.fromEntries(names.map((name) => [name, rider.getObjectByName(name)]));
  const from = rider.position.clone(),
    delta = rider.position.clone();
  const up = rider.position.clone().set(0, 1, 0);
  function limb(name, a, b, width) {
    from.set(...a);
    delta.set(...b).sub(from);
    parts[name].position.copy(from).addScaledVector(delta, 0.5);
    parts[name].scale.set(width, delta.length(), width);
    parts[name].quaternion.setFromUnitVectors(up, delta.normalize());
  }
  return {
    launcher: parts.launcher,
    body: parts.body,
    frame(state, reduced) {
      const anticipation = state.jump > 0.85 ? (0.91 - state.jump) / 0.06 : 0;
      const landing = state.landing ? Math.sin((state.landing / 0.2) * Math.PI) : 0;
      const bend = state.crouch ? 0.42 : 0.12 + anticipation * 0.16 + landing * 0.15;
      const push =
        !reduced && !state.towed && !state.approaching && !state.jump && !state.crouch
          ? Math.sin(state.elapsed * 6)
          : 0;
      const lean = state.towed ? -0.12 : 0.09;
      parts.body.scale.set(1, 1, 1);
      parts.body.position.set(0, 0, 0);
      parts.torso.position.set(lean, 1.15 - bend, 0);
      parts.torso.rotation.z = state.crouch ? -0.45 : state.towed ? 0.14 : -0.12;
      parts.head.position.set(
        lean + (state.crouch ? 0.3 : 0.08),
        1.73 - bend - (state.crouch ? 0.22 : 0),
        0
      );
      parts.head.rotation.set(0, 0, 0);
      const hip = [lean - 0.05, 0.9 - bend, 0];
      for (const [side, footX, z] of [
        ['back', -0.42, 0.07],
        ['front', 0.45, -0.07]
      ]) {
        const stride = side === 'back' ? push * 0.3 : 0;
        const lift = side === 'back' ? Math.max(0, push) * 0.15 + Math.min(0, push) * 0.25 : 0;
        const footZ =
          side === 'back' && !state.towed && !state.approaching && !state.jump && !state.crouch
            ? 0.45
            : z;
        const knee = [footX + 0.18, 0.65 - bend * 0.45, footZ];
        limb(side + '-thigh', hip, knee, 0.12);
        limb(side + '-shin', knee, [footX + stride, 0.42 + lift, footZ], 0.105);
        parts[side + '-knee'].position.set(...knee);
        parts[side + '-shoe'].position.set(footX + stride, lift, footZ);
      }
      for (const [side, z] of [
        ['left', 0.3],
        ['right', -0.25]
      ]) {
        const elbow = [0.2, 1.02 - bend, side === 'left' ? 0.55 : z];
        const hand = side === 'left' ? carryGrip(bend) : [0.72, 1.1 - bend * 0.5, z];
        limb(side + '-upper-arm', [lean, 1.4 - bend, z], elbow, 0.085);
        limb(side + '-forearm', elbow, hand, 0.07);
        parts[side + '-elbow'].position.set(...elbow);
      }
      parts.launcher.position.set(0.72, 1.1 - bend * 0.5, -0.25);
      parts.launcher.rotation.set(0, 0, 0);
      parts.board.rotation.z = reduced
        ? 0
        : state.jump
          ? Math.sin((state.jump / 0.91) * Math.PI * 2) * 0.1
          : 0;
      const grip = carryGrip(bend);
      return [grip[0], grip[1] + 0.04, grip[2]];
    }
  };
}
