// 거리 소리: 빗소리(필터된 잡음) + 웅성임 + 건배 '짠' — 파일 없이 WebAudio 합성
let ac = null, master = null, rainG = null, crowdG = null, sfxBus = null, ambBus = null, on = true;
export const VOL = { amb: 0.6, music: 0.6, sfx: 0.7 };
let rainLevel = 0;

function noiseBuf(sec, brown) {
  const len = ac.sampleRate * sec, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } else d[i] = w; }
  return b;
}
export function startAudio() {
  if (ac) return;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = VOL.sfx; sfxBus.connect(master);
    ambBus = ac.createGain(); ambBus.gain.value = VOL.amb; ambBus.connect(master);
    const rain = ac.createBufferSource(); rain.buffer = noiseBuf(3, false); rain.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2500; hp.Q.value = 0.4;
    rainG = ac.createGain(); rainG.gain.value = 0;
    rain.connect(hp).connect(rainG).connect(ambBus); rain.start();
    const crowd = ac.createBufferSource(); crowd.buffer = noiseBuf(4, true); crowd.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    crowdG = ac.createGain(); crowdG.gain.value = 0.12;
    crowd.connect(lp).connect(crowdG).connect(ambBus); crowd.start();
  } catch { ac = null; }
}
export function setRain(level) { rainLevel = level; if (rainG) rainG.gain.setTargetAtTime(on ? level * 0.12 : 0, ac.currentTime, 1); }
export function setVolume(kind, v) { VOL[kind] = v; if (!ac) return; if (kind === 'amb') ambBus.gain.setTargetAtTime(v, ac.currentTime, 0.1); if (kind === 'sfx') sfxBus.gain.setTargetAtTime(v, ac.currentTime, 0.1); }
export function isOn() { return on; }
export function clink() {
  if (!ac || !on) return;
  const t = ac.currentTime;
  [2637, 3520, 4186].forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + i * 0.012); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.012 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g).connect(sfxBus); o.start(t); o.stop(t + 1);
  });
}
export function toggleSound() { on = !on; if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ac.currentTime, 0.1); return on; }

export function audioCtx() { return ac && on ? { ac, master } : null; }
// 박수 (짧은 잡음 여러 번)
export function clap(vol = 1) {
  if (!ac || !on) return;
  const t0 = ac.currentTime;
  for (let i = 0; i < 6; i++) {
    const src = ac.createBufferSource(); src.buffer = noiseBuf(0.05, false);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200 + Math.random() * 800;
    const g = ac.createGain(); const t = t0 + i * 0.11 + Math.random() * 0.03;
    g.gain.setValueAtTime(0.25 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(bp).connect(g).connect(sfxBus); src.start(t);
  }
}
// 경적
export function honk() {
  if (!ac || !on) return;
  const t = ac.currentTime;
  [440, 554].forEach((f) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.04, t); g.gain.setValueAtTime(0.04, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g).connect(sfxBus); o.start(t); o.stop(t + 0.4); });
}

// 연극 효과음
export function sfx(kind) {
  if (!ac || !on) return;
  const t = ac.currentTime;
  const tone = (f, t0, d, type = 'sine', v = 0.12, f2) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g).connect(sfx_); o.start(t0); o.stop(t0 + d + 0.05); };
  const noise = (t0, d, f, v = 0.2) => { const s = ac.createBufferSource(); s.buffer = noiseBuf(d, false); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; const g = ac.createGain(); g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + d); s.connect(bp).connect(g).connect(sfx_); s.start(t0); };
  const sfx_ = sfx_bus();
  switch (kind) {
    case 'rimshot': tone(90, t, 0.25, 'sine', 0.3, 50); noise(t + 0.18, 0.12, 2500); noise(t + 0.4, 0.4, 6000, 0.12); break; // 바둠-츠
    case 'chime': [1568, 1976, 2349].forEach((f, i) => tone(f, t + i * 0.12, 1.2, 'sine', 0.08)); break;
    case 'whoosh': noise(t, 0.6, 800, 0.15); break;
    case 'boing': tone(220, t, 0.5, 'triangle', 0.15, 660); break;
    case 'sad': [523, 494, 466, 440].forEach((f, i) => tone(f, t + i * 0.28, 0.4, 'triangle', 0.08)); break;
    case 'drumroll': for (let i = 0; i < 18; i++) noise(t + i * 0.055, 0.05, 1800, 0.08 + i * 0.006); tone(80, t + 1.0, 0.4, 'sine', 0.3, 45); break;
    case 'laugh': for (let i = 0; i < 5; i++) tone(320 + (i % 2) * 40, t + i * 0.13, 0.11, 'sawtooth', 0.025); break;
    default: break;
  }
}
function sfx_bus() { return sfxBus; }
