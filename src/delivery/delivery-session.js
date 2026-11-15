import { createDeliveryRun } from './run-model.js';
import { createRunScene } from './run-scene.js';
import { createArrivalScene } from './arrival-scene.js';
import { createDeliveryAudio } from './delivery-audio.js';
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
  host.tabIndex = -1;
  let tutorialSeen = false;
  const audio = createDeliveryAudio(host);
  const models = courier.models();
  const arrival = createArrivalScene(scene, camera, models.rider);
  const road = createRunScene(scene, camera, models);
  let run = null,
    transition = 0,
    ending = null,
    practice = false,
    dispatchElapsed = 0;
  const handoff = document.createElement('div');
  handoff.className = 'handoff-controls';
  handoff.hidden = true;
  handoff.innerHTML =
    '<p id="arrival-address"></p><button id="handover" disabled>parking</button><p id="customer-reaction" role="status"></p><p id="practice-summary"></p>';
  host.append(handoff);
  const button = handoff.querySelector('button');
  button.onclick = () => {
    if (!ending || ending.handedAt !== null) return;
    audio.handoff();
    ending.handedAt = performance.now();
    button.hidden = true;
  };
  function pause(value, first = false) {
    if (!run || run.state.arrived) return;
    run.setPaused(value);
    ticket.pause(value);
    controls.paused(value, first);
    if (value) audio.quiet();
  }
  const controls = createDeliveryControls(host, {
    action: (name) => run?.action(name),
    pause: () => pause(true),
    resume: (assisted) => {
      if (run && assisted) run.state.assisted = true;
      pause(false);
    }
  });
  function arrive(result) {
    audio.arrival();
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
    handoff.querySelector('#practice-summary').textContent = result.practice
      ? 'practice / box ' +
        result.condition +
        '% / ' +
        Math.ceil(result.elapsed) +
        ' seconds total. original receipt kept.'
      : '';
    host.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  return {
    arrive,
    start(options = {}) {
      audio.reset();
      practice = Boolean(options.practice);
      dispatchElapsed = options.elapsed ?? 0;
      run = createDeliveryRun();
      transition = 0;
      ending = null;
      handoff.hidden = true;
      arrival.hide();
      const destination = destinationFor(ticket.customer);
      controls.show(
        (practice ? 'practice / ' : '') + destination.name + ' / ' + destination.address
      );
      road.show(destination);
      pause(!tutorialSeen || practice, !tutorialSeen);
      tutorialSeen = true;
      host.scrollIntoView({ block: 'center', behavior: 'instant' });
    },
    reset() {
      audio.reset();
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
                : (ending.result.practice ? ending.result.elapsed : result.elapsed) > 120
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
      audio.frame(run.state);
      road.frame(run.state, reduced, reduced ? 1 : Math.min(transition / 0.8, 1));
      const remaining = 120 - dispatchElapsed - run.state.elapsed;
      const practiceClock = Math.abs(Math.ceil(remaining)) + (remaining < 0 ? 's late' : 's left');
      controls.frame(
        run.state,
        practice ? practiceClock : document.getElementById('order-clock').textContent
      );
      document.body.dataset.runDistance = Math.floor(run.state.distance);
      document.body.dataset.runLane = run.state.lane;
      if (run.state.arrived)
        arrive({ ...run.state, practice, elapsed: dispatchElapsed + run.state.elapsed });
    }
  };
}
