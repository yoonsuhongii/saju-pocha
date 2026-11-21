// 버스킹 음악: WebAudio로 기타 반주 + 멜로디를 실시간 합성 (음원 파일 없음)
import { audioCtx, VOL } from './audio.js';

export const SONGS = [
  { id: 'maronnier', title: '마로니에 밤산책', mood: 'warm' },
  { id: 'lasttrain', title: '혜화역 막차', mood: 'sad' },
  { id: 'firstsnow', title: '첫눈 오는 대학로', mood: 'snow' },
  { id: 'pocha', title: '포차 블루스', mood: 'festive' },
  { id: 'rainy', title: '비 오는 날의 고백', mood: 'sad' },
];
// 분위기별 코드 진행(반음 단위, A3=57 기준) 과 템포
const MOODS = {
  warm: { bpm: 84, chords: [[48, 52, 55, 60], [43, 47, 50, 55], [45, 48, 52, 57], [41, 45, 48, 53]], scale: [0, 2, 4, 7, 9] },   // C G Am F
  sad: { bpm: 68, chords: [[45, 48, 52, 57], [41, 45, 48, 53], [48, 52, 55, 60], [43, 47, 50, 55]], scale: [0, 3, 5, 7, 10] },   // Am F C G
  festive: { bpm: 112, chords: [[43, 47, 50, 55], [48, 52, 55, 60], [50, 54, 57, 62], [43, 47, 50, 55]], scale: [0, 2, 4, 7, 9] }, // G C D G
  snow: { bpm: 76, chords: [[41, 45, 48, 52], [43, 47, 50, 53], [45, 48, 52, 55], [40, 43, 47, 52]], scale: [0, 2, 4, 7, 11] },   // Fmaj7 G7 Am7 Em7
};
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

let bus = null, nextBeat = 0, beatIdx = 0, curSong = null, playing = false;
function ensureBus() {
  const A = audioCtx(); if (!A) return null;
  if (!bus || bus.ac !== A.ac) {
    const g = A.ac.createGain(); g.gain.value = 0;
    const lp = A.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    // 간단한 잔향(딜레이)
    const d = A.ac.createDelay(); d.delayTime.value = 0.23; const fb = A.ac.createGain(); fb.gain.value = 0.28;
    g.connect(lp); lp.connect(A.master); lp.connect(d); d.connect(fb); fb.connect(d); d.connect(A.master);
    bus = { ac: A.ac, g };
  }
  return bus;
}
function pluck(t, midi, vol, dur = 1.6) {
  const { ac, g } = bus;
  const o = ac.createOscillator(), o2 = ac.createOscillator(), e = ac.createGain(), f = ac.createBiquadFilter();
  o.type = 'triangle'; o2.type = 'sawtooth'; o.frequency.value = hz(midi); o2.frequency.value = hz(midi) * 1.003;
  f.type = 'lowpass'; f.frequency.setValueAtTime(3500, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.4);
  const m2 = ac.createGain(); m2.gain.value = 0.25;
  e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(vol, t + 0.006); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); o2.connect(m2).connect(f); f.connect(e).connect(g);
  o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}
/** 매 프레임 호출. song: 현재 곡, volume: 0~1 (거리에 따라), paused: 연극 중 등 */
export function tickMusic(song, volume, paused) {
  const B = ensureBus(); if (!B) return;
  const { ac, g } = B;
  g.gain.setTargetAtTime(paused ? 0 : volume * 0.9 * VOL.music * 1.6, ac.currentTime, 0.3);
  if (paused || volume < 0.02) { playing = false; return; }
  if (!playing || curSong !== song.id) { playing = true; curSong = song.id; nextBeat = ac.currentTime + 0.1; beatIdx = 0; }
  const M = MOODS[song.mood] || MOODS.warm, beat = 60 / M.bpm;
  const seed = song.id.length * 13;
  while (nextBeat < ac.currentTime + 0.25) {
    const bar = Math.floor(beatIdx / 4), b = beatIdx % 4;
    const ch = M.chords[bar % M.chords.length];
    // 스트럼: 1·3박은 아래로, 2·4박은 가볍게
    const strum = b % 2 === 0 ? 0.018 : 0.012, vol = b === 0 ? 0.12 : 0.07;
    (b % 2 === 0 ? ch : [...ch].reverse()).forEach((n, i) => pluck(nextBeat + i * strum, n, vol));
    if (b === 0) pluck(nextBeat, ch[0] - 12, 0.12, 2.2); // 베이스
    // 멜로디 (8분음표, 확률적으로)
    for (let h = 0; h < 2; h++) {
      const k = beatIdx * 2 + h;
      if (rnd(k + seed) < (song.mood === 'festive' ? 0.6 : 0.45)) {
        const deg = M.scale[Math.floor(rnd(k * 3.1 + seed) * M.scale.length)];
        const root = ch[0] + 12 + (rnd(k * 7.3) < 0.3 ? 12 : 0);
        pluck(nextBeat + h * beat / 2, root + deg, 0.09, 0.9);
      }
    }
    nextBeat += beat; beatIdx++;
  }
}
