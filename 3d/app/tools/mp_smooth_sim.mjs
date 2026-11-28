// v1.28. How smoothly another player moves on my screen: a player runs a route (8 m/s, turns, strafes, stops), sends its
// position N times a second over a jittery network, my page draws it at 60 fps. Old = v1.24 dead reckoning
// (remoteStep before this change), new = snapshot interpolation (src/mpsnap.js). Prints jerk and error.
// Usage: node tools/mp_smooth_sim.mjs   (RATE=10 for 10 messages a second; needs nothing but node)
import { snapPush, snapSample } from '../src/mpsnap.js';

const rand = (s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(7);
const RATE = +(process.env.RATE || 6), DUR = 60, FPS = 60;
// the true path: piecewise, changes direction every 0.6-2.5 s, sometimes stops, speed 0/3/8 m/s
const segs = []; { let t = 0, x = 0, z = 0; while (t < DUR + 2) { const d = 0.6 + rand() * 1.9, a = rand() * 6.283, v = rand() < 0.15 ? 0 : rand() < 0.3 ? 3 : 8; segs.push({ t, x, z, a, v, d }); x += Math.sin(a) * v * d; z += Math.cos(a) * v * d; t += d; } }
const truth = (t) => { let s = segs[0]; for (const g of segs) { if (g.t <= t) s = g; else break; } const u = t - s.t; return { x: s.x + Math.sin(s.a) * s.v * u, z: s.z + Math.cos(s.a) * s.v * u, r: s.a }; };
// network: base 60 ms + jitter up to 120 ms, 5 % spikes of +250 ms; messages may arrive out of order? (broadcast over one websocket: no)
const msgs = []; { let last = 0; for (let ts = 0; ts < DUR; ts += 1 / RATE) { const lat = 0.06 + rand() * 0.12 + (rand() < 0.05 ? 0.25 : 0); const at = Math.max(last, ts + lat); last = at; const p = truth(ts); msgs.push({ at, ts, ...p }); } }

function runOld() {
  const b = { x: 0, z: 0, yaw: 0, tx: 0, tz: 0, tyaw: 0, tvx: 0, tvz: 0, rxT: 0 }; let time = 0, mi = 0; const out = [];
  for (let f = 0; f < DUR * FPS; f++) {
    const dt = 1 / FPS; time += dt;
    while (mi < msgs.length && msgs[mi].at <= time) { const m = msgs[mi++]; const dtm = Math.max(0.05, time - b.rxT); b.rxT = time; b.tvx = (m.x - (b.lx ?? m.x)) / dtm; b.tvz = (m.z - (b.lz ?? m.z)) / dtm; b.lx = m.x; b.lz = m.z; b.tx = m.x; b.tz = m.z; b.tyaw = m.r; }
    if (time - b.rxT < 0.6) { b.tx += b.tvx * dt; b.tz += b.tvz * dt; }
    const k = Math.min(1, dt * 9); b.x += (b.tx - b.x) * k; b.z += (b.tz - b.z) * k;
    out.push({ t: time, x: b.x, z: b.z });
  }
  return out;
}
function runNew() {
  const b = { x: 0, z: 0, y: 0, yaw: 0 }; let time = 0, mi = 0; const out = [];
  for (let f = 0; f < DUR * FPS; f++) {
    const dt = 1 / FPS; time += dt;
    while (mi < msgs.length && msgs[mi].at <= time) { const m = msgs[mi++]; snapPush(b, time, Math.round(m.ts * 100) / 100, m.x, 0, m.z, m.r); }
    if (b.snap) snapSample(b, time);
    out.push({ t: time, x: b.x, z: b.z });
  }
  return out;
}
function score(out, name) {
  // jerk: change of the drawn velocity from one frame to the next (m/s), 95th percentile and frames over 2 m/s
  const dv = []; let err = 0, n = 0, lagBest = 0;
  for (let i = 2; i < out.length; i++) { const v1x = (out[i].x - out[i - 1].x) * FPS, v1z = (out[i].z - out[i - 1].z) * FPS, v0x = (out[i - 1].x - out[i - 2].x) * FPS, v0z = (out[i - 1].z - out[i - 2].z) * FPS; dv.push(Math.hypot(v1x - v0x, v1z - v0z)); }
  // overshoot: drawn speed above the true top speed (8 m/s) = sliding past and snapping back
  let over = 0; for (let i = 1; i < out.length; i++) { const v = Math.hypot(out[i].x - out[i - 1].x, out[i].z - out[i - 1].z) * FPS; if (v > 9) over++; }
  for (const o of out) { if (o.t < 2) continue; const p = truth(o.t); err += Math.hypot(p.x - o.x, p.z - o.z); n++; }
  dv.sort((a, b) => a - b);
  // how far behind: best-fitting delay
  let best = 1e9; for (let d = 0; d <= 0.5; d += 0.01) { let e = 0; for (const o of out) { if (o.t < 2) continue; const p = truth(o.t - d); e += Math.hypot(p.x - o.x, p.z - o.z); } if (e < best) { best = e; lagBest = d; } }
  console.log(`${name.padEnd(4)} jerk p50 ${dv[dv.length >> 1].toFixed(2)} p95 ${dv[Math.floor(dv.length * 0.95)].toFixed(2)} p99 ${dv[Math.floor(dv.length * 0.99)].toFixed(2)} m/s per frame · frames faster than 9 m/s (sliding/snapping) ${over} of ${out.length} · mean distance from true spot ${(err / n).toFixed(2)} m · best-fit delay ${(lagBest * 1000).toFixed(0)} ms (residual ${(best / n).toFixed(2)} m)`);
}
console.log(`${RATE} messages/s, 60-180 ms latency, 5 % spikes +250 ms`);
score(runOld(), 'old'); score(runNew(), 'new');
