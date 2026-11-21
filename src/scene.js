// 강변 포장마차 거리 (후쿠오카 나카스 야타이 거리의 구도 + 한국식 포차 감성)
// 좌표: 거리는 x축 방향, 강은 -z, 건물은 +z
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

export const STALL_COUNT = 8;
export const STALL_X = (i) => -42 + i * 12;
export const SEAT_OFFSETS = [-1.6, -0.8, 0, 0.8, 1.6];
export const SEAT_Z = -0.95;
export const COUNTER_Z = -1.6;
export const WALK = { minX: -58, maxX: 58, minZ: -0.55, maxZ: 9 };
export const DEFAULT_STALL_NAMES = ['두시포차', '이모네', '원조 어묵', '달빛 포차', '오행집', '골목 끝 포차', '비오는날', '첫차까지'];
export const TARP_COLORS = ['#ff7a1a', '#ff5d3a', '#2f7bff', '#ff7a1a', '#e8590c', '#ff7a1a', '#1c7ed6', '#ff922b'];

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...o });

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData = { canvas: c };
  return t;
}
function noiseFill(g, w, h, base, amp) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
const FONT = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';

export function neonTexture(text, color = '#ff4d8d', bg = 'rgba(0,0,0,0)', w = 512, h = 128) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.font = `900 ${Math.floor(h * 0.62)}px ${FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = Math.floor(h * 0.62);
    while (g.measureText(text).width > w * 0.92 && size > 20) { size -= 4; g.font = `900 ${size}px ${FONT}`; }
    g.shadowColor = color; g.shadowBlur = 24; g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 4);
    g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.globalAlpha = 0.85; g.fillText(text, w / 2, h / 2 + 4);
  });
}

export function buildScene(scene, { high = true } = {}) {
  scene.background = new THREE.Color(0x070a18);
  scene.fog = new THREE.FogExp2(0x0b0f22, 0.012);

  const hemi = new THREE.HemisphereLight(0x8a96d6, 0x3a2a30, 1.25); scene.add(hemi);
  const fill = new THREE.DirectionalLight(0xffc48a, 0.9); fill.position.set(8, 10, 22); scene.add(fill);
  const moonLight = new THREE.DirectionalLight(0xbfd0ff, 0.5);
  moonLight.position.set(-30, 50, -40); scene.add(moonLight);

  // ---------- 하늘 ----------
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x03050f) }, bottom: { value: new THREE.Color(0x2a1f45) } },
    vertexShader: 'varying vec3 v; void main(){ v=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 v; void main(){ float h=clamp(v.y*1.6,0.,1.); gl_FragColor=vec4(mix(bottom,top,h),1.); }',
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), skyMat));
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) { const v = new THREE.Vector3().randomDirection(); v.y = Math.abs(v.y) * 0.8 + 0.15; v.normalize().multiplyScalar(380); sp.set([v.x, v.y, v.z], i * 3); }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7 }));
  scene.add(stars);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 32), basic(0xfff6dc, { fog: false, transparent: true }));
  moon.position.set(-60, 90, -300); moon.lookAt(0, 0, 0); scene.add(moon);

  // ---------- 바닥: 거리 + 인도 ----------
  const asphalt = canvasTex(512, 512, (g, w, h) => { noiseFill(g, w, h, '#26262e', 30); });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping; asphalt.repeat.set(30, 5);
  const streetMat = std(0x9a9aa8, { map: asphalt, roughness: 0.45, metalness: 0.25 });
  const street = new THREE.Mesh(new THREE.PlaneGeometry(160, 18), streetMat);
  street.rotation.x = -Math.PI / 2; street.position.set(0, 0, 3); street.receiveShadow = true; scene.add(street);
  const tile = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#6b6460', 18);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
  });
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(60, 3);
  const walkway = new THREE.Mesh(new THREE.PlaneGeometry(160, 6), std(0xffffff, { map: tile, roughness: 0.5, metalness: 0.15 }));
  walkway.rotation.x = -Math.PI / 2; walkway.position.set(0, 0.02, -3); walkway.receiveShadow = true; scene.add(walkway);
  // 건너편 인도
  const sw2 = new THREE.Mesh(new THREE.PlaneGeometry(160, 3), std(0xffffff, { map: tile, roughness: 0.6 }));
  sw2.rotation.x = -Math.PI / 2; sw2.position.set(0, 0.06, 10.5); scene.add(sw2);
  const curb = new THREE.Mesh(new THREE.BoxGeometry(160, 0.15, 0.25), std(0x9c968e)); curb.position.set(0, 0.07, 9); scene.add(curb);

  // ---------- 강 + 제방 + 난간 ----------
  const embank = new THREE.Mesh(new THREE.BoxGeometry(160, 3, 1.2), std(0x5c5852, { roughness: 0.95 }));
  embank.position.set(0, -1.5, -6.6); scene.add(embank);
  const railMat = std(0x9aa3b5, { metalness: 0.7, roughness: 0.35 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(160, 0.06, 0.06), railMat); rail.position.set(0, 1.0, -6.1); scene.add(rail);
  for (let x = -78; x <= 78; x += 2.5) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.06), railMat); p.position.set(x, 0.5, -6.1); scene.add(p); }
  let river;
  if (high) {
    river = new Reflector(new THREE.PlaneGeometry(200, 140), { textureWidth: 1024, textureHeight: 512, color: 0x3a4a6a, clipBias: 0.003 });
  } else {
    river = new THREE.Mesh(new THREE.PlaneGeometry(200, 140), std(0x0e1a33, { roughness: 0.2, metalness: 0.6 }));
  }
  river.rotation.x = -Math.PI / 2; river.position.set(0, -2.6, -77); scene.add(river);
  // 강물 위 빛 번짐 (가짜 반사 줄무늬)
  const streakTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,200,120,0)'); gr.addColorStop(0.5, 'rgba(255,200,120,0.6)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(w * 0.3, 0, w * 0.4, h); });
  const streaks = [];
  for (let i = 0; i < STALL_COUNT; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 14), new THREE.MeshBasicMaterial({ map: streakTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: TARP_COLORS[i] }));
    s.rotation.x = -Math.PI / 2; s.position.set(STALL_X(i), -2.55, -14); scene.add(s); streaks.push(s);
  }

  // ---------- 건너편 강변 도시 ----------
  const winTex = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h; y += 10) for (let x = 5; x < w; x += 9) if (Math.random() < 0.4) { g.fillStyle = Math.random() < 0.8 ? `rgba(255,${200 + Math.random() * 50 | 0},140,0.9)` : 'rgba(150,200,255,0.9)'; g.fillRect(x, y, 5, 6); }
  });
  const farMat = new THREE.MeshStandardMaterial({ color: 0x10131f, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.8 });
  for (let i = 0; i < 40; i++) {
    const h = 10 + Math.random() * 45, w = 6 + Math.random() * 10;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 8), farMat);
    b.position.set(-100 + i * 5 + Math.random() * 3, h / 2 - 2.5, -150 - Math.random() * 20); scene.add(b);
  }
  // 다리 (무지개 조명)
  const bridge = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 150), std(0x3a3d4a)); deck.position.set(0, 4, -75); bridge.add(deck);
  for (let z = -6; z > -150; z -= 18) { const pier = new THREE.Mesh(new THREE.BoxGeometry(2.2, 7, 2.2), std(0x4a4d5a)); pier.position.set(0, 0.5, z); bridge.add(pier); }
  const rainbow = ['#ff4d6d', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
  const lightStrip = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 6, 4), basic(0xffffff), 160);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < 160; i++) { m4.makeTranslation(i % 2 ? 3.1 : -3.1, 4.6, -6 - Math.floor(i / 2) * 1.8); lightStrip.setMatrixAt(i, m4); lightStrip.setColorAt(i, col.set(rainbow[Math.floor(i / 6) % 6])); }
  bridge.add(lightStrip);
  bridge.position.x = 64; scene.add(bridge);

  // ---------- 길 건너 건물 + 네온 간판 ----------
  const shops = ['24시 편의점', '코인노래방', '해장국', '호프·치킨', 'PC방', '사주카페', '24시 순대국', '오락실', '꽃집', '빨래방', '포장 떡볶이', '김밥천국'];
  const neonColors = ['#4dd2ff', '#ff4dd2', '#ffd43b', '#ff6b35', '#69db7c', '#b197fc'];
  const neons = [];
  for (let i = 0; i < 13; i++) {
    const x = -66 + i * 11;
    const h = 9 + Math.random() * 14;
    const b = new THREE.Mesh(new THREE.BoxGeometry(10.4, h, 7), new THREE.MeshStandardMaterial({ color: 0x1b1d2a, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.55, roughness: 0.9 }));
    b.position.set(x, h / 2, 15.5); scene.add(b);
    // 1층 가게 창 (따뜻한 빛)
    const shop = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 2.6), basic(i % 3 === 0 ? 0xfff2cc : 0xffe3b0, { transparent: true, opacity: 0.55 }));
    shop.position.set(x, 1.5, 11.95); shop.rotation.y = Math.PI; scene.add(shop);
    // 간판
    const c = neonColors[i % neonColors.length];
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.6), new THREE.MeshBasicMaterial({ map: neonTexture(shops[i % shops.length], c, 'rgba(10,10,20,0.85)'), toneMapped: false }));
    sign.position.set(x, 3.6, 11.9); sign.rotation.y = Math.PI; scene.add(sign); neons.push(sign);
    // 세로 돌출 간판
    if (i % 2 === 0) {
      const v = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 4), new THREE.MeshBasicMaterial({ map: canvasTex(64, 256, (g) => { g.fillStyle = '#111'; g.fillRect(0, 0, 64, 256); g.font = `900 46px ${FONT}`; g.fillStyle = neonColors[(i + 2) % 6]; g.shadowColor = g.fillStyle; g.shadowBlur = 14; g.textAlign = 'center'; '노래방술집'.slice(i % 3, i % 3 + 3).split('').forEach((ch, k) => g.fillText(ch, 32, 60 + k * 70)); }), toneMapped: false, side: THREE.DoubleSide }));
      v.position.set(x + 4.6, 7, 11.4); v.rotation.y = Math.PI / 2; scene.add(v);
    }
  }
  // 가로등
  for (let x = -55; x <= 55; x += 22) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.5, 6), std(0x30333f, { metalness: 0.6 }));
    pole.position.set(x, 2.75, 9.4); scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), basic(0xfff0c8)); lamp.position.set(x, 5.5, 9.1); scene.add(lamp);
  }

  // ---------- 전구 줄 (포차 위를 지그재그로) ----------
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4), basic(0xffd89a), 400);
  let bi = 0;
  for (let i = 0; i < STALL_COUNT - 1; i++) {
    const a = new THREE.Vector3(STALL_X(i) + 2.2, 3.2, -1.3), b = new THREE.Vector3(STALL_X(i + 1) - 2.2, 3.2, -1.3);
    for (let k = 0; k <= 12 && bi < 400; k++) { const t = k / 12; const p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * 0.6; m4.makeTranslation(p.x, p.y, p.z); bulbs.setMatrixAt(bi++, m4); }
  }
  for (let i = 0; i < STALL_COUNT; i++) {
    const a = new THREE.Vector3(STALL_X(i), 3.4, -1.2), b = new THREE.Vector3(STALL_X(i) + 3, 5.2, 11.5);
    for (let k = 0; k <= 22 && bi < 400; k++) { const t = k / 22; const p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * 1.2; m4.makeTranslation(p.x, p.y, p.z); bulbs.setMatrixAt(bi++, m4); }
  }
  bulbs.count = bi; scene.add(bulbs);

  // 포차 불빛이 젖은 바닥에 번지는 빛 웅덩이
  const poolTex = canvasTex(128, 128, (g2) => { const gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,190,120,0.28)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128); });
  for (let i = 0; i < STALL_COUNT; i++) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: TARP_COLORS[i] })); pl.rotation.x = -Math.PI / 2; pl.position.set(STALL_X(i), 0.04, 1.2); scene.add(pl); }
  for (let x = -55; x <= 55; x += 22) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0c8, opacity: 0.6 })); pl.rotation.x = -Math.PI / 2; pl.position.set(x, 0.03, 8); scene.add(pl); }

  // ---------- 포장마차 ----------
  const stalls = [];
  for (let i = 0; i < STALL_COUNT; i++) stalls.push(buildStall(scene, i, high));

  // ---------- 날씨 파티클 ----------
  const weather = buildWeather(scene);

  return { stalls, weather, sky: skyMat, stars, moon, neons, streaks, hemi, moonLight, streetMat, fog: scene.fog };
}

function buildStall(scene, i, high) {
  const x = STALL_X(i);
  const g = new THREE.Group(); g.position.set(x, 0, 0); scene.add(g);
  const tarp = new THREE.MeshStandardMaterial({ color: TARP_COLORS[i], roughness: 0.6, transparent: true, opacity: 0.92, emissive: TARP_COLORS[i], emissiveIntensity: 0.35, side: THREE.DoubleSide });
  // 기둥
  const poleM = std(0x8c8f9a, { metalness: 0.6, roughness: 0.4 });
  [[-2.3, -1.25], [2.3, -1.25], [-2.3, -5.2], [2.3, -5.2]].forEach(([px, pz]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.9, 6), poleM); p.position.set(px, 1.45, pz); g.add(p); });
  // 지붕 (경사진 천막)
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(5, 4.4), tarp);
  roof.rotation.x = -Math.PI / 2 + 0.18; roof.position.set(0, 3.05, -3.2); g.add(roof);
  // 앞 처마(간판 천)
  const signCanvas = document.createElement('canvas'); signCanvas.width = 512; signCanvas.height = 96;
  const signTex = new THREE.CanvasTexture(signCanvas); signTex.colorSpace = THREE.SRGBColorSpace;
  const valance = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.75), new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.4, side: THREE.DoubleSide }));
  valance.position.set(0, 2.75, -1.2); g.add(valance);
  // 비닐 천막 (옆·뒤, 반투명)
  const vinyl = new THREE.MeshStandardMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  [-2.3, 2.3].forEach((sx) => { const v = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.6), vinyl); v.rotation.y = Math.PI / 2; v.position.set(sx, 1.4, -3.2); g.add(v); });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6), new THREE.MeshStandardMaterial({ color: TARP_COLORS[i], transparent: true, opacity: 0.6, emissive: TARP_COLORS[i], emissiveIntensity: 0.25, side: THREE.DoubleSide }));
  back.position.set(0, 1.4, -5.2); g.add(back);
  // 카운터 (나무)
  const wood = std(0x8a5a35, { roughness: 0.6 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.95, 0.7), std(0x5b3c26));
  counter.position.set(0, 0.48, COUNTER_Z - 0.2); counter.castShadow = true; g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.06, 0.95), wood); top.position.set(0, 0.98, COUNTER_Z - 0.1); g.add(top);
  // 조리대 + 어묵 냄비 + 김
  const stove = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.7), std(0x9aa0aa, { metalness: 0.7, roughness: 0.3 })); stove.position.set(-1.1, 0.45, -3.4); g.add(stove);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.32, 16), std(0xc0c6d0, { metalness: 0.8, roughness: 0.25 })); pot.position.set(-1.1, 1.06, -3.4); g.add(pot);
  const soup = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), std(0xb5651d, { roughness: 0.3, emissive: 0x3a1a05 })); soup.rotation.x = -Math.PI / 2; soup.position.set(-1.1, 1.2, -3.4); g.add(soup);
  for (let k = 0; k < 5; k++) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), std(0xd9b38c)); sk.position.set(-1.25 + k * 0.07, 1.35, -3.4 + (k % 2) * 0.1); sk.rotation.z = 0.2; g.add(sk); }
  // 선반 + 초록 병
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.4), wood); shelf.position.set(1.1, 1.7, -5.0); g.add(shelf);
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.32, 8), std(0x2f9e44, { transparent: true, opacity: 0.85, roughness: 0.15 })); b.position.set(0.4 + k * 0.28, 1.9, -5.0); g.add(b); }
  // 전구 + 조명
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), basic(0xffd27a)); bulb.position.set(-0.9, 2.6, -2.9); g.add(bulb);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 4), std(0x111111)); cord.position.set(-0.9, 2.82, -2.9); g.add(cord);
  const light = new THREE.PointLight(0xffb35c, high ? 9 : 7, 10, 1.3); light.position.set(-0.4, 2.7, -0.9); g.add(light);
  // 의자 (빨강·파랑 플라스틱)
  const seats = SEAT_OFFSETS.map((ox, k) => {
    const st = new THREE.Group();
    const c = k % 2 ? 0x1c7ed6 : 0xe03131;
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.06, 12), std(c, { roughness: 0.4 })); seat.position.y = 0.45; st.add(seat);
    for (let l = 0; l < 4; l++) { const a = (l / 4) * Math.PI * 2 + 0.78; const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.45, 5), std(c, { roughness: 0.4 })); leg.position.set(Math.cos(a) * 0.15, 0.22, Math.sin(a) * 0.15); st.add(leg); }
    st.position.set(ox, 0, SEAT_Z); g.add(st);
    return { stall: i, index: k, x: x + ox, z: SEAT_Z, mesh: st, food: null };
  });
  // 김 (스프라이트)
  const steamTex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
  const steam = [];
  for (let k = 0; k < 6; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0.4 })); s.position.set(x - 1.1, 1.3, -3.4); s.scale.setScalar(0.6); scene.add(s); steam.push({ s, t: k / 6 }); }

  const stall = { i, x, group: g, valance, signCanvas, signTex, tarp, back, light, bulb, seats, steam, counselor: null, nameTag: null, style: null };
  drawStallSign(stall, DEFAULT_STALL_NAMES[i], '#fff3d6');
  return stall;
}

export function drawStallSign(stall, name, color = '#fff3d6') {
  const g = stall.signCanvas.getContext('2d');
  g.clearRect(0, 0, 512, 96);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 512, 96);
  let size = 64; g.font = `900 ${size}px ${FONT}`;
  while (g.measureText(name).width > 470 && size > 26) { size -= 4; g.font = `900 ${size}px ${FONT}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = 'rgba(60,20,0,0.6)'; g.strokeText(name, 256, 52);
  g.fillStyle = color; g.fillText(name, 256, 52);
  stall.signTex.needsUpdate = true;
}

/** 포차 천막 색 바꾸기 */
export function setStallColor(stall, hex) {
  stall.tarp.color.set(hex); stall.tarp.emissive.set(hex);
  stall.back.material.color.set(hex); stall.back.material.emissive.set(hex);
}

// ---------------- 날씨 ----------------
function buildWeather(scene) {
  const N = 5000;
  // 비: 선분
  const rg = new THREE.BufferGeometry();
  const rp = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) { const x = (Math.random() - 0.5) * 140, y = Math.random() * 30, z = -10 + Math.random() * 30; rp.set([x, y, z, x + 0.05, y + 0.6, z], i * 6); }
  rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaac8ff, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(rain);
  // 눈·잎·불티: 포인트
  const mk = (n, color, size) => {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 120, Math.random() * 25, -10 + Math.random() * 28], i * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true }));
    scene.add(pts);
    return pts;
  };
  const snow = mk(2500, 0xffffff, 0.12);
  const leaves = mk(500, 0x8ce99a, 0.14);
  const embers = mk(600, 0xff8a3a, 0.09);
  embers.material.blending = THREE.AdditiveBlending;
  return { rain, snow, leaves, embers, cur: { rain: 0, snow: 0, leaves: 0, embers: 0, haze: 0, moon: 0.6, warm: 0 }, target: null };
}

// 오행 → 날씨 파라미터
export const WEATHER = {
  wood:  { rain: 0.35, snow: 0, leaves: 1, embers: 0, haze: 0.2, moon: 0.2, warm: 0.2, sky: [0x02100a, 0x163a2a], fog: 0x0b1a14 },
  fire:  { rain: 0, snow: 0, leaves: 0, embers: 1, haze: 0.1, moon: 0.4, warm: 1, sky: [0x12040a, 0x4a1a1a], fog: 0x1a0c0c },
  earth: { rain: 0, snow: 0, leaves: 0, embers: 0.2, haze: 1, moon: 0.7, warm: 0.6, sky: [0x120a04, 0x5a3a20], fog: 0x2a1c12 },
  metal: { rain: 0, snow: 1, leaves: 0, embers: 0, haze: 0.3, moon: 1, warm: 0.3, sky: [0x060a18, 0x3a4a6a], fog: 0x1a2030 },
  water: { rain: 1, snow: 0, leaves: 0, embers: 0, haze: 0.5, moon: 0, warm: 0.1, sky: [0x02040c, 0x16203a], fog: 0x0a1020 },
};

export function updateWeather(w, world, el, dt, now) {
  const T = WEATHER[el] || WEATHER.water;
  const c = w.cur;
  const k = Math.min(1, dt * 0.6);
  ['rain', 'snow', 'leaves', 'embers', 'haze', 'moon', 'warm'].forEach((key) => { c[key] += (T[key] - c[key]) * k; });
  w.rain.material.opacity = c.rain * 0.45;
  w.snow.material.opacity = c.snow * 0.9;
  w.leaves.material.opacity = c.leaves * 0.85;
  w.embers.material.opacity = c.embers;
  world.moon.material.opacity = c.moon;
  world.stars.material.opacity = 0.15 + c.moon * 0.6;
  world.sky.uniforms.top.value.lerp(new THREE.Color(T.sky[0]), k);
  world.sky.uniforms.bottom.value.lerp(new THREE.Color(T.sky[1]), k);
  world.fog.color.lerp(new THREE.Color(T.fog), k);
  world.fog.density = 0.008 + c.haze * 0.02 + c.rain * 0.006;
  world.streetMat.roughness = 0.55 - c.rain * 0.4;
  world.stalls.forEach((s) => { s.light.intensity = (s.baseLight || 8) * (0.8 + c.warm * 0.5); });
  // 파티클 이동
  const move = (pts, fn) => { const a = pts.geometry.attributes.position.array; for (let i = 0; i < a.length; i += 3) fn(a, i); pts.geometry.attributes.position.needsUpdate = true; };
  if (c.rain > 0.02) {
    const a = w.rain.geometry.attributes.position.array;
    for (let i = 0; i < a.length; i += 6) { a[i + 1] -= 28 * dt; a[i + 4] -= 28 * dt; if (a[i + 1] < 0) { a[i + 1] += 30; a[i + 4] += 30; } }
    w.rain.geometry.attributes.position.needsUpdate = true;
  }
  if (c.snow > 0.02) move(w.snow, (a, i) => { a[i + 1] -= 1.2 * dt; a[i] += Math.sin(now / 900 + i) * 0.01; if (a[i + 1] < 0) a[i + 1] += 25; });
  if (c.leaves > 0.02) move(w.leaves, (a, i) => { a[i + 1] -= 0.8 * dt; a[i] += Math.sin(now / 600 + i) * 0.02 + 0.6 * dt; if (a[i + 1] < 0) a[i + 1] += 25; if (a[i] > 60) a[i] -= 120; });
  if (c.embers > 0.02) move(w.embers, (a, i) => { a[i + 1] += 0.9 * dt; a[i] += Math.sin(now / 400 + i) * 0.008; if (a[i + 1] > 12) a[i + 1] = 0; });
}
