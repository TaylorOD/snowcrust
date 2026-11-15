import { createDeliveryRun } from './run-model.js';
import { createRunScene } from './run-scene.js';
import { destinationFor } from './route.js';
import { createDeliveryControls } from '../ui/delivery-controls.js';

export function createDeliverySession({ scene, camera, host, courier, ticket, reduced, onFinish }) {
  const road = createRunScene(scene, camera, courier.models());
  let run = null,
    transition = 0;
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
  return {
    start() {
      run = createDeliveryRun();
      transition = 0;
      const destination = destinationFor(ticket.customer);
      controls.show(destination.name + ' / ' + destination.address);
      road.show();
      pause(true, true);
      host.scrollIntoView({ block: 'center', behavior: 'instant' });
    },
    reset() {
      controls.hide();
      road.hide();
      run = null;
      ticket.pause(false);
    },
    frame(dt) {
      if (!run) return;
      transition += dt;
      run.update(dt);
      road.frame(run.state, reduced, reduced ? 1 : Math.min(transition / 0.8, 1));
      controls.frame(run.state, document.getElementById('order-clock').textContent);
      document.body.dataset.runDistance = Math.floor(run.state.distance);
      document.body.dataset.runLane = run.state.lane;
      if (run.state.arrived) {
        const result = { ...run.state };
        controls.hide();
        run = null;
        onFinish(result);
      }
    }
  };
}
