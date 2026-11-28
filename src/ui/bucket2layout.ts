// Geometry of the redrawn bucket (viewBox 1000 x 800): door swung open on the left, backplate on the right.
// Pure data (no DOM) so the renderer, the next-terminal highlight, the Go-to control, the tests and the
// overflow check all read the same coordinates.
import type { Bucket } from '../model/bucket';

export const B2 = { W: 1000, H: 800 } as const;
export interface Rect { x: number; y: number; w: number; h: number }
/** One clickable screw terminal. `node` is the model node the meter probes; several screws can share a node (X1, G, TB top/bottom). */
export interface Term { key: string; node: string; x: number; y: number; r: number; label: string; part: string; foreign?: boolean; dim?: boolean }

export const DOOR: Rect = { x: 18, y: 18, w: 284, h: 764 };
export const INTERIOR: Rect = { x: 322, y: 18, w: 664, h: 764 };
export const HANDLE = { x: 104, y: 162, box: { x: 46, y: 92, w: 118, h: 146 } as Rect };
export const LATCH: Rect = { x: 56, y: 250, w: 110, h: 46 };
export const CAUTION: Rect = { x: 44, y: 722, w: 232, h: 40 };
export const POWER: Rect = { x: 348, y: 44, w: 612, h: 150 };

export const PILOTS: { tag: string; legend: string; color: string }[] = [
  { tag: 'PL1', legend: 'CR1 PICKED UP', color: '#3aa35a' }, { tag: 'PL2', legend: 'CR1 DROPPED OUT', color: '#d84040' }, { tag: 'PL3', legend: 'PB2 CLOSED', color: '#e9a321' },
  { tag: 'PL4', legend: 'TANK HIGH', color: '#f2f2f2' }, { tag: 'PL5', legend: 'AIR PRESSURE OK', color: '#3aa35a' }, { tag: 'PL6', legend: 'HIGH TEMP', color: '#d84040' },
  { tag: 'PL7', legend: 'FLOW', color: '#4a8ad8' }, { tag: 'PLF', legend: 'REMOTE INTERLOCK', color: '#ef8a2c' }, { tag: 'PL8', legend: 'TR1 TIMED', color: '#e9a321' },
  { tag: 'PL9', legend: 'TR2 TIMED', color: '#e9a321' }, { tag: 'PL10', legend: 'TD3 TIMED', color: '#e9a321' }, { tag: 'PL11', legend: 'TD4 TIMED', color: '#e9a321' },
];
export const pilotPos = (i: number) => ({ x: 72 + (i % 3) * 88, y: 344 + Math.floor(i / 3) * 72 });
export const PUSHBUTTONS: { tag: string; legend: string; sub: string; color: string; mush?: boolean; x: number; y: number }[] = [
  { tag: 'PB1', legend: 'START', sub: 'NO, momentary', color: '#2e8b3e', x: 72, y: 664 },
  { tag: 'PB2', legend: 'STOP', sub: 'NC, momentary', color: '#c62828', x: 160, y: 664 },
  { tag: 'PB3', legend: 'STOP', sub: 'NC, maintained', color: '#c62828', mush: true, x: 248, y: 664 },
];

export const CPT: Rect = { x: 356, y: 236, w: 128, h: 150 };
export const F1: Rect = { x: 500, y: 244, w: 40, h: 132 };
export const CR1: Rect = { x: 560, y: 236, w: 118, h: 150 };
export interface TimerBox extends Rect { tag: string; pins: { label: string; top: boolean; dx: number }[] }
export const TIMERS: TimerBox[] = [
  { tag: 'TR1', x: 696, y: 240, w: 62, h: 142, pins: [{ label: 'A1', top: true, dx: 16 }, { label: '1', top: true, dx: 46 }, { label: 'A2', top: false, dx: 16 }, { label: '2', top: false, dx: 46 }] },
  { tag: 'TR2', x: 768, y: 240, w: 62, h: 142, pins: [{ label: 'A1', top: true, dx: 16 }, { label: '1', top: true, dx: 46 }, { label: 'A2', top: false, dx: 16 }, { label: '2', top: false, dx: 46 }] },
  { tag: 'TD3', x: 842, y: 246, w: 50, h: 130, pins: [{ label: 'A1', top: true, dx: 13 }, { label: '1', top: true, dx: 37 }, { label: 'A2', top: false, dx: 13 }, { label: '2', top: false, dx: 37 }] },
  { tag: 'TD4', x: 900, y: 246, w: 50, h: 130, pins: [{ label: 'A1', top: true, dx: 9 }, { label: 'T', top: true, dx: 25 }, { label: '1', top: true, dx: 41 }, { label: 'A2', top: false, dx: 13 }, { label: '2', top: false, dx: 37 }] },
];
export const CH2: { tag: string; title: string; box: Rect }[] = [
  { tag: 'DISC', title: 'Disconnect', box: { x: 372, y: 62, w: 92, h: 116 } },
  { tag: 'PF', title: 'Power fuses', box: { x: 486, y: 70, w: 92, h: 100 } },
  { tag: 'M', title: 'Contactor / starter', box: { x: 598, y: 66, w: 110, h: 108 } },
  { tag: 'OL', title: 'Overload relay', box: { x: 722, y: 96, w: 96, h: 78 } },
  { tag: 'MTR', title: 'Motor', box: { x: 832, y: 84, w: 110, h: 90 } },
];
export const TB = { x0: 366, bw: 28, top: 462, h: 126, yTop: 478, yBot: 572 };
/** Number of TB1 blocks (equals buildBucket().layout.tbNets.length; asserted in tests). */
export const TB_COUNT = 22;
export const EGC: Rect = { x: 366, y: 680, w: 232, h: 26 };

export const nodeOfNet = (n: string): string => (n === 'X1' || n === 'X2' || n === 'G' ? n : 'w' + n);
export const tbCol = (i: number) => ({ x: TB.x0 + i * TB.bw, cx: TB.x0 + i * TB.bw + TB.bw / 2 });

/** Every screw terminal in the bucket. Door-mounted devices have no reachable terminals. */
export function bucket2Terms(b: Bucket): Term[] {
  const t: Term[] = [];
  b.layout.tbNets.forEach((n, i) => {
    const { cx } = tbCol(i);
    const node = nodeOfNet(n);
    const foreign = n === '91' || n === '92';
    t.push({ key: `TB_${n}`, node, x: cx, y: TB.yTop, r: 7, label: n, part: 'TB1', foreign });
    t.push({ key: `TB_${n}_b`, node, x: cx, y: TB.yBot, r: 7, label: n, part: 'TB1', foreign });
  });
  ['H1', 'H3', 'H2', 'H4'].forEach((h, k) => t.push({ key: 'CPT_' + h, node: '', x: 378 + k * 28, y: 255, r: 5.5, label: h, part: 'CPT', dim: true }));
  t.push({ key: 'CPT_X1', node: 'X1', x: 394, y: 361, r: 6, label: 'X1', part: 'CPT' }, { key: 'CPT_X2', node: 'X2', x: 446, y: 361, r: 6, label: 'X2', part: 'CPT' });
  t.push({ key: 'F1_T', node: 'X1', x: 520, y: 256, r: 6, label: 'X1', part: 'F1' }, { key: 'F1_B', node: 'w1', x: 520, y: 364, r: 6, label: '1', part: 'F1' });
  ['C1', '1', '3', '5', '7'].forEach((p, k) => t.push({ key: 'CR1_' + p, node: `CR1:${p}`, x: 578 + k * 20.5, y: 256, r: 5.5, label: p, part: 'CR1' }));
  ['C2', '2', '4', '6', '8'].forEach((p, k) => t.push({ key: 'CR1_' + p, node: `CR1:${p}`, x: 578 + k * 20.5, y: 364, r: 5.5, label: p, part: 'CR1' }));
  for (const tm of TIMERS) for (const p of tm.pins) t.push({ key: `${tm.tag}_${p.label}`, node: `${tm.tag}:${p.label}`, x: tm.x + p.dx, y: p.top ? tm.y + 14 : tm.y + tm.h - 14, r: 5, label: p.label, part: tm.tag });
  for (let k = 0; k < 7; k++) t.push({ key: 'EGC_' + k, node: 'G', x: 384 + k * 32, y: 693, r: 6.5, label: 'G', part: 'EGC' });
  return t;
}

/** Preferred screw for a node (used for the pulse and the probe glyph): the TB1 top screw if there is one. */
export function termFor(terms: Term[], node: string, prefer?: string): Term | undefined {
  return terms.find((t) => t.key === prefer) ?? terms.find((t) => t.node === node && t.key.startsWith('TB_') && !t.key.endsWith('_b')) ?? terms.find((t) => t.node === node);
}

export interface GoTo { id: string; label: string; rect: Rect }
export const GOTOS: GoTo[] = [
  { id: 'whole', label: 'Whole bucket', rect: { x: 0, y: 0, w: B2.W, h: B2.H } },
  { id: 'door', label: 'Door (front)', rect: { x: 10, y: 10, w: 310, h: 780 } },
  { id: 'handle', label: 'Handle and lock', rect: { x: 30, y: 80, w: 260, h: 240 } },
  { id: 'label', label: 'Caution label', rect: { x: 20, y: 640, w: 290, h: 150 } },
  { id: 'lights', label: 'Pilot lights', rect: { x: 30, y: 310, w: 270, h: 320 } },
  { id: 'cpt', label: 'CPT, control power', rect: { x: 340, y: 210, w: 160, h: 190 } },
  { id: 'f1', label: 'F1, control fuse', rect: { x: 470, y: 215, w: 100, h: 190 } },
  { id: 'cr1', label: 'CR1, control relay', rect: { x: 540, y: 215, w: 160, h: 190 } },
  { id: 'timers', label: 'Timers TR1-TD4 (Day 8)', rect: { x: 680, y: 215, w: 290, h: 190 } },
  { id: 'tb1', label: 'TB1, terminal strip', rect: { x: 340, y: 420, w: 650, h: 200 } },
  { id: 'tb91', label: 'Wires 91/92 on TB1', rect: { x: 790, y: 430, w: 190, h: 170 } },
  { id: 'tbx', label: 'X1 / X2 on TB1', rect: { x: 350, y: 430, w: 90, h: 170 } },
  { id: 'egc', label: 'EGC bar', rect: { x: 350, y: 640, w: 280, h: 110 } },
  { id: 'power', label: 'Power section (Chapter 2)', rect: { x: 340, y: 30, w: 640, h: 180 } },
];

/** Where a step target ('term:X1', 'dev:CR1', 'handle', 'door', 'label') sits in the viewBox. */
export function targetSpot(terms: Term[], target: string): { x: number; y: number; r: number; label: string } | null {
  if (target === 'handle') return { x: HANDLE.x, y: HANDLE.y, r: 48, label: 'Handle' };
  if (target === 'door') return { x: LATCH.x + LATCH.w / 2, y: LATCH.y + LATCH.h / 2, r: 26, label: 'Door latch' };
  if (target === 'label') return { x: CAUTION.x + CAUTION.w / 2, y: CAUTION.y + CAUTION.h / 2, r: 60, label: 'Caution label' };
  if (target.startsWith('term:')) { const [node, key] = target.slice(5).split('@'); const t = termFor(terms, node, key); return t ? { x: t.x, y: t.y, r: 14, label: 'Terminal ' + t.label } : null; }
  if (target.startsWith('dev:')) {
    const tag = target.slice(4);
    const r = devRect(tag);
    return r ? { x: r.x + r.w / 2, y: r.y + r.h / 2, r: Math.max(24, Math.min(60, Math.max(r.w, r.h) / 2)), label: tag } : null;
  }
  return null;
}
export function devRect(tag: string): Rect | null {
  if (tag === 'CPT') return CPT; if (tag === 'F1') return F1; if (tag === 'CR1') return CR1;
  if (tag === 'TB1') return { x: TB.x0, y: TB.top, w: TB_COUNT * TB.bw, h: TB.h };
  const i = PILOTS.findIndex((p) => p.tag === tag);
  if (i >= 0) { const p = pilotPos(i); return { x: p.x - 42, y: p.y - 20, w: 84, h: 70 }; }
  const pb = PUSHBUTTONS.find((p) => p.tag === tag);
  if (pb) return { x: pb.x - 42, y: pb.y - 28, w: 84, h: 92 };
  return TIMERS.find((x) => x.tag === tag) ?? CH2.find((c) => c.tag === tag)?.box ?? null;
}
