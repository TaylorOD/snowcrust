import { laneWidth } from './route.js';

// Each car has a clear approach and a signed exit before the next obstacle.
// Distance drives both the simulation and meshes, including paused frames.
export const towCars = [
  { start: 0, end: 65, lane: 0, exit: 1 },
  { start: 130, end: 195, lane: -1, exit: -1 },
  { start: 260, end: 310, lane: 0, exit: 1 },
  { start: 350, end: 400, lane: 1, exit: 1 },
  { start: 445, end: 515, lane: -1, exit: -1 }
];
const clamp = (n) => Math.max(0, Math.min(1, n));
const ease = (n) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};

export function towPose(car, distance) {
  const approach = car.start === 0 ? 1 : ease((distance - car.start) / 15);
  const turn = ease((distance - (car.end - 15)) / 15);
  return {
    visible: distance >= car.start && distance < car.end,
    reachable: distance >= car.start + (car.start ? 15 : 0) && distance < car.end - 22,
    signal: distance >= car.end - 42,
    x: car.lane * laneWidth + turn * (car.exit * 7 - car.lane * laneWidth),
    z: -7 - (1 - approach) * 48 - turn * 50,
    yaw: Math.PI / 2 - car.exit * turn * 0.6
  };
}

export function availableTow(distance, lane) {
  return towCars.findIndex((car) => car.lane === lane && towPose(car, distance).reachable);
}
