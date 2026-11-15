// Small synthesized cues. No downloaded soundtrack, autoplay or audio assets.
// The graph is created once, only after the player asks for sound.
export function createDeliveryAudio(host) {
  const button = document.createElement('button');
  button.id = 'delivery-sound';
  button.textContent = 'sound off';
  button.setAttribute('aria-pressed', 'false');
  host.append(button);
  let context, master, wheels, engine, engineVolume;
  let enabled = false,
    lastHits = 0,
    lastTow = false;

  function initialize() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    context = new Audio();
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;
    wheels = context.createGain();
    wheels.gain.value = 0;
    source.connect(filter).connect(wheels).connect(master);
    source.start();
    engine = context.createOscillator();
    engine.type = 'triangle';
    engineVolume = context.createGain();
    engineVolume.gain.value = 0;
    engine.connect(engineVolume).connect(master);
    engine.start();
  }
  function volume() {
    master?.gain.setTargetAtTime(enabled && !document.hidden ? 0.32 : 0, context.currentTime, 0.02);
  }
  button.onclick = async () => {
    try {
      if (!context) initialize();
      await context.resume();
      enabled = !enabled;
      volume();
      button.textContent = enabled ? 'sound on' : 'sound off';
      button.setAttribute('aria-pressed', String(enabled));
    } catch {
      button.textContent = 'sound unavailable';
      button.disabled = true;
    }
  };
  document.addEventListener('visibilitychange', volume);
  function cue(frequency, duration = 0.18) {
    if (!context || !enabled || document.hidden) return;
    const tone = context.createOscillator(),
      envelope = context.createGain();
    const now = context.currentTime;
    tone.frequency.setValueAtTime(frequency, now);
    tone.frequency.exponentialRampToValueAtTime(frequency * 0.6, now + duration);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    tone.connect(envelope).connect(master);
    tone.onended = () => {
      tone.disconnect();
      envelope.disconnect();
    };
    tone.start(now);
    tone.stop(now + duration);
  }
  function quiet() {
    if (!context) return;
    wheels.gain.setTargetAtTime(0, context.currentTime, 0.04);
    engineVolume.gain.setTargetAtTime(0, context.currentTime, 0.04);
  }
  return {
    quiet,
    arrival: () => {
      quiet();
      cue(520, 0.3);
    },
    handoff: () => cue(780, 0.16),
    reset() {
      quiet();
      lastHits = 0;
      lastTow = false;
    },
    frame(state) {
      if (context) {
        const speed = state.paused ? 0 : state.speed;
        wheels.gain.setTargetAtTime(speed * 0.004, context.currentTime, 0.06);
        engine.frequency.setTargetAtTime(45 + speed * 4, context.currentTime, 0.06);
        engineVolume.gain.setTargetAtTime(
          state.towed ? speed * 0.002 : 0,
          context.currentTime,
          0.06
        );
      }
      if (state.hits > lastHits) cue(90, 0.25);
      else if (state.towed !== lastTow) cue(state.towed ? 920 : 340);
      lastHits = state.hits;
      lastTow = state.towed;
    }
  };
}
