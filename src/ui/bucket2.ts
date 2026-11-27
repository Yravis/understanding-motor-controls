// The redrawn Bucket 1A (SVG): door with a working handle, pilot lights lit from the circuit model, pushbuttons, the caution label,
// and the backplate with clickable screw terminals. Everything that looks like state (lights, contacts, probes) is read from the World.
import { s } from './dom';
import type { Bucket } from '../model/bucket';
import { untaught } from '../game/steps';
import {
  B2, DOOR, INTERIOR, HANDLE, LATCH, CAUTION, POWER, PILOTS, pilotPos, PUSHBUTTONS, CPT, F1, CR1, TIMERS, CH2, TB, EGC,
  bucket2Terms, tbCol, termFor, targetSpot, type Term,
} from './bucket2layout';

export interface B2Props {
  b: Bucket;
  day: number;
  doorOpen: boolean; handleOn: boolean; locked: boolean; fusePulled: boolean;
  red: string | null; black: string | null;
  hl: string | null;
  target: string | null;
  tool: 'probe' | 'operate';
  inspected: string[]; found: string[];
  lastKey?: Record<string, string>;
}
export interface B2Hooks {
  onTerminal: (node: string, key: string) => void;
  onDevice: (tag: string) => void;
  onHandle: () => void;
  onDoor: () => void;
  onLabel: () => void;
  onPress: (tag: string, down: boolean) => void;
  onFuse: () => void;
  onUntaught: (tag: string, why: string) => void;
}

const INK = '#26313b';
// Inline style, not attributes: the app-wide `svg text { font:13px; fill:... }` rule would override presentation attributes.
const txt = (x: number, y: number, str: string, o: { fs?: number; fw?: number; fill?: string; a?: string; ls?: number; cls?: string } = {}) =>
  s('text', { x, y, style: `font-size:${o.fs ?? 10}px;font-weight:${o.fw ?? 400};fill:${o.fill ?? INK}`, 'text-anchor': o.a ?? 'middle', ...(o.ls ? { 'letter-spacing': o.ls } : {}), ...(o.cls ? { class: o.cls } : {}) }, str);
const rect = (x: number, y: number, w: number, h: number, a: Record<string, string | number | ((e: any) => void)> = {}) => s('rect', { x, y, width: w, height: h, ...a });
const circ = (cx: number, cy: number, r: number, a: Record<string, string | number> = {}) => s('circle', { cx, cy, r, ...a });
const path = (d: string, a: Record<string, string | number> = {}) => s('path', { d, ...a });
const grp = (cls: string, a: Record<string, string | number | ((e: any) => void)> = {}, ...kids: Node[]) => { const g = s('g', { class: cls, ...a }); g.append(...kids); return g; };

const WIRE: Record<string, [string, string]> = { red: ['#c62828', '#7f1a1a'], white: ['#fbfbfb', '#9aa3ab'], green: ['#2e8b3e', '#1d5a28'], orange: ['#ef8a2c', '#a85512'] };
function wire(d: string, col: keyof typeof WIRE, w = 2.6): SVGGElement {
  const [a, b] = WIRE[col];
  return grp('wire2', {}, path(d, { fill: 'none', stroke: b, 'stroke-width': w + 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }), path(d, { fill: 'none', stroke: a, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}
const marker = (x: number, y: number, label: string) => grp('wmark', {}, rect(x - 8, y - 5, 16, 10, { rx: 2, fill: '#fff', stroke: '#b8c0c7', 'stroke-width': 0.6 }), txt(x, y + 3, label, { fs: 7, fw: 700 }));

/** Small orange marker: this value is invented for the model and still waits for review. */
function illustrative(x: number, y: number, anchor: 'start' | 'middle' | 'end' = 'start', label = 'illustrative · pending review'): SVGGElement {
  const w = label.length * 3.7 + 12;
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return grp('illus', { 'data-illustrative': label },
    rect(x0, y - 6, w, 11, { rx: 5.5, fill: '#fff4e0', stroke: '#c77a00', 'stroke-width': 0.7 }),
    circ(x0 + 6, y - 0.5, 2.3, { fill: '#c77a00' }),
    txt(x0 + 11, y + 2.4, label, { fs: 6.4, fw: 700, fill: '#8a4b00', a: 'start' }));
}

export function bucket2Defs(): SVGDefsElement {
  const d = s('defs');
  d.innerHTML = `
  <pattern id="b2Galv" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#e7eaec"/><circle cx="2" cy="3" r="0.7" fill="#d6dbdf"/><circle cx="7" cy="8" r="0.6" fill="#dde1e4"/></pattern>
  <pattern id="b2Hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="transparent"/><line x1="0" y1="0" x2="0" y2="8" stroke="#9aa3ab" stroke-width="1.2" opacity=".5"/></pattern>
  <radialGradient id="b2Screw" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#f4f6f7"/><stop offset="1" stop-color="#a7afb6"/></radialGradient>
  <linearGradient id="b2Door" x1="0" x2="1"><stop offset="0" stop-color="#d9dde1"/><stop offset="1" stop-color="#cdd2d7"/></linearGradient>
  <linearGradient id="b2Rail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7dbde"/><stop offset=".5" stop-color="#b3bac0"/><stop offset="1" stop-color="#9aa2a9"/></linearGradient>
  <linearGradient id="b2Core" x1="0" x2="1"><stop offset="0" stop-color="#4b525a"/><stop offset=".5" stop-color="#666e76"/><stop offset="1" stop-color="#454c53"/></linearGradient>
  <linearGradient id="b2Copper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4b"/><stop offset="1" stop-color="#9a6232"/></linearGradient>
  <filter id="b2Glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="b2Shadow" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity=".18"/></filter>`;
  return d;
}

export function renderBucket2(p: B2Props, hk: B2Hooks): SVGSVGElement {
  const w = p.b.world;
  const grey = untaught(p.day);
  const terms = bucket2Terms(p.b);
  const svg = s('svg', { viewBox: `0 0 ${B2.W} ${B2.H}`, class: 'b2', role: 'img', 'aria-label': `Bucket 1A, door ${p.doorOpen ? 'open' : 'closed'}, handle ${p.handleOn ? 'ON' : 'OFF'}` });
  svg.append(bucket2Defs());
  svg.append(rect(0, 0, B2.W, B2.H, { class: 'b2-bg', fill: '#e9ecee' }));

  const selNodes = new Set([p.red, p.black].filter(Boolean) as string[]);
  const screw = (t: Term): SVGGElement => {
    const cls = ['term2', t.dim ? 'dim' : '', t.foreign ? 'f2' : '', p.red === t.node ? 'red' : '', p.black === t.node ? 'black' : '', p.hl && p.hl === t.node ? 'hl2' : '', t.node && selNodes.has(t.node) ? 'sel' : ''].filter(Boolean).join(' ');
    const g = grp(cls, { 'data-node': t.node, 'data-key': t.key, role: 'button', 'aria-label': t.node ? `Terminal ${t.part} ${t.label}` : `${t.part} ${t.label} (power side, Chapter 2)` });
    g.append(circ(t.x, t.y, t.r, { class: 'screw', fill: 'url(#b2Screw)', stroke: '#59626b', 'stroke-width': 0.8 }),
      path(`M${t.x - t.r * 0.55} ${t.y - t.r * 0.35} L${t.x + t.r * 0.55} ${t.y + t.r * 0.35}`, { stroke: '#59626b', 'stroke-width': 1.1, 'stroke-linecap': 'round' }),
      circ(t.x, t.y, Math.max(t.r + 4, 10), { class: 'hit', fill: 'transparent' }));
    if (t.node && !t.dim) g.addEventListener('click', () => hk.onTerminal(t.node, t.key));
    return g;
  };

  // ============ door ============
  const door = grp('door2' + (p.doorOpen ? ' open' : ' closed'), p.doorOpen ? {} : { transform: 'translate(342 0)' });
  if (p.doorOpen) {
    door.append(rect(DOOR.x, DOOR.y, DOOR.w, DOOR.h, { rx: 8, fill: 'url(#b2Door)', stroke: '#9aa2aa', 'stroke-width': 2, filter: 'url(#b2Shadow)' }), rect(30, 30, 260, 740, { rx: 5, fill: 'none', stroke: '#b9c0c6' }),
      rect(300, 110, 12, 40, { rx: 3, fill: '#8f979e' }), rect(300, 650, 12, 40, { rx: 3, fill: '#8f979e' }));
  } else {
    // closed: the door face covers the whole enclosure (group is shifted +342, so draw it 342 to the left)
    door.append(rect(DOOR.x - 342, DOOR.y, 968, DOOR.h, { rx: 8, fill: 'url(#b2Door)', stroke: '#9aa2aa', 'stroke-width': 2, filter: 'url(#b2Shadow)' }), rect(-312, 30, 944, 740, { rx: 5, fill: 'none', stroke: '#b9c0c6' }));
  }
  door.append(rect(56, 42, 208, 30, { rx: 3, fill: '#fff', stroke: '#9aa3ab' }),
    txt(160, 61, 'BUCKET 1A · CONTROL 120 V', { fs: 11, fw: 700, ls: 0.4 }),
    txt(160, 86, p.doorOpen ? 'front face · door swung open' : 'front face · door closed', { fs: 8, fill: '#6b7680' }));

  // latch (door open/closed) with interlock state
  const interlocked = p.handleOn && !p.doorOpen;
  const latch = grp('dev2 latch2 interlock' + (interlocked ? ' locked' : ' free'), { 'data-target': 'door', role: 'button', 'aria-label': `Door latch, door ${p.doorOpen ? 'open' : 'closed'}, interlock ${p.handleOn ? 'engaged while the handle is ON' : 'released'}` });
  latch.append(rect(LATCH.x, LATCH.y, LATCH.w, LATCH.h, { class: 'card2', rx: 5, fill: interlocked ? '#e6c3c3' : '#c7cdd2', stroke: '#6f777e' }),
    circ(LATCH.x + 20, LATCH.y + 23, 10, { fill: '#59626b', stroke: '#2b2f33' }), rect(LATCH.x + 17, LATCH.y + 16, 6, 20, { rx: 3, fill: interlocked ? '#9b1c1c' : '#2e8b3e', transform: `rotate(${p.doorOpen ? 90 : 0} ${LATCH.x + 20} ${LATCH.y + 23})` }),
    txt(LATCH.x + 66, LATCH.y + 19, 'DOOR LATCH', { fs: 8.5, fw: 800 }),
    txt(LATCH.x + 66, LATCH.y + 33, p.doorOpen ? 'door open' : interlocked ? 'interlock: locked' : 'interlock: released', { fs: 7.2, fw: 600, fill: interlocked ? '#9b1c1c' : '#3b4651' }));
  latch.addEventListener('click', () => hk.onDoor());
  door.append(latch);

  // handle (disconnect operator) with hasp, lock and tag
  const hx = HANDLE.x, hy = HANDLE.y;
  const handle = grp('handle2 ' + (p.handleOn ? 'on' : 'off'), { 'data-target': 'handle', role: 'button', 'aria-label': `Disconnect handle, ${p.handleOn ? 'ON' : p.locked ? 'OFF and locked out' : 'OFF'}` });
  handle.append(rect(HANDLE.box.x, HANDLE.box.y, HANDLE.box.w, HANDLE.box.h, { rx: 8, fill: '#b7bec5', stroke: '#8a939b' }), rect(54, 100, 102, 130, { rx: 6, fill: '#c7cdd2' }),
    txt(146, 116, 'ON', { fs: 10, fw: 700, a: 'end', fill: p.handleOn ? '#1d2730' : '#7b8794' }), txt(146, 224, 'OFF', { fs: 10, fw: 700, a: 'end', fill: p.handleOn ? '#7b8794' : '#1d2730' }),
    circ(hx, hy, 22, { fill: '#2b2f33', stroke: '#15181a', 'stroke-width': 1.5 }),
    grp('lever', { transform: `rotate(${p.handleOn ? 0 : 180} ${hx} ${hy})` }, rect(hx - 9, hy - 64, 18, 66, { rx: 8, fill: '#c62828', stroke: '#7f1a1a', 'stroke-width': 1.2 }), rect(hx - 4, hy - 58, 8, 26, { rx: 4, fill: '#e65a5a', opacity: 0.6 })),
    circ(hx, hy, 7, { fill: '#9aa2a9' }), rect(160, 146, 20, 14, { rx: 2, fill: '#9aa2a9', stroke: '#6f777e' }), circ(172, 153, 3, { fill: '#59626b' }));
  handle.addEventListener('click', () => hk.onHandle());
  door.append(handle);
  if (p.locked) {
    door.append(grp('lock2', { filter: 'url(#b2Shadow)' },
      path('M166 170 v-12 a6 6 0 0 1 12 0 v12', { fill: 'none', stroke: '#b9c0c6', 'stroke-width': 3.5 }), rect(159, 168, 26, 30, { rx: 4, fill: '#c62828', stroke: '#7f1a1a' }), txt(172, 187, 'L-01', { fs: 7.5, fw: 700, fill: '#fff' }),
      path('M172 198 C 176 204, 186 206, 196 206', { fill: 'none', stroke: '#555', 'stroke-width': 1.2 }),
      grp('tag2', { transform: 'rotate(3 236 254)' }, rect(192, 200, 86, 100, { rx: 5, fill: '#fff', stroke: '#9aa3ab' }), circ(199, 208, 3.5, { fill: '#fff', stroke: '#9aa3ab' }), rect(192, 215, 86, 22, { fill: '#c62828' }),
        txt(235, 230, 'DANGER', { fs: 11, fw: 800, fill: '#fff', ls: 1 }), txt(235, 250, 'DO NOT', { fs: 9.5, fw: 800 }), txt(235, 265, 'OPERATE', { fs: 9.5, fw: 800 }),
        txt(235, 280, 'Locked out by: you', { fs: 7 }), txt(235, 291, 'Lock L-01', { fs: 7 }))));
    door.append(illustrative(166, 316, 'start', 'lock L-01: illustrative · pending review'));
  }

  // orange caution label (remote source)
  const label = grp('caution2' + (p.found.includes('label') ? ' seen' : ''), { 'data-target': 'label', role: 'button', 'aria-label': 'Caution label: wires 91 and 92 are fed from another panel and stay live with the handle OFF' });
  label.append(rect(CAUTION.x, CAUTION.y, CAUTION.w, CAUTION.h, { rx: 4, fill: '#f59a3a', stroke: '#a85512' }), rect(CAUTION.x, CAUTION.y, 62, CAUTION.h, { rx: 4, fill: '#1d2730' }),
    txt(75, 746, '⚠ CAUTION', { fs: 8.5, fw: 800, fill: '#f8b562' }), txt(168, 739, 'Wires 91/92 are fed from panel RP-2.', { fs: 7.2, fw: 700 }), txt(168, 752, 'Live with this handle OFF.', { fs: 7.2, fw: 700 }));
  label.addEventListener('click', () => hk.onLabel());
  door.append(label, illustrative(CAUTION.x + CAUTION.w, 771, 'end', 'RP-2: illustrative · pending review'));

  // pilot lights
  PILOTS.forEach((pl, i) => {
    const { x, y } = pilotPos(i);
    const lit = w.lit(pl.tag);
    const why = grey[pl.tag];
    const seen = p.inspected.includes(pl.tag);
    const g = grp('dev2 pilot' + (lit ? ' lit' : '') + (why ? ' grey' : '') + (seen ? ' seen' : ''), { 'data-tag': pl.tag, 'data-lit': lit ? '1' : '0', role: 'button', 'aria-label': `${pl.tag} ${pl.legend}, ${lit ? 'lit' : 'off'}${why ? ', taught ' + why : ''}`, ...(why ? { opacity: 0.4 } : {}) });
    g.append(rect(x - 42, y - 20, 84, 70, { class: 'card2', rx: 4, fill: 'transparent' }));
    if (lit) g.append(circ(x, y, 17, { fill: pl.color, opacity: 0.75, filter: 'url(#b2Glow)' }));
    g.append(circ(x, y, 16, { fill: '#9aa2a9', stroke: '#6f777e' }), circ(x, y, 11.5, { fill: pl.color, opacity: lit ? 1 : 0.38, stroke: '#00000033' }),
      circ(x - 3.5, y - 4, lit ? 3.5 : 2.5, { fill: '#fff', opacity: lit ? 0.7 : 0.35 }),
      rect(x - 40, y + 20, 80, 30, { rx: 3, fill: pl.tag === 'PLF' ? '#ffe2c4' : '#fff', stroke: '#a9b1b8', 'stroke-width': 0.8 }),
      txt(x, y + 32, pl.tag, { fs: 9, fw: 800 }), txt(x, y + 44, pl.legend, { fs: 7.1, fw: 600, fill: '#3b4651' }));
    g.addEventListener('click', () => (why ? hk.onUntaught(pl.tag, why) : hk.onDevice(pl.tag)));
    door.append(g);
  });
  door.append(txt(160, 636, 'PL8–PL11 are timer lights, taught Day 8', { fs: 8, fill: '#7b8794' }));
  // pushbuttons
  for (const pb of PUSHBUTTONS) {
    const d = w.devs[pb.tag] as any;
    const pressed = !!d?.pressed;
    const seen = p.inspected.includes(pb.tag);
    const g = grp('dev2 pb' + (pressed ? ' pressed' : '') + (seen ? ' seen' : ''), { 'data-tag': pb.tag, role: 'button', 'aria-label': `${pb.tag} ${pb.legend}, ${pb.sub}${pressed ? ', pressed' : ''}` });
    g.append(rect(pb.x - 42, pb.y - 28, 84, 92, { class: 'card2', rx: 4, fill: 'transparent' }), rect(pb.x - 26, pb.y - 26, 52, 52, { rx: 6, fill: '#aab2b9', stroke: '#7c858d' }));
    if (pb.mush) g.append(circ(pb.x, pb.y, 24, { fill: '#f3c623', stroke: '#9c7d0c' }), circ(pb.x, pb.y, pressed ? 16 : 19, { fill: pb.color, stroke: '#7f1a1a' }), circ(pb.x - 6, pb.y - 7, 6, { fill: '#fff', opacity: 0.25 }));
    else g.append(circ(pb.x, pb.y, 17, { fill: '#3c4248' }), circ(pb.x, pb.y, pressed ? 11 : 13.5, { fill: pb.color, stroke: '#00000044' }), circ(pb.x - 4, pb.y - 5, 4, { fill: '#fff', opacity: 0.25 }));
    g.append(rect(pb.x - 40, pb.y + 30, 80, 30, { rx: 3, fill: '#fff', stroke: '#a9b1b8', 'stroke-width': 0.8 }), txt(pb.x, pb.y + 42, `${pb.tag} ${pb.legend}`, { fs: 9, fw: 800 }), txt(pb.x, pb.y + 54, pb.sub, { fs: 7.1, fw: 600, fill: '#3b4651' }));
    if (p.tool === 'operate') {
      const d2 = w.devs[pb.tag] as any;
      if (d2?.maintained) g.addEventListener('click', () => hk.onPress(pb.tag, !d2.pressed));
      else {
        g.addEventListener('pointerdown', (e: Event) => { e.preventDefault(); hk.onPress(pb.tag, true); });
        for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) g.addEventListener(ev, () => { if ((w.devs[pb.tag] as any).pressed) hk.onPress(pb.tag, false); });
      }
    } else g.addEventListener('click', () => hk.onDevice(pb.tag));
    door.append(g);
  }

  // ============ interior ============
  const inner = grp('interior2');
  if (p.doorOpen) {
    inner.append(rect(INTERIOR.x, INTERIOR.y, INTERIOR.w, INTERIOR.h, { rx: 6, fill: '#8e969d', stroke: '#6f777e', 'stroke-width': 2 }),
      rect(336, 32, 636, 736, { rx: 3, fill: 'url(#b2Galv)', stroke: '#b3bac0' }),
      txt(348, 776, 'BACKPLATE · Bucket 1A', { fs: 8, a: 'start', fill: '#e8ebee', fw: 700, ls: 0.5 }));
    // power section (Chapter 2): greyed, inspect-only
    const pw = grp('power2 grey', { opacity: 0.42 }, rect(POWER.x, POWER.y, POWER.w, POWER.h, { rx: 4, fill: '#dfe3e6', stroke: '#b5bcc2', 'stroke-dasharray': '5 4' }));
    for (const c of CH2) {
      const g = grp('dev2 ch2', { 'data-tag': c.tag, role: 'button', 'aria-label': `${c.title}, power section, taught in Chapter 2` });
      g.append(rect(c.box.x, c.box.y, c.box.w, c.box.h, { class: 'card2', rx: 5, fill: '#a5adb4', stroke: '#7d868e' }), txt(c.box.x + c.box.w / 2, c.box.y + c.box.h / 2 + 4, c.tag, { fs: c.tag.length > 2 ? 11 : 14, fw: 800 }));
      g.addEventListener('click', () => hk.onUntaught(c.tag, 'Chapter 2'));
      pw.append(g);
    }
    pw.append(rect(POWER.x, POWER.y, POWER.w, POWER.h, { fill: 'url(#b2Hatch)', 'pointer-events': 'none' }));
    inner.append(pw, grp('chip', {}, rect(806, 150, 146, 24, { rx: 12, fill: '#fff', stroke: '#b5bcc2' }), txt(879, 166, 'Power section · Chapter 2', { fs: 9, fw: 700, fill: '#5b6670' })));
    // ducts and rails
    const duct = (y: number, h = 28) => { const g = grp('duct2', {}, rect(344, y, 620, h, { rx: 2, fill: '#c3c9ce', stroke: '#9aa2a9' })); for (let x = 352; x < 960; x += 12) g.append(rect(x, y + 3, 5, h - 6, { fill: '#aeb5bb' })); return g; };
    const rail = (y: number) => { const g = grp('rail2', {}, rect(344, y - 7, 620, 14, { fill: 'url(#b2Rail)', stroke: '#8a939a', 'stroke-width': 0.8 })); for (let x = 356; x < 960; x += 25) g.append(rect(x, y - 2, 12, 4, { rx: 2, fill: '#8a939a' })); return g; };
    inner.append(duct(202), rail(306), duct(404), rail(520));

    const seenC = (t: string) => (p.inspected.includes(t) ? ' seen' : '');
    // CPT
    const cpt = grp('dev2 cpt' + seenC('CPT'), { 'data-tag': 'CPT', role: 'button', 'aria-label': 'CPT, control power transformer' });
    cpt.append(rect(CPT.x, CPT.y, CPT.w, CPT.h, { class: 'card2', rx: 5, fill: '#d1d6da', stroke: '#8a939a', filter: 'url(#b2Shadow)' }), rect(366, 244, 108, 22, { rx: 3, fill: '#30363c' }), rect(372, 274, 96, 64, { rx: 3, fill: 'url(#b2Core)' }),
      rect(386, 282, 68, 48, { rx: 6, fill: 'url(#b2Copper)', stroke: '#7a4a22' }), rect(398, 296, 44, 20, { rx: 2, fill: '#f7f7f2', stroke: '#b8b49b' }), txt(420, 309, 'CPT', { fs: 9, fw: 800 }), rect(366, 346, 108, 30, { rx: 3, fill: '#30363c' }));
    ['H1', 'H3', 'H2', 'H4'].forEach((hh, k) => cpt.append(txt(378 + k * 28, 280, hh, { fs: 6.5, fw: 700, fill: '#cfd5da' })));
    cpt.append(txt(394 - 10, 343, 'X1', { fs: 8, fw: 800, a: 'end', fill: '#9b1c1c' }), txt(446 - 10, 343, 'X2', { fs: 8, fw: 800, a: 'end' }));
    cpt.addEventListener('click', () => hk.onDevice('CPT'));
    inner.append(cpt, txt(420, 230, 'CPT · 120 V secondary', { fs: 8.5, fw: 700, fill: '#3b4651' }));
    // F1
    const f1 = grp('dev2 f1' + (p.fusePulled ? ' pulled' : '') + seenC('F1'), { 'data-tag': 'F1', role: 'button', 'aria-label': `F1, control supply fuse${p.fusePulled ? ', pulled' : ''}` });
    f1.append(rect(F1.x, F1.y, F1.w, F1.h, { class: 'card2', rx: 4, fill: '#2f353b', stroke: '#15181a', filter: 'url(#b2Shadow)' }), rect(506, 276, 28, 68, { rx: 4, fill: '#41484f' }),
      ...(p.fusePulled ? [] : [rect(512, 286, 16, 48, { rx: 7, fill: '#e9e4d3', stroke: '#a49f88' }), rect(504, 300, 32, 10, { rx: 2, fill: '#f5f6f7' }), txt(520, 308, 'F1', { fs: 8, fw: 800 })]));
    f1.addEventListener('click', () => (p.tool === 'operate' ? hk.onFuse() : hk.onDevice('F1')));
    const f1rating = p.b.params.F1?.rating;
    inner.append(f1, txt(520, 230, `F1 · ${f1rating ?? '?'} A${p.fusePulled ? ' (pulled)' : ''}`, { fs: 8.5, fw: 700, fill: '#3b4651' }), illustrative(520, 196, 'middle', 'F1 rating: illustrative · pending review'));
    // CR1
    const cr = grp('dev2 cr1' + seenC('CR1'), { 'data-tag': 'CR1', role: 'button', 'aria-label': 'CR1, control relay, 2 NO plus 2 NC' });
    cr.append(rect(CR1.x, CR1.y, CR1.w, CR1.h, { class: 'card2', rx: 6, fill: '#3a4148', stroke: '#1d2226', filter: 'url(#b2Shadow)' }), rect(566, 244, 106, 24, { rx: 3, fill: '#4a525a' }), rect(566, 352, 106, 24, { rx: 3, fill: '#4a525a' }),
      rect(574, 278, 90, 64, { rx: 4, fill: '#5b646c' }), rect(582, 283, 74, 30, { rx: 3, fill: '#f5f6f7', stroke: '#aab2b9' }), txt(619, 296, 'CR1', { fs: 10, fw: 800 }), txt(619, 308, '120 V coil · 2NO+2NC', { fs: 5.6, fw: 600, fill: '#3b4651' }),
      rect(590, 318, 58, 18, { rx: 3, fill: w.coilOn['CR1.coil'] ? '#3aa35a' : '#7f8a94' }), rect(596, 322, 18, 10, { rx: 2, fill: '#c8d0d6' }), rect(624, 322, 18, 10, { rx: 2, fill: '#c8d0d6' }));
    ['C1', '1', '3', '5', '7'].forEach((pp, k) => cr.append(txt(578 + k * 20.5, 275, pp, { fs: 6.5, fw: 700, fill: '#d5dbe0' })));
    ['C2', '2', '4', '6', '8'].forEach((pp, k) => cr.append(txt(578 + k * 20.5, 350.5, pp, { fs: 6.5, fw: 700, fill: '#d5dbe0' })));
    cr.addEventListener('click', () => hk.onDevice('CR1'));
    inner.append(cr);
    // timers
    for (const tm of TIMERS) {
      const why = grey[tm.tag];
      const g = grp('dev2 timer' + (why ? ' grey' : ''), { 'data-tag': tm.tag, role: 'button', 'aria-label': `${tm.tag} timer${why ? ', taught ' + why : ''}`, ...(why ? { opacity: 0.4 } : {}) });
      const solid = tm.tag.startsWith('TD');
      g.append(rect(tm.x, tm.y, tm.w, tm.h, { class: 'card2', rx: 5, fill: solid ? '#e8ebee' : '#3a4148', stroke: solid ? '#8a939a' : '#1d2226' }));
      if (solid) g.append(circ(tm.x + tm.w / 2, tm.y + 44, 13, { fill: '#3a4148' }), rect(tm.x + 8, tm.y + 68, tm.w - 16, 14, { rx: 2, fill: '#bfcab0', stroke: '#7d8a6c' }));
      else g.append(circ(tm.x + tm.w / 2, tm.y + 46, 22, { fill: '#c9cfd4' }), path(`M${tm.x + tm.w / 2} ${tm.y + 46} l9 -12`, { stroke: '#1d2730', 'stroke-width': 2, 'stroke-linecap': 'round' }));
      g.append(txt(tm.x + tm.w / 2, tm.y + 100, tm.tag, { fs: 10, fw: 800, fill: solid ? INK : '#f0f2f4' }));
      g.addEventListener('click', () => (why ? hk.onUntaught(tm.tag, why) : hk.onDevice(tm.tag)));
      inner.append(g);
    }
    if (grey.TR1) inner.append(grp('chip', {}, rect(770, 388, 116, 20, { rx: 10, fill: '#fff', stroke: '#b5bcc2' }), txt(828, 402, 'Timers · taught Day 8', { fs: 8.5, fw: 700, fill: '#5b6670' })));

    // jumpers between devices and the strip (decorative, numbered)
    const j = grp('jumpers', { 'pointer-events': 'none' });
    j.append(wire('M394 366 L394 412', 'red'), wire('M446 366 L446 412', 'white'), marker(394, 392, 'X1'), marker(446, 392, '2'),
      wire('M520 251 L520 222', 'red'), marker(520, 244, 'X1'), wire('M520 369 L520 412', 'red'), marker(520, 392, '1'),
      wire('M578 251 L578 230', 'red'), wire('M598.5 251 L598.5 230', 'red'), wire('M619 251 L619 230', 'red'), wire('M639.5 251 L639.5 230', 'red'),
      wire('M578 369 L578 412', 'white'), wire('M598.5 369 L598.5 412', 'red'), wire('M619 369 L619 412', 'red'), wire('M639.5 369 L639.5 412', 'red'),
      marker(578, 392, '2'), marker(598.5, 392, '5'), marker(619, 392, '13'), marker(639.5, 392, '6'));
    inner.append(j);

    // terminal strip TB1
    const tb = grp('dev2 tb1' + seenC('TB1'), { 'data-tag': 'TB1', role: 'group', 'aria-label': 'TB1 terminal strip' });
    tb.append(rect(TB.x0 - 2, TB.top - 2, 21 * TB.bw + 4, TB.h + 4, { class: 'card2', rx: 3, fill: 'transparent' }));
    p.b.layout.tbNets.forEach((n, i) => {
      const { x, cx } = tbCol(i);
      const isF = n === '91' || n === '92', isG = n === 'G';
      const body = isF ? '#ee8a35' : isG ? '#3e9a4c' : '#a7b0b8';
      const col = isF ? 'orange' : isG ? 'green' : n === '2' ? 'white' : 'red';
      const colG = grp('tbcol' + (isF ? ' f2' : '') + (isF && p.found.includes('w' + n) ? ' seen' : ''), { 'data-net': n });
      colG.append(wire(`M${cx} 468 L${cx} 432`, col, 2.4), wire(`M${cx} 582 L${cx} 600`, col, 2.4),
        rect(x + 1.5, 462, TB.bw - 3, TB.h, { rx: 3, fill: body, stroke: '#5f6870', 'stroke-width': 0.8 }),
        ...(isG ? [rect(x + 1.5, 508, TB.bw - 3, 9, { fill: '#f1d21c' })] : []),
        rect(x + 4, 500, TB.bw - 8, 38, { rx: 2, fill: '#fbfbfa', stroke: '#b8c0c7', 'stroke-width': 0.6 }),
        txt(cx, n.length > 2 ? 523 : 524, n, { fs: n.length > 1 ? 9 : 10, fw: 800, fill: isF ? '#8a3c00' : INK }));
      tb.append(colG);
    });
    for (const t of terms.filter((x) => x.part === 'TB1')) tb.append(screw(t));
    tb.addEventListener('click', (e) => { if (!(e.target as Element).closest('.term2')) hk.onDevice('TB1'); });
    // the strip's own label is a big tap target for its nameplate (the screws crowd the strip itself on a phone)
    const tbl = grp('tblabel', { role: 'button', 'aria-label': 'TB1 terminal strip nameplate' }, rect(338, 448, 24, 154, { fill: 'transparent', class: 'hit' }), grp('', { transform: 'rotate(-90 352 525)' }, txt(352, 528, 'TB1 · TERMINAL STRIP', { fs: 8.5, fw: 800, fill: '#3b4651', ls: 0.6 })));
    tbl.addEventListener('click', () => hk.onDevice('TB1'));
    inner.append(tb, tbl,
      txt(660, 618, '↓ cable to the field devices (FS1, PS1, TS1, LS1, FLS1, SOL1)', { fs: 8, fill: '#3b4651' }));
    // EGC bar
    const egc = grp('egc2', { 'data-tag': 'EGC' });
    egc.append(rect(EGC.x, EGC.y, EGC.w, EGC.h, { rx: 4, fill: '#cbb98f', stroke: '#8a7a50' }));
    inner.append(egc, txt(366, 724, 'EGC bar · bonded to X2 at the source', { fs: 9, fw: 700, a: 'start', fill: '#3b4651' }),
      wire('M606 693 L 640 693 Q650 693 650 683 L650 662 Q650 654 658 654 L932 654 Q940 654 940 646 L940 600', 'green', 2.2));
    // device screws (everything except TB1, which sits in the strip group)
    for (const t of terms.filter((x) => x.part !== 'TB1')) {
      const why = grey[t.part];
      inner.append(why ? dimmed(screw(t), why, hk, t.part) : screw(t));
    }
  }
  svg.append(inner, door);
  if (!p.doorOpen) {
    ['Door closed.', 'Turn the handle OFF,', 'then use the latch', 'to open the door.'].forEach((l, i) => svg.append(txt(820, 380 + i * 18, l, { fs: i ? 12 : 14, fw: i ? 500 : 700, fill: '#3b4651' })));
  }

  // probes
  const lastKey = p.lastKey ?? {};
  if (p.doorOpen) {
    const probe = (node: string | null, col: string, ang: number) => {
      if (!node) return null;
      const t = termFor(terms, node, lastKey[node]);
      if (!t) return null;
      return grp('probe2', { transform: `translate(${t.x} ${t.y}) rotate(${ang})`, filter: 'url(#b2Shadow)', 'pointer-events': 'none' },
        path('M0 0 L2.2 -12 L-2.2 -12 Z', { fill: '#c8ced3', stroke: '#6f777e', 'stroke-width': 0.6 }), rect(-4, -46, 8, 34, { rx: 2, fill: col, stroke: '#00000055' }), rect(-6.5, -52, 13, 8, { rx: 2, fill: col, stroke: '#00000055' }), rect(-4.5, -86, 9, 34, { rx: 3, fill: col, stroke: '#00000055' }));
    };
    const pr = probe(p.red, '#c62828', 40), pb = probe(p.black, '#25292d', 140);
    if (pr) svg.append(pr); if (pb) svg.append(pb);
  }

  // next-terminal highlight
  if (p.target) {
    const spot = targetSpot(terms, p.target);
    const onDoor = ['handle', 'door', 'label'].includes(p.target) || /^dev:(PL|PB)/.test(p.target);
    if (spot && (p.doorOpen || onDoor)) {
      const g = grp('target2', { 'data-target': p.target, transform: !p.doorOpen && onDoor ? 'translate(342 0)' : '', 'pointer-events': 'none' });
      g.append(circ(spot.x, spot.y, spot.r + 4, { class: 'pulse', fill: 'none', stroke: '#1d5fbf', 'stroke-width': 2.5, opacity: 0.35 }), circ(spot.x, spot.y, spot.r, { class: 'pulse2', fill: 'none', stroke: '#1d5fbf', 'stroke-width': 2.5 }));
      svg.append(g);
    }
  }
  return svg;
}

/** Terminals on a greyed device: drawn dim and not probe-able; a tap explains why. */
function dimmed(g: SVGGElement, why: string, hk: B2Hooks, tag: string): SVGGElement {
  const c = g.cloneNode(true) as SVGGElement;
  c.classList.add('dim'); c.setAttribute('opacity', '0.4');
  c.addEventListener('click', () => hk.onUntaught(tag, why));
  return c;
}
