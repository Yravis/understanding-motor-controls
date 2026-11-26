// Physical bucket view (SVG): front elevation of a generic MCC bucket, door open to the left.
// Tap a terminal to place the red probe, then another for the black probe. Pinch-zoom / pan on the wrapper.
import { s, h } from './dom';
import type { Bucket } from '../model/bucket';
import { WARN_TEXT, WARN_LINE } from './svgtext';
import { PHYS, physicalLayout, type LaidDevice, type LaidPin, type LaidTerminal, type Box } from './physicallayout';

export interface PhysOpts { red?: string | null; black?: string | null; highlightNet?: string | null; onTerminal: (nodeId: string) => void; onDevice?: (tag: string) => void; doorOpen: boolean }

const LENS: Record<string, string> = {
  PL1: '#1b8f3a', PL2: '#c42b2b', PL3: '#e0a000',
  PL4: '#f2efe6', PL5: '#f2efe6', PL6: '#f2efe6', PL7: '#f2efe6',
  PL8: '#f2efe6', PL9: '#f2efe6', PL10: '#f2efe6', PL11: '#f2efe6',
  PLF: '#f4d3a0',
};

const pathOf = (pts: { x: number; y: number }[], extraY = 0) => {
  if (!pts.length) return '';
  const p0 = pts[0];
  let d = `M${p0.x} ${p0.y + extraY}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const mx = (a.x + b.x) / 2;
    d += ` C${mx} ${a.y + extraY}, ${mx} ${b.y + extraY}, ${b.x} ${b.y + extraY}`;
  }
  return d;
};

const pinClass = (o: PhysOpts, id: string, net: string, foreign = false) => {
  const sel = o.red === id ? 'red' : o.black === id ? 'black' : '';
  const hl = o.highlightNet && (o.highlightNet === net || o.highlightNet === id) ? ' hl' : '';
  return `term ${sel}${hl}${foreign ? ' foreign' : ''}`;
};

export function renderPhysical(b: Bucket, o: PhysOpts): SVGSVGElement {
  const w = b.world;
  const lay = physicalLayout(b, o.doorOpen);
  const { HIT, PIN_R } = PHYS;
  const W = lay.viewBox.w, H = lay.viewBox.h;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'phys', role: 'img', 'aria-label': 'Physical bucket, door open' });

  const txt = (x: number, y: number, cls: string, text: string, attrs: Record<string, string> = {}) =>
    s('text', { x, y, class: cls, ...attrs }, text);
  const rect = (box: Box, cls: string, extra: Record<string, string | number> = {}) =>
    s('rect', { x: box.x, y: box.y, width: box.w, height: box.h, class: cls, ...extra });

  const pin = (p: { x: number; y: number; id: string; net: string; label?: string; foreign?: boolean }, role: 'below' | 'above' | 'none' = 'below') => {
    const netNo = p.net.startsWith('w') ? p.net.slice(1) : p.net;
    const g = s('g', { class: pinClass(o, p.id, p.net, !!p.foreign), onclick: () => o.onTerminal(p.id) });
    g.append(
      s('circle', { cx: p.x, cy: p.y, r: PIN_R, class: 'pin' }),
      s('rect', { x: p.x - HIT / 2, y: p.y - HIT / 2, width: HIT, height: HIT, fill: 'transparent', class: 'hit' }),
    );
    g.append(txt(p.x, p.y + 3.6, 'pinlbl', netNo, { 'text-anchor': 'middle' }));
    const pinName = p.label && p.label !== netNo && !p.label.startsWith(netNo) ? p.label.replace(/\s*\(.*\)$/, '') : '';
    if (role !== 'none' && pinName && pinName !== netNo) {
      const ly = role === 'above' ? p.y - 12 : p.y + 16;
      g.append(txt(p.x, ly, 'tiny pin-role', pinName, { 'text-anchor': 'middle' }));
    }
    return g;
  };
  const tbPin = (t: LaidTerminal) => {
    const g = s('g', { class: pinClass(o, t.id, t.id, t.foreign) + ' tb', onclick: () => o.onTerminal(t.id) });
    g.append(s('rect', { x: t.box.x, y: t.box.y, width: t.box.w, height: t.box.h, rx: 2, class: 'tbbox hit' }),
      txt(t.x, t.y + 3.8, 'pinlbl', t.net, { 'text-anchor': 'middle' }));
    return g;
  };

  // Background / shop floor
  svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'shop' }));

  // ---- Enclosure shell (always drawn; door covers it when closed) ----
  const encl = s('g', { class: 'encl-skin door-frame' });
  encl.append(
    s('rect', { x: lay.enclosure.x - 8, y: lay.enclosure.y - 8, width: lay.enclosure.w + 16, height: lay.enclosure.h + 16, rx: 4, class: 'encl-shell' }),
    rect(lay.enclosure, 'encl-face'),
    rect(lay.backplate, 'backplate'),
  );
  svg.append(encl);

  // Nameplate
  svg.append(rect(lay.nameplate.box, 'nameplate', { rx: 2 }));
  svg.append(txt(lay.nameplate.box.x + 10, lay.nameplate.box.y + 18, 'lbl nameplate-text', lay.nameplate.text));
  svg.append(txt(lay.nameplate.box.x + lay.nameplate.box.w + 16, lay.nameplate.box.y + 18, 'tiny', o.doorOpen ? 'Door OPEN — inside face shown' : 'Door CLOSED'));

  // Warning plate on the enclosure flange
  const banner = s('g', { class: 'warn-banner', 'data-warning': WARN_TEXT });
  banner.append(rect(lay.warning.box, 'warn', { rx: 3 }));
  const wt = s('text', { x: lay.warning.box.x + 10, y: lay.warning.box.y + 18, class: 'warn-label' });
  lay.warning.lines.forEach((line, i) => wt.append(s('tspan', { x: lay.warning.box.x + 10, dy: i === 0 ? 0 : WARN_LINE }, line)));
  banner.append(wt);
  svg.append(banner);

  if (!o.doorOpen) {
    // Closed door covers the interior: show the outside face of the operators.
    const closed = s('g', { class: 'door door-closed' });
    closed.append(s('rect', { x: lay.enclosure.x, y: lay.enclosure.y, width: lay.enclosure.w, height: lay.enclosure.h, rx: 3, class: 'door-front' }));
    closed.append(txt(lay.enclosure.x + lay.enclosure.w / 2, lay.enclosure.y + 48, 'lbl', 'Door closed. Turn the handle OFF, then open the door.', { 'text-anchor': 'middle' }));
    // Simple front operators so the closed door still reads as the same bucket.
    for (const d of lay.devices.filter((d) => d.zone === 'door')) {
      const x = lay.enclosure.x + 40 + (d.box.x - lay.door.x) * (lay.enclosure.w - 80) / lay.door.w;
      const y = lay.enclosure.y + 70 + (d.box.y - lay.door.y) * 0.85;
      drawOperator(closed, d, false, x, y, true);
    }
    svg.append(closed);
    drawFieldInset(svg, lay, o, w, pin, false);
    return svg;
  }

  // ---- Open door (inside face) ----
  const doorG = s('g', { class: 'door-skin' });
  doorG.append(
    s('rect', { x: lay.door.x - 8, y: lay.door.y - 8, width: lay.door.w + 12, height: lay.door.h + 16, rx: 4, class: 'door-edge' }),
    rect(lay.door, 'door-inside'),
    // Hinges on the right edge of the door (swinging open to the left)
    s('rect', { x: lay.door.x + lay.door.w - 2, y: lay.door.y + 40, width: 10, height: 28, rx: 2, class: 'hinge' }),
    s('rect', { x: lay.door.x + lay.door.w - 2, y: lay.door.y + lay.door.h - 80, width: 10, height: 28, rx: 2, class: 'hinge' }),
  );
  svg.append(doorG);
  svg.append(txt(lay.door.x + 10, lay.door.y + 18, 'tiny', 'DOOR — inside face  ·  22 mm operators'));

  // Chapter 2 power section (greyed, inspect-only)
  const ch2 = s('g', { class: 'ch2 ch2-section' });
  ch2.append(rect(lay.ch2Preview.box, 'ch2-area', { rx: 3 }));
  ch2.append(txt(lay.ch2Preview.box.x + 8, lay.ch2Preview.box.y + 14, 'tiny ch2-label', lay.ch2Preview.label));
  for (const c of lay.ch2Preview.items) {
    const g = s('g', { class: 'ch2-item', onclick: () => o.onDevice?.('ch2:' + c.tag) });
    g.append(rect(c.box, 'ch2box', { rx: 3 }));
    drawCh2Glyph(g, c.tag, c.box);
    g.append(txt(c.box.x + c.box.w / 2, c.box.y + c.box.h - 5, 'tiny', c.tag + ' · Ch 2', { 'text-anchor': 'middle' }));
    ch2.append(g);
  }
  svg.append(ch2);

  // CPT
  const cpt = s('g', { class: 'cpt-block' });
  cpt.append(rect(lay.cpt.box, 'devbox powerbox', { rx: 3 }));
  cpt.append(txt(lay.cpt.box.x + 8, lay.cpt.box.y + 15, 'lbl', 'CPT'));
  cpt.append(txt(lay.cpt.box.x + 36, lay.cpt.box.y + 15, 'tiny', 'control transformer  ·  120 V secondary'));
  drawTransformer(cpt, lay.cpt.box);
  for (const t of lay.cpt.terminals) cpt.append(tbPin(t));
  svg.append(cpt);

  // F1
  const f1 = s('g', { class: 'f1-block' });
  f1.append(rect(lay.f1.box, 'devbox powerbox', { rx: 3 }));
  f1.append(txt(lay.f1.box.x + 8, lay.f1.box.y + 15, 'lbl', 'F1'));
  f1.append(txt(lay.f1.box.x + 28, lay.f1.box.y + 15, 'tiny', 'control fuse'));
  drawFuseHolder(f1, lay.f1.box);
  for (const t of lay.f1.terminals) f1.append(tbPin(t));
  svg.append(f1);

  // DIN rails
  for (const rail of lay.dinRails) {
    svg.append(s('rect', { x: rail.x, y: rail.y + rail.h / 2 - 7, width: rail.w, height: 14, rx: 1, class: 'din-rail' }));
  }

  // Devices
  for (const d of lay.devices) {
    const lit = d.kind === 'lamp' && w.lit(d.tag);
    const g = s('g', { class: 'dev ' + d.zone + (lit ? ' on' : '') + (d.foreign ? ' foreign' : ''), 'data-tag': d.tag });
    if (d.zone === 'door') {
      g.append(s('rect', { x: d.box.x, y: d.box.y, width: d.box.w, height: d.box.h, rx: 3, class: 'op-cell', onclick: () => o.onDevice?.(d.tag) }));
      drawOperator(g, d, lit);
      g.append(s('text', { x: d.cx, y: d.box.y + 14, class: 'lbl legend', 'text-anchor': 'middle' }, d.legend[0]));
      if (d.legend[1]) g.append(s('text', { x: d.cx, y: d.box.y + 27, class: 'tiny legend', 'text-anchor': 'middle' }, d.legend[1]));
      for (const p of d.pins) g.append(pin(p, 'none'));
    } else if (d.zone === 'din') {
      g.append(s('rect', { x: d.box.x, y: d.box.y, width: d.box.w, height: d.box.h, rx: 3, class: 'devbox din-dev', onclick: () => o.onDevice?.(d.tag) }));
      drawDinDevice(g, d);
      drawLegend(g, d, d.box.x + 10, d.box.y + 15);
      const ys = [...new Set(d.pins.map((p) => Math.round(p.y)))];
      const midY = d.pins.reduce((s, p) => s + p.y, 0) / d.pins.length;
      for (const p of d.pins) g.append(pin(p, ys.length === 1 ? 'none' : (p.y <= midY + 1 ? 'above' : 'below')));
    } else {
      continue;
    }
    svg.append(g);
  }

  // Terminal strip
  const tb = s('g', { class: 'tb-strip' });
  tb.append(rect(lay.terminalStrip.box, 'tb-area', { rx: 3 }));
  tb.append(txt(lay.terminalStrip.box.x + 8, lay.terminalStrip.box.y + 15, 'tiny tb-label', lay.terminalStrip.label));
  for (const t of lay.terminalStrip.terminals) tb.append(tbPin(t));
  svg.append(tb);

  // Door harness (drawn over the backplate; only 91/92 are colored). Enters the strip from the left / below.
  const harness = s('g', { class: 'harness', 'aria-hidden': 'true' });
  for (let i = -3; i <= 3; i++) {
    harness.append(s('path', { d: pathOf(lay.harness.bundle, i * 3), class: 'wire-run', fill: 'none' }));
  }
  harness.append(s('path', { d: pathOf(lay.harness.orange), class: 'wire-orange', fill: 'none' }));
  harness.append(s('path', { d: pathOf(lay.harness.orangeB), class: 'wire-orange', fill: 'none' }));
  svg.append(harness);

  drawFieldInset(svg, lay, o, w, pin, true);
  return svg;
}

function drawLegend(parent: SVGElement, d: LaidDevice, cx: number, y: number) {
  d.legend.forEach((line, i) => {
    parent.append(s('text', { x: cx, y: y + i * 13, class: i === 0 ? 'lbl legend' : 'tiny legend', 'text-anchor': 'start' }, line));
  });
}

function drawOperator(parent: SVGElement, d: LaidDevice, lit: boolean, cx = d.cx, cy = d.cy, front = false) {
  const color = LENS[d.tag] ?? '#d0d4d8';
  if (d.kind === 'pb-mushroom') {
    parent.append(s('circle', { cx, cy, r: 14, class: 'op-mush-base' }));
    parent.append(s('circle', { cx, cy, r: 11, class: 'op-mush' }));
  } else if (d.kind.startsWith('pb')) {
    parent.append(s('circle', { cx, cy, r: 11, class: 'op-ring' }));
    parent.append(s('circle', { cx, cy, r: 9, class: d.kind === 'pb-no' ? 'op-start' : 'op-stop' }));
    if (!front) parent.append(s('rect', { x: cx - 10, y: cy + 11, width: 20, height: 4, rx: 1, class: 'contact-block' }));
  } else {
    parent.append(s('circle', { cx, cy, r: 11, class: 'op-ring' + (d.foreign ? ' foreign-ring' : '') }));
    parent.append(s('circle', { cx, cy, r: 9, class: 'op-lens' + (lit ? ' lit' : ''), fill: color }));
    if (lit) parent.append(s('circle', { cx, cy, r: 12, class: 'op-glow', fill: color }));
  }
}

function drawDinDevice(parent: SVGElement, d: LaidDevice) {
  const { box, cx } = d;
  if (d.tag === 'CR1') {
    parent.append(s('rect', { x: cx - 28, y: box.y + 10, width: 56, height: 14, rx: 2, class: 'relay-body' }));
    parent.append(s('rect', { x: cx - 14, y: box.y + 13, width: 28, height: 8, rx: 1, class: 'relay-top' }));
  } else if (d.tag === 'TR1' || d.tag === 'TR2') {
    // Pneumatic timer head sitting on a relay body
    parent.append(s('rect', { x: cx - 26, y: box.y + 21, width: 52, height: 11, rx: 2, class: 'relay-body' }));
    parent.append(s('rect', { x: cx - 18, y: box.y + 6, width: 36, height: 15, rx: 3, class: 'timer-head' }));
    parent.append(s('circle', { cx, cy: box.y + 13.5, r: 5, class: 'timer-dial' }));
    parent.append(s('line', { x1: cx, y1: box.y + 13.5, x2: cx + 3.5, y2: box.y + 10, class: 'timer-needle' }));
  } else {
    parent.append(s('rect', { x: cx - 50, y: box.y + 8, width: 100, height: 22, rx: 3, class: 'ss-timer' }));
    parent.append(s('circle', { cx: cx - 34, cy: box.y + 19, r: 6, class: 'timer-dial' }));
    parent.append(s('rect', { x: cx - 18, y: box.y + 14, width: 48, height: 10, rx: 1, class: 'ss-window' }));
  }
}

function drawTransformer(parent: SVGElement, box: Box) {
  const cx = box.x + box.w / 2, cy = box.y + 34;
  parent.append(s('rect', { x: cx - 24, y: cy - 11, width: 48, height: 22, rx: 2, class: 'cpt-body' }));
  parent.append(s('line', { x1: cx - 8, y1: cy - 7, x2: cx - 8, y2: cy + 7, class: 'cpt-coil' }));
  parent.append(s('line', { x1: cx + 8, y1: cy - 7, x2: cx + 8, y2: cy + 7, class: 'cpt-coil' }));
}

function drawFuseHolder(parent: SVGElement, box: Box) {
  const cx = box.x + box.w / 2, cy = box.y + 32;
  parent.append(s('rect', { x: cx - 28, y: cy - 7, width: 56, height: 14, rx: 3, class: 'fuse-holder' }));
  parent.append(s('rect', { x: cx - 18, y: cy - 4, width: 36, height: 8, rx: 2, class: 'fuse-cart' }));
}

function drawCh2Glyph(parent: SVGElement, tag: string, box: Box) {
  const cx = box.x + box.w / 2, cy = box.y + 15;
  if (tag === 'DISC') {
    parent.append(s('rect', { x: cx - 14, y: cy - 8, width: 28, height: 16, rx: 2, class: 'ch2-glyph' }));
    parent.append(s('line', { x1: cx - 5, y1: cy + 2, x2: cx + 8, y2: cy - 6, class: 'ch2-glyph' }));
  } else if (tag === 'PF') {
    for (let i = -1; i <= 1; i++) parent.append(s('rect', { x: cx + i * 11 - 3.5, y: cy - 8, width: 7, height: 16, rx: 1, class: 'ch2-glyph' }));
  } else if (tag === 'M') {
    parent.append(s('rect', { x: cx - 18, y: cy - 8, width: 36, height: 16, rx: 2, class: 'ch2-glyph' }));
    parent.append(s('text', { x: cx, y: cy + 4, class: 'tiny', 'text-anchor': 'middle' }, 'M'));
  } else if (tag === 'OL') {
    parent.append(s('rect', { x: cx - 16, y: cy - 8, width: 32, height: 16, rx: 2, class: 'ch2-glyph' }));
    parent.append(s('text', { x: cx, y: cy + 4, class: 'tiny', 'text-anchor': 'middle' }, 'OL'));
  } else {
    parent.append(s('circle', { cx, cy, r: 8, class: 'ch2-glyph' }));
    parent.append(s('line', { x1: cx + 8, y1: cy, x2: cx + 16, y2: cy, class: 'ch2-glyph' }));
  }
}

function drawFieldInset(
  svg: SVGElement,
  lay: ReturnType<typeof physicalLayout>,
  o: PhysOpts,
  w: Bucket['world'],
  pin: (p: LaidPin) => SVGElement,
  withPins: boolean,
) {
  const g = s('g', { class: 'field-inset' });
  g.append(s('rect', { x: lay.fieldInset.box.x, y: lay.fieldInset.box.y, width: lay.fieldInset.box.w, height: lay.fieldInset.box.h, rx: 4, class: 'field-area' }));
  g.append(s('text', { x: lay.fieldInset.box.x + 10, y: lay.fieldInset.box.y + 17, class: 'lbl' }, lay.fieldInset.label));
  for (const d of lay.devices.filter((d) => d.zone === 'field')) {
    const dg = s('g', { class: 'dev field' + (d.kind === 'lamp' && w.lit(d.tag) ? ' on' : ''), onclick: () => o.onDevice?.(d.tag) });
    dg.append(s('rect', { x: d.box.x, y: d.box.y, width: d.box.w, height: d.box.h, rx: 3, class: 'devbox field-dev' }));
    dg.append(s('text', { x: d.cx, y: d.box.y + 15, class: 'lbl legend', 'text-anchor': 'middle' }, d.legend[0]));
    dg.append(s('text', { x: d.cx, y: d.box.y + 28, class: 'tiny legend', 'text-anchor': 'middle' }, d.legend[1] ?? ''));
    dg.append(s('rect', { x: d.cx - 20, y: d.box.y + 34, width: 40, height: 12, rx: 2, class: 'term-block' }));
    if (withPins) for (const p of d.pins) dg.append(pin(p));
    g.append(dg);
  }
  svg.append(g);
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
