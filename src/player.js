// 내 캐릭터: 3인칭 이동 + 포차 의자에 앉기 + 입력(키보드/마우스/터치 조이스틱)
import * as THREE from 'three';
import { makeCharacter, animateCharacter, nameSprite, bubbleSprite } from './character.js';
import { WALK, itemMesh } from './scene.js';

// 말풍선·손에 든 물건 공용 기능
function say(self, text, now, dur = 6000) {
  if (self.bubble) self.group.remove(self.bubble);
  self.bubble = bubbleSprite(text); self.bubble.position.y = 2.15; self.group.add(self.bubble);
  self.bubbleUntil = now + dur;
}
function tickBubble(self, now) { if (self.bubble && now > self.bubbleUntil) { self.group.remove(self.bubble); self.bubble = null; } }
function setCarry(self, id) {
  if (self.carryId === id) return; self.carryId = id;
  if (self.carry) { self.carry.parent?.remove(self.carry); self.carry = null; }
  if (!id || !self.body) return;
  self.carry = itemMesh(id); self.carry.scale.setScalar(1.3); self.carry.position.set(0, -0.36, 0.08);
  self.body.userData.parts.arms[1].add(self.carry);
}

const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

export class Player {
  constructor(scene, look, name) {
    this.scene = scene;
    this.look = look;
    this.name = name;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.setLook(look);
    this.pos = this.group.position;
    this.pos.set(0, 0, 5);
    this.facing = Math.PI; // -z (강 쪽)
    this.phase = 0;
    this.walking = false;
    this.seat = null;
    this.wave = 0;
    this.yaw = 0; this.pitch = 0.3; this.dist = 6;
    this.marker = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 8), new THREE.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false }));
    this.marker.rotation.x = Math.PI; scene.add(this.marker);
  }

  setLook(look) {
    this.look = look;
    if (this.body) this.group.remove(this.body);
    this.body = makeCharacter(look);
    this.group.add(this.body);
    if (this.tag) this.group.remove(this.tag);
    this.tag = nameSprite(this.name, { bg: 'rgba(255,190,60,0.85)', fg: '#2a1800', scale: 0.9 });
    this.tag.position.y = 1.95; this.group.add(this.tag);
    const c = this.carryId; this.carryId = undefined; if (c) setCarry(this, c);
  }

  say(text, now) { say(this, text, now); }
  setCarry(id) { setCarry(this, id); }

  sitAt(seat) {
    this.seat = seat;
    this.pos.set(seat.x, 0, seat.z + 0.08);
    this.facing = Math.PI; this.freeLook = false;
  }
  stand() {
    if (!this.seat) return;
    this.pos.z = this.seat.z + 1.2;
    this.seat = null;
  }

  update(dt, input, camera, now) {
    let mx = input.x, mz = input.y;
    const len = Math.hypot(mx, mz);
    this.walking = false;
    if (!this.seat && len > 0.05) {
      mx /= Math.max(1, len); mz /= Math.max(1, len);
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const dir = fwd.multiplyScalar(mz).add(right.multiplyScalar(mx));
      const sp = (input.run ? 6.5 : 3.6) * Math.min(1, len);
      this.pos.x = THREE.MathUtils.clamp(this.pos.x + dir.x * sp * dt, WALK.minX, WALK.maxX);
      this.pos.z = THREE.MathUtils.clamp(this.pos.z + dir.z * sp * dt, WALK.minZ, WALK.maxZ);
      this.facing = Math.atan2(dir.x, dir.z);
      this.walking = true;
      this.phase += dt * (input.run ? 13 : 9);
    }
    const cur = this.group.rotation.y;
    this.group.rotation.y = cur + wrap(this.facing - cur) * Math.min(1, dt * 10);
    if (this.wave > 0) this.wave -= dt;
    animateCharacter(this.body, { walking: this.walking, phase: this.phase, seated: !!this.seat, wave: this.wave > 0 }, now);
    this.body.position.y = this.seat ? 0.06 : 0;
    this.marker.position.set(this.pos.x, 2.25 + Math.sin(now / 250) * 0.05, this.pos.z);
    this.marker.visible = !this.seat;
    this.tag.visible = !this.seat;
    tickBubble(this, now);
    if (this.bubble) this.bubble.visible = !this.seat;
    if (this.carry) this.carry.visible = !this.seat;

    // 카메라: 앉으면 포차 안쪽을 보는 어깨너머 시점
    if (this.seat && !this.freeLook) {
      this.yaw += wrap(-0.35 - this.yaw) * Math.min(1, dt * 2.5);
      this.pitch += (0.42 - this.pitch) * Math.min(1, dt * 2);
      this.dist += (3.9 - this.dist) * Math.min(1, dt * 2);
    }
    // 앉으면 사장님 쪽(카운터 안)을 바라봄
    const target = this.seat
      ? new THREE.Vector3(this.pos.x + 0.3, 1.25, this.pos.z - 1.5)
      : new THREE.Vector3(this.pos.x, this.pos.y + 1.3, this.pos.z);
    const off = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)).multiplyScalar(this.dist);
    const cam = target.clone().add(off);
    cam.y = Math.max(cam.y, 0.5);
    cam.z = Math.min(cam.z, 11.7);
    if (cam.z < -5.6) cam.z = -5.6;
    camera.position.lerp(cam, Math.min(1, dt * 7));
    camera.lookAt(target);
  }
}

// ---------------- 다른 손님(원격·AI) ----------------
export class Avatar {
  constructor(scene, { look, name, bot }) {
    this.group = new THREE.Group(); scene.add(this.group);
    this.scene = scene;
    this.name = name; this.lookKey = '';
    this.setLook(look, name, bot);
    this.phase = Math.random() * 10; this.target = new THREE.Vector3(); this.facing = 0;
  }
  setLook(look, name, bot) {
    const key = JSON.stringify(look) + name;
    if (key === this.lookKey) return;
    this.lookKey = key;
    if (this.body) this.group.remove(this.body);
    if (this.tag) this.group.remove(this.tag);
    this.body = makeCharacter(look); this.group.add(this.body);
    this.tag = nameSprite(name, { bg: bot ? 'rgba(40,40,60,0.6)' : 'rgba(20,16,40,0.78)', scale: 0.8 });
    this.tag.position.y = 1.9; this.group.add(this.tag);
    const c = this.carryId; this.carryId = undefined; if (c) setCarry(this, c);
  }
  say(text, now) { say(this, text, now); }
  update(dt, st, now, camPos) {
    tickBubble(this, now);
    setCarry(this, st.seated ? null : st.carry || null);
    if (camPos) { const d = camPos.distanceTo(this.group.position); this.tag.material.opacity = THREE.MathUtils.clamp(d < 4.6 ? 0 : 1 - (d - 10) / 8, 0, 1); }
    // st: { x, z, seated, wave, facing }
    this.target.set(st.x, 0, st.z);
    const d = this.target.distanceTo(this.group.position);
    const walking = !st.seated && d > 0.05;
    if (d > 8) this.group.position.copy(this.target);
    else this.group.position.lerp(this.target, Math.min(1, dt * 6));
    if (walking) { this.phase += dt * 9; this.facing = Math.atan2(this.target.x - this.group.position.x, this.target.z - this.group.position.z); }
    if (st.seated) this.facing = Math.PI;
    const cur = this.group.rotation.y;
    this.group.rotation.y = cur + wrap(this.facing - cur) * Math.min(1, dt * 8);
    animateCharacter(this.body, { walking, phase: this.phase, seated: st.seated, wave: st.wave, talk: st.talk }, now);
    this.body.position.y = st.seated ? 0.06 : 0;
  }
  dispose() { this.scene.remove(this.group); }
}

// ---------------- 입력 ----------------
export function createInput(canvas, player) {
  const keys = new Set();
  const input = { x: 0, y: 0, run: false, joy: { x: 0, y: 0 } };
  const typing = (e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
  window.addEventListener('keydown', (e) => { if (!typing(e)) keys.add(e.code); });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 }; });
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    player.yaw -= dx * 0.006; if (player.seat && drag.moved > 20) player.freeLook = true;
    player.pitch = THREE.MathUtils.clamp(player.pitch + dy * 0.004, 0.02, 1.2);
  });
  const end = (e) => { if (drag && e.pointerId === drag.id) { input.lastTap = drag.moved < 6 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; drag = null; } };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => { player.dist = THREE.MathUtils.clamp(player.dist + e.deltaY * 0.01, 2.5, 16); e.preventDefault(); }, { passive: false });

  const pad = document.getElementById('joy'), knob = document.getElementById('joy-knob');
  let jid = null, jc = null;
  const moveJoy = (e) => {
    if (e.pointerId !== jid) return;
    let dx = e.clientX - jc.x, dy = e.clientY - jc.y;
    const l = Math.hypot(dx, dy), m = jc.R * 0.8;
    if (l > m) { dx *= m / l; dy *= m / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.joy.x = dx / m; input.joy.y = -dy / m;
  };
  pad.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); e.preventDefault();
    jid = e.pointerId; const r = pad.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 };
    pad.setPointerCapture(jid); moveJoy(e);
  });
  pad.addEventListener('pointermove', moveJoy);
  const endJoy = (e) => { if (e.pointerId !== jid) return; jid = null; input.joy.x = input.joy.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', endJoy); pad.addEventListener('pointercancel', endJoy);

  input.poll = () => {
    let x = 0, y = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    input.x = x || input.joy.x; input.y = y || input.joy.y;
    input.run = keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(input.joy.x, input.joy.y) > 0.95;
    input.interact = keys.has('KeyE') || keys.has('Space');
    return input;
  };
  return input;
}
