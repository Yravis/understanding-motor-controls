import { describe, it, expect } from 'vitest';
import { wrapLines, lineWidth, WARN_TEXT, WARN_MAX_WIDTH, WARN_FONT, warningBannerLayout } from '../src/ui/svgtext';
import { STATE_LABEL_DY } from '../src/ui/schematic';
import { SYMBOL_KEYS, symbolTopExtent } from '../src/ui/symbols';

describe('physical-view warning banner wraps instead of clipping', () => {
  it('breaks the 91/92 live-when-off warning into lines that each fit the banner width', () => {
    const { lines, height, panelTop } = warningBannerLayout();
    expect(lines.join(' ')).toBe(WARN_TEXT);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(lineWidth(line, WARN_FONT)).toBeLessThanOrEqual(WARN_MAX_WIDTH);
    }
    expect(height).toBeGreaterThan(24);
    expect(panelTop).toBeGreaterThan(34 + height);
  });

  it('wrapLines keeps residual words and never emits a line wider than maxWidth', () => {
    const text = 'one two three four five six seven eight nine ten';
    const lines = wrapLines(text, 40, 10); // 40 / 7 = 5 chars, so mostly one word per line
    expect(lines.join(' ')).toBe(text);
    for (const line of lines) expect(lineWidth(line, 10)).toBeLessThanOrEqual(40);
  });
});

describe('schematic OPEN/CLOSED labels sit clear of the symbol, including the mushroom cap', () => {
  // Contacts drawn on a rung (not coils or lights, which are loads and have no OPEN/CLOSED label).
  const contactKeys = SYMBOL_KEYS.filter((k) => !['relay-coil', 'pilot-light', 'solenoid'].includes(k));

  it('places the state-label baseline above every contact symbol with a gap', () => {
    const gap = 8; // SVG units between the top of the drawing and the typographic baseline (OPEN/CLOSED have no descenders)
    expect(symbolTopExtent('pb-nc-mushroom')).toBe(24);
    for (const key of contactKeys) {
      expect(STATE_LABEL_DY, key).toBeGreaterThanOrEqual(symbolTopExtent(key) + gap);
    }
  });
});
