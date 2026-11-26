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

async function ensureServer() {
  const pref = `http://127.0.0.1:${PREFERRED}${PAGE_PATH}`;
  if (await up(pref)) return { url: pref, stop: () => {} };
  let port = await freePort();
  if (port === PREFERRED) port = await freePort();
  const child = spawn('npx', ['vite', '--port', String(port), '--strictPort', '--host', '127.0.0.1', '--base', BASE], { cwd: ROOT, stdio: 'ignore' });
  const url = `http://127.0.0.1:${port}${PAGE_PATH}`;
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
  process.exit(0);
}
