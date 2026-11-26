// Builds the site's pages from the data files in ./data.
// Run: SITE_EMAIL="name@example.org" node build.mjs
// The contact address is read from SITE_EMAIL, so it is not stored in this script.
import { readFileSync, writeFileSync } from 'node:fs';

const EMAIL = process.env.SITE_EMAIL || '__EMAIL__';

const pubs = JSON.parse(readFileSync(new URL('./data/publications.json', import.meta.url)));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TYPE_LABEL = { journal: 'Journal', conference: 'Conference', chapter: 'Book chapter', workshop: 'Workshop', preprint: 'Preprint' };
const TYPE_PLURAL = { journal: 'Journals', conference: 'Conferences', chapter: 'Book chapters', workshop: 'Workshops', preprint: 'Preprints' };
const counts = pubs.reduce((a, p) => ((a[p.type] = (a[p.type] || 0) + 1), a), {});
const journals = counts.journal || 0;

const authors = (p) => {
  const list = p.authors.map((a) => (/Benfenati/.test(a) ? `<b>${esc(a)}</b>` : esc(a))).join(', ');
  return p.etal ? `${list}, et al.` : list;
};
const links = (p) => {
  const out = [];
  if (p.doi) out.push(`<a href="https://doi.org/${esc(p.doi)}" rel="noopener">DOI</a>`);
  if (p.url) out.push(`<a href="${esc(p.url)}" rel="noopener">PDF</a>`);
  for (const [k, v] of Object.entries(p.links || {})) out.push(`<a href="${esc(v)}" rel="noopener">${esc(k)}</a>`);
  return out.join('');
};
const pubItem = (p) => `
          <li class="pub" data-type="${p.type}">
            <p class="pub__venue mono">${esc(p.abbr)}</p>
            <div class="pub__body">
              <h3 class="pub__title">${esc(p.title)}</h3>
              <p class="pub__authors">${authors(p)}</p>
              <p class="pub__where">${esc(p.venue)}</p>
            </div>
            <p class="pub__links mono">${links(p)}</p>
          </li>`;

const years = [...new Set(pubs.map((p) => p.year))].sort((a, b) => b - a);
const pubList = years.map((y) => `
      <div class="pubyear">
        <p class="pubyear__label">${y}</p>
        <ol class="pubs">${pubs.filter((p) => p.year === y).map(pubItem).join('')}
        </ol>
      </div>`).join('');

const filters = ['all', 'journal', 'conference', 'chapter', 'workshop', 'preprint']
  .filter((t) => t === 'all' || counts[t])
  .map((t) => `<button class="filter" type="button" data-filter="${t}" aria-pressed="${t === 'all'}">${t === 'all' ? 'All' : TYPE_PLURAL[t]} <span class="mono">${t === 'all' ? pubs.length : counts[t]}</span></button>`)
  .join('');

// Sentinel-2 L2A bands and central wavelengths (nm)
const bands = [
  ['B01', 443, '#5b4bb7'], ['B02', 490, '#2f6fd6'], ['B03', 560, '#3f9b4a'], ['B04', 665, '#d23b2f'],
  ['B05', 705, '#a8322a'], ['B06', 740, '#87302c'], ['B07', 783, '#6c2e2e'], ['B08', 842, '#57302f'],
  ['B8A', 865, '#4b2f30'], ['B09', 945, '#3d2d31'], ['B11', 1610, '#2e2a2e'], ['B12', 2190, '#1f1d20'],
];
const bandStrip = bands.map(([b, nm, c], i) => `<li style="--b:${c};--i:${i}"><span>${b}</span><span>${nm}</span></li>`).join('');

const chev = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const FOOT = `<footer class="site-foot">
  <div class="wrap">
    <div class="grid">
      <div class="span-5 stack-2">
        <p class="site-foot__name">Domenico Benfenati</p>
        <p class="muted">IKNOS Lab, DIETI, University of Naples Federico II<br>Via Claudio, Fuorigrotta, Naples</p>
      </div>
      <div class="span-4 start-6 stack-2">
        <p><a class="plain-link" href="mailto:${EMAIL}">${EMAIL}</a></p>
        <p class="elsewhere">
          <a class="plain-link" href="https://scholar.google.com/citations?user=tjH_pzcAAAAJ" rel="noopener">Google Scholar</a>
          <a class="plain-link" href="https://orcid.org/0009-0008-5825-8043" rel="noopener">ORCID</a>
          <a class="plain-link" href="https://www.linkedin.com/in/domenico-benfenati/" rel="noopener">LinkedIn</a>
          <a class="plain-link" href="https://github.com/dBenf" rel="noopener">GitHub</a>
          <a class="plain-link" href="https://huggingface.co/dBenf" rel="noopener">Hugging Face</a>
          <a class="plain-link" href="https://dblp.org/pid/367/6149.html" rel="noopener">dblp</a>
        </p>
      </div>
      <p class="span-3 start-10 mono muted site-foot__legal">&copy; 2026 Domenico Benfenati</p>
    </div>
  </div>
</footer>`;
const CLOSING = `<footer class="footer closing" id="contact" aria-labelledby="close-h">
  <div class="wrap">
    <div class="closing__cta close--type">
      <div class="section-head">
        <h2 id="close-h">Write to me</h2>
        <p>Collaborations, MSc theses on data quality or remote sensing, code or data from the papers: ${EMAIL}</p>
      </div>
      <a class="btn btn--primary btn--xl btn--wide" href="mailto:${EMAIL}">Email me<svg class="m-arrow" viewBox="0 0 12 12" aria-hidden="true"><path class="m-arrow__stem" d="M1 6h8"/><path class="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5"/></svg></a>
    </div>
    <div class="closing__links">
      <div class="grid">
        <div class="span-4 stack-4">
          <a class="nav__logo site-name" href="#top">Domenico Benfenati</a>
          <p class="footer__lede">IKNOS Lab, DIETI, University of Naples Federico II. Via Claudio, Fuorigrotta, Naples.</p>
        </div>
        <div class="span-2 footer__col"><h3>Work</h3><ul><li><a href="research.html">Research</a></li><li><a href="publications.html">Publications</a></li><li><a href="news.html">News</a></li></ul></div>
        <div class="span-2 footer__col"><h3>Academia</h3><ul><li><a href="service.html">Service</a></li><li><a href="teaching.html">Teaching</a></li><li><a href="contact.html">Contact</a></li></ul></div>
        <div class="span-2 footer__col"><h3>Profiles</h3><ul><li><a href="https://scholar.google.com/citations?user=tjH_pzcAAAAJ" rel="noopener">Google Scholar</a></li><li><a href="https://orcid.org/0009-0008-5825-8043" rel="noopener">ORCID</a></li><li><a href="https://www.linkedin.com/in/domenico-benfenati/" rel="noopener">LinkedIn</a></li></ul></div>
        <div class="span-2 footer__col"><h3>Code</h3><ul><li><a href="https://github.com/dBenf" rel="noopener">GitHub</a></li><li><a href="https://huggingface.co/dBenf" rel="noopener">Hugging Face</a></li><li><a href="https://dblp.org/pid/367/6149.html" rel="noopener">dblp</a></li></ul></div>
      </div>
      <div class="footer__legal"><span>&copy; 2026 Domenico Benfenati</span><span>Icons: Lucide (ISC)</span></div>
    </div>
  </div>
</footer>`;
const NAV = [['index.html', 'About'], ['research.html', 'Research'], ['publications.html', 'Publications'], ['service.html', 'Service'], ['teaching.html', 'Teaching'], ['news.html', 'News']];
const page = ({ title, description, main, current }) => {
  const home = current === 'index.html';
  return `<!doctype html>
<html lang="en" data-type="service" data-radius="soft" data-buttons="solid" data-motion>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="profile">
<meta property="og:title" content="Domenico Benfenati, IKNOS Lab, University of Naples Federico II">
<meta property="og:description" content="Data quality and data-centric AI for satellite imagery and agrifood.">
<meta property="og:image" content="https://domenicobenfenati.github.io/share.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#e8e8e3">
<meta name="site-kind" content="other">
<meta name="page-type" content="service">
<link rel="preload" href="assets/fonts/newsreader-latin-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/hanken-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/system.css">
<link rel="stylesheet" href="assets/ui/cards.css">
<link rel="stylesheet" href="assets/motion/motion.css">
<link rel="stylesheet" href="assets/layout/layout.css">
${home ? '<link rel="stylesheet" href="assets/diagrams/diagram.css">' : ''}
<style>
:root {
  --p-bg: #e8e8e3; --p-surface: #dcdcd6; --p-ink: #181715; --p-muted: #5c5b56;
  --p-accent: #bfb21a; --p-accent-ink: #181715; --p-action: #181715; --p-action-ink: #e8e8e3;
  --p-inv-bg: #181715; --p-inv-surface: #242321; --p-inv-ink: #e8e8e3; --p-inv-muted: #91908d;
  --p-inv-accent: #bfb21a; --p-inv-accent-ink: #181715; --p-inv-action: #bfb21a; --p-inv-action-ink: #181715;
  --font-display: "Newsreader", Georgia, serif;
  --font-text: "Hanken Grotesk", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --display-weight: 400;
  --display-tracking: -0.018em;
  --display-tracking-xl: -0.025em;
  --ly-scale: 1.06;
}
</style>
<script>document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700)</script>
${home ? "<script>document.documentElement.classList.add('mo-js');setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500)</script>" : ''}
<style>
  .mono { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0; font-variant-numeric: tabular-nums; }
  h2 { font-family: var(--font-display); }
  .rule-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--s-5); margin-bottom: var(--s-7); }
  .rule-head h2 { font-size: clamp(36px, 4vw, 56px); line-height: 1; }
  .rule-head .mono, .rule-head a { color: var(--muted); }
  .plain-link { color: var(--ink); text-decoration: underline; text-decoration-color: var(--line); text-underline-offset: 3px; transition: text-decoration-color var(--dur) var(--ease); }
  .plain-link:hover { text-decoration-color: currentColor; }

  /* hero: text on the left, a panel of four research lines in rotation on the right (assets/js/rot-hero.js) */
  .hero-ts .hero__grid { align-items: start; }
  .hero-ts .hero__kicker { display: block; }
  .hero-id { display: flex; align-items: center; gap: var(--s-4); margin-bottom: var(--s-6); }
  .avatar { width: 88px; height: 88px; border-radius: 999px; object-fit: cover; filter: grayscale(.15) contrast(1.02); }
  .hero-id p { font-size: var(--t-small); line-height: 1.45; color: var(--muted); }
  .hero-id b { color: var(--ink); font-weight: 500; }
  .hero-ts h1 { font-size: clamp(56px, 7vw, 104px); line-height: 0.95; letter-spacing: var(--display-tracking-xl); }
  .hero__lead { max-width: 40ch; }
  .hero-latest { margin-top: var(--s-7); padding-top: var(--s-4); border-top: 1px solid var(--line); font-size: var(--t-small); max-width: 46ch; }
  .hero-latest .mono { color: var(--muted); margin-right: var(--s-2); }
  .rot { margin: 0; display: grid; gap: var(--s-3); padding: var(--s-4); background: #f2f2ee; border: 1px solid var(--ink); }
  .rot-head { display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); }
  .rot-name { font: 400 22px/1.1 var(--font-display); letter-spacing: -0.01em; }
  .rot-head .rot-ref { display: block; margin-top: 6px; }
  .rot-head .rot-count { color: var(--muted); margin-right: var(--s-2); }
  .rot-nav { display: inline-flex; border: 1px solid var(--ink); }
  .rot-nav button { height: 32px; min-width: 36px; padding: 0 10px; border: 0; background: transparent; font: 500 11px/1 var(--font-mono); color: var(--ink); cursor: pointer; transition: background var(--dur) var(--ease); }
  .rot-nav button + button { border-left: 1px solid var(--ink); }
  .rot-nav button:hover { background: var(--p-surface); }
  .rot-canvas { width: 100%; height: clamp(300px, 44vh, 400px); display: block; }
  .rot-ref { color: var(--muted); }
  .rot-dots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .rot-dot { height: 44px; padding: 0; border: 0; background: transparent; cursor: pointer; position: relative; }
  .rot-dot::before, .rot-dot::after { content: ""; position: absolute; left: 0; right: 0; top: 21px; height: 2px; }
  .rot-dot::before { background: rgba(24,23,21,.18); }
  .rot-dot::after { background: var(--ink); transform-origin: left; transform: scaleX(var(--fill, 0)); }
  .rot-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  @media (min-width: 1024px) and (max-height: 860px) { .hero-latest { display: none; } .hero-id { margin-bottom: var(--s-4); } .rot-canvas { height: 280px; } }
  @media (max-width: 1023px) {
    main > .hero-ts { height: auto; min-height: 0; padding-bottom: var(--s-8); }
    .hero-ts .rot { margin-top: var(--s-7); }
    .rot-nav button { height: 44px; min-width: 44px; }
    .rot-canvas { height: 340px; }
  }

  /* about */
  .bio p { max-width: 62ch; }
  .bio p + p { margin-top: var(--s-4); }
  .bio p:first-child { font: 400 clamp(22px, 2vw, 28px)/1.35 var(--font-display); letter-spacing: -0.01em; }
  .cv { display: grid; gap: var(--s-3); }
  .cv li { display: grid; grid-template-columns: 76px 1fr; gap: var(--s-3); padding-bottom: var(--s-3); border-bottom: 1px solid var(--line); }
  .cv .mono { color: var(--muted); padding-top: 3px; }
  .cv span { display: block; color: var(--ink); font-size: var(--t-small); }
  .cv-title { font: 500 12px/1 var(--font-mono); color: var(--muted); margin: var(--s-6) 0 var(--s-3); text-transform: uppercase; letter-spacing: 0.06em; }
  .cv-title:first-child { margin-top: 0; }

  .home-split { align-items: start; }
  .home-photo { width: 100%; max-width: 340px; height: auto; aspect-ratio: 4 / 5; object-fit: cover; object-position: 50% 22%; display: block; margin-left: auto; }
  @media (max-width: 1023px) { .home-photo { max-width: 260px; margin-left: 0; margin-top: var(--s-6); } }
  .index--stack > li { display: block; }
  .index--stack .ix-text { margin-top: var(--s-2); max-width: 56ch; }
  .index--stack .refs { margin-top: 4px; }
  .home-cv { margin-top: var(--s-7); }
  .home-cv .cv-title { margin-top: 0; }
  .dg-card { padding: var(--s-4); background: #f2f2ee; border: 1px solid var(--line); }
  .news-actions { margin-top: var(--s-7); }
  .about-photo { width: 100%; height: auto; aspect-ratio: 1; object-fit: cover; margin-bottom: var(--s-6); }
  /* research index */
  .index > li { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); column-gap: var(--gutter); row-gap: var(--s-2); padding: var(--s-5) 0; border-bottom: 1px solid var(--line); align-items: baseline; }
  .index .ix-name { grid-column: 1 / span 6; }
  .index .ix-text { grid-column: 7 / span 6; }
  .index > li:first-child { padding-top: 0; }
  .index h3 { font: 400 24px/1.15 var(--font-display); letter-spacing: -0.01em; }
  .index p { max-width: 54ch; }
  .index .refs { display: flex; flex-wrap: wrap; gap: 2px 14px; margin-top: var(--s-2); color: var(--muted); }

  /* publications */
  .filters { display: flex; flex-wrap: wrap; gap: var(--s-2); margin-bottom: var(--s-6); }
  .filter { height: 44px; padding: 0 var(--s-4); border: 1px solid var(--line); background: transparent; font: 500 var(--t-small)/1 var(--font-text); color: var(--ink); cursor: pointer; transition: background var(--dur) var(--ease); }
  .filter:hover { background: var(--p-surface); }
  .filter[aria-pressed="true"] { background: var(--ink); color: var(--p-bg); border-color: var(--ink); }
  .pubyear { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: var(--gutter); padding-top: var(--s-5); border-top: 1px solid var(--ink); }
  .pubyear + .pubyear { margin-top: var(--s-6); }
  .pubyear[hidden] { display: none; }
  .pubyear__label { font: 400 40px/1 var(--font-display); }
  .pubs { display: grid; gap: var(--s-5); }
  .pub { display: grid; grid-template-columns: 100px minmax(0, 1fr) auto; gap: var(--s-4); align-items: baseline; }
  .pub[hidden] { display: none; }
  .pub__venue { color: var(--muted); }
  .pub__title { font: 500 var(--t-body)/1.4 var(--font-text); letter-spacing: 0; }
  .pub__authors, .pub__where { font-size: var(--t-small); line-height: 1.5; }
  .pub__authors b { font-weight: 600; }
  .pub__where { color: var(--muted); font-style: italic; }
  .pub__links { display: flex; gap: var(--s-3); white-space: nowrap; }
  .pub__links a { color: var(--ink); text-decoration: underline; text-decoration-color: var(--line); text-underline-offset: 3px; }
  .pub__links a:hover { text-decoration-color: currentColor; }
  main > .section--page { height: auto; min-height: 100svh; }

  /* EarthJev */
  .bands { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 4px; }
  .bands li { display: grid; gap: 2px; padding: 140px 0 10px; background: var(--b); color: #fff; text-align: center; font: 500 11px/1.2 var(--font-mono); position: relative; overflow: hidden; }
  .bands li span + span { opacity: .75; font-weight: 400; }
  .bands li::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,.22), transparent 55%); animation: scan 3.2s ease-in-out infinite; animation-delay: calc(var(--i) * 120ms); opacity: 0; }
  @keyframes scan { 0%, 100% { opacity: 0; } 40% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .bands li::after { animation: none; } }
  .bands-axis { display: flex; justify-content: space-between; margin-top: var(--s-2); color: var(--muted); }
  .ej-links { display: flex; flex-wrap: wrap; gap: var(--s-3) var(--s-5); margin-top: var(--s-5); }

  /* lists */
  .rows small { display: block; font-weight: 400; color: var(--muted); font-size: var(--t-small); }
  .rows .rows__value { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }

  /* footer and inner pages */
  .site-foot { padding: var(--s-7) 0 var(--s-8); border-top: 1px solid var(--ink); font-size: var(--t-small); }
  .site-foot__name { font: 400 24px/1.1 var(--font-display); }
  .site-foot__legal { text-align: right; }
  .page-head { padding-top: calc(var(--nav, 72px) + var(--s-8)); }
  .page-head h1 { font: 400 clamp(48px, 6vw, 88px)/1 var(--font-display); letter-spacing: var(--display-tracking-xl); }
  .page-head .rule-head + p { margin-top: var(--s-4); max-width: 60ch; font-size: var(--t-lead); }
  main > .section--page { height: auto; min-height: 0; }
  main > .section--page { padding-block: var(--s-8, 96px); }
  main > .section--page.page-head { padding-top: calc(var(--nav, 72px) + var(--s-8, 96px)); }
  main > .section--page:last-child { padding-bottom: var(--s-9, 120px); }
  .nav__link[aria-current="page"] { text-decoration: underline; text-underline-offset: 6px; text-decoration-thickness: 1px; }
  .ej { margin-top: var(--s-6); padding-top: var(--s-6); border-top: 1px solid var(--line); }
  @media (max-width: 1023px) { .site-foot__legal { text-align: left; } }
  .contact-line { font: 400 clamp(28px, 3.4vw, 48px)/1.1 var(--font-display); letter-spacing: -0.015em; }
  #contact .footer__address { font: 400 var(--t-body)/1.5 var(--font-text); font-style: normal; letter-spacing: 0; }
  .contact-line a { color: var(--ink); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 6px; }
  .elsewhere { display: flex; flex-wrap: wrap; gap: var(--s-2) var(--s-5); }

  @media (max-width: 1023px) {
    .index > li { grid-template-columns: 1fr; gap: var(--s-2); }
    .index .ix-name, .index .ix-text { grid-column: 1; }
    .pubyear { grid-template-columns: 1fr; gap: var(--s-3); }
    .pub { grid-template-columns: 1fr; gap: var(--s-1); }
    .pub__links { gap: var(--s-4); }
    .pub__links a { display: inline-block; padding: 12px 0; }
  }
  .site-name { font-family: var(--font-display); font-size: 22px; white-space: nowrap; }
  .nav .nav__item--menu-only { display: none; }
  @media (max-width: 1023px) { .nav .nav__item--menu-only { display: block; } }
  @media (max-width: 420px) { .nav .nav__bar .nav__actions { display: none; } .nav:not(.is-open) .nav__actions + .nav__toggle { margin-left: auto; } .site-name { font-size: 19px; } }
  @media (max-width: 1023px) { .nav__bar { gap: var(--s-3); } .nav__toggle { margin-left: auto; margin-right: 0; flex: none; } }
  @media (max-width: 639px) {
    main > .hero-ts { height: auto; min-height: 100svh; padding-bottom: var(--s-5); display: flex; flex-direction: column; }
    .hero-ts > .wrap { flex: 1; min-height: 0; display: flex; }
    .hero-ts .hero__grid { flex: 1; min-height: 0; display: flex; flex-direction: column; }
    .hero-ts h1 { font-size: 52px; }
    .hero-ts .hero__kicker { font-size: 13px; }
    .hero-ts .hero__lead { font-size: 17px; line-height: 1.45; margin-top: var(--s-3); }
    .hero-ts .btn-row { margin-top: var(--s-4); }
    .hero-latest, .hero-ts .wide-only, .hero-ts .rot-ref { display: none; }
    .hero-ts .btn-row { flex-direction: row; flex-wrap: wrap; align-items: center; gap: var(--s-2) var(--s-5); }
    .hero-ts .hero__text { min-width: 0; }
    .hero-ts .btn-row .btn { width: auto; flex: none; }
    .hero-ts .rot { flex: 1; min-height: 0; margin-top: var(--s-5); grid-template-rows: auto minmax(0, 1fr) auto; padding: var(--s-3); gap: var(--s-2); }
    .hero-ts .rot-canvas { height: 100%; min-height: 240px; }
    .rot-name { font-size: 19px; }
    .rot-dot { height: 32px; } .rot-dot::before, .rot-dot::after { top: 15px; }
  }
  @media (max-width: 639px) {
    .elsewhere a, .rule-head a { display: inline-block; padding-block: 12px; }
    .bands { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .bands li { padding-top: 32px; }
    .bands-axis { display: none; }
    .rule-head { flex-wrap: wrap; }
  }
</style>
</head>
<body>
<!-- type: service (a researcher's personal page)
     deal: palette paper-grey-brass (newsprint ground and a brass accent: a researcher's printed page; the brass picks up
     the cropland in the hero scene), type newsreader (Newsreader over Hanken Grotesk; the first pairing, schibsted, was
     passed over for a serif that reads as academic), nav nav-mega, footer footer-visit, rhythm surface-pairs, buttons solid
     voice: facts only (copy-registers 1), first person, the research nouns every time; no eyebrows, no figure strips -->
<header class="nav">
  <div class="wrap nav__bar">
    <a class="skip-link" href="#top">Skip to content</a>
    <a class="nav__logo site-name" href="index.html">Domenico Benfenati</a>
    <nav class="nav__links" aria-label="Main">
${NAV.map(([href, label]) => `      <div class="nav__item"><a class="nav__link" href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a></div>`).join('\n')}
      <div class="nav__item nav__item--menu-only"><a class="nav__link" href="contact.html"${current === 'contact.html' ? ' aria-current="page"' : ''}>Contact</a></div>
    </nav>
    <div class="nav__actions">
      <a class="btn btn--primary" href="contact.html"${current === 'contact.html' ? ' aria-current="page"' : ''}>Contact</a>
    </div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
  </div>
</header>

<main id="top">${main}
</main>

${home ? CLOSING : FOOT}
<script>
  document.querySelectorAll('.filter').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.filter;
    document.querySelectorAll('.filter').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    document.querySelectorAll('.pub').forEach((p) => { p.hidden = t !== 'all' && p.dataset.type !== t; });
    document.querySelectorAll('.pubyear').forEach((y) => { y.hidden = !y.querySelector('.pub:not([hidden])'); });
  }));
</script>
<script type="module" src="assets/system.js"></script>
<script type="module" src="assets/motion/motion.js"></script>
<script type="module" src="assets/layout/layout.js"></script>
${home ? '<script type="module" src="assets/js/rot-hero.js"></script>\n<script type="module" src="assets/diagrams/mount.js"></script>' : ''}
</body>
</html>
`;
};

const HOME_MAIN = `
  <section class="hero hero-ts" data-enter aria-labelledby="hero-h">
    <div class="wrap"><div class="hero-text grid hero__grid">
      <div class="hero__text span-5">
        <p class="hero__kicker">Research fellow · IKNOS Lab, DIETI,<span class="wide-only"> University of Naples</span> Federico II</p>
        <h1 id="hero-h">Domenico Benfenati</h1>
        <p class="hero__lead">I work on data quality for AI: finding the gaps, noise and errors in a dataset and repairing them before a model learns from it.<span class="wide-only"> Most of my data comes from Sentinel-2 satellites and from agrifood.</span></p>
        <div class="btn-row"><a class="btn btn--primary" href="publications.html">Read the papers</a><a class="btn btn--secondary" href="contact.html">Email me</a></div>
        <p class="hero-latest"><span class="mono">Nov 2026</span><a class="plain-link" href="research.html#earthjev">EarthJev is out: preprint, code and weights.</a></p>
      </div>
      <figure class="rot span-6 start-7" data-rot role="region" aria-roledescription="carousel" aria-label="Research lines">
        <div class="rot-head">
          <p class="rot-name"><span class="mono rot-count">1/4</span><span class="rot-title">Data quality</span><span class="mono rot-ref">PhD thesis · Comput. Electron. Agric. 2025</span></p>
          <div class="rot-nav">
            <button type="button" data-rot-prev aria-label="Previous research line">←</button>
            <button type="button" data-rot-pause aria-pressed="false">Pause</button>
            <button type="button" data-rot-next aria-label="Next research line">→</button>
          </div>
        </div>
        <canvas class="rot-canvas" role="img" aria-label="Animation of the current research line, drawn from synthetic data"></canvas>
        <div class="rot-dots">
          <button class="rot-dot" type="button" aria-label="Data quality"></button>
          <button class="rot-dot" type="button" aria-label="Satellite imagery"></button>
          <button class="rot-dot" type="button" aria-label="Knowledge graphs and RAG"></button>
          <button class="rot-dot" type="button" aria-label="Retrieval under attack"></button>
        </div>
        <p class="rot-live" aria-live="polite"></p>
      </figure>
    </div></div>
  </section>

  <section class="section ground-surface" id="about" aria-labelledby="about-h" style="--h: 1">
    <div class="wrap">
      <div class="rule-head"><h2 id="about-h">About</h2><span class="mono">Naples</span></div>
      <div class="grid home-split">
        <div class="span-6 bio">
          <p>I am a research fellow at DIETI, University of Naples Federico II, in the IKNOS Lab, and I work with the PICUS Lab in the same department.</p>
          <p>My PhD, in the Italian National Programme in Artificial Intelligence (Agrifood and Environment track), is on data quality: how to measure what is missing or wrong in a dataset, and how to repair it. The fellowship ended in October 2026; I defend the thesis in 2027.</p>
          <div class="grid home-cv">
            <div class="span-6">
              <p class="cv-title">Positions</p>
              <ul class="cv">
                <li><span class="mono">2026–</span><p>Research fellow<span>DIETI, University of Naples Federico II</span></p></li>
                <li><span class="mono">2023–26</span><p>PhD fellow in Artificial Intelligence<span>National PhD Programme</span></p></li>
              </ul>
            </div>
            <div class="span-6">
              <p class="cv-title">Education</p>
              <ul class="cv">
                <li><span class="mono">2027</span><p>PhD in Artificial Intelligence<span>Thesis defence</span></p></li>
                <li><span class="mono">2023</span><p>MSc, Computer Science Engineering<span>Federico II</span></p></li>
                <li><span class="mono">2020</span><p>BSc, Computer Engineering<span>Federico II</span></p></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="span-6 start-7">
          <img class="home-photo" src="assets/img/portrait-large.webp" width="900" height="900" alt="Domenico Benfenati in front of the University of Naples Federico II seal" loading="lazy">
        </div>
      </div>
    </div>
  </section>

  <!-- moment: word-highlight (dealt by moments.mjs; photo-chapters was dealt first and needs 3 to 5 photographs the page lacks) -->
  <section class="section statement" id="approach" data-moment="word-highlight" aria-label="Approach">
    <div class="wrap">
      <p class="t-label">Approach</p>
      <p class="mo-wh__text">Satellite tiles with gaps, farm records with missing fields, web pages with the wrong label: before a model trains on them, I find what is wrong in the data and <strong>repair it</strong>.</p>
    </div>
  </section>

  <section class="section ground-surface" id="research" aria-labelledby="research-h" style="--h: 1">
    <div class="wrap">
      <div class="rule-head"><h2 id="research-h">Research</h2><a class="plain-link" href="research.html">More on each line</a></div>
      <div class="grid home-split">
        <ol class="index index--stack span-6">
          <li><div class="ix-name"><h3>Data quality</h3><p class="refs mono"><span>COMPAG 2025</span><span>KES 2026</span></p></div><p class="ix-text">Measuring and repairing training data: noisy labels, missing values, gaps in time series.</p></li>
          <li><div class="ix-name"><h3>Satellite imagery</h3><p class="refs mono"><span>arXiv 2611.02096</span></p></div><p class="ix-text">Sentinel-2 time series and EarthJev, which answers typed questions from all 12 bands.</p></li>
          <li><div class="ix-name"><h3>Knowledge graphs and RAG</h3><p class="refs mono"><span>IEEE TAI 2026</span><span>NCA 2026</span></p></div><p class="ix-text">Generative models that populate knowledge graphs, and retrieval tied to an ontology.</p></li>
          <li><div class="ix-name"><h3>Retrieval under attack</h3><p class="refs mono"><span>CIKM 2026</span><span>IC3K 2024</span></p></div><p class="ix-text">Embedding-space attacks on pathology retrieval; focused crawlers for the web.</p></li>
        </ol>
        <div class="span-6 start-7 dg-card">
          <div class="dg" data-diagram><script type="application/json">{"layout":"fanin","alt":"Satellite imagery, farm records, web pages, pathology images, ontologies and papers pass through data quality checks before they reach models and retrieval systems.","sources":[{"label":"Sentinel-2","icon":"ui:satellite","sub":"12-band imagery"},{"label":"Farm records","icon":"ui:wheat","sub":"Agrifood"},{"label":"Web pages","icon":"ui:globe","sub":"Focused crawls"},{"label":"Pathology","icon":"ui:microscope","sub":"Image retrieval"},{"label":"Ontologies","icon":"ui:network","sub":"Knowledge graphs"},{"label":"Papers","icon":"ui:file-text","sub":"RAG corpora"}],"target":{"label":"Data quality","icon":"ui:list-checks"},"then":{"label":"Models and retrieval","icon":"ui:brain"}}</script></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="news" aria-labelledby="news-h" style="--h: 1">
    <div class="wrap">
      <div class="rule-head"><h2 id="news-h">News</h2><a class="plain-link" href="news.html">All news</a></div>
      <div class="grid home-split">
        <div class="span-6">
          <ul class="rows">
            <li><span class="rows__name">EarthJev released<small>Preprint on arXiv, code on GitHub, weights on Hugging Face.</small></span><span class="rows__value">Nov 2026</span></li>
            <li><span class="rows__name">Research fellowship at DIETI begins<small>Twelve months, University of Naples Federico II.</small></span><span class="rows__value">Nov 2026</span></li>
            <li><span class="rows__name">Embedding-space attacks at CIKM 2026<small>ACM International Conference on Information and Knowledge Management.</small></span><span class="rows__value">Nov 2026</span></li>
            <li><span class="rows__name">Ontology-guided GraphRAG<small>Published in Neural Computing and Applications.</small></span><span class="rows__value">Oct 2026</span></li>
          </ul>
          <div class="btn-row news-actions"><a class="btn btn--primary" href="publications.html">Read the papers</a><a class="btn btn--secondary" href="news.html">See all news</a></div>
        </div>
        <div class="span-6 start-7">
          <img class="home-photo" src="assets/img/conference.webp" width="900" height="900" alt="Domenico Benfenati at a conference" loading="lazy">
        </div>
      </div>
    </div>
  </section>`;
const RESEARCH_MAIN = `
  <section class="section section--page page-head" id="research" aria-labelledby="research-h">
    <div class="wrap">
      <div class="rule-head"><h1 id="research-h">Research</h1></div>
      <p style="margin:0 0 var(--s-7)">I work on the quality of the data that AI models learn from, mostly in Earth observation and agrifood. Four lines run in parallel; each lists the papers behind it.</p>
      <ol class="index">
        <li>
          <div class="ix-name"><h3>Data quality and data-centric AI</h3><p class="refs mono"><span>Comput. Electron. Agric. 2025</span><span>KES 2026</span></p></div>
          <p class="ix-text">Measuring and repairing training data: missing values, noisy labels, gaps in time series. With colleagues I mapped how the agrifood literature handles it.</p>
        </li>
        <li>
          <div class="ix-name"><h3>Satellite image time series</h3><p class="refs mono"><span>arXiv 2611.02096</span><span>KES 2026</span></p></div>
          <p class="ix-text">A probabilistic model that reconstructs cloud-covered pixels across a Sentinel-2 series, and EarthJev, which answers typed questions from the 12 bands of a patch.</p>
        </li>
        <li>
          <div class="ix-name"><h3>Knowledge graphs and RAG</h3><p class="refs mono"><span>IEEE TAI 2026</span><span>Neural Comput. Appl. 2026</span><span>IEEE SMC 2025</span><span>KES 2024</span></p></div>
          <p class="ix-text">Generative models that populate multimedia knowledge graphs, and retrieval that keeps answers tied to an ontology, for agriculture and nutrigenetics.</p>
        </li>
        <li>
          <div class="ix-name"><h3>Retrieval under attack</h3><p class="refs mono"><span>CIKM 2026</span><span>IC3K 2024</span><span>MEDES 2023</span></p></div>
          <p class="ix-text">Focused crawlers and multimodal web page classification; how embedding-space attacks degrade retrieval with pathology foundation models.</p>
        </li>
      </ol>
      <div class="ej" id="earthjev">
        <h2 class="t-h3" style="font-family:var(--font-display);margin-bottom:var(--s-5)">EarthJev <span class="mono muted" style="margin-left:var(--s-3)">model · Nov 2026</span></h2>
      <div class="grid grid--top">
        <div class="span-5">
          <p class="t-lead">EarthJev reads a Sentinel-2 L2A patch in all 12 bands and answers each question with a typed value instead of free text.</p>
          <p style="margin-top:var(--s-4)">Written with Antonio Maria Rinaldi and Cristian Tommasino. Evaluated on CORINE land cover and RSVQAxBEN.</p>
          <p class="ej-links">
            <a class="plain-link" href="https://arxiv.org/abs/2611.02096" rel="noopener">Preprint, arXiv 2611.02096</a>
            <a class="plain-link" href="https://github.com/CosmoIknosLab/EarthJev" rel="noopener">Code on GitHub</a>
            <a class="plain-link" href="https://huggingface.co/dBenf/EarthJev" rel="noopener">Weights on Hugging Face</a>
          </p>
        </div>
        <div class="span-6 start-7">
          <ol class="bands" aria-label="The 12 Sentinel-2 bands EarthJev reads, from B01 at 443 nm to B12 at 2190 nm">${bandStrip}</ol>
          <p class="bands-axis mono"><span>visible</span><span>infrared, wavelength in nm</span></p>
        </div>
      </div>
      </div>
    </div>
  </section>`;
const PUBS_MAIN = `
  <section class="section section--page page-head" id="publications" aria-labelledby="pubs-h">
    <div class="wrap">
      <div class="rule-head"><h1 id="pubs-h">Publications</h1><span class="elsewhere"><a class="plain-link" href="https://scholar.google.com/citations?user=tjH_pzcAAAAJ" rel="noopener">Google Scholar</a><a class="plain-link" href="https://orcid.org/0009-0008-5825-8043" rel="noopener">ORCID</a></span></div>
      <p style="margin-bottom:var(--s-6);max-width:60ch">${pubs.length} papers since 2024, ${journals} of them in journals, collected from ORCID and dblp; citation counts are on Google Scholar. My name is in bold.</p>
      <div class="filters" role="group" aria-label="Filter by type">${filters}</div>
      <div class="publist">${pubList}
      </div>
    </div>
  </section>`;
const SERVICE_MAIN = `
  <section class="section section--page page-head" id="service" aria-labelledby="service-h">
    <div class="wrap">
      <div class="rule-head"><h1 id="service-h">Service</h1></div>
      <p style="margin:0 0 var(--s-7)">Peer review for journals, as recorded on my ORCID profile.</p>
      <div class="grid grid--top">
        <div class="span-8">
          <p class="cv-title">Journal reviews, from ORCID</p>
          <ul class="rows">
            <li><span class="rows__name">Soft Computing</span><span class="rows__value">10</span></li>
            <li><span class="rows__name">Engineering Applications of Artificial Intelligence</span><span class="rows__value">3</span></li>
            <li><span class="rows__name">Biomedical Signal Processing and Control</span><span class="rows__value">2</span></li>
            <li><span class="rows__name">Computers &amp; Electrical Engineering</span><span class="rows__value">1</span></li>
          </ul>
        </div>
      </div>
    </div>
  </section>`;
const TEACHING_MAIN = `
  <section class="section section--page page-head" id="teaching" aria-labelledby="teaching-h">
    <div class="wrap">
      <div class="rule-head"><h1 id="teaching-h">Teaching</h1></div>
      <p style="margin:0 0 var(--s-7)">I co-supervise MSc theses and student projects in the IKNOS Lab. If you are a student interested in data quality, remote sensing or retrieval, write to me.</p>
      <div class="grid grid--top">
        <div class="span-8">
          <p class="cv-title">Theses and projects I co-supervise</p>
          <ul class="rows">
            <li><span class="rows__name">An agent-based system for crop advising<small>MSc thesis, Computer Engineering</small></span></li>
            <li><span class="rows__name">Change-detection retrieval and RAG for satellite imagery<small>MSc thesis, Data Science</small></span></li>
            <li><span class="rows__name">Image–text retrieval on remote sensing data<small>Student project on RSITMD</small></span></li>
          </ul>
        </div>
      </div>
    </div>
  </section>`;
const NEWS_MAIN = `
  <section class="section section--page page-head" id="news" aria-labelledby="news-h">
    <div class="wrap">
      <div class="rule-head"><h1 id="news-h">News</h1></div>
      
      <ul class="rows">
        <li><span class="rows__name">EarthJev released<small>Preprint on arXiv, code on GitHub, weights on Hugging Face.</small></span><span class="rows__value">Nov 2026</span></li>
        <li><span class="rows__name">I started a research fellowship at DIETI<small>Twelve months, University of Naples Federico II.</small></span><span class="rows__value">Nov 2026</span></li>
        <li><span class="rows__name">Embedding-space attacks on pathology foundation models<small>At CIKM 2026, the ACM International Conference on Information and Knowledge Management.</small></span><span class="rows__value">Nov 2026</span></li>
        <li><span class="rows__name">Ontology-guided GraphRAG<small>Published in Neural Computing and Applications.</small></span><span class="rows__value">Oct 2026</span></li>
        <li><span class="rows__name">Cloud reconstruction at KES 2026, Dublin<small>Presented with Gennaro Iannuzzo.</small></span><span class="rows__value">Sep 2026</span></li>
        <li><span class="rows__name">Multimedia knowledge graph population<small>Published in IEEE Transactions on Artificial Intelligence.</small></span><span class="rows__value">Jun 2026</span></li>
      </ul>
    </div>
  </section>`;
const CONTACT_MAIN = `
  <section class="section section--page page-head" id="contact" aria-labelledby="contact-h">
    <div class="wrap">
      <div class="rule-head"><h1 id="contact-h">Contact</h1></div>
      
      <p class="contact-line"><a href="mailto:${EMAIL}">${EMAIL}</a></p>
      <p style="margin-top:var(--s-4);max-width:56ch">Write about collaborations, MSc theses on data quality or remote sensing, and requests for code or data from the papers.</p>
      <div class="grid grid--top" style="margin-top:var(--s-8)">
        <div class="span-6 stack-4">
          <p class="cv-title">Office</p>
          <address class="footer__address">DIETI, Via Claudio, Fuorigrotta, Naples</address>
          <p><a class="plain-link" href="https://www.openstreetmap.org/search?query=Via%20Claudio%20Fuorigrotta%20Napoli">Get directions</a></p>
        </div>
        <div class="span-5 start-8 stack-4">
          <p class="cv-title">Groups</p>
          <p><a class="plain-link" href="https://iknos.dieti.unina.it/" rel="noopener">IKNOS Lab</a>, DIETI, University of Naples Federico II</p>
          <p><a class="plain-link" href="https://www.linkedin.com/company/iknos-dieti-unina" rel="noopener">IKNOS Lab on LinkedIn</a></p>
          <p class="cv-title">Profiles</p>
          <p class="elsewhere">
            <a class="plain-link" href="https://scholar.google.com/citations?user=tjH_pzcAAAAJ" rel="noopener">Google Scholar</a>
            <a class="plain-link" href="https://orcid.org/0009-0008-5825-8043" rel="noopener">ORCID</a>
            <a class="plain-link" href="https://www.linkedin.com/in/domenico-benfenati/" rel="noopener">LinkedIn</a>
            <a class="plain-link" href="https://github.com/dBenf" rel="noopener">GitHub</a>
            <a class="plain-link" href="https://huggingface.co/dBenf" rel="noopener">Hugging Face</a>
            <a class="plain-link" href="https://dblp.org/pid/367/6149.html" rel="noopener">dblp</a>
          </p>
        </div>
      </div>
    </div>
  </section>`;

const PAGES = [
  ['index.html', 'Domenico Benfenati: data quality for satellite imagery and agrifood', 'Research fellow at DIETI and the IKNOS Lab, University of Naples Federico II. Data quality and data-centric AI for Sentinel-2 imagery and agrifood.', HOME_MAIN],
  ['research.html', 'Research: Domenico Benfenati', 'Data quality, satellite image time series, knowledge graphs and retrieval: four research lines and EarthJev.', RESEARCH_MAIN],
  ['publications.html', 'Publications: Domenico Benfenati', 'All papers by Domenico Benfenati, IKNOS Lab, University of Naples Federico II, with DOIs, code and preprints.', PUBS_MAIN],
  ['service.html', 'Service: Domenico Benfenati', 'Peer review for journals by Domenico Benfenati.', SERVICE_MAIN],
  ['teaching.html', 'Teaching: Domenico Benfenati', 'MSc theses and student projects co-supervised by Domenico Benfenati at the IKNOS Lab.', TEACHING_MAIN],
  ['news.html', 'News: Domenico Benfenati', 'Papers, releases and talks by Domenico Benfenati.', NEWS_MAIN],
  ['contact.html', 'Contact: Domenico Benfenati', 'Email and office of Domenico Benfenati, DIETI, University of Naples Federico II.', CONTACT_MAIN],
];
for (const [file, title, description, main] of PAGES) writeFileSync(new URL('./' + file, import.meta.url), page({ current: file, title, description, main }));

// sitemap.xml and robots.txt for search engines; lastmod is the day of the build
const SITE = 'https://domenicobenfenati.github.io/';
const today = new Date().toISOString().slice(0, 10);
writeFileSync(new URL('./sitemap.xml', import.meta.url), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(([file]) => `  <url>
    <loc>${SITE}${file === 'index.html' ? '' : file}</loc>
    <lastmod>${today}</lastmod>
  </url>`).join('\n')}
</urlset>
`);
writeFileSync(new URL('./robots.txt', import.meta.url), `User-agent: *
Allow: /

Sitemap: ${SITE}sitemap.xml
`);
writeFileSync(new URL('./favicon.svg', import.meta.url), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#181715"/><text x="16" y="22" font-family="Georgia,serif" font-size="16" fill="#e8e8e3" text-anchor="middle">DB</text></svg>');
console.log('written:', PAGES.map((p) => p[0]).join(', '));
