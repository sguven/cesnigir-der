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
    if (!s.includes('window.__kk')) s = s.replace('</script>\n</body>', 'window.__kk = { setMode, camera, P, surfaceAt, scene, game: () => game };\n</script>\n</body>'); body = Buffer.from(s); }
  res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(body); });
await new Promise(r => server.listen(0, r)); const port = server.address().port;
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { window.__solidsSlice = () => 400; try { localStorage.setItem('kk_quality', 'smooth'); } catch (_) {} });
const pg = await ctx.newPage(); let solidsReady = false; pg.on('console', m => { if (/\[solids\]/.test(m.text())) { solidsReady = true; console.log(m.text()); } });
const errs = []; pg.on('pageerror', e => { errs.push(e.message); console.log('[pageerror]', e.message); });
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





// v1.34 bullet holes: shoot round at eye level from a few spots, then check every wall mark against the real drawn
// geometry (a slow full-scene ray, test only): looking at the mark from 3 m out, the first thing hit should be a wall ~3 m away
{ const t1 = Date.now(); while (!solidsReady && Date.now() - t1 < 600000) await wait(1000); console.log('solids ready', solidsReady); }
await pg.evaluate(() => { window.__hd = []; const G = window.__kk.game().state; G.spawnSafe = 999; G.god = true; for (const b of G.bots) { b.x += 500; b.z += 500; b.cd = 999; b.reaction = 999; } });
for (const spot of [[0, 0], [30, 0], [0, 30], [-30, 0], [0, -30], [30, 30]]) {
  await pg.evaluate(([dx, dz]) => { const k = window.__kk, g = k.game(), G = g.state, P = k.P, cam = k.camera; if (!window.__q0) window.__q0 = [P.x, P.z]; P.x = window.__q0[0] + dx; P.z = window.__q0[1] + dz; P.y = k.surfaceAt(P.x, P.z).y;
    for (let yd = 0; yd < 360; yd += 30) { P.yaw = yd * Math.PI / 180; cam.position.set(P.x, P.y + 1.6, P.z); cam.rotation.set(0.03, P.yaw, 0, 'YXZ'); cam.updateMatrixWorld(); G.ammo.ak47 = { mag: 30, reserve: 90 }; G.swapT = 0; G.reloading = 0; G.fireCd = 0; G.fired = false; G.lastShot = G.time - 2; G.heat = 0; g.fire(); } }, spot);
}
const check = await pg.evaluate(async () => { const THREE = await import('three'); const k = window.__kk, sc = k.scene, h = sc.getObjectByName('Game_BulletHoles'), a = h.instanceMatrix.array;
  const game = sc.getObjectByName('Arena'); const objs = []; sc.traverse(o => { if (o.isMesh) { let p = o, inGame = false; while (p) { if (p === game) inGame = true; p = p.parent; } if (!inGame) objs.push(o); } });
  const rc = new THREE.Raycaster(); rc.far = 10; const out = [];
  for (let i = 0; i < h.count; i++) { const o = i * 16, l = Math.hypot(a[o + 8], a[o + 9], a[o + 10]), n = new THREE.Vector3(a[o + 8] / l, a[o + 9] / l, a[o + 10] / l), p = new THREE.Vector3(a[o + 12], a[o + 13], a[o + 14]);
    const from = p.clone().addScaledVector(n, 3); rc.set(from, n.clone().negate()); const hit = rc.intersectObjects(objs, false)[0];
    out.push((n.y > 0.5 ? 'yer ' : 'duvar ') + (hit ? hit.object.name + '@' + hit.distance.toFixed(2) : 'HİÇBİR ŞEY')); if (!hit) (window.__miss = window.__miss || []).push([p.x, p.y, p.z, n.x, n.z]); }
  // cost of a ray limited to the wall meshes and to 0.6 m either side of the mark
  const walls = objs.filter(o => /Duvar|whitewash|derWall|limestone|plinth|pilaster|stone|brick|wall/i.test(o.name)); let tris = 0; for (const o of walls) tris += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3;
  const names = {}; for (const o of walls) names[o.name] = (names[o.name] || 0) + 1;
  const rc2 = new THREE.Raycaster(); rc2.near = 0; rc2.far = 1.2; let t0 = performance.now(), n2 = 0;
  const sph = walls.map(o => { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); return o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); });
  for (let i = 0; i < h.count; i++) { const o = i * 16, l = Math.hypot(a[o + 8], a[o + 9], a[o + 10]), n = new THREE.Vector3(a[o + 8] / l, a[o + 9] / l, a[o + 10] / l), p = new THREE.Vector3(a[o + 12], a[o + 13], a[o + 14]); const near = walls.filter((w, j) => sph[j].center.distanceTo(p) < sph[j].radius + 1); rc2.set(p.clone().addScaledVector(n, 0.6), n.clone().negate()); rc2.intersectObjects(near, false); n2++; }
  out.push('wall meshes ' + walls.length + ' tris ' + Math.round(tris) + ' ms/ray ' + ((performance.now() - t0) / n2).toFixed(2) + ' ' + JSON.stringify(names));
  return out; });
console.log('marks:', check.length); for (const c of check) console.log('  ', c);
// look at a wall mark from 2.5 m, then fire a group at that wall and look again
const mk = await pg.evaluate(() => { const k = window.__kk, h = k.scene.getObjectByName('Game_BulletHoles'), a = h.instanceMatrix.array, P = k.P;
  for (let i = h.count - 1; i >= 0; i--) { const o = i * 16, l = Math.hypot(a[o + 8], a[o + 9], a[o + 10]), nx = a[o + 8] / l, ny = a[o + 9] / l, nz = a[o + 10] / l; if (Math.abs(ny) > 0.3) continue;
    const px = a[o + 12], py = a[o + 13], pz = a[o + 14]; P.x = px + nx * 3; P.z = pz + nz * 3; P.y = k.surfaceAt(P.x, P.z).y; P.yaw = Math.atan2(nx, nz); P.pitch = Math.atan2(py - (P.y + 1.6), 3); return [px, py, pz]; } return null; });
console.log('close-up of', mk); await wait(1200);
await pg.evaluate(() => { const k = window.__kk, g = k.game(), G = g.state, P = k.P, cam = k.camera; const y0 = P.yaw, p0 = P.pitch; cam.position.set(P.x, P.y + 1.6, P.z);
  for (let i = 0; i < 7; i++) { P.yaw = y0 + (Math.random() - 0.5) * 0.25; P.pitch = p0 + (Math.random() - 0.5) * 0.2; cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ'); cam.updateMatrixWorld(); G.ammo.ak47 = { mag: 30, reserve: 90 }; G.fireCd = 0; G.fired = false; G.lastShot = G.time - 2; G.heat = 0; g.fire(); }
  P.yaw = y0; P.pitch = p0; });
await wait(1500); await shot('9-yakin-duvar');
const misses = await pg.evaluate(() => window.__miss || []);
for (const [mi, m] of misses.slice(0, 3).entries()) {
  console.log('miss', m.map(v => v.toFixed(2)).join(','));
  await pg.evaluate((m) => { const k = window.__kk, P = k.P; P.x = m[0] + m[3] * 3; P.z = m[2] + m[4] * 3; P.y = k.surfaceAt(P.x, P.z).y; P.yaw = Math.atan2(m[3], m[4]); P.pitch = Math.atan2(m[1] - (P.y + 1.6), 3); }, m);
  await wait(1500); await shot('8-havada-' + mi);
}
console.log('page errors:', errs.length);
await browser.close(); server.close();
