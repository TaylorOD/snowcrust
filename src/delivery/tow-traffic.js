import { hazards, laneWidth } from './route.js';

// Cars advance in world metres independently of the rider. Relative positions
// are derived here so catching a car never reverses its travel.
export const towCars = [
  { start: 10, speed: 14, lane: 0 },
  { start: -28, speed: 16, lane: -1 },
  { start: 55, speed: 11, lane: 1 },
  { start: 115, speed: 12, lane: -1 },
  { start: -100, speed: 15, lane: 1 }
];
// Choose an adjacent clear lane before each obstruction. The lane change
// starts early enough that both the car and its trailing rider clear it.
export function trafficLane(car, distance) {
  let lane = car.lane;
  let x = lane;
  let turn = 0;
  for (const hazard of hazards) {
    if (hazard.lane !== lane) continue;
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

export function createTraffic() {
  return towCars.map((car) => ({
    ...car,
    distance: car.start,
    x: trafficLane(car, car.start).x,
    velocity: car.speed,
    yaw: Math.PI / 2
  }));
}

// Update front to back. Following cars brake before occupied space, including
// lane changes, instead of passing through another vehicle.
export function advanceTraffic(traffic, seconds, rider = null) {
  const ordered = [...traffic].sort((a, b) => b.distance - a.distance);
  for (const car of ordered) {
    const before = car.distance;
    let distance = before + car.speed * seconds;
    let x = trafficLane(car, distance).x;
    const occupied = rider ? [...ordered, rider] : ordered;
    for (const ahead of occupied) {
      if (ahead === car || ahead.distance <= before) continue;
      const crosses = Math.min(car.x, x) < ahead.x + 0.7 && Math.max(car.x, x) > ahead.x - 0.7;
      if (crosses) distance = Math.min(distance, Math.max(before, ahead.distance - 9));
    }
    x = trafficLane(car, distance).x;
    car.velocity = (distance - before) / seconds;
    car.yaw = Math.PI / 2 - Math.atan2((x - car.x) * laneWidth, Math.max(0.001, distance - before));
    car.distance = distance;
    car.x = x;
  }
}

export function towPose(car, state) {
  const gap = car.distance - state.distance;
  return {
    distance: car.distance,
    gap,
    visible: gap > -18 && gap < 110,
    reachable: gap >= 7 && gap <= 24,
    signal: Math.abs(trafficLane(car, car.distance + 20).x - car.x) > 0.15,
    x: car.x * laneWidth,
    z: 3 - gap,
    yaw: car.yaw
  };
}
export function availableTow(state) {
  let nearest = -1;
  let gap = Infinity;
  state.traffic.forEach((car, i) => {
    const pose = towPose(car, state);
    if (Math.abs(car.x - state.x) < 0.2 && pose.reachable && pose.gap < gap) {
      nearest = i;
      gap = pose.gap;
    }
  });
  return nearest;
}
