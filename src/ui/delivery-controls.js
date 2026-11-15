import { roadGuidance } from '../delivery/road-guidance.js';

// Input belongs to the road surface, never the kitchen.
export function createDeliveryControls(host, { action, pause, resume }) {
  const panel = document.createElement('section');
  panel.id = 'run-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Delivery controls');
  panel.innerHTML = `
    <div class="run-hud"><span id="run-address"></span>
      <span id="run-distance"></span><span id="run-condition"></span><span id="run-clock"></span>
      <button id="run-pause" aria-label="Pause delivery">pause</button></div>
    <div id="run-prompt" class="run-prompt">
      <h2>your delivery.</h2><p>three lanes. keep the box intact.</p>
      <p>← → steer · ↑ jump · ↓ duck<br>space to catch or release a tow</p>
      <p>steer once to carve behind a car. steer again to leave the tow. jumping and ducking keep the line attached.</p>
      <p>on a phone, swipe or use the buttons below.</p>
      <label><input type="checkbox" id="run-assist"> slower road / no damage</label><br>
      <button id="run-resume">start skating</button>
    </div>
    <div class="run-buttons">
      <button data-run="left" aria-label="Move left">←</button>
      <button data-run="jump" aria-label="Jump">↑ jump</button>
      <button data-run="duck" aria-label="Crouch">↓ duck</button>
      <button data-run="right" aria-label="Move right">→</button>
      <button data-run="hook" id="run-hook">release tow</button>
    </div><p id="run-message" role="status"></p>`;
  host.append(panel);
  const $ = (id) => panel.querySelector('#' + id);
  panel.querySelectorAll('[data-run]').forEach((button) =>
    button.addEventListener('click', () => {
      action(button.dataset.run);
      host.focus({ preventScroll: true });
    })
  );
  $('run-pause').onclick = pause;
  $('run-resume').onclick = () => {
    const assisted = $('run-assist').checked;
    if (assisted) $('run-assist').disabled = true;
    resume(assisted);
  };
  const keys = {
    ArrowLeft: 'left',
    a: 'left',
    ArrowRight: 'right',
    d: 'right',
    ArrowUp: 'jump',
    w: 'jump',
    ArrowDown: 'duck',
    s: 'duck',
    ' ': 'hook'
  };
  window.addEventListener('keydown', (event) => {
    if (panel.hidden || event.target.closest('input,select,textarea')) return;
    if (event.key === ' ' && event.target.closest('button')) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      pause();
    } else if (keys[event.key] && !event.repeat) {
      event.preventDefault();
      action(keys[event.key]);
    }
  });
  let start = null;
  host.addEventListener('pointerdown', (e) => {
    if (panel.hidden || e.target.closest('button,input,label,#run-prompt')) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointerup', (e) => {
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x,
      dy = e.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
    action(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy < 0 ? 'jump' : 'duck');
  });
  host.addEventListener('pointercancel', () => {
    start = null;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !panel.hidden) pause();
  });
  return {
    show(address) {
      panel.hidden = false;
      $('run-assist').checked = false;
      $('run-assist').disabled = false;
      $('run-address').textContent = address;
    },
    hide() {
      panel.hidden = true;
      start = null;
    },
    paused(value, first = false) {
      $('run-prompt').hidden = !value;
      $('run-resume').textContent = first ? 'start skating' : 'resume delivery';
      $('run-pause').hidden = value;
      if (value) $('run-resume').focus({ preventScroll: true });
      else host.focus({ preventScroll: true });
    },
    frame(state, clock) {
      $('run-distance').textContent = Math.max(0, Math.ceil(560 - state.distance)) + ' m';
      $('run-condition').textContent =
        'box ' + state.condition + '%' + (state.assisted ? ' / assisted' : '');
      $('run-clock').textContent = clock;
      $('run-condition').style.color = state.protection > 0 ? '#ffb477' : '';
      $('run-hook').textContent = state.towed ? 'release tow' : 'catch tow';
      $('run-hook').disabled =
        state.approaching ||
        (!state.towed &&
          (state.targetId < 0 || state.jump > 0 || Math.abs(state.x - state.lane) >= 0.2));
      if (!state.towed && state.targetId < 0) $('run-hook').textContent = 'out of reach';
      if (state.approaching) $('run-hook').textContent = 'arriving';
      panel.querySelectorAll('[data-run]:not(#run-hook)').forEach((button) => {
        button.disabled = state.approaching;
      });
      const message = roadGuidance(state);
      $('run-hook').classList.toggle('tow-ready', !state.towed && !$('run-hook').disabled);
      if ($('run-message').textContent !== message) $('run-message').textContent = message;
    }
  };
}
