// 실시간 멀티플레이 (Supabase Realtime: Presence + Broadcast). 채팅 없음.
// 공유: 외형·이름·위치·좌석·오행(대표 기운 하나)·내가 바꾼 포차 스타일. 생년월일은 절대 보내지 않음.
import { createClient } from '@supabase/supabase-js';
import { randomLook, randomName } from './character.js';
import { STALL_COUNT, SEAT_OFFSETS, STALL_X, SEAT_Z } from './scene.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const CAPACITY = 24;
export const ONLINE_CAPABLE = !!(URL && KEY);

export function connect(me, { onPeers, onStatus, onStall, onCheers, onSay, onBungeo }) {
  const peers = new Map();
  let channel = null, alive = true, lastTrack = 0, pending = null, roomNo = 1;
  if (!ONLINE_CAPABLE) { onStatus({ online: false, room: 0 }); return { peers, update() {}, move() {}, stall() {}, cheers() {}, say() {}, bungeo() {}, close() {}, room: () => 0 }; }
  const client = createClient(URL, KEY, { realtime: { params: { eventsPerSecond: 20 } } });

  function join(n) {
    roomNo = n;
    channel = client.channel(`wm2030-pocha-${n}`, { config: { presence: { key: me.id }, broadcast: { self: false } } });
    let checked = false;
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = Object.keys(state);
        if (!checked) {
          checked = true;
          if (ids.length > CAPACITY) {
            const order = ids.map((id) => ({ id, at: state[id][0]?.online_at || 0 })).sort((a, b) => a.at - b.at);
            if (order.findIndex((o) => o.id === me.id) >= CAPACITY) { channel.unsubscribe(); join(n + 1); return; }
          }
        }
        const seen = new Set();
        ids.forEach((id) => {
          if (id === me.id) return;
          const s = state[id][0]; if (!s) return;
          seen.add(id);
          const prev = peers.get(id);
          peers.set(id, { ...s, x: prev && !s.seat ? prev.x : s.x, z: prev && !s.seat ? prev.z : s.z });
          // 포차 스타일은 presence 로도 동기화 (늦게 온 사람도 보이게)
          if (s.stallStyle) onStall?.(s.stallStyle, id);
        });
        [...peers.keys()].forEach((id) => { if (!seen.has(id)) peers.delete(id); });
        onStatus({ online: true, room: n, count: ids.length });
        onPeers(peers);
      })
      .on('broadcast', { event: 'pos' }, ({ payload }) => {
        const p = peers.get(payload.id);
        if (p) { p.x = payload.x; p.z = payload.z; }
      })
      .on('broadcast', { event: 'stall' }, ({ payload }) => onStall?.(payload, payload.by))
      .on('broadcast', { event: 'cheers' }, ({ payload }) => onCheers?.(payload))
      .on('broadcast', { event: 'say' }, ({ payload }) => onSay?.(payload))
      .on('broadcast', { event: 'bungeo' }, ({ payload }) => onBungeo?.(payload))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') { await channel.track({ ...me.public(), online_at: me.joinedAt }); onStatus({ online: true, room: n, count: 1 }); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus({ online: false, room: n });
      });
  }
  join(1);

  return {
    peers,
    room: () => roomNo,
    update() {
      if (!channel || !alive) return;
      const send = () => { lastTrack = Date.now(); pending = null; channel.track({ ...me.public(), online_at: me.joinedAt }); };
      if (Date.now() - lastTrack > 300) send(); else if (!pending) pending = setTimeout(send, 320);
    },
    move(x, z) { channel?.send({ type: 'broadcast', event: 'pos', payload: { id: me.id, x: +x.toFixed(2), z: +z.toFixed(2) } }); },
    stall(style) { channel?.send({ type: 'broadcast', event: 'stall', payload: { ...style, by: me.id } }); },
    say(text, stall) { channel?.send({ type: 'broadcast', event: 'say', payload: { id: me.id, text, stall } }); },
    bungeo(flavor) { channel?.send({ type: 'broadcast', event: 'bungeo', payload: { id: me.id, flavor } }); },
    cheers(stall) { channel?.send({ type: 'broadcast', event: 'cheers', payload: { id: me.id, stall } }); },
    close() { alive = false; channel?.unsubscribe(); },
  };
}

// ---------------- AI 손님 (모든 접속자에게 같은 손님이 같은 자리) ----------------
const h = (n) => { const x = Math.sin(n * 91.7 + 13.3) * 43758.5453; return x - Math.floor(x); };
const EL = ['wood', 'fire', 'earth', 'metal', 'water'];
const DRINKS = ['soju', 'soju', 'makgeolli', 'beer', 'cider'];
const SNACK = { water: 'eomuk', fire: 'tteok', earth: 'egg', wood: 'jeon', metal: 'tofu' };

// AI 손님들끼리의 혼잣말·수다 (모두에게 같은 시각에 같은 말)
const LINES = ['아 오늘 팀플 진짜…', '여기 어묵 국물 미쳤다', '연극 끝나고 오니까 딱 좋네', '내일 1교시인데 큰일이다', '사장님 여기 소주 하나요!', '붕어빵은 팥이지', '아니 슈크림이 근본이지', '마로니에 잎 다 떨어졌네', '오늘 버스킹 노래 좋더라', '사주 보니까 나 올해 水가 필요하대', '퇴근하고 바로 왔어요', '혜화역 막차 몇 시더라', '한 잔만 더 하고 가자', '날씨가 갑자기 추워졌어'];
export function botChatter(nowSec, bots) {
  const slot = Math.floor(nowSec / 14);
  const seated = bots.filter((b) => b.seated || b.carry);
  if (!seated.length || h(slot * 3.1) < 0.35) return null;
  const b = seated[Math.floor(h(slot * 1.7) * seated.length)];
  return { slot, id: b.id, text: LINES[Math.floor(h(slot * 5.3) * LINES.length)] };
}
export function botGuests(nowSec, humanCount, takenSeats) {
  const want = Math.max(0, Math.min(14, 16 - humanCount));
  const bots = [];
  const epoch = Math.floor(nowSec / 240); // 4분마다 손님이 조금씩 바뀜
  for (let i = 0; i < want; i++) {
    const seed = i * 7.7 + Math.floor((epoch + i * 0.37)) * 13.1;
    const stall = Math.floor(h(seed) * STALL_COUNT);
    let k = Math.floor(h(seed + 1) * SEAT_OFFSETS.length);
    let key = `${stall}-${k}`, tries = 0;
    while ((takenSeats.has(key) || bots.some((b) => b.seatKey === key)) && tries < 5) { k = (k + 1) % SEAT_OFFSETS.length; key = `${stall}-${k}`; tries++; }
    if (tries >= 5) continue;
    let r = (() => { let c = 0; return () => h(seed + 2 + c++ * 1.31); })();
    // 몇 명은 거리를 산책 중
    const walking = h(seed + 9) < 0.25;
    const tt = nowSec / 30 + h(seed) * 10;
    bots.push({
      id: `bot-${i}`, bot: true, name: `${randomName(r)}`, look: randomLook(r), el: EL[Math.floor(h(seed + 4) * 5)],
      seatKey: walking ? null : key, seated: !walking,
      x: walking ? Math.sin(tt) * 50 : STALL_X(stall) + SEAT_OFFSETS[k], z: walking ? 4 + Math.sin(tt * 0.7) * 3 : SEAT_Z + 0.08,
      wave: false, talk: !walking && Math.sin(nowSec / 3 + i) > 0.6,
      orders: walking ? [] : [DRINKS[Math.floor(h(seed + 6) * DRINKS.length)], SNACK[EL[Math.floor(h(seed + 4) * 5)]]].slice(0, 1 + Math.floor(((nowSec / 40 + h(seed) * 9) % 3))),
      carry: walking && h(seed + 11) > 0.5 ? 'bungeo' : null,
    });
  }
  return bots;
}

// 오행 날씨: 거리에 있는 사람들의 대표 기운 중 가장 많은 것
export function mixWeather(list) {
  const c = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  list.forEach((e) => { if (c[e] !== undefined) c[e]++; });
  const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  return { el: top[1] ? top[0] : 'water', counts: c };
}
