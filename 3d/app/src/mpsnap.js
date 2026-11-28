// v1.28 "Birlikte oyna", smoother: other players (and the host's bots) are drawn a moment in the past, between two
// positions that really arrived, instead of being guessed ahead from the last one (Nov 2026).
//
// Each position message carries the time it was sent on the sender's clock (ts, seconds). The receiver keeps the last
// second or so of them and draws the player where they were `delay` seconds ago, interpolating between the two
// messages around that moment. `delay` covers one message interval plus the network's jitter (measured: how much later
// than the fastest message the others arrive), so there is nearly always a message on both sides and the figure moves
// at an even pace. When the network stalls longer than that, the last movement is carried on for at most 0.3 s and
// then the figure waits. The delay is eased (the playback runs at most 20 % fast or slow), so it never jumps.
//
// The old way (v1.24) moved the figure towards the newest position plus its speed measured between arrivals: every
// late or early message changed that speed, so the figure surged, slowed and slid past corners and back.

const KEEP = 1.5, MAX_EXTRA = 0.3, TELEPORT = 15;

/** A position message from another player (or one of the host's bots) arrived. now: my clock (s), ts: theirs. */
export function snapPush(b, now, ts, x, y, z, r) {
  let s = b.snap;
  if (!s || ts < s.lastTs - 5) { s = b.snap = { buf: [], off: now - ts, jit: 0.04, iv: 1 / 6, lastTs: ts - 1 / 6, d: -1, lastNow: now }; }
  if (ts <= s.lastTs) return;   // repeated or out of order
  const gap = ts - s.lastTs; if (gap < 1) s.iv += (Math.max(0.03, gap) - s.iv) * 0.25;
  s.lastTs = ts;
  // clock offset: the fastest arrival seen, creeping up slowly so a clock that drifts is followed
  const o = now - ts;
  if (o < s.off) s.off = o; else s.off += Math.min(o - s.off, 0.0005);
  const j = Math.min(0.5, o - s.off); s.jit += (j - s.jit) * (j > s.jit ? 0.1 : 0.02);
  const last = s.buf[s.buf.length - 1];
  if (last && Math.hypot(x - last.x, z - last.z) > TELEPORT) s.buf.length = 0;   // respawned: no gliding across the map
  s.buf.push({ t: ts, x, y, z, r });
  while (s.buf.length > 2 && s.buf[1].t < ts - KEEP) s.buf.shift();
}

/** Forget the stored positions (respawn, came back to life): the next message is drawn where it says. */
export function snapReset(b) { if (b.snap) b.snap.buf.length = 0; }

/** Set b.x, b.y, b.z, b.yaw to where the player is drawn now. Returns false if there is nothing to draw from yet. */
export function snapSample(b, now) {
  const s = b.snap; if (!s || !s.buf.length) return false;
  const dt = Math.max(0, Math.min(0.25, now - s.lastNow)); s.lastNow = now;
  const want = Math.min(0.6, s.iv + s.jit);
  if (s.d < 0) s.d = want; else s.d += Math.max(-0.2 * dt, Math.min(0.2 * dt, want - s.d));
  const t = now - s.off - s.d, buf = s.buf, n = buf.length;
  let a = buf[0], c = null;
  if (t <= a.t || n === 1) { put(b, a, a, 0); return true; }
  for (let i = n - 1; i > 0; i--) if (buf[i - 1].t <= t) { a = buf[i - 1]; c = buf[i]; break; }
  if (t >= buf[n - 1].t) {   // past the newest message: carry the last movement on a little, then wait
    a = buf[n - 2]; c = buf[n - 1];
    const span = c.t - a.t; if (span <= 0 || span > 0.6) { put(b, c, c, 0); return true; }
    put(b, a, c, 1 + Math.min(t - c.t, MAX_EXTRA) / span, true); return true;
  }
  put(b, a, c, (t - a.t) / Math.max(1e-4, c.t - a.t)); return true;
}

function put(b, a, c, k, extra) {
  b.x = a.x + (c.x - a.x) * k; b.z = a.z + (c.z - a.z) * k;
  b.y = extra ? c.y : a.y + (c.y - a.y) * k;   // no climbing into the air past the last message
  let dr = c.r - a.r; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
  b.yaw = a.r + dr * Math.min(1, k);
}
