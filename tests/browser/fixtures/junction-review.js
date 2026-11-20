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
  action: (name) => {
    document.getElementById('pilot').checked = false;
    run.action(name);
  },
  pause: () => {
    playing = false;
    run.setPaused(true);
    controls.paused(true);
  },
  resume: () => {
    playing = true;
    run.setPaused(false);
    controls.paused(false);
  },
  retry: () => seek(0)
});
controls.show('DELIVERY / straight through both junctions');
controls.paused(false);
function step(dt) {
  while (actions[next] && actions[next].at <= run.state.elapsed) {
    const action = actions[next++];
    if (document.getElementById('pilot').checked) run.action(action.name);
  }
  run.update(dt);
}
function seek(distance) {
  document.getElementById('pilot').checked = true;
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
// Focused obstacle encounters use the real movement and collision model.
// Traffic keeps its replayed position. The rider starts free skating in the lane.
document.querySelectorAll('[data-hazard]').forEach((button) => {
  button.onclick = () => {
    const [distance, lane] = button.dataset.hazard.split(',').map(Number);
    seek(distance - 35);
    Object.assign(run.state, { lane, x: lane, towed: false, towBlend: 0 });
    document.getElementById('pilot').checked = false;
  };
});
document.getElementById('second').onclick = () => {
  playing = false;
  for (let i = 0; i < 120; i++) step(1 / 120);
};
document.getElementById('free').onclick = () => {
  seek(0);
  run = createDeliveryRun({ startTowed: false });
  document.getElementById('pilot').checked = false;
};
document.getElementById('step').onclick = () => {
  playing = false;
  document.getElementById('play').textContent = 'play';
  step(0.1);
};
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
  road.frame(run.state, document.getElementById('reduced').checked);
  controls.frame(run.state);
  document.getElementById('checkpoint').textContent = Math.round(run.state.distance) + ' m';
  view.renderer.render(view.scene, view.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
