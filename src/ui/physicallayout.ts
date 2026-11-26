// Geometry of the Physical bucket view, shared by the SVG renderer.
import type { Bucket, DeviceView, PinView } from '../model/bucket';
import { warningBannerLayout, WARN_TEXT, wrapLines } from './svgtext';

export const PHYS = {
  VIEW_W: 360,
  COLS: 3,
  CW: 112,
  CH_BASE: 48,
  PIN_DY: 48,
  HIT: 47,
  COL_GAP: 4,
  ORIGIN_X: 12,
  TITLE_FONT: 10,
  TITLE_LINE: 11,
  TITLE_MAX_W: 100, // CW - 12 inset
  TITLE_Y: 28,      // first title baseline below the top of the cell
} as const;

/** Full device title, wrapped to the cell width — never truncated with an ellipsis. */
export function deviceTitleLines(title: string): string[] {
  return wrapLines(title, PHYS.TITLE_MAX_W, PHYS.TITLE_FONT);
}

/** Height of the designation + wrapped title block, plus a little padding before the pins. */
export function deviceHeaderH(title: string): number {
  const n = Math.max(1, deviceTitleLines(title).length);
  return PHYS.TITLE_Y + n * PHYS.TITLE_LINE + 6;
}

export interface Box { x: number; y: number; w: number; h: number }
export interface PctBox { x: number; y: number; w: number; h: number }
export interface LaidDevice {
  tag: string; kind: string; title: string; designation: string; symbol: string;
  foreign: boolean; pins: PinView[]; titleLines: string[];
  box: Box; boxPct: PctBox; centerPct: { x: number; y: number };
}
export interface LaidTerminal { net: string; id: string; foreign: boolean; box: Box; boxPct: PctBox; centerPct: { x: number; y: number } }
export interface LaidCh2 { tag: string; title: string; box: Box; boxPct: PctBox; centerPct: { x: number; y: number } }
export interface PhysicalLayout {
  viewBox: { w: number; h: number };
  aspect: { w: number; h: number; ratio: number };
  doorOpen: boolean;
  warning: { text: string; lines: string[]; box: Box; boxPct: PctBox };
  panelTop: number;
  devices: LaidDevice[];
  terminalStrip: { label: string; y: number; terminals: LaidTerminal[] };
  ch2Preview: { label: string; y: number; items: LaidCh2[] };
}

const cellH = (d: { pins: unknown[]; title: string }) => deviceHeaderH(d.title) + Math.ceil(d.pins.length / 2) * PHYS.PIN_DY;
const pct = (n: number, total: number) => Math.round((10000 * n) / total) / 100;
const boxPct = (b: Box, W: number, H: number): PctBox => ({ x: pct(b.x, W), y: pct(b.y, H), w: pct(b.w, W), h: pct(b.h, H) });
const centerPct = (b: Box, W: number, H: number) => ({ x: pct(b.x + b.w / 2, W), y: pct(b.y + b.h / 2, H) });

export function physicalLayout(b: Bucket, doorOpen = true): PhysicalLayout {
  const W = PHYS.VIEW_W;
  const devs = b.layout.devices;
  const rows: DeviceView[][] = [];
  for (let i = 0; i < devs.length; i += PHYS.COLS) rows.push(devs.slice(i, i + PHYS.COLS));
  const rowH = rows.map((r) => Math.max(...r.map(cellH)) + 12);
  const panelH = rowH.reduce((a, v) => a + v, 0) + 16;
  const warn = warningBannerLayout();
  const tbRows = Math.ceil(b.layout.tbNets.length / 6);
  const tbY = warn.panelTop + panelH + 20;
  const ch2Y = tbY + tbRows * 54 + 30;
  const H = ch2Y + 70;
  const warnBox: Box = { x: 10, y: 34, w: 340, h: warn.height };

  const devices: LaidDevice[] = [];
  let y = warn.panelTop;
  rows.forEach((row, ri) => {
    row.forEach((d, ci) => {
      const x = PHYS.ORIGIN_X + ci * (PHYS.CW + PHYS.COL_GAP);
      const box: Box = { x, y, w: PHYS.CW, h: rowH[ri] - 8 };
      devices.push({
        tag: d.tag, kind: d.kind, title: d.title, designation: d.designation, symbol: d.symbol,
        foreign: !!d.foreign, pins: d.pins, titleLines: deviceTitleLines(d.title), box, boxPct: boxPct(box, W, H), centerPct: centerPct(box, W, H),
      });
    });
    y += rowH[ri];
  });

  const terminals: LaidTerminal[] = b.layout.tbNets.map((n, i) => {
    const per = 6, x = 10 + (i % per) * 57, yy = tbY + Math.floor(i / per) * 54;
    const box: Box = { x, y: yy, w: 52, h: PHYS.HIT + 1 };
    const id = n === 'X1' || n === 'X2' || n === 'G' ? n : 'w' + n;
    return { net: n, id, foreign: n === '91' || n === '92', box, boxPct: boxPct(box, W, H), centerPct: centerPct(box, W, H) };
  });

  const ch2Items: LaidCh2[] = b.layout.ch2Preview.map((c, i) => {
    const box: Box = { x: 12 + i * 68, y: ch2Y, w: 64, h: 44 };
    return { tag: c.tag, title: c.title, box, boxPct: boxPct(box, W, H), centerPct: centerPct(box, W, H) };
  });

  return {
    viewBox: { w: W, h: H },
    aspect: { w: W, h: H, ratio: W / H },
    doorOpen,
    warning: { text: WARN_TEXT, lines: warn.lines, box: warnBox, boxPct: boxPct(warnBox, W, H) },
    panelTop: warn.panelTop,
    devices,
    terminalStrip: { label: 'TERMINAL STRIP (wire numbers)', y: tbY, terminals },
    ch2Preview: { label: 'CHAPTER 2 PREVIEW (inspect only)', y: ch2Y, items: ch2Items },
  };
}

