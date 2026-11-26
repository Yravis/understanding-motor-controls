import { describe, it, expect } from 'vitest';
import { wrapLines, lineWidth, WARN_TEXT, WARN_MAX_WIDTH, WARN_FONT, warningBannerLayout } from '../src/ui/svgtext';
import { STATE_LABEL_DY } from '../src/ui/schematic';
import { SYMBOL_KEYS, symbolTopExtent } from '../src/ui/symbols';
import { physicalLayout, PHYS, deviceTitleLines } from '../src/ui/physicallayout';
import { bucket } from './helpers';

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


describe('physical view layout', () => {
  const lay = physicalLayout(bucket(), true);

  it('keeps a stable viewBox and lists devices left-to-right, top-to-bottom', () => {
    expect(lay.viewBox.w).toBe(PHYS.VIEW_W);
    expect(lay.viewBox.h).toBeGreaterThan(lay.viewBox.w);
    expect(lay.devices[0].tag).toBe('PB3');
    expect(lay.devices[1].tag).toBe('PB1');
    expect(lay.devices[2].tag).toBe('CR1');
    expect(lay.devices.map((d) => d.tag)).toContain('PLF');
    const plf = lay.devices.find((d) => d.tag === 'PLF')!;
    expect(plf.foreign).toBe(true);
    expect(lay.terminalStrip.terminals.filter((t) => t.foreign).map((t) => t.net)).toEqual(['91', '92']);
    expect(lay.aspect.ratio).toBeCloseTo(lay.viewBox.w / lay.viewBox.h, 6);
  });

});


describe('physical device titles are full and wrap inside the cell', () => {
  it('never uses an ellipsis and every line fits the cell width', () => {
    const lay = physicalLayout(bucket(), true);
    expect(lay.devices.length).toBeGreaterThan(10);
    for (const d of lay.devices) {
      expect(d.title.includes('…'), d.tag).toBe(false);
      expect(d.titleLines.join(' '), d.tag).toBe(d.title);
      expect(deviceTitleLines(d.title)).toEqual(d.titleLines);
      for (const line of d.titleLines) {
        expect(lineWidth(line, PHYS.TITLE_FONT), `${d.tag}: ${line}`).toBeLessThanOrEqual(PHYS.TITLE_MAX_W);
      }
    }
  });
});
