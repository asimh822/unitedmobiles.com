"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { BuildState } from "@/lib/build-match";
import { untilTime } from "@/lib/build-match";

/**
 * The 3D phone on /build: a port of the prototype's three.js r128 scene to
 * current three, re-lit for the site's light cream page. Loaded with
 * next/dynamic (ssr:false) only after a persona is picked, so no other page
 * (and not even the /build persona screen) pays for three.js.
 *
 * Low-end Android: pixel ratio capped, no MSAA, fewer curve segments, a
 * smaller screen texture, and the body is rebuilt in steps while resizing
 * instead of every frame.
 */

export type ScreenMode = "home" | "battery" | "speed" | "storage";

export interface StageApi {
  /** PNG data URL of the given build, seen from the back. */
  snapshot(cfg: BuildState): string;
}

interface Props {
  st: BuildState;
  mode: ScreenMode;
  faceBack: boolean;
  paused: boolean;
  onReady: (api: StageApi) => void;
  onFirstDrag?: () => void;
}

const APP_COLORS: [string, string][] = [
  ["#ff6b6b", "#c92a2a"], ["#51cf66", "#2b8a3e"], ["#5c7cfa", "#364fc7"], ["#ffd43b", "#f08c00"],
  ["#cc5de8", "#862e9c"], ["#ff922b", "#d9480f"], ["#38d9a9", "#087f5b"], ["#f783ac", "#c2255c"],
];
const APP_EMO = ["📷", "🎵", "💬", "🎮", "📺", "🗺️", "📚", "🛒"];
const RAM_NEEDLE: Record<number, number> = { 4: 0.2, 6: 0.45, 8: 0.68, 12: 0.95 };
const RAM_LINE: Record<number, string> = { 4: "Calls, WhatsApp, YouTube", 6: "Smooth daily use", 8: "Fast multitasking", 12: "PUBG on max settings" };
const LENS_R: Record<number, number> = { 13: 0.055, 50: 0.07, 108: 0.082, 200: 0.095 };

const D = 0.075, BV = 0.022, FZ = D / 2 + BV; // body depth, bevel, front z
const dims = (s: number) => ({ w: 0.74 + (s - 6.1) * 0.075, h: 1.56 + (s - 6.1) * 0.16, r: 0.11 });

function rr(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** ShapeGeometry UVs as 0..1 across its bounds. */
function planeUV(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const b = geo.boundingBox!, p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x), (p.getY(i) - b.min.y) / (b.max.y - b.min.y));
  uv.needsUpdate = true;
  return geo;
}

function isLowEnd() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 4) <= 4 || (nav.deviceMemory ?? 4) <= 3;
}

export default function PhoneStage({ st, mode, faceBack, paused, onReady, onFirstDrag }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  // Latest props for the render loop, without re-running the scene setup.
  const live = useRef({ st, mode, faceBack, paused });
  live.current = { st, mode, faceBack, paused };
  const faceRef = useRef<((back: boolean) => void) | null>(null);
  const dirtyRef = useRef<() => void>(() => {});
  const cbs = useRef({ onReady, onFirstDrag });
  cbs.current = { onReady, onFirstDrag };

  useEffect(() => {
    faceRef.current?.(faceBack);
  }, [faceBack]);
  useEffect(() => {
    dirtyRef.current();
  }, [st, mode]);

  useEffect(() => {
    const cv = canvas.current!, box = wrap.current!;
    const low = isLowEnd();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fontFamily =
      getComputedStyle(document.documentElement).getPropertyValue("--font-manrope").trim() || "system-ui";
    const font = (weight: number | string, px: number) => `${weight} ${px}px ${fontFamily}, sans-serif`;
    const seg = low ? { bevel: 4, curve: 16 } : { bevel: 8, curve: 28 };

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !low, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, low ? 1.25 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();

    // Studio reflections: neutral grey room with soft boxes, a warm and a
    // cobalt strip (the site's palette shows up as rim colour on the frame).
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x4a5160, side: THREE.BackSide })));
    const panel = (w: number, h: number, x: number, y: number, z: number, col: string, k: number) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }),
      );
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(7, 1.6, 0, 5, 2, "#ffffff", 4);
    panel(1.4, 7, -5, 0, 3, "#ffe2b8", 2.6);
    panel(1.4, 7, 5, 0.5, -1, "#9db6ee", 2.6);
    panel(5, 1.2, 0, -5, 4, "#faf7f0", 1.4);
    panel(3, 3, 0, 1, 6, "#ffffff", 1.5);
    const pm = new THREE.PMREMGenerator(renderer);
    const envRT = pm.fromScene(env, 0.035);
    pm.dispose();
    scene.environment = envRT.texture;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0.25, 5.4); camera.lookAt(0, 0.02, 0);
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2, 3, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9db6ee, 2.6); rim.position.set(-3, 1, -3); scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const phone = new THREE.Group(); scene.add(phone);
    const mat = {
      back: new THREE.MeshPhysicalMaterial({ color: 0x1c1f26, metalness: 0.25, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.3 }),
      frame: new THREE.MeshPhysicalMaterial({ color: 0x9aa0b0, metalness: 1, roughness: 0.22, envMapIntensity: 1.6 }),
      bezel: new THREE.MeshPhysicalMaterial({ color: 0x020203, metalness: 0, roughness: 0.08, clearcoat: 1, envMapIntensity: 1.2 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.07, envMapIntensity: 2.5, depthWrite: false }),
      bump: new THREE.MeshPhysicalMaterial({ color: 0x111318, metalness: 0.4, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4 }),
      ring: new THREE.MeshPhysicalMaterial({ color: 0xc9ced8, metalness: 1, roughness: 0.18, envMapIntensity: 1.8 }),
      lens: new THREE.MeshPhysicalMaterial({ color: 0x04060c, metalness: 0.2, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 2.2 }),
      iris: new THREE.MeshStandardMaterial({ color: 0x3346a8, metalness: 1, roughness: 0.15, envMapIntensity: 2 }),
      flash: new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffe9a0, emissiveIntensity: 0.6, roughness: 0.3 }),
      glint: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }),
    };

    // Screen: a canvas drawn in 640x1360 "design" units, smaller on low-end.
    const W = 640, H = 1360, k = low ? 0.6 : 1;
    const screenCv = document.createElement("canvas");
    screenCv.width = Math.round(W * k); screenCv.height = Math.round(H * k);
    const c = screenCv.getContext("2d")!;
    const screenTex = new THREE.CanvasTexture(screenCv);
    screenTex.colorSpace = THREE.SRGBColorSpace;
    screenTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });

    // Soft contact shadow on the cream floor.
    const sc = document.createElement("canvas"); sc.width = sc.height = 128;
    const sx = sc.getContext("2d")!;
    const g0 = sx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g0.addColorStop(0, "rgba(28,25,23,.45)"); g0.addColorStop(1, "rgba(28,25,23,0)");
    sx.fillStyle = g0; sx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(sc);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.55), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

    function textTex(txt: string, size: number, weight: number, spacing: number) {
      const tc = document.createElement("canvas"); tc.width = 512; tc.height = 128;
      const x = tc.getContext("2d")!;
      const tex = new THREE.CanvasTexture(tc) as THREE.CanvasTexture & { draw: (t: string) => void };
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.draw = (t: string) => {
        x.clearRect(0, 0, 512, 128); x.fillStyle = "#fff"; x.font = font(weight, size);
        x.textAlign = "center"; x.textBaseline = "middle";
        if ("letterSpacing" in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
        x.fillText(t, 256, 64); tex.needsUpdate = true;
      };
      tex.draw(txt);
      return tex;
    }
    const logoTex = textTex("UNITED", 64, 800, 10);
    const mpTex = textTex("50MP", 48, 800, 4);
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, opacity: 0.55, depthWrite: false });
    const mpMat = new THREE.MeshBasicMaterial({ map: mpTex, transparent: true, opacity: 0.7, depthWrite: false });

    const st = () => live.current.st;
    const cur = { screen: st().screen, bat: st().battery, needle: RAM_NEEDLE[st().ram] ?? 0.5 };
    const built: { size?: number; lenses?: number; mp?: number } = {};
    let body: THREE.Group | null = null, cam: THREE.Group | null = null;
    let rotY = -1.2, rotX = 0, targetY = 0, targetX = 0, lastInteract = performance.now();
    let dragging: { x: number; y: number; ry: number; rx: number } | null = null;
    let screenDirty = true, dragged = false, raf = 0, snapping = false;
    let drawMode: ScreenMode = live.current.mode;

    function dropGroup(gr: THREE.Group | null) {
      if (!gr) return;
      gr.traverse((o) => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); });
      phone.remove(gr);
    }

    function buildBody(s: number) {
      dropGroup(body);
      const { w, h, r } = dims(s), G = new THREE.Group();
      const bg = new THREE.ExtrudeGeometry(rr(w - 2 * BV, h - 2 * BV, r - BV), {
        depth: D, bevelEnabled: true, bevelThickness: BV, bevelSize: BV, bevelSegments: seg.bevel, curveSegments: seg.curve,
      });
      bg.translate(0, 0, -D / 2);
      G.add(new THREE.Mesh(bg, [mat.back, mat.frame]));
      const bez = new THREE.Mesh(new THREE.ShapeGeometry(rr(w - 0.035, h - 0.035, r - 0.018), seg.curve), mat.bezel);
      bez.position.z = FZ + 0.0005; G.add(bez);
      const scr = new THREE.Mesh(planeUV(new THREE.ShapeGeometry(rr(w - 0.075, h - 0.075, r - 0.04), seg.curve)), screenMat);
      scr.position.z = FZ + 0.001; G.add(scr);
      const gl = new THREE.Mesh(new THREE.ShapeGeometry(rr(w - 0.035, h - 0.035, r - 0.018), seg.curve), mat.glass);
      gl.position.z = FZ + 0.0025; G.add(gl);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.018, 24), mat.bezel);
      hole.position.set(0, h / 2 - 0.075, FZ + 0.0015); G.add(hole);
      const bt = (len: number, y: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.014, len, 0.032), mat.frame);
        m.position.set(w / 2 + 0.004, y, 0); G.add(m);
      };
      bt(0.2, h * 0.18); bt(0.11, h * 0.02);
      const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.105), logoMat);
      logo.rotation.y = Math.PI; logo.position.set(0, -h * 0.3, -FZ - 0.001); G.add(logo);
      phone.add(G); body = G;
      shadow.position.y = -h / 2 - 0.12;
      built.size = s;
      buildCamera(true);
    }

    function buildCamera(keepAnim: boolean) {
      dropGroup(cam);
      const { w, h } = dims(cur.screen), n = st().lenses, mp = st().mp;
      const r = LENS_R[mp] ?? 0.07, p = 2 * r + 0.05;
      const pos = ({ 1: [[0, 0]], 2: [[0, 0], [0, -p]], 3: [[0, 0], [0, -p], [p, -p]], 4: [[0, 0], [p, 0], [0, -p], [p, -p]] } as Record<number, number[][]>)[n] ?? [[0, 0]];
      const flash = n === 4 ? [p / 2, -p * 1.62] : [p, 0];
      const all = pos.concat([flash]), xs = all.map((a) => a[0]), ys = all.map((a) => a[1]);
      const pad = r + 0.045;
      const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
      const bw = maxX - minX, bh = maxY - minY;
      const G = new THREE.Group(); G.rotation.y = Math.PI;
      G.position.set(w / 2 - 0.09 - bw / 2, h / 2 - 0.09 - bh / 2, -FZ);
      const cx = -(minX + maxX) / 2, cy = -(minY + maxY) / 2;
      G.add(new THREE.Mesh(
        new THREE.ExtrudeGeometry(rr(bw - 0.016, bh - 0.016, Math.min(0.11, bw / 2 - 0.01)), {
          depth: 0.01, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: low ? 3 : 5, curveSegments: low ? 14 : 24,
        }),
        mat.bump,
      ));
      const top = 0.026, rs = low ? 28 : 48;
      pos.forEach(([x, y], i) => {
        const L = new THREE.Group(); L.position.set(x + cx, y + cy, top);
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.014, r + 0.016, 0.03, rs), mat.ring); ring.rotation.x = Math.PI / 2; L.add(ring);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.034, rs), mat.lens); glass.rotation.x = Math.PI / 2; L.add(glass);
        const iris = new THREE.Mesh(new THREE.RingGeometry(r * 0.32, r * 0.6, rs), mat.iris); iris.position.z = 0.0175; L.add(iris);
        const pupil = new THREE.Mesh(new THREE.CircleGeometry(r * 0.3, 24), mat.lens); pupil.position.z = 0.018; L.add(pupil);
        const glint = new THREE.Mesh(new THREE.CircleGeometry(r * 0.12, 16), mat.glint); glint.position.set(-r * 0.35, r * 0.35, 0.0185); L.add(glint);
        const anim = !keepAnim && !reduced;
        L.userData.born = anim ? performance.now() + i * 90 : 0;
        L.scale.setScalar(anim ? 0.001 : 1);
        G.add(L);
      });
      const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.012, 24), mat.flash);
      fl.rotation.x = Math.PI / 2; fl.position.set(flash[0] + cx, flash[1] + cy, top - 0.005); G.add(fl);
      mpTex.draw(`${mp}MP`);
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.065), mpMat);
      lbl.position.set(0, -bh / 2 - 0.06, 0.001); G.add(lbl);
      phone.add(G); cam = G;
      built.lenses = n; built.mp = mp;
    }

    function rrect(x: number, y: number, w: number, h: number, r: number) {
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }

    function drawScreen() {
      const s = st(), md = drawMode;
      c.setTransform(k, 0, 0, k, 0, 0);
      const col = new THREE.Color(s.color);
      // Wallpaper: the phone colour washed toward cobalt.
      const g = c.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, `#${col.clone().lerp(new THREE.Color("#3b6fd0"), 0.55).getHexString()}`);
      g.addColorStop(0.55, `#${col.clone().lerp(new THREE.Color("#0f2550"), 0.7).getHexString()}`);
      g.addColorStop(1, "#07080f");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      for (const [x, y, r, cl] of [[120, 300, 320, "rgba(238,200,104,.30)"], [540, 700, 360, "rgba(90,140,255,.35)"], [200, 1150, 300, "rgba(46,139,153,.30)"]] as [number, number, number, string][]) {
        const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, cl); rg.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = rg; c.fillRect(0, 0, W, H);
      }
      const now = new Date(), t = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      c.fillStyle = "#fff"; c.font = font(600, 30); c.textAlign = "left"; c.fillText(t, 48, 64);
      const lvl = Math.max(0, Math.min(1, (cur.bat - 3500) / 3500));
      c.strokeStyle = "#fff"; c.lineWidth = 3; rrect(520, 40, 62, 30, 7); c.stroke(); c.fillRect(584, 48, 5, 14);
      c.fillStyle = lvl > 0.3 ? "#3ddc97" : "#ffb347"; rrect(525, 45, 52 * lvl, 20, 4); c.fill();
      c.textAlign = "center"; c.fillStyle = "#fff"; c.font = font(800, 150); c.fillText(t, W / 2, 300);
      c.font = font(400, 30); c.fillStyle = "rgba(255,255,255,.8)";
      c.fillText(now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }), W / 2, 355);
      // App grid grows with storage.
      const n = ({ 64: 8, 128: 16, 256: 24, 512: 32 } as Record<number, number>)[s.storage] ?? 16;
      const sz = 104, gap = 32, x0 = (W - (4 * sz + 3 * gap)) / 2, y0 = 430;
      c.font = "54px sans-serif"; c.textBaseline = "middle";
      for (let i = 0; i < n; i++) {
        const x = x0 + (i % 4) * (sz + gap), y = y0 + Math.floor(i / 4) * (sz + gap - 6), [a, b] = APP_COLORS[i % 8];
        const ag = c.createLinearGradient(x, y, x, y + sz); ag.addColorStop(0, a); ag.addColorStop(1, b);
        c.fillStyle = ag; rrect(x, y, sz, sz, 28); c.fill();
        c.fillStyle = "rgba(255,255,255,.22)"; rrect(x, y, sz, sz * 0.45, 28); c.fill();
        c.fillText(APP_EMO[i % 8], x + sz / 2, y + sz / 2 + 3);
      }
      c.textBaseline = "alphabetic";
      c.fillStyle = "rgba(255,255,255,.14)"; rrect(40, H - 190, W - 80, 150, 48); c.fill();
      if (md !== "home") { c.fillStyle = "rgba(5,6,14,.78)"; c.fillRect(0, 0, W, H); }
      if (md === "battery") {
        const bx = W / 2 - 110, by = 330, bw = 220, bh = 440;
        c.fillStyle = "#fff"; rrect(W / 2 - 50, by - 34, 100, 40, 12); c.fill();
        c.strokeStyle = "#fff"; c.lineWidth = 12; rrect(bx, by, bw, bh, 40); c.stroke();
        const fh = (bh - 36) * lvl, fg = c.createLinearGradient(0, by + bh, 0, by);
        fg.addColorStop(0, "#13a35f"); fg.addColorStop(1, "#8dffc9"); c.fillStyle = fg;
        rrect(bx + 18, by + bh - 18 - fh, bw - 36, Math.max(fh, 1), 24); c.fill();
        c.fillStyle = "#fff"; c.font = font(800, 84); c.textAlign = "center";
        c.fillText(`${Math.round(cur.bat).toLocaleString("en-US")} mAh`, W / 2, by + bh + 130);
        c.font = font(400, 36); c.fillStyle = "rgba(255,255,255,.8)";
        c.fillText(`Lasts till ${untilTime(s.battery).txt}`, W / 2, by + bh + 190);
      }
      if (md === "speed") {
        const cx = W / 2, cy = 720, R = 230;
        c.lineCap = "round"; c.lineWidth = 40; c.strokeStyle = "rgba(255,255,255,.1)";
        c.beginPath(); c.arc(cx, cy, R, Math.PI, 0); c.stroke();
        const gg = c.createLinearGradient(cx - R, 0, cx + R, 0);
        gg.addColorStop(0, "#3ddc97"); gg.addColorStop(0.6, "#eec868"); gg.addColorStop(1, "#ff5b5b");
        c.strokeStyle = gg; c.beginPath(); c.arc(cx, cy, R, Math.PI, Math.PI + Math.PI * cur.needle); c.stroke();
        const a = Math.PI + Math.PI * cur.needle; c.strokeStyle = "#fff"; c.lineWidth = 12;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * (R - 40), cy + Math.sin(a) * (R - 40)); c.stroke();
        c.fillStyle = "#fff"; c.beginPath(); c.arc(cx, cy, 22, 0, Math.PI * 2); c.fill();
        c.font = font(800, 90); c.textAlign = "center"; c.fillText(`${s.ram}GB RAM`, cx, cy + 150);
        c.font = font(400, 36); c.fillStyle = "rgba(255,255,255,.8)"; c.fillText(RAM_LINE[s.ram] ?? "", cx, cy + 210);
        c.lineCap = "butt";
      }
      if (md === "storage") {
        const photos = Math.round((s.storage * 0.75 * 1024) / 3.5 / 1000), games = Math.max(1, Math.round((s.storage * 0.75) / 4));
        c.fillStyle = "#fff"; c.textAlign = "center"; c.font = font(800, 150); c.fillText(`${s.storage}GB`, W / 2, 600);
        c.font = font(600, 44); c.fillText(`📸 ${photos},000 photos`, W / 2, 730);
        c.fillStyle = "rgba(255,255,255,.75)"; c.font = font(400, 34); c.fillText("or", W / 2, 800);
        c.fillStyle = "#fff"; c.font = font(600, 44); c.fillText(`🎮 ${games} big games`, W / 2, 870);
      }
      screenTex.needsUpdate = true;
    }

    function resize() {
      const r = box.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    }

    function face(back: boolean) {
      const turns = Math.round((targetY - (back ? Math.PI : 0)) / (2 * Math.PI));
      targetY = turns * 2 * Math.PI + (back ? Math.PI : 0);
      lastInteract = 0;
    }

    const colTarget = new THREE.Color(), frameMix = new THREE.Color("#d9dde6");
    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      if (live.current.paused || snapping || document.hidden) return;
      const s = st();
      // Size tween; rebuild in steps (bigger steps on low-end), then settle exactly.
      cur.screen += (s.screen - cur.screen) * (reduced ? 1 : 0.18);
      const step = low ? 0.03 : 0.006;
      const settled = Math.abs(cur.screen - s.screen) < 0.002;
      if (Math.abs(cur.screen - (built.size ?? 0)) > (settled ? 0.0005 : step)) buildBody(settled ? s.screen : cur.screen);
      if (built.lenses !== s.lenses || built.mp !== s.mp) buildCamera(false);
      // Colour tween.
      colTarget.set(s.color);
      mat.back.color.lerp(colTarget, 0.12);
      mat.frame.color.lerp(colTarget.clone().lerp(frameMix, 0.6), 0.12);
      mat.bump.color.lerp(colTarget.clone().multiplyScalar(0.45), 0.12);
      // Screen value tweens.
      if (live.current.mode !== drawMode) { drawMode = live.current.mode; screenDirty = true; }
      const nb = cur.bat + (s.battery - cur.bat) * 0.15;
      const nn = cur.needle + ((RAM_NEEDLE[s.ram] ?? 0.5) - cur.needle) * 0.12;
      if (Math.abs(nb - cur.bat) > 1 || Math.abs(nn - cur.needle) > 0.001) screenDirty = true;
      cur.bat = nb; cur.needle = nn;
      if (screenDirty) { drawScreen(); screenDirty = false; }
      // Lens pop-in.
      cam?.children.forEach((L) => {
        if (!L.userData.born) return;
        const t = Math.min(1, Math.max(0, (now - L.userData.born) / 450));
        const e = t < 1 ? 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2) : 1;
        L.scale.setScalar(Math.max(0.001, e));
        if (t >= 1) L.userData.born = 0;
      });
      // Idle sway when untouched.
      const idle = !dragging && now - lastInteract > 2500 && !reduced;
      const sway = idle ? Math.sin(now / 1400) * 0.28 : 0, bob = reduced ? 0 : Math.sin(now / 1100) * 0.025;
      if (!dragging && idle) targetX += (0 - targetX) * 0.05;
      rotY += (targetY + sway - rotY) * 0.08; rotX += (targetX - rotX) * 0.1;
      phone.rotation.set(rotX + 0.06, rotY, 0); phone.position.y = bob + 0.03;
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.8 - bob * 4;
      renderer.render(scene, camera);
    }

    // Drag to spin. touch-action: pan-y keeps vertical page scroll working.
    const onDown = (e: PointerEvent) => {
      dragging = { x: e.clientX, y: e.clientY, ry: targetY, rx: targetX };
      cv.setPointerCapture(e.pointerId);
      if (!dragged) { dragged = true; cbs.current.onFirstDrag?.(); }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      targetY = dragging.ry + (e.clientX - dragging.x) * 0.012;
      targetX = Math.max(-0.5, Math.min(0.5, dragging.rx + (e.clientY - dragging.y) * 0.006));
      lastInteract = performance.now();
    };
    const onUp = () => { dragging = null; lastInteract = performance.now(); };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();

    mat.back.color.set(st().color);
    buildBody(st().screen);
    face(live.current.faceBack);
    faceRef.current = face;
    dirtyRef.current = () => { screenDirty = true; };
    raf = requestAnimationFrame(loop);
    document.fonts?.ready.then(() => { logoTex.draw("UNITED"); mpTex.draw(`${st().mp}MP`); screenDirty = true; });

    cbs.current.onReady({
      snapshot(cfg) {
        snapping = true;
        const save = { st: live.current.st, cur: { ...cur }, rotY, rotX, py: phone.position.y, mode: drawMode };
        const cols = [mat.back.color.clone(), mat.frame.color.clone(), mat.bump.color.clone()];
        live.current = { ...live.current, st: { ...cfg, screen: Math.max(6.1, Math.min(6.9, cfg.screen)) } };
        cur.screen = live.current.st.screen; cur.bat = cfg.battery; cur.needle = RAM_NEEDLE[cfg.ram] ?? 0.5;
        buildBody(cur.screen);
        cam?.children.forEach((L) => { L.scale.setScalar(1); L.userData.born = 0; });
        const tc = new THREE.Color(cfg.color);
        mat.back.color.copy(tc); mat.frame.color.copy(tc.clone().lerp(frameMix, 0.6)); mat.bump.color.copy(tc.clone().multiplyScalar(0.45));
        drawMode = "home"; drawScreen();
        phone.rotation.set(0.12, Math.PI - 0.55, 0); phone.position.y = 0;
        const SW = 360, SH = 480;
        renderer.setSize(SW, SH, false); camera.aspect = SW / SH; camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        const url = renderer.domElement.toDataURL("image/png"); // read in the same task: no preserveDrawingBuffer needed
        live.current = { ...live.current, st: save.st };
        Object.assign(cur, save.cur); rotY = save.rotY; rotX = save.rotX; phone.position.y = save.py; drawMode = save.mode;
        mat.back.color.copy(cols[0]); mat.frame.color.copy(cols[1]); mat.bump.color.copy(cols[2]);
        buildBody(cur.screen);
        resize(); screenDirty = true; snapping = false;
        return url;
      },
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
      dropGroup(body); dropGroup(cam);
      scene.traverse((o) => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); });
      env.traverse((o) => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); });
      Object.values(mat).forEach((m) => m.dispose());
      [screenMat, logoMat, mpMat].forEach((m) => m.dispose());
      [screenTex, shadowTex, logoTex, mpTex].forEach((t) => t.dispose());
      envRT.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0">
      <canvas ref={canvas} className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing" aria-label="3D preview of your phone. Drag to spin." role="img" />
    </div>
  );
}
