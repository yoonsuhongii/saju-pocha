// 거리의 생활감: 행인·택시·배달 오토바이·혜화역 인파 / 버스커 / 소극장 호객꾼 / 즉석 연극 배우 / 테마 장식
// 모든 움직임은 공유 시계(Date.now)로 계산 → 접속한 모두에게 같은 장면이 보임
import * as THREE from 'three';
import { makeCharacter, animateCharacter, nameSprite, randomLook } from './character.js';
import { STAGE } from './scene.js';

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
    const c = { mesh: m, lane: i % 2 ? 6.9 : 4.1, dir: i % 2 ? -1 : 1, speed: isBike ? 9 + i : 6.5 + h(i) * 2.5, off: h(i * 9.1) * 200 };
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
  const actors = [0, 1, 2].map(() => { const c = makeCharacter(randomLook(Math.random)); c.visible = false; scene.add(c); return c; });
  const actorTags = [];
  // ---------- 테마 장식 + 현수막 ----------
  const decor = new THREE.Group(); scene.add(decor);
  const bannerCanvas = document.createElement('canvas'); bannerCanvas.width = 1024; bannerCanvas.height = 128;
  const bannerTex = new THREE.CanvasTexture(bannerCanvas); bannerTex.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.5), new THREE.MeshBasicMaterial({ map: bannerTex, toneMapped: false, side: THREE.DoubleSide }));
  banner.position.set(0, 4.6, -0.6); banner.visible = false; scene.add(banner);
  const bPoles = [-6.2, 6.2].map((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5.2, 6), std(0x777777, { metalness: 0.6 })); p.position.set(x, 2.6, -0.6); p.visible = false; scene.add(p); return p; });

  let pedPalette = null;
  const S = {
    peds, cars, busker, barker, actors,
    play: null,
    rushId: -1,
    update(nowSec, dt, now) {
      // 행인
      peds.forEach((p, i) => {
        const x = -65 + mod(p.off + p.dir * p.speed * nowSec, 130);
        p.char.position.set(x, 0, p.lane);
        p.char.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        animateCharacter(p.char, { walking: true, phase: nowSec * p.speed * 6 + i, talk: i % 4 === 0 }, now);
      });
      // 차
      cars.forEach((c) => { c.mesh.position.set(-100 + mod(c.off + c.dir * c.speed * nowSec, 200), 0, c.lane); });
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
      busker.rotation.y = aside ? -0.6 : Math.sin(now / 1500) * 0.15;
      animateCharacter(barker, { wave: Math.sin(now / 900) > 0.4, talk: true }, now);
      barker.rotation.y = Math.PI + Math.sin(now / 1300) * 0.3;
      // 연극
      if (S.play) S.updatePlay(Date.now(), now);
    },
    nearCar(x, z) { return cars.some((c) => Math.abs(c.mesh.position.x - x) < 2.6 && Math.abs(c.lane - z) < 1.2); },

    // ---------- 연극 ----------
    startPlay(script, startAt, say) {
      S.play = { script, startAt, say, shown: -1 };
      actorTags.forEach((t) => t.parent?.remove(t)); actorTags.length = 0;
      script.cast.slice(0, 3).forEach((c, i) => {
        const a = makeCharacter(c.look || randomLook(Math.random));
        scene.remove(actors[i]); actors[i] = a; scene.add(a);
        a.position.set(STAGE.x - 1.6 + i * 1.6, 0.6, STAGE.z - 1.6); a.rotation.y = 0; a.visible = true;
        const tag = nameSprite(`🎭 ${c.name}`, { bg: 'rgba(120,20,60,0.85)', scale: 0.8 }); tag.position.y = 1.95; a.add(tag); actorTags.push(tag);
      });
    },
    LINE_SEC: 4.2,
    updatePlay(nowMs, now) {
      const P = S.play, t = (nowMs - P.startAt) / 1000;
      const lines = P.script.lines, n = lines.length;
      if (t < 0) return;
      const idx = Math.floor(t / S.LINE_SEC);
      actors.forEach((a, i) => {
        if (!a.visible) return;
        const ln = lines[Math.min(idx, n - 1)];
        const speaking = idx < n && ln.who === i;
        const act = speaking ? ln.act : null;
        const ending = idx >= n;
        animateCharacter(a, { talk: speaking, wave: act === 'wave', cheer: act === 'cheer' || ending, walking: act === 'walk', phase: now / 120 }, now);
        a.position.x = STAGE.x - 1.6 + i * 1.6 + (act === 'walk' ? Math.sin(now / 600) * 0.5 : 0);
        a.rotation.y = speaking ? 0 : (ln && ln.who !== i ? Math.atan2((STAGE.x - 1.6 + ln.who * 1.6) - a.position.x, 0.3) * 0.6 : 0);
        if (ending) a.rotation.x = Math.sin((t - n * S.LINE_SEC) * 2) > 0 ? 0.35 : 0; // 인사
      });
      if (idx !== P.shown && idx < n) {
        P.shown = idx;
        const ln = lines[idx];
        if (actors[ln.who]) P.say(actors[ln.who], ln.text, S.LINE_SEC * 1000 - 200, ln);
      }
      if (t > n * S.LINE_SEC + 5) { actors.forEach((a) => { a.visible = false; a.rotation.x = 0; }); P.end?.(); S.play = null; }
    },

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

// 오프라인 연극 대본
export const PLAY_PRESETS = [
  { title: '막차는 떠나고', cast: [{ name: '취준생 민지' }, { name: '포차 사장' }, { name: '길고양이' }], lines: [
    { who: 0, text: '아… 혜화역 막차 놓쳤다. 오늘 면접도 망쳤는데.', act: 'talk' },
    { who: 1, text: '어이 학생, 막차 놓친 김에 어묵 국물이나 한 그릇 해.', act: 'wave' },
    { who: 0, text: '사장님, 저 사주에 물 기운이 없대요. 그래서 이렇게 메마른 걸까요?', act: 'talk' },
    { who: 2, text: '야옹… (국물 냄새를 맡고 다가온다)', act: 'walk' },
    { who: 1, text: '물 기운 없으면 국물로 채우면 되지! 인생 별거 있나.', act: 'cheer' },
    { who: 0, text: '…하하, 그러네요. 내일 면접은 첫차 타고 가면 돼요!', act: 'cheer' },
    { who: 2, text: '야옹! (박수 대신 꼬리를 흔든다)', act: 'wave' },
  ] },
  { title: '붕어빵 전쟁', cast: [{ name: '팥붕파 대학생' }, { name: '슈붕파 직장인' }, { name: '붕어빵 할아버지' }], lines: [
    { who: 0, text: '붕어빵은 팥이죠. 이건 전통이에요.', act: 'talk' },
    { who: 1, text: '아니죠, 슈크림이야말로 2030년의 근본입니다.', act: 'talk' },
    { who: 0, text: '그럼 이 거리 사람들한테 물어봐요!', act: 'wave' },
    { who: 2, text: '허허, 싸우지들 말어. 오늘은 반반 줄게.', act: 'walk' },
    { who: 1, text: '…반반이요? 그런 게 가능해요?', act: 'talk' },
    { who: 2, text: '대학로에선 다 가능혀. 연극도 즉석으로 하는 동네여!', act: 'cheer' },
    { who: 0, text: '팥붕 슈붕 화해 기념, 건배!', act: 'cheer' },
  ] },
];
