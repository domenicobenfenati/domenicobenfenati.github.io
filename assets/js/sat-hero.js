// Interactive hero: a synthetic Sentinel-2 scene under drifting clouds. A lens follows the pointer
// (or wanders on its own); inside it the clouds are removed, the masked pixels are outlined as
// reconstructed, and the scene is shown in the chosen band composite (true colour, false colour, NDVI).
// The scene is generated, not real data. Under reduced motion a single still frame is drawn.

const hero = document.querySelector('[data-sat]');
const canvas = hero?.querySelector('canvas.sat');
const ctx = canvas?.getContext('2d');

if (hero && canvas && ctx) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PX = 3;            // CSS pixels per "satellite pixel"
  const CLOUD_CELL = 4;    // scene pixels per cloud-mask cell
  let W = 0, H = 0, dpr = 1, gw = 0, gh = 0;
  const layers = {};       // composite name -> canvas (gw x gh)
  let mode = 'tci';
  let cloudCanvas, cloudCtx, cloudImg, shadowCanvas, shadowCtx, shadowImg, cw = 0, ch = 0, cloudA = new Float32Array(0);
  const lens = { x: 0, y: 0, tx: 0, ty: 0, r: 120 };
  let pointer = false, running = false, raf = 0;
  const t0 = performance.now();

  // ------------------------------------------------------------------ noise
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const P = new Uint8Array(512);
  { const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
  const fade = (t) => t * t * (3 - 2 * t);
  const hash = (x, y) => P[(P[x & 255] + y) & 255] / 255;
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    const u = fade(xf), v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };

  // ------------------------------------------------------------------ the scene
  // classes: 0 crop, 1 forest, 2 bare soil, 3 water, 4 urban, 5 sand, 6 hedge
  function buildScene() {
    seed = 7;
    gw = Math.ceil(W / PX); gh = Math.ceil(H / PX);
    const cls = new Uint8Array(gw * gh), veg = new Float32Array(gw * gh);
    // fields: Voronoi on a jittered grid, stretched along a tilted axis
    const cell = 26, sx = Math.ceil(gw / cell) + 2, sy = Math.ceil(gh / cell) + 2;
    const seeds = [];
    for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) {
      const r = rnd();
      const k = r < 0.62 ? 0 : r < 0.76 ? 2 : r < 0.9 ? 1 : 4;
      seeds.push({ x: (i - 1 + rnd()) * cell, y: (j - 1 + rnd()) * cell, k, v: k === 0 ? 0.25 + rnd() * 0.7 : k === 1 ? 0.85 + rnd() * 0.1 : k === 2 ? 0.05 + rnd() * 0.12 : 0.1 });
    }
    const ang = -0.35, ca = Math.cos(ang), sa = Math.sin(ang);
    const coastY = new Float32Array(gw); for (let x = 0; x < gw; x++) coastY[x] = gh * 0.93 - x * 0.12 + Math.sin(x / 37) * 9 + fbm(x / 22, 3.1) * 14;
    const coast = (x) => coastY[x];
    const river = (y) => gw * 0.58 + Math.sin(y / 31) * 26 + Math.sin(y / 11) * 5 + y * 0.18;
    for (let y = 0; y < gh; y++) {
      const ry = river(y), rw = 2.6 + fbm(y / 9, 7) * 1.5;
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        if (y > coast(x)) { cls[i] = y - coast(x) < 3 ? 5 : 3; veg[i] = -0.3; continue; }
        if (Math.abs(x - ry) < rw) { cls[i] = 3; veg[i] = -0.2; continue; }
        // nearest and second-nearest seed in the stretched metric
        const gx = Math.floor(x / cell) + 1, gy = Math.floor(y / cell) + 1;
        let d1 = 1e9, d2 = 1e9, best = 0;
        for (let j = gy - 1; j <= gy + 1; j++) for (let k = gx - 1; k <= gx + 1; k++) {
          if (j < 0 || k < 0 || j >= sy || k >= sx) continue;
          const s = seeds[j * sx + k], dx = x - s.x, dy = y - s.y;
          const u = dx * ca - dy * sa, v = (dx * sa + dy * ca) * 1.8;
          const d = u * u + v * v;
          if (d < d1) { d2 = d1; d1 = d; best = j * sx + k; } else if (d < d2) d2 = d;
        }
        const s = seeds[best];
        if (Math.sqrt(d2) - Math.sqrt(d1) < 1.1) { cls[i] = 6; veg[i] = 0.55; continue; }
        cls[i] = s.k; veg[i] = Math.max(0, Math.min(1, s.v + (fbm(x / 6, y / 6, 2) - 0.5) * 0.18));
      }
    }
    const make = (fn) => {
      const c = document.createElement('canvas'); c.width = gw; c.height = gh;
      const g = c.getContext('2d'), img = g.createImageData(gw, gh), d = img.data;
      for (let i = 0; i < gw * gh; i++) {
        const n = (hash(i % 251, (i / 251) | 0) - 0.5) * 14; // sensor-like speckle
        const [r, gg, b] = fn(cls[i], veg[i]);
        d[i * 4] = r + n; d[i * 4 + 1] = gg + n; d[i * 4 + 2] = b + n; d[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0); return c;
    };
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    layers.tci = make((k, v) => k === 3 ? [22, 52, 78] : k === 4 ? [128, 124, 122] : k === 5 ? [214, 202, 168] : k === 6 ? [62, 84, 46] : k === 2 ? mix([176, 146, 110], [150, 128, 96], v) : k === 1 ? [40, 72, 38] : mix([186, 168, 112], [70, 118, 52], v));
    layers.fcc = make((k, v) => k === 3 ? [12, 18, 44] : k === 4 ? [96, 140, 160] : k === 5 ? [200, 210, 220] : k === 6 ? [150, 40, 50] : k === 2 ? [120, 132, 140] : k === 1 ? [140, 20, 36] : mix([150, 150, 150], [222, 32, 48], v));
    const ramp = [[-0.3, [44, 82, 140]], [0, [190, 190, 180]], [0.25, [215, 48, 39]], [0.45, [252, 141, 89]], [0.6, [254, 224, 139]], [0.75, [145, 207, 96]], [1, [26, 120, 60]]];
    const ndvi = (v) => { for (let j = 1; j < ramp.length; j++) if (v <= ramp[j][0]) { const [a, ca2] = ramp[j - 1], [b, cb] = ramp[j]; return mix(ca2, cb, (v - a) / (b - a)); } return ramp[ramp.length - 1][1]; };
    layers.ndvi = make((k, v) => ndvi(k === 4 ? 0.12 : k === 5 ? 0.05 : v));
  }

  function buildClouds() {
    cw = Math.ceil(gw / CLOUD_CELL); ch = Math.ceil(gh / CLOUD_CELL);
    cloudCanvas = document.createElement('canvas'); cloudCanvas.width = cw; cloudCanvas.height = ch;
    shadowCanvas = document.createElement('canvas'); shadowCanvas.width = cw; shadowCanvas.height = ch;
    cloudCtx = cloudCanvas.getContext('2d'); shadowCtx = shadowCanvas.getContext('2d');
    cloudImg = cloudCtx.createImageData(cw, ch); shadowImg = shadowCtx.createImageData(cw, ch);
    cloudA = new Float32Array(cw * ch);
  }

  function updateClouds(t) {
    const ox = t * 0.0016, oy = t * 0.0004, sc = 0.045 * CLOUD_CELL / 4;
    const d = cloudImg.data, s = shadowImg.data;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      const n = fbm(x * sc + ox, y * sc * 1.4 + oy, 5);
      const a = Math.max(0, Math.min(1, (n - 0.47) / 0.2));
      cloudA[i] = a;
      d[i * 4] = 250; d[i * 4 + 1] = 252; d[i * 4 + 2] = 255; d[i * 4 + 3] = a * 235;
      s[i * 4] = 10; s[i * 4 + 1] = 20; s[i * 4 + 2] = 30; s[i * 4 + 3] = a * 90;
    }
    cloudCtx.putImageData(cloudImg, 0, 0); shadowCtx.putImageData(shadowImg, 0, 0);
  }

  // ------------------------------------------------------------------ drawing
  const LABEL = { tci: 'True colour B4 B3 B2', fcc: 'False colour B8 B4 B3', ndvi: 'NDVI (B8 − B4)/(B8 + B4)' };
  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(layers.tci, 0, 0, gw * PX, gh * PX);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(shadowCanvas, 14, 20, cw * CLOUD_CELL * PX, ch * CLOUD_CELL * PX);
    ctx.drawImage(cloudCanvas, 0, 0, cw * CLOUD_CELL * PX, ch * CLOUD_CELL * PX);

    // the lens: the same place, cloud-free, in the chosen composite
    const { x, y, r } = lens;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(layers[mode], 0, 0, gw * PX, gh * PX);
    // the pixels the cloud mask flagged, now reconstructed
    const step = CLOUD_CELL * PX;
    ctx.strokeStyle = 'rgba(214,200,40,0.85)'; ctx.lineWidth = 1;
    const x0 = Math.max(0, Math.floor((x - r) / step)), x1 = Math.min(cw - 1, Math.ceil((x + r) / step));
    const y0 = Math.max(0, Math.floor((y - r) / step)), y1 = Math.min(ch - 1, Math.ceil((y + r) / step));
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      if (cloudA[j * cw + i] > 0.5) ctx.strokeRect(i * step + 0.5, j * step + 0.5, step - 1, step - 1);
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    // crosshair ticks
    ctx.beginPath();
    for (const [a, b] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { ctx.moveTo(x + a * (r - 10), y + b * (r - 10)); ctx.lineTo(x + a * (r + 8), y + b * (r + 8)); }
    ctx.stroke();
    // label under the lens
    let masked = 0, total = 0;
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) { const cx = (i + 0.5) * step - x, cy = (j + 0.5) * step - y; if (cx * cx + cy * cy < r * r) { total++; if (cloudA[j * cw + i] > 0.5) masked++; } }
    const txt = `${LABEL[mode]} · ${total ? Math.round((masked / total) * 100) : 0}% of pixels filled`;
    ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
    const tw = ctx.measureText(txt).width + 20, lx = Math.min(W - tw - 8, Math.max(8, x - tw / 2)), ly = y + r + 52 < H - (W >= 1024 ? 130 : 70) ? y + r + 14 : Math.max(8, y - r - 38);
    ctx.fillStyle = 'rgba(24,23,21,0.82)';
    ctx.beginPath(); ctx.rect(lx, ly, tw, 24); ctx.fill();
    ctx.fillStyle = '#e8e8e3'; ctx.fillText(txt, lx + 10, ly + 16);
    hero.dataset.lensMasked = String(masked);
  }

  // the lens wanders over the right side of the hero when no pointer is on it
  function wander(t) {
    const s = t / 1000, wide = W >= 1024;
    lens.tx = (wide ? W * 0.72 : W * 0.5) + Math.sin(s * 0.31) * W * (wide ? 0.14 : 0.3);
    lens.ty = wide ? H * 0.47 + Math.sin(s * 0.47 + 1) * H * 0.18 : H - 150 + Math.sin(s * 0.47 + 1) * 12;
  }

  function frame(now) {
    const t = now - t0;
    if (!pointer) wander(t);
    lens.x += (lens.tx - lens.x) * 0.12; lens.y += (lens.ty - lens.y) * 0.12;
    updateClouds(t);
    draw(t);
    raf = running ? requestAnimationFrame(frame) : 0;
  }
  function start() { if (!running && !reduce) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); raf = 0; }

  function resize() {
    const r = hero.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height); dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    lens.r = W >= 1024 ? Math.max(90, Math.min(150, Math.min(W, H) * 0.16)) : 64;
    buildScene(); buildClouds();
    wander(reduce ? 0 : performance.now() - t0); lens.x = lens.tx; lens.y = lens.ty;
    updateClouds(reduce ? 4000 : performance.now() - t0); draw(0);
  }

  hero.addEventListener('pointermove', (e) => {
    if (e.target.closest('a, button, .sat-panel')) { pointer = false; return; }
    const r = hero.getBoundingClientRect();
    pointer = true; lens.tx = e.clientX - r.left; lens.ty = e.clientY - r.top;
    if (reduce) { lens.x = lens.tx; lens.y = lens.ty; draw(0); }
  });
  hero.addEventListener('pointerleave', () => { pointer = false; });

  hero.querySelectorAll('[data-composite]').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.composite;
    hero.querySelectorAll('[data-composite]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (!running) draw(0);
  }));

  new ResizeObserver(() => resize()).observe(hero);
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  resize();
}
