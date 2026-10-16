// kaaba3d.js — interactive 3D model of the Kaaba for «درب الحاج» (three.js r160, no network needed)
// Door face = +Z (north-east), Hijr Ismail = +X side, Black Stone corner = (-X,+Z). Tawaf runs counter-clockwise.
import * as THREE from './three.module.min.js';
import { OrbitControls } from './OrbitControls.js';
import { RoomEnvironment } from './RoomEnvironment.js';

const W = 1.0;            // door face width (x)
const D = 0.9;            // side face width (z)
const H = 1.18;           // height of the Kaaba
const BASE = 0.035;       // Shadharwan (marble skirt) height
const PX = 900;           // texture pixels per unit
const HIJR = { cx: W / 2 + 0.1, ro: 0.58, ri: 0.49, h: 0.11 };
const MAQAM = { x: 0.16, z: D / 2 + 0.95 };

// ------------------------------------------------------------------ 2D drawing helpers (textures)
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function goldGrad(ctx, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#7a591d'); g.addColorStop(0.22, '#e3c06a'); g.addColorStop(0.5, '#fbe6a2');
  g.addColorStop(0.78, '#c6973f'); g.addColorStop(1, '#7a591d');
  return g;
}

function weave(ctx, w, h) {
  ctx.fillStyle = '#0b0b0c';
  ctx.fillRect(0, 0, w, h);
  const s = 72;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 2;
  for (let k = -h; k < w + h; k += s) {
    ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + h, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(k, h); ctx.lineTo(k + h, 0); ctx.stroke();
  }
  // a small woven flourish inside every diamond
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 2.5;
  for (let m = 0; m * s / 2 < h + s; m++) {
    for (let n = 0; n * s / 2 < w + s; n++) {
      if ((n + m) % 2 === 0) continue;
      const x = n * s / 2, y = m * s / 2;
      ctx.beginPath(); ctx.arc(x, y, 9, Math.PI * 0.15, Math.PI * 1.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 12, y + 9); ctx.quadraticCurveTo(x, y + 15, x + 13, y + 4); ctx.stroke();
    }
  }
  ctx.restore();
}

function vine(ctx, x0, x1, cy, amp, lw) {
  const period = amp * 4.2;
  ctx.save();
  ctx.lineWidth = lw;
  ctx.strokeStyle = '#e9c873';
  ctx.fillStyle = '#e9c873';
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 2) {
    const y = cy + amp * Math.sin(((x - x0) / period) * Math.PI * 2);
    if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let x = x0 + period / 4, k = 0; x < x1 - period / 8; x += period / 2, k++) {
    const up = k % 2 === 0;
    const y = cy + (up ? amp : -amp);
    // curl
    ctx.beginPath();
    ctx.arc(x, y + (up ? -amp * 0.55 : amp * 0.55), amp * 0.42, 0, Math.PI * 2);
    ctx.lineWidth = lw * 0.8;
    ctx.stroke();
    // leaf
    ctx.beginPath();
    ctx.ellipse(x + amp * 0.5, y + (up ? -amp * 0.15 : amp * 0.15), amp * 0.38, amp * 0.16, up ? -0.6 : 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y + (up ? -amp * 0.55 : amp * 0.55), amp * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function medallion(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = goldGrad(ctx, -r, r);
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = '#0d0b08';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.fill();
  star(ctx, 0, 0, r * 0.62, r * 0.3, 8, '#e9c873');
  ctx.restore();
}

function star(ctx, cx, cy, ro, ri, n, color) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function hizam(ctx, w, y0, bh) {
  ctx.fillStyle = goldGrad(ctx, y0, y0 + bh);
  ctx.fillRect(0, y0, w, bh);
  const m = bh * 0.15;
  ctx.fillStyle = '#0d0b08';
  ctx.fillRect(0, y0 + m, w, bh - 2 * m);
  ctx.fillStyle = '#d7b15b';
  ctx.fillRect(0, y0 + m + 5, w, 2);
  ctx.fillRect(0, y0 + bh - m - 7, w, 2);
  const n = Math.max(2, Math.round(w / 300));
  const pw = w / n;
  const mr = (bh - 2 * m) * 0.36;
  for (let i = 0; i < n; i++) {
    vine(ctx, i * pw + mr * 1.9, (i + 1) * pw - mr * 1.9, y0 + bh / 2, (bh - 2 * m) * 0.2, 4);
  }
  for (let i = 0; i <= n; i++) medallion(ctx, i * pw, y0 + bh / 2, mr);
}

function archPath(ctx, cx, top, aw, ah) {
  const sh = ah * 0.32;
  ctx.beginPath();
  ctx.moveTo(cx - aw / 2, top + ah);
  ctx.lineTo(cx - aw / 2, top + sh);
  ctx.quadraticCurveTo(cx - aw / 2, top + sh * 0.25, cx - aw * 0.12, top + sh * 0.12);
  ctx.quadraticCurveTo(cx, top - sh * 0.05, cx, top - sh * 0.25);
  ctx.quadraticCurveTo(cx, top - sh * 0.05, cx + aw * 0.12, top + sh * 0.12);
  ctx.quadraticCurveTo(cx + aw / 2, top + sh * 0.25, cx + aw / 2, top + sh);
  ctx.lineTo(cx + aw / 2, top + ah);
  ctx.closePath();
}

function lantern(ctx, cx, top, aw, ah) {
  ctx.save();
  archPath(ctx, cx, top, aw, ah);
  ctx.fillStyle = '#0d0b08';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = goldGrad(ctx, top, top + ah);
  ctx.stroke();
  archPath(ctx, cx, top + 14, aw - 26, ah - 24);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#d7b15b';
  ctx.stroke();
  star(ctx, cx, top + ah * 0.45, aw * 0.2, aw * 0.09, 8, '#e9c873');
  ctx.beginPath(); ctx.arc(cx, top + ah * 0.45, aw * 0.27, 0, Math.PI * 2);
  ctx.lineWidth = 3; ctx.strokeStyle = '#e9c873'; ctx.stroke();
  ctx.fillStyle = '#e9c873';
  ctx.fillRect(cx - aw * 0.3, top + ah * 0.78, aw * 0.6, 3);
  ctx.beginPath();                                     // tassel
  ctx.moveTo(cx - 9, top + ah); ctx.lineTo(cx + 9, top + ah); ctx.lineTo(cx, top + ah + 26); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function cornerRoundel(ctx, x, cy, r) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = goldGrad(ctx, cy - r, cy + r); ctx.fill();
  ctx.beginPath(); ctx.arc(x, cy, r * 0.84, 0, Math.PI * 2);
  ctx.fillStyle = '#0d0b08'; ctx.fill();
  star(ctx, x, cy, r * 0.66, r * 0.32, 8, '#e9c873');
  ctx.restore();
}

function sitara(ctx, cx, top, sw, sh) {
  ctx.save();
  ctx.fillStyle = '#0d0b08';
  ctx.fillRect(cx - sw / 2, top, sw, sh);
  ctx.lineWidth = 9;
  ctx.strokeStyle = goldGrad(ctx, top, top + sh);
  ctx.strokeRect(cx - sw / 2 + 5, top + 5, sw - 10, sh - 10);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#d7b15b';
  ctx.strokeRect(cx - sw / 2 + 18, top + 18, sw - 36, sh - 36);
  // arch crown
  archPath(ctx, cx, top + sh * 0.1, sw * 0.7, sh * 0.26);
  ctx.lineWidth = 5; ctx.strokeStyle = '#e9c873'; ctx.stroke();
  star(ctx, cx, top + sh * 0.21, sw * 0.12, sw * 0.055, 8, '#e9c873');
  // three tiers of ornament
  for (let i = 0; i < 3; i++) {
    const y = top + sh * (0.42 + i * 0.16);
    ctx.fillStyle = '#d7b15b';
    ctx.fillRect(cx - sw * 0.38, y - sh * 0.055, sw * 0.76, 2);
    vine(ctx, cx - sw * 0.33, cx + sw * 0.33, y, sh * 0.02, 3);
  }
  // the door handles' outline (gold panel)
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#e9c873';
  ctx.strokeRect(cx - sw * 0.32, top + sh * 0.88, sw * 0.64, sh * 0.06);
  ctx.restore();
}

// colour canvas -> roughness (G) + metalness (B) canvas: gold reads as polished metal, cloth stays matte
function ormFrom(src) {
  const w = src.width, h = src.height;
  const out = makeCanvas(w, h);
  const a = src.getContext('2d').getImageData(0, 0, w, h);
  const o = out.getContext('2d').createImageData(w, h);
  const s = a.data, d = o.data;
  for (let i = 0; i < s.length; i += 4) {
    const r = s[i], g = s[i + 1], b = s[i + 2];
    const lum = (r + g + b) / 3;
    let gold = Math.min(1, Math.max(0, (r - b - 25) / 70)) * Math.min(1, Math.max(0, (lum - 45) / 70));
    d[i] = 0;
    d[i + 1] = Math.round(255 * (0.88 - 0.6 * gold));
    d[i + 2] = Math.round(255 * gold);
    d[i + 3] = 255;
  }
  out.getContext('2d').putImageData(o, 0, 0);
  return out;
}

function faceCanvas(faceW, { door = false, lantern: withLantern = true } = {}) {
  const w = Math.round(PX * faceW), h = Math.round(PX * H);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  weave(ctx, w, h);
  const bandTop = h * 0.215, bandH = h * 0.072;
  hizam(ctx, w, bandTop, bandH);
  cornerRoundel(ctx, 0, bandTop + bandH + h * 0.075, h * 0.045);
  cornerRoundel(ctx, w, bandTop + bandH + h * 0.075, h * 0.045);
  if (door) {
    sitara(ctx, w * 0.37, h * 0.47, w * 0.24, h * 0.38);
    lantern(ctx, w * 0.77, bandTop + bandH + h * 0.04, w * 0.13, h * 0.17);
  } else if (withLantern) {
    lantern(ctx, w * 0.5, bandTop + bandH + h * 0.04, w * 0.15, h * 0.19);
  }
  return c;
}

function roofCanvas() {
  const w = Math.round(PX * W * 0.6), h = Math.round(PX * D * 0.6);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#55524d'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 54) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 54) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeStyle = '#1b1a18'; ctx.lineWidth = 16; ctx.strokeRect(0, 0, w, h);
  return c;
}

function marbleCanvas() {
  const n = 1024, c = makeCanvas(n, n), ctx = c.getContext('2d');
  ctx.fillStyle = '#f5f1e8'; ctx.fillRect(0, 0, n, n);
  const cx = n / 2;
  ctx.strokeStyle = 'rgba(160,145,118,0.28)'; ctx.lineWidth = 2;
  for (let r = 60; r < n / 2; r += 34) { ctx.beginPath(); ctx.arc(cx, cx, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(160,145,118,0.16)';
  for (let a = 0; a < 72; a++) {
    const t = (a / 72) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx + 60 * Math.cos(t), cx + 60 * Math.sin(t)); ctx.lineTo(cx + 512 * Math.cos(t), cx + 512 * Math.sin(t)); ctx.stroke();
  }
  for (let i = 0; i < 2600; i++) {                     // marble speckle
    ctx.fillStyle = `rgba(${150 + Math.random() * 60},${140 + Math.random() * 50},${120 + Math.random() * 40},${Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * n, Math.random() * n, 2 + Math.random() * 3, 1 + Math.random() * 2);
  }
  return c;
}

function fadeCanvas() {
  const n = 256, c = makeCanvas(n, n), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(n / 2, n / 2, n * 0.18, n / 2, n / 2, n / 2);
  g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#fff'); g.addColorStop(1, '#000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
  return c;
}

function cageCanvas() {
  const w = 256, h = 256, c = makeCanvas(w, h), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 14;
  for (let x = 0; x <= w; x += 42) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeRect(0, 0, w, h);
  return c;
}

// ------------------------------------------------------------------ the scene
export function createKaaba(host, opts = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  } catch (e) {
    return null;                                       // no WebGL → the page keeps its CSS Kaaba
  }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'k3d-canvas';
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const target = new THREE.Vector3(...(opts.view ? opts.view.target : [0, 0.52, 0]));
  const HOME_POS = new THREE.Vector3(...(opts.view ? opts.view.pos : [2.4, 2.3, 4.7]));
  camera.position.set(0.4, 6.5, 9.5);

  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (c, srgb = true) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };

  // lights
  scene.add(new THREE.HemisphereLight(0xfff3df, 0xb39c72, 1.3));
  const sun = new THREE.DirectionalLight(0xffe4bd, 2.6);
  sun.position.set(2.6, 4.6, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -2.4, right: 2.4, top: 2.4, bottom: -2.4, near: 0.5, far: 12 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const kaaba = new THREE.Group();
  scene.add(kaaba);

  // Kiswah-covered cube: materials in BoxGeometry order +X, -X, +Y, -Y, +Z, -Z
  const faceMat = (c) => {
    const orm = tex(ormFrom(c), false);
    return new THREE.MeshStandardMaterial({ map: tex(c), roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1, envMapIntensity: 1.1 });
  };
  const mats = [
    faceMat(faceCanvas(D)),                         // +X  (Hijr side)
    faceMat(faceCanvas(D)),                         // -X
    new THREE.MeshStandardMaterial({ map: tex(roofCanvas()), roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0x222222 }),
    faceMat(faceCanvas(W, { door: true })),         // +Z  (door face)
    faceMat(faceCanvas(W)),                         // -Z
  ];
  const cube = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mats);
  cube.position.y = BASE + H / 2;
  cube.castShadow = true;
  cube.receiveShadow = true;
  kaaba.add(cube);

  const marble = new THREE.MeshStandardMaterial({ color: 0xf1ece2, roughness: 0.38, envMapIntensity: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b85c, metalness: 1, roughness: 0.28, envMapIntensity: 1.4 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 1, roughness: 0.22 });

  // Shadharwan (marble skirt)
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(W + 0.07, BASE, D + 0.07), marble);
  skirt.position.y = BASE / 2;
  skirt.castShadow = skirt.receiveShadow = true;
  kaaba.add(skirt);

  // door: a slightly raised gold frame around the curtain
  const doorW = W * 0.24, doorH = H * 0.38, doorX = -W / 2 + W * 0.37, doorTop = BASE + H - H * 0.47;
  const frameT = 0.012;
  [[doorW + frameT * 2, frameT, 0, doorTop + frameT / 2], [doorW + frameT * 2, frameT, 0, doorTop - doorH - frameT / 2],
   [frameT, doorH, -doorW / 2 - frameT / 2, doorTop - doorH / 2], [frameT, doorH, doorW / 2 + frameT / 2, doorTop - doorH / 2]]
    .forEach(([w, h, dx, y]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.016), gold);
      m.position.set(doorX + dx, y, D / 2 + 0.006);
      m.castShadow = true;
      kaaba.add(m);
    });

  // Black Stone in its silver frame (east corner)
  const bs = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.009, 12, 32), silver);
  ring.scale.set(0.85, 1.15, 1);
  const stone = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), new THREE.MeshStandardMaterial({ color: 0x24160f, roughness: 0.5 }));
  stone.scale.set(0.8, 1.05, 0.45);
  bs.add(ring, stone);
  bs.position.set(-W / 2 - 0.006, BASE + H * 0.13, D / 2 + 0.006);
  bs.rotation.y = -Math.PI / 4;
  kaaba.add(bs);

  // Mizab (golden rain spout) over the Hijr
  const mizab = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.022, 0.045), gold);
  mizab.position.set(W / 2 + 0.06, BASE + H - 0.012, 0);
  mizab.rotation.z = -0.12;
  mizab.castShadow = true;
  kaaba.add(mizab);

  // Hijr Ismail (Hatim): a low semicircular marble wall
  const hs = new THREE.Shape();
  const seg = 48;
  for (let i = 0; i <= seg; i++) {
    const t = -Math.PI / 2 + (i / seg) * Math.PI;
    const x = HIJR.ro * Math.cos(t), y = HIJR.ro * Math.sin(t);
    if (i === 0) hs.moveTo(x, y); else hs.lineTo(x, y);
  }
  for (let i = seg; i >= 0; i--) {
    const t = -Math.PI / 2 + (i / seg) * Math.PI;
    hs.lineTo(HIJR.ri * Math.cos(t), HIJR.ri * Math.sin(t));
  }
  const hg = new THREE.ExtrudeGeometry(hs, { depth: HIJR.h, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 48 });
  hg.rotateX(-Math.PI / 2);
  const hijr = new THREE.Mesh(hg, marble);
  hijr.position.set(HIJR.cx, 0, 0);
  hijr.castShadow = hijr.receiveShadow = true;
  if (!opts.minimal) kaaba.add(hijr);

  // Maqam Ibrahim
  const maqam = new THREE.Group();
  const mBase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.035, 8), marble);
  mBase.position.y = 0.0175;
  const cageTex = tex(cageCanvas(), false);
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.13, 8, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe2ba5e, metalness: 1, roughness: 0.3, alphaMap: cageTex, alphaTest: 0.5, side: THREE.DoubleSide }));
  cage.position.y = 0.035 + 0.065;
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 }));
  glass.position.y = 0.035 + 0.06;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.056, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold);
  dome.position.y = 0.035 + 0.13;
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 12), gold);
  fin.position.y = 0.035 + 0.13 + 0.056 + 0.02;
  maqam.add(mBase, cage, glass, dome, fin);
  maqam.position.set(MAQAM.x, 0, MAQAM.z);
  maqam.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  if (!opts.minimal) kaaba.add(maqam);

  // Mataf floor
  const floorTex = tex(marbleCanvas());
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.4, 96),
    new THREE.MeshStandardMaterial({ map: floorTex, alphaMap: tex(fadeCanvas(), false), transparent: true, roughness: 0.34, envMapIntensity: 0.5, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.renderOrder = -1;
  if (!opts.minimal) scene.add(floor);

  // pilgrims in tawaf (counter-clockwise seen from above)
  const N = opts.pilgrims ?? 650;
  const bodyGeo = new THREE.CapsuleGeometry(0.018, 0.074, 3, 6);
  const headGeo = new THREE.SphereGeometry(0.017, 8, 6);
  const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 }), N);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), N);
  bodies.receiveShadow = true;
  const P = [];
  const col = new THREE.Color();
  const bodyCols = ['#fbfaf5', '#fbfaf5', '#fbfaf5', '#fbfaf5', '#f3ede0', '#fbfaf5', '#e9e2d2', '#fbfaf5', '#f3ede0', '#fbfaf5', '#fbfaf5', '#2a2623'];
  const headCols = ['#5a3d2b', '#7a5537', '#3b2a20', '#8b6446', '#f6f4ef', '#f6f4ef', '#2e231c'];
  for (let i = 0; i < N; i++) {
    const r0 = 0.86 + Math.pow(Math.random(), 0.85) * 2.1;
    P.push({ th: Math.random() * Math.PI * 2, r0, w: (0.055 + Math.random() * 0.04) / r0, ph: Math.random() * 6.28, sway: 0.01 + Math.random() * 0.03 });
    const bc = bodyCols[(Math.random() * bodyCols.length) | 0];
    bodies.setColorAt(i, col.set(bc));
    heads.setColorAt(i, col.set(bc === '#2a2623' ? '#2a2623' : headCols[(Math.random() * headCols.length) | 0]));
  }
  scene.add(bodies, heads);
  const m4 = new THREE.Matrix4();
  const rMin = (th) => 0.84 + 0.46 * Math.pow(Math.max(0, Math.cos(th)), 2);      // flow around the Hijr bulge (+X)
  function placePilgrims(t, dt) {
    for (let i = 0; i < N; i++) {
      const p = P[i];
      if (tawaf) p.th -= p.w * dt;
      const r = Math.max(p.r0, rMin(p.th) + 0.02) + p.sway * Math.sin(t * 0.6 + p.ph);
      const x = r * Math.cos(p.th), z = r * Math.sin(p.th);
      const bob = tawaf ? 0.004 * Math.abs(Math.sin(t * 5 + p.ph)) : 0;
      m4.makeTranslation(x, 0.056 + bob, z);
      bodies.setMatrixAt(i, m4);
      m4.makeTranslation(x, 0.122 + bob, z);
      heads.setMatrixAt(i, m4);
    }
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------------ controls
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.75;
  controls.autoRotateSpeed = 0.8;
  controls.minDistance = 2.2;
  controls.maxDistance = 9;
  controls.enabled = false;

  let mode = 'inline';
  function applyMode() {
    if (mode === 'inline') {
      const pol = new THREE.Spherical().setFromVector3(HOME_POS.clone().sub(target)).phi;
      controls.minPolarAngle = controls.maxPolarAngle = pol;
      controls.enableZoom = false;
      canvas.style.touchAction = 'pan-y';             // vertical swipes still scroll the page
    } else {
      controls.minPolarAngle = 0.3;
      controls.maxPolarAngle = 1.45;
      controls.enableZoom = true;
      canvas.style.touchAction = 'none';
    }
  }
  applyMode();

  let idleTimer = null;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
    if (opts.onInteract) opts.onInteract();
  });
  controls.addEventListener('end', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { controls.autoRotate = true; }, 3500);
  });

  // ------------------------------------------------------------------ labels (full-screen view)
  const LABELS = [
    { t: 'باب الكعبة', p: [doorX, doorTop - doorH * 0.45, D / 2 + 0.02], n: [0, 0, 1] },
    { t: 'الحجر الأسود', p: [-W / 2, BASE + H * 0.13, D / 2], n: [-1, 0, 1] },
    { t: 'الركن اليماني', p: [-W / 2, BASE + H * 0.13, -D / 2], n: [-1, 0, -1] },
    { t: 'حِجر إسماعيل', p: [HIJR.cx + HIJR.ro, HIJR.h + 0.02, 0], n: [1, 0, 0] },
    { t: 'الميزاب', p: [W / 2 + 0.12, BASE + H + 0.01, 0], n: [1, 0.6, 0] },
    { t: 'مقام إبراهيم', p: [MAQAM.x, 0.3, MAQAM.z], n: null },
  ].map((l) => ({ ...l, p: new THREE.Vector3(...l.p), n: l.n ? new THREE.Vector3(...l.n).normalize() : null, el: null }));
  let labelHost = null;
  const v = new THREE.Vector3();
  function updateLabels() {
    if (!labelHost) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const l of LABELS) {
      v.copy(l.p).project(camera);
      const facing = !l.n || v.z < 1 && l.n.dot(camera.position.clone().sub(l.p)) > 0.05;
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      l.el.style.transform = `translate(${x}px, ${y}px)`;
      l.el.classList.toggle('hide', !facing || v.z > 1 || x < 0 || x > w || y < 0 || y > h);
    }
  }
  function setLabels(el) {
    if (labelHost) labelHost.innerHTML = '';
    labelHost = el;
    if (!el) return;
    for (const l of LABELS) {
      l.el = document.createElement('div');
      l.el.className = 'k3d-label';
      l.el.innerHTML = `<i></i><span>${l.t}</span>`;
      el.appendChild(l.el);
    }
  }

  // ------------------------------------------------------------------ loop
  let tawaf = true;
  let active = false, raf = 0, last = performance.now(), t0 = last;
  let intro = opts.intro === false ? null : { start: last, from: camera.position.clone(), dur: 2400 };
  if (!intro) { camera.position.copy(HOME_POS); controls.enabled = true; controls.autoRotate = true; }
  camera.lookAt(target);

  function size() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = opts.view && opts.view.fov ? opts.view.fov : w / h < 0.75 ? 38 : 30;
    camera.updateProjectionMatrix();
  }
  size();
  const ro = new ResizeObserver(() => size());
  ro.observe(host);

  function frame(now) {
    raf = active ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - t0) / 1000;
    if (intro) {
      const k = Math.min(1, (now - intro.start) / intro.dur);
      const e = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(intro.from, HOME_POS, e);
      camera.lookAt(target);
      if (k >= 1) { intro = null; controls.enabled = true; controls.autoRotate = true; }
    } else {
      controls.update();
    }
    placePilgrims(t, dt);
    renderer.render(scene, camera);
    updateLabels();
  }
  placePilgrims(0, 0);

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (opts.onLost) opts.onLost(); });

  return {
    canvas,
    setActive(on) {
      if (on === active) return;
      active = on;
      if (on) { last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    },
    renderOnce() { frame(performance.now()); },
    moveTo(newHost, newMode) {
      ro.unobserve(host);
      host = newHost;
      host.appendChild(canvas);
      ro.observe(host);
      mode = newMode;
      applyMode();
      size();
    },
    setLabels,
    setTawaf(on) { tawaf = on; },
    get tawaf() { return tawaf; },
    resetView() {
      intro = { start: performance.now(), from: camera.position.clone(), dur: 900 };
      controls.enabled = false;
    },
    skipIntro() { if (intro) { intro.dur = 1; } },
  };
}
