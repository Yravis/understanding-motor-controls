// Geometry of the Physical bucket view: a front elevation of a generic MCC bucket with the
// door swung open to the left. Shared by the SVG renderer, the photo overlay, and the
// reference-layout export so a photo-real image can be aligned to the same viewBox.
import type { Bucket, DeviceView, PinView } from '../model/bucket';
import { warningBannerLayout, WARN_TEXT, wrapLines } from './svgtext';

/** 4:3 landscape; 10–14uu labels read at about 9–12px in the desktop bucket pane. */
export const PHYS = {
  VIEW_W: 1000,
  VIEW_H: 750,
  HIT: 40,
  PIN_R: 7,
  LABEL_FONT: 14,
  LEGEND_FONT: 12,
  PIN_FONT: 10,
  TINY_FONT: 11,
  TITLE_FONT: 12, // kept for legend wrap checks
  TITLE_MAX_W: 96,
} as const;


export type Zone = 'door' | 'din' | 'field' | 'power';

export interface Box { x: number; y: number; w: number; h: number }
export interface PctBox { x: number; y: number; w: number; h: number }
export interface LaidPin extends PinView { x: number; y: number }
export interface LaidDevice {
  tag: string; kind: string; title: string; designation: string; symbol: string;
  foreign: boolean; zone: Zone; legend: string[]; titleLines: string[];
  pins: LaidPin[];
  box: Box; boxPct: PctBox; centerPct: { x: number; y: number };
  /** Operator / body center, used to draw the 22 mm head or the DIN device body. */
  cx: number; cy: number;
}
export interface LaidTerminal { net: string; id: string; foreign: boolean; box: Box; boxPct: PctBox; centerPct: { x: number; y: number }; x: number; y: number }
export interface LaidCh2 { tag: string; title: string; box: Box; boxPct: PctBox; centerPct: { x: number; y: number } }
export interface PhysicalLayout {
  viewBox: { w: number; h: number };
  aspect: { w: number; h: number; ratio: number };
  doorOpen: boolean;
  nameplate: { text: string; box: Box };
  warning: { text: string; lines: string[]; box: Box; boxPct: PctBox };
  door: Box;
  hinge: Box;
  enclosure: Box;
  backplate: Box;
  cpt: { box: Box; terminals: LaidTerminal[] };
  f1: { box: Box; terminals: LaidTerminal[] };
  dinRails: Box[];
  devices: LaidDevice[];
  terminalStrip: { label: string; box: Box; terminals: LaidTerminal[] };
  ch2Preview: { label: string; box: Box; items: LaidCh2[] };
  fieldInset: { label: string; box: Box };
  harness: { bundle: { x: number; y: number }[]; orange: { x: number; y: number }[]; orangeB: { x: number; y: number }[] };
}

const pct = (n: number, total: number) => Math.round((10000 * n) / total) / 100;
const boxPct = (b: Box, W: number, H: number): PctBox => ({ x: pct(b.x, W), y: pct(b.y, H), w: pct(b.w, W), h: pct(b.h, H) });
const centerPct = (b: Box, W: number, H: number) => ({ x: pct(b.x + b.w / 2, W), y: pct(b.y + b.h / 2, H) });

export const LEGENDS: Record<string, string[]> = {
  PB3: ['PB3', 'E-STOP'],
  PB1: ['PB1', 'START'],
  PB2: ['PB2', 'STOP'],
  PL1: ['PL1', 'CR1 UP'],
  PL2: ['PL2', 'CR1 OUT'],
  PL3: ['PL3', 'CLOSED'],
  PL4: ['PL4', 'TANK HIGH'],
  PL5: ['PL5', 'AIR OK'],
  PL6: ['PL6', 'HIGH TEMP'],
  PL7: ['PL7', 'FLOW'],
  PL8: ['PL8', 'TR1 TIMED'],
  PL9: ['PL9', 'TR2 TIMED'],
  PL10: ['PL10', 'TD3 TIMED'],
  PL11: ['PL11', 'TD4 TIMED'],
  PLF: ['PLF', 'INTERLOCK'],
  CR1: ['CR1', 'CONTROL RELAY'],
  TR1: ['TR1', 'PNEU. ON-DLY'],
  TR2: ['TR2', 'PNEU. OFF-DLY'],
  TD3: ['TD3', 'SS ON-DELAY'],
  TD4: ['TD4', 'SS OFF-DELAY'],
  FS1: ['FS1', 'FLOAT SW'],
  PS1: ['PS1', 'PRESSURE SW'],
  TS1: ['TS1', 'TEMP SW'],
  LS1: ['LS1', 'LIMIT SW'],
  FLS1: ['FLS1', 'FLOW SW'],
  SOL1: ['SOL1', 'SOLENOID'],
};

const DOOR_LIGHTS = [
  ['PL1', 'PL2', 'PL3'],
  ['PL4', 'PL5', 'PL6'],
  ['PL7', 'PL8', 'PL9'],
  ['PL10', 'PL11', 'PLF'],
] as const;

export function deviceTitleLines(title: string, maxW: number = PHYS.TITLE_MAX_W, font: number = PHYS.TITLE_FONT): string[] {
  return wrapLines(title, maxW, font);
}

const byTag = (devs: DeviceView[]) => {
  const m = new Map<string, DeviceView>();
  for (const d of devs) m.set(d.tag, d);
  return m;
};

const term = (net: string, id: string, x: number, y: number, W: number, H: number, tw = 36, th = 36): LaidTerminal => {
  const box: Box = { x: x - tw / 2, y: y - th / 2, w: tw, h: th };
  return { net, id, foreign: net === '91' || net === '92', box, boxPct: boxPct(box, W, H), centerPct: centerPct(box, W, H), x, y };
};

const laidDev = (
  d: DeviceView, zone: Zone, box: Box, cx: number, cy: number, pins: LaidPin[], W: number, H: number, legendW: number = PHYS.TITLE_MAX_W,
): LaidDevice => {
  const legend = LEGENDS[d.tag] ?? [d.designation];
  return {
    tag: d.tag, kind: d.kind, title: d.title, designation: d.designation, symbol: d.symbol,
    foreign: !!d.foreign, zone, legend, titleLines: deviceTitleLines(d.title, Math.max(legendW, 80), PHYS.TITLE_FONT),
    pins, box, boxPct: boxPct(box, W, H), centerPct: centerPct(box, W, H), cx, cy,
  };
};

const pairPins = (d: DeviceView, cx: number, cy: number, dx = 26): LaidPin[] =>
  d.pins.map((p, i) => ({ ...p, x: cx + (i === 0 ? -dx : i === 1 ? dx : (i - (d.pins.length - 1) / 2) * dx), y: cy }));

export function physicalLayout(b: Bucket, doorOpen = true): PhysicalLayout {
  const W = PHYS.VIEW_W, H = PHYS.VIEW_H;
  const devs = byTag(b.layout.devices);
  const warn = warningBannerLayout();

  const door: Box = { x: 16, y: 40, w: 324, h: 560 };
  const hinge: Box = { x: 340, y: 90, w: 48, h: 460 };
  const enclosure: Box = { x: 388, y: 40, w: 596, h: 560 };
  const backplate: Box = { x: 400, y: 100, w: 572, h: 492 };
  const nameplate: Box = { x: 16, y: 8, w: 260, h: 26 };
  const warnBox: Box = { x: 400, y: 48, w: 572, h: warn.height };
  // Everything mounted on the backplate shares one content column with an 8-unit margin.
  const cx0 = 408, cw = 556, gut = 12;
  const ch2Box: Box = { x: cx0, y: 108, w: cw, h: 68 };
  const cptBox: Box = { x: cx0, y: 188, w: 262, h: 74 };
  const f1Box: Box = { x: cx0 + 262 + gut, y: 188, w: 150, h: 74 };
  const din1: Box = { x: 400, y: 274, w: 572, h: 112 };
  const din2: Box = { x: 400, y: 398, w: 572, h: 84 };
  const tbBox: Box = { x: cx0, y: 494, w: cw, h: 84 };
  const fieldBox: Box = { x: 16, y: 612, w: 968, h: 126 };

  const devices: LaidDevice[] = [];

  // ---- Door: 22 mm operators, 3 columns of 86x84 cells with 10-12 unit gutters ----
  const cellW = 86, cellH = 84, gx = 12, gy = 10;
  const dPadX = (door.w - (3 * cellW + 2 * gx)) / 2, dPadY = 30;
  const doorCell = (tag: string, ri: number, ci: number) => {
    const d = devs.get(tag)!;
    const box: Box = { x: door.x + dPadX + ci * (cellW + gx), y: door.y + dPadY + ri * (cellH + gy), w: cellW, h: cellH };
    const cx = box.x + box.w / 2, cy = box.y + (d.kind === 'pb-mushroom' ? 47 : 46);
    devices.push(laidDev(d, 'door', box, cx, cy, pairPins(d, cx, box.y + 70, 13), W, H, box.w - 8));
  };
  DOOR_LIGHTS.forEach((row, ri) => row.forEach((tag, ci) => doorCell(tag, ri, ci)));
  ['PB1', 'PB2', 'PB3'].forEach((tag, ci) => doorCell(tag, 4, ci));

  // ---- DIN rails: cards sit on the rail with 12-unit gutters; legend left, device graphic right ----
  const dinRow = (rail: Box, tags: string[], pinLayout: (d: DeviceView, box: Box) => LaidPin[]) => {
    const w = (cw - gut * (tags.length - 1)) / tags.length;
    tags.forEach((tag, i) => {
      const d = devs.get(tag)!;
      const box: Box = { x: cx0 + i * (w + gut), y: rail.y + 4, w, h: rail.h - 8 };
      const cx = box.x + box.w - 8 - (tag.startsWith('TD') ? 50 : 28), cy = box.y + 20;
      devices.push(laidDev(d, 'din', box, cx, cy, pinLayout(d, box), W, H, box.w - 8));
    });
  };
  const find = (d: DeviceView, label: string) => d.pins.find((p) => p.label === label || p.id === `${d.tag}:${label}`)!;
  dinRow(din1, ['CR1', 'TR1', 'TR2'], (d, box) => {
    const pins: LaidPin[] = [];
    if (d.tag === 'CR1') {
      // Ice-cube socket: C1 C2 on the left, then contact pairs 1/2, 3/4, 5/6.
      const cols = [['C1', 'C2'], ['1', '2'], ['3', '4'], ['5', '6']];
      const x0 = box.x + 28, dx = (box.w - 56) / 3, y1 = box.y + 61, y2 = box.y + 82;
      cols.forEach((col, c) => col.forEach((label, r) => pins.push({ ...find(d, label), x: x0 + c * dx, y: r === 0 ? y1 : y2 })));
      return pins;
    }
    // TR1 / TR2: A1/A2 then timed contact 1/2, two rows.
    const x1 = box.x + box.w * 0.32, x2 = box.x + box.w * 0.68;
    for (const [labels, y] of [[['A1', 'A2'], box.y + 61], [['1', '2'], box.y + 82]] as const) {
      labels.forEach((label, i) => pins.push({ ...find(d, label), x: i === 0 ? x1 : x2, y }));
    }
    return pins;
  });
  dinRow(din2, ['TD3', 'TD4'], (d, box) => {
    const labels = d.tag === 'TD4' ? ['A1', 'A2', 'T', '1', '2'] : ['A1', 'A2', '1', '2'];
    const y = box.y + 56, x0 = box.x + 28, dx = (box.w - 56) / (labels.length - 1);
    return labels.map((label, i) => ({
      ...(d.pins.find((p) => p.label.startsWith(label) || p.id === `${d.tag}:${label}`)!), x: x0 + i * dx, y,
    }));
  });

  // ---- Field-device inset (these are not mounted in the bucket) ----
  const fieldTags = ['FS1', 'PS1', 'TS1', 'LS1', 'FLS1', 'SOL1'];
  const fgut = 12, fpad = 10;
  const fw = (fieldBox.w - 2 * fpad - fgut * (fieldTags.length - 1)) / fieldTags.length;
  fieldTags.forEach((tag, i) => {
    const d = devs.get(tag)!;
    const box: Box = { x: fieldBox.x + fpad + i * (fw + fgut), y: fieldBox.y + 28, w: fw, h: 90 };
    const cx = box.x + box.w / 2, cy = box.y + 40;
    devices.push(laidDev(d, 'field', box, cx, cy, pairPins(d, cx, box.y + 60, 28), W, H, box.w - 8));
  });

  // ---- Terminal strip: label row on top, two terminal rows below ----
  const tbNets = b.layout.tbNets;
  const terminals: LaidTerminal[] = [];
  const step = tbBox.w / 11;
  const placeRow = (nets: string[], y: number) => nets.forEach((n, i) => {
    const id = n === 'X1' || n === 'X2' || n === 'G' ? n : 'w' + n;
    terminals.push(term(n, id, tbBox.x + step * (i + 0.5), y, W, H, step - 8, 26));
  });
  placeRow(tbNets.slice(0, 11), tbBox.y + 36);
  placeRow(tbNets.slice(11), tbBox.y + 64);

  // ---- CPT X1/X2 and F1 (line X1, load wire 1) ----
  const cptTerms = [
    term('X1', 'X1', cptBox.x + 50, cptBox.y + 54, W, H, 36, 24),
    term('X2', 'X2', cptBox.x + cptBox.w - 50, cptBox.y + 54, W, H, 36, 24),
  ];
  const f1Terms = [
    term('X1', 'X1', f1Box.x + 38, f1Box.y + 54, W, H, 36, 24),
    term('1', 'w1', f1Box.x + f1Box.w - 38, f1Box.y + 54, W, H, 36, 24),
  ];

  const ch2Items: LaidCh2[] = b.layout.ch2Preview.map((c, i) => {
    const n = b.layout.ch2Preview.length, g = 8;
    const w = (ch2Box.w - 16 - g * (n - 1)) / n;
    const box: Box = { x: ch2Box.x + 8 + i * (w + g), y: ch2Box.y + 20, w, h: 44 };
    return { tag: c.tag, title: c.title, box, boxPct: boxPct(box, W, H), centerPct: centerPct(box, W, H) };
  });

  // Door harness: a loop through the hinge gap, then down the left channel to the strip.
  // Wires approach the strip from its left edge (bundle) or from below (orange 91/92),
  // so none crosses the TERMINAL STRIP label at the top of the strip.
  const mid = tbBox.y + 46;
  const bundle = [
    { x: door.x + door.w - 2, y: 240 },
    { x: hinge.x + 8, y: 230 },
    { x: hinge.x + 38, y: 210 },
    { x: hinge.x + 38, y: 430 },
    { x: hinge.x + 10, y: 500 },
    { x: enclosure.x + 6, y: mid },
    { x: tbBox.x - 2, y: mid },
  ];
  const plf = devices.find((d) => d.tag === 'PLF')!;
  const t91 = terminals.find((t) => t.net === '91')!;
  const t92 = terminals.find((t) => t.net === '92')!;
  const [p91, p92] = [plf.pins[0], plf.pins[1]];
  const yA = tbBox.y + tbBox.h + 9, yB = yA + 4;
  const orange = [
    { x: p91.x, y: p91.y },
    { x: p91.x, y: p91.y + 12 },
    { x: door.x + door.w - 2, y: p91.y + 12 },
    { x: hinge.x + 12, y: p91.y + 16 },
    { x: hinge.x + 12, y: 540 },
    { x: enclosure.x + 8, y: yB },
    { x: t91.x, y: yB },
    { x: t91.x, y: t91.y + 13 },
  ];
  const orangeB = [
    { x: p92.x, y: p92.y },
    { x: p92.x, y: p92.y + 9 },
    { x: door.x + door.w - 2, y: p92.y + 9 },
    { x: hinge.x + 18, y: p92.y + 12 },
    { x: hinge.x + 18, y: 536 },
    { x: enclosure.x + 8, y: yA },
    { x: t92.x, y: yA },
    { x: t92.x, y: t92.y + 13 },
  ];

  return {
    viewBox: { w: W, h: H },
    aspect: { w: W, h: H, ratio: W / H },
    doorOpen,
    nameplate: { text: 'BUCKET 1A  ·  CONTROL SECTION', box: nameplate },
    warning: { text: WARN_TEXT, lines: warn.lines, box: warnBox, boxPct: boxPct(warnBox, W, H) },
    door, hinge, enclosure, backplate,
    cpt: { box: cptBox, terminals: cptTerms },
    f1: { box: f1Box, terminals: f1Terms },
    dinRails: [din1, din2],
    devices,
    terminalStrip: { label: 'TERMINAL STRIP (wire numbers)', box: tbBox, terminals },
    ch2Preview: { label: 'CHAPTER 2 — POWER SECTION (inspect only)', box: ch2Box, items: ch2Items },
    fieldInset: { label: 'FIELD DEVICES (wired to this bucket, not mounted inside)', box: fieldBox },
    harness: { bundle, orange, orangeB },
  };
}

export const PHOTO_FILE = 'img/bucket-1a-photo.jpg';
