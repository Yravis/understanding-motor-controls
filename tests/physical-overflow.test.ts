import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';

describe('physical view overflow (browser-measured)', () => {
  // Needs Chrome and a Vite server (reuses :4188 if up, else starts one). Skipped where Chrome is missing.
  it.skipIf(!existsSync(CHROME))('keeps every device label and graphic inside its card; no wire crosses the strip label', async () => {
    // @ts-expect-error plain .mjs script, no type declarations
    const { checkPhysicalOverflow } = await import('../scripts/check-physical-overflow.mjs');
    const { out, checked, groups } = await checkPhysicalOverflow();
    expect(groups).toBeGreaterThan(25);
    expect(checked).toBeGreaterThan(200);
    expect(out).toEqual([]);
  }, 90_000);
});

describe('physical legends are not washed out by the muted .tiny color', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  it('forces legend text to the foreground color with a selector stronger than `svg .tiny`', () => {
    expect(css).toMatch(/svg\.phys text\.tiny\.legend[^{]*\{[^}]*font-weight:\s*[67]00?/);
    expect(css).toMatch(/svg\.phys text\.legend[^{]*\{[^}]*fill:\s*var\(--fg\)/);
    expect(css).toMatch(/svg\.phys \.dev\.door\s*\{\s*stroke:\s*none/);
  });
});
