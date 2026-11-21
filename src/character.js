// 귀여운 로우폴리 캐릭터 (큰 머리 2.5등신) — 플레이어·다른 손님·상담사 공용
// params 로 외형을 바꿀 수 있어서, "상담사 스타일 프롬프트" → 외형 변신이 가능
import * as THREE from 'three';

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, flatShading: true, ...o });

export const DEFAULT_LOOK = {
  skin: '#f2c9a0', hair: '#2b1d14', hairStyle: 'short', outfit: '#4dabf7', apron: null,
  accessory: 'none', accessoryColor: '#ffffff', height: 1, eyes: 'dot',
};

/**
 * @returns {THREE.Group & {userData:{parts}}}
 */
export function makeCharacter(look = {}) {
  const L = { ...DEFAULT_LOOK, ...look };
  const g = new THREE.Group();
  const parts = {};
  const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const skin = mat(L.skin), outfit = mat(L.outfit), hair = mat(L.hair), dark = mat('#2a2233');

  // 다리
  parts.legs = [-0.11, 0.11].map((x) => {
    const p = new THREE.Group(); p.position.set(x, 0.42, 0); g.add(p);
    add(new THREE.CapsuleGeometry(0.075, 0.26, 3, 6), mat('#2f3247'), 0, -0.2, 0, p);
    add(new THREE.BoxGeometry(0.13, 0.07, 0.2), dark, 0, -0.38, 0.03, p);
    return p;
  });
  // 몸통
  parts.body = add(new THREE.CapsuleGeometry(0.2, 0.26, 4, 8), outfit, 0, 0.66, 0);
  if (L.apron) add(new THREE.BoxGeometry(0.3, 0.34, 0.05), mat(L.apron), 0, 0.6, 0.18);
  // 팔
  parts.arms = [-0.25, 0.25].map((x) => {
    const p = new THREE.Group(); p.position.set(x, 0.86, 0); g.add(p);
    add(new THREE.CapsuleGeometry(0.06, 0.24, 3, 6), outfit, 0, -0.15, 0, p);
    add(new THREE.SphereGeometry(0.065, 8, 6), skin, 0, -0.32, 0, p);
    return p;
  });
  // 머리
  const head = new THREE.Group(); head.position.y = 1.22; g.add(head); parts.head = head;
  add(new THREE.SphereGeometry(0.3, 16, 12), skin, 0, 0, 0, head);
  // 얼굴
  const eyeGeo = L.eyes === 'line' ? new THREE.BoxGeometry(0.07, 0.015, 0.02) : new THREE.SphereGeometry(0.035, 8, 6);
  [-0.1, 0.1].forEach((x) => add(eyeGeo, dark, x, 0.02, 0.28, head));
  [-0.17, 0.17].forEach((x) => { const c = add(new THREE.CircleGeometry(0.045, 10), new THREE.MeshBasicMaterial({ color: '#ff9aa8', transparent: true, opacity: 0.6 }), x, -0.06, 0.285, head); c.castShadow = false; });
  const mouth = add(new THREE.TorusGeometry(0.035, 0.01, 4, 10, Math.PI), dark, 0, -0.07, 0.29, head);
  mouth.rotation.z = Math.PI;
  // 머리카락
  const hs = L.hairStyle;
  if (hs !== 'bald') add(new THREE.SphereGeometry(0.315, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.1), hair, 0, 0.03, -0.01, head);
  if (hs === 'bun') add(new THREE.SphereGeometry(0.12, 10, 8), hair, 0, 0.32, -0.08, head);
  if (hs === 'long') add(new THREE.BoxGeometry(0.56, 0.42, 0.18), hair, 0, -0.14, -0.18, head);
  if (hs === 'ponytail') { const t = add(new THREE.CapsuleGeometry(0.07, 0.22, 3, 6), hair, 0, -0.05, -0.32, head); t.rotation.x = 0.5; }
  if (hs === 'perm') for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; add(new THREE.SphereGeometry(0.09, 8, 6), hair, Math.cos(a) * 0.24, 0.16 + Math.sin(i) * 0.04, Math.sin(a) * 0.2 - 0.04, head); }
  if (hs === 'spiky') for (let i = 0; i < 6; i++) { const c = add(new THREE.ConeGeometry(0.06, 0.16, 5), hair, (i - 2.5) * 0.08, 0.3, -0.02, head); c.rotation.z = (i - 2.5) * 0.15; }
  // 액세서리
  const ac = mat(L.accessoryColor);
  switch (L.accessory) {
    case 'glasses':
      [-0.1, 0.1].forEach((x) => { const r = add(new THREE.TorusGeometry(0.06, 0.012, 4, 12), dark, x, 0.02, 0.3, head); r.castShadow = false; });
      break;
    case 'headscarf': { const b = add(new THREE.TorusGeometry(0.29, 0.06, 6, 16), ac, 0, 0.12, 0, head); b.rotation.x = Math.PI / 2.2; add(new THREE.SphereGeometry(0.07, 6, 6), ac, 0.12, 0.14, -0.27, head); break; }
    case 'hat': add(new THREE.CylinderGeometry(0.44, 0.44, 0.03, 16), ac, 0, 0.22, 0, head); add(new THREE.CylinderGeometry(0.22, 0.25, 0.22, 16), ac, 0, 0.33, 0, head); break;
    case 'beanie': add(new THREE.SphereGeometry(0.325, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), ac, 0, 0.05, 0, head); add(new THREE.SphereGeometry(0.07, 8, 6), ac, 0, 0.36, 0, head); break;
    case 'catears': [-0.17, 0.17].forEach((x) => { const e = add(new THREE.ConeGeometry(0.09, 0.16, 4), ac, x, 0.3, 0, head); e.rotation.z = -x * 1.2; }); break;
    case 'flower': add(new THREE.SphereGeometry(0.07, 8, 6), ac, 0.2, 0.2, 0.12, head); break;
    case 'towel': { // 양머리 수건
      [-0.2, 0.2].forEach((x) => add(new THREE.SphereGeometry(0.14, 10, 8), ac, x, 0.2, -0.02, head));
      const b = add(new THREE.TorusGeometry(0.29, 0.05, 6, 16), ac, 0, 0.08, 0, head); b.rotation.x = Math.PI / 2;
      break;
    }
    case 'crown': add(new THREE.CylinderGeometry(0.16, 0.18, 0.12, 6, 1, true), mat('#ffd23f', { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }), 0, 0.32, 0, head); break;
    case 'hanbok': add(new THREE.ConeGeometry(0.3, 0.36, 10), ac, 0, 0.38, 0, g); break; // 치마
    default: break;
  }
  g.scale.setScalar(L.height || 1);
  g.userData.parts = parts;
  g.userData.look = L;
  g.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
  return g;
}

/** 걷기/앉기/손 흔들기/말하기 애니메이션 */
export function animateCharacter(c, { walking = false, phase = 0, seated = false, wave = false, talk = false, cheer = false }, now) {
  const p = c.userData.parts;
  if (!p) return;
  const sw = walking ? Math.sin(phase) * 0.6 : 0;
  if (seated) { p.legs.forEach((l) => { l.rotation.x = -1.4; }); }
  else { p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw; }
  if (wave) { p.arms[1].rotation.x = -2.7 + Math.sin(now / 110) * 0.35; p.arms[0].rotation.x = -sw * 0.7; }
  else if (cheer) { p.arms.forEach((a, i) => { a.rotation.x = -2.5 + Math.sin(now / 140 + i) * 0.3; }); }
  else { p.arms[0].rotation.x = -sw * 0.7 + (seated ? -0.6 : 0); p.arms[1].rotation.x = sw * 0.7 + (seated ? -0.6 : 0); }
  p.head.rotation.z = talk ? Math.sin(now / 160) * 0.06 : 0;
  p.head.position.y = 1.22 + (talk ? Math.abs(Math.sin(now / 120)) * 0.015 : 0) + (walking ? Math.abs(Math.sin(phase)) * 0.02 : 0);
}

// ---------------- 이름표 스프라이트 ----------------
export function nameSprite(text, { bg = 'rgba(20,16,40,0.7)', fg = '#fff', scale = 1 } = {}) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.font = '700 46px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  const w = Math.min(500, g.measureText(text).width + 44);
  g.fillStyle = bg;
  g.beginPath(); g.roundRect ? g.roundRect((512 - w) / 2, 8, w, 80, 40) : g.rect((512 - w) / 2, 8, w, 80); g.fill();
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, toneMapped: false }));
  s.scale.set(1.6 * scale, 0.3 * scale, 1);
  s.renderOrder = 10;
  return s;
}

// ---------------- 손님 외형 자동 생성 ----------------
const SKINS = ['#ffe0c7', '#f2c9a0', '#e8b48a', '#d49b6e', '#b97f55'];
const HAIRS = ['#2b1d14', '#1a1a1a', '#5a3a22', '#8a5a2b', '#c9a06b', '#e8e1d6', '#d65a5a', '#6b5bd6'];
const OUTFITS = ['#ff8fab', '#74c0fc', '#ffd43b', '#8ce99a', '#b197fc', '#ffa94d', '#f1f3f5', '#495057', '#e599f7', '#63e6be'];
const STYLES = ['short', 'short', 'bun', 'long', 'ponytail', 'perm', 'spiky'];
const ACC = ['none', 'none', 'none', 'glasses', 'beanie', 'hat', 'towel', 'catears', 'flower'];
const ADJ = ['잠 못 드는', '야근한', '퇴근길', '혼술하는', '생각 많은', '출출한', '비 맞은', '첫차 기다리는', '마음 복잡한', '산책 나온', '고민 많은', '심심한'];
const ANIMAL = ['고양이', '수달', '여우', '곰', '토끼', '펭귄', '너구리', '다람쥐', '부엉이', '오리', '강아지', '판다'];
const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];
export function randomLook(r = Math.random) {
  return {
    skin: pick(SKINS, r), hair: pick(HAIRS, r), hairStyle: pick(STYLES, r), outfit: pick(OUTFITS, r),
    accessory: pick(ACC, r), accessoryColor: pick(OUTFITS, r), height: 0.95 + r() * 0.1,
  };
}
export const randomName = (r = Math.random) => `${pick(ADJ, r)} ${pick(ANIMAL, r)}`;

// ---------------- 말풍선 ----------------
export function bubbleSprite(text, { bg = 'rgba(246,240,228,0.92)', fg = '#1d1a24' } = {}) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 200;
  const g = c.getContext('2d');
  const font = '600 34px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  g.font = font;
  // 줄바꿈 (최대 3줄)
  const lines = []; let line = '';
  for (const ch of String(text)) {
    if (g.measureText(line + ch).width > 440) { lines.push(line); line = ch; if (lines.length === 3) break; } else line += ch;
  }
  if (lines.length < 3 && line) lines.push(line);
  if (lines.length === 3 && text.length > lines.join('').length) lines[2] = lines[2].slice(0, -1) + '…';
  const w = Math.min(500, Math.max(...lines.map((l) => g.measureText(l).width)) + 48), h = lines.length * 44 + 32;
  const x0 = (512 - w) / 2, y0 = 200 - h - 22;
  g.fillStyle = bg;
  g.beginPath(); g.roundRect ? g.roundRect(x0, y0, w, h, 26) : g.rect(x0, y0, w, h); g.fill();
  g.beginPath(); g.moveTo(246, y0 + h); g.lineTo(266, y0 + h); g.lineTo(256, 196); g.fill();
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, 256, y0 + 38 + i * 44));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, color: 0xbdb6aa }));
  s.scale.set(1.8, 0.7, 1); s.renderOrder = 11;
  s.center.set(0.5, 0);
  return s;
}
