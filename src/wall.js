// 마로니에 고민 벽: 익명 포스트잇 + 공감 + 사장님 답글 (Supabase 표 `worries`에 저장)
import * as THREE from 'three';
import { createClient } from '@supabase/supabase-js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sb = URL_ && KEY ? createClient(URL_, KEY) : null;
export const WALL = { x: 12, z: -3.1 };
export const EL_COLOR = { wood: '#b2f2bb', fire: '#ffc9a8', earth: '#ffec99', metal: '#e9ecef', water: '#a5d8ff' };
const FONT = '"Pretendard Variable","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';

// 연결이 안 될 때 보여줄 예시 고민
const SEEDS = [
  ['취준 1년째… 친구들은 다 붙었는데 나만 제자리 같아요', 'water', 12, 5, 3, '욕쟁이 할매', '제자리 같아도 뿌리는 내리고 있는 거여. 오늘은 국물 한 그릇 먹고 푹 자.'],
  ['룸메랑 말 안 한 지 일주일째예요. 먼저 말 걸기가 너무 어려워요', 'metal', 8, 4, 1, null, null],
  ['졸업 전시가 두 달 남았는데 아이디어가 하나도 없어요', 'fire', 6, 2, 9, '반짝이 사장', '두 달이면 완전 충분해요! 오늘은 좋아하는 거 세 개만 적어봐요.'],
  ['부모님께 휴학하고 싶다고 어떻게 말하죠', 'earth', 10, 7, 2, null, null],
  ['짝사랑 3년차… 이제 그만 접어야 할까요', 'wood', 15, 6, 4, '달빛 보살', '접을지 말지는… 마음이 이미 알고 있어요. 그 마음에 귀 기울여 봐요.'],
  ['요즘 이유 없이 너무 지쳐요. 쉬어도 안 쉰 것 같아요', 'water', 21, 14, 3, '산사 스님', '허허, 몸보다 마음이 먼저 쉬고 싶은가 봅니다. 오늘은 휴대폰을 일찍 내려놓아 보시지요.'],
  ['팀플에서 나만 일하는 것 같아서 억울해요', 'fire', 18, 3, 8, null, null],
  ['서울 올라온 지 반년, 아직도 친구가 없어요', 'metal', 9, 11, 2, '김팀장', '야 나도 그랬어. 동아리든 포차든 일단 자주 가는 데를 만들어.'],
  ['편입 준비 중인데 확신이 안 서요', 'earth', 7, 4, 6, null, null],
  ['알바하면서 공부하니까 시간이 너무 없어요', 'wood', 11, 5, 7, null, null],
  ['좋아하는 일과 잘하는 일 중에 뭘 골라야 할까요', 'fire', 13, 2, 5, '훈장 선비', '잘하는 일로 먹고살고 좋아하는 일로 숨 쉬는 것도 방법이오.'],
  ['내일 면접인데 잠이 안 와요', 'water', 5, 9, 12, '부산 김사장', '마, 걱정 말고 자라. 니는 이미 준비 다 했다.'],
];
function seedRows() {
  return SEEDS.map((r, i) => ({ id: -1 - i, text: r[0], el: r[1], cheers: r[2], hugs: r[3], fires: r[4], reply_by: r[5], reply: r[6], created_at: new Date(Date.now() - (i + 1) * 3600e3 * 3).toISOString(), seed: true }));
}

export function createWall(scene, { onChange } = {}) {
  let rows = seedRows(), online = false, chan = null;
  const ls = { get: (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } } };
  const mine = new Set(ls.get('pocha-my-worries'));
  const reacted = new Set(ls.get('pocha-reacted'));
  const lastCounts = new Map();

  // ---- 3D 게시판 ----
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.8 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.7, 0.14), wood); frame.position.y = 1.65; frame.castShadow = true; g.add(frame);
  [-2.3, 2.3].forEach((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.14), wood); p.position.set(x, 1.6, -0.02); g.add(p); });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 0.6), wood); roof.position.set(0, 3.15, 0.1); roof.rotation.x = 0.15; g.add(roof);
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 560;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 2.57), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.28 }));
  board.position.set(0, 1.65, 0.08); g.add(board);
  const lamp = new THREE.PointLight(0xffe2b0, 4, 6, 1.5); lamp.position.set(0, 3.0, 1.0); g.add(lamp);
  g.position.set(WALL.x, 0, WALL.z); scene.add(g);

  function wrap(ctx, text, maxW, maxLines) {
    const lines = []; let line = '';
    for (const ch of text) { if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; if (lines.length === maxLines) break; } else line += ch; }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines && lines.join('').length < text.length) lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
    return lines;
  }
  function draw() {
    const c = cv.getContext('2d'), W = cv.width, H = cv.height;
    // 코르크판
    c.fillStyle = '#b98a57'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 1600; i++) { c.fillStyle = `rgba(${90 + Math.random() * 60},${60 + Math.random() * 40},30,0.25)`; c.fillRect(Math.random() * W, Math.random() * H, 3, 3); }
    c.fillStyle = '#3a2416'; c.fillRect(0, 0, W, 64);
    c.fillStyle = '#ffe8c4'; c.font = `900 34px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText('📝 마로니에 고민 벽', 24, 33);
    c.font = `600 20px ${FONT}`; c.fillStyle = 'rgba(255,232,196,0.75)'; c.textAlign = 'right'; c.fillText('익명으로 남기고 서로 공감해요', W - 24, 34);
    const cols = 6, cw = 158, chh = 150, gx = 14, gy = 78;
    rows.slice(0, 18).forEach((r, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = gx + col * (cw + 10), y = gy + row * (chh + 12);
      c.save(); c.translate(x + cw / 2, y + chh / 2); c.rotate(((i * 37) % 7 - 3) * 0.012);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-cw / 2 + 4, -chh / 2 + 5, cw, chh);
      c.fillStyle = EL_COLOR[r.el] || '#fff3bf'; c.fillRect(-cw / 2, -chh / 2, cw, chh);
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(-28, -chh / 2 - 6, 56, 16); // 테이프
      c.fillStyle = '#2a2233'; c.font = `600 17px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'top';
      wrap(c, r.text, cw - 18, 5).forEach((l, k) => c.fillText(l, -cw / 2 + 9, -chh / 2 + 12 + k * 21));
      const total = (r.cheers || 0) + (r.hugs || 0) + (r.fires || 0);
      if (total) { c.font = `700 15px ${FONT}`; c.fillStyle = '#7a3b10'; c.textAlign = 'right'; c.fillText(`🍶${total}`, cw / 2 - 8, chh / 2 - 22); }
      if (r.reply) { c.fillStyle = '#c92a2a'; c.beginPath(); c.arc(-cw / 2 + 16, chh / 2 - 14, 8, 0, 7); c.fill(); }
      c.restore();
    });
    tex.needsUpdate = true;
  }
  draw();

  async function load() {
    if (!sb) return;
    const { data, error } = await sb.from('worries').select('*').eq('hidden', false).order('created_at', { ascending: false }).limit(40);
    if (error) { online = false; return; }
    online = true;
    rows = data.length ? data : [];
    if (rows.length < 6) rows = rows.concat(seedRows().slice(0, 6 - rows.length));
    data.forEach((r) => lastCounts.set(r.id, (r.cheers || 0) + (r.hugs || 0) + (r.fires || 0)));
    draw(); onChange?.();
  }
  function subscribe() {
    if (!sb || chan) return;
    chan = sb.channel('worries-feed').on('postgres_changes', { event: '*', schema: 'public', table: 'worries' }, (p) => {
      const r = p.new;
      if (!r || !r.id) return;
      if (r.hidden) rows = rows.filter((x) => x.id !== r.id);
      else {
        const i = rows.findIndex((x) => x.id === r.id);
        if (i >= 0) rows[i] = r; else rows.unshift(r);
      }
      if (mine.has(r.id)) {
        const tot = (r.cheers || 0) + (r.hugs || 0) + (r.fires || 0);
        if (tot > (lastCounts.get(r.id) || 0)) W.onMyCheer?.(r);
        lastCounts.set(r.id, tot);
      }
      draw(); onChange?.();
    }).subscribe();
  }
  load().then(subscribe);
  setInterval(load, 90000);

  const W = {
    group: g,
    get rows() { return rows; },
    get online() { return online; },
    isMine: (id) => mine.has(id),
    hasReacted: (id, k) => reacted.has(`${id}:${k}`),
    reload: load,
    async add(text, el, reply, replyBy) {
      const row = { text, el, reply, reply_by: replyBy };
      if (online) {
        const { data, error } = await sb.from('worries').insert(row).select().single();
        if (!error && data) { mine.add(data.id); ls.set('pocha-my-worries', [...mine].slice(-30)); lastCounts.set(data.id, 0); if (!rows.some((x) => x.id === data.id)) rows.unshift(data); draw(); onChange?.(); return data; }
      }
      const local = { ...row, id: Date.now(), cheers: 0, hugs: 0, fires: 0, created_at: new Date().toISOString(), local: true };
      rows.unshift(local); draw(); onChange?.(); return local;
    },
    async react(r, kind) {
      const key = `${r.id}:${kind}`; if (reacted.has(key)) return false;
      reacted.add(key); ls.set('pocha-reacted', [...reacted].slice(-300));
      const col = { cheer: 'cheers', hug: 'hugs', fire: 'fires' }[kind];
      r[col] = (r[col] || 0) + 1; draw(); onChange?.();
      if (online && r.id > 0 && !r.local) await sb.rpc('react_worry', { wid: r.id, kind });
      return true;
    },
    async report(r) {
      rows = rows.filter((x) => x !== r); draw(); onChange?.();
      if (online && r.id > 0 && !r.local) await sb.rpc('report_worry', { wid: r.id });
    },
  };
  return W;
}

// 개인정보·위기 신호 검사
const CRISIS = /(죽고\s*싶|자살|자해|목숨|사라지고\s*싶|끝내고\s*싶|살기\s*싫)/;
const PII = /(\d{2,3}[-\s.]?\d{3,4}[-\s.]?\d{4})|([\w.+-]+@[\w-]+\.[\w.]+)|(카톡\s*(아이디|id)|오픈채팅|@[a-z0-9_.]{3,})/i;
export function checkWorry(t) {
  if (CRISIS.test(t)) return 'crisis';
  if (PII.test(t)) return 'pii';
  return 'ok';
}
