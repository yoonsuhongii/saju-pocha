// 거리의 생활감: 행인·택시·배달 오토바이·혜화역 인파 / 버스커 / 소극장 호객꾼 / 즉석 연극 배우 / 테마 장식
// 모든 움직임은 공유 시계(Date.now)로 계산 → 접속한 모두에게 같은 장면이 보임
import * as THREE from 'three';
import { makeCharacter, animateCharacter, nameSprite, randomLook } from './character.js';
import { STAGE } from './scene.js';
import { createTheater, PLAY_PRESETS } from './theater.js';
export { PLAY_PRESETS };

const h = (n) => { const x = Math.sin(n * 91.7 + 13.3) * 43758.5453; return x - Math.floor(x); };
const mod = (a, n) => ((a % n) + n) % n;
const seeded = (s) => { let c = 0; return () => h(s + c++ * 1.37); };
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
const FONT = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
function textTex(w, hh, draw) { const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d'), w, hh); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

// ---------------- 차량 ----------------
function taxi() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 1.6), std(0xff8c1a, { roughness: 0.35, metalness: 0.3 })); body.position.y = 0.6; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 1.45), std(0x22262e, { roughness: 0.1, metalness: 0.5 })); cabin.position.set(-0.15, 1.2, 0); g.add(cabin);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.25), new THREE.MeshBasicMaterial({ color: 0xfff3c4, toneMapped: false })); sign.position.set(-0.15, 1.57, 0); g.add(sign);
  [[1.1, 0.75], [-1.1, 0.75], [1.1, -0.75], [-1.1, -0.75]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 12), std(0x111111)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.33, z); g.add(w); });
  [0.5, -0.5].forEach((z) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6d8, toneMapped: false })); l.position.set(1.82, 0.65, z); g.add(l); const r = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030, toneMapped: false })); r.position.set(-1.82, 0.65, z); g.add(r); });
  return g;
}
function scooter() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 0.4), std(0xf1f3f5)); body.position.y = 0.55; g.add(body);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), std(0x2f9e44)); box.position.set(-0.45, 1.0, 0); g.add(box);
  [0.55, -0.5].forEach((x) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 10), std(0x111111)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.25, 0); g.add(w); });
  const rider = makeCharacter({ skin: '#e8b48a', hair: '#1a1a1a', hairStyle: 'short', outfit: '#2f9e44', apron: null, accessory: 'hat', accessoryColor: '#ffffff', height: 1, eyes: 'dot' });
  rider.position.set(0.05, 0.35, 0); rider.rotation.y = Math.PI / 2; rider.userData.parts.legs.forEach((l) => { l.rotation.x = -1.2; }); rider.userData.parts.arms.forEach((a) => { a.rotation.x = -1.2; }); g.add(rider);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6d8, toneMapped: false })); lamp.position.set(0.7, 0.8, 0); g.add(lamp);
  return g;
}

export function buildStreet(scene, { high = true } = {}) {
  // ---------- 행인 ----------
  const N = high ? 18 : 10;
  const LANES = [9.6, 9.6, 1.1, 10.1, 1.5];
  const peds = [];
  for (let i = 0; i < N; i++) {
    const r = seeded(i * 11.3 + 5);
    const p = { lane: LANES[i % LANES.length] + (h(i * 2.2) - 0.5) * 0.3, dir: h(i * 3.3) < 0.5 ? 1 : -1, speed: 1.0 + h(i * 4.4) * 0.7, off: h(i * 5.5) * 130, look: randomLook(r), char: null };
    p.char = makeCharacter(p.look); scene.add(p.char); peds.push(p);
  }
  // ---------- 혜화역 인파 ----------
  const rush = [];
  for (let j = 0; j < (high ? 12 : 8); j++) { const c = makeCharacter(randomLook(seeded(j * 7.7 + 99))); c.visible = false; scene.add(c); rush.push(c); }
  // ---------- 차 ----------
  const cars = [];
  for (let i = 0; i < 5; i++) {
    const isBike = i >= 3;
    const m = isBike ? scooter() : taxi();
    const c = { isBike, mesh: m, lane: i % 2 ? 6.9 : 4.1, dir: i % 2 ? -1 : 1, speed: isBike ? 9 + i : 6.5 + h(i) * 2.5, off: h(i * 9.1) * 200 };
    m.rotation.y = c.dir > 0 ? 0 : Math.PI; scene.add(m); cars.push(c);
  }
  // ---------- 버스커 ----------
  const busker = makeCharacter({ skin: '#f2c9a0', hair: '#5a3a22', hairStyle: 'long', outfit: '#364fc7', apron: null, accessory: 'beanie', accessoryColor: '#ffd43b', height: 1.02, eyes: 'line' });
  const guitar = new THREE.Group();
  const gb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), std(0xb5651d, { roughness: 0.4 })); gb.scale.set(1, 1.2, 0.35); guitar.add(gb);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.03), std(0x5a3a22)); neck.position.set(0, 0.35, 0); guitar.add(neck);
  guitar.position.set(0.05, 0.62, 0.2); guitar.rotation.z = 1.1; busker.add(guitar);
  busker.position.set(STAGE.x, 0.6, STAGE.z - 1.2); scene.add(busker);
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 6), std(0x222222, { metalness: 0.7 })); mic.position.set(STAGE.x + 0.5, 1.3, STAGE.z - 0.7); scene.add(mic);
  const amp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.35), std(0x1a1a1a)); amp.position.set(STAGE.x - 1, 0.85, STAGE.z - 1.6); scene.add(amp);
  const btag = nameSprite('버스커 · 야외무대', { bg: 'rgba(40,60,160,0.8)', scale: 0.85 }); btag.position.y = 1.95; busker.add(btag);
  // ---------- 소극장 호객꾼 ----------
  const barker = makeCharacter({ skin: '#ffe0c7', hair: '#1a1a1a', hairStyle: 'ponytail', outfit: '#e03131', apron: null, accessory: 'hat', accessoryColor: '#212529', height: 0.98, eyes: 'dot' });
  barker.position.set(-2, 0, 9.7); barker.rotation.y = Math.PI; scene.add(barker);
  const ttag = nameSprite('🎭 소극장 호객 알바', { bg: 'rgba(160,30,60,0.8)', scale: 0.85 }); ttag.position.y = 1.95; barker.add(ttag);
  const booth = new THREE.Group();
  const tb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.6), std(0x6b2c1f)); tb.position.y = 0.4; booth.add(tb);
  const bs = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshBasicMaterial({ map: textTex(256, 160, (g) => { g.fillStyle = '#fff4dc'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#c2255c'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.fillText('즉석 연극', 128, 58); g.fillStyle = '#333'; g.font = `700 26px ${FONT}`; g.fillText('오늘 밤 · 무료', 128, 100); g.fillText('야외무대 상연', 128, 136); }), toneMapped: false }));
  bs.position.set(0, 1.25, -0.31); bs.rotation.y = Math.PI; booth.add(bs);
  booth.position.set(-0.6, 0, 9.9); scene.add(booth);
  // ---------- 연극 배우 ----------
  const theater = createTheater(scene, { high, busker });
  // ---------- 테마 장식 + 현수막 ----------
  const decor = new THREE.Group(); scene.add(decor);
  const bannerCanvas = document.createElement('canvas'); bannerCanvas.width = 1024; bannerCanvas.height = 128;
  const bannerTex = new THREE.CanvasTexture(bannerCanvas); bannerTex.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.5), new THREE.MeshBasicMaterial({ map: bannerTex, toneMapped: false, side: THREE.DoubleSide }));
  banner.position.set(0, 4.6, -0.6); banner.visible = false; scene.add(banner);
  const bPoles = [-6.2, 6.2].map((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5.2, 6), std(0x777777, { metalness: 0.6 })); p.position.set(x, 2.6, -0.6); p.visible = false; scene.add(p); return p; });

  let pedPalette = null;
  const S = {
    peds, cars, busker, barker, theater,
    get play() { return theater.play; },
    rushId: -1,
    update(nowSec, dt, now, me) {
      // 행인
      peds.forEach((p, i) => {
        const x = -65 + mod(p.off + p.dir * p.speed * nowSec, 130);
        // 내 앞을 지나갈 땐 옆으로 비켜 감
        let want = 0;
        if (me && Math.abs(x - me.x) < 1.8 && Math.abs(p.lane - me.z) < 1.1) want = p.lane >= me.z ? 1.0 : -1.0;
        p.dodge = (p.dodge || 0) + (want - (p.dodge || 0)) * Math.min(1, dt * 4);
        p.char.position.set(x, 0, p.lane + p.dodge);
        p.char.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        animateCharacter(p.char, { walking: true, phase: nowSec * p.speed * 6 + i, talk: i % 4 === 0 }, now);
      });
      // 차
      cars.forEach((c) => {
        // 앞에 내가 서 있으면 멈춰 섬 (내 화면에서만)
        const cx = c.mesh.position.x;
        const ahead = me ? c.dir * (me.x - cx) : -1;
        c.braking = !!(me && Math.abs(me.z - c.lane) < 1.4 && ahead > 0 && ahead < (c.isBike ? 3 : 4.6));
        // 앞차가 서 있으면 뒤차도 줄 서서 멈춤
        if (!c.braking) c.braking = cars.some((o) => o !== c && o.lane === c.lane && o.braking && c.dir * (o.mesh.position.x - cx) > 0 && c.dir * (o.mesh.position.x - cx) < 5.5);
        if (c.braking && c.lastT) c.delay = (c.delay || 0) + (nowSec - c.lastT);
        c.lastT = nowSec;
        c.mesh.position.set(-100 + mod(c.off + c.dir * c.speed * (nowSec - (c.delay || 0)), 200), 0, c.lane);
      });
      // 혜화역 인파: 2분마다 열차 도착
      const T = Math.floor(nowSec / 120), te = nowSec - T * 120;
      let rushActive = false;
      rush.forEach((c, j) => {
        const d = te - j * 0.9;
        if (d < 0 || te > 40) { c.visible = false; return; }
        c.visible = true; rushActive = true;
        const dir = j % 2 ? 1 : -1;
        if (d < 1.8) { const k = d / 1.8; c.position.set(28 + ((j % 3) - 1) * 0.7, -0.6 + k * 0.6, 11.6 - k * 1.9); c.rotation.y = Math.PI; }
        else { const x = 28 + dir * (d - 1.8) * (1.3 + (j % 3) * 0.2); c.position.set(x, 0, 9.4 + (j % 2) * 0.5); c.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; if (Math.abs(x - 28) > 45) c.visible = false; }
        animateCharacter(c, { walking: true, phase: d * 8 + j }, now);
      });
      S.rush = rushActive ? T : -1;
      // 버스커 (연극 중에는 무대 옆으로 비켜남)
      const aside = !!S.play;
      busker.position.x += ((aside ? STAGE.x + 4.5 : STAGE.x) - busker.position.x) * Math.min(1, dt * 2);
      animateCharacter(busker, { cook: !aside, talk: !aside }, now);
      busker.visible = !aside;
      busker.rotation.y = aside ? -0.6 : Math.sin(now / 1500) * 0.15;
      animateCharacter(barker, { wave: Math.sin(now / 900) > 0.4, talk: true }, now);
      barker.rotation.y = Math.PI + Math.sin(now / 1300) * 0.3;
      // 연극
      theater.update(Date.now(), now, dt);
    },
    nearCar(x, z) { return cars.some((c) => c.braking || (Math.abs(c.mesh.position.x - x) < 2.6 && Math.abs(c.lane - z) < 1.2)); },
    carBoxes() { return cars.map((c) => ({ x: c.mesh.position.x, z: c.lane, hx: c.isBike ? 0.8 : 1.85, hz: c.isBike ? 0.35 : 0.85 })); },
    colliders() {
      const out = [];
      peds.forEach((p) => out.push({ x: p.char.position.x, z: p.char.position.z, r: 0.3, kind: 'person' }));
      rush.forEach((c) => { if (c.visible) out.push({ x: c.position.x, z: c.position.z, r: 0.3, kind: 'person' }); });
      out.push({ x: barker.position.x, z: barker.position.z, r: 0.35, kind: 'person' }, { x: -0.6, z: 9.9, r: 0.8 });
      return out;
    },

    // ---------- 연극 ----------
    startPlay(script, startAt, hooks) { theater.start(script, startAt, hooks); },

    // ---------- 테마 ----------
    applyTheme(th) {
      while (decor.children.length) decor.remove(decor.children[0]);
      banner.visible = bPoles[0].visible = bPoles[1].visible = !!th;
      if (!th) { S.setPalette(null); return; }
      // 현수막
      const g = bannerCanvas.getContext('2d');
      g.fillStyle = th.bannerBg || '#c92a2a'; g.fillRect(0, 0, 1024, 128);
      g.fillStyle = '#fff'; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      let size = 64; while (g.measureText(th.banner).width > 980 && size > 28) { size -= 4; g.font = `900 ${size}px ${FONT}`; }
      g.fillText(th.banner || th.title, 512, 68); bannerTex.needsUpdate = true;
      // 장식
      const add = (m, x, y, z) => { m.position.set(x, y, z); decor.add(m); return m; };
      const glow = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8, roughness: 0.5 });
      for (let x = -54; x <= 54; x += 9) {
        const z = 8.6;
        switch (th.decor) {
          case 'snowmen': { const a = add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), std(0xffffff)), x, 0.45, z); add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), std(0xffffff)), x, 1.1, z); add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 6), std(0xff8c1a)), x, 1.12, z - 0.32).rotation.x = -Math.PI / 2; void a; break; }
          case 'pumpkins': { const p = add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), glow(0xff7b00)), x, 0.35, z); p.scale.set(1.2, 0.85, 1.2); add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 5), std(0x2f5a2a)), x, 0.78, z); add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), glow(0xff7b00)), x + 4.5, 0.26, 0.9); break; }
          case 'xmas': { add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.4, 8), std(0x1b6e3a, { flatShading: true })), x, 1.3, z); for (let k = 0; k < 8; k++) add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), glow([0xff3b3b, 0xffd43b, 0x4dabf7][k % 3])), x + Math.cos(k * 2.1) * (0.7 - k * 0.07), 0.5 + k * 0.25, z + Math.sin(k * 2.1) * (0.7 - k * 0.07)); add(new THREE.Mesh(new THREE.OctahedronGeometry(0.2), glow(0xffe066)), x, 2.65, z); break; }
          case 'lanterns': { for (let k = 0; k < 3; k++) { const l = add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 10), glow([0xe03131, 0xff922b, 0xfcc419][(k + x) % 3 < 0 ? 0 : (k + Math.abs(x)) % 3])), x + k * 3, 3.0, -1.3); l.scale.set(1, 1, 1); } break; }
          case 'flowers': { for (let k = 0; k < 5; k++) add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), glow([0xffa8c5, 0xff8fab, 0xfff0f6][k % 3])), x + (k - 2) * 0.4, 0.3 + (k % 2) * 0.2, z); add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.3, 10), std(0x8a5a35)), x, 0.15, z); break; }
          case 'balloons': { for (let k = 0; k < 3; k++) { const bx = x + k * 0.5, by = 2.6 + k * 0.4; add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), glow([0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c][(k + Math.abs(x)) % 4])), bx, by, z).scale.set(1, 1.2, 1); add(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, by, 3), std(0xffffff)), bx, by / 2, z); } break; }
          default: break;
        }
      }
      // ---------- 테마 세트: 공원 입구 게이트 + 포차 사이 부스 + 공원 뒤 배경 ----------
      const set = th.set || 'none';
      if (set !== 'none') {
        const signPlane = (text, w, hh, bg, fg) => new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ toneMapped: false, map: textTex(512, Math.round(512 * hh / w), (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; let sz = Math.floor(H * 0.6); g.font = `900 ${sz}px ${FONT}`; while (g.measureText(text).width > W * 0.92 && sz > 14) { sz -= 2; g.font = `900 ${sz}px ${FONT}`; } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 2); }) }));
        const S2 = {
          campus: { pillar: 0xd8d2c4, beam: 0x7a1f2b, sign: ['#7a1f2b', '#fff'], tent: 0x1c4e9c },
          hanok: { pillar: 0xb02a2a, beam: 0x2b2b30, sign: ['#2b2b30', '#ffe8b0'], tent: 0x8a5a35 },
          cyber: { pillar: 0x14142a, beam: 0x00e5ff, sign: ['#0a0a1a', '#ff3df0'], tent: 0x3b1a6b },
          market: { pillar: 0x6b4a2b, beam: 0xd9480f, sign: ['#d9480f', '#fff'], tent: 0xe8590c },
          beach: { pillar: 0xc9a46b, beam: 0x1c7ed6, sign: ['#1c7ed6', '#fff'], tent: 0x15aabf },
          forest: { pillar: 0x5a3a22, beam: 0x2b8a3e, sign: ['#2b5a2a', '#fff'], tent: 0x2f9e44 },
          festival: { pillar: 0xf08c00, beam: 0xe64980, sign: ['#e64980', '#fff'], tent: 0xf76707 },
        }[set] || { pillar: 0xdddddd, beam: 0x444444, sign: ['#333', '#fff'], tent: 0x777777 };
        // 게이트 (공원 입구, 거리에서 정면으로 보임)
        [-3.4, 3.4].forEach((x) => add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.8, 0.5), std(S2.pillar)), x, 2.4, -6.6));
        const beam = add(new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.5, 0.7), set === 'cyber' ? glow(S2.beam) : std(S2.beam)), 0, 4.9, -6.6);
        if (set === 'hanok') { const roof = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.1, 9.6, 4, 1), std(0x2b2b30, { flatShading: true })), 0, 5.6, -6.6); roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.6); }
        void beam;
        add(signPlane(th.gate || th.title, 6.4, 0.9, S2.sign[0], S2.sign[1]), 0, 4.2, -6.3);
        // 부스 (포차 사이 빈칸, 거리를 향함)
        const booths = th.booths?.length ? th.booths : [th.title];
        [-36, -12, 12, 36].forEach((x, i) => {
          const tent = new THREE.Group();
          const top = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.2, 4), std(S2.tent, { flatShading: true, emissive: S2.tent, emissiveIntensity: 0.25 })); top.rotation.y = Math.PI / 4; top.position.y = 2.9; tent.add(top);
          [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach(([px, pz]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6), std(0xdddddd)); p.position.set(px, 1.15, pz); tent.add(p); });
          const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 0.8), std(0xf1f3f5)); table.position.set(0, 0.38, 0.9); tent.add(table);
          const sg = signPlane(booths[i % booths.length], 2.6, 0.5, S2.sign[0], S2.sign[1]); sg.position.set(0, 2.15, 1.42); tent.add(sg);
          const lamp = new THREE.PointLight(0xffe2b0, 3, 6, 1.6); lamp.position.set(0, 2.2, 0.6); tent.add(lamp);
          tent.position.set(x, 0, -2.6); decor.add(tent);
        });
        // 공원 뒤 배경
        const BZ = -44;
        if (set === 'campus') {
          [[-34, 16, 12, 0xe9e2d0], [-8, 22, 10, 0xd8cfbd], [24, 14, 14, 0xe9e2d0], [52, 18, 10, 0xcfc6b2]].forEach(([x, hh, w, c]) => {
            add(new THREE.Mesh(new THREE.BoxGeometry(w * 1.8, hh, 10), std(c)), x, hh / 2, BZ);
            for (let r = 0; r < Math.floor(hh / 3); r++) for (let q = 0; q < 6; q++) add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), new THREE.MeshBasicMaterial({ color: (r + q) % 3 ? 0xffe2a8 : 0x2a3346, toneMapped: false })), x - w * 0.75 + q * w * 0.3, 2 + r * 3, BZ + 5.02);
          });
          add(new THREE.Mesh(new THREE.BoxGeometry(5, 30, 5), std(0xd8cfbd)), -8, 15, BZ - 2);
          add(new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: 0xfff8e0, toneMapped: false })), -8, 25, BZ + 0.52);
          add(signPlane(th.backdrop || '중앙도서관 · 24시간 열람실', 14, 1.4, '#7a1f2b', '#fff'), 24, 15.5, BZ + 5.05);
        } else if (set === 'hanok') {
          [-30, 0, 30].forEach((x, i) => {
            const w = i === 1 ? 26 : 18;
            add(new THREE.Mesh(new THREE.BoxGeometry(w, 6, 8), std(0xe9dcc6)), x, 3, BZ);
            for (let k = 0; k < 6; k++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 6, 8), std(0xb02a2a)), x - w / 2 + 1 + k * (w - 2) / 5, 3, BZ + 4.3);
            const roof = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 7, w + 6, 4, 1), std(0x2b2b30, { flatShading: true })), x, 8.2, BZ); roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.45);
          });
          add(signPlane(th.backdrop || '대학로 한옥 마당', 9, 1.3, '#2b2b30', '#ffe8b0'), 0, 5.2, BZ + 4.6);
        } else if (set === 'cyber') {
          for (let k = 0; k < 9; k++) {
            const hh = 18 + h(k * 3.7) * 30, x = -60 + k * 15;
            add(new THREE.Mesh(new THREE.BoxGeometry(9, hh, 9), std(0x0d0d1f, { metalness: 0.6, roughness: 0.3 })), x, hh / 2, BZ - (k % 2) * 6);
            add(new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.25, 9.2), glow(k % 2 ? 0x00e5ff : 0xff3df0)), x, hh, BZ - (k % 2) * 6);
            add(new THREE.Mesh(new THREE.PlaneGeometry(6, 3.4), glow([0xff3df0, 0x00e5ff, 0xffe066, 0x7cff6b][k % 4])), x, hh * 0.6, BZ - (k % 2) * 6 + 4.6);
          }
          add(signPlane(th.backdrop || 'NEO HYEHWA 2030', 16, 2, '#0a0a1a', '#00e5ff'), 0, 20, BZ + 6);
        } else if (set === 'market') {
          for (let k = 0; k < 12; k++) { const x = -60 + k * 11; add(new THREE.Mesh(new THREE.BoxGeometry(10, 7, 8), std(0x6b5a48)), x, 3.5, BZ); const aw = add(new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 3), glow([0xe03131, 0xf59f00, 0x2f9e44, 0x1c7ed6][k % 4])), x, 3, BZ + 5); aw.rotation.x = 0.3; }
          add(signPlane(th.backdrop || '대학로 야시장', 14, 1.6, '#d9480f', '#fff'), 0, 8.5, BZ + 4.2);
        } else if (set === 'beach') {
          const sea = add(new THREE.Mesh(new THREE.PlaneGeometry(220, 60), new THREE.MeshStandardMaterial({ color: 0x0b4f8a, emissive: 0x06345c, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.4 })), 0, 0.05, BZ - 10); sea.rotation.x = -Math.PI / 2;
          for (let k = 0; k < 10; k++) { const x = -55 + k * 12; add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 6, 6), std(0x8a5a35)), x, 3, BZ + 8); for (let f = 0; f < 5; f++) { const leaf = add(new THREE.Mesh(new THREE.ConeGeometry(0.5, 3, 4), std(0x2b8a3e, { flatShading: true })), x + Math.cos(f * 1.25) * 1.2, 6, BZ + 8 + Math.sin(f * 1.25) * 1.2); leaf.rotation.set(Math.sin(f * 1.25) * 1.2, 0, -Math.cos(f * 1.25) * 1.2); } }
          add(signPlane(th.backdrop || '혜화 비치', 10, 1.4, '#1c7ed6', '#fff'), 0, 5, BZ + 9);
        } else if (set === 'forest') {
          for (let k = 0; k < 30; k++) { const x = -70 + k * 4.8 + h(k) * 2, z = BZ + 6 - h(k * 2) * 12, hh = 8 + h(k * 5) * 10; add(new THREE.Mesh(new THREE.ConeGeometry(2.6, hh, 7), std([0x1b4d2b, 0x2b6a3a, 0x16402a][k % 3], { flatShading: true })), x, hh / 2 + 1, z); }
          add(new THREE.Mesh(new THREE.ConeGeometry(60, 30, 5), std(0x0f2a1a, { flatShading: true })), 0, 12, BZ - 40);
        } else if (set === 'festival') {
          for (let k = 0; k < 40; k++) { const x = -60 + k * 3; const f = add(new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 3), glow([0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xf783ac][k % 5])), x, 5.2 - Math.sin((k % 8) / 8 * Math.PI) * 0.8, -7.5); f.rotation.x = Math.PI; }
        }
      }
      S.setPalette(th.outfits?.length ? th : null);
    },
    setPalette(th) {
      const key = th ? JSON.stringify([th.outfits, th.accessory]) : '';
      if (key === pedPalette) return; pedPalette = key;
      peds.forEach((p, i) => {
        const look = th ? { ...p.look, outfit: th.outfits[i % th.outfits.length], accessory: th.accessory && th.accessory !== 'none' ? th.accessory : p.look.accessory, accessoryColor: th.outfits[(i + 1) % th.outfits.length] } : p.look;
        scene.remove(p.char); p.char = makeCharacter(look); scene.add(p.char);
      });
    },
  };
  return S;
}

