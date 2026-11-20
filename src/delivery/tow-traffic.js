import { exitRamp } from './exit-ramp.js';
import { hazards, laneWidth, freightExit, deliveryJunction } from './route.js';

// Cars advance in world metres independently of the rider. Relative positions
// are derived here so catching a car never reverses its travel.
export const trafficSpeed = 20;
// A paced stream keeps a safe gap through merges without turning the run
// into a queue behind a slower car. Every model shares the same road speed.
export const towCars = [
  12, 48, 84, 120, -24, -60, -96, -132, -168, -204, -240, -276, -312, -348, -384
].map((start, index) => ({
  start,
  speed: trafficSpeed,
  lane: [0, 1, -1][index % 3],
  lowProfile: index === 0,
  exit: index === 0 ? freightExit : deliveryJunction
}));

// Choose an adjacent clear lane before each obstruction. The lane change
// starts early enough that both the car and its trailing rider clear it.
function roadLane(car, distance) {
  let lane = car.lane;
  let x = lane;
  let turn = 0;
  for (const hazard of hazards) {
    if (hazard.lane !== lane || (hazard.type === 'frame' && car.lowProfile)) continue;
    const next = lane === 0 ? (hazard.id % 2 ? -1 : 1) : 0;
    const t = Math.max(0, Math.min(1, (distance - hazard.distance + 28) / 16));
    if (!t) break;
    x = lane + (next - lane) * t * t * (3 - 2 * t);
    turn = ((next - lane) * 6 * t * (1 - t)) / 16;
    if (t < 1) break;
    lane = next;
  }
  return { x, turn };
}

// The exit follows the same gradual ramp as the scenery.
export { freightExit } from './route.js';
export function trafficLane(car, distance) {
  const exit = car.exit;
  if (!exit || distance < exit.distance) return roadLane(car, distance);
  const from = roadLane(car, exit.distance).x;
  const ramp = exitRamp(distance - exit.distance, exit.side, from * laneWidth);
  return { x: ramp.x / laneWidth, turn: Math.tan(Math.PI / 2 - ramp.yaw) / laneWidth };
}

export function createTraffic() {
  return towCars.map((car) => ({
    ...car,
    exit: car.exit ?? deliveryJunction,
    distance: car.start,
    x: trafficLane(car, car.start).x,
    velocity: car.speed,
    yaw: Math.PI / 2
  }));
}

// Update front to back. Following cars brake before occupied space, including
// lane changes, instead of passing through another vehicle.
export function advanceTraffic(traffic, seconds, rider = null) {
  if (rider && rider.distance < deliveryJunction.distance - 80) {
    for (let index = 0; index < traffic.length; index++) {
      const car = traffic[index];
      const pose = towPose(car, rider);
      if ((rider.towed && rider.towId === index) || pose.gap >= -80) continue;
      car.distance = Math.min(rider.distance - 90, ...traffic.map((other) => other.distance)) - 36;
      car.exit = deliveryJunction;
      car.x = trafficLane(car, car.distance).x;
    }
  }
  const ordered = [...traffic].sort((a, b) => b.distance - a.distance);
  for (const car of ordered) {
    const before = car.distance;
    let distance = before + car.speed * seconds;
    let x = trafficLane(car, distance).x;
    const occupied = rider ? [...ordered, rider] : ordered;
    for (const ahead of occupied) {
      if (ahead === car) continue;
      const crosses = Math.min(car.x, x) < ahead.x + 0.7 && Math.max(car.x, x) > ahead.x - 0.7;
      if (!crosses) continue;
      // Wait for a clear gap before merging beside another vehicle or rider.
      if (
        Math.abs(ahead.distance - before) < 9 &&
        Math.abs(x - ahead.x) < Math.abs(car.x - ahead.x)
      ) {
        distance = before;
        break;
      }
      if (ahead.distance > before)
        distance = Math.min(distance, Math.max(before, ahead.distance - 9));
    }
    x = trafficLane(car, distance).x;
    car.velocity = (distance - before) / seconds;
    car.yaw = Math.PI / 2 - Math.atan2((x - car.x) * laneWidth, Math.max(0.001, distance - before));
    car.distance = distance;
    car.x = x;
  }
}

export function towPose(car, state) {
  const ramp =
    car.exit && car.distance >= car.exit.distance
      ? exitRamp(
          car.distance - car.exit.distance,
          car.exit.side,
          roadLane(car, car.exit.distance).x * laneWidth
        )
      : null;
  const forward = car.distance;
  const gap = forward - state.distance;
  return {
    distance: forward,
    gap,
    visible: gap > -18 && gap < 110,
    reachable: gap >= 6 && gap <= 30 && (!car.exit || car.distance < car.exit.distance - 62),
    signal:
      (car.exit && car.distance >= car.exit.distance - 56) ||
      Math.abs(trafficLane(car, car.distance + 20).x - car.x) > 0.15,
    x: car.x * laneWidth,
    z: 3 - gap,
    yaw: ramp ? ramp.yaw : car.yaw
  };
}
export function availableTow(state) {
  let nearest = -1;
  let gap = Infinity;
  state.traffic.forEach((car, i) => {
    const pose = towPose(car, state);
    const blocked = state.traffic.some(
      (other) =>
        other !== car &&
        Math.abs(other.x - state.x) < 0.62 &&
        other.distance > state.distance &&
        other.distance < car.distance
    );
    if (!blocked && Math.abs(car.x - state.x) < 0.65 && pose.reachable && pose.gap < gap) {
      nearest = i;
      gap = pose.gap;
    }
  });
  return nearest;
}
