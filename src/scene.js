// 강변 포장마차 거리 (후쿠오카 나카스 야타이 거리의 구도 + 한국식 포차 감성)
// 좌표: 거리는 x축 방향, 강은 -z, 건물은 +z
import * as THREE from 'three';

export const STALL_COUNT = 8;
export const STALL_X = (i) => -42 + i * 12;
export const SEAT_OFFSETS = [-1.6, -0.8, 0, 0.8, 1.6];
export const SEAT_Z = -0.95;
export const COUNTER_Z = -1.6;
export const WALK = { minX: -58, maxX: 58, minZ: -0.55, maxZ: 11 };
// 걸을 수 있는 곳: 포차 앞 거리 + 포차 사이 길(x≈0) + 마로니에공원 안
export function walkable(x, z) {
  if (x < WALK.minX || x > WALK.maxX || z > WALK.maxZ || z < -38) return false;
  if (z >= WALK.minZ) return true;
  if (z >= -7.5) return Math.abs(x) < 2.9; // 포차 사이 길 (양옆은 포차·화단)
  if (z < STAGE.z + 0.5 && Math.hypot(x - STAGE.x, z - STAGE.z) < 6.3) return false; // 무대 위
  return true;
}
// 부딪히는 물체(원형 근사): 가로등·가로수·공원 나무·벤치·표석 등
export const OBSTACLES = [];
const ob = (x, z, r) => OBSTACLES.push({ x, z, r });
export const STAGE = { x: 0, z: -19 };
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
  // 그림자를 만드는 따뜻한 키 라이트 (포차 불빛 방향, 플레이어를 따라다님)
  const key = new THREE.DirectionalLight(0xffd2a0, high ? 1.1 : 0.6);
  key.position.set(6, 14, 10); scene.add(key); scene.add(key.target);
  if (high) {
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
  }
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
  sw2.rotation.x = -Math.PI / 2; sw2.position.set(0, 0.06, 10.5); sw2.receiveShadow = true; scene.add(sw2);
  const curb = new THREE.Mesh(new THREE.BoxGeometry(160, 0.15, 0.25), std(0x9c968e)); curb.position.set(0, 0.07, 9); scene.add(curb);

  const m4 = new THREE.Matrix4();
  const streaks = [];
  const winTex = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h; y += 10) for (let x = 5; x < w; x += 9) if (Math.random() < 0.4) { g.fillStyle = Math.random() < 0.8 ? `rgba(255,${200 + Math.random() * 50 | 0},140,0.9)` : 'rgba(150,200,255,0.9)'; g.fillRect(x, y, 5, 6); }
  });

  // ---------- 마로니에공원 (포차 뒤편, -z) ----------
  // 공원 바닥: 붉은 벽돌 포장
  const brickFloor = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#7a4a3c', 20);
    g.strokeStyle = 'rgba(40,20,15,0.5)'; g.lineWidth = 2;
    for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x <= w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
  });
  brickFloor.wrapS = brickFloor.wrapT = THREE.RepeatWrapping; brickFloor.repeat.set(40, 14);
  const park = new THREE.Mesh(new THREE.PlaneGeometry(200, 70), std(0xffffff, { map: brickFloor, roughness: 0.85 }));
  park.rotation.x = -Math.PI / 2; park.position.set(0, 0.01, -41); park.receiveShadow = true; scene.add(park);
  // 공원 경계: 낮은 화강석 턱 + 회양목 화단
  [-1, 1].forEach((sd) => { const ledge = new THREE.Mesh(new THREE.BoxGeometry(77, 0.4, 0.5), std(0x8d8a86, { roughness: 0.9 })); ledge.position.set(sd * 41.5, 0.2, -6.3); scene.add(ledge); });
  for (let x = -76; x <= 76; x += 8) { if (Math.abs(x) <= 4) continue; const hedge = new THREE.Mesh(new THREE.BoxGeometry(6, 0.7, 0.9), std(0x2f5a2a, { flatShading: true })); hedge.position.set(x, 0.55, -6.9); scene.add(hedge); }
  // 공원 표석
  const stone = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 0.8), std(0x9a958c, { roughness: 0.95 })); stone.position.set(-6, 0.7, -8.5); scene.add(stone); [-1.2, 0, 1.2].forEach((dx) => ob(-6 + dx, -8.5, 0.55));
  const stoneTxt = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.9), new THREE.MeshBasicMaterial({ map: canvasTex(512, 150, (g) => { g.clearRect(0, 0, 512, 150); g.font = `900 78px ${FONT}`; g.fillStyle = '#2b2622'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('마로니에공원', 256, 80); }), transparent: true }));
  stoneTxt.position.set(-6, 0.75, -8.09); scene.add(stoneTxt);

  // 마로니에 나무 (늦가을: 노랑·주황 잎)
  const trunkMat = std(0x4a3426, { roughness: 1, flatShading: true });
  const leafMats = [0xe8a33d, 0xd9822b, 0xf2c14e, 0xb5651d, 0x8a9a3a].map((c) => std(c, { roughness: 0.95, emissive: c, emissiveIntensity: 0.06 }));
  const trees = [];
  const treeSpots = [];
  for (let i = 0; i < 26; i++) treeSpots.push([-70 + i * 5.6 + Math.sin(i * 7) * 1.8, -10.5 - (i % 3) * 7 - Math.abs(Math.sin(i * 3)) * 3]);
  treeSpots.push([-30, -32], [-12, -36], [14, -35], [32, -33], [50, -36]);
  treeSpots.forEach(([x, z], i) => {
    if (Math.hypot(x - STAGE.x, z - STAGE.z) < 8 || (Math.abs(x) < 3.5 && z > STAGE.z)) return;
    const t = new THREE.Group();
    const h = 4.5 + (i % 4) * 0.9;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, h, 7), trunkMat); trunk.position.y = h / 2; t.add(trunk);
    for (let k = 0; k < 6; k++) {
      const r = 1.6 + ((i + k) % 3) * 0.5;
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, high ? 2 : 1), leafMats[(i + k) % leafMats.length]); blob.castShadow = high;
      blob.position.set(Math.cos(k * 1.3 + i) * 1.6, h + Math.sin(k * 2.1) * 0.9 + 0.6, Math.sin(k * 1.3 + i) * 1.6); t.add(blob);
    }
    t.position.set(x, 0, z); t.rotation.y = i; scene.add(t); trees.push(t); ob(x, z, 0.45);
  });
  // 바닥 낙엽
  const fallen = new THREE.InstancedMesh(new THREE.CircleGeometry(0.12, 5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), 1500);
  const col = new THREE.Color(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
  for (let i = 0; i < 1500; i++) {
    pos.set((Math.random() - 0.5) * 150, 0.03, -6 - Math.random() * 40 + (i < 300 ? Math.random() * 6 : 0));
    if (i < 300) pos.z = -6 + Math.random() * 15 - 3; // 거리 위에도 조금
    q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.random() * 6));
    m4.compose(pos, q, sc); fallen.setMatrixAt(i, m4); fallen.setColorAt(i, col.set([0xe8a33d, 0xc76b2a, 0xf2c14e, 0x9c5a2a][i % 4]));
  }
  scene.add(fallen);
  // 벤치 + 공원 가로등
  const benchMat = std(0x8a5a35), ironMat = std(0x2a2d36, { metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i < 10; i++) {
    const b = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.5), benchMat); seat.position.y = 0.45; b.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.06), benchMat); back.position.set(0, 0.75, -0.24); b.add(back);
    [-0.85, 0.85].forEach((x) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.45), ironMat); l.position.set(x, 0.22, 0); b.add(l); });
    b.position.set(-63 + i * 14, 0, -14.5 - (i % 2) * 6); if (Math.hypot(b.position.x - STAGE.x, b.position.z - STAGE.z) < 9) b.position.x += 10; scene.add(b); [-0.7, 0, 0.7].forEach((dx) => ob(b.position.x + dx, b.position.z, 0.4));
  }
  for (let i = 0; i < 9; i++) {
    let x = -64 + i * 16; const z = -18 - (i % 2) * 8; if (Math.abs(x - STAGE.x) < 8) x += 9;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 6), ironMat); pole.position.set(x, 1.8, z); scene.add(pole); ob(x, z, 0.2);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), basic(0xfff2d0)); globe.position.set(x, 3.75, z); scene.add(globe);
  }
  // 야외 공연장 (반원 지붕 무대)
  const stage = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.6, 24, 1, false, 0, Math.PI), std(0x6b6460)); deck.rotation.y = Math.PI / 2; deck.position.y = 0.3; stage.add(deck);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 12, 0, Math.PI, 0, Math.PI / 2), std(0xd8d2c8, { side: THREE.DoubleSide, roughness: 0.6 })); shell.rotation.y = Math.PI; shell.position.y = 0.6; stage.add(shell);
  const stageLight = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.06, 6, 40, Math.PI), basic(0xffc46b)); stageLight.position.y = 0.65; stage.add(stageLight);
  stage.position.set(STAGE.x, 0, STAGE.z); scene.add(stage);
  const stageLamp = new THREE.PointLight(0xffd6a0, 10, 14, 1.4); stageLamp.position.set(STAGE.x, 4.5, STAGE.z + 1.5); scene.add(stageLamp);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.1), new THREE.MeshBasicMaterial({ map: neonTexture('오늘 밤 버스킹 · 대학로 야외무대', '#ffd27a', 'rgba(20,10,30,0.8)'), toneMapped: false }));
  banner.position.set(STAGE.x, 7.0, STAGE.z + 0.1); scene.add(banner);

  // 붉은 벽돌 예술극장·미술관 건물 (대학로 특유의 벽돌 건축 느낌)
  const brickWall = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#8a3b26', 26);
    g.fillStyle = 'rgba(30,10,5,0.35)';
    for (let y = 0; y < h; y += 8) { g.fillRect(0, y, w, 1); for (let x = (y / 8) % 2 ? 0 : 8; x < w; x += 16) g.fillRect(x, y, 1, 8); }
  });
  brickWall.wrapS = brickWall.wrapT = THREE.RepeatWrapping;
  const backdrop = [];
  const mkBrick = (x, z, w, h, d) => {
    const t = brickWall.clone(); t.needsUpdate = true; t.repeat.set(w / 4, h / 4);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(0xffffff, { map: t, roughness: 0.95 }));
    b.position.set(x, h / 2, z); scene.add(b); backdrop.push(b);
    // 띠창 (가로로 긴 창)
    for (let k = 0; k < Math.floor(h / 5); k++) { const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 0.7), basic(k % 2 ? 0xffd9a0 : 0x2a2433, { transparent: true, opacity: 0.85 })); win.position.set(x, 2.5 + k * 5, z + d / 2 + 0.02); scene.add(win); backdrop.push(win); }
    return b;
  };
  mkBrick(-38, -46, 30, 13, 14); mkBrick(-12, -50, 18, 17, 12); mkBrick(26, -47, 34, 11, 16); mkBrick(58, -44, 16, 15, 12);
  const theaterSign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.3), new THREE.MeshBasicMaterial({ map: neonTexture('예술극장 · 오늘 공연 19:30', '#ffe8b0', 'rgba(0,0,0,0)'), toneMapped: false, transparent: true }));
  theaterSign.position.set(-38, 9.5, -38.9); scene.add(theaterSign); backdrop.push(theaterSign);
  const museumSign = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.2), new THREE.MeshBasicMaterial({ map: neonTexture('미술관 · 야간 개관', '#ffe8b0', 'rgba(0,0,0,0)'), toneMapped: false, transparent: true }));
  museumSign.position.set(26, 8, -38.9); scene.add(museumSign); backdrop.push(museumSign);
  // 멀리 낙산 쪽 언덕 불빛
  const farMat = new THREE.MeshStandardMaterial({ color: 0x10131f, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.6 });
  for (let i = 0; i < 26; i++) { const h = 6 + Math.random() * 18, w = 6 + Math.random() * 8; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 8), farMat); b.position.set(-100 + i * 8, h / 2 + 2 + Math.sin(i * 0.4) * 4, -85 - Math.random() * 15); scene.add(b); }

  // ---------- 길 건너 대학로 (소극장 거리) ----------
  const shops = ['소극장 별빛', '극단 봄날', '사주카페', '코인노래방', '24시 편의점', '연극 할인티켓', '소극장 나무', '닭갈비', '방탈출카페', '오락실', '버스킹 카페', '즉석떡볶이', '소극장 달'];
  const neonColors = ['#4dd2ff', '#ff4dd2', '#ffd43b', '#ff6b35', '#69db7c', '#b197fc'];
  const posterColors = ['#ff6b6b', '#4dabf7', '#ffd43b', '#9775fa', '#63e6be', '#ff922b', '#f783ac'];
  const neons = [], shopSigns = [], shopBuildings = [];
  for (let i = 0; i < 13; i++) {
    const x = -66 + i * 11;
    if (Math.abs(x - 28) < 3) continue; // 혜화역 출구 자리
    const h = 9 + Math.random() * 14;
    const brickish = i % 3 === 1;
    const b = new THREE.Mesh(new THREE.BoxGeometry(10.4, h, 7), new THREE.MeshStandardMaterial({ color: brickish ? 0x5a2a20 : 0x1b1d2a, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.5, roughness: 0.9 }));
    b.position.set(x, h / 2, 15.5); scene.add(b); shopBuildings.push({ mesh: b, color: b.material.color.getHex() });
    const shop = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 2.6), basic(i % 3 === 0 ? 0xfff2cc : 0xffe3b0, { transparent: true, opacity: 0.55 }));
    shop.position.set(x, 1.5, 11.95); shop.rotation.y = Math.PI; scene.add(shop);
    const c = neonColors[i % neonColors.length];
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.6), new THREE.MeshBasicMaterial({ map: neonTexture(shops[i % shops.length], c, 'rgba(10,10,20,0.85)'), toneMapped: false }));
    sign.position.set(x, 3.6, 11.9); sign.rotation.y = Math.PI; scene.add(sign); neons.push(sign); shopSigns.push({ mesh: sign, text: shops[i % shops.length], color: c, map: sign.material.map });
    // 연극 포스터 벽
    for (let k = 0; k < 4; k++) {
      const pc = posterColors[(i + k) % posterColors.length];
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), new THREE.MeshBasicMaterial({ map: canvasTex(90, 130, (g) => { g.fillStyle = pc; g.fillRect(0, 0, 90, 130); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(8, 80, 74, 6); g.fillRect(8, 92, 50, 4); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(45, 42, 22, 0, 7); g.fill(); }), toneMapped: false }));
      poster.position.set(x - 4.6 + k * 1, 5.4, 11.93); poster.rotation.y = Math.PI; scene.add(poster);
    }
  }
  // 혜화역 출구 (4호선 하늘색)
  const exit = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 2.6), basic(0x05060a)); hole.position.set(0, 0.02, 0.3); exit.add(hole);
  for (let k = 0; k < 6; k++) { const step = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.5), std(0x8a8f99)); step.position.set(0, -0.1 - k * 0.25, -0.8 + k * 0.4); exit.add(step); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 4.2), new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.2 })); roof.position.set(0, 2.7, 0.2); exit.add(roof);
  [[-1.8, -1.8], [1.8, -1.8], [-1.8, 2.1], [1.8, 2.1]].forEach(([px, pz]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.7, 6), std(0x9aa3b5, { metalness: 0.7 })); p.position.set(px, 1.35, pz); exit.add(p); });
  const stnSign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: canvasTex(512, 128, (g) => {
    g.fillStyle = '#f8fbff'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#00a5de'; g.beginPath(); g.arc(64, 64, 44, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = `900 60px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('4', 64, 68);
    g.fillStyle = '#1a2233'; g.font = `900 62px ${FONT}`; g.textAlign = 'left'; g.fillText('혜화', 130, 52);
    g.font = `600 28px ${FONT}`; g.fillStyle = '#556'; g.fillText('Hyehwa · 대학로 2번 출구', 132, 102);
  }), toneMapped: false, side: THREE.DoubleSide }));
  stnSign.position.set(0, 3.15, -1.9); stnSign.rotation.y = Math.PI; exit.add(stnSign);
  exit.position.set(28, 0.06, 11.0); scene.add(exit); [26.8, 28, 29.2].forEach((x) => ob(x, 11.2, 0.75));
  const exitGlow = new THREE.PointLight(0xbfe3ff, 4, 8, 1.5); exitGlow.position.set(28, 2.4, 10.6); scene.add(exitGlow);
  // 가로등 + 은행나무 가로수(길 건너)
  for (let x = -55; x <= 55; x += 22) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.5, 6), std(0x30333f, { metalness: 0.6 }));
    pole.position.set(x, 2.75, 9.4); scene.add(pole); ob(x, 9.4, 0.2);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), basic(0xfff0c8)); lamp.position.set(x, 5.5, 9.1); scene.add(lamp);
  }
  const ginkgo = std(0xf5c518, { flatShading: true, emissive: 0xf5c518, emissiveIntensity: 0.12 });
  for (let x = -60; x <= 60; x += 11) {
    if (Math.abs(x + 5.5 - 28) < 4 || Math.abs(x + 5.5) < 3) continue;
    const t = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 3.4, 6), trunkMat); tr.position.y = 1.7; t.add(tr);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.6, 7), ginkgo); cone.position.y = 4.4; t.add(cone);
    t.position.set(x + 5.5, 0, 10.2); scene.add(t); ob(x + 5.5, 10.2, 0.3);
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

  const bungeo = buildBungeoCart(scene);
  // 테마에 따라 도시 외형 바꾸기 (간판 문구·건물 색·바닥·나무 색·공원 배경)
  const leafBase = leafMats.map((m) => m.color.getHex());
  const parkBase = park.material.color.getHex();
  function setCityLook(th) {
    shopSigns.forEach((sg, i) => {
      if (sg.mesh.material.map !== sg.map) sg.mesh.material.map.dispose();
      if (th && th.signs?.length) { const col = th.signColors?.[i % th.signColors.length] || sg.color; sg.mesh.material.map = neonTexture(th.signs[i % th.signs.length], col, 'rgba(10,10,20,0.85)'); }
      else sg.mesh.material.map = sg.map;
      sg.mesh.material.needsUpdate = true;
    });
    shopBuildings.forEach((b) => b.mesh.material.color.set(th?.buildingColor || b.color));
    leafMats.forEach((m, i) => { const c = th?.leaves?.length ? th.leaves[i % th.leaves.length] : leafBase[i]; m.color.set(c); m.emissive.set(c); });
    park.material.color.set(th?.ground || parkBase);
    const hideBackdrop = !!(th && th.set && th.set !== 'none' && th.set !== 'festival');
    backdrop.forEach((o) => { o.visible = !hideBackdrop; });
  }
  return { key, setCityLook, bulbs, stalls, weather, bungeo, sky: skyMat, stars, moon, neons, streaks, hemi, moonLight, streetMat, fog: scene.fog };
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
  counter.position.set(0, 0.48, COUNTER_Z - 0.2); counter.castShadow = true; counter.receiveShadow = true; g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.06, 0.95), wood); top.position.set(0, 0.98, COUNTER_Z - 0.1); top.receiveShadow = true; top.castShadow = true; g.add(top);
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
  const light = new THREE.PointLight(0xffb35c, high ? 6.5 : 7, 10, 1.3); light.position.set(-0.4, 2.7, -0.9); g.add(light);
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
  const leaves = mk(700, 0xf2a03d, 0.16);
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

const BASE = { wood: 'leaves', fire: 'embers', earth: 'fog', metal: 'snow', water: 'rain' };
export function themeWeather(th) {
  const P = {
    clear: { rain: 0, snow: 0, leaves: 0, embers: 0, haze: 0.15, moon: 0.9, warm: 0.5 },
    rain: { rain: 1, snow: 0, leaves: 0, embers: 0, haze: 0.5, moon: 0, warm: 0.2 },
    snow: { rain: 0, snow: 1, leaves: 0, embers: 0, haze: 0.3, moon: 0.9, warm: 0.4 },
    fog: { rain: 0, snow: 0, leaves: 0, embers: 0.1, haze: 1.5, moon: 0.3, warm: 0.5 },
    petals: { rain: 0, snow: 0, leaves: 1, embers: 0, haze: 0.2, moon: 0.7, warm: 0.6, leafColor: 0xffb3cf },
    leaves: { rain: 0, snow: 0, leaves: 1, embers: 0, haze: 0.2, moon: 0.5, warm: 0.5 },
    embers: { rain: 0, snow: 0, leaves: 0, embers: 1, haze: 0.1, moon: 0.5, warm: 1 },
  }[th.weather] || {};
  return { ...P, sky: [new THREE.Color(th.sky[0]).getHex(), new THREE.Color(th.sky[1]).getHex()], fog: new THREE.Color(th.fog).getHex(), bulb: th.bulb };
}
void BASE;
export function updateWeather(w, world, el, dt, now) {
  const T = typeof el === 'object' ? el : (WEATHER[el] || WEATHER.water);
  const c = w.cur;
  const k = Math.min(1, dt * 0.6);
  ['rain', 'snow', 'leaves', 'embers', 'haze', 'moon', 'warm'].forEach((key) => { c[key] += (T[key] - c[key]) * k; });
  w.rain.material.opacity = c.rain * 0.45;
  w.snow.material.opacity = c.snow * 0.9;
  w.leaves.material.opacity = c.leaves * 0.85;
  w.leaves.material.color.lerp(new THREE.Color(T.leafColor || 0xf2a03d), k);
  world.bulbs.material.color.lerp(new THREE.Color(T.bulb || 0xffd89a), k);
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

// ---------------- 붕어빵 노점 ----------------
export const BUNGEO_POS = { x: -24, z: -2.7 }; // 포차 사이 인도 위
function fishMesh(color = 0xc98a3a) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), m); body.scale.set(1.5, 0.9, 0.35); g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 4), m); tail.rotation.z = Math.PI / 2; tail.position.x = -0.22; g.add(tail);
  return g;
}
export { fishMesh };
function buildBungeoCart(scene) {
  const g = new THREE.Group();
  const red = std(0xd9342b, { roughness: 0.5 }), white = std(0xf4f1ea), steel = std(0xb9bec8, { metalness: 0.7, roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 1.2), red); body.position.y = 0.6; g.add(body);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.06, 1.3), steel); counter.position.y = 1.12; g.add(counter);
  // 붕어빵 틀
  const mold = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.6), std(0x2a2a2e, { metalness: 0.6 })); mold.position.set(-0.4, 1.21, 0); g.add(mold);
  // 진열대 (유리 + 붕어빵)
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05 })); glass.position.set(0.75, 1.33, 0); g.add(glass);
  for (let k = 0; k < 6; k++) { const f = fishMesh(); f.position.set(0.5 + (k % 3) * 0.25, 1.22, -0.12 + Math.floor(k / 3) * 0.24); f.rotation.x = -Math.PI / 2; g.add(f); }
  const warm = new THREE.PointLight(0xffb060, 4, 5, 1.6); warm.position.set(0.6, 1.8, 0.4); g.add(warm);
  // 줄무늬 차양
  const stripe = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 128; c.height = 16; const x = c.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#e03131'; x.fillRect(i * 16, 0, 16, 16); } return c; })());
  stripe.colorSpace = THREE.SRGBColorSpace;
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6), new THREE.MeshStandardMaterial({ map: stripe, side: THREE.DoubleSide, roughness: 0.7 }));
  awning.rotation.x = -Math.PI / 2 + 0.35; awning.position.set(0, 2.35, -0.1); g.add(awning);
  [[-1.35, 0.55], [1.35, 0.55], [-1.35, -0.55], [1.35, -0.55]].forEach(([px, pz]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6), steel); p.position.set(px, 1.75, pz); g.add(p); });
  // 손글씨 간판
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.55), new THREE.MeshBasicMaterial({ map: canvasTex(512, 118, (c) => {
    c.fillStyle = '#fff8e6'; c.fillRect(0, 0, 512, 118);
    c.fillStyle = '#c92a2a'; c.font = `900 58px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('붕어빵 3개 2,000원', 256, 50);
    c.fillStyle = '#5c3d00'; c.font = `700 28px ${FONT}`; c.fillText('팥 · 슈크림 · 피자', 256, 98);
  }), toneMapped: false, side: THREE.DoubleSide }));
  sign.position.set(0, 2.62, -0.85); sign.rotation.set(-0.15, Math.PI, 0); g.add(sign);
  // 김
  const steamTex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
  const steam = [];
  for (let k = 0; k < 4; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0.4 })); g.add(s); steam.push({ s, t: k / 4 }); }
  g.rotation.y = Math.PI; // 간판이 거리(+z) 쪽을 보게
  g.position.set(BUNGEO_POS.x, 0, BUNGEO_POS.z); scene.add(g);
  return { group: g, steam, owner: null };
}

// ---------------- 테이블 위 주문 음식 ----------------
export const MENU = {
  drinks: [
    { id: 'soju', name: '소주', price: 5000, emoji: '🍶' },
    { id: 'makgeolli', name: '막걸리', price: 5000, emoji: '🫖' },
    { id: 'beer', name: '생맥주', price: 4500, emoji: '🍺' },
    { id: 'cider', name: '사이다', price: 2500, emoji: '🥤' },
    { id: 'tea', name: '따뜻한 보리차', price: 0, emoji: '🍵' },
  ],
  food: [
    { id: 'eomuk', name: '어묵탕', price: 12000, emoji: '🍢', el: 'water' },
    { id: 'tteok', name: '떡볶이', price: 9000, emoji: '🌶️', el: 'fire' },
    { id: 'egg', name: '계란말이', price: 10000, emoji: '🥚', el: 'earth' },
    { id: 'jeon', name: '부추전', price: 11000, emoji: '🥬', el: 'wood' },
    { id: 'tofu', name: '두부김치', price: 13000, emoji: '🧈', el: 'metal' },
    { id: 'gizzard', name: '닭똥집', price: 14000, emoji: '🍗' },
    { id: 'ramen', name: '포차 라면', price: 5000, emoji: '🍜' },
  ],
};
export const MENU_BY_ID = Object.fromEntries([...MENU.drinks, ...MENU.food].map((m) => [m.id, m]));
export const SNACK_BY_EL = { water: 'eomuk', fire: 'tteok', earth: 'egg', wood: 'jeon', metal: 'tofu' };

export function itemMesh(id) {
  const g = new THREE.Group();
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  const plate = () => add(new THREE.CylinderGeometry(0.19, 0.15, 0.03, 16), M(0xf8f8f8), 0, 0.015, 0);
  const bowl = (c) => { add(new THREE.CylinderGeometry(0.16, 0.1, 0.1, 14), M(0xe9e2d6), 0, 0.05, 0); add(new THREE.CircleGeometry(0.15, 14), M(c, { emissive: c, emissiveIntensity: 0.15 }), 0, 0.1, 0).rotation.x = -Math.PI / 2; };
  switch (id) {
    case 'soju':
      add(new THREE.CylinderGeometry(0.045, 0.05, 0.24, 10), M(0x2f9e44, { transparent: true, opacity: 0.85, roughness: 0.1 }), 0, 0.12, 0);
      add(new THREE.CylinderGeometry(0.02, 0.03, 0.06, 8), M(0x2f9e44, { transparent: true, opacity: 0.85 }), 0, 0.27, 0);
      add(new THREE.CylinderGeometry(0.03, 0.025, 0.05, 8), M(0xffffff, { transparent: true, opacity: 0.5, roughness: 0.05 }), 0.1, 0.025, 0.04);
      break;
    case 'makgeolli': // 노란 양은 주전자 + 사발
      add(new THREE.CylinderGeometry(0.09, 0.11, 0.17, 12), M(0xf2c14e, { metalness: 0.6, roughness: 0.3 }), 0, 0.085, 0);
      add(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 6), M(0xf2c14e, { metalness: 0.6 }), 0.12, 0.13, 0).rotation.z = -0.8;
      add(new THREE.CylinderGeometry(0.07, 0.05, 0.05, 12), M(0xf2c14e, { metalness: 0.6, roughness: 0.3 }), -0.05, 0.025, 0.16);
      break;
    case 'beer':
      add(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12), M(0xf0a020, { transparent: true, opacity: 0.85, roughness: 0.1, emissive: 0x804000, emissiveIntensity: 0.2 }), 0, 0.09, 0);
      add(new THREE.CylinderGeometry(0.062, 0.062, 0.04, 12), M(0xfffaf0), 0, 0.2, 0);
      break;
    case 'cider':
      add(new THREE.CylinderGeometry(0.04, 0.045, 0.22, 10), M(0xcff4d2, { transparent: true, opacity: 0.6, roughness: 0.05 }), 0, 0.11, 0);
      add(new THREE.CylinderGeometry(0.02, 0.03, 0.05, 8), M(0x2b8a3e), 0, 0.245, 0);
      break;
    case 'tea':
      add(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 10), M(0xf1e6d0), 0, 0.045, 0);
      break;
    case 'eomuk': bowl(0xb5651d); for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 4), M(0xd9b38c), -0.05 + k * 0.03, 0.2, 0).rotation.z = 0.3; break;
    case 'ramen': bowl(0xe8a33d); break;
    case 'tteok': plate(); for (let k = 0; k < 7; k++) add(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6), M(0xe8452c, { emissive: 0x801000, emissiveIntensity: 0.2 }), Math.cos(k) * 0.08, 0.04, Math.sin(k * 2) * 0.06).rotation.z = Math.PI / 2 + k; break;
    case 'egg': plate(); for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.06, 0.06, 0.12), M(0xf5c542), -0.1 + k * 0.065, 0.05, 0); break;
    case 'jeon': plate(); add(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 16), M(0x8bc34a, { emissive: 0x2a4a10, emissiveIntensity: 0.2 }), 0, 0.04, 0); break;
    case 'tofu': plate(); for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.06, 0.04, 0.06), M(0xf4f1ea), -0.08 + (k % 2) * 0.07, 0.04, (k > 1 ? 0.05 : -0.05)); add(new THREE.SphereGeometry(0.06, 6, 4), M(0xc0392b), 0.09, 0.05, 0); break;
    case 'gizzard': plate(); for (let k = 0; k < 8; k++) add(new THREE.DodecahedronGeometry(0.035, 0), M(0x8a4b2a), Math.cos(k) * 0.08, 0.05, Math.sin(k) * 0.07); break;
    case 'bungeo': { add(new THREE.BoxGeometry(0.2, 0.02, 0.14), M(0xd8c3a5), 0, 0.01, 0); for (let k = 0; k < 3; k++) { const f = fishMesh(); f.rotation.x = -Math.PI / 2; f.position.set(0, 0.04 + k * 0.02, -0.03 + k * 0.03); f.scale.setScalar(0.6); g.add(f); } break; }
    default: plate();
  }
  return g;
}
