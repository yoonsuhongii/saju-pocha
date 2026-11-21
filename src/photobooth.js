// 사주네컷 포토부스: 대학로 인도 위 부스 + 4컷 촬영 + 사주포차 로고 프레임
import * as THREE from 'three';

export const BOOTH = { x: 40, z: 11.3 }; // 부스 뒤벽 중심 (건물 앞)
const FONT = '"Pretendard Variable","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

/** 부스 안 (사진에 찍히는 자리) */
export function inBooth(x, z) { return Math.abs(x - BOOTH.x) < 1.65 && z > BOOTH.z - 1.9 && z < BOOTH.z + 0.2; }

// 사주포차 로고 (등불 + 글자)
export function drawLogo(g, cx, cy, s = 1, light = true) {
  g.save(); g.translate(cx, cy); g.scale(s, s);
  // 등불
  g.fillStyle = '#3a2a1a'; g.fillRect(-4, -46, 8, 10);
  const gr = g.createRadialGradient(0, -6, 4, 0, -6, 34); gr.addColorStop(0, '#ffd27a'); gr.addColorStop(0.6, '#ff7a1a'); gr.addColorStop(1, '#c2410c');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, -6, 26, 32, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(120,40,0,0.45)'; g.lineWidth = 2; [-14, 0, 14].forEach((x) => { g.beginPath(); g.ellipse(x * 0.6, -6, Math.abs(x) ? 10 : 2, 31, 0, 0, Math.PI * 2); g.stroke(); });
  g.fillStyle = '#3a2a1a'; g.fillRect(-12, -40, 24, 5); g.fillRect(-12, 23, 24, 5);
  g.fillStyle = '#fff4dc'; g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('福', 0, -5);
  // 글자
  g.fillStyle = light ? '#fff6ea' : '#2a1d0c'; g.font = `900 46px ${FONT}`; g.textAlign = 'left'; g.fillText('사주포차', 40, -10);
  g.font = `700 15px ${FONT}`; g.fillStyle = light ? 'rgba(255,240,220,0.75)' : 'rgba(42,29,12,0.7)'; g.fillText('SAJU POCHA · 대학로 2030', 42, 22);
  g.restore();
}

export function buildBooth(scene) {
  const g = new THREE.Group();
  const W = 3.6, D = 2.2, H = 2.8;
  // 뒤벽: 파스텔 별무늬 배경 (사진 배경)
  const bgTex = tex(512, 400, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ffd6e0'); gr.addColorStop(0.5, '#ffe9c7'); gr.addColorStop(1, '#d6e4ff'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 40; i++) { const x = (i * 97) % w, y = (i * 61) % h; c.beginPath(); for (let k = 0; k < 5; k++) { const a = k * 1.2566 - Math.PI / 2; c.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); c.lineTo(x + Math.cos(a + 0.628) * 4, y + Math.sin(a + 0.628) * 4); } c.fill(); }
    c.globalAlpha = 0.18; drawLogo(c, 150, 210, 1.6, false); c.globalAlpha = 1;
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: bgTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: bgTex, emissiveIntensity: 0.22 }));
  back.position.set(0, H / 2, -0.2); back.rotation.y = Math.PI; g.add(back);
  // 옆벽 + 지붕 (진한 남색)
  const shell = std(0x1f2340, { roughness: 0.5 });
  [-1, 1].forEach((sd) => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, D), shell); w.position.set(sd * (W / 2 + 0.06), H / 2, -D / 2); w.castShadow = true; g.add(w); });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.18, D + 0.3), shell); roof.position.set(0, H + 0.09, -D / 2); g.add(roof);
  // 간판 (거리 쪽)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.3, 0.75), new THREE.MeshBasicMaterial({ toneMapped: false, map: tex(640, 140, (c, w, h) => {
    c.fillStyle = '#1f2340'; c.fillRect(0, 0, w, h);
    drawLogo(c, 70, 76, 0.95, true);
    c.fillStyle = '#ffd27a'; c.font = `900 44px ${FONT}`; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText('📸 사주네컷', w - 24, 70);
  }) }));
  sign.position.set(0, H + 0.6, -D - 0.16); sign.rotation.y = Math.PI; g.add(sign);
  // 링 라이트 + 카메라 (부스 앞 거리 쪽에 서 있는 기둥)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 12, 40), new THREE.MeshBasicMaterial({ color: 0xfff6e0, toneMapped: false }));
  ring.position.set(0, 1.45, -D - 1.4); g.add(ring);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.14, 16), std(0x111111, { metalness: 0.5 })); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.45, -D - 1.4); g.add(lens);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.45, 8), std(0x333333, { metalness: 0.6 })); stand.position.set(0, 0.72, -D - 1.4); g.add(stand);
  // 바닥 매트
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std(0xf4e8ff)); mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.07, -D / 2); mat.receiveShadow = true; g.add(mat);
  const fill = new THREE.PointLight(0xfff1e0, 1.6, 6, 1.5); fill.position.set(0, 2.2, -D - 0.8); g.add(fill);
  const flash = new THREE.PointLight(0xffffff, 0, 10, 1.2); flash.position.set(0, 1.5, -D - 1.3); g.add(flash);
  g.position.set(BOOTH.x, 0, BOOTH.z + 0.7); scene.add(g);
  // 사진 찍는 카메라 (링 라이트 위치)
  const cam = new THREE.PerspectiveCamera(36, 4 / 3, 0.1, 60);
  cam.position.set(BOOTH.x, 1.35, BOOTH.z + 0.7 - D - 1.4);
  cam.lookAt(BOOTH.x, 1.05, BOOTH.z);
  // 충돌용 옆벽 (원 근사)
  const walls = [];
  [-1, 1].forEach((sd) => { for (let k = 0; k < 3; k++) walls.push({ x: BOOTH.x + sd * (W / 2 + 0.06), z: BOOTH.z + 0.7 - 0.35 - k * 0.75, r: 0.32 }); });
  walls.push({ x: BOOTH.x, z: BOOTH.z + 0.7 - D - 1.4, r: 0.25 });
  return { group: g, cam, flash, walls };
}

/** 4컷 사진 띠 만들기 */
export function composeStrip(shots, { names = [], dominant = null, date = new Date() } = {}) {
  const PW = 440, PH = 330, PAD = 30, HEAD = 150, FOOT = 150;
  const c = document.createElement('canvas'); c.width = PW + PAD * 2; c.height = HEAD + shots.length * (PH + 18) + FOOT;
  const g = c.getContext('2d');
  const theme = { wood: ['#1f3a2a', '#2f5a3a'], fire: ['#3a1410', '#6a2418'], earth: ['#3a2a14', '#6a4a24'], metal: ['#2a2e3a', '#4a5064'], water: ['#101a3a', '#1e2f60'] }[dominant] || ['#1f2340', '#3a2a4a'];
  const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, theme[0]); gr.addColorStop(1, theme[1]); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  // 반짝이 점
  g.fillStyle = 'rgba(255,230,180,0.35)'; for (let i = 0; i < 60; i++) g.fillRect((i * 137) % c.width, (i * 251) % c.height, 2, 2);
  drawLogo(g, 70, 82, 1, true);
  shots.forEach((img, i) => {
    const y = HEAD + i * (PH + 18);
    g.fillStyle = '#fff'; g.fillRect(PAD - 4, y - 4, PW + 8, PH + 8);
    g.drawImage(img, PAD, y, PW, PH);
  });
  const fy = HEAD + shots.length * (PH + 18) + 10;
  g.fillStyle = '#fff6ea'; g.font = `800 22px ${FONT}`; g.textAlign = 'center';
  g.fillText(names.slice(0, 6).join(' · ') || '오늘 밤의 손님', c.width / 2, fy + 36);
  g.font = `600 16px ${FONT}`; g.fillStyle = 'rgba(255,240,220,0.75)';
  const d = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  g.fillText(`${d} · 혜화역 2번 출구 · 마로니에공원 앞`, c.width / 2, fy + 70);
  g.font = `800 18px ${FONT}`; g.fillStyle = '#ffd27a'; g.fillText('🏮 사주포차에서 오늘의 고민을 내려놓았어요', c.width / 2, fy + 108);
  return c;
}
