// 마로니에 야외무대 즉석 연극: 막·조명·배경·소품·동선·감정 표현·효과음·관객 반응
import * as THREE from 'three';
import { makeCharacter, animateCharacter, nameSprite, randomLook } from './character.js';
import { STAGE } from './scene.js';

const FONT = '"Pretendard Variable","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const rnd = (n) => { const x = Math.sin(n * 78.233 + 12.9898) * 43758.5453; return x - Math.floor(x); };

// 무대 위 자리 (무대 중심 기준)
const SPOTS = { left: [-2.3, -1.9], center: [0, -1.5], right: [2.3, -1.9], front: [0, -0.5], back: [0, -3.3], frontleft: [-1.5, -0.6], frontright: [1.5, -0.6] };
export const ACTS = ['talk', 'wave', 'cheer', 'jump', 'sit', 'bow', 'cry', 'laugh', 'angry', 'surprise', 'think', 'dance', 'point', 'hug', 'fall', 'walk'];
const ACT_EMOTE = { cry: '💦', laugh: '😆', angry: '💢', surprise: '❗', think: '💭', hug: '❤️', dance: '🎵', fall: '💫', cheer: '✨' };

function emoteSprite(e) {
  const t = tex(128, 128, (g) => { g.font = '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 64, 70); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(0.55, 0.55, 1); s.renderOrder = 12; return s;
}

// 소품
function prop(kind) {
  const g = new THREE.Group();
  const M = (c, o) => std(c, o);
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  switch (kind) {
    case 'bench': add(new THREE.BoxGeometry(1.8, 0.08, 0.45), M(0x8a5a35), 0, 0.42, 0); add(new THREE.BoxGeometry(1.8, 0.4, 0.06), M(0x8a5a35), 0, 0.7, -0.22); [-0.8, 0.8].forEach((x) => add(new THREE.BoxGeometry(0.06, 0.42, 0.4), M(0x2a2d36), x, 0.21, 0)); break;
    case 'table': add(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 24), M(0xe9e2d6), 0, 0.72, 0); add(new THREE.CylinderGeometry(0.05, 0.08, 0.72, 10), M(0x555555), 0, 0.36, 0); add(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 10), M(0x2f9e44, { transparent: true, opacity: 0.85 }), 0.15, 0.86, 0); break;
    case 'lamp': add(new THREE.CylinderGeometry(0.05, 0.07, 3, 8), M(0x2a2d36), 0, 1.5, 0); add(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff0c8, toneMapped: false }), 0, 3.05, 0); break;
    case 'tree': add(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 10), M(0x5a3a22), 0, 0.8, 0); add(new THREE.SphereGeometry(0.8, 20, 14), M(0xe8a33d), 0, 2.0, 0); break;
    case 'busstop': { add(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), M(0x888888, { metalness: 0.6 }), 0, 1.2, 0); const sg = add(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ toneMapped: false, map: tex(180, 120, (c) => { c.fillStyle = '#1c7ed6'; c.fillRect(0, 0, 180, 120); c.fillStyle = '#fff'; c.font = `900 30px ${FONT}`; c.textAlign = 'center'; c.fillText('혜화역', 90, 50); c.font = `700 22px ${FONT}`; c.fillText('막차 23:58', 90, 92); }) }), 0, 2.2, 0.03); void sg; break; }
    case 'desk': add(new THREE.BoxGeometry(1.4, 0.06, 0.7), M(0xc9a46b), 0, 0.74, 0); [[-0.62, -0.3], [0.62, -0.3], [-0.62, 0.3], [0.62, 0.3]].forEach(([x, z]) => add(new THREE.BoxGeometry(0.05, 0.74, 0.05), M(0x6b4a2b), x, 0.37, z)); add(new THREE.BoxGeometry(0.45, 0.3, 0.02), M(0x22262e), 0, 0.93, -0.1).rotation.x = -0.2; break;
    case 'pocha': add(new THREE.BoxGeometry(1.6, 0.8, 0.6), M(0x5b3c26), 0, 0.4, 0); add(new THREE.PlaneGeometry(2, 1.2), M(0xff7a1a, { side: THREE.DoubleSide, emissive: 0xff7a1a, emissiveIntensity: 0.3 }), 0, 2.1, 0).rotation.x = -1.3; [-0.9, 0.9].forEach((x) => add(new THREE.CylinderGeometry(0.03, 0.03, 2, 6), M(0x999999), x, 1, -0.25)); break;
    case 'door': add(new THREE.BoxGeometry(1.1, 2.2, 0.08), M(0x8a5a35), 0, 1.1, 0); add(new THREE.SphereGeometry(0.05, 10, 8), M(0xffd43b, { metalness: 0.8 }), 0.4, 1.1, 0.06); break;
    case 'moon': add(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ color: 0xfff3c4, toneMapped: false }), 0, 4.2, 0); break;
    case 'stars': for (let k = 0; k < 14; k++) add(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), (rnd(k) - 0.5) * 8, 3 + rnd(k + 9) * 1.8, 0); break;
    case 'flowers': for (let k = 0; k < 6; k++) add(new THREE.SphereGeometry(0.12, 12, 10), M([0xff8fab, 0xffd43b, 0xffffff][k % 3]), (k - 2.5) * 0.25, 0.15, (k % 2) * 0.2); break;
    default: break;
  }
  return g;
}
const PROP_SPOT = { bench: [-1.2, -2.6], table: [1.4, -2.4], lamp: [-3.6, -2.8], tree: [3.6, -3.4], busstop: [-3.3, -1.6], desk: [0.8, -2.7], pocha: [0, -3.6], door: [3.2, -3.2], moon: [-2.5, -4.3], stars: [0, -4.35], flowers: [0, -0.2] };

export function createTheater(scene, { high = true, busker } = {}) {
  const root = new THREE.Group(); root.position.set(STAGE.x, 0.6, STAGE.z); scene.add(root);
  // 무대 배경 그림 (막 뒤)
  const bdCanvas = document.createElement('canvas'); bdCanvas.width = 1024; bdCanvas.height = 512;
  const bdTex = new THREE.CanvasTexture(bdCanvas); bdTex.colorSpace = THREE.SRGBColorSpace;
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshStandardMaterial({ map: bdTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: bdTex, emissiveIntensity: 0.25 }));
  backdrop.position.set(0, 2.5, -4.6); backdrop.visible = false; root.add(backdrop);
  // 붉은 막 (벨벳 주름)
  const velvet = tex(256, 512, (g, w, h) => { for (let x = 0; x < w; x++) { const v = 0.55 + 0.45 * Math.sin(x / w * Math.PI * 10); g.fillStyle = `rgb(${Math.round(120 + 80 * v)},${Math.round(14 + 12 * v)},${Math.round(24 + 14 * v)})`; g.fillRect(x, 0, 1, h); } g.fillStyle = 'rgba(255,210,120,0.9)'; g.fillRect(0, 0, w, 18); });
  const curtains = [-1, 1].map((sd) => { const c = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 6), std(0xffffff, { map: velvet, roughness: 0.85, side: THREE.DoubleSide })); c.position.set(sd * 2.8, 3, 0.15); c.castShadow = false; root.add(c); c.userData.sd = sd; return c; });
  let curtainOpen = 1; // 1 = 열림(평소엔 걷혀 있음)
  // 조명
  const spot = new THREE.SpotLight(0xfff1d6, 0, 26, 0.32, 0.55, 1.2); spot.position.set(0, 7.5, 7); root.add(spot); root.add(spot.target);
  const rimA = new THREE.PointLight(0xff4d9d, 0, 10, 1.5); rimA.position.set(-4, 4, -2); root.add(rimA);
  const rimB = new THREE.PointLight(0x4dc3ff, 0, 10, 1.5); rimB.position.set(4, 4, -2); root.add(rimB);
  const props = new THREE.Group(); root.add(props);
  // 관객 (공연 때만 등장, 무대 앞 바닥에 앉아 있음)
  const audience = [];
  for (let k = 0; k < (high ? 10 : 6); k++) {
    const c = makeCharacter(randomLook(() => rnd(k * 3 + 1 + audience.length * 0.1)));
    c.position.set(STAGE.x - 4.5 + (k % 5) * 2.2 + rnd(k) * 0.4, 0, STAGE.z + 4.8 + Math.floor(k / 5) * 1.6); c.rotation.y = Math.PI; c.visible = false; scene.add(c); audience.push({ c, react: 0, txt: null });
  }
  let actors = [], tags = [];
  const T = { play: null };

  function paintBackdrop(sc) {
    const g = bdCanvas.getContext('2d'), W = 1024, H = 512;
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, sc.bg?.[0] || '#1b1440'); gr.addColorStop(1, sc.bg?.[1] || '#d9822b');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // 동네 실루엣
    g.fillStyle = 'rgba(10,8,20,0.55)';
    for (let x = 0; x < W; x += 46) { const hh = 90 + rnd(x) * 170; g.fillRect(x, H - hh, 40, hh); }
    g.fillStyle = 'rgba(255,220,150,0.7)';
    for (let k = 0; k < 70; k++) g.fillRect(rnd(k) * W, H - rnd(k + 5) * 220, 6, 8);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `800 34px ${FONT}`; g.textAlign = 'left'; g.fillText(`📍 ${sc.place || '대학로 어딘가'}`, 30, 52);
    bdTex.needsUpdate = true;
  }
  function lineDur(ln) { return Math.min(6.2, Math.max(2.6, 2.0 + String(ln.text || '').length * 0.075)) + (ln.to ? 0.5 : 0); }

  T.start = (sc, startAt, hooks) => {
    // 정리
    actors.forEach((a) => scene.remove(a.c)); actors = []; tags = [];
    while (props.children.length) props.remove(props.children[0]);
    paintBackdrop(sc); backdrop.visible = true;
    (sc.props || []).slice(0, 5).forEach((k) => { const p = prop(k); const [x, z] = PROP_SPOT[k] || [0, -3]; p.position.set(x, 0, z); props.add(p); });
    sc.cast.slice(0, 3).forEach((c, i) => {
      const ch = makeCharacter(c.look || randomLook(() => rnd(i * 7 + sc.title.length)));
      const home = ['left', 'right', 'center'][i];
      const [x, z] = SPOTS[home];
      ch.position.set(STAGE.x + x, 0.6, STAGE.z + z); ch.visible = true; scene.add(ch);
      const tag = nameSprite(`🎭 ${c.name}`, { bg: 'rgba(120,20,60,0.8)', scale: 0.75 }); tag.position.y = 1.95; ch.add(tag);
      actors.push({ c: ch, target: new THREE.Vector3(STAGE.x + x, 0.6, STAGE.z + z), act: 'idle', emote: null, emoteUntil: 0, phase: 0 });
    });
    audience.forEach((a) => { a.c.visible = true; });
    // 일정표: 막 열림 3초 → 대사들 → 커튼콜 6초
    let t = 3.2; const sched = sc.lines.map((ln) => { const s = { ...ln, t0: t, dur: lineDur(ln) }; t += s.dur; return s; });
    T.play = { sc, startAt, hooks, sched, endT: t, total: t + 6.5, idx: -1, ended: false };
    curtainOpen = 0;
  };
  T.speakerPos = () => {
    const P = T.play; if (!P) return null;
    const ln = P.sched[Math.max(0, P.idx)];
    const a = ln && actors[ln.who];
    return a ? a.c.position.clone().add(new THREE.Vector3(0, 1.2, 0)) : new THREE.Vector3(STAGE.x, 1.8, STAGE.z - 1.5);
  };
  T.update = (nowMs, now, dt) => {
    const P = T.play;
    // 막 애니메이션
    const wantOpen = P ? ((nowMs - P.startAt) / 1000 > 0.6 && (nowMs - P.startAt) / 1000 < P.total - 1.2 ? 1 : 0) : 1;
    curtainOpen += (wantOpen - curtainOpen) * Math.min(1, dt * 1.6);
    curtains.forEach((c) => { c.position.x = c.userData.sd * (2.8 + curtainOpen * 3.4); c.scale.x = 1 - curtainOpen * 0.55; });
    const lightK = P ? Math.min(1, Math.max(0, (nowMs - P.startAt) / 1500)) : 0;
    spot.intensity = 55 * lightK; rimA.intensity = rimB.intensity = 6 * lightK;
    if (!P) return;
    const t = (nowMs - P.startAt) / 1000;
    if (t < 0) return;
    // 현재 대사
    let idx = -1; for (let i = 0; i < P.sched.length; i++) if (t >= P.sched[i].t0) idx = i;
    if (t >= P.endT) idx = P.sched.length; // 커튼콜
    if (idx !== P.idx) {
      P.idx = idx;
      if (idx === 0) P.hooks.title?.(P.sc);
      const ln = P.sched[idx];
      if (ln) {
        const a = actors[ln.who];
        if (ln.to && SPOTS[ln.to] && a) a.target.set(STAGE.x + SPOTS[ln.to][0], 0.6, STAGE.z + SPOTS[ln.to][1]);
        if (ln.act === 'hug' && a) { const o = actors.find((x, k) => k !== ln.who); if (o) a.target.copy(o.c.position).add(new THREE.Vector3(o.c.position.x > a.c.position.x ? -0.55 : 0.55, 0, 0)); }
        const em = ln.emote || ACT_EMOTE[ln.act];
        if (a && em) { if (a.emote) a.c.remove(a.emote); a.emote = emoteSprite(em); a.emote.position.set(0.35, 2.35, 0); a.c.add(a.emote); a.emoteUntil = now + 1800; }
        P.hooks.line?.(a ? a.c : null, ln, P.sc);
        if (ln.sfx) P.hooks.sfx?.(ln.sfx);
        if (ln.react && ln.react !== 'none') setTimeout(() => react(ln.react), Math.min(2500, ln.dur * 600));
      } else if (idx === P.sched.length) { P.hooks.curtainCall?.(P.sc); react('clap'); }
    }
    const cur = P.sched[idx];
    const ending = idx >= P.sched.length;
    actors.forEach((a, i) => {
      const c = a.c, speaking = cur && cur.who === i, act = speaking ? cur.act : null;
      // 이동
      const d = new THREE.Vector3().subVectors(a.target, c.position); d.y = 0;
      const moving = d.length() > 0.05;
      if (moving) { const st = Math.min(d.length(), 1.7 * dt); c.position.addScaledVector(d.normalize(), st); c.rotation.y = Math.atan2(d.x, d.z); }
      else {
        // 말하는 사람을 바라보거나 객석을 봄
        const sp = cur && actors[cur.who];
        const face = speaking || !sp ? 0.15 * Math.sin(now / 900 + i) : Math.atan2(sp.c.position.x - c.position.x, (sp.c.position.z - c.position.z) + 1.2);
        c.rotation.y += (face - c.rotation.y) * Math.min(1, dt * 5);
      }
      a.phase += dt * 9;
      c.position.y = 0.6; c.rotation.x = 0; c.rotation.z = 0;
      const anim = { walking: moving, phase: a.phase, talk: speaking };
      if (ending) { const bt = t - P.endT; c.rotation.x = Math.sin(bt * 2.2) > 0.3 ? 0.45 : 0; anim.cheer = bt > 3.5; }
      else if (act) {
        if (act === 'wave' || act === 'point') anim.wave = true;
        if (act === 'cheer') anim.cheer = true;
        if (act === 'jump' || act === 'surprise') c.position.y = 0.6 + Math.abs(Math.sin(now / 160)) * 0.35;
        if (act === 'laugh') { c.position.y = 0.6 + Math.abs(Math.sin(now / 90)) * 0.08; anim.cheer = true; }
        if (act === 'angry') { c.position.x += Math.sin(now / 35) * 0.015; anim.cook = true; }
        if (act === 'cry') { c.userData.parts.head.rotation.x = 0.35; c.rotation.z = Math.sin(now / 120) * 0.04; }
        if (act === 'think') c.userData.parts.head.rotation.z = 0.25;
        if (act === 'dance') { c.rotation.y += dt * 6; anim.cheer = true; c.position.y = 0.6 + Math.abs(Math.sin(now / 200)) * 0.12; }
        if (act === 'bow') c.rotation.x = 0.5;
        if (act === 'sit') { anim.seated = true; c.position.y = 0.25; }
        if (act === 'fall') { c.rotation.z = 1.35; c.position.y = 0.75; }
        if (act === 'hug') anim.hold = true;
      }
      animateCharacter(c, anim, now);
      if (!(act === 'cry')) c.userData.parts.head.rotation.x = 0;
      if (!(act === 'think')) c.userData.parts.head.rotation.z = act === 'cry' ? 0 : c.userData.parts.head.rotation.z * 0.9;
      if (a.emote && now > a.emoteUntil) { c.remove(a.emote); a.emote = null; }
    });
    // 조명은 말하는 사람을 따라감
    const sp = T.speakerPos(); if (sp) { spot.target.position.lerp(root.worldToLocal(sp.clone()), Math.min(1, dt * 3)); }
    // 관객
    audience.forEach((au, k) => {
      animateCharacter(au.c, { seated: true, cheer: au.react > now && au.kind === 'clap', talk: au.react > now }, now);
      au.c.position.y = au.react > now && au.kind === 'laugh' ? Math.abs(Math.sin(now / 100 + k)) * 0.05 : 0;
      if (au.txt && now > au.react) { au.c.remove(au.txt); au.txt = null; }
    });
    if (t > P.total) {
      actors.forEach((a) => scene.remove(a.c)); actors = [];
      audience.forEach((a) => { a.c.visible = false; });
      backdrop.visible = false; while (props.children.length) props.remove(props.children[0]);
      const h = P.hooks; T.play = null; h.end?.();
    }
  };
  function react(kind) {
    const now = performance.now();
    const words = { laugh: ['ㅋㅋㅋㅋ', '하하하', 'ㅋㅋ 미쳤다', '아 웃겨'], gasp: ['헉!', '어머', '말도 안 돼'], aww: ['아이고…', '짠하다', '울컥…'], clap: ['👏👏', '브라보!', '최고!'] }[kind] || ['오~'];
    audience.forEach((au, k) => {
      if (rnd(k + now) < 0.45 || kind === 'clap') {
        au.react = now + 1800; au.kind = kind;
        if (au.txt) au.c.remove(au.txt);
        if (rnd(k * 3 + now) < 0.5) { au.txt = T.bubble?.(words[k % words.length]); if (au.txt) { au.txt.position.y = 1.9; au.c.add(au.txt); } }
      }
    });
    T.onReact?.(kind);
  }
  return T;
}

// 오프라인 대본 (GPT 연결이 없을 때)
export const PLAY_PRESETS = [
  {
    title: '막차는 떠나고', place: '혜화역 2번 출구 앞', bg: ['#141036', '#c2563a'], props: ['busstop', 'lamp', 'moon'],
    cast: [{ name: '취준생 민지' }, { name: '포차 이모' }, { name: '길고양이 나비' }],
    lines: [
      { who: -1, text: '밤 11시 59분, 혜화역. 막차가 방금 떠났다.', sfx: 'whoosh' },
      { who: 0, text: '아아… 막차 놓쳤다! 오늘 면접도 망쳤는데!', act: 'cry', to: 'front', react: 'aww' },
      { who: 2, text: '야옹~ (민지 다리에 몸을 비빈다)', act: 'walk', to: 'frontleft', emote: '❤️' },
      { who: 0, text: '너도 집이 없구나… 우리 둘 다 오늘 망했네.', act: 'sit' },
      { who: 1, text: '어이 학생! 막차 놓친 김에 어묵 국물이나 한 그릇 해!', act: 'wave', to: 'right', sfx: 'chime' },
      { who: 0, text: '이모, 저 사주에 물 기운이 하나도 없대요. 그래서 이렇게 메마른 걸까요?', act: 'think', to: 'center' },
      { who: 1, text: '물 기운 없으면 국물로 채우면 되지! 인생 별거 있나!', act: 'laugh', react: 'laugh', sfx: 'rimshot' },
      { who: 2, text: '야아옹! (국물 냄새에 벌떡 일어선다)', act: 'jump', emote: '❗', react: 'laugh', sfx: 'boing' },
      { who: 0, text: '…그러네요. 첫차 타고 다시 면접 보러 가면 되죠!', act: 'cheer', to: 'front' },
      { who: 1, text: '그래, 그게 대학로 정신이야! 다 같이 짠!', act: 'dance', react: 'clap', sfx: 'drumroll' },
    ],
  },
  {
    title: '팥붕 슈붕 대전', place: '마로니에 붕어빵 노점', bg: ['#1a1030', '#e8a33d'], props: ['pocha', 'tree', 'stars'],
    cast: [{ name: '팥붕파 대학생' }, { name: '슈붕파 직장인' }, { name: '붕어빵 할아버지' }],
    lines: [
      { who: -1, text: '대학로 붕어빵 노점 앞. 마지막 한 마리를 두고 긴장감이 흐른다.', sfx: 'drumroll' },
      { who: 0, text: '붕어빵은 팥이죠. 이건 조선시대부터 내려온 전통이에요.', act: 'point', to: 'left' },
      { who: 1, text: '조선시대에 붕어빵이 어딨어요! 슈크림이 2030년의 근본입니다!', act: 'angry', to: 'right', react: 'laugh', sfx: 'rimshot' },
      { who: 0, text: '좋아요, 그럼 사주로 결판내요. 전 불 기운이라 뜨거운 팥!', act: 'cheer', to: 'center' },
      { who: 1, text: '저는 쇠 기운이라… 차가운 슈크림이 운명이에요.', act: 'think', to: 'frontright' },
      { who: 2, text: '허허, 싸우지들 말어. 사실 마지막 건… 피자붕이여.', act: 'walk', to: 'front', emote: '❗', react: 'gasp', sfx: 'boing' },
      { who: 0, text: '피… 피자붕?!', act: 'surprise', react: 'laugh' },
      { who: 1, text: '…근데 맛있겠다.', act: 'laugh', react: 'laugh' },
      { who: 2, text: '대학로에선 다 같이 먹으면 그게 정답이여!', act: 'dance', react: 'clap', sfx: 'chime' },
      { who: 0, text: '팥붕 슈붕 피자붕, 화해 기념 건배!', act: 'hug', react: 'aww' },
    ],
  },
];
