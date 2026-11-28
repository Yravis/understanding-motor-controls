// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { wrapLines, lineWidth, WARN_TEXT, WARN_MAX_WIDTH, WARN_FONT, warningBannerLayout } from '../src/ui/svgtext';
import { renderSchematic, contactStateSentence, contactSymbolKey, STATE_LINE_DY, RUNG_H } from '../src/ui/schematic';
import type { Contact } from '../src/model/types';
import { symbolTopExtent } from '../src/ui/symbols';
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

describe('schematic live-state labels', () => {
  const textOf = (svg: Element, id: string) => svg.querySelector(`[data-state-for="${id}"]`)!.textContent!;
  const SERIES = ['PB3.c', 'PB1.c', 'CR1.NO1', 'CR1.NC1', 'PB2.c', 'FS1.c', 'PS1.c', 'TS1.c', 'LS1.c', 'FLS1.c', 'CR1.NO2', 'TR1.T', 'TR2.T', 'TD3.T', 'TD4.T'];
  const claimsClosed = (s: string) => /now closed/.test(s);
  const claimsOpen = (s: string) => /now open/.test(s);
  const render = (b = bucket()) => { b.world.settle(); return renderSchematic(b); };

  it('every contact label matches contactClosed() and names NO/NC', () => {
    const b = bucket(); b.world.settle();
    const svg = renderSchematic(b);
    for (const id of SERIES) {
      const e = b.world.el<Contact>(id), txt = textOf(svg, id);
      expect(claimsClosed(txt), id + ' ' + txt).toBe(b.world.contactClosed(e));
      expect(claimsOpen(txt), id + ' ' + txt).toBe(!b.world.contactClosed(e));
      expect(txt, id).toMatch(e.nc ? /^NC · / : /^NO · /);
    }
  });

  it('default Day 1: CR1.NO1 is now open, CR1.NC1 is now closed', () => {
    const svg = render();
    expect(textOf(svg, 'CR1.NO1')).toContain('NO · now open');
    expect(textOf(svg, 'CR1.NO1')).not.toContain('now closed');
    expect(textOf(svg, 'CR1.NO1')).toContain('CR1 off');
    expect(textOf(svg, 'CR1.NC1')).toContain('NC · now closed');
  });

  it('same with the source off (handle off / locked out)', () => {
    const b = bucket(); b.world.setSource('SRC', false);
    const svg = render(b);
    expect(textOf(svg, 'CR1.NO1')).toContain('NO · now open');
    expect(textOf(svg, 'CR1.NC1')).toContain('NC · now closed');
  });

  it('energized CR1 flips both, and drops out on release (no seal-in)', () => {
    const b = bucket(); b.world.settle(); b.world.press('PB1');
    let svg = renderSchematic(b);
    expect(textOf(svg, 'CR1.NO1')).toContain('NO · now closed');
    expect(textOf(svg, 'CR1.NO1')).toContain('CR1 energized');
    expect(textOf(svg, 'CR1.NC1')).toContain('NC · now open');
    expect(textOf(svg, 'PB1.c')).toContain('pressed');
    b.world.release('PB1');
    svg = renderSchematic(b);
    expect(textOf(svg, 'CR1.NO1')).toContain('NO · now open');
    expect(textOf(svg, 'CR1.NC1')).toContain('NC · now closed');
  });

  it('shelf-vs-live: the drawn symbol is untouched and sentences are unambiguous', () => {
    const b = bucket(); b.world.settle();
    const e = b.world.el<Contact>('CR1.NO1');
    expect(contactStateSentence(b, e)).toBe('NO contact, now open (CR1 off)');
    expect(contactStateSentence(b, b.world.el<Contact>('PB2.c'))).toBe('NC contact, now closed (released)');
    expect(contactStateSentence(b, b.world.el<Contact>('TR1.T'))).toMatch(/not timed/);
  });

  it('faults are mentioned but still follow contactClosed()', () => {
    const b = bucket(); b.world.el<Contact>('CR1.NO1').welded = true; b.world.settle();
    const txt = textOf(renderSchematic(b), 'CR1.NO1');
    expect(txt).toContain('now closed'); expect(txt).toContain('welded');
  });

  describe('placement', () => {
    const b = bucket(); b.world.settle();
    const svg = renderSchematic(b);
    const num = (el: Element, a: string) => Number(el.getAttribute(a));
    // symbol bounds: centre y from the state label's first tspan baseline minus its offset
    const centreY = (id: string) => num(svg.querySelector(`[data-state-for="${id}"] tspan`)!, 'y') - STATE_LINE_DY[0];
    const stateLines = (id: string) => [...svg.querySelectorAll(`[data-state-for="${id}"] tspan`)].map((n) => ({ x: num(n, 'x'), y: num(n, 'y'), t: n.textContent! }));
    const nameOf = (id: string) => { const n = svg.querySelector(`[data-name-for="${id}"]`)!; return { x: num(n, 'x'), y: num(n, 'y') }; };
    const topExtent = (id: string) => symbolTopExtent(contactSymbolKey(b, b.world.el(id)));

    it('labels sit below the symbol (never on the cap or the previous rung)', () => {
      expect(symbolTopExtent('pb-nc-mushroom')).toBe(24);
      const bottomExtent = 25; // symbols reach ~25 below centre (see symbols.ts)
      for (const id of SERIES) {
        const cy = centreY(id), lines = stateLines(id);
        expect(nameOf(id).y - cy, id).toBeGreaterThanOrEqual(bottomExtent - 1);
        for (const l of lines) expect(l.y - cy, id).toBeGreaterThan(nameOf(id).y - cy);
        // the next rung's tallest symbol starts at RUNG_H - topExtent below this centre; text must stay clear of it
        expect(lines[lines.length - 1].y + 3 /* descender */, id).toBeLessThan(cy + RUNG_H - 24);
        expect(topExtent(id)).toBeLessThanOrEqual(24);
      }
    });

    it("each state label is nearer its own designation than any other contact's", () => {
      const dist = (a: { x: number; y: number }, c: { x: number; y: number }) => Math.hypot(a.x - c.x, a.y - c.y);
      for (const id of SERIES) {
        const first = stateLines(id)[0];
        const own = dist(first, nameOf(id));
        for (const other of SERIES) if (other !== id) expect(own, `${id} vs ${other}`).toBeLessThan(dist(first, nameOf(other)));
      }
    });

    it('lines are no wider than the spacing between neighbours on the same rung', () => {
      for (const [a, c] of [['PB3.c', 'PB1.c']]) {
        const gapX = Math.abs(stateLines(a)[0].x - stateLines(c)[0].x);
        for (const id of [a, c]) for (const l of stateLines(id)) expect(lineWidth(l.t.trim(), 10, 0.52), l.t).toBeLessThan(gapX - 4);
      }
    });
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
    expect(existsSync(join('public', PHOTO_FILE))).toBe(true);
  });

  it('defaults photo opacity to 80 and keeps labels visible in photo mode CSS', () => {
    const panel = readFileSync('src/ui/bucketpanel.ts', 'utf8');
    expect(panel).toMatch(/photoOpacity = 80/);
    const css = readFileSync('src/style.css', 'utf8');
    const start = css.indexOf('/* Photo mode');
    expect(start).toBeGreaterThan(-1);
    const rules = css.slice(start).split('}').filter((r) => r.includes('photo-mode'));
    for (const r of rules) {
      if (/display\s*:\s*none/.test(r)) expect(r).not.toMatch(/legend|text|warn|pin|\.term|\.tb-strip/);
    }
    expect(css).toMatch(/--photo-scale:\s*1/);
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
