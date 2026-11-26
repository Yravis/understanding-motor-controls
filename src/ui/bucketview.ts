// Physical bucket view (SVG): door, panel with devices, terminal strip, greyed-out Chapter 2 preview.
// Tap a terminal to place the red probe, then another for the black probe. Pinch-zoom / pan on the wrapper.
import { s, h } from './dom';
import type { Bucket } from '../model/bucket';
import { WARN_TEXT, WARN_X, WARN_Y, WARN_LINE } from './svgtext';
import { PHYS, physicalLayout, deviceHeaderH } from './physicallayout';

export interface PhysOpts { red?: string | null; black?: string | null; highlightNet?: string | null; onTerminal: (nodeId: string) => void; onDevice?: (tag: string) => void; doorOpen: boolean }
// Terminal hit areas are >= 47 x 47 SVG units so they stay >= 44 CSS px at a 360 px wide phone (scale ~0.95).

export function renderPhysical(b: Bucket, o: PhysOpts): SVGSVGElement {
  const w = b.world;
  const lay = physicalLayout(b, o.doorOpen);
  const { HIT, PIN_DY } = PHYS;
  const H = lay.viewBox.h;
  const svg = s('svg', { viewBox: `0 0 ${lay.viewBox.w} ${H}`, class: 'phys', role: 'img', 'aria-label': 'Physical bucket' });
  svg.append(s('rect', { x: 4, y: 4, width: 352, height: H - 8, rx: 8, class: 'door-frame' }));
  svg.append(s('text', { x: 14, y: 24, class: 'lbl' }, 'BUCKET 1A · control section · door ' + (o.doorOpen ? 'OPEN' : 'CLOSED')));
  const banner = s('g', { class: 'warn-banner', 'data-warning': WARN_TEXT });
  banner.append(s('rect', { x: lay.warning.box.x, y: lay.warning.box.y, width: lay.warning.box.w, height: lay.warning.box.h, rx: 4, class: 'warn' }));
  const wt = s('text', { x: WARN_X + 6, y: WARN_Y + 14, class: 'warn-label' });
  lay.warning.lines.forEach((line, i) => wt.append(s('tspan', { x: WARN_X + 6, dy: i === 0 ? 0 : WARN_LINE }, line)));
  banner.append(wt);
  svg.append(banner);
  if (!o.doorOpen) {
    svg.append(s('rect', { x: 10, y: lay.panelTop - 4, width: 340, height: H - lay.panelTop - 80, rx: 6, class: 'door' }));
    svg.append(s('text', { x: 180, y: lay.panelTop + 60, 'text-anchor': 'middle', class: 'lbl' }, 'Door closed. Turn the handle OFF, then open the door.'));
    return svg;
  }
  for (const d of lay.devices) {
      const { x, y, w: width, h: hgt } = d.box;
      const lit = d.kind === 'lamp' && w.lit(d.tag);
      const g = s('g', { class: 'dev' + (lit ? ' on' : '') + (d.foreign ? ' foreign' : '') });
      g.append(s('rect', { x, y, width, height: hgt, rx: 5, class: 'devbox', onclick: () => o.onDevice?.(d.tag) }));
      g.append(s('text', { x: x + 6, y: y + 15, class: 'lbl' }, d.designation + (lit ? ' · LIT' : '')));
      const title = s('text', { x: x + 6, y: y + PHYS.TITLE_Y, class: 'tiny device-title' });
      d.titleLines.forEach((line, i) => title.append(s('tspan', { x: x + 6, dy: i === 0 ? 0 : PHYS.TITLE_LINE }, line)));
      g.append(title);
      const pinOrigin = y + deviceHeaderH(d.title);
      d.pins.forEach((p, i) => {
        const px = x + 28 + (i % 2) * 56, py = pinOrigin + Math.floor(i / 2) * PIN_DY + 8;
        const sel = o.red === p.id ? 'red' : o.black === p.id ? 'black' : '';
        const hl = o.highlightNet && p.net === o.highlightNet;
        const t = s('g', { class: 'term ' + sel + (hl ? ' hl' : ''), onclick: () => o.onTerminal(p.id) });
        t.append(s('circle', { cx: px, cy: py, r: 10, class: 'pin' }), s('rect', { x: px - HIT / 2 - 2, y: py - HIT / 2, width: HIT + 4, height: HIT, fill: 'transparent', class: 'hit' }));
        t.append(s('text', { x: px, y: py + 3, 'text-anchor': 'middle', class: 'pinlbl' }, p.net.slice(1)));
        t.append(s('text', { x: px, y: py + 19, 'text-anchor': 'middle', class: 'tiny' }, p.label));
        g.append(t);
      });
      svg.append(g);
  }
  // terminal strip
  svg.append(s('text', { x: 14, y: lay.terminalStrip.y - 6, class: 'lbl' }, lay.terminalStrip.label));
  for (const tm of lay.terminalStrip.terminals) {
    const sel = o.red === tm.id ? 'red' : o.black === tm.id ? 'black' : '';
    const t = s('g', { class: 'term tb ' + sel + (o.highlightNet === tm.id ? ' hl' : '') + (tm.foreign ? ' foreign' : ''), onclick: () => o.onTerminal(tm.id) });
    t.append(s('rect', { x: tm.box.x, y: tm.box.y, width: tm.box.w, height: tm.box.h, rx: 3, class: 'tbbox hit' }), s('text', { x: tm.box.x + 26, y: tm.box.y + 29, 'text-anchor': 'middle', class: 'pinlbl' }, tm.net));
    svg.append(t);
  }
  // chapter 2 preview, greyed out
  svg.append(s('text', { x: 14, y: lay.ch2Preview.y - 4, class: 'lbl' }, lay.ch2Preview.label));
  for (const c of lay.ch2Preview.items) {
    const g = s('g', { class: 'ch2', onclick: () => o.onDevice?.('ch2:' + c.tag) });
    g.append(s('rect', { x: c.box.x, y: c.box.y, width: c.box.w, height: c.box.h, rx: 4, class: 'ch2box' }), s('text', { x: c.box.x + c.box.w / 2, y: c.box.y + 17, 'text-anchor': 'middle', class: 'tiny' }, c.tag), s('text', { x: c.box.x + c.box.w / 2, y: c.box.y + 33, 'text-anchor': 'middle', class: 'tiny' }, 'Ch 2'));
    svg.append(g);
  }
  return svg;
}
/** Pinch-zoom + pan wrapper for an SVG. Touch only needs two fingers; buttons also provided. */
export function zoomable(child: SVGElement | HTMLElement): HTMLElement {
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
