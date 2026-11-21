// 사주포차 거리 2030 — 월드모델 파일럿
// 공간(혜화역 대학로 마로니에공원 앞 포차 거리) · 에이전트(나·다른 손님·AI 손님·포차 사장님) · 이벤트(상담, 스타일 변신, 오행 날씨, 건배)
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildStreet, PLAY_PRESETS } from './street.js';
import { buildBooth, inBooth, composeStrip, BOOTH } from './photobooth.js';
import { tickMusic, SONGS } from './music.js';
import { buildScene, updateWeather, themeWeather, STAGE, OBSTACLES, drawStallSign, setStallColor, itemMesh, MENU, MENU_BY_ID, SNACK_BY_EL, BUNGEO_POS, STALL_COUNT, STALL_X, SEAT_OFFSETS, SEAT_Z, COUNTER_Z } from './scene.js';
import { makeCharacter, animateCharacter, nameSprite, bubbleSprite, randomLook, randomName } from './character.js';
import { Player, Avatar, createInput } from './player.js';
import { connect, botGuests, botChatter, mixWeather, ONLINE_CAPABLE } from './net.js';
import { calcSaju, todayFortune, snackFor, sajuSummary, sajuDetail, luckContext, ELEMENTS, relation } from './saju.js';
import { makePersona, counsel, stallDefault, neighbor, cleanChat, styleize, makePlay, makeTheme } from './ai.js';
import { startAudio, setRain, clink, toggleSound, clap, honk, setVolume, isOn, VOL, sfx } from './audio.js';

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
renderer.shadowMap.enabled = HIGH; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
// 은은한 환경광(반사·부드러운 음영) — 밤이라 약하게
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = HIGH ? 0.22 : 0.15;
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
camera.position.set(0, 6, 14);
const world = buildScene(scene, { high: HIGH });
world.stalls.forEach((s) => { s.baseLight = s.light.intensity; });
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
let gtao = null;
if (HIGH) { gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.overrideVisibility = function () { const cache = this._visibilityCache; this.scene.traverse((o) => { cache.set(o, o.visible); if (o.isPoints || o.isLine || o.isSprite || (o.material && o.material.transparent)) o.visible = false; }); }; gtao.blendIntensity = 0.85; gtao.updateGtaoMaterial({ radius: 0.5, distanceFallOff: 1, thickness: 1 }); composer.addPass(gtao); }
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), HIGH ? 0.7 : 0.55, 0.6, 0.86);
composer.addPass(bloom);
composer.addPass(new OutputPass());
if (HIGH) composer.addPass(new SMAAPass(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio()));
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// ---------------- 포차 사장님(상담사) ----------------
const stallState = world.stalls.map((s, i) => ({ idx: i, persona: stallDefault(i), at: 0, by: null, counselor: null, tag: null, history: [], greeted: false }));
function applyStall(i, persona, { at = 0, by = null } = {}) {
  const st = stallState[i], s = world.stalls[i];
  st.persona = persona; st.at = at; st.by = by;
  drawStallSign(s, persona.stallName || persona.name, persona.signColor || '#fff3d6');
  setStallColor(s, persona.tarp || '#ff7a1a');
  if (st.counselor) scene.remove(st.counselor);
  const c = makeCharacter(persona.look);
  c.position.copy(st.counselor ? st.counselor.position : new THREE.Vector3(s.x + 0.6, 0, -2.55));
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

// ---------------- 테이블 위 주문 (모든 자리 공통) ----------------
const tables = new Map(); // seatKey -> { sig, group }
const ITEM_POS = [[-0.22, 0.05], [0.18, 0.05], [0, -0.22], [-0.3, -0.25], [0.3, -0.22], [0.05, 0.22]];
function setTable(seatKey, orders) {
  const list = (orders || []).slice(-6);
  const sig = list.join(',');
  const cur = tables.get(seatKey);
  if (cur && cur.sig === sig) return;
  if (cur) scene.remove(cur.group);
  if (!list.length) { tables.delete(seatKey); return; }
  const [si, k] = seatKey.split('-').map(Number);
  const g = new THREE.Group();
  list.forEach((id, n) => { const m = itemMesh(id); const [ox, oz] = ITEM_POS[n % ITEM_POS.length]; m.position.set(ox, 0, oz); g.add(m); });
  g.position.set(STALL_X(si) + SEAT_OFFSETS[k], 1.01, COUNTER_Z - 0.02);
  scene.add(g); tables.set(seatKey, { sig, group: g });
}

// ---------------- 나 ----------------
const me = {
  id: Math.random().toString(36).slice(2, 10), joinedAt: Date.now(),
  name: randomName(), look: randomLook(), saju: null, el: null, seatKey: null, wave: 0, stallStyle: null, orders: [], carry: null,
  public() {
    const p = player ? player.pos : { x: 0, z: 5 };
    return { id: this.id, name: this.name, look: this.look, el: this.el, seat: this.seatKey, x: +p.x.toFixed(2), z: +p.z.toFixed(2), wave: this.wave > Date.now() ? this.wave : 0, stallStyle: this.stallStyle, orders: this.orders.slice(-6), carry: this.carry, theme: this.theme && this.theme.until > Date.now() ? this.theme : null };
  },
};
let player = null, input = null, net = null, entered = false;

// ---------------- 입장 화면 ----------------
const HOURS = [['자시', 23, 1], ['축시', 1, 3], ['인시', 3, 5], ['묘시', 5, 7], ['진시', 7, 9], ['사시', 9, 11], ['오시', 11, 13], ['미시', 13, 15], ['신시', 15, 17], ['유시', 17, 19], ['술시', 19, 21], ['해시', 21, 23]];
HOURS.forEach(([n, a, b], i) => { const o = document.createElement('option'); o.value = String(i * 2); o.textContent = `${n} (${String(a).padStart(2, '0')}~${String(b).padStart(2, '0')}시)`; $('hour').appendChild(o); });
$('my-name').value = me.name;
$('reroll').onclick = () => { me.name = randomName(); me.look = randomLook(); $('my-name').value = me.name; };
// 생년월일: 연도는 직접 입력, 월·일은 선택
for (let m = 1; m <= 12; m++) { const o = document.createElement('option'); o.value = m; o.textContent = m; $('b-month').appendChild(o); }
function fillDays() {
  const y = Number($('b-year').value) || 2000, m = Number($('b-month').value) || 1, keep = $('b-day').value || '1';
  const n = new Date(y, m, 0).getDate();
  $('b-day').innerHTML = '';
  for (let d = 1; d <= n; d++) { const o = document.createElement('option'); o.value = d; o.textContent = d; $('b-day').appendChild(o); }
  $('b-day').value = Math.min(Number(keep), n);
}
fillDays();
$('b-month').onchange = fillDays;
$('b-year').oninput = () => { $('b-year').value = $('b-year').value.replace(/\D/g, '').slice(0, 4); if ($('b-year').value.length === 4) fillDays(); };
function myName() { return cleanChat($('my-name').value).replace(/♡/g, '').trim().slice(0, 10) || randomName(); }
$('enter').onclick = () => {
  const y = Number($('b-year').value), m = Number($('b-month').value), d = Number($('b-day').value);
  if (!(y >= 1930 && y <= 2025)) { toast('태어난 연도를 4자리로 적어주세요 (예: 2006)'); $('b-year').focus(); return; }
  me.name = myName();
  const hv = $('hour').value;
  me.saju = calcSaju({ y, m, d, hour: hv === '' ? null : Number(hv) });
  me.el = me.saju.dominant;
  enter();
};
$('enter-skip').onclick = () => { me.name = myName(); enter(); };

function enter() {
  entered = true;
  $('intro').classList.add('hidden');
  ['hud', 'topright', 'hint'].forEach((id) => $(id).classList.remove('hidden'));
  if (TOUCH) $('joy').classList.remove('hidden');
  player = new Player(scene, me.look, me.name);
  player.pos.set(-6 + Math.random() * 12, 0, 5.5);
  player.yaw = 0.15;
  input = createInput(canvas, player);
  // 충돌: 고정 물체 + 행인·다른 손님 + 차
  player.colliders = () => {
    const list = OBSTACLES.slice();
    street.colliders().forEach((c) => list.push(c));
    booth.walls.forEach((c) => list.push(c));
    avatars.forEach((av) => { const p = av.group.position; if (Math.abs(p.z - SEAT_Z - 0.08) > 0.05) list.push({ x: p.x, z: p.z, r: 0.3, kind: 'person' }); });
    return list;
  };
  player.boxes = () => street.carBoxes();
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
      const a = participant('avatar', p.id);
      const b = p.to === 'counselor' ? participant('counselor', p.stall) : p.to === me.id ? participant('me') : participant('avatar', p.to);
      startToast(a, b);
      if (p.to === me.id) toast(`🍶 ${peer?.name || '옆자리 손님'}님이 나에게 건배했어요!`);
    },
    onSay: (p) => {
      const av = avatars.get(p.id), peer = net.peers.get(p.id);
      const text = cleanChat(p.text);
      if (av) av.say(text, performance.now());
      const near = av && player && av.group.position.distanceTo(player.pos) < 12;
      if (near || (me.seatKey && p.stall === mySeatStall())) addChat(peer?.name || '손님', text, 'other');
    },
    onTheme: (t, by) => { if (t && t.at) applyTheme({ ...t, by }); },
    onPlay: (p) => startPlay(p),
    onBusk: (r) => { buskReq = r; toast(`🎸 ${r.by || '누군가'}님의 신청곡이 흘러나와요`); },
    onPhoto: (p) => startPhoto(p),
    onClap: (p) => { const av = avatars.get(p.id); if (av) { const peer = net.peers.get(p.id); if (peer) peer.waveUntil = performance.now() + 1500; } if (player && player.pos.distanceTo(new THREE.Vector3(STAGE.x, 0, STAGE.z)) < 20) clap(0.6); },
    onBungeo: (p) => {
      bungeoTally[p.flavor] = (bungeoTally[p.flavor] || 0) + 1;
      const who = net.peers.get(p.id)?.name || '누군가';
      toast(`🐟 ${who}님이 ${FLAVOR[p.flavor]}을 샀어요 · 팥 ${bungeoTally.pat} : 슈 ${bungeoTally.shu} : 피자 ${bungeoTally.pizza}`);
    },
  });
  buildBungeoOwner();
  setTimeout(() => $('hint').style.opacity = '0', 9000);
  if (me.saju) setTimeout(() => toast(`오늘 밤 당신은 ${ELEMENTS[me.saju.dominant].name} 기운이 가장 강해요 — 거리 날씨가 조금 바뀌어요`), 1200);
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
  if (me.seatKey) setTable(me.seatKey, []);
  player.stand();
  me.seatKey = null; me.orders = [];
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
  $('chatbar').classList.add('hidden');
  showTab('counsel');
  // 들고 온 붕어빵은 테이블에 내려놓기
  if (me.carry) { me.orders.push(me.carry); me.carry = null; player.setCarry(null); setTable(me.seatKey, me.orders); renderMenu(); }
  log.innerHTML = '';
  renderPanelHeader();
  st.history.forEach((m) => { if (m.content.startsWith('(사장님이')) return; addMsg(m.content.replace(/^\([^)]*서빙\) /, ''), m.role === 'assistant' ? 'bot' : 'me'); });
  if (!st.greeted) {
    st.greeted = true;
    say(st.persona.greeting || '어서 와요.');
    if (me.saju) {
      const s = me.saju, sm = sajuSummary(s), f = todayFortune(s);
      const box = `<div class="mini-pillars">${[s.pillars.year, s.pillars.month, s.pillars.day, s.pillars.hour].map((p) => (p ? p.h : '??')).join(' · ')}</div>`;
      addMsg(`📜 손님 사주를 펼쳐봤어요<br>나를 뜻하는 글자는 <b>${s.dayMaster.stem}</b> — ${s.dayMaster.desc}<br>${ELEMENTS[s.dominant].name} 기운이 가장 많고, ${ELEMENTS[s.weak].name} 기운이 약해요.<br>오늘은 ${f.relPlain} — ${f.tone}`, 'sys', true);
    } else addMsg('사주 없이 앉았어요. 입장 화면에서 생년월일을 넣으면 사주 상담을 받을 수 있어요.', 'sys');
  }
  renderChips();
}
function say(text) { const st = stallState[curStall]; st.history.push({ role: 'assistant', content: text }); addMsg(text, 'bot'); }
const CHIPS = ['내 사주 전체 풀이해줘', '오늘 운세 어때요?', '내년 운세 봐주세요', '진로가 고민이에요', '연애운 봐주세요', '요즘 너무 지쳐요', '사람 관계가 힘들어요'];
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
  const typing = addMsg('<span class="thinking"><span class="dots"><i></i><i></i><i></i></span><span class="think-txt">사주를 펼쳐보는 중</span></span>', 'bot typing', true);
  const THINK = me.saju ? ['사주를 펼쳐보는 중', '태어난 날 글자를 짚어보는 중', '음… 뭐라고 말해줄까', '국물 한번 휘젓는 중', '오늘 운이랑 맞춰보는 중'] : ['음… 생각하는 중', '고민을 곱씹는 중', '국물 한번 휘젓는 중'];
  let ti = 0;
  const thinkTimer = setInterval(() => { const el = typing.querySelector('.think-txt'); if (!el) return; el.style.opacity = 0; setTimeout(() => { ti = (ti + 1) % THINK.length; el.textContent = THINK[ti]; el.style.opacity = 1; }, 250); }, 1800);
  if (st.counselor) bubbleOn(st.counselor, '🤔 …', 30000);
  talking = i;
  const saju = me.saju ? { ...sajuDetail(me.saju), 운의_흐름: luckContext(me.saju, text) } : { note: '사주 정보 없음 — 사주 대신 대화로만 상담' };
  const res = await counsel({
    persona: (({ name, speech, catchphrases, backstory, sample, greeting }) => ({ name, speech, catchphrases, backstory, sample, greeting }))(st.persona), saju,
    table: me.orders.map((id) => MENU_BY_ID[id]?.name || (id === 'bungeo' ? '붕어빵' : id)).join(', ') || '아직 주문 없음',
    fortune: me.saju ? (({ today, relPlain, tone }) => ({ 오늘: `${today.ko}일`, 나와의관계: relPlain, 풀이: tone }))(todayFortune(me.saju)) : {}, history: st.history, message: text,
  }, me.saju).catch(() => ({ text: '', offline: true }));
  let reply = res.text;
  if (!reply) reply = `${st.persona.greeting || ''} 사주를 몰라도 들어줄 수는 있어요. 오늘은 따뜻한 국물부터 한 그릇 해요.`;
  st.history.push({ role: 'user', content: text });
  typing.remove(); clearInterval(thinkTimer);
  if (st.counselor?.userData.bubble) { st.counselor.remove(st.counselor.userData.bubble); st.counselor.userData.bubble = null; }
  talking = -1;
  if (st.counselor) bubbleOn(st.counselor, reply.split(/(?<=[.!?…])\s/)[0].slice(0, 40), 5000);
  if (curStall === i) say(reply); else st.history.push({ role: 'assistant', content: reply });
  if (me.saju && !st.recommended && !me.orders.includes(SNACK_BY_EL[me.saju.weak])) {
    st.recommended = true;
    const sn = snackFor(me.saju.weak);
    addMsg(`⭐ 사장님 추천 안주: ${sn.name} — ${sn.why}. 🍢 주문 탭에서 시킬 수 있어요.`, 'sys');
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
  // 대화는 이어서: 바뀐 사장님이 앞 대화를 알고 새 말투로 인사
  stallState[i].history.push({ role: 'assistant', content: `(사장님이 "${p.name}"(으)로 바뀜. 앞의 대화 내용은 그대로 기억하고 이제부터 새 말투로 이어서 말함)` });
  if (curStall === i) { renderPanelHeader(); addMsg(`✨ 사장님이 ${p.name}(으)로 바뀌었어요 · 대화는 그대로 이어져요`, 'sys'); say(p.greeting || '어서 와요.'); }
  busy = false;
}

$('btn-cheers').onclick = () => openCheersPick();
$('btn-sound').onclick = () => { const on = toggleSound(); $('btn-sound').textContent = on ? '🔊' : '🔇'; $('s-on').checked = on; };
// 설정: 소리 3종 볼륨 + 그래픽 품질
$('btn-settings').onclick = () => { document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', (b.dataset.q === 'high') === HIGH)); $('settings-modal').classList.remove('hidden'); };
$('s-on').onchange = () => { if ($('s-on').checked !== isOn()) $('btn-sound').click(); };
[['amb', 'v-amb'], ['music', 'v-music'], ['sfx', 'v-sfx']].forEach(([k, id]) => {
  try { const saved = localStorage.getItem('vol-' + k); if (saved !== null) { $(id).value = saved; VOL[k] = saved / 100; } } catch {}
  $(`${id}-t`).textContent = `${$(id).value}%`;
  $(id).oninput = () => { const v = $(id).value / 100; setVolume(k, v); $(`${id}-t`).textContent = `${$(id).value}%`; try { localStorage.setItem('vol-' + k, $(id).value); } catch {} };
});
document.querySelectorAll('.seg button').forEach((b) => { b.onclick = () => { const u = new URL(location.href); u.searchParams.set('q', b.dataset.q); location.href = u.toString(); }; });
$('btn-card').onclick = () => showCard();
$('cardview').onclick = (e) => { if (e.target.id === 'cardview') $('cardview').classList.add('hidden'); };
function showCard() {
  const el = $('saju-card');
  if (!me.saju) { el.innerHTML = '<h2>📜 내 사주</h2><p class="muted">사주 없이 구경 중이에요.<br>새로고침 후 생년월일을 넣어보세요.</p>'; $('cardview').classList.remove('hidden'); return; }
  const s = me.saju, f = todayFortune(s), P = s.pillars;
  const col = (lab, p) => `<div><div class="lab">${lab}</div><div class="h">${p ? p.h.split('').join('<br>') : '?<br>?'}</div><div class="lab">${p ? p.ko : '모름'}</div></div>`;
  const max = Math.max(...Object.values(s.count), 1);
  const bars = Object.keys(s.count).map((k) => `<div class="bar"><span>${ELEMENTS[k].name}</span><i style="width:${(s.count[k] / max) * 100}%;background:${ELEMENTS[k].color}"></i><b>${s.count[k]}</b></div>`).join('');
  el.innerHTML = `<div class="kicker">오늘 밤의 사주 카드 · ${me.name}</div><div class="pillars">${col('시', P.hour)}${col('일', P.day)}${col('월', P.month)}${col('년', P.year)}</div>
  <p>나를 뜻하는 글자 <b>${s.dayMaster.stem}</b> — ${s.dayMaster.desc}</p><div class="bars">${bars}</div>
  <p class="muted tiny">${s.animal}띠 · 오늘은 ${f.relPlain} · 추천 안주 ${snackFor(s.weak).name}</p><p class="tiny muted">재미로 보는 사주예요 · 바깥을 누르면 닫혀요</p>`;
  $('cardview').classList.remove('hidden');
}

let toastT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 3200); }

// ---------------- 다른 손님 ----------------
const avatars = new Map();
let lastAll = [], lastBots = [], lastChatSlot = -1;
let weatherEl = 'water', weatherT = 0;
function syncAvatars(dt, now, nowSec) {
  const humans = net ? [...net.peers.values()] : [];
  const taken = takenSeats();
  const bots = botGuests(nowSec, humans.length + 1, taken);
  const all = [
    ...humans.map((p) => ({ id: p.id, name: p.name, look: p.look, bot: false, x: p.x, z: p.z, seated: !!p.seat, seatKey: p.seat, wave: (p.waveUntil || 0) > now || (p.wave || 0) > Date.now(), el: p.el, orders: p.orders, carry: p.carry })),
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
      setTable(a.seatKey, a.orders);
    }
    av.update(dt, a, now, camera.position);
  });
  avatars.forEach((av, id) => { if (!seen.has(id)) { av.dispose(); avatars.delete(id); } });
  lastAll = all; lastBots = bots;
  // 비어진 자리의 음식 치우기
  tables.forEach((t, key) => { if (!all.some((a) => a.seated && a.seatKey === key) && key !== me.seatKey) setTable(key, []); });
  // AI 손님 수다 (모두에게 같은 시각)
  const ch = botChatter(nowSec, bots);
  if (ch && ch.slot !== lastChatSlot) {
    lastChatSlot = ch.slot;
    const av = avatars.get(ch.id);
    if (av) { av.say(ch.text, now); if (player && av.group.position.distanceTo(player.pos) < 6) addChat(bots.find((b) => b.id === ch.id)?.name || '손님', ch.text, 'other'); }
  }

  // 오행 날씨 (2초마다)
  weatherT -= dt;
  if (weatherT <= 0) {
    weatherT = 2;
    const els = all.map((a) => a.el);
    if (me.el) els.push(me.el, me.el); // 나의 기운은 조금 더 크게
    const w = mixWeather(els);
    weatherEl = w.el;
    const counts = Object.entries(w.counts).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${ELEMENTS[k].name}${n}`).join(' ');
    $('weather').textContent = theme ? `거리의 기운 ${counts} · 지금은 ✨${theme.title}` : `거리의 기운 ${counts} → ${ELEMENTS[w.el].weather}`;
  }
}

// ---------------- 패널 탭 ----------------
document.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });
function showTab(t) {
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  ['counsel', 'menu', 'chat'].forEach((k) => $(`tab-${k}`).classList.toggle('hidden', k !== t));
  if (t === 'menu') renderMenu();
  if (t === 'chat') { $('chat-dot').classList.add('hidden'); $('chatlog').scrollTop = 1e6; }
}

// ---------------- 메뉴 주문 ----------------
function renderMenu() {
  const rec = me.saju ? SNACK_BY_EL[me.saju.weak] : null;
  const fill = (el, list) => {
    el.innerHTML = '';
    list.forEach((m) => {
      const b = document.createElement('button'); b.type = 'button';
      if (m.id === rec) b.classList.add('rec');
      b.innerHTML = `<span class="e">${m.emoji}</span><span>${m.name}</span><span class="p">${m.price ? m.price.toLocaleString() + '원' : '서비스'}</span>`;
      b.onclick = () => order(m.id);
      el.appendChild(b);
    });
  };
  fill($('menu-drinks'), MENU.drinks); fill($('menu-food'), MENU.food);
  const t = $('my-table');
  if (!me.orders.length) { t.textContent = '아직 주문한 게 없어요'; $('bill').textContent = ''; return; }
  t.innerHTML = me.orders.map((id) => `<span>${MENU_BY_ID[id]?.emoji || '🐟'} ${MENU_BY_ID[id]?.name || '붕어빵'}</span>`).join('');
  $('bill').textContent = `· 합계 ${me.orders.reduce((a, id) => a + (MENU_BY_ID[id]?.price || 0), 0).toLocaleString()}원 (가상)`;
}
const ORDER_LINES = {
  soju: '소주 한 병 나왔어. 첫 잔은 내가 따라줄게.', makgeolli: '막걸리 주전자 나왔어. 흔들어서 마셔.', beer: '생맥 시원하게 한 잔 나왔어.',
  cider: '사이다 나왔어. 술 안 마셔도 여기선 다 손님이야.', tea: '보리차는 서비스야. 따뜻하게 마셔.',
  eomuk: '어묵탕 나왔어. 국물은 리필 돼.', tteok: '떡볶이 나왔어. 좀 맵다.', egg: '계란말이 나왔어. 방금 말았어.',
  jeon: '부추전 나왔어. 바삭할 때 먹어.', tofu: '두부김치 나왔어.', gizzard: '닭똥집 나왔어. 소금 찍어 먹어.', ramen: '포차 라면 나왔어. 불기 전에 먹어.',
};
function order(id) {
  if (!me.seatKey || curStall < 0) return;
  const m = MENU_BY_ID[id];
  const k = kitchenOf(curStall);
  if (k.queue.length >= 4) { toast('주문이 밀렸어요, 조금만 기다려요'); return; }
  k.queue.push({ id, seatKey: me.seatKey });
  addMsg(`🧾 ${m.name} 주문 들어갔어요 — 사장님이 ${DRINK_IDS.has(id) ? '가지러 가요' : '바로 만들어요'}`, 'sys');
  setKitchenStatus(`🧾 주문 ${k.queue.length + (k.job ? 1 : 0)}개 준비 중`);
  toast(`${m.emoji} ${m.name} 주문!`);
}

// ---------------- 옆사람 대화 ----------------
const chatlog = $('chatlog');
const nbHistory = new Map(); // botId -> history
let lastSay = 0;
function mySeatStall() { return me.seatKey ? Number(me.seatKey.split('-')[0]) : -1; }
function addChat(who, text, cls) {
  const d = document.createElement('div'); d.className = `msg ${cls}`;
  const w = document.createElement('span'); w.className = 'who'; w.textContent = who; d.appendChild(w);
  d.appendChild(document.createTextNode(text));
  chatlog.appendChild(d); chatlog.scrollTop = 1e6;
  if (cls !== 'me' && $('tab-chat').classList.contains('hidden') && curStall >= 0) $('chat-dot').classList.remove('hidden');
}
async function sendChat(raw) {
  const text = cleanChat(raw);
  if (!text || !player) return;
  const now = performance.now();
  if (now - lastSay < 1800) { toast('천천히 말해요 😊'); return; }
  lastSay = now;
  player.say(text, now);
  addChat(`나 (${me.name})`, text, 'me');
  net.say(text, mySeatStall());
  // 가까운 AI 손님이 대답 (같은 포차에 앉아 있거나 3m 이내)
  let best = null, bd = 3.5;
  lastBots.forEach((b) => {
    const av = avatars.get(b.id); if (!av) return;
    const sameStall = me.seatKey && b.seatKey && b.seatKey.split('-')[0] === me.seatKey.split('-')[0];
    const d = av.group.position.distanceTo(player.pos) - (sameStall ? 3 : 0);
    if (d < bd) { bd = d; best = b; }
  });
  if (!best) return;
  const bot = best, h = nbHistory.get(bot.id) || [];
  const reply = cleanChat(await neighbor({ bot: { name: bot.name, table: (bot.orders || []).map((id) => MENU_BY_ID[id]?.name).filter(Boolean).join(', ') }, history: h, message: text }));
  h.push({ role: 'user', content: text }, { role: 'assistant', content: reply }); nbHistory.set(bot.id, h.slice(-10));
  setTimeout(() => {
    avatars.get(bot.id)?.say(reply, performance.now());
    addChat(`${bot.name} (AI 손님)`, reply, 'other');
  }, 600);
}
$('chat-form').onsubmit = (e) => { e.preventDefault(); const v = $('chat-q').value.trim(); if (v) { $('chat-q').value = ''; sendChat(v); } };
$('chatbar').onsubmit = (e) => { e.preventDefault(); const v = $('chatbar-q').value.trim(); if (v) { $('chatbar-q').value = ''; sendChat(v); } };
$('btn-chat').onclick = () => { const bar = $('chatbar'); bar.classList.toggle('hidden'); if (!bar.classList.contains('hidden')) $('chatbar-q').focus(); };

// ---------------- 붕어빵 ----------------
const FLAVOR = { pat: '팥 붕어빵', shu: '슈크림 붕어빵', pizza: '피자 붕어빵' };
const bungeoTally = { pat: 0, shu: 0, pizza: 0 };
let nearBungeo = false, bungeoOwner = null;
function buildBungeoOwner() {
  const c = makeCharacter({ skin: '#eec39a', hair: '#e8e1d6', hairStyle: 'short', outfit: '#5c7cfa', apron: '#ffffff', accessory: 'beanie', accessoryColor: '#c92a2a', height: 0.95, eyes: 'line' });
  c.position.set(BUNGEO_POS.x, 0, BUNGEO_POS.z - 0.9); scene.add(c);
  const tag = nameSprite('붕어빵 할아버지', { bg: 'rgba(160,30,30,0.8)', scale: 0.8 }); tag.position.y = 1.95; c.add(tag);
  let bubble = null, until = 0;
  bungeoOwner = {
    c,
    say(text) { if (bubble) c.remove(bubble); bubble = bubbleSprite(text); bubble.position.y = 2.2; c.add(bubble); until = performance.now() + 5000; },
    tick(now) { if (bubble && now > until) { c.remove(bubble); bubble = null; } },
  };
}
$('btn-bungeo').onclick = () => { $('bungeo-tally').textContent = `오늘 거리 투표: 팥붕 ${bungeoTally.pat} : 슈붕 ${bungeoTally.shu} : 피자붕 ${bungeoTally.pizza}`; $('bungeo-menu').classList.remove('hidden'); bungeoOwner?.say('어서 와요~ 갓 구웠어!'); };
$('bungeo-close').onclick = () => $('bungeo-menu').classList.add('hidden');
document.querySelectorAll('[data-flavor]').forEach((b) => { b.onclick = () => buyBungeo(b.dataset.flavor); });
function buyBungeo(flavor) {
  $('bungeo-menu').classList.add('hidden');
  bungeoTally[flavor]++;
  me.carry = 'bungeo'; player.setCarry('bungeo'); net.update(); net.bungeo(flavor);
  const lines = { pat: '팥붕 세 마리! 꼬리부터 먹어요~', shu: '슈붕파구먼! 뜨거우니까 조심해요.', pizza: '피자붕은 요즘 애들이 좋아하더라~' };
  bungeoOwner?.say(lines[flavor]);
  toast(`🐟 ${FLAVOR[flavor]} 3개 · 포차에 앉으면 테이블에 올려둬요`);
}

// ---------------- 사장님 주방: 주문 → 조리 → 서빙 ----------------
const DRINK_IDS = new Set(MENU.drinks.map((m) => m.id));
const COOK_SEC = { eomuk: 4.5, tteok: 5, egg: 5, jeon: 5.5, tofu: 4, gizzard: 5, ramen: 5.5 };
const worldBubbles = [];
function bubbleOn(obj, text, ms = 4500, y = 2.4) {
  if (obj.userData.bubble) { obj.remove(obj.userData.bubble); }
  const b = bubbleSprite(text); b.position.y = y; obj.add(b); obj.userData.bubble = b;
  worldBubbles.push({ obj, b, until: performance.now() + ms });
}
function tickBubbles(now) {
  for (let i = worldBubbles.length - 1; i >= 0; i--) { const w = worldBubbles[i]; if (now > w.until) { w.obj.remove(w.b); if (w.obj.userData.bubble === w.b) w.obj.userData.bubble = null; worldBubbles.splice(i, 1); } }
}
function kitchenOf(i) {
  const st = stallState[i];
  if (!st.k) st.k = { queue: [], job: null, step: 'idle', timer: 0, carry: null, phase: 0, puff: 0 };
  return st.k;
}
function homeOf(i) { return new THREE.Vector3(world.stalls[i].x + 0.6, 0, -2.55); }
function moveCounselor(c, target, dt) {
  const d = new THREE.Vector3().subVectors(target, c.position); d.y = 0;
  const L = d.length();
  if (L < 0.05) { c.position.x = target.x; c.position.z = target.z; return true; }
  const step = Math.min(L, 1.9 * dt);
  c.position.addScaledVector(d.normalize(), step);
  c.rotation.y = Math.atan2(d.x, d.z);
  return false;
}
function updateCounselor(i, dt, now) {
  const st = stallState[i], c = st.counselor; if (!c) return;
  const k = kitchenOf(i), s = world.stalls[i];
  if (st.toasting) return; // 건배 중에는 건배 연출이 제어
  if (!k.job && k.queue.length) {
    k.job = k.queue.shift(); k.step = 'go';
    const drink = DRINK_IDS.has(k.job.id);
    k.spot = drink ? new THREE.Vector3(s.x + 1.1, 0, -4.45) : new THREE.Vector3(s.x - 1.1, 0, -2.85);
    if (curStall === i) setKitchenStatus(`${drink ? '🧊' : '🔥'} ${MENU_BY_ID[k.job.id].name} 준비 중…`);
  }
  let anim = { talk: talking === i };
  if (!k.job) {
    const arrived = moveCounselor(c, homeOf(i), dt);
    if (arrived) c.rotation.y = Math.sin(now / 3000 + i) * 0.25;
    anim = { walking: !arrived, phase: (k.phase += dt * 9), talk: talking === i || (arrived && Math.sin(now / 2000 + i) > 0.7) };
  } else if (k.step === 'go') {
    if (moveCounselor(c, k.spot, dt)) {
      const drink = DRINK_IDS.has(k.job.id);
      k.step = drink ? 'grab' : 'cook'; k.timer = k.resume ?? (drink ? 1.4 : (COOK_SEC[k.job.id] || 4.5)); k.resume = null;
      c.rotation.y = Math.PI;
      if (!drink) bubbleOn(c, `🔥 ${MENU_BY_ID[k.job.id].name} 만드는 중…`, k.timer * 1000);
    }
    anim = { walking: true, phase: (k.phase += dt * 9) };
  } else if (k.step === 'cook' || k.step === 'grab') {
    k.timer -= dt; c.rotation.y = Math.PI;
    anim = k.step === 'cook' ? { cook: true } : { grab: true };
    if (k.step === 'cook' && (k.puff -= dt) <= 0) { k.puff = 0.45; sparkle(new THREE.Vector3(s.x - 1.1, 1.25, -3.4), Math.random() < 0.5 ? '#ff9a3d' : '#ffe08a'); }
    if (k.timer <= 0) {
      k.carry = itemMesh(k.job.id); scene.add(k.carry);
      k.step = 'serve';
      const [, sk] = k.job.seatKey.split('-').map(Number);
      k.spot = new THREE.Vector3(s.x + SEAT_OFFSETS[sk], 0, -2.45);
    }
  } else if (k.step === 'serve') {
    const arrived = moveCounselor(c, k.spot, dt);
    anim = { walking: !arrived, phase: (k.phase += dt * 9), hold: true };
    if (arrived) { c.rotation.y = 0; serveDone(i, k); }
  }
  if (k.carry) { // 두 손 앞에 들고 감
    const f = new THREE.Vector3(Math.sin(c.rotation.y), 0, Math.cos(c.rotation.y));
    k.carry.position.set(c.position.x + f.x * 0.32, 0.82, c.position.z + f.z * 0.32);
  }
  animateCharacter(c, anim, now);
}
function serveDone(i, k) {
  const job = k.job; k.job = null; k.step = 'idle';
  if (k.carry) { scene.remove(k.carry); k.carry = null; }
  const st = stallState[i], m = MENU_BY_ID[job.id];
  if (job.seatKey !== me.seatKey) return; // 그 사이 자리를 떴으면
  me.orders.push(job.id);
  if (me.orders.length > 6) me.orders.shift();
  setTable(me.seatKey, me.orders); net.update();
  let line = ORDER_LINES[job.id] || `${m.name} 나왔어.`;
  if (me.saju && job.id === SNACK_BY_EL[me.saju.weak]) line += ` 약한 ${ELEMENTS[me.saju.weak].name} 기운 채워주는 거라 딱이야.`;
  const text = styleize(line, st.persona);
  st.history.push({ role: 'assistant', content: `(${m.name} 서빙) ${text}` });
  bubbleOn(st.counselor, text, 4500);
  if (curStall === i) { addMsg(`${m.emoji} ${text}`, 'bot'); renderMenu(); }
  talking = i; setTimeout(() => { if (talking === i) talking = -1; }, 1500);
  setKitchenStatus(kitchenOf(i).queue.length ? `🧾 남은 주문 ${kitchenOf(i).queue.length}개` : '');
}
function setKitchenStatus(t) { const el = $('kitchen'); if (!el) return; el.textContent = t; el.classList.toggle('hidden', !t); }

// ---------------- 건배: 잔 들고 짠 ----------------
const toasts = [];
function glassMesh(orders = []) {
  const last = [...orders].reverse().find((id) => DRINK_IDS.has(id)) || 'soju';
  const g = new THREE.Group();
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, ...o });
  if (last === 'beer') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 10), M(0xf0a020, { transparent: true, opacity: 0.9, emissive: 0x804000, emissiveIntensity: 0.3 })); g.add(m); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.03, 10), M(0xffffff)); f.position.y = 0.09; g.add(f); }
  else if (last === 'makgeolli') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.06, 12), M(0xf2c14e, { metalness: 0.6 })); g.add(m); }
  else { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.07, 10), M(last === 'cider' ? 0xd8fff0 : 0xffffff, { transparent: true, opacity: 0.75, emissive: 0xffffff, emissiveIntensity: 0.15 })); g.add(m); }
  return g;
}
function participant(kind, ref) {
  if (kind === 'me') return { kind, char: player.body, host: player.group, orders: me.orders, say: (t) => player.say(t, performance.now()) };
  if (kind === 'counselor') { const st = stallState[ref]; return { kind, char: st.counselor, host: st.counselor, st, orders: ['soju'], say: (t) => bubbleOn(st.counselor, t, 2500) }; }
  const av = avatars.get(ref); if (!av) return null;
  const info = lastAll.find((a) => a.id === ref);
  return { kind, char: av.body, host: av.group, orders: info?.orders || [], say: (t) => av.say(t, performance.now()) };
}
function startToast(a, b) {
  if (!a || !b || !a.char || !b.char) return;
  const now = performance.now();
  [a, b].forEach((p, idx) => {
    const q = idx ? a : b;
    const qp = q.host.getWorldPosition(new THREE.Vector3());
    const arms = p.char.userData.parts.arms;
    const d0 = arms[0].getWorldPosition(new THREE.Vector3()).distanceTo(qp), d1 = arms[1].getWorldPosition(new THREE.Vector3()).distanceTo(qp);
    p.arm = d0 < d1 ? 0 : 1;
    p.glass = glassMesh(p.orders); p.glass.position.set(0, -0.36, 0.06); arms[p.arm].add(p.glass);
    if (p.st) p.st.toasting = true;
  });
  toasts.push({ a, b, t0: now, clinked: false });
}
function tickToasts(now) {
  for (let i = toasts.length - 1; i >= 0; i--) {
    const T = toasts[i], t = (now - T.t0) / 1000;
    const k = t < 0.7 ? t / 0.7 : t < 1.8 ? 1 : Math.max(0, 1 - (t - 1.8) / 0.6);
    [[T.a, T.b], [T.b, T.a]].forEach(([p, q]) => {
      const pp = p.host.getWorldPosition(new THREE.Vector3()), qp = q.host.getWorldPosition(new THREE.Vector3());
      const want = Math.atan2(qp.x - pp.x, qp.z - pp.z);
      if (p.kind === 'counselor') {
        if (!p.from) p.from = p.char.position.clone();
        const front = new THREE.Vector3(qp.x, 0, -2.2);
        const kk = Math.min(1, t / 0.6);
        p.char.position.lerpVectors(p.from, front, t < 1.8 ? kk : 1);
        p.char.rotation.y = Math.atan2(qp.x - p.char.position.x, qp.z - p.char.position.z);
      }
      else { let off = want - p.host.rotation.y; while (off > Math.PI) off -= Math.PI * 2; while (off < -Math.PI) off += Math.PI * 2; p.char.rotation.y = THREE.MathUtils.clamp(off, -1.1, 1.1) * k; }
      const arm = p.char.userData.parts.arms[p.arm];
      arm.rotation.x = -0.6 - 1.25 * k;
      arm.rotation.z = (p.arm ? -0.35 : 0.35) * k;
    });
    if (!T.clinked && t > 0.95) {
      T.clinked = true; clink();
      const m = T.a.glass.getWorldPosition(new THREE.Vector3()).add(T.b.glass.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
      sparkle(m, '#fff3c4'); sparkle(m, '#ffd27a');
      T.a.say('짠! 🍶'); T.b.say('짠!');
    }
    if (t > 2.4) {
      [T.a, T.b].forEach((p) => { p.glass.parent?.remove(p.glass); p.char.userData.parts.arms[p.arm].rotation.z = 0; if (p.kind !== 'counselor') p.char.rotation.y = 0; if (p.st) { p.st.toasting = false; const kq = kitchenOf(p.st.idx); if (kq.job && kq.step !== 'serve') { kq.resume = kq.timer; kq.step = 'go'; } } });
      toasts.splice(i, 1);
    }
  }
}
// 건배 상대 고르기
function openCheersPick() {
  const box = $('cheers-pick'); box.innerHTML = '';
  const add = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = () => { box.classList.add('hidden'); fn(); }; box.appendChild(b); };
  add(`🧑‍🍳 ${stallState[curStall].persona.name}`, () => cheersWith('counselor'));
  const mine = mySeatStall();
  lastAll.filter((a) => a.seated && a.seatKey && Number(a.seatKey.split('-')[0]) === mine)
    .sort((a, b) => Math.abs(a.x - player.pos.x) - Math.abs(b.x - player.pos.x)).slice(0, 4)
    .forEach((a) => add(`🍶 ${a.name}${a.bot ? '' : ' (손님)'}`, () => cheersWith(a.id)));
  if (box.children.length === 1) { const p = document.createElement('div'); p.className = 'muted tiny'; p.textContent = '옆자리가 비었어요'; box.appendChild(p); }
  box.classList.toggle('hidden');
}
function cheersWith(target) {
  if (curStall < 0) return;
  const b = target === 'counselor' ? participant('counselor', curStall) : participant('avatar', target);
  startToast(participant('me'), b);
  net.cheers(curStall, target);
}

// ---------------- 거리 생활감 · 버스킹 · 연극 · 테마 ----------------
const street = buildStreet(scene, { high: HIGH });
let theme = null; // { ...theme, at, by, until }
let lastRush = -1, honkT = 0, bumpT = 0;
const showModal = (id) => $(id).classList.remove('hidden');
document.querySelectorAll('.close-modal').forEach((b) => { b.onclick = () => b.closest('.overlay').classList.add('hidden'); });

// --- 테마 (프롬프트로 거리 바꾸기)
const THEME_SEC = 180;
let lastThemeAt = 0;
$('btn-theme').onclick = () => {
  const c = $('theme-chips'); c.innerHTML = '';
  ['캠퍼스 분위기', '한옥 마을 전통 야행', '사이버펑크 미래 도시', '대학로 야시장', '혜화역에 바다가 왔다', '첫눈 오는 크리스마스 이브', '으스스한 할로윈 거리'].forEach((t) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = () => requestTheme(t); c.appendChild(b); });
  showModal('theme-modal'); setTimeout(() => $('theme-q').focus(), 50);
};
$('theme-form').onsubmit = (e) => { e.preventDefault(); const v = $('theme-q').value.trim(); if (v) { $('theme-q').value = ''; requestTheme(v); } };
async function requestTheme(prompt) {
  $('theme-modal').classList.add('hidden');
  if (Date.now() - lastThemeAt < 60000) { toast('거리 바꾸기는 1분에 한 번만 할 수 있어요'); return; }
  lastThemeAt = Date.now();
  toast(`✨ "${prompt}" — 거리를 바꾸는 중…`);
  const t = await makeTheme(prompt);
  const th = { ...t, prompt: cleanChat(prompt).slice(0, 40), at: Date.now(), until: Date.now() + THEME_SEC * 1000, by: me.id, byName: me.name };
  applyTheme(th, true);
  me.theme = th; net.theme(th); net.update();
}
function applyTheme(th, mine = false) {
  if (th && (th.until < Date.now() || (theme && th.at <= theme.at))) return;
  theme = th;
  street.applyTheme(th); world.setCityLook(th);
  if (th) {
    sparkle(new THREE.Vector3(player ? player.pos.x : 0, 3, player ? player.pos.z - 3 : 0), '#ffd27a');
    toast(mine ? `✨ 거리가 "${th.title}"(으)로 바뀌었어요!` : `✨ ${th.byName || '누군가'}님이 거리를 "${th.title}"(으)로 바꿨어요`);
    if (th.busker) bubbleOn(street.busker, th.busker, 5000);
  }
}
function tickTheme() {
  if (theme && Date.now() > theme.until) { theme = null; me.theme = null; street.applyTheme(null); world.setCityLook(null); toast('거리가 원래 모습으로 돌아왔어요'); }
  const pill = $('theme-pill');
  if (theme) { const left = Math.max(0, Math.ceil((theme.until - Date.now()) / 1000)); pill.textContent = `✨ ${theme.title} · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} 남음`; pill.classList.remove('hidden'); }
  else pill.classList.add('hidden');
}

// --- 버스킹
let buskReq = null; // { song, until }
let clapCooldown = 0;
function currentSong(nowSec) {
  if (buskReq && Date.now() < buskReq.until) return SONGS.find((s) => s.id === buskReq.song) || SONGS[0];
  const mood = theme ? theme.mood : { water: 'sad', fire: 'festive', metal: 'snow', wood: 'warm', earth: 'warm' }[weatherEl] || 'warm';
  const pool = SONGS.filter((s) => s.mood === mood);
  return pool[Math.floor(nowSec / 120) % pool.length] || SONGS[0];
}
let lastSongId = '';
$('btn-clap').onclick = () => {
  if (performance.now() < clapCooldown) return; clapCooldown = performance.now() + 1500;
  clap(); player.wave = 1.5; me.wave = Date.now() + 1500; net.clap(); net.update();
  if (Math.random() < 0.5) bubbleOn(street.busker, ['감사합니다~!', '박수 고마워요 🙏', '다음 곡도 들어주세요!'][Math.floor(Math.random() * 3)], 2500);
};
$('btn-request').onclick = () => {
  const l = $('song-list'); l.innerHTML = '';
  SONGS.forEach((s) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = `🎵 ${s.title}`; b.onclick = () => { $('song-modal').classList.add('hidden'); const r = { song: s.id, until: Date.now() + 90000, by: me.name }; buskReq = r; net.busk(r); bubbleOn(street.busker, `신청곡 "${s.title}" 갑니다!`, 4000); }; l.appendChild(b); });
  showModal('song-modal');
};

// --- 즉석 연극
let playBusy = false;
$('btn-ticket').onclick = () => {
  if (street.play) { toast('지금 야외무대에서 공연 중이에요! 공원으로 들어가 보세요'); return; }
  showModal('play-modal'); setTimeout(() => $('play-q').focus(), 50);
};
$('play-form').onsubmit = async (e) => {
  e.preventDefault();
  if (playBusy) return; playBusy = true;
  const topic = $('play-q').value.trim(); $('play-q').value = '';
  $('play-modal').classList.add('hidden');
  bubbleOn(street.barker, '작가님이 대본 쓰는 중이에요! ✍️', 6000);
  toast('🎭 AI 작가가 대본을 쓰는 중…');
  const script = (await makePlay(topic, theme ? theme.title : ELEMENTS[weatherEl]?.weather)) || JSON.parse(JSON.stringify(PLAY_PRESETS[Math.floor(Math.random() * PLAY_PRESETS.length)]));
  const p = { script, startAt: Date.now() + 6000, by: me.name };
  startPlay(p); net.play(p);
  playBusy = false;
};
$('btn-goplay').onclick = () => { if (!player) return; if (player.seat) stand(); player.pos.set(STAGE.x - 1 + Math.random() * 2, 0, STAGE.z + 8.5); player.yaw = 0; player.pitch = 0.25; player.dist = 7; };
const nearStage = () => player && player.pos.distanceTo(new THREE.Vector3(STAGE.x, 0, STAGE.z)) < 26;
function showSub(name, text, narr = false) {
  if (!nearStage()) return;
  const sub = $('subtitle'); sub.innerHTML = '';
  if (narr) { const i = document.createElement('i'); i.textContent = `(해설) ${text}`; sub.appendChild(i); }
  else { const b = document.createElement('b'); b.textContent = `${name}  `; sub.appendChild(b); sub.appendChild(document.createTextNode(text)); }
  sub.classList.remove('hidden');
}
street.theater.bubble = (t) => bubbleSprite(t);
street.theater.onReact = (k) => { if (nearStage() && k === 'clap') clap(0.8); if (nearStage() && k === 'laugh') sfx('laugh'); };
let watchCam = true, lastDragAt = 0;
function startPlay(p) {
  if (street.play) return;
  watchCam = true;
  street.startPlay(p.script, p.startAt, {
    title: (sc) => { if (!nearStage()) return; const tc = $('title-card'); tc.querySelector('b').textContent = `「${sc.title}」`; tc.querySelector('span').textContent = `📍 ${sc.place || '대학로'} · 출연 ${sc.cast.map((c) => c.name).join(', ')}`; tc.classList.remove('hidden'); tc.classList.add('show'); setTimeout(() => { tc.classList.remove('show'); setTimeout(() => tc.classList.add('hidden'), 600); }, 3200); },
    line: (actor, ln, sc) => {
      const dur = Math.min(6.2, Math.max(2.6, 2.0 + String(ln.text).length * 0.075)) * 1000;
      if (ln.who < 0 || !actor) { showSub('', ln.text, true); return; }
      bubbleOn(actor, ln.text, dur);
      showSub(sc.cast[ln.who]?.name || '', ln.text);
    },
    sfx: (k) => { if (nearStage()) sfx(k); },
    curtainCall: (sc) => { if (nearStage()) { showSub('', `「${sc.title}」 — 끝. 배우들이 인사합니다!`, true); clap(); } },
    end: () => { $('subtitle').classList.add('hidden'); if (nearStage()) toast(`👏 「${p.script.title}」 공연 끝! 박수~`); },
  });
  toast(`🎭 ${p.by ? p.by + '님이 연 ' : ''}즉석 연극 「${p.script.title}」 곧 시작! (마로니에 야외무대)`);
  bubbleOn(street.barker, `「${p.script.title}」 곧 시작해요~!`, 5000);
}
// 관람 카메라: 공연 중 무대 근처에 있으면 객석에서 말하는 배우를 비춤 (드래그하면 해제)
const camTmp = new THREE.Vector3(), lookTmp = new THREE.Vector3(STAGE.x, 1.8, STAGE.z - 1.5);
function watchCamera(dt, now) {
  const on = !!(street.play && player && !player.seat && watchCam && nearStage() && now - lastDragAt >= 4000);
  if (player) player.group.visible = !on; // 관람 중엔 내 캐릭터는 객석에 앉은 셈
  if (player && on) player.marker.visible = false;
  const fov = on ? 36 : 55;
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 2); camera.updateProjectionMatrix(); }
  if (!on) return false;
  const sp = street.theater.speakerPos() || new THREE.Vector3(STAGE.x, 1.8, STAGE.z - 1.5);
  camTmp.set(STAGE.x + (sp.x - STAGE.x) * 0.4 + Math.sin(now / 4000) * 0.6, 2.9, STAGE.z + 6.8);
  camera.position.lerp(camTmp, Math.min(1, dt * 1.5));
  lookTmp.lerp(sp, Math.min(1, dt * 2.5));
  camera.lookAt(lookTmp);
  return true;
}
canvas.addEventListener('pointerdown', () => { if (street.play) lastDragAt = performance.now(); });

function tickStreet(dt, now, nowSec) {
  street.update(nowSec, dt, now, player && !player.seat ? player.pos : null);
  tickTheme();
  // 음악: 무대와의 거리에 따라 볼륨
  if (player) {
    const d = player.pos.distanceTo(new THREE.Vector3(STAGE.x, 0, STAGE.z));
    const song = currentSong(nowSec);
    tickMusic(song, THREE.MathUtils.clamp(1 - (d - 6) / 34, 0, 1), !!street.play);
    if (song.id !== lastSongId && d < 30) { lastSongId = song.id; if (!street.play) bubbleOn(street.busker, `🎵 다음 곡: ${song.title}`, 4000); }
    const nearStage = d < 13 && !player.seat;
    $('btn-clap').classList.toggle('hidden', !nearStage);
    $('btn-request').classList.toggle('hidden', !nearStage || !!street.play);
    const nearBooth = !player.seat && Math.hypot(player.pos.x + 1.2, player.pos.z - 8.9) < 2.6;
    $('btn-ticket').classList.toggle('hidden', !nearBooth);
    $('btn-goplay').classList.toggle('hidden', !street.play || d < 20);
    $('btn-photo').classList.toggle('hidden', !inBooth(player.pos.x, player.pos.z) || player.seat || !!(photo && !photo.done));
    // 열차 도착 알림
    if (street.rush >= 0 && street.rush !== lastRush) { lastRush = street.rush; if (Math.abs(player.pos.x - 28) < 35 && player.pos.z > -1) toast('🚇 혜화역에 열차 도착 — 사람들이 쏟아져 나와요'); }
    // 차도에 서 있으면 빵빵
    if (!player.seat && street.nearCar(player.pos.x, player.pos.z) && now > honkT) { honkT = now + 3000; honk(); toast('🚕 빵빵! 차 조심해요'); }
    if (player.bumped === 'person' && now > bumpT) { bumpT = now + 2500; if (Math.random() < 0.5) toast('앗, 죄송합니다! 🙇'); }
  }
}

// ---------------- 사주네컷 포토부스 ----------------
const booth = buildBooth(scene);
const POSES = ['wave', 'cheer', 'grab', 'cheer'];
const POSE_TXT = ['손 흔들기 👋', '만세 🙌', '한 손 번쩍 ☝️', '마지막! 다 같이 🙌'];
let photo = null; // { at, by, shots: [], times: [], done }
function shotTimes(at) { return [at + 3500, at + 6500, at + 9500, at + 12500]; }
$('btn-photo').onclick = () => {
  if (photo && !photo.done) return;
  const p = { at: Date.now() + 600, by: me.name };
  startPhoto(p); net.photo(p);
};
function startPhoto(p) {
  if (photo && !photo.done && Math.abs(photo.at - p.at) < 15000) return;
  photo = { ...p, shots: [], times: shotTimes(p.at), idx: 0, done: false, names: new Set() };
  if (player && inBooth(player.pos.x, player.pos.z)) toast(`📸 ${p.by === me.name ? '' : p.by + '님이 '}사주네컷 촬영 시작! 부스 안에 있으면 같이 찍혀요`);
  else if (player && player.pos.distanceTo(new THREE.Vector3(BOOTH.x, 0, BOOTH.z)) < 20) toast(`📸 ${p.by}님이 사주네컷을 찍어요 — 부스로 들어가면 같이 찍혀요!`);
}
function boothPeople() {
  const list = [];
  if (player && !player.seat && inBooth(player.pos.x, player.pos.z)) list.push({ kind: 'me', name: me.name, body: player.body, group: player.group });
  avatars.forEach((av, id) => { const p = av.group.position; if (inBooth(p.x, p.z)) list.push({ kind: 'av', name: av.name, body: av.body, group: av.group }); });
  return list;
}
function capture() {
  const W = renderer.domElement.width, H = renderer.domElement.height;
  booth.cam.aspect = W / H; booth.cam.updateProjectionMatrix();
  const hidden = [];
  scene.traverse((o) => { if (o.isSprite && o.visible) { hidden.push(o); o.visible = false; } });
  street.peds.forEach((p) => { if (p.char.visible && !inBooth(p.char.position.x, p.char.position.z)) { hidden.push(p.char); p.char.visible = false; } });
  renderer.setRenderTarget(null);
  renderer.render(scene, booth.cam);
  const cw = Math.min(W, H * 4 / 3), ch = cw * 3 / 4;
  const c = document.createElement('canvas'); c.width = 440; c.height = 330;
  c.getContext('2d').drawImage(renderer.domElement, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, 440, 330);
  hidden.forEach((o) => { o.visible = true; });
  return c;
}
function tickPhoto(now) {
  if (!photo || photo.done) return;
  const t = Date.now(), mine = player && inBooth(player.pos.x, player.pos.z);
  const next = photo.times[photo.idx];
  // 카운트다운
  const cd = $('countdown');
  const left = (next - t) / 1000;
  if (mine && left > 0 && left <= 3) { cd.innerHTML = `${Math.ceil(left)}<small>${POSE_TXT[photo.idx]}</small>`; cd.classList.remove('hidden'); }
  else cd.classList.add('hidden');
  // 포즈 (찍기 직전~직후)
  if (left < 1.4 && left > -0.5) {
    boothPeople().forEach((p) => {
      p.group.rotation.y = Math.PI; // 카메라 쪽
      const pose = POSES[photo.idx];
      animateCharacter(p.body, { wave: pose === 'wave', cheer: pose === 'cheer', grab: pose === 'grab' }, now);
      photo.names.add(p.name);
    });
  }
  if (t >= next) {
    if (mine) {
      photo.shots.push(capture());
      const f = $('flash'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 60);
      clink();
    }
    booth.flash.intensity = 25;
    photo.idx++;
    if (photo.idx >= photo.times.length) {
      photo.done = true; cd.classList.add('hidden');
      if (photo.shots.length) {
        const strip = composeStrip(photo.shots, { names: [...photo.names], dominant: me.saju?.dominant });
        const url = strip.toDataURL('image/png');
        $('photo-img').src = url; $('photo-save').href = url;
        setTimeout(() => $('photo-modal').classList.remove('hidden'), 700);
      }
    }
  }
  booth.flash.intensity *= 0.85;
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
    nearBungeo = !player.seat && Math.hypot(player.pos.x - BUNGEO_POS.x, player.pos.z - (BUNGEO_POS.z + 2.2)) < 2.2;
    $('btn-bungeo').classList.toggle('hidden', !nearBungeo || !$('bungeo-menu').classList.contains('hidden'));
    $('btn-chat').classList.toggle('hidden', !!player.seat);
    if (player.walking) { moveT -= dt; if (moveT <= 0) { moveT = 0.12; net.move(player.pos.x, player.pos.z); } }
  }
  syncAvatars(dt, now, nowSec);
  // 상담사 애니메이션
  stallState.forEach((st, i) => updateCounselor(i, dt, now));
  tickToasts(now); tickBubbles(now);
  // 김
  world.stalls.forEach((s) => s.steam.forEach((p) => {
    p.t = (p.t + dt * 0.35) % 1;
    p.s.position.set(s.x - 1.1 + Math.sin(p.t * 6 + s.i) * 0.15, 1.3 + p.t * 1.6, -3.4);
    p.s.scale.setScalar(0.4 + p.t * 0.9); p.s.material.opacity = 0.35 * (1 - p.t);
  }));
  // 붕어빵 김 + 사장님
  world.bungeo.steam.forEach((p) => { p.t = (p.t + dt * 0.4) % 1; p.s.position.set(0.4 + Math.sin(p.t * 5) * 0.1, 1.3 + p.t * 1.2, 0); p.s.scale.setScalar(0.3 + p.t * 0.6); p.s.material.opacity = 0.35 * (1 - p.t); });
  if (bungeoOwner) { animateCharacter(bungeoOwner.c, { talk: Math.sin(now / 1800) > 0.6 }, now); bungeoOwner.tick(now); }
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
  tickStreet(dt, now, nowSec);
  watchCamera(dt, now);
  tickPhoto(now);
  { const f = player ? player.pos : camera.position; world.key.target.position.set(f.x, 0, f.z); world.key.position.set(f.x + 6, 14, f.z + 10); }
  updateWeather(world.weather, world, theme ? themeWeather(theme) : weatherEl, dt, now);
  setRain(world.weather.cur.rain);
  world.streaks.forEach((s, i) => { s.material.opacity = 0.5 + Math.sin(now / 700 + i) * 0.15; });
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 테스트·시연용 핸들
window.__sp = { startPhoto, booth, get photo() { return photo; }, street, requestTheme, startPlay, get theme() { return theme; }, kitchenOf, get lastAll() { return lastAll; }, me, cheersWith, openCheersPick, stallState, order, sendChat, buyBungeo, showTab, get nearBungeo() { return nearBungeo; }, get player() { return player; }, stallState, world, sit, stand, ask, restyle, showCard, get nearSeat() { return nearSeat; }, avatars, relation };
