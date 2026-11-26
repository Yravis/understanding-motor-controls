// Writes photo-overlay/layout.md from the same geometry the Physical view uses.
import { mkdirSync, writeFileSync } from 'node:fs';
import { bucket } from '../tests/helpers';
import { physicalLayout } from '../src/ui/physicallayout';

const typeOf = (d: { kind: string; title: string; foreign?: boolean; tag: string }): string => {
  if (d.kind === 'pb-mushroom') return 'mushroom E-stop (maintained, NC STOP)';
  if (d.kind === 'pb-no') return 'pushbutton (NO, momentary START)';
  if (d.kind === 'pb-nc') return 'pushbutton (NC, momentary STOP)';
  if (d.kind === 'relay') return 'control relay';
  if (d.kind === 'lamp') return d.foreign ? 'pilot light on the orange foreign-voltage interlock circuit' : 'pilot light';
  if (d.kind === 'switch-float') return 'float switch';
  if (d.kind === 'switch-pressure') return 'pressure switch';
  if (d.kind === 'switch-temp') return 'temperature switch';
  if (d.kind === 'switch-limit') return 'limit switch (mechanical, NC)';
  if (d.kind === 'switch-flow') return 'flow switch';
  if (d.kind === 'solenoid') return 'solenoid valve';
  if (d.kind === 'timer') return 'timer';
  return d.kind;
};

const netLabel = (net: string) => (net.startsWith('w') ? 'wire ' + net.slice(1) : net);
const fmt = (n: number) => n.toFixed(1).replace(/\.0$/, '');

const b = bucket();
const lay = physicalLayout(b, true);
const { w, h } = lay.viewBox;
const outDir = '/workspace/understanding-motor-controls-notes/photo-overlay';
mkdirSync(outDir, { recursive: true });

const pxH = h >= w ? 1536 : Math.round(1536 * h / w);
const pxW = w >= h ? 1536 : Math.round(1536 * w / h);

let md = `# Bucket 1A — Physical view layout (photo overlay reference)

This describes the game's **Physical** view, door **open**, unzoomed, from the front, matching \`src/ui/bucketview.ts\`. Use it with \`reference-physical.png\` to generate a photo-real image that can be overlaid on the same viewBox.

## ViewBox and aspect ratio

- **viewBox:** \`0 0 ${w} ${h}\` (SVG user units)
- **Aspect ratio:** ${w}:${h} (width:height), or **${(w / h).toFixed(6)}** (width ÷ height), or **${(h / w).toFixed(4)}:1** tall
- **Reference PNG:** \`reference-physical.png\` is this SVG at **${pxW} × ${pxH} px** (1536 px on the long side, height, with the viewBox aspect preserved)
- **Perspective:** flat front elevation of the control section, looking straight into the open bucket. Not a 3/4 view. The photo must use this same framing so it scales 1:1 onto the SVG.

## What the picture must include

- MCC bucket **door open**, showing the control-section interior.
- Orange safety banner at the top: "${lay.warning.text}"
- A **three-column** grid of devices, top to bottom, left to right, in the exact cells below.
- A **terminal strip** of wire numbers under the grid (X1, 1–17, 91, 92, G).
- Wires **91 and 92 are orange** (foreign-voltage remote interlock). They stay live when this bucket's own handle is off. The game does not assign colors to the other numbered wires; do not invent a color code for them, and do not rely on color to place devices.
- A greyed-out **Chapter 2 preview** row at the bottom: DISC, PF, M, OL, MTR (visible, not operable).
- Positions below are **percent of the full viewBox** (origin at the top-left of the SVG, including the title and warning, not just the device grid). \`center\` is the center of each cell; \`box\` is x, y, width, height.

## Not drawn as device cells in this view

These exist in the bucket model and in the control bar, but they are **not** separate cells in the Physical SVG. Do not add extra cells that would shift the grid, the terminal strip, or 91/92.

- **Control power (CPT secondary / source):** 120 V between X1 and X2; X2 is bonded to ground (G). X1, X2 (as wire 2), and G appear on the terminal strip.
- **Control fuse F1:** in the X1 conductor, between X1 and wire 1. The pull-F1 / handle ON-OFF controls live in the UI under the picture, not in the SVG.
- **Operator handle / disconnect:** the door is interlocked so it only opens with the handle OFF; the handle itself is a control-bar button, not a cell in this view.

Empty space in the last device row (only two of three cells used) should stay empty or be enclosure metal — do not place a new device there.

## Devices (top to bottom, left to right)

`;

lay.devices.forEach((d, i) => {
  const col = i % 3;
  if (col === 0) {
    const row = Math.floor(i / 3) + 1;
    md += `\n### Row ${row}\n\n`;
  }
  const pins = d.pins.map((p) => `${p.label} → ${netLabel(p.net)}`).join('; ');
  md += `- **${d.designation}** — ${typeOf(d)}. ${d.title}. Pins: ${pins || 'none'}.`;
  if (d.foreign) md += ' Orange foreign circuit (wires 91/92).';
  md += ` Center at **${fmt(d.centerPct.x)}%** width, **${fmt(d.centerPct.y)}%** height. Box: ${fmt(d.boxPct.x)}%, ${fmt(d.boxPct.y)}%, ${fmt(d.boxPct.w)}% × ${fmt(d.boxPct.h)}%.\n`;
});

md += `\n## Terminal strip\n\n`;
md += `Label at the top of this block: "${lay.terminalStrip.label}". Six terminals per row, then wrapped. 91 and 92 are the orange interlock.\n\n`;
for (const tm of lay.terminalStrip.terminals) {
  md += `- **${tm.net}**${tm.foreign ? ' (orange, foreign interlock, stays live with the bucket off)' : ''}: center **${fmt(tm.centerPct.x)}%**, **${fmt(tm.centerPct.y)}%**. Box: ${fmt(tm.boxPct.x)}%, ${fmt(tm.boxPct.y)}%, ${fmt(tm.boxPct.w)}% × ${fmt(tm.boxPct.h)}%.\n`;
}

md += `\n## Chapter 2 preview (inspect only, greyed out)\n\n`;
for (const c of lay.ch2Preview.items) {
  md += `- **${c.tag}** — ${c.title}. Center **${fmt(c.centerPct.x)}%**, **${fmt(c.centerPct.y)}%**. Box: ${fmt(c.boxPct.x)}%, ${fmt(c.boxPct.y)}%, ${fmt(c.boxPct.w)}% × ${fmt(c.boxPct.h)}%.\n`;
}

const wb = lay.warning.boxPct;
md += `\n## Header and warning\n\n`;
md += `- Title line (top of the view): "BUCKET 1A · control section · door OPEN".\n`;
md += `- Orange warning banner: "${lay.warning.text}". Center of the banner at about **${fmt(wb.x + wb.w / 2)}%**, **${fmt(wb.y + wb.h / 2)}%**. Box: ${fmt(wb.x)}%, ${fmt(wb.y)}%, ${fmt(wb.w)}% × ${fmt(wb.h)}%.\n`;

writeFileSync(`${outDir}/layout.md`, md);
console.log(`wrote ${outDir}/layout.md`);
console.log(`viewBox 0 0 ${w} ${h}; aspect ${w}:${h} = ${(w / h).toFixed(6)}; png ${pxW}x${pxH}`);
