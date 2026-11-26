// Geometry of the Physical bucket view: a front elevation of a generic MCC bucket with the
// door swung open to the left. Shared by the SVG renderer, the photo overlay, and the
// reference-layout export so a photo-real image can be aligned to the same viewBox.
import type { Bucket, DeviceView, PinView } from '../model/bucket';
import { warningBannerLayout, WARN_TEXT, wrapLines } from './svgtext';

/** 4:3 landscape, sized so compact 16–18uu labels read at about 13–14px in the desktop bucket pane. */
export const PHYS = {
  VIEW_W: 1000,
  VIEW_H: 750,
  HIT: 44,
  PIN_R: 7,
  LABEL_FONT: 16,
  LEGEND_FONT: 13,
  PIN_FONT: 14,
  TINY_FONT: 12,
  TITLE_FONT: 13, // kept for legend wrap checks
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

  const door: Box = { x: 16, y: 40, w: 324, h: 524 };
  const hinge: Box = { x: 340, y: 90, w: 48, h: 420 };
  const enclosure: Box = { x: 388, y: 40, w: 596, h: 524 };
  const backplate: Box = { x: 400, y: 88, w: 572, h: 464 };
  const nameplate: Box = { x: 16, y: 8, w: 260, h: 26 };
  const warnBox: Box = { x: 400, y: 48, w: 572, h: warn.height };
  const ch2Box: Box = { x: 400, y: 100, w: 572, h: 80 };
  const cptBox: Box = { x: 400, y: 188, w: 196, h: 80 };
  const f1Box: Box = { x: 604, y: 188, w: 160, h: 80 };
  const din1: Box = { x: 400, y: 276, w: 572, h: 98 };
  const din2: Box = { x: 400, y: 382, w: 572, h: 90 };
  const tbBox: Box = { x: 400, y: 480, w: 572, h: 74 };
  const fieldBox: Box = { x: 16, y: 576, w: 968, h: 162 };

  const devices: LaidDevice[] = [];

  // ---- Door: 22 mm operators, 3 columns of lights, then START/STOP and the mushroom ----
  const dPadX = 10, dPadY = 28;
  const cellW = (door.w - dPadX * 2) / 3;
  const cellH = 80;
  DOOR_LIGHTS.forEach((row, ri) => {
    row.forEach((tag, ci) => {
      const d = devs.get(tag)!;
      const box: Box = { x: door.x + dPadX + ci * cellW, y: door.y + dPadY + ri * cellH, w: cellW - 4, h: cellH - 6 };
      const cx = box.x + box.w / 2, cy = box.y + 40;
      const pins = pairPins(d, cx, box.y + box.h - 16, 24);
      devices.push(laidDev(d, 'door', box, cx, cy, pins, W, H, box.w - 8));
    });
  });
  {
    const d = devs.get('PB1')!;
    const box: Box = { x: door.x + 16, y: door.y + dPadY + 4 * cellH, w: 140, h: 78 };
    const cx = box.x + box.w / 2, cy = box.y + 40;
    devices.push(laidDev(d, 'door', box, cx, cy, pairPins(d, cx, box.y + box.h - 12, 24), W, H, box.w - 8));
  }
  {
    const d = devs.get('PB2')!;
    const box: Box = { x: door.x + 168, y: door.y + dPadY + 4 * cellH, w: 140, h: 78 };
    const cx = box.x + box.w / 2, cy = box.y + 40;
    devices.push(laidDev(d, 'door', box, cx, cy, pairPins(d, cx, box.y + box.h - 12, 24), W, H, box.w - 8));
  }
  {
    const d = devs.get('PB3')!;
    const box: Box = { x: door.x + 86, y: door.y + dPadY + 4 * cellH + 82, w: 152, h: 92 };
    const cx = box.x + box.w / 2, cy = box.y + 44;
    devices.push(laidDev(d, 'door', box, cx, cy, pairPins(d, cx, box.y + box.h - 12, 26), W, H, box.w - 8));
  }

  // ---- DIN rail row 1: CR1, TR1, TR2 ----
  const dinRow = (rail: Box, tags: string[], pinLayout: (d: DeviceView, box: Box) => { cx: number; cy: number; pins: LaidPin[] }) => {
    const w = rail.w / tags.length;
    tags.forEach((tag, i) => {
      const d = devs.get(tag)!;
      const box: Box = { x: rail.x + i * w + 6, y: rail.y + 6, w: w - 12, h: rail.h - 10 };
      const { cx, cy, pins } = pinLayout(d, box);
      devices.push(laidDev(d, 'din', box, cx, cy, pins, W, H, box.w - 8));
    });
  };
  dinRow(din1, ['CR1', 'TR1', 'TR2'], (d, box) => {
    const cx = box.x + box.w / 2, cy = box.y + 28;
    if (d.tag === 'CR1') {
      // Ice-cube socket: C1 C2 on the left, then contact pairs 1/2, 3/4, 5/6.
      const cols = [
        ['C1', 'C2'],
        ['1', '2'],
        ['3', '4'],
        ['5', '6'],
      ];
      const pins: LaidPin[] = [];
      const x0 = box.x + 28, dx = (box.w - 48) / 3, y1 = box.y + 54, y2 = box.y + 82;
      for (let c = 0; c < cols.length; c++) {
        for (let r = 0; r < 2; r++) {
          const label = cols[c][r];
          const src = d.pins.find((p) => p.label === label || p.id === `${d.tag}:${label}`)!;
          pins.push({ ...src, x: x0 + c * dx, y: r === 0 ? y1 : y2 });
        }
      }
      return { cx, cy, pins };
    }
    // TR1 / TR2: A1/A2 then timed contact 1/2, two rows.
    const top = ['A1', 'A2'], bot = ['1', '2'];
    const pins: LaidPin[] = [];
    const x1 = box.x + box.w * 0.32, x2 = box.x + box.w * 0.68, y1 = box.y + 58, y2 = box.y + 84;
    for (const [labels, y] of [[top, y1], [bot, y2]] as const) {
      labels.forEach((label, i) => {
        const src = d.pins.find((p) => p.label === label || p.id === `${d.tag}:${label}`)!;
        pins.push({ ...src, x: i === 0 ? x1 : x2, y });
      });
    }
    return { cx, cy: box.y + 24, pins };
  });

  // ---- DIN rail row 2: TD3, TD4 ----
  dinRow(din2, ['TD3', 'TD4'], (d, box) => {
    const cx = box.x + box.w / 2, cy = box.y + 26;
    const labels = d.tag === 'TD4' ? ['A1', 'A2', 'T', '1', '2'] : ['A1', 'A2', '1', '2'];
    const y = box.y + box.h - 18;
    const x0 = box.x + 28;
    const dx = (box.w - 56) / (labels.length - 1);
    const pins: LaidPin[] = labels.map((label, i) => {
      const src = d.pins.find((p) => p.label.startsWith(label) || p.id === `${d.tag}:${label}`)!;
      return { ...src, x: x0 + i * dx, y };
    });
    return { cx, cy, pins };
  });

  // ---- Field-device inset (these are not mounted in the bucket) ----
  const fieldTags = ['FS1', 'PS1', 'TS1', 'LS1', 'FLS1', 'SOL1'];
  const fw = fieldBox.w / fieldTags.length;
  fieldTags.forEach((tag, i) => {
    const d = devs.get(tag)!;
    const box: Box = { x: fieldBox.x + i * fw + 8, y: fieldBox.y + 36, w: fw - 16, h: fieldBox.h - 48 };
    const cx = box.x + box.w / 2, cy = box.y + 28;
    devices.push(laidDev(d, 'field', box, cx, cy, pairPins(d, cx, box.y + box.h - 22, 28), W, H, box.w - 8));
  });

  // ---- Terminal strip ----
  const tbNets = b.layout.tbNets;
  const row1 = tbNets.slice(0, 11);
  const row2 = tbNets.slice(11);
  const terminals: LaidTerminal[] = [];
  const placeRow = (nets: string[], y: number) => {
    const step = tbBox.w / 11;
    nets.forEach((n, i) => {
      const x = tbBox.x + step * (i + 0.5);
      const id = n === 'X1' || n === 'X2' || n === 'G' ? n : 'w' + n;
      terminals.push(term(n, id, x, y, W, H, step - 4, 30));
    });
  };
  placeRow(row1, tbBox.y + 28);
  placeRow(row2, tbBox.y + 58);

  // ---- CPT X1/X2 and F1 (line X1, load wire 1) ----
  const cptTerms = [
    term('X1', 'X1', cptBox.x + 58, cptBox.y + 62, W, H, 40, 32),
    term('X2', 'X2', cptBox.x + 138, cptBox.y + 62, W, H, 40, 32),
  ];
  const f1Terms = [
    term('X1', 'X1', f1Box.x + 46, f1Box.y + 62, W, H, 40, 32),
    term('1', 'w1', f1Box.x + 114, f1Box.y + 62, W, H, 40, 32),
  ];

  const ch2Items: LaidCh2[] = b.layout.ch2Preview.map((c, i) => {
    const w = ch2Box.w / b.layout.ch2Preview.length;
    const box: Box = { x: ch2Box.x + i * w + 6, y: ch2Box.y + 22, w: w - 12, h: 56 };
    return { tag: c.tag, title: c.title, box, boxPct: boxPct(box, W, H), centerPct: centerPct(box, W, H) };
  });

  // Door harness: from the door's right edge, a loop in the hinge gap, then into the enclosure toward the TB.
  const bundle = [
    { x: door.x + door.w - 2, y: 240 },
    { x: hinge.x + 8, y: 230 },
    { x: hinge.x + 38, y: 210 },
    { x: hinge.x + 38, y: 430 },
    { x: hinge.x + 10, y: 500 },
    { x: enclosure.x + 6, y: tbBox.y - 8 },
    { x: tbBox.x + 16, y: tbBox.y - 6 },
  ];
  const plf = devices.find((d) => d.tag === 'PLF')!;
  const t91 = terminals.find((t) => t.net === '91')!;
  const t92 = terminals.find((t) => t.net === '92')!;
  const orange = [
    { x: plf.pins[0].x, y: plf.pins[0].y },
    { x: door.x + door.w - 2, y: plf.pins[0].y },
    { x: hinge.x + 16, y: plf.pins[0].y + 8 },
    { x: hinge.x + 30, y: 360 },
    { x: hinge.x + 16, y: 500 },
    { x: enclosure.x + 8, y: tbBox.y - 4 },
    { x: t91.x, y: tbBox.y - 4 },
    { x: t91.x, y: t91.y },
  ];
  const orangeB = [
    { x: plf.pins[1].x, y: plf.pins[1].y },
    { x: door.x + door.w - 2, y: plf.pins[1].y },
    { x: hinge.x + 22, y: plf.pins[1].y + 8 },
    { x: hinge.x + 36, y: 360 },
    { x: hinge.x + 22, y: 508 },
    { x: enclosure.x + 8, y: tbBox.y - 6 },
    { x: t92.x, y: tbBox.y - 6 },
    { x: t92.x, y: t92.y },
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
