// 거리 소리: 빗소리(필터된 잡음) + 웅성임 + 건배 '짠' — 파일 없이 WebAudio 합성
let ac = null, master = null, rainG = null, crowdG = null, on = true;

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
    const rain = ac.createBufferSource(); rain.buffer = noiseBuf(3, false); rain.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2500; hp.Q.value = 0.4;
    rainG = ac.createGain(); rainG.gain.value = 0;
    rain.connect(hp).connect(rainG).connect(master); rain.start();
    const crowd = ac.createBufferSource(); crowd.buffer = noiseBuf(4, true); crowd.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    crowdG = ac.createGain(); crowdG.gain.value = 0.12;
    crowd.connect(lp).connect(crowdG).connect(master); crowd.start();
  } catch { ac = null; }
}
export function setRain(level) { if (rainG) rainG.gain.setTargetAtTime(on ? level * 0.12 : 0, ac.currentTime, 1); }
export function clink() {
  if (!ac || !on) return;
  const t = ac.currentTime;
  [2637, 3520, 4186].forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + i * 0.012); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.012 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g).connect(master); o.start(t); o.stop(t + 1);
  });
}
export function toggleSound() { on = !on; if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ac.currentTime, 0.1); return on; }
