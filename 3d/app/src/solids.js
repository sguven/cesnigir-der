// v1.18 Solid walls, kerbs and fences for the walking character (Nov 2026, owner: "we walk through the pavements and
// walls: make them solid, and let us jump over them").
//
// The collision data of the first-person walk only knows the building footprints (D.buildings) and the ground
// (terrain, roads, bridge). Everything else the village builds — stone and brick walls, kerbs and pavements, fences,
// railings, steps, benches, lamp posts, tree trunks, rocks — had no collision. Instead of giving each of those builders
// its own collision shapes, this module reads the finished scene once: every triangle of the solid meshes is sampled
// every ~20 cm and the samples are binned into a 25 cm grid over the ground. Each cell keeps
//   top   the highest point of anything standing there, up to LOW m above the terrain (a wall's crown, a kerb's top);
//   tall  whether something there also goes on above that (a house wall, a lamp post, a tree trunk, a big rock).
// So a cell is either free ground, something low to step onto (a kerb, a pavement, a step: up to STEP above the feet),
// something to jump onto or over (a wall, a fence: its top), or a tall solid that nothing gets over. Overhangs that start
// above LOW (eaves, canopies, lamp heads, balconies) are ignored, so you can walk under them.
//
// Built in time slices after the page has loaded (a few hundred ms in all, ~8 ms a frame), so it never stalls a frame.
import * as THREE from 'three';

export const CELL = 0.25;          // grid cell (m)
const CH = 64;                      // cells per chunk side (16 m)
const LOW = 2.6;                    // above this height over the terrain a sample only marks the cell "tall"
const TALL_TO = 4.5;                // ... up to this height (higher: upper storeys, roofs, minarets: ignored)
const SAMPLE = 0.2;                 // sample spacing on a triangle (m)
// meshes that are not obstacles: ground and road surfaces, foliage and grass, glass, water, the car and the character
const SKIP = /^(Arazi|Su_|Yol|Toprak_Yol|Otlar|Calilar|Gezi_Alani|Pencereler|Cim|Toros|V_road|V_lawn|V_csLawn|V_glass|Cam$|V_vine|V_grape|V_flagTR|V_canvas|V_csLampGlass|.*Yaprak)/;

// v1.22: heights are measured from `baseH` (the terrain, or the deck of the Çeşnigir Bridge where it stands over it).
// Measured from the riverbed, the bridge's piers came out as tall solids right across the deck, so the walker could
// not cross; what lies under the deck (piers, arches) is now not an obstacle on it.
// v1.28: `deckH` (optional): the raised surface baseH takes the maximum of with the terrain (the bridge deck), -Infinity
// off it. With it the builder knows where baseH is just the terrain and can interpolate it across a triangle.
export function createSolids({ scene, terrH, baseH = terrH, deckH = null, exclude = [] }) {
  const chunks = new Map();
  const ckey = (ci, cj) => ci * 100003 + cj;
  function chunkAt(ci, cj, make) {
    const k = ckey(ci, cj); let c = chunks.get(k);
    if (!c && make) { c = { top: new Float32Array(CH * CH).fill(-1e9), tall: new Uint8Array(CH * CH) }; chunks.set(k, c); }
    return c;
  }
  // v1.28: the last chunk is remembered (one Map lookup per sample was a tenth of the build)
  let lci = NaN, lcj = NaN, lc = null;

  // ---- the job list: one entry per mesh (or per instance of an instanced mesh) ----
  const jobs = [];
  const skipSet = new Set(exclude);
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || !o.name || SKIP.test(o.name)) return;
    for (let a = o; a; a = a.parent) if (skipSet.has(a) || a.name === 'Arena') return;   // (the Game's bots and weapons)
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && m.transparent && m.opacity < 0.9) return;
    const pos = o.geometry.attributes.position; if (!pos) return;
    const n = o.isInstancedMesh ? o.count : 1;
    for (let k = 0; k < n; k++) {
      const mat = new THREE.Matrix4();
      if (o.isInstancedMesh) { o.getMatrixAt(k, mat); mat.premultiply(o.matrixWorld); } else mat.copy(o.matrixWorld);
      jobs.push({ o, mat, tri: 0 });
    }
  });

  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), _cr = new THREE.Vector3();
  // v1.28: the ground under every sample is interpolated from the ground under the triangle's three corners (the terrain
  // is flat between its grid points, so this is the same height to a few mm on these small triangles) instead of being
  // looked up for each sample, and the sample is written straight into the grid. The lookups (terrain and bridge, a
  // function call with boxed numbers each) made the build ~4× slower than it needed to be and threw away ~35 MB of
  // garbage a second: on a phone the grid was still being built a minute into the Game, ~8 ms of every frame.
  // Where a triangle touches the bridge deck (baseH is then not one flat piece) each sample still asks baseH.
  /** One sample at a + e1·s + e2·r of the current triangle; ga + gb·s + gc·r is the ground under it when `flat`. */
  function mark(s, r, flat, ga, gb, gc) {
    const x = a.x + e1.x * s + e2.x * r, y = a.y + e1.y * s + e2.y * r, z = a.z + e1.z * s + e2.z * r;
    const h = y - (flat ? ga + gb * s + gc * r : baseH(x, z));
    if (h < -0.3 || h > TALL_TO) return;
    const i = Math.floor(x / CELL), j = Math.floor(z / CELL), ci = Math.floor(i / CH), cj = Math.floor(j / CH);
    if (ci !== lci || cj !== lcj) { lci = ci; lcj = cj; lc = chunkAt(ci, cj, true); }
    const n = (i - ci * CH) + (j - cj * CH) * CH;
    if (h > LOW) lc.tall[n] = 1; else if (y > lc.top[n]) lc.top[n] = y;
  }
  /** Sample triangles of the current job until the deadline. Returns true when everything is done. */
  function work(deadline) {
    while (jobs.length) {
      const J = jobs[jobs.length - 1], g = J.o.geometry, pos = g.attributes.position, idx = g.index;
      const nTri = (idx ? idx.count : pos.count) / 3;
      for (; J.tri < nTri; J.tri++) {
        if ((J.tri & 63) === 0 && performance.now() > deadline) return false;
        const t = J.tri * 3, ia = idx ? idx.getX(t) : t, ib = idx ? idx.getX(t + 1) : t + 1, ic = idx ? idx.getX(t + 2) : t + 2;
        a.fromBufferAttribute(pos, ia).applyMatrix4(J.mat); b.fromBufferAttribute(pos, ib).applyMatrix4(J.mat); c.fromBufferAttribute(pos, ic).applyMatrix4(J.mat);
        // skip triangles wholly above TALL_TO or below the ground (cheap test at the centroid)
        const cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3, t0 = terrH(cx, cz), gy = deckH === null ? baseH(cx, cz) : Math.max(t0, deckH(cx, cz));
        if (Math.min(a.y, b.y, c.y) > gy + TALL_TO || Math.max(a.y, b.y, c.y) < t0 - 0.3) continue;
        // a huge triangle (a ground plate): not an obstacle (the test of the old sampling, so the same triangles are left out)
        if (Math.max(1, Math.ceil(a.distanceTo(b) / SAMPLE)) * Math.max(1, Math.ceil(a.distanceTo(c) / SAMPLE)) > 40000) continue;
        // v1.28: sampled along the longest edge every SAMPLE and across the triangle every SAMPLE of its height. The
        // samples were a grid of (edge 1 / SAMPLE) × (edge 2 / SAMPLE), so a long thin triangle (a trim, a railing, a
        // plinth: 10 m long, 5 cm wide) got ~1250 samples where ~50 cover it; three quarters of all samples were those.
        { const lab = a.distanceToSquared(b), lbc = b.distanceToSquared(c), lca = c.distanceToSquared(a);
          if (lbc >= lab && lbc >= lca) { e1.copy(a); a.copy(b); b.copy(c); c.copy(e1); }        // longest edge first: a→b
          else if (lca >= lab && lca >= lbc) { e1.copy(a); a.copy(c); c.copy(b); b.copy(e1); } }
        e1.subVectors(b, a); e2.subVectors(c, a);
        const l1 = e1.length(), hgt = l1 > 1e-9 ? _cr.crossVectors(e1, e2).length() / l1 : 0;
        const n1 = Math.max(1, Math.ceil(l1 / SAMPLE)), n2 = Math.max(1, Math.ceil(hgt / SAMPLE));
        // (a triangle over 6 m across could span the 6.9 m wide deck band with all its corners off it: asked per sample)
        const flat = deckH === null ? baseH === terrH : (n1 <= 30 && n2 <= 30 && deckH(a.x, a.z) === -Infinity && deckH(b.x, b.z) === -Infinity && deckH(c.x, c.z) === -Infinity && deckH(cx, cz) === -Infinity);
        const ga = flat ? terrH(a.x, a.z) : 0, gb = flat ? terrH(b.x, b.z) - ga : 0, gc = flat ? terrH(c.x, c.z) - ga : 0;
        for (let u = 0; u <= n1; u++) for (let v = 0; v <= n2 - u * n2 / n1 + 1e-6; v++) {
          const s = u / n1, r = v / n2; if (s + r > 1.0001) break;
          mark(s, r, flat, ga, gb, gc);
        }
        // the two shorter edges too, every SAMPLE (a wall's top edge is often one of them: its highest points)
        const m1 = Math.max(1, Math.ceil(Math.sqrt(e2.x * e2.x + e2.y * e2.y + e2.z * e2.z) / SAMPLE));
        for (let k = 1; k < m1; k++) mark(0, k / m1, flat, ga, gb, gc);
        const m2 = Math.max(1, Math.ceil(b.distanceTo(c) / SAMPLE));
        for (let k = 1; k < m2; k++) mark(1 - k / m2, k / m2, flat, ga, gb, gc);
      }
      jobs.pop();
    }
    return true;
  }

  const S = {
    ready: false,
    /** Build in slices of `ms` per animation frame (v1.28: or of what ms() returns, asked every frame); resolves when done. */
    build(ms = 8) {
      const t0 = performance.now(), slice = typeof ms === 'function' ? ms : () => ms;
      return new Promise(res => { const f = () => { if (work(performance.now() + slice())) { S.ready = true; S.ms = performance.now() - t0; res(S); } else requestAnimationFrame(f); }; f(); });
    },
    /**
     * The highest solid in a disk of radius r around (x, z) that rises above `above`; Infinity for a tall solid
     * (one that goes on above LOW over the terrain, e.g. a house wall or a post), -1e9 when there is none.
     */
    topIn(x, z, r, above = -1e9) {
      let best = -1e9;
      const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL), r2 = (r + CELL * 0.71) ** 2;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * CELL - x, dz = (j + 0.5) * CELL - z; if (dx * dx + dz * dz > r2) continue;
        const ci = Math.floor(i / CH), cj = Math.floor(j / CH), ch = chunks.get(ckey(ci, cj)); if (!ch) continue;
        const n = (i - ci * CH) + (j - cj * CH) * CH;
        if (ch.tall[n]) { if (ch.top[n] > baseH((i + 0.5) * CELL, (j + 0.5) * CELL) + LOW - 0.5) return Infinity; }
        const t = ch.top[n]; if (t > above && t > best) best = t;
      }
      return best;
    },
    /**
     * v1.23 (Game): where the segment a→b first runs into a solid, as a fraction of the way (0…1), or -1 when it is
     * clear. Walks the grid cell by cell (no cell is skipped, however thin the wall). A cell blocks when the segment
     * passes below its top (a wall, a fence, a kerb) or, for a tall solid standing on the ground (a house wall, a post,
     * a tree trunk), below TALL_TO over the ground. The first and last `skip` metres are not tested, so the shooter's
     * and the target's own spot (a bench, a post they stand against) never hides them.
     */
    segmentHit(ax, ay, az, bx, by, bz, skip = 0.35) {
      const dx = bx - ax, dz = bz - az, dy = by - ay, L = Math.sqrt(dx * dx + dz * dz);
      if (L < 1e-6) return -1;
      const s0 = skip / L, s1 = 1 - skip / L; if (s0 >= s1) return -1;
      let i = Math.floor(ax / CELL), j = Math.floor(az / CELL);
      const si = dx > 0 ? 1 : -1, sj = dz > 0 ? 1 : -1, adx = Math.abs(dx), adz = Math.abs(dz);
      const tdi = adx > 1e-9 ? CELL / adx : Infinity, tdj = adz > 1e-9 ? CELL / adz : Infinity;
      let tmi = adx > 1e-9 ? (dx > 0 ? (i + 1) * CELL - ax : ax - i * CELL) / adx : Infinity;
      let tmj = adz > 1e-9 ? (dz > 0 ? (j + 1) * CELL - az : az - j * CELL) / adz : Infinity;
      let t = 0, lci = NaN, lcj = NaN, ch = null;
      for (let guard = 0; guard < 8192 && t < s1; guard++) {
        const te = Math.min(tmi, tmj, 1);
        if (te > s0) {
          const ci = Math.floor(i / CH), cj = Math.floor(j / CH);
          if (ci !== lci || cj !== lcj) { lci = ci; lcj = cj; ch = chunks.get(ckey(ci, cj)); }
          if (ch) {
            const n = (i - ci * CH) + (j - cj * CH) * CH, top = ch.top[n], ymin = ay + dy * (dy < 0 ? te : Math.max(t, s0));
            if (ymin < top) return Math.max(t, s0);
            if (ch.tall[n]) {
              const g = baseH((i + 0.5) * CELL, (j + 0.5) * CELL);
              if (top > g + LOW - 0.5 && ymin < g + TALL_TO) return Math.max(t, s0);
            }
          }
        }
        if (tmi < tmj) { i += si; t = tmi; tmi += tdi; } else { j += sj; t = tmj; tmj += tdj; }
      }
      return -1;
    },
    get chunks() { return chunks.size; },
  };
  return S;
}
