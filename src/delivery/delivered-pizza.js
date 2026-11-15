// Keep the actual mesh geometry, sauce, toppings, browning and bite. Only
// the clone's slice transforms change, so replay never damages the kitchen.
export function cloneDeliveredPizza(pizza, condition) {
  const copy = pizza.clone(true);
  copy.rotation.set(0, 0, 0);
  copy.scale.setScalar(0.26);
  copy.position.set(0, 0.08, 0);
  const damage = (100 - Math.max(0, Math.min(100, condition))) / 100;
  copy.children.forEach((slice, i) => {
    slice.position.set(damage * Math.sin(i * 2.3) * 0.42, 0, damage * Math.cos(i * 1.7) * 0.35);
    slice.rotation.y = damage * Math.sin(i) * 0.12;
  });
  return copy;
}
