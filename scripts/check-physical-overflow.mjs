// Browser-measured overflow check for the Physical bucket view.
// Loads the export page in Chrome and asserts every device's text/graphics sit inside the device card,
// every text sits inside the SVG, the warning text sits inside its plate, and no harness wire crosses
// the TERMINAL STRIP label. Exits non-zero on any overflow.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '/understanding-motor-controls/';
const PAGE_PATH = `${BASE}scripts/export-physical.html`;
const PREFERRED = 4188;
const SLOP = 1.5;

const up = async (url) => { try { return (await fetch(url)).ok; } catch { return false; } };
const freePort = () => new Promise((res, rej) => {
  const srv = net.createServer();
  srv.once('error', rej);
  srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => res(port)); });
});

async function ensureServer(pagePath = PAGE_PATH) {
  const pref = `http://127.0.0.1:${PREFERRED}${pagePath}`;
  if (await up(pref)) return { url: pref, stop: () => {} };
  let port = await freePort();
  if (port === PREFERRED) port = await freePort();
  const child = spawn('npx', ['vite', '--port', String(port), '--strictPort', '--host', '127.0.0.1', '--base', BASE], { cwd: ROOT, stdio: 'ignore' });
  const url = `http://127.0.0.1:${port}${pagePath}`;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) { if (await up(url)) return { url, stop: () => child.kill() }; await new Promise((r) => setTimeout(r, 250)); }
  child.kill();
  throw new Error(`vite did not start on port ${port}`);
}

/** Runs in the page; returns a list of human-readable overflow strings. */
function measure(slop) {
  const out = [];
  const svg = document.querySelector('svg.phys');
  const R = (e) => e.getBoundingClientRect();
  const inside = (c, p, s) => c.left >= p.left - s && c.right <= p.right + s && c.top >= p.top - s && c.bottom <= p.bottom + s;
  const f = (r) => `[${r.left.toFixed(1)},${r.top.toFixed(1)} → ${r.right.toFixed(1)},${r.bottom.toFixed(1)}]`;
  const CARD = '.op-cell, .devbox, .field-dev, .powerbox';
  const CHILD = 'text, .pin, .relay-body, .relay-top, .timer-head, .timer-dial, .ss-timer, .ss-window, .op-ring, .op-lens, .op-mush, .op-mush-base, .op-start, .op-stop, .cpt-body, .fuse-holder, .fuse-cart, .term-block, .tbbox';
  const groups = [...document.querySelectorAll('svg.phys .dev, svg.phys .cpt-block, svg.phys .f1-block')];
  let checked = 0;
  for (const g of groups) {
    const card = g.querySelector(CARD);
    if (!card) { out.push(`${g.getAttribute('data-tag') || g.getAttribute('class')}: no card rect`); continue; }
    const name = g.getAttribute('data-tag') || (g.classList.contains('cpt-block') ? 'CPT' : g.classList.contains('f1-block') ? 'F1' : (g.querySelector('text')?.textContent ?? '?'));
    const cr = R(card);
    for (const c of g.querySelectorAll(CHILD)) {
      checked++;
      const r = R(c);
      if (!inside(r, cr, slop)) out.push(`${name}: <${c.tagName} class="${c.getAttribute('class') ?? ''}"> ${(c.textContent || '').slice(0, 24)} ${f(r)} outside card ${f(cr)}`);
    }
  }
  const sr = R(svg);
  for (const t of svg.querySelectorAll('text')) {
    const r = R(t);
    if (!inside(r, sr, 0.5)) out.push(`svg: text "${t.textContent}" ${f(r)} outside svg ${f(sr)}`);
  }
  const wr = svg.querySelector('.warn-banner rect');
  const wt = svg.querySelector('.warn-banner text');
  if (wr && wt) { if (!inside(R(wt), R(wr), slop)) out.push(`warning text ${f(R(wt))} outside plate ${f(R(wr))}`); }
  else out.push('warning banner missing');
  const lab = [...svg.querySelectorAll('.tb-strip > text')].find((t) => /TERMINAL STRIP/.test(t.textContent));
  if (!lab) out.push('TERMINAL STRIP label missing');
  else {
    const lr = R(lab);
    for (const p of svg.querySelectorAll('.harness path')) {
      const r = R(p), s = 1;
      const hit = r.left < lr.right + s && r.right > lr.left - s && r.top < lr.bottom + s && r.bottom > lr.top - s;
      if (hit) {
        // Bounding boxes of curves are coarse; confirm by sampling the actual geometry.
        const len = p.getTotalLength(), m = p.getScreenCTM();
        for (let i = 0; i <= 400; i++) {
          const pt = p.getPointAtLength((len * i) / 400);
          const x = pt.x * m.a + m.e, y = pt.y * m.d + m.f;
          if (x > lr.left - s && x < lr.right + s && y > lr.top - s && y < lr.bottom + s) { out.push(`harness path (${p.getAttribute('class')}) crosses TERMINAL STRIP label ${f(lr)} near ${x.toFixed(0)},${y.toFixed(0)}`); break; }
        }
      }
    }
  }
  return { out, checked, groups: groups.length };
}

/** Runs in the page for the redrawn bucket (svg.b2): text inside its device card / plate, inside the SVG, and no two texts overlapping. */
function measureBucket2(slop) {
  const out = [];
  const svg = document.querySelector('svg.b2');
  const R = (e) => e.getBoundingClientRect();
  const inside = (c, p, s) => c.left >= p.left - s && c.right <= p.right + s && c.top >= p.top - s && c.bottom <= p.bottom + s;
  const f = (r) => `[${r.left.toFixed(1)},${r.top.toFixed(1)} → ${r.right.toFixed(1)},${r.bottom.toFixed(1)}]`;
  const CHILD = 'text, circle:not([filter]), path, rect:not(.card2):not(.hit)';
  let checked = 0;
  const groups = [...svg.querySelectorAll('g.dev2[data-tag]')];
  for (const g of groups) {
    const card = g.querySelector('rect.card2');
    const name = g.getAttribute('data-tag');
    if (!card) { out.push(`${name}: no card rect`); continue; }
    const cr = R(card);
    for (const c of g.querySelectorAll(CHILD)) {
      if (c.closest('.screw, .term2, .wire2')) continue; // wire stubs deliberately leave the strip; screws are checked below // screws are checked against the strip card via TB1 (device screws sit on the device body)
      checked++;
      const r = R(c);
      if (r.width === 0 && r.height === 0) continue;
      if (!inside(r, cr, slop)) out.push(`${name}: <${c.tagName}> ${(c.textContent || '').slice(0, 24)} ${f(r)} outside card ${f(cr)}`);
    }
    // Door legends must sit inside their white plate.
    const plate = g.querySelector('rect[stroke="#a9b1b8"]');
    if (plate) for (const t of g.querySelectorAll('text')) { checked++; if (!inside(R(t), R(plate), slop)) out.push(`${name}: legend "${t.textContent}" ${f(R(t))} outside plate ${f(R(plate))}`); }
  }
  // Screws sit inside the device card they belong to (CPT, F1, CR1, timers, TB1).
  for (const t of svg.querySelectorAll('g.term2:not(.dim) .screw, g.term2.dim .screw')) {
    const key = t.parentElement.getAttribute('data-key') || '';
    const part = key.split('_')[0];
    const card = part === 'EGC' ? svg.querySelector('g.egc2 rect') : svg.querySelector(`g.dev2[data-tag="${part === 'TB' ? 'TB1' : part}"] rect.card2`);
    if (!card) continue;
    checked++;
    if (!inside(R(t), R(card), slop)) out.push(`screw ${key} ${f(R(t))} outside ${part} card ${f(R(card))}`);
  }
  const sr = R(svg);
  const texts = [...svg.querySelectorAll('text')].filter((t) => (t.textContent || '').trim());
  for (const t of texts) { checked++; if (!inside(R(t), sr, 0.5)) out.push(`svg: text "${t.textContent}" ${f(R(t))} outside svg ${f(sr)}`); }
  // Caution label text inside the orange plate; illustrative markers inside their pills.
  const cl = svg.querySelector('g.caution2');
  if (cl) { const rr = R(cl.querySelector('rect')); for (const t of cl.querySelectorAll('text')) { checked++; if (!inside(R(t), rr, slop)) out.push(`caution label text "${t.textContent}" ${f(R(t))} outside plate ${f(rr)}`); } }
  for (const m of svg.querySelectorAll('g.illus')) { const rr = R(m.querySelector('rect')); const t = m.querySelector('text'); checked++; if (!inside(R(t), rr, slop)) out.push(`illustrative marker "${t.textContent}" ${f(R(t))} outside pill ${f(rr)}`); }
  const tag = svg.querySelector('g.tag2');
  if (tag) { const rr = R(tag.querySelector('rect')); for (const t of tag.querySelectorAll('text')) { checked++; if (!inside(R(t), rr, 3)) out.push(`lockout tag text "${t.textContent}" ${f(R(t))} outside the tag ${f(rr)}`); } }
  // No two texts overlap (bounding boxes, 1 px tolerance), except text inside the same rotated tag.
  const rects = texts.map((t) => ({ t, r: R(t) }));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i].r, b = rects[j].r, s = 1;
    if (a.left < b.right - s && a.right > b.left + s && a.top < b.bottom - s && a.bottom > b.top + s) out.push(`texts overlap: "${rects[i].t.textContent}" ${f(a)} and "${rects[j].t.textContent}" ${f(b)}`);
  }
  return { out, checked, groups: groups.length, texts: texts.length };
}

export async function checkBucket2Overflow(states = ['live', 'locked', 'closed']) {
  const server = await ensureServer(`${BASE}scripts/export-bucket2.html`);
  const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const res = {};
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    for (const st of states) {
      await page.goto(`${server.url}?state=${st}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.documentElement.dataset.ready === '1');
      res[st] = await page.evaluate(measureBucket2, SLOP);
    }
    return res;
  } finally {
    await browser.close();
    server.stop();
  }
}

export async function checkPhysicalOverflow() {
  const server = await ensureServer();
  const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.goto(server.url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.ready === '1');
    return await page.evaluate(measure, SLOP);
  } finally {
    await browser.close();
    server.stop();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { out, checked, groups } = await checkPhysicalOverflow();
  console.log(`Physical overflow check: ${groups} device groups, ${checked} child elements measured (slop ${SLOP}px)`);
  if (out.length) { console.log(`FAIL: ${out.length} overflow(s)`); for (const l of out) console.log('  - ' + l); process.exit(1); }
  console.log('OK: zero overflows');
  const b2 = await checkBucket2Overflow();
  let bad = 0;
  for (const [st, r] of Object.entries(b2)) {
    console.log(`Redrawn bucket (${st}): ${r.groups} device groups, ${r.texts} texts, ${r.checked} elements measured`);
    if (r.out.length) { bad += r.out.length; console.log(`FAIL: ${r.out.length} problem(s)`); for (const l of r.out) console.log('  - ' + l); }
  }
  if (bad) process.exit(1);
  console.log('OK: redrawn bucket has zero overflows or overlaps');
  process.exit(0);
}
