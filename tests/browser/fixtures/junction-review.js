import { createScene } from './src/scene/scene.js';
import { createCourier } from './src/delivery/courier.js';
import { createRunScene } from './src/delivery/run-scene.js';
import { createDeliveryRun } from './src/delivery/run-model.js';
import { createDeliveryControls } from './src/ui/delivery-controls.js';
const actions = await (await fetch('junction-actions.json')).json();
const host = document.getElementById('scene');
const view = createScene(host);
view.fireLight.visible = false;
const courier = createCourier(view.scene);
const road = createRunScene(view.scene, view.camera, courier.models());
road.show();
let run,
  next = 0,
  playing = false;
const controls = createDeliveryControls(host, {
  action: (name) => run.action(name),
  pause: () => {
    playing = false;
    controls.paused(true);
  },
  resume: () => {
    playing = true;
    controls.paused(false);
  },
  retry: () => seek(0)
});
controls.show('DELIVERY / straight through both junctions');
controls.paused(false);
function step(dt) {
  while (actions[next] && actions[next].at <= run.state.elapsed) run.action(actions[next++].name);
  run.update(dt);
}
function seek(distance) {
  run = createDeliveryRun();
  next = 0;
  while (run.state.distance < distance && !run.state.failed && !run.state.arrived) step(1 / 120);
  playing = false;
  document.getElementById('play').textContent = 'play';
  controls.paused(false);
}
document
  .querySelectorAll('[data-distance]')
  .forEach((b) => (b.onclick = () => seek(Number(b.dataset.distance))));
document.getElementById('play').onclick = () => {
  playing = !playing;
  document.getElementById('play').textContent = playing ? 'pause' : 'play';
};
seek(330);
let previous = performance.now();
function frame(now) {
  const dt = Math.min(0.04, (now - previous) / 1000);
  previous = now;
  if (playing) step(dt);
  road.frame(run.state, false);
  controls.frame(run.state);
  document.getElementById('checkpoint').textContent = Math.round(run.state.distance) + ' m';
  view.renderer.render(view.scene, view.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
