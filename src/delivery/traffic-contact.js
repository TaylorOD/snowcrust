// Resolve the proposed movement before rendering it. A side contact rejects
// only the unsafe sideways step. A rear contact matches the car ahead without
// moving the rider backwards or teleporting them into another lane.
export function resolveTrafficContact(state, previousX, previousDistance) {
  let contact = null;
  for (const car of state.traffic) {
    const gap = car.distance - state.distance;
    if (Math.abs(gap) >= 5 || Math.abs(car.x - state.x) >= 0.62) continue;
    contact = car;
    if (Math.abs(car.x - previousX) >= 0.62) state.x = previousX;
    else if (car.distance >= previousDistance) {
      state.distance = Math.max(previousDistance, car.distance - 5);
      state.speed = Math.min(state.speed, car.velocity);
    }
  }
  return contact;
}
