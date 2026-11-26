// Local phone check: touch-only Day 1 session at 390x844 and 360x740, no horizontal scroll, tap targets >= 44px.
// Usage: npm run build && npm run test:e2e   (uses the system Chrome via playwright-core; not run in CI)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const URL_ = 'http://localhost:4173/understanding-motor-controls/';
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failures = 0;
const fail = (m) => { failures++; console.log('  FAIL ' + m); };

for (const [w, h] of [[390, 844], [360, 740]]) {
  console.log(`viewport ${w}x${h}`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL_);
  const check = async (label) => {
    const r = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('button, a, input, select, textarea, summary')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        if (b.width < 43.5 || b.height < 43.5) bad.push(`${el.tagName} "${(el.textContent || el.getAttribute('aria-label') || '').slice(0, 24)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
      return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, bad };
    });
    if (r.sw > r.iw) fail(`${label}: horizontal scroll (${r.sw} > ${r.iw})`);
    for (const b of r.bad) fail(`${label}: small tap target ${b}`);
  };
  await check('home');
  await page.tap('text=Start Day 1');
  let guard = 0, phase = 'lesson';
  while (guard++ < 80) {
    await page.waitForTimeout(40);
    await check(`step ${guard}`);
    if (await page.locator('text=Open the bucket').count() || await page.locator('text=Start work order').count()) break;
    if (await page.locator('.stem').count()) {
      // practice question: tap the first option (or Check for multi) then Continue
      if (await page.locator('.opts .btn.opt').count()) {
        await page.locator('.opts .btn.opt').first().tap();
        if (await page.locator('text=Continue').count() === 0) { if (await page.locator('text=Check').count()) await page.locator('text=Check').first().tap(); }
      } else if (await page.locator('text=Tap the steps').count()) {
        const n = await page.locator('.opts .btn.opt').count();
        for (let i = 0; i < 12 && await page.locator('text=Continue').count() === 0; i++) { await page.locator('.opts .btn.opt').first().tap(); }
        void n;
      }
      if (await page.locator('text=Continue').count()) await page.locator('text=Continue').first().tap();
      continue;
    }
    const next = page.locator('button:has-text("Next"), button:has-text("Start practice"), button:has-text("Got it")');
    if (await next.count()) { await next.first().tap(); continue; }
  }
  if (guard >= 80) fail('did not reach the bucket activity');
  await page.locator('text=Open the bucket').first().tap();
  await page.waitForSelector('.meter');
  await check('bucket');
  // SVG terminal hit areas (physical view) must also be >= 44 CSS px at default zoom
    const svgBad = await page.evaluate(() => {
    const out = []; let n = 0;
    for (const el of document.querySelectorAll('svg.phys .hit')) {
      const b = el.getBoundingClientRect(); n++;
      if (b.width < 43.5 || b.height < 43.5) out.push(`${Math.round(b.width)}x${Math.round(b.height)}`);
    }
    return { n, out };
  });
  console.log(`  svg terminal hit areas checked: ${svgBad.n}`);
  if (svgBad.n === 0) fail('no SVG terminal hit areas found (door closed?)');
  for (const b of svgBad.out.slice(0, 5)) fail(`small SVG terminal hit area ${b}`);
  if (svgBad.out.length > 5) fail(`...and ${svgBad.out.length - 5} more small SVG hit areas`);
  // tap two terminals (touch) and read the meter
  const terms = page.locator('svg.phys .tb');
  if (await terms.count() > 3) { await terms.nth(1).tap({ force: true }); await terms.nth(2).tap({ force: true }); }
  const reading = await page.locator('.readout').textContent();
  if (!reading || reading.trim() === '—') fail('meter did not produce a reading after two taps');
  else console.log('  meter reading after two taps: ' + reading.trim());
  await page.locator('button:has-text("Finish activity")').first().tap();
  await page.waitForSelector('text=Wrap-up');
  await check('wrap-up');
  await page.tap('text=Done');
  await check('home after day 1');
  if (errors.length) fail('page errors: ' + errors.join(' | '));
  await ctx.close();
}
await browser.close();
server.kill();
console.log(failures ? `${failures} problem(s)` : 'phone checks passed');
process.exit(failures ? 1 : 0);
