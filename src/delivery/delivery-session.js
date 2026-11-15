import { createDeliveryRun } from './run-model.js';
import { createRunScene } from './run-scene.js';
import { createArrivalScene } from './arrival-scene.js';
import { destinationFor } from './route.js';
import { createDeliveryControls } from '../ui/delivery-controls.js';

// Coordinates the road and doorstep. The order controller still owns the
// pizza and receipt, and freezes its clock when we reach the address.
export function createDeliverySession({
  scene,
  camera,
  host,
  courier,
  ticket,
  reduced,
  getPizza,
  onArrive,
  onFinish
}) {
  const models = courier.models();
  const arrival = createArrivalScene(scene, camera, models.rider);
  const road = createRunScene(scene, camera, models);
  let run = null,
    transition = 0,
    ending = null;
  const handoff = document.createElement('div');
  handoff.className = 'handoff-controls';
  handoff.hidden = true;
  handoff.innerHTML =
    '<p id="arrival-address"></p><button id="handover" disabled>parking</button><p id="customer-reaction" role="status"></p>';
  host.append(handoff);
  const button = handoff.querySelector('button');
  button.onclick = () => {
    if (!ending || ending.handedAt !== null) return;
    ending.handedAt = performance.now();
    button.hidden = true;
  };
  function pause(value, first = false) {
    if (!run || run.state.arrived) return;
    run.setPaused(value);
    ticket.pause(value);
    controls.paused(value, first);
  }
  const controls = createDeliveryControls(host, {
    action: (name) => run?.action(name),
    pause: () => pause(true),
    resume: () => pause(false)
  });
  function arrive(result) {
    run = null;
    controls.hide();
    road.hide();
    const address = destinationFor(ticket.customer);
    onArrive(result);
    arrival.show(getPizza(), result, address, ticket.customer);
    ending = { result, started: performance.now(), handedAt: null, finished: false };
    handoff.hidden = false;
    button.hidden = false;
    button.disabled = true;
    button.textContent = 'parking';
    handoff.querySelector('#arrival-address').textContent = address.name + ' / ' + address.address;
    handoff.querySelector('#customer-reaction').textContent = '';
    host.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  return {
    arrive,
    start() {
      run = createDeliveryRun();
      transition = 0;
      ending = null;
      handoff.hidden = true;
      arrival.hide();
      const destination = destinationFor(ticket.customer);
      controls.show(destination.name + ' / ' + destination.address);
      road.show(destination);
      pause(true, true);
      host.scrollIntoView({ block: 'center', behavior: 'instant' });
    },
    reset() {
      controls.hide();
      road.hide();
      arrival.hide();
      handoff.hidden = true;
      run = null;
      ending = null;
      ticket.pause(false);
    },
    frame(dt) {
      if (ending) {
        const now = performance.now(),
          seconds = (now - ending.started) / 1000;
        const handed = ending.handedAt === null ? null : (now - ending.handedAt) / 1000;
        arrival.frame(seconds, handed, reduced);
        if (seconds >= 2 && handed === null) {
          button.disabled = false;
          button.textContent = 'hand over pizza';
        }
        if (handed !== null && handed >= 3.3) {
          const result = ticket.result;
          const reaction = result.bitten
            ? 'hey someone took a bite out of this!'
            : ending.result.condition < 70
              ? 'right address. rough trip.'
              : result.score < 100
                ? 'read the ticket next time.'
                : result.elapsed > 120
                  ? 'you made it. eventually.'
                  : 'all here. still in one piece.';
          handoff.querySelector('#customer-reaction').textContent = reaction;
        }
        if (handed !== null && handed >= 6 && !ending.finished) {
          ending.finished = true;
          onFinish(ending.result);
        }
        return;
      }
      if (!run) return;
      transition += dt;
      run.update(dt);
      road.frame(run.state, reduced, reduced ? 1 : Math.min(transition / 0.8, 1));
      controls.frame(run.state, document.getElementById('order-clock').textContent);
      document.body.dataset.runDistance = Math.floor(run.state.distance);
      document.body.dataset.runLane = run.state.lane;
      if (run.state.arrived) arrive({ ...run.state });
    }
  };
}
