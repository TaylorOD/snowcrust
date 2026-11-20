import { routeLength, runTimeLimit } from '../delivery/route.js';
import { roadGuidance, roadExitNotice } from '../delivery/road-guidance.js';

// Input belongs to the road surface, never the kitchen.
export function createDeliveryControls(host, { action, pause, resume, retry }) {
  const panel = document.createElement('section');
  panel.id = 'run-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Delivery controls');
  panel.innerHTML = `
    <div class="run-hud"><span id="run-address"></span>
      <span id="run-distance"></span><span id="run-speed"></span><span id="run-condition"></span><span id="run-clock"></span>
      <button id="run-pause" aria-label="Pause delivery">pause</button></div>
    <div id="run-exit" hidden><strong id="run-exit-title"></strong><span id="run-exit-action"></span></div>
    <div id="run-prompt" class="run-prompt">
      <h2>your delivery.</h2><p id="run-result" hidden></p><p>90 seconds. three lanes. keep the box intact.</p>
      <label class="run-assist-label"><input type="checkbox" id="run-assist"> slower road / no damage</label>
      <div class="run-prompt-actions"><button id="run-resume">start skating</button><button id="run-retry" hidden>retry delivery</button></div>
      <p id="run-restart-note" hidden>same pizza. fresh road. order time keeps counting.</p>
      <p>← → steer · ↑ jump · ↓ duck<br>space to catch or release a tow</p>
      <p><span id="run-start-note">already hooked. </span>one swipe, one lane. steer while attached. release before your tow turns. a late release damages the box.</p>
      <p>on a phone, swipe or use the buttons below.</p>
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
  $('run-retry').onclick = () => retry($('run-assist').checked);
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
      panel.querySelectorAll('[data-run]').forEach((button) => {
        button.disabled = false;
      });
      $('run-assist').checked = false;
      $('run-assist').disabled = false;
      $('run-address').textContent = address;
      $('run-retry').hidden = true;
      $('run-restart-note').hidden = true;
      $('run-prompt').classList.remove('run-failed');
      $('run-result').hidden = true;
      $('run-resume').hidden = false;
      panel.querySelector('.run-prompt h2').textContent = 'your delivery.';
    },
    assisted(value) {
      $('run-assist').checked = value;
      $('run-assist').disabled = value;
    },
    hide() {
      panel.hidden = true;
      start = null;
    },
    paused(value, first = false) {
      $('run-prompt').hidden = !value;
      $('run-resume').textContent = first ? 'start skating' : 'resume delivery';
      $('run-pause').hidden = value;
      $('run-start-note').hidden = !first;
      $('run-retry').hidden = !value || first;
      $('run-retry').textContent = 'restart delivery';
      $('run-restart-note').hidden = !value || first;
      if (value) $('run-resume').focus({ preventScroll: true });
      else {
        host.focus({ preventScroll: true });
        // Removing the prompt can move the browser's scroll anchor in landscape.
        requestAnimationFrame(() => host.scrollIntoView({ block: 'start', behavior: 'instant' }));
      }
    },
    frame(state) {
      $('run-distance').textContent = Math.max(0, Math.ceil(routeLength - state.distance)) + ' m';
      $('run-condition').textContent =
        'box ' + state.condition + '%' + (state.assisted ? ' / assisted' : '');
      $('run-clock').textContent = Math.max(0, Math.ceil(runTimeLimit - state.elapsed)) + 's route';
      $('run-speed').textContent = Math.round(state.speed * 3.6) + ' km/h';
      $('run-condition').style.color = state.protection > 0 ? '#ffb477' : '';
      $('run-hook').textContent = state.towed
        ? 'release tow'
        : state.hookFlight
          ? 'poon away'
          : 'fire poon';
      $('run-hook').disabled = state.failed || state.approaching || state.hookCooldown > 0;
      if (state.approaching) $('run-hook').textContent = 'arriving';
      panel.querySelectorAll('[data-run]:not(#run-hook)').forEach((button) => {
        button.disabled = state.approaching || state.failed;
      });
      if (state.failed) {
        $('run-prompt').hidden = false;
        $('run-prompt').classList.add('run-failed');
        $('run-result').hidden = false;
        $('run-result').textContent =
          Math.floor(state.distance) +
          ' m / ' +
          state.catches +
          (state.catches === 1 ? ' catch / box ' : ' catches / box ') +
          state.condition +
          '%';
        panel.querySelector('.run-prompt h2').textContent = state.failure;
        $('run-resume').hidden = true;
        $('run-retry').hidden = false;
        $('run-retry').textContent = 'retry delivery';
        $('run-restart-note').hidden = true;
        $('run-pause').hidden = true;
      }
      const exit = roadExitNotice(state);
      $('run-exit').hidden = !exit;
      if (exit) {
        $('run-exit-title').textContent = exit.title;
        $('run-exit-action').textContent = exit.instruction;
      }
      const message = roadGuidance(state);
      $('run-hook').classList.toggle(
        'tow-ready',
        !state.towed && state.targetId >= 0 && !$('run-hook').disabled
      );
      if ($('run-message').textContent !== message) $('run-message').textContent = message;
    }
  };
}
