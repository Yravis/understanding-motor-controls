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
  let guard = 0;
  while (guard++ < 80) {
    await page.waitForTimeout(40);
    await check(`step ${guard}`);
    if (await page.locator('.ds-st.cur[data-step="tour"]').count()) break;
    if (await page.locator('.ds-q .stem').count()) {
      // practice question: tap the first option (or Check for multi) then Continue
      if (await page.locator('.ds-q .opts .btn.opt').count()) {
        if (await page.locator('text=Tap the steps').count()) { for (let i = 0; i < 12 && await page.locator('button:has-text("Continue")').count() === 0; i++) await page.locator('.ds-q .opts .btn.opt').first().tap(); }
        else {
          await page.locator('.ds-q .opts .btn.opt').first().tap();
          if (await page.locator('button:has-text("Continue")').count() === 0 && await page.locator('button:has-text("Check")').count()) await page.locator('button:has-text("Check")').first().tap();
        }
      } else if (await page.locator('.schem-wrap').count()) await page.locator('button:has-text("Check")').first().tap();
      if (await page.locator('button:has-text("Continue")').count()) await page.locator('button:has-text("Continue")').first().tap();
      continue;
    }
    const next = page.locator('.ds-pane button:has-text("Next card"), .ds-pane button:has-text("Start practice"), .ds-pane button:has-text("Got it")');
    if (await next.count()) { await next.first().tap(); continue; }
  }
  if (guard >= 80) fail('did not reach the Tour step');
  await page.waitForSelector('svg.b2');
  await check('day screen (tour)');
  // Tour on the new bucket: handle OFF, open the door, read every nameplate.
  const tapG = (sel) => page.locator(sel).first().tap({ force: true });
  await tapG('g.handle2'); await tapG('g.latch2');
  for (const t of ['CPT', 'F1', 'CR1', 'TB1', 'PB1', 'PB2', 'PB3', 'PL1', 'PL2', 'PL3', 'PLF']) await page.locator(t === 'TB1' ? 'g.tblabel' : `g.dev2[data-tag="${t}"]`).first().tap({ force: true });
  await check('tour done');
  { const missing = await page.evaluate(() => { const u = JSON.parse(localStorage.getItem('umc.save.v1')).session.ui; return ['CPT','F1','CR1','TB1','PB1','PB2','PB3','PL1','PL2','PL3','PLF'].filter((t) => !u.inspected.includes(t)).join(','); }); if (missing) fail('tour taps did not register for: ' + missing); }
  await page.locator('[data-next="1"]').tap();
  for (const k of ['TB_91', 'TB_92']) await tapG(`g.term2[data-key="${k}"]`);
  await tapG('g.caution2');
  await page.locator('[data-next="1"]').tap();
  await tapG('g.handle2');                                       // handle back ON for the meter proof
  await tapG('g.term2[data-key="CPT_X1"]'); await tapG('g.term2[data-key="CPT_X2"]');
  const reading = await page.locator('.ds-readout').getAttribute('data-value');
  if (!reading || reading === '') fail('meter did not produce a reading after two taps');
  else console.log('  meter reading X1-X2 after two taps: ' + reading);
  await check('meter proved');
  await page.locator('[data-next="1"]').tap();
  await page.locator('.ds-tab[data-tab="work"]').tap();
  await page.waitForSelector('.ds-pane h2:has-text("Wrap-up")');
  await check('wrap-up');
  await page.tap('button:has-text("Done")');
  await check('home after day 1');
  if (errors.length) fail('page errors: ' + errors.join(' | '));
  await ctx.close();
}
// Symbol figures (lesson cards / identify-symbol questions): every drawing's real bounding box must sit inside its figure.
{
  console.log('symbol figures');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(URL_ + '#symbols');
  await page.waitForSelector('svg.symfig');
  const r = await page.evaluate(() => {
    const out = []; let n = 0;
    for (const svg of document.querySelectorAll('svg.symfig')) {
      const g = svg.querySelector('g.nema-sym'); if (!g) continue; n++;
      const sb = svg.getBoundingClientRect();
      // each primitive, including text, must be inside the figure with a 1 px margin
      for (const el of g.querySelectorAll('line, circle, path, text')) {
        const b = el.getBoundingClientRect();
        if (b.left < sb.left + 1 || b.right > sb.right - 1 || b.top < sb.top + 1 || b.bottom > sb.bottom - 1)
          out.push(`${g.getAttribute('data-symbol')} ${el.tagName} [${Math.round(b.top - sb.top)}..${Math.round(b.bottom - sb.top)} of ${Math.round(sb.height)}]`);
      }
    }
    return { n, out };
  });
  console.log(`  symbol figures checked: ${r.n}`);
  if (r.n < 22) fail(`expected 22 symbol figures, found ${r.n}`);
  for (const b of r.out) fail('symbol clipped: ' + b);
  await ctx.close();
}
await browser.close();
server.kill();
console.log(failures ? `${failures} problem(s)` : 'phone checks passed');
process.exit(failures ? 1 : 0);
