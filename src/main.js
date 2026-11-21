// 사주포차 거리 2030 — 월드모델 파일럿
// 공간(강변 포차 거리) · 에이전트(나·다른 손님·AI 손님·포차 사장님) · 이벤트(상담, 스타일 변신, 오행 날씨, 건배)
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildScene, updateWeather, drawStallSign, setStallColor, STALL_COUNT, STALL_X, SEAT_OFFSETS, SEAT_Z, COUNTER_Z } from './scene.js';
import { makeCharacter, animateCharacter, nameSprite, randomLook, randomName } from './character.js';
import { Player, Avatar, createInput } from './player.js';
import { connect, botGuests, mixWeather, ONLINE_CAPABLE } from './net.js';
import { calcSaju, todayFortune, snackFor, sajuSummary, sajuDetail, ELEMENTS, relation } from './saju.js';
import { makePersona, counsel, stallDefault } from './ai.js';
import { startAudio, setRain, clink, toggleSound } from './audio.js';

const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const TOUCH = matchMedia('(pointer: coarse)').matches;
const HIGH = qs.get('q') ? qs.get('q') === 'high' : !(TOUCH || Math.min(innerWidth, innerHeight) < 600);

// ---------------- 렌더러 ----------------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: HIGH, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, HIGH ? 2 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
camera.position.set(0, 6, 14);
const world = buildScene(scene, { high: HIGH });
world.stalls.forEach((s) => { s.baseLight = s.light.intensity; });
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), HIGH ? 0.75 : 0.55, 0.6, 0.78);
composer.addPass(bloom);
composer.addPass(new OutputPass());
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// ---------------- 포차 사장님(상담사) ----------------
const stallState = world.stalls.map((s, i) => ({ persona: stallDefault(i), at: 0, by: null, counselor: null, tag: null, history: [], greeted: false }));
function applyStall(i, persona, { at = 0, by = null } = {}) {
  const st = stallState[i], s = world.stalls[i];
  st.persona = persona; st.at = at; st.by = by;
  drawStallSign(s, persona.stallName || persona.name, persona.signColor || '#fff3d6');
  setStallColor(s, persona.tarp || '#ff7a1a');
  if (st.counselor) scene.remove(st.counselor);
  const c = makeCharacter(persona.look);
  c.position.set(s.x + 0.6, 0, -2.55);
  scene.add(c); st.counselor = c;
  const tag = nameSprite(`${persona.name} · 상담사`, { bg: 'rgba(120,40,0,0.75)', scale: 0.85 });
  tag.position.y = 2.05; c.add(tag); st.tag = tag;
  // 변신 연출: 반짝임
  if (at) sparkle(new THREE.Vector3(s.x + 0.6, 1.2, -2.55), persona.tarp);
}
world.stalls.forEach((_, i) => applyStall(i, stallState[i].persona));

const sparkles = [];
function sparkle(pos, color = '#ffd27a') {
  const n = 60, geo = new THREE.BufferGeometry(), p = new Float32Array(n * 3), v = [];
  for (let i = 0; i < n; i++) { p.set([pos.x, pos.y, pos.z], i * 3); v.push(new THREE.Vector3().randomDirection().multiplyScalar(1 + Math.random() * 2)); }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.12, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(pts); sparkles.push({ pts, v, life: 1.4 });
}

// ---------------- 안주 (테이블 위) ----------------
const SNACK_COLOR = { wood: 0x8bc34a, fire: 0xe8452c, earth: 0xf5c542, metal: 0xf1f1f1, water: 0xd99a5b };
const foods = new Map();
function placeSnack(seatKey, el) {
  if (foods.has(seatKey)) return;
  const [si, k] = seatKey.split('-').map(Number);
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
  g.add(plate);
  const food = new THREE.Mesh(el === 'water' ? new THREE.CylinderGeometry(0.14, 0.12, 0.1, 14) : new THREE.BoxGeometry(0.22, 0.06, 0.16), new THREE.MeshStandardMaterial({ color: SNACK_COLOR[el] || 0xffaa55, roughness: 0.5, emissive: SNACK_COLOR[el], emissiveIntensity: 0.15 }));
  food.position.y = 0.05; g.add(food);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.7, roughness: 0.05 }));
  cup.position.set(0.24, 0.04, 0.05); g.add(cup);
  g.position.set(STALL_X(si) + SEAT_OFFSETS[k], 1.03, COUNTER_Z - 0.05);
  scene.add(g); foods.set(seatKey, g);
}

// ---------------- 나 ----------------
const me = {
  id: Math.random().toString(36).slice(2, 10), joinedAt: Date.now(),
  name: randomName(), look: randomLook(), saju: null, el: null, seatKey: null, wave: 0, stallStyle: null,
  public() {
    const p = player ? player.pos : { x: 0, z: 5 };
    return { id: this.id, name: this.name, look: this.look, el: this.el, seat: this.seatKey, x: +p.x.toFixed(2), z: +p.z.toFixed(2), wave: this.wave > Date.now() ? this.wave : 0, stallStyle: this.stallStyle };
  },
};
let player = null, input = null, net = null, entered = false;

// ---------------- 입장 화면 ----------------
const HOURS = [['자시', 23, 1], ['축시', 1, 3], ['인시', 3, 5], ['묘시', 5, 7], ['진시', 7, 9], ['사시', 9, 11], ['오시', 11, 13], ['미시', 13, 15], ['신시', 15, 17], ['유시', 17, 19], ['술시', 19, 21], ['해시', 21, 23]];
HOURS.forEach(([n, a, b], i) => { const o = document.createElement('option'); o.value = String(i * 2); o.textContent = `${n} (${String(a).padStart(2, '0')}~${String(b).padStart(2, '0')}시)`; $('hour').appendChild(o); });
$('my-name').textContent = me.name;
$('reroll').onclick = () => { me.name = randomName(); me.look = randomLook(); $('my-name').textContent = me.name; };
$('enter').onclick = () => {
  const v = $('birth').value;
  if (!v) { toast('생년월일을 골라주세요'); return; }
  const [y, m, d] = v.split('-').map(Number);
  const hv = $('hour').value;
  me.saju = calcSaju({ y, m, d, hour: hv === '' ? null : Number(hv) });
  me.el = me.saju.dominant;
  enter();
};
$('enter-skip').onclick = () => enter();

function enter() {
  entered = true;
  $('intro').classList.add('hidden');
  ['hud', 'topright', 'hint'].forEach((id) => $(id).classList.remove('hidden'));
  if (TOUCH) $('joy').classList.remove('hidden');
  player = new Player(scene, me.look, me.name);
  player.pos.set(-6 + Math.random() * 12, 0, 5.5);
  player.yaw = 0.15;
  input = createInput(canvas, player);
  startAudio();
  net = connect(me, {
    onPeers: () => {},
    onStatus: (s) => { $('status').textContent = s.online ? `🟢 ${s.room}번 거리 · ${s.count}명 접속 중` : (ONLINE_CAPABLE ? '연결 중…' : '오프라인 미리보기 · AI 손님과 함께'); },
    onStall: (style, by) => {
      if (!style || style.stall === undefined) return;
      const st = stallState[style.stall];
      if (!st || (style.at || 0) <= st.at) return;
      applyStall(style.stall, style, { at: style.at, by });
      const who = net.peers.get(by)?.name || '누군가';
      toast(`✨ ${who}님이 ${style.stallName} 사장님을 불러냈어요`);
    },
    onCheers: (p) => {
      const peer = net.peers.get(p.id);
      if (peer) peer.waveUntil = performance.now() + 2500;
      if (me.seatKey && Number(me.seatKey.split('-')[0]) === p.stall) { clink(); toast(`🍶 ${peer?.name || '옆자리 손님'}님이 건배를 건넸어요`); }
    },
  });
  setTimeout(() => $('hint').style.opacity = '0', 9000);
  if (me.saju) setTimeout(() => toast(`오늘 밤 당신의 기운은 ${ELEMENTS[me.saju.dominant].h}(${ELEMENTS[me.saju.dominant].name}) — 거리 날씨가 조금 바뀌어요`), 1200);
}

// ---------------- 좌석 ----------------
function takenSeats() {
  const s = new Set();
  if (net) net.peers.forEach((p) => p.seat && s.add(p.seat));
  if (me.seatKey) s.add(me.seatKey);
  return s;
}
let nearSeat = null;
function findNearSeat() {
  if (!player || player.seat) return null;
  const taken = takenSeats();
  let best = null, bd = 1.3;
  world.stalls.forEach((s) => s.seats.forEach((seat) => {
    const key = `${seat.stall}-${seat.index}`;
    if (taken.has(key)) return;
    const d = Math.hypot(player.pos.x - seat.x, player.pos.z - seat.z);
    if (d < bd) { bd = d; best = { ...seat, key }; }
  }));
  return best;
}
$('btn-sit').onclick = () => sit();
function sit() {
  if (!nearSeat) return;
  me.seatKey = nearSeat.key;
  player.sitAt(nearSeat);
  $('btn-sit').classList.add('hidden');
  net.update();
  openPanel(nearSeat.stall);
}
function stand() {
  player.stand();
  me.seatKey = null;
  net.update();
  $('panel').classList.add('hidden');
  curStall = -1;
}
$('btn-stand').onclick = stand;

// ---------------- 상담 패널 ----------------
let curStall = -1, busy = false;
const log = $('log');
function addMsg(text, who = 'bot', html = false) {
  const d = document.createElement('div');
  d.className = `msg ${who}`;
  if (html) d.innerHTML = text; else d.textContent = text;
  log.appendChild(d); log.scrollTop = log.scrollHeight;
  return d;
}
function renderPanelHeader() {
  const p = stallState[curStall].persona;
  $('stall-name').textContent = `🏮 ${p.stallName || ''}`;
  $('counselor-name').textContent = p.name;
}
function openPanel(i) {
  curStall = i;
  const st = stallState[i];
  $('panel').classList.remove('hidden');
  log.innerHTML = '';
  renderPanelHeader();
  st.history.forEach((m) => addMsg(m.content, m.role === 'assistant' ? 'bot' : 'me'));
  if (!st.greeted) {
    st.greeted = true;
    say(st.persona.greeting || '어서 와요.');
    if (me.saju) {
      const s = me.saju, sm = sajuSummary(s), f = todayFortune(s);
      const box = `<div class="mini-pillars">${[s.pillars.year, s.pillars.month, s.pillars.day, s.pillars.hour].map((p) => (p ? p.h : '??')).join(' · ')}</div>`;
      addMsg(`📜 손님 사주를 펼쳐봤어요<br>일간 ${sm.dayMaster} · ${ELEMENTS[s.dominant].h} 기운이 가장 많고 ${ELEMENTS[s.weak].h} 기운이 약해요.<br>오늘은 「${f.rel}」의 날 — ${f.tone}${box}`, 'sys', true);
    } else addMsg('사주 없이 앉았어요. 입장 화면에서 생년월일을 넣으면 사주 상담을 받을 수 있어요.', 'sys');
  }
  renderChips();
}
function say(text) { const st = stallState[curStall]; st.history.push({ role: 'assistant', content: text }); addMsg(text, 'bot'); }
const CHIPS = ['내 사주 전체 풀이해줘', '오늘 운세 어때요?', '진로가 고민이에요', '연애운 봐주세요', '요즘 너무 지쳐요', '사람 관계가 힘들어요'];
function renderChips() {
  const c = $('chips'); c.innerHTML = '';
  CHIPS.forEach((t) => { const b = document.createElement('button'); b.textContent = t; b.type = 'button'; b.onclick = () => ask(t); c.appendChild(b); });
  const sc = $('style-chips'); sc.innerHTML = '';
  ['부산 사투리 무뚝뚝한 아재', '전라도 욕쟁이 할머니', '조선시대 선비', '말끝마다 냥 하는 고양이 사장', '현실 조언하는 직장 팀장'].forEach((t) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = () => restyle(t); sc.appendChild(b);
  });
}
$('ask').onsubmit = (e) => { e.preventDefault(); const v = $('q').value.trim(); if (v) { $('q').value = ''; ask(v); } };
async function ask(text) {
  if (busy || curStall < 0) return;
  busy = true;
  const i = curStall, st = stallState[i];
  addMsg(text, 'me');
  const typing = addMsg('…', 'bot typing');
  talking = i;
  const saju = me.saju ? sajuDetail(me.saju) : { note: '사주 정보 없음 — 사주 대신 대화로만 상담' };
  const res = await counsel({
    persona: (({ name, speech, catchphrases, backstory, sample, greeting }) => ({ name, speech, catchphrases, backstory, sample, greeting }))(st.persona), saju,
    fortune: me.saju ? (({ today, rel, tone }) => ({ 오늘: today.h, 나와의관계: rel, 풀이: tone }))(todayFortune(me.saju)) : {}, history: st.history, message: text,
  }, me.saju).catch(() => ({ text: '', offline: true }));
  let reply = res.text;
  if (!reply) reply = `${st.persona.greeting || ''} 사주를 몰라도 들어줄 수는 있어요. 오늘은 따뜻한 국물부터 한 그릇 해요.`;
  st.history.push({ role: 'user', content: text });
  typing.remove();
  talking = -1;
  if (curStall === i) say(reply); else st.history.push({ role: 'assistant', content: reply });
  if (me.saju && me.seatKey && !foods.has(me.seatKey)) {
    const sn = snackFor(me.saju.weak);
    placeSnack(me.seatKey, me.saju.weak);
    addMsg(`🍢 ${sn.name}${(sn.name.charCodeAt(sn.name.length - 1) - 0xac00) % 28 ? '이' : '가'} 나왔어요 — ${sn.why}`, 'sys');
  }
  busy = false;
}
let talking = -1;


$('style-form').onsubmit = (e) => { e.preventDefault(); const v = $('style-q').value.trim(); if (v) { $('style-q').value = ''; restyle(v); } };
async function restyle(prompt) {
  if (curStall < 0 || busy) return;
  busy = true;
  const i = curStall;
  addMsg(`✨ "${prompt}" 스타일로 사장님을 부르는 중…`, 'sys');
  const p = await makePersona(prompt);
  const style = { ...p, stall: i, at: Date.now() };
  applyStall(i, p, { at: style.at, by: me.id });
  me.stallStyle = style;
  net.stall(style); net.update();
  stallState[i].history = [];
  if (curStall === i) { renderPanelHeader(); say(p.greeting || '어서 와요.'); }
  busy = false;
}

$('btn-cheers').onclick = () => {
  clink(); me.wave = Date.now() + 2500; player.wave = 2.5;
  net.cheers(curStall); net.update();
};
$('btn-sound').onclick = () => { $('btn-sound').textContent = toggleSound() ? '🔊' : '🔇'; };
$('btn-card').onclick = () => showCard();
$('cardview').onclick = (e) => { if (e.target.id === 'cardview') $('cardview').classList.add('hidden'); };
function showCard() {
  const el = $('saju-card');
  if (!me.saju) { el.innerHTML = '<h2>📜 내 사주</h2><p class="muted">사주 없이 구경 중이에요.<br>새로고침 후 생년월일을 넣어보세요.</p>'; $('cardview').classList.remove('hidden'); return; }
  const s = me.saju, f = todayFortune(s), P = s.pillars;
  const col = (lab, p) => `<div><div class="lab">${lab}</div><div class="h">${p ? p.h.split('').join('<br>') : '?<br>?'}</div><div class="lab">${p ? p.ko : '모름'}</div></div>`;
  const max = Math.max(...Object.values(s.count), 1);
  const bars = Object.keys(s.count).map((k) => `<div class="bar"><span>${ELEMENTS[k].h} ${ELEMENTS[k].name}</span><i style="width:${(s.count[k] / max) * 100}%;background:${ELEMENTS[k].color}"></i><b>${s.count[k]}</b></div>`).join('');
  el.innerHTML = `<div class="kicker">오늘 밤의 사주 카드 · ${me.name}</div><div class="pillars">${col('시', P.hour)}${col('일', P.day)}${col('월', P.month)}${col('년', P.year)}</div>
  <p>나를 뜻하는 글자 <b>${s.dayMaster.h}</b> — ${s.dayMaster.desc}</p><div class="bars">${bars}</div>
  <p class="muted tiny">${s.animal}띠 · 오늘은 「${f.rel}」의 날 · 추천 안주 ${snackFor(s.weak).name}</p><p class="tiny muted">재미로 보는 사주예요 · 바깥을 누르면 닫혀요</p>`;
  $('cardview').classList.remove('hidden');
}

let toastT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 3200); }

// ---------------- 다른 손님 ----------------
const avatars = new Map();
let weatherEl = 'water', weatherT = 0;
function syncAvatars(dt, now, nowSec) {
  const humans = net ? [...net.peers.values()] : [];
  const taken = takenSeats();
  const bots = botGuests(nowSec, humans.length + 1, taken);
  const all = [
    ...humans.map((p) => ({ id: p.id, name: p.name, look: p.look, bot: false, x: p.x, z: p.z, seated: !!p.seat, seatKey: p.seat, wave: (p.waveUntil || 0) > now || (p.wave || 0) > Date.now(), el: p.el })),
    ...bots,
  ];
  const seen = new Set();
  all.forEach((a) => {
    if (!a.look) return;
    seen.add(a.id);
    let av = avatars.get(a.id);
    if (!av) { av = new Avatar(scene, a); av.group.position.set(a.x, 0, a.z); avatars.set(a.id, av); }
    else av.setLook(a.look, a.name, a.bot);
    if (a.seated && a.seatKey) {
      const [si, k] = a.seatKey.split('-').map(Number);
      a.x = STALL_X(si) + SEAT_OFFSETS[k]; a.z = SEAT_Z + 0.08;
      if (a.bot && Math.sin(nowSec / 7 + si * 3 + k) > 0.3) placeSnack(a.seatKey, a.el);
    }
    av.update(dt, a, now, camera.position);
  });
  avatars.forEach((av, id) => { if (!seen.has(id)) { av.dispose(); avatars.delete(id); } });
  // 비어진 자리의 음식 치우기
  foods.forEach((g, key) => { if (!all.some((a) => a.seatKey === key) && key !== me.seatKey) { scene.remove(g); foods.delete(key); } });

  // 오행 날씨 (2초마다)
  weatherT -= dt;
  if (weatherT <= 0) {
    weatherT = 2;
    const els = all.map((a) => a.el);
    if (me.el) els.push(me.el, me.el); // 나의 기운은 조금 더 크게
    const w = mixWeather(els);
    weatherEl = w.el;
    const counts = Object.entries(w.counts).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${ELEMENTS[k].h}${n}`).join(' ');
    $('weather').textContent = `거리의 기운 ${counts} → ${ELEMENTS[w.el].weather}`;
  }
}

// ---------------- 루프 ----------------
const clock = new THREE.Clock();
let moveT = 0;
const viewOff = { x: 0, y: 0 };
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  const nowSec = Date.now() / 1000;
  if (!entered) {
    // 입장 전: 거리를 천천히 훑는 카메라
    const t = now / 1000;
    camera.position.set(Math.sin(t * 0.06) * 36, 4.5 + Math.sin(t * 0.13) * 0.8, 10.5);
    camera.lookAt(camera.position.x * 0.9, 1.6, -3);
  } else {
    input.poll();
    player.update(dt, input, camera, now);
    nearSeat = findNearSeat();
    $('btn-sit').classList.toggle('hidden', !nearSeat);
    if (nearSeat && input.interact) sit();
    if (player.walking) { moveT -= dt; if (moveT <= 0) { moveT = 0.12; net.move(player.pos.x, player.pos.z); } }
  }
  syncAvatars(dt, now, nowSec);
  // 상담사 애니메이션
  stallState.forEach((st, i) => { if (st.counselor) { animateCharacter(st.counselor, { talk: talking === i || Math.sin(now / 2000 + i) > 0.7 }, now); st.counselor.rotation.y = Math.sin(now / 3000 + i) * 0.25; } });
  // 김
  world.stalls.forEach((s) => s.steam.forEach((p) => {
    p.t = (p.t + dt * 0.35) % 1;
    p.s.position.set(s.x - 1.1 + Math.sin(p.t * 6 + s.i) * 0.15, 1.3 + p.t * 1.6, -3.4);
    p.s.scale.setScalar(0.4 + p.t * 0.9); p.s.material.opacity = 0.35 * (1 - p.t);
  }));
  // 반짝임
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const sp = sparkles[i]; sp.life -= dt;
    const a = sp.pts.geometry.attributes.position.array;
    sp.v.forEach((v, k) => { a[k * 3] += v.x * dt; a[k * 3 + 1] += v.y * dt; a[k * 3 + 2] += v.z * dt; v.y -= dt * 1.5; });
    sp.pts.geometry.attributes.position.needsUpdate = true; sp.pts.material.opacity = Math.max(0, sp.life / 1.4);
    if (sp.life <= 0) { scene.remove(sp.pts); sparkles.splice(i, 1); }
  }
  // 상담 패널이 열리면 화면 중심을 패널 밖으로 밀어 사장님이 가려지지 않게
  const panelOpen = curStall >= 0, W = innerWidth, H = innerHeight;
  const ox = panelOpen && W > 700 && H > 500 ? W * 0.17 : panelOpen && H <= 500 ? W * 0.2 : 0;
  const oy = panelOpen && W <= 700 && H > 500 ? H * 0.27 : 0;
  viewOff.x += (ox - viewOff.x) * Math.min(1, dt * 4); viewOff.y += (oy - viewOff.y) * Math.min(1, dt * 4);
  if (Math.abs(viewOff.x) + Math.abs(viewOff.y) > 0.5) camera.setViewOffset(W, H, viewOff.x, viewOff.y, W, H); else camera.clearViewOffset();
  updateWeather(world.weather, world, weatherEl, dt, now);
  setRain(world.weather.cur.rain);
  world.streaks.forEach((s, i) => { s.material.opacity = 0.5 + Math.sin(now / 700 + i) * 0.15; });
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 테스트·시연용 핸들
window.__sp = { me, get player() { return player; }, stallState, world, sit, stand, ask, restyle, showCard, get nearSeat() { return nearSeat; }, avatars, relation };
