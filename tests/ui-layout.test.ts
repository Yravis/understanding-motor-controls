import { describe, it, expect } from 'vitest';
import { wrapLines, lineWidth, WARN_TEXT, WARN_MAX_WIDTH, WARN_FONT, warningBannerLayout } from '../src/ui/svgtext';
import { STATE_LABEL_DY } from '../src/ui/schematic';
import { SYMBOL_KEYS, symbolTopExtent } from '../src/ui/symbols';
import { physicalLayout, PHYS, PHOTO_FILE, deviceTitleLines, LEGENDS } from '../src/ui/physicallayout';
import { bucket } from './helpers';

describe('physical-view warning banner wraps instead of clipping', () => {
  it('breaks the 91/92 live-when-off warning into lines that each fit the banner width', () => {
    const { lines, height } = warningBannerLayout();
    expect(lines.join(' ')).toBe(WARN_TEXT);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(lineWidth(line, WARN_FONT)).toBeLessThanOrEqual(WARN_MAX_WIDTH);
    }
    expect(height).toBeGreaterThan(24);
    const lay = physicalLayout(bucket(), true);
    expect(lay.warning.lines).toEqual(lines);
    expect(lay.warning.box.h).toBeGreaterThanOrEqual(height);
    expect(lay.warning.box.y + lay.warning.box.h).toBeLessThanOrEqual(lay.ch2Preview.box.y + 1);
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

describe('physical view layout (open-door elevation)', () => {
  const b = bucket();
  const lay = physicalLayout(b, true);

  it('uses a landscape / near-square 4:3 viewBox and keeps every device and pin', () => {
    expect(lay.viewBox.w).toBe(PHYS.VIEW_W);
    expect(lay.viewBox.h).toBe(PHYS.VIEW_H);
    expect(lay.aspect.ratio).toBeCloseTo(4 / 3, 5);
    expect(lay.aspect.ratio).toBeCloseTo(lay.viewBox.w / lay.viewBox.h, 6);

    const tags = lay.devices.map((d) => d.tag);
    expect(new Set(tags).size).toBe(tags.length);
    for (const d of b.layout.devices) {
      expect(tags, d.tag).toContain(d.tag);
      const laid = lay.devices.find((x) => x.tag === d.tag)!;
      const laidIds = laid.pins.map((p) => p.id).sort();
      const srcIds = d.pins.map((p) => p.id).sort();
      expect(laidIds, d.tag).toEqual(srcIds);
    }
    const door = new Set(lay.devices.filter((d) => d.zone === 'door').map((d) => d.tag));
    for (const t of ['PB3', 'PB1', 'PB2', 'PL1', 'PL11', 'PLF']) expect(door.has(t), t).toBe(true);
    expect(door.has('CR1')).toBe(false);
    const din = new Set(lay.devices.filter((d) => d.zone === 'din').map((d) => d.tag));
    for (const t of ['CR1', 'TR1', 'TR2', 'TD3', 'TD4']) expect(din.has(t), t).toBe(true);
    const field = new Set(lay.devices.filter((d) => d.zone === 'field').map((d) => d.tag));
    for (const t of ['FS1', 'PS1', 'TS1', 'LS1', 'FLS1', 'SOL1']) expect(field.has(t), t).toBe(true);
  });

  it('keeps the terminal strip nets, marks 91/92 foreign, and exposes CPT and F1', () => {
    expect(lay.terminalStrip.terminals.map((t) => t.net)).toEqual(b.layout.tbNets);
    expect(lay.terminalStrip.terminals.filter((t) => t.foreign).map((t) => t.net)).toEqual(['91', '92']);
    expect(lay.devices.find((d) => d.tag === 'PLF')!.foreign).toBe(true);
    expect(lay.cpt.terminals.map((t) => t.id)).toEqual(['X1', 'X2']);
    expect(lay.f1.terminals.map((t) => t.id)).toEqual(['X1', 'w1']);
    expect(lay.ch2Preview.items.map((c) => c.tag)).toEqual(['DISC', 'PF', 'M', 'OL', 'MTR']);
  });

  it('places the photo file at a public path the overlay can request', () => {
    expect(PHOTO_FILE).toBe('img/bucket-1a-photo.jpg');
  });
});

describe('physical labels are full and fit their plates', () => {
  it('never uses an ellipsis and every legend / title line fits its box', () => {
    const lay = physicalLayout(bucket(), true);
    expect(lay.devices.length).toBeGreaterThan(10);
    for (const d of lay.devices) {
      expect(d.title.includes('…'), d.tag).toBe(false);
      expect(d.legend.join(' '), d.tag).not.toMatch(/…/);
      expect(LEGENDS[d.tag], d.tag).toEqual(d.legend);
      const maxW = d.box.w - 8;
      for (const line of d.legend) {
        expect(lineWidth(line, PHYS.LEGEND_FONT), `${d.tag}: ${line}`).toBeLessThanOrEqual(maxW);
      }
      expect(d.titleLines.join(' '), d.tag).toBe(d.title);
      expect(deviceTitleLines(d.title, Math.max(maxW, 80))).toEqual(d.titleLines);
    }
  });

  it('keeps every pin inside its device box with a usable gap between neighbors', () => {
    const lay = physicalLayout(bucket(), true);
    for (const d of lay.devices) {
      for (const p of d.pins) {
        expect(p.x, `${d.tag} ${p.id} x`).toBeGreaterThanOrEqual(d.box.x - 2);
        expect(p.x, `${d.tag} ${p.id} x`).toBeLessThanOrEqual(d.box.x + d.box.w + 2);
        expect(p.y, `${d.tag} ${p.id} y`).toBeGreaterThanOrEqual(d.box.y - 2);
        expect(p.y, `${d.tag} ${p.id} y`).toBeLessThanOrEqual(d.box.y + d.box.h + 2);
      }
      for (let i = 0; i < d.pins.length; i++) {
        for (let j = i + 1; j < d.pins.length; j++) {
          const dist = Math.hypot(d.pins[i].x - d.pins[j].x, d.pins[i].y - d.pins[j].y);
          expect(dist, `${d.tag} ${d.pins[i].id} vs ${d.pins[j].id}`).toBeGreaterThan(20);
        }
      }
    }
  });
});
