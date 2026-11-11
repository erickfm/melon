/**
 * Camera: a focus point and zoom the world is drawn through, eased toward a
 * target. Moments call focus() to push in on a point or frame() to fit a
 * region; after `hold` seconds it eases back home. Real time, visual only
 * (render.js reads `cam`; the HUD and banners are drawn outside it).
 */

import { WORLD_W, WORLD_H, JAR } from './constants.js';

export const HOME = { x: WORLD_W / 2, y: (JAR.top + JAR.bottom) / 2 };

export const cam = { x: HOME.x, y: HOME.y, z: 1, tx: HOME.x, ty: HOME.y, tz: 1, rate: 6, hold: 0, homeRate: 3 };

// Push in on a point; returns home after `hold` seconds.
export function focus(x, y, z, { hold = 0.6, rate = 14, homeRate = 3 } = {}) {
  Object.assign(cam, { tx: x, ty: y, tz: z, rate, hold, homeRate });
}

// Fit a box (with padding) on screen.
export function frame(x0, y0, x1, y1, { hold = 1, rate = 5, homeRate = 2.5, pad = 40, maxZ = 1.6 } = {}) {
  const w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
  const z = Math.max(1, Math.min(maxZ, WORLD_W / w, (JAR.bottom - JAR.top + 120) / h));
  focus((x0 + x1) / 2, (y0 + y1) / 2, z, { hold, rate, homeRate });
}

export function home(rate = 3) {
  Object.assign(cam, { tx: HOME.x, ty: HOME.y, tz: 1, rate, hold: 0 });
}

export function resetCamera() {
  Object.assign(cam, { x: HOME.x, y: HOME.y, z: 1, tx: HOME.x, ty: HOME.y, tz: 1, hold: 0 });
}

export function updateCamera(dt) {
  if (cam.hold > 0 && (cam.hold -= dt) <= 0) home(cam.homeRate);
  const k = 1 - Math.exp(-cam.rate * dt);
  cam.x += (cam.tx - cam.x) * k;
  cam.y += (cam.ty - cam.y) * k;
  cam.z += (cam.tz - cam.z) * k;
}

// The view's center for zoom z, kept so the world still fills the screen.
export function viewCenter(z) {
  if (z <= 1) return [HOME.x, HOME.y];
  const cx = Math.min(WORLD_W - (WORLD_W - HOME.x) / z, Math.max(HOME.x / z, cam.x));
  const cy = Math.min(WORLD_H - (WORLD_H - HOME.y) / z, Math.max(HOME.y / z, cam.y));
  return [cx, cy];
}
