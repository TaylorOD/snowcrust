import { maxToppings } from '../order/recipe.js';
const $ = (id) => document.getElementById(id);
export const say = (text) => ($('status').textContent = text);
export function updateOrderView({ mode, toppingCount, bitten = false }) {
  const previousMode = document.body.dataset.mode;
  document.body.dataset.mode = mode;
  // Dispatch starts below the kitchen on phones. Bring the pickup into view
  // before the animation begins so the first tow is not lost below the fold.
  if (
    mode === 'pickup' &&
    previousMode !== mode &&
    window.matchMedia('(max-width: 1000px)').matches
  )
    requestAnimationFrame(() => $('scene').scrollIntoView({ block: 'start', behavior: 'instant' }));
  document.body.dataset.bitten = String(bitten);
  $('assisted-label').hidden = !['prep', 'baked', 'sliced'].includes(mode);
  $('bite').hidden = mode !== 'sliced';
  $('bite').disabled = bitten;
  $('bite').textContent = bitten ? 'bite taken' : 'take a bite';
  document.body.dataset.toppings = toppingCount;
  $('topping-count').textContent = `${toppingCount} / ${maxToppings}`;
  $('undo').disabled = !toppingCount || mode !== 'prep';
  const delivering = ['pickup', 'running', 'arriving', 'dispatched'].includes(mode);
  $('delivery-comment').hidden = !delivering || !bitten;
  $('primary').disabled = ['baking', 'pickup', 'running', 'arriving'].includes(mode);
  $('dispatch').hidden = !['baked', 'sliced'].includes(mode);
  $('replay').hidden = mode !== 'dispatched';
  $('practice').hidden = mode !== 'dispatched';
  $('scene').setAttribute('role', delivering ? 'region' : 'img');
  $('scene').setAttribute(
    'aria-label',
    delivering
      ? 'Pizza delivery and courier controls'
      : 'Pizza kitchen. Select a topping, then tap the pizza. Drag to rotate.'
  );
  document.querySelector('.turn-controls').hidden = delivering;
  $('delivery-status').hidden = mode !== 'pickup';
  $('prep-controls').hidden = mode !== 'prep';
  $('bake-progress').hidden = mode !== 'baking';
  $('primary').innerHTML =
    mode === 'prep'
      ? '<span>bake pizza</span><span>↗</span>'
      : mode === 'baking'
        ? '<span>baking</span><span>◌</span>'
        : mode === 'baked'
          ? '<span>inspect slice</span><span>↗</span>'
          : '<span>return slice</span><span>↙</span>';
  $('panel-title').innerHTML =
    mode === 'prep' ? 'Load the ticket.' : mode === 'baking' ? 'Baking.' : 'Cargo ready.';
  $('panel-copy').innerHTML =
    mode === 'prep'
      ? 'Sauce and mozzarella included.<br>Load the extras on the ticket.'
      : mode === 'baking'
        ? 'Toppings are locked while the pizza bakes.'
        : 'Inspect a slice or dispatch the pizza.';
  $('scene-label').textContent =
    mode === 'baking' ? 'OVEN' : mode === 'prep' ? 'KITCHEN' : 'PICKUP';
  $('oven-label').textContent = mode === 'baking' ? 'BAKING AT 500°C' : 'OVEN READY';
  $('scene-instruction').textContent =
    mode === 'prep'
      ? 'pick a topping, then tap the pizza'
      : mode === 'baking'
        ? 'pizza on the oven deck'
        : mode === 'sliced'
          ? 'return the slice or dispatch the pizza'
          : 'drag to inspect the baked pizza';
  ['prep', 'bake', 'eat'].forEach((s, i) =>
    $('step-' + s).classList.toggle(
      'active',
      i === (mode === 'prep' ? 0 : mode === 'baking' ? 1 : 2)
    )
  );
  if (mode === 'arriving') {
    $('panel-title').textContent = 'at the address.';
    $('panel-copy').textContent = 'Hand over the box. The customer is waiting.';
    $('primary').textContent = 'delivery handoff';
    $('scene-label').textContent = 'ARRIVAL';
    $('oven-label').textContent = 'ADDRESS CONFIRMED';
    $('scene-instruction').textContent = '';
    return;
  }
  if (mode === 'running') {
    $('panel-title').textContent = 'delivery in progress.';
    $('panel-copy').textContent = 'Keep moving. Protect the box. Follow the address.';
    $('primary').textContent = 'on the road';
    $('scene-instruction').textContent = '';
    return;
  }
  if (delivering) {
    $('panel-title').innerHTML = mode === 'pickup' ? 'Kourier pickup.' : 'Pizza delivered.';
    $('panel-copy').textContent =
      mode === 'pickup'
        ? 'RadiKS pickup. Delivery address loaded in the smart box.'
        : 'Check the receipt, retry the road or take the next call.';
    $('primary').innerHTML =
      mode === 'pickup'
        ? '<span>pickup in progress</span>'
        : '<span>next call</span><span>↗</span>';
    $('scene-label').textContent = mode === 'pickup' ? 'STREET' : 'DELIVERED';
    $('oven-label').textContent = mode === 'pickup' ? 'KOURIER ACTIVE' : 'CARGO DELIVERED';
    $('scene-instruction').textContent =
      mode === 'pickup' ? 'kourier pickup and bumper tow' : 'delivery confirmed';
    $('delivery-phase').textContent = mode === 'pickup' ? 'Collecting cargo' : 'Delivery confirmed';
    document.querySelectorAll('[data-phase]').forEach((item) => {
      item.classList.remove('active');
      item.classList.toggle('complete', mode === 'dispatched');
    });
  }
}
export function updateCourierPhase(phase) {
  const messages = {
    collect: ['Collecting cargo', 'RadiKS kourier collecting the smart box.'],
    approach: ['Approaching traffic', 'Traffic moving. Kourier looking for a tow.'],
    hook: ['Attaching tow line', 'Electromagnetic harpoon attached. Catching the next car.'],
    ride: ['Leaving the franchise', 'Tow line attached. Kourier outbound.']
  };
  $('delivery-phase').textContent = messages[phase][0];
  const phases = ['collect', 'approach', 'hook', 'ride'];
  document.querySelectorAll('[data-phase]').forEach((item) => {
    item.classList.toggle('active', item.dataset.phase === phase);
    item.classList.toggle('complete', phases.indexOf(item.dataset.phase) < phases.indexOf(phase));
  });
  say(messages[phase][1]);
}
