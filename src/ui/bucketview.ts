// Physical bucket view (SVG): door, panel with devices, terminal strip, greyed-out Chapter 2 preview.
// Tap a terminal to place the red probe, then another for the black probe. Pinch-zoom / pan on the wrapper.
import { s, h } from './dom';
import type { Bucket } from '../model/bucket';
import { WARN_TEXT, WARN_X, WARN_Y, WARN_RECT_W, WARN_LINE, warningBannerLayout } from './svgtext';

export interface PhysOpts { red?: string | null; black?: string | null; highlightNet?: string | null; onTerminal: (nodeId: string) => void; onDevice?: (tag: string) => void; doorOpen: boolean }
// Terminal hit areas are >= 47 x 47 SVG units so they stay >= 44 CSS px at a 360 px wide phone (scale ~0.95).
const COLS = 3, CW = 112, CH_BASE = 48, PIN_DY = 48, HIT = 47;

export function renderPhysical(b: Bucket, o: PhysOpts): SVGSVGElement {
  const w = b.world;
  const devs = b.layout.devices;
  const cellH = (d: { pins: unknown[] }) => CH_BASE + Math.ceil(d.pins.length / 2) * PIN_DY;
  const rows: typeof devs[] = [];
  for (let i = 0; i < devs.length; i += COLS) rows.push(devs.slice(i, i + COLS));
  const rowH = rows.map((r) => Math.max(...r.map(cellH)) + 12);
  const panelH = rowH.reduce((a, v) => a + v, 0) + 16;
  const warn = warningBannerLayout();
  const tbRows = Math.ceil(b.layout.tbNets.length / 6);
  const tbY = warn.panelTop + panelH + 20, ch2Y = tbY + tbRows * 54 + 30;
  const H = ch2Y + 70;
  const svg = s('svg', { viewBox: `0 0 360 ${H}`, class: 'phys', role: 'img', 'aria-label': 'Physical bucket' });
  svg.append(s('rect', { x: 4, y: 4, width: 352, height: H - 8, rx: 8, class: 'door-frame' }));
  svg.append(s('text', { x: 14, y: 24, class: 'lbl' }, 'BUCKET 1A · control section · door ' + (o.doorOpen ? 'OPEN' : 'CLOSED')));
  const banner = s('g', { class: 'warn-banner', 'data-warning': WARN_TEXT });
  banner.append(s('rect', { x: WARN_X, y: WARN_Y, width: WARN_RECT_W, height: warn.height, rx: 4, class: 'warn' }));
  const wt = s('text', { x: WARN_X + 6, y: WARN_Y + 14, class: 'warn-label' });
  warn.lines.forEach((line, i) => wt.append(s('tspan', { x: WARN_X + 6, dy: i === 0 ? 0 : WARN_LINE }, line)));
  banner.append(wt);
  svg.append(banner);
  if (!o.doorOpen) {
    svg.append(s('rect', { x: 10, y: warn.panelTop - 4, width: 340, height: panelH + 120, rx: 6, class: 'door' }));
    svg.append(s('text', { x: 180, y: warn.panelTop + 60, 'text-anchor': 'middle', class: 'lbl' }, 'Door closed. Turn the handle OFF, then open the door.'));
    return svg;
  }
  let y = warn.panelTop;
  rows.forEach((row, ri) => {
    row.forEach((d, ci) => {
      const x = 12 + ci * (CW + 4);
      const hgt = rowH[ri] - 8;
      const lit = d.kind === 'lamp' && w.lit(d.tag);
      const g = s('g', { class: 'dev' + (lit ? ' on' : '') + (d.foreign ? ' foreign' : '') });
      g.append(s('rect', { x, y, width: CW, height: hgt, rx: 5, class: 'devbox', onclick: () => o.onDevice?.(d.tag) }));
      g.append(s('text', { x: x + 6, y: y + 15, class: 'lbl' }, d.designation + (lit ? ' · LIT' : '')));
      g.append(s('text', { x: x + 6, y: y + 28, class: 'tiny' }, short(d.title)));
      d.pins.forEach((p, i) => {
        const px = x + 28 + (i % 2) * 56, py = y + CH_BASE + Math.floor(i / 2) * PIN_DY + 8;
        const sel = o.red === p.id ? 'red' : o.black === p.id ? 'black' : '';
        const hl = o.highlightNet && p.net === o.highlightNet;
        const t = s('g', { class: 'term ' + sel + (hl ? ' hl' : ''), onclick: () => o.onTerminal(p.id) });
        t.append(s('circle', { cx: px, cy: py, r: 10, class: 'pin' }), s('rect', { x: px - HIT / 2 - 2, y: py - HIT / 2, width: HIT + 4, height: HIT, fill: 'transparent', class: 'hit' }));
        t.append(s('text', { x: px, y: py + 3, 'text-anchor': 'middle', class: 'pinlbl' }, p.net.slice(1)));
        t.append(s('text', { x: px, y: py + 19, 'text-anchor': 'middle', class: 'tiny' }, p.label));
        g.append(t);
      });
      svg.append(g);
    });
    y += rowH[ri];
  });
  // terminal strip
  svg.append(s('text', { x: 14, y: tbY - 6, class: 'lbl' }, 'TERMINAL STRIP (wire numbers)'));
  b.layout.tbNets.forEach((n, i) => {
    const per = 6, x = 10 + (i % per) * 57, yy = tbY + Math.floor(i / per) * 54;
    const id = n === 'X1' || n === 'X2' || n === 'G' ? n : 'w' + n;
    const sel = o.red === id ? 'red' : o.black === id ? 'black' : '';
    const t = s('g', { class: 'term tb ' + sel + (o.highlightNet === id ? ' hl' : '') + (n === '91' || n === '92' ? ' foreign' : ''), onclick: () => o.onTerminal(id) });
    t.append(s('rect', { x, y: yy, width: 52, height: HIT + 1, rx: 3, class: 'tbbox hit' }), s('text', { x: x + 26, y: yy + 29, 'text-anchor': 'middle', class: 'pinlbl' }, n));
    svg.append(t);
  });
  // chapter 2 preview, greyed out
  svg.append(s('text', { x: 14, y: ch2Y - 4, class: 'lbl' }, 'CHAPTER 2 PREVIEW (inspect only)'));
  b.layout.ch2Preview.forEach((c, i) => {
    const g = s('g', { class: 'ch2', onclick: () => o.onDevice?.('ch2:' + c.tag) });
    g.append(s('rect', { x: 12 + i * 68, y: ch2Y, width: 64, height: 44, rx: 4, class: 'ch2box' }), s('text', { x: 12 + i * 68 + 32, y: ch2Y + 17, 'text-anchor': 'middle', class: 'tiny' }, c.tag), s('text', { x: 12 + i * 68 + 32, y: ch2Y + 33, 'text-anchor': 'middle', class: 'tiny' }, 'Ch 2'));
    svg.append(g);
  });
  return svg;
}
const short = (t: string) => (t.length > 20 ? t.slice(0, 19) + '…' : t);

/** Pinch-zoom + pan wrapper for an SVG. Touch only needs two fingers; buttons also provided. */
export function zoomable(child: SVGElement): HTMLElement {
  const wrap = h('div', { class: 'zoom' });
  const inner = h('div', { class: 'zoom-inner' });
  inner.append(child);
  wrap.append(inner);
  let scale = 1, tx = 0, ty = 0;
  const apply = () => { inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
  const pts = new Map<number, { x: number; y: number }>();
  let last = 0, lastC = { x: 0, y: 0 };
  wrap.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
  wrap.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (last) { scale = Math.min(3, Math.max(1, scale * (d / last))); tx += c.x - lastC.x; ty += c.y - lastC.y; apply(); }
      last = d; lastC = c;
    } else if (pts.size === 1 && scale > 1) { /* single-finger pan only when zoomed */ }
  });
  const up = (e: PointerEvent) => { pts.delete(e.pointerId); last = 0; };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
  const zoomBtn = (label: string, f: () => void) => h('button', { class: 'btn small', type: 'button', onclick: f }, label);
  const bar = h('div', { class: 'zoombar' },
    zoomBtn('Zoom +', () => { scale = Math.min(3, scale * 1.4); apply(); }), zoomBtn('Zoom −', () => { scale = Math.max(1, scale / 1.4); if (scale === 1) { tx = 0; ty = 0; } apply(); }),
    zoomBtn('◀', () => { tx += 60; apply(); }), zoomBtn('▶', () => { tx -= 60; apply(); }), zoomBtn('▲', () => { ty += 60; apply(); }), zoomBtn('▼', () => { ty -= 60; apply(); }));
  const box = h('div');
  box.append(bar, wrap);
  return box;
}
