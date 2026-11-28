// v1.31 weapon check on a phone-size page (touch): fire rate, recoil, knife, hit marker, AWP scope, auto reload.
// Needs `npm i --no-save three@0.170.0` in 3d/app. Usage: OUT=/tmp/silah W=844 H=390 node tools/silah_test.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright';
const REPO = new URL('..', import.meta.url).pathname, THREE_DIR = path.join(REPO, 'node_modules/three'), out = process.env.OUT || '/tmp/silah'; fs.mkdirSync(out, { recursive: true });
const W = +(process.env.W || 844), H = +(process.env.H || 390);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.wasm': 'application/wasm', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => { const p = decodeURIComponent(req.url.split('?')[0]);
  const file = p.startsWith('/three/') ? path.join(THREE_DIR, p.slice(7)) : path.join(REPO, p === '/' ? 'index.html' : p);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  let body = fs.readFileSync(file);
  if (file.endsWith('index.html')) { let s = body.toString(); s = s.replace('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js', '/three/build/three.module.js').replace('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/', '/three/examples/jsm/');
    if (!s.includes('window.__kk')) s = s.replace('</script>\n</body>', 'window.__kk = { setMode, camera, P, surfaceAt, game: () => game };\n</script>\n</body>'); body = Buffer.from(s); }
  res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(body); });
await new Promise(r => server.listen(0, r)); const port = server.address().port;
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { try { localStorage.setItem('kk_quality', 'smooth'); } catch (_) {} });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => { errs.push(e.message); console.log('[pageerror]', e.message); });
const t0 = Date.now();
await pg.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 300000 }); await pg.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 900000 });
console.log('loaded', ((Date.now() - t0) / 1000).toFixed(0), 's');
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await pg.evaluate(() => window.__kk.setMode('game')); await wait(2500);
const shot = (n) => pg.screenshot({ path: `${out}/${n}.jpg`, type: 'jpeg', quality: 80, timeout: 600000 });
// a bot standing still d metres ahead, a little to the side by `off` degrees; the player looks at its chest
const setup = (d, off = 0, wpn = 'ak47') => pg.evaluate(([d, off, wpn]) => { const k = window.__kk, g = k.game(), G = g.state, P = k.P;
  G.spawnSafe = 99; G.god = true; for (const b of G.bots) { b.x = P.x + 400; b.z = P.z + 400; b.pauseT = 999; }
  const b = G.bots[0], a = P.yaw + off * Math.PI / 180; b.x = P.x - Math.sin(a) * d; b.z = P.z - Math.cos(a) * d; b.y = k.surfaceAt(b.x, b.z).y; b.hp = 100; b.dead = 0; b.state = 'patrol'; b.route = null; b.pauseT = 999; b.cd = 999; b.yaw = P.yaw;   /* facing the player */ b.reaction = 999;
  P.pitch = Math.atan2(b.y + 1.15 - (P.y + 1.6), d); if (G.weapon !== wpn) { G.primary = wpn === 'deagle' || wpn === 'knife' ? G.primary : wpn; g.setWeapon(wpn); } G.ammo[wpn] = { mag: g.WEAPONS[wpn].mag, reserve: g.WEAPONS[wpn].reserve }; G.swapT = 0; G.heat = 0; G.reloading = 0; G.rq = 0; G.rqBack = 0; return b.id; }, [d, off, wpn]);
const hp = () => pg.evaluate(() => window.__kk.game().state.bots[0].hp);

// Each check moves one bot in front, points the camera at it and fires in the same step (the bots' own AI cannot
// walk it away first), so the numbers are about the guns, not where the bot wandered.
const fireAt = (d, off, wpn, opts = {}) => pg.evaluate(([d, off, wpn, opts]) => { const k = window.__kk, g = k.game(), G = g.state, P = k.P, cam = k.camera;
  G.spawnSafe = 99; G.god = true;
  if (G.weapon !== wpn) { if (g.WEAPONS[wpn].slot === 1) G.primary = wpn; g.setWeapon(wpn); }
  G.ammo[wpn] = { mag: opts.mag ?? g.WEAPONS[wpn].mag, reserve: g.WEAPONS[wpn].reserve }; G.swapT = 0; G.heat = 0; G.reloading = 0; G.fireCd = 0; G.fired = false; G.lastShot = -9;
  if (opts.scope) { g.setScope(true); G.scopeT = 1; }
  // an open spot: the bridge square side is busy, so look along +x from a fixed point on the main road
  P.x = opts.px ?? P.x; P.z = opts.pz ?? P.z; P.y = k.surfaceAt(P.x, P.z).y;
  for (const b of G.bots) { b.x = P.x + 300; b.z = P.z + 300; }
  const b = G.bots[0], a = P.yaw + off * Math.PI / 180; b.x = P.x - Math.sin(a) * d; b.z = P.z - Math.cos(a) * d; b.y = k.surfaceAt(b.x, b.z).y; b.hp = 100; b.dead = 0; b.yaw = opts.back ? P.yaw + Math.PI : P.yaw;
  P.pitch = Math.atan2(b.y + 1.15 * b.mesh.scale.y - (P.y + 1.6), d);
  cam.position.set(P.x, P.y + 1.6, P.z); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ'); cam.updateMatrixWorld();
  const n = opts.n || 1; let fired = 0; for (let i = 0; i < n; i++) { G.fireCd = 0; G.fired = false; G.lastShot = G.time - 2; const m = G.ammo[wpn].mag; g.fire(); fired += m - G.ammo[wpn].mag; cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ'); cam.updateMatrixWorld(); }
  if (opts.scope) g.setScope(false);
  return { wpn, d, off, hp: b.dead > 0 ? 'öldü' : b.hp, mark: document.getElementById('hitMark').className, fired }; }, [d, off, wpn, opts]);


// find a clear line of sight: turn round until a scoped AWP shot at 80 m lands (trees and houses stop bullets)
let clear = null;
for (const spot of [[0, 0], [60, 0], [0, 60], [-60, 0], [0, -60], [120, 40]]) {
  for (let yd = 0; yd < 360 && !clear; yd += 30) {
    await pg.evaluate(([dx, dz, yd]) => { const P = window.__kk.P; if (!window.__p0) window.__p0 = [P.x, P.z]; P.x = window.__p0[0] + dx; P.z = window.__p0[1] + dz; P.yaw = yd * Math.PI / 180; }, [spot[0], spot[1], yd]);
    const r = await fireAt(80, 0, 'awp', { scope: true }); if (r.hp !== 100) clear = [spot, yd];
  }
  if (clear) break;
}
console.log('clear line found at', clear);
for (let i = 0; i < 3; i++) console.log('AK 1 shot @20 m', await fireAt(20, 0, 'ak47'));
console.log('AK 3 shots @20 m', await fireAt(20, 0, 'ak47', { n: 3 }));
console.log('AK 3 shots @80 m', await fireAt(80, 0, 'ak47', { n: 3 }));
console.log('Deagle 2 shots @15 m', await fireAt(15, 0, 'deagle', { n: 2 }));
console.log('Deagle 1 shot @60 m', await fireAt(60, 0, 'deagle'));
console.log('AWP scoped @80 m', await fireAt(80, 0, 'awp', { scope: true }));
console.log('AWP no scope @20 m (x3 tries)', await fireAt(20, 0, 'awp'), await fireAt(20, 0, 'awp'), await fireAt(20, 0, 'awp'));
console.log('knife front 1.8 m 20°', await fireAt(1.8, 20, 'knife'));
console.log('knife front 1.8 m 50° (should miss)', await fireAt(1.8, 50, 'knife'));
console.log('knife behind 1.5 m', await fireAt(1.5, 0, 'knife', { back: true }));
await shot('1-isabet');
// held AK: real frames
await fireAt(20, 0, 'ak47', { n: 0 }); await wait(200);
let r = await pg.evaluate(async () => { const G = window.__kk.game().state, P = window.__kk.P, p0 = P.pitch, y0 = P.yaw, m0 = G.ammo.ak47.mag, t0 = G.time; let frames = 0; const c = () => { frames++; if (G.firing) requestAnimationFrame(c); }; G.firing = true; G.fired = false; requestAnimationFrame(c); await new Promise(r => setTimeout(r, 2500)); G.firing = false; const gt = G.time - t0;
  return { shots: m0 - G.ammo.ak47.mag, gameSec: gt.toFixed(2), fps: (frames / gt).toFixed(1), perSec: ((m0 - G.ammo.ak47.mag) / gt).toFixed(1), climbDeg: ((P.pitch - p0) * 180 / Math.PI).toFixed(1), yawDeg: ((P.yaw - y0) * 180 / Math.PI).toFixed(1) }; });
console.log('AK held:', r);
// auto reload
r = await pg.evaluate(async () => { const g = window.__kk.game(), G = g.state; G.ammo.ak47 = { mag: 0, reserve: 60 }; G.reloading = 0; G.swapT = 0; G.lastShot = G.time - 1; const t0 = G.time; await new Promise(r => setTimeout(r, 1200)); return { gameSec: (G.time - t0).toFixed(2), reloading: G.reloading.toFixed(2), weapon: G.weapon, dead: G.dead, shop: G.shopOpen, throwT: G.throwT, mag: G.ammo.ak47.mag }; });
console.log('auto reload check:', r);
await wait(3000); console.log('mag after 3 s', await pg.evaluate(() => window.__kk.game().state.ammo.ak47.mag));
// empty gun -> pistol
r = await pg.evaluate(async () => { const G = window.__kk.game().state; G.ammo.ak47 = { mag: 0, reserve: 0 }; G.reloading = 0; G.swapT = 0; G.lastShot = G.time - 1; await new Promise(r => setTimeout(r, 1500)); return { weapon: G.weapon, slots: document.getElementById('ghSlots').children.length, feed: document.getElementById('ghFeed').innerText.split('\n')[0] }; });
console.log('AK empty ->', r);
await pg.evaluate(() => { const g = window.__kk.game(); g.state.ammo.ak47 = { mag: 30, reserve: 90 }; g.setWeapon('ak47'); });
// tracer + flash frame
await fireAt(40, 2, 'ak47'); await wait(30); await shot('2-iz-mermisi');
console.log('page errors:', errs.length);
await browser.close(); server.close();
