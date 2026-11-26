// Renders the unzoomed Physical SVG to a PNG, 1536px on the long side, viewBox aspect preserved.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT_DIR = '/workspace/understanding-motor-controls-notes/photo-overlay';
const OUT = `${OUT_DIR}/reference-physical-v2.png`;
const PORT = 4188;
const PAGE = `http://127.0.0.1:${PORT}/understanding-motor-controls/scripts/export-physical.html`;
mkdirSync(OUT_DIR, { recursive: true });

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  cwd: '/workspace/understanding-motor-controls',
  stdio: 'ignore',
});
const deadline = Date.now() + 20000;
while (Date.now() < deadline) {
  try { const r = await fetch(PAGE); if (r.ok) break; } catch { /* still starting */ } await new Promise((r) => setTimeout(r, 250));
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(PAGE, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.documentElement.dataset.ready === '1');
const vb = await page.evaluate(() => {
  const svg = document.querySelector('svg');
  const [x, y, w, h] = (svg.getAttribute('viewBox') || '0 0 360 1').split(/\s+/).map(Number);
  return { w, h };
});
const long = 1536;
const width = vb.w >= vb.h ? long : Math.round(long * vb.w / vb.h);
const height = vb.h >= vb.w ? long : Math.round(long * vb.h / vb.w);
await page.setViewportSize({ width, height });
await page.locator('svg').screenshot({ path: OUT, type: 'png' });
console.log(`wrote ${OUT} (${width}x${height} px) from viewBox 0 0 ${vb.w} ${vb.h}`);
await browser.close();
server.kill();
process.exit(0);
