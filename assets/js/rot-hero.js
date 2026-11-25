// Hero panel: four short animations, one per research line, that rotate on their own.
// 1 Data quality: wrong labels, missing values and duplicates are found and repaired; a k-NN model is retrained.
// 2 Satellite imagery: a probe reads the 12 Sentinel-2 bands of the pixel under it.
// 3 Knowledge graphs and RAG: a question is answered by following entities and relations of a small graph.
// 4 Retrieval under attack: a small shift of the query embedding changes the top-5 results.
// All data are synthetic and generated in the page; the accuracy and recall figures are computed on them.

const root = document.querySelector('[data-rot]');
if (root) (() => {
  const canvas = root.querySelector('canvas.rot-canvas');
  const ctx = canvas.getContext('2d');
  const titleEl = root.querySelector('.rot-title');
  const countEl = root.querySelector('.rot-count');
  const capEl = root.querySelector('.rot-caption');
  const refEl = root.querySelector('.rot-ref');
  const dots = [...root.querySelectorAll('.rot-dot')];
  const prevB = root.querySelector('[data-rot-prev]'), nextB = root.querySelector('[data-rot-next]'), pauseB = root.querySelector('[data-rot-pause]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const INK = '#181715', MUTED = '#5c5b56', LINE = 'rgba(24,23,21,0.14)', BRASS = '#bfb21a', RUST = '#b4462c', PAPER = '#f2f2ee';
  const MONO = '"JetBrains Mono", ui-monospace, monospace', SANS = '"Hanken Grotesk", system-ui, sans-serif';
  const DUR = 7000;
  let W = 0, H = 0, dpr = 1;

  // ------------------------------------------------------------------ helpers
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  function label(text, x, y, opt = {}) {
    ctx.font = `${opt.weight || 400} ${opt.size || 11}px ${opt.font || MONO}`;
    ctx.fillStyle = opt.color || INK; ctx.textAlign = opt.align || 'left'; ctx.textBaseline = opt.base || 'alphabetic';
    ctx.fillText(text, x, y);
  }
  function header(left, right, leftColor) {
    ctx.font = `500 11px ${MONO}`; const rw = ctx.measureText(right).width;
    ctx.font = `400 11px ${MONO}`; const lw = ctx.measureText(left).width;
    label(right, W - 14, 20, { align: 'right', weight: 500 });
    if (14 + lw + 16 < W - 14 - rw) label(left, 14, 20, { color: leftColor || MUTED });
  }
  function chip(text, x, y, on, opt = {}) {
    ctx.font = `500 11px ${MONO}`;
    const w = ctx.measureText(text).width + 16, h = 22;
    const x0 = opt.center ? x - w / 2 : x, y0 = y - h / 2;
    ctx.fillStyle = on ? (opt.fill || INK) : PAPER; ctx.strokeStyle = on ? (opt.fill || INK) : 'rgba(24,23,21,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.fill(); ctx.stroke();
    label(text, x0 + 8, y + 4, { color: on ? (opt.ink || PAPER) : INK, weight: 500 });
    return { x: x0, y: y0, w, h };
  }

  // ------------------------------------------------------------------ 1 data quality
  const DQ = (() => {
    seed = 21;
    const truth = (x, y) => (y > 0.5 + 0.13 * Math.sin(x * 7 + 0.6) ? 1 : 0);
    const pts = [];
    for (let i = 0; i < 74; i++) { const x = 0.04 + rnd() * 0.92, y = 0.06 + rnd() * 0.88; pts.push({ x, y, c: truth(x, y), kind: 'ok' }); }
    // wrong labels near the boundary, where they hurt most
    const near = pts.map((p, i) => [Math.abs(p.y - 0.5 - 0.13 * Math.sin(p.x * 7 + 0.6)), i]).sort((a, b) => a[0] - b[0]);
    for (const [, i] of near.slice(4, 24).filter((_, k) => k % 2 === 0)) { pts[i].kind = 'label'; pts[i].shown = 1 - pts[i].c; }
    // missing values: the y coordinate is lost and naively filled with the column mean
    let m = 0; for (const p of pts) if (p.kind === 'ok' && m < 6 && rnd() < 0.15) { p.kind = 'missing'; p.yRaw = 0.5; m++; }
    // duplicates: a few wrong-label points copied three times each
    const dup = pts.filter((p) => p.kind === 'label').slice(0, 3);
    for (const d of dup) for (let k = 0; k < 2; k++) pts.push({ x: d.x + (rnd() - 0.5) * 0.012, y: d.y + (rnd() - 0.5) * 0.012, c: d.c, shown: d.shown, kind: 'dup' });
    const test = []; for (let i = 0; i < 600; i++) { const x = rnd(), y = rnd(); test.push({ x, y, c: truth(x, y) }); }
    const knn = (train, x, y, k = 5) => { const d = train.map((p) => [(p.x - x) ** 2 + (p.y - y) ** 2, p.c]).sort((a, b) => a[0] - b[0]).slice(0, k); return d.reduce((s, q) => s + q[1], 0) / k > 0.5 ? 1 : 0; };
    const rawTrain = pts.map((p) => ({ x: p.x, y: p.kind === 'missing' ? p.yRaw : p.y, c: p.kind === 'label' || p.kind === 'dup' ? p.shown : p.c }));
    const fixTrain = pts.filter((p) => p.kind !== 'dup').map((p) => ({ x: p.x, y: p.y, c: p.c }));
    const acc = (train) => test.reduce((s, t) => s + (knn(train, t.x, t.y) === t.c ? 1 : 0), 0) / test.length;
    const GX = 48, GY = 30;
    const grid = (train) => { const g = new Uint8Array(GX * GY); for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) g[j * GX + i] = knn(train, (i + 0.5) / GX, (j + 0.5) / GY); return g; };
    return { pts, accRaw: acc(rawTrain), accFix: acc(fixTrain), gRaw: grid(rawTrain), gFix: grid(fixTrain), GX, GY,
      nLabel: pts.filter((p) => p.kind === 'label').length, nMiss: pts.filter((p) => p.kind === 'missing').length, nDup: pts.filter((p) => p.kind === 'dup').length };
  })();

  function drawDQ(p) {
    const L = 14, T = 34, PW = W - 28, PH = H - T - 40;
    const X = (x) => L + x * PW, Y = (y) => T + (1 - y) * PH;
    const fix = ease(seg(p, 0.58, 0.86)), detect = ease(seg(p, 0.3, 0.42));
    // decision regions of the k-NN model, raw then repaired
    const cw = PW / DQ.GX, ch = PH / DQ.GY;
    for (let j = 0; j < DQ.GY; j++) for (let i = 0; i < DQ.GX; i++) {
      const a = DQ.gRaw[j * DQ.GX + i], b = DQ.gFix[j * DQ.GX + i], v = lerp(a, b, fix);
      // opaque cells, so that neighbouring cells do not leave seams
      ctx.fillStyle = `rgb(${Math.round(lerp(227, 236, v))},${Math.round(lerp(227, 233, v))},${Math.round(lerp(222, 196, v))})`;
      ctx.fillRect(L + i * cw, T + (DQ.GY - 1 - j) * ch, cw + 0.5, ch + 0.5);
    }
    ctx.strokeStyle = 'rgba(24,23,21,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(L + 0.5, T + 0.5, PW, PH);
    // points
    for (const q of DQ.pts) {
      let x = q.x, y = q.y, c = q.c, alpha = 1;
      if (q.kind === 'missing') y = lerp(q.yRaw, q.y, fix);
      if (q.kind === 'label' || q.kind === 'dup') c = fix > 0.5 ? q.c : q.shown;
      if (q.kind === 'dup') alpha = 1 - fix;
      if (alpha <= 0.02) continue;
      ctx.globalAlpha = alpha;
      const px = X(x), py = Y(y);
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = c ? BRASS : INK; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
      if (detect > 0 && q.kind !== 'ok' && fix < 1) {
        ctx.globalAlpha = alpha * detect * (1 - fix * 0.9);
        ctx.strokeStyle = RUST; ctx.lineWidth = 1.6;
        if (q.kind === 'missing') ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
    }
    // readouts
    const acc = lerp(DQ.accRaw, DQ.accFix, ease(seg(p, 0.66, 0.92)));
    const stage = p < 0.3 ? 'raw data' : p < 0.58 ? 'checks' : 'repaired, retrained';
    header(stage, `k-NN accuracy ${acc.toFixed(2)}`);
    const yb = H - 14;
    if (detect > 0) {
      ctx.globalAlpha = detect;
      label(W < 520 ? `${DQ.nLabel} labels · ${DQ.nMiss} missing · ${DQ.nDup} duplicates` : `${DQ.nLabel} wrong labels · ${DQ.nMiss} missing values · ${DQ.nDup} duplicates`, L, yb, { color: fix > 0.95 ? MUTED : RUST });
      ctx.globalAlpha = 1;
    } else label('two classes, a curved border', L, yb, { color: MUTED });
  }

  // ------------------------------------------------------------------ 2 satellite: twelve bands
  const BANDS = [['B01', 443], ['B02', 490], ['B03', 560], ['B04', 665], ['B05', 705], ['B06', 740], ['B07', 783], ['B08', 842], ['B8A', 865], ['B09', 945], ['B11', 1610], ['B12', 2190]];
  const BAND_COL = ['#5b4bb7', '#2f6fd6', '#3f9b4a', '#d23b2f', '#a8322a', '#87302c', '#6c2e2e', '#57302f', '#4b2f30', '#3d2d31', '#2e2a2e', '#1f1d20'];
  const CLASSES = {
    crop:   { name: 'Arable land', rgb: [86, 128, 58], r: [0.03, 0.04, 0.08, 0.04, 0.12, 0.32, 0.40, 0.44, 0.45, 0.42, 0.25, 0.12] },
    forest: { name: 'Broad-leaved forest', rgb: [42, 74, 40], r: [0.02, 0.03, 0.05, 0.03, 0.08, 0.24, 0.30, 0.33, 0.34, 0.32, 0.17, 0.08] },
    soil:   { name: 'Bare soil', rgb: [170, 142, 108], r: [0.08, 0.10, 0.14, 0.18, 0.20, 0.22, 0.24, 0.26, 0.27, 0.27, 0.34, 0.30] },
    water:  { name: 'Water', rgb: [30, 58, 84], r: [0.07, 0.065, 0.05, 0.03, 0.025, 0.02, 0.015, 0.012, 0.01, 0.008, 0.004, 0.003] },
    urban:  { name: 'Built-up', rgb: [132, 128, 124], r: [0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.17, 0.18, 0.18, 0.18, 0.20, 0.19] },
  };
  const SAT = (() => {
    seed = 47;
    const GW = 64, GH = 22, cls = new Array(GW * GH), shade = new Float32Array(GW * GH);
    const seeds = [[6, 6, 'crop'], [18, 15, 'soil'], [30, 5, 'forest'], [44, 14, 'crop'], [56, 5, 'urban'], [10, 18, 'forest'], [36, 18, 'soil'], [60, 17, 'crop'], [24, 9, 'crop'], [50, 9, 'soil']];
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const i = y * GW + x;
      if (Math.abs(x - (26 + Math.sin(y / 4) * 4 + y * 0.6)) < 1.4) { cls[i] = 'water'; continue; }
      let best = 0, bd = 1e9; seeds.forEach(([sx, sy], k) => { const d = (x - sx) ** 2 + ((y - sy) * 1.6) ** 2; if (d < bd) { bd = d; best = k; } });
      cls[i] = seeds[best][2]; shade[i] = (rnd() - 0.5) * 0.12;
    }
    return { GW, GH, cls, shade };
  })();
  function drawSAT(p) {
    const L = 14, T = 30, PW = W - 28, PH = Math.round((PW * SAT.GH) / SAT.GW), cs = PW / SAT.GW;
    for (let y = 0; y < SAT.GH; y++) for (let x = 0; x < SAT.GW; x++) {
      const i = y * SAT.GW + x, c = CLASSES[SAT.cls[i]].rgb, s = 1 + SAT.shade[i];
      ctx.fillStyle = `rgb(${c[0] * s | 0},${c[1] * s | 0},${c[2] * s | 0})`; ctx.fillRect(L + x * cs, T + y * cs, cs + 0.5, cs + 0.5);
    }
    // the probe visits several land covers
    const path = [[0.07, 0.3], [0.33, 0.55], [0.42, 0.45], [0.47, 0.25], [0.72, 0.62], [0.88, 0.22]];
    const u = clamp(p * 0.999) * (path.length - 1), k = Math.floor(u), f = ease(clamp((u - k) * 1.6 - 0.3));
    const a = path[k], b = path[Math.min(path.length - 1, k + 1)];
    const px = lerp(a[0], b[0], f), py = lerp(a[1], b[1], f);
    const gx = clamp(Math.floor(px * SAT.GW), 0, SAT.GW - 1), gy = clamp(Math.floor(py * SAT.GH), 0, SAT.GH - 1);
    const C = CLASSES[SAT.cls[gy * SAT.GW + gx]];
    const sx = L + gx * cs, sy = T + gy * cs;
    ctx.strokeStyle = PAPER; ctx.lineWidth = 3; ctx.strokeRect(sx - 1, sy - 1, cs + 2, cs + 2);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(sx - 1, sy - 1, cs + 2, cs + 2);
    // smooth the spectrum between land covers
    if (!drawSAT.cur) drawSAT.cur = C.r.slice();
    for (let i = 0; i < 12; i++) drawSAT.cur[i] += (C.r[i] - drawSAT.cur[i]) * 0.18;
    const r = drawSAT.cur;
    // twelve bars
    const BT = T + PH + 34, BH = H - BT - 34, BL = L + 34, bw = (PW - 34 - 11 * 6) / 12;
    ctx.lineWidth = 1;
    for (const v of [0, 0.25, 0.5]) { const y = Math.round(BT + BH - (v / 0.5) * BH) + 0.5; ctx.strokeStyle = v ? LINE : 'rgba(24,23,21,0.4)'; ctx.beginPath(); ctx.moveTo(L + 30, y); ctx.lineTo(L + PW, y); ctx.stroke(); label(v.toFixed(2), L + 24, y + 3, { size: 10, color: MUTED, align: 'right' }); }
    label('reflectance', L, BT - 8, { size: 10, color: MUTED });
    for (let i = 0; i < 12; i++) {
      const x = BL + i * (bw + 6), h = (r[i] / 0.5) * BH;
      ctx.fillStyle = BAND_COL[i]; ctx.fillRect(x, BT + BH - h, bw, h);
      label(BANDS[i][0], x + bw / 2, BT + BH + 14, { align: 'center', size: 10, color: MUTED });
    }
    const ndvi = (r[7] - r[3]) / (r[7] + r[3] + 1e-6);
    header('pixel under the probe', `${C.name} · NDVI ${ndvi.toFixed(2)}`);
    label('443 nm', BL, H - 6, { size: 10, color: MUTED }); label('2190 nm', W - 14, H - 6, { size: 10, color: MUTED, align: 'right' });
  }

  // ------------------------------------------------------------------ 3 knowledge graph and RAG
  const KG = {
    q: 'Which nutrient is linked to the MTHFR C677T variant?',
    nodes: {
      c677t: ['C677T', 0.1, 0.12, 'variant'], mthfr: ['MTHFR', 0.36, 0.42, 'gene'], folate: ['Folate', 0.64, 0.12, 'nutrient'],
      greens: ['Leafy greens', 0.88, 0.42, 'food'], hcy: ['Homocysteine', 0.5, 0.86, 'metabolite'], b12: ['Vitamin B12', 0.84, 0.86, 'nutrient'],
      meth: ['Methylation', 0.12, 0.86, 'process'],
    },
    edges: [['c677t', 'mthfr', 'variant of'], ['mthfr', 'folate', 'metabolises'], ['folate', 'greens', 'found in'], ['mthfr', 'hcy', 'regulates'], ['b12', 'hcy', 'cofactor'], ['mthfr', 'meth', 'involved in'], ['folate', 'b12', 'works with']],
    path: [['c677t', 'mthfr'], ['mthfr', 'folate'], ['folate', 'greens']],
  };
  function drawKG(p) {
    const L = 14, T = 30, PW = W - 28, GH = H - 30 - 70;
    const typed = Math.floor(KG.q.length * ease(seg(p, 0, 0.26)));
    label('question', L, 20, { color: MUTED });
    const qt = KG.q.slice(0, typed) + (p < 0.28 && Math.floor(p * 40) % 2 ? '▍' : '');
    ctx.font = `500 13px ${SANS}`;
    if (ctx.measureText(KG.q).width < W - L - 86) label(qt, L + 72, 20, { font: SANS, size: 13, weight: 500 });
    else { const cut = KG.q.lastIndexOf(' ', Math.floor(KG.q.length / 2) + 6); label(qt.slice(0, cut), L + 72, 20, { font: SANS, size: 13, weight: 500 }); label(qt.slice(cut + 1), L + 72, 37, { font: SANS, size: 13, weight: 500 }); }
    const narrow = W < 520;
    const POS_N = { c677t: [0.2, 0.06], mthfr: [0.72, 0.32], folate: [0.2, 0.58], greens: [0.72, 0.84] };
    const N = (k) => narrow ? { x: L + POS_N[k][0] * PW, y: T + 40 + POS_N[k][1] * (GH - 30) } : { x: L + 40 + KG.nodes[k][1] * (PW - 80), y: T + 26 + KG.nodes[k][2] * GH * 0.86 };
    const shown = (k) => !narrow || k in POS_N;
    const ent = seg(p, 0.3, 0.4), pathP = seg(p, 0.42, 0.74), ans = seg(p, 0.78, 0.9);
    const onPath = (a, b) => KG.path.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
    // edges
    for (const [a, b, rel] of KG.edges) {
      if (!shown(a) || !shown(b)) continue;
      const A = N(a), B = N(b), idx = onPath(a, b);
      const lit = idx >= 0 ? clamp(pathP * KG.path.length - idx) : 0;
      ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      if (lit > 0) { ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(lerp(A.x, B.x, lit), lerp(A.y, B.y, lit)); ctx.stroke(); }
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      ctx.font = `400 10px ${MONO}`; const tw = ctx.measureText(rel).width + 8;
      ctx.fillStyle = PAPER; ctx.fillRect(mx - tw / 2, my - 8, tw, 14);
      label(rel, mx, my + 3, { align: 'center', size: 10, color: lit > 0.5 ? INK : MUTED });
    }
    // nodes
    for (const k of Object.keys(KG.nodes)) {
      if (!shown(k)) continue;
      const n = N(k), isEnt = k === 'c677t' || k === 'mthfr';
      const reached = KG.path.findIndex(([, b]) => b === k);
      const on = (isEnt && ent > 0.5) || (reached >= 0 && pathP * KG.path.length >= reached + 1);
      chip(KG.nodes[k][0], n.x, n.y, on, { center: true, fill: k === 'folate' && ans > 0.5 ? BRASS : INK, ink: k === 'folate' && ans > 0.5 ? INK : PAPER });
      label(KG.nodes[k][3], n.x, n.y + 24, { align: 'center', size: 10, color: MUTED });
    }
    // answer
    ctx.globalAlpha = ans;
    label('answer', L, H - 30, { color: MUTED });
    ctx.font = `500 13px ${SANS}`;
    const longA = 'Folate, through the MTHFR enzyme. Food source in the graph: leafy greens.';
    label(ctx.measureText(longA).width < W - L - 86 ? longA : 'Folate, through the MTHFR enzyme.', L + 72, H - 30, { font: SANS, size: 13, weight: 500 });
    label(W > 520 ? 'entities used: C677T → MTHFR → Folate → Leafy greens' : 'C677T → MTHFR → Folate → Leafy greens', L + 72, H - 12, { size: 10, color: MUTED });
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ 4 retrieval under attack
  const RET = (() => {
    seed = 77;
    const centers = [[0.28, 0.38, INK], [0.64, 0.3, BRASS], [0.5, 0.74, RUST]];
    const pts = [];
    centers.forEach(([cx, cy], c) => { for (let i = 0; i < 26; i++) pts.push({ x: clamp(cx + gauss() * 0.075, 0.03, 0.97), y: clamp(cy + gauss() * 0.075, 0.05, 0.95), c }); });
    return { pts, centers, q0: [0.33, 0.43], q1: [0.53, 0.33] };
  })();
  function drawRET(p) {
    const L = 14, T = 30, LW = (W - 28) * 0.66, PH = H - T - 30;
    const X = (x) => L + x * LW, Y = (y) => T + y * PH;
    const att = ease(seg(p, 0.36, 0.72));
    const q = [lerp(RET.q0[0], RET.q1[0], att), lerp(RET.q0[1], RET.q1[1], att)];
    const top = RET.pts.map((pt, i) => [(pt.x - q[0]) ** 2 + (pt.y - q[1]) ** 2, i]).sort((a, b) => a[0] - b[0]).slice(0, 5).map((d) => RET.pts[d[1]]);
    ctx.strokeStyle = 'rgba(24,23,21,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(L + 0.5, T + 0.5, LW, PH);
    for (const t of top) { ctx.strokeStyle = 'rgba(24,23,21,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(q[0]), Y(q[1])); ctx.lineTo(X(t.x), Y(t.y)); ctx.stroke(); }
    for (const pt of RET.pts) {
      ctx.beginPath(); ctx.arc(X(pt.x), Y(pt.y), top.includes(pt) ? 5 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle = RET.centers[pt.c][2]; ctx.globalAlpha = top.includes(pt) ? 1 : 0.55; ctx.fill(); ctx.globalAlpha = 1;
    }
    if (att > 0) { // the perturbation
      ctx.strokeStyle = RUST; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(X(RET.q0[0]), Y(RET.q0[1])); ctx.lineTo(X(q[0]), Y(q[1])); ctx.stroke(); ctx.setLineDash([]);
      label('δ', X((RET.q0[0] + q[0]) / 2) + 4, Y((RET.q0[1] + q[1]) / 2) - 6, { color: RUST, weight: 500, size: 13, font: SANS });
    }
    // the query, a star
    const sx = X(q[0]), sy = Y(q[1]); ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 9, a = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(sx + r * Math.cos(a), sy + r * Math.sin(a)); }
    ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    // ranked list
    const RX = L + LW + 18;
    label('top-5 results', RX, T + 12, { color: MUTED });
    top.forEach((t, i) => {
      const y = T + 36 + i * 26; label(String(i + 1), RX, y + 4, { color: MUTED });
      ctx.fillStyle = RET.centers[t.c][2]; ctx.fillRect(RX + 18, y - 7, 14, 14);
      label(W < 520 ? (t.c === 0 ? 'same' : 'other') : t.c === 0 ? 'same class' : 'other class', RX + 40, y + 4, { color: t.c === 0 ? INK : RUST });
    });
    const recall = top.filter((t) => t.c === 0).length / 5;
    header(att < 0.02 ? 'query and its nearest neighbours' : 'query shifted by a small δ', `Recall@5 ${recall.toFixed(2)}`);
  }

  // ------------------------------------------------------------------ rotation
  const SCENES = [
    { title: 'Data quality', draw: drawDQ, caption: 'Wrong labels, missing values and duplicates are found and repaired; the model is retrained on the clean data.', ref: 'PhD thesis · Comput. Electron. Agric. 2025' },
    { title: 'Satellite imagery', draw: drawSAT, caption: 'Each Sentinel-2 pixel carries twelve bands; land covers differ in how they reflect them.', ref: 'EarthJev · arXiv 2611.02096' },
    { title: 'Knowledge graphs and RAG', draw: drawKG, caption: 'A question is answered by following the entities and relations of an ontology, and the path is shown.', ref: 'IEEE TAI 2026 · Neural Comput. Appl. 2026' },
    { title: 'Retrieval under attack', draw: drawRET, caption: 'A small shift of the query embedding changes which images come back.', ref: 'CIKM 2026' },
  ];
  let fixedP = null, cur = 0, start = performance.now(), paused = false, pausedAt = 0, hover = false, raf = 0, visible = true;
  function show(i, user) {
    cur = (i + SCENES.length) % SCENES.length; start = performance.now(); pausedAt = 0; drawSAT.cur = null;
    const s = SCENES[cur];
    titleEl.textContent = s.title; countEl.textContent = `${cur + 1}/${SCENES.length}`;
    capEl.textContent = s.caption; refEl.textContent = s.ref;
    dots.forEach((d, k) => { d.setAttribute('aria-current', k === cur ? 'true' : 'false'); d.style.setProperty('--fill', k < cur ? 1 : 0); });
    root.querySelector('.rot-live').textContent = user ? `${s.title}. ${s.caption}` : '';
  }
  function frame(now) {
    const stopped = paused || hover;
    if (stopped && !pausedAt) pausedAt = now;
    if (!stopped && pausedAt) { start += now - pausedAt; pausedAt = 0; }
    const p = fixedP ?? (reduce ? 1 : clamp(((pausedAt || now) - start) / DUR));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    SCENES[cur].draw(p);
    dots[cur].style.setProperty('--fill', reduce ? 1 : p);
    if (fixedP === null && !reduce && !stopped && p >= 1) show(cur + 1, false);
    raf = visible && !reduce ? requestAnimationFrame(frame) : 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  prevB.addEventListener('click', () => { show(cur - 1, true); kick(); });
  nextB.addEventListener('click', () => { show(cur + 1, true); kick(); });
  dots.forEach((d, k) => d.addEventListener('click', () => { show(k, true); kick(); }));
  pauseB.addEventListener('click', () => { paused = !paused; pauseB.setAttribute('aria-pressed', String(paused)); pauseB.textContent = paused ? 'Play' : 'Pause'; kick(); });
  root.addEventListener('pointerenter', () => { hover = true; });
  root.addEventListener('pointerleave', () => { hover = false; kick(); });
  root.addEventListener('focusin', () => { hover = true; });
  root.addEventListener('focusout', () => { hover = false; kick(); });

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    if (reduce) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); SCENES[cur].draw(1); }
    else kick();
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { visible = false; } else { visible = true; kick(); } });
  if (reduce) { // without motion each scene is drawn finished, and the visitor moves between them
    const redraw = () => { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); SCENES[cur].draw(1); };
    [prevB, nextB, ...dots].forEach((b) => b.addEventListener('click', redraw));
    pauseB.hidden = true;
  }
  // ?scene=2&p=0.8 draws one scene at a fixed point of its animation (for checking the drawing)
  const q = new URLSearchParams(location.search);
  if (q.has('scene')) { fixedP = Number(q.get('p') || 1); show(Number(q.get('scene')) - 1, false); resize(); return; }
  show(0, false);
  resize();
})();
