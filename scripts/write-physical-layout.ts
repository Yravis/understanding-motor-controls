// Writes photo-overlay/layout.md from the same geometry the Physical view uses (v2 open-door elevation).
import { mkdirSync, writeFileSync } from 'node:fs';
import { bucket } from '../tests/helpers';
import { physicalLayout, type LaidDevice } from '../src/ui/physicallayout';

const typeOf = (d: { kind: string; title: string; foreign?: boolean; tag: string }): string => {
  if (d.kind === 'pb-mushroom') return '22 mm mushroom E-stop (maintained, NC STOP), mounted on the door';
  if (d.kind === 'pb-no') return '22 mm pushbutton (NO, momentary START), mounted on the door';
  if (d.kind === 'pb-nc') return '22 mm pushbutton (NC, momentary STOP), mounted on the door';
  if (d.kind === 'relay') return 'control relay on the DIN rail';
  if (d.kind === 'lamp') return d.foreign
    ? '22 mm pilot light on the door (orange foreign-voltage interlock circuit)'
    : '22 mm pilot light on the door';
  if (d.kind === 'switch-float') return 'float switch (field device, not inside the bucket)';
  if (d.kind === 'switch-pressure') return 'pressure switch (field device, not inside the bucket)';
  if (d.kind === 'switch-temp') return 'temperature switch (field device, not inside the bucket)';
  if (d.kind === 'switch-limit') return 'limit switch (mechanical, NC; field device, not inside the bucket)';
  if (d.kind === 'switch-flow') return 'flow switch (field device, not inside the bucket)';
  if (d.kind === 'solenoid') return 'solenoid valve (field device, not inside the bucket)';
  if (d.tag === 'TR1' || d.tag === 'TR2') return 'pneumatic timing relay (timer head on a relay) on the DIN rail';
  if (d.kind === 'timer') return 'solid-state timer on the DIN rail';
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

const zoneDevices = (zone: LaidDevice['zone']) => lay.devices.filter((d) => d.zone === zone);

let md = `# Bucket 1A — Physical view layout v2 (photo overlay reference)

This describes the game's **Physical** view, door **open**, unzoomed, from the front, matching \`src/ui/bucketview.ts\`. Use it with \`reference-physical-v2.png\` to generate a photo-real image that can be overlaid on the same viewBox.

v2 is a **front elevation of a generic MCC bucket** (no brand). The door is swung open to the left, showing its **inside face**. The open bucket interior is on the right. Field devices that would not really be mounted in the bucket are shown in a labeled inset under the drawing.

## ViewBox and aspect ratio

- **viewBox:** \`0 0 ${w} ${h}\` (SVG user units)
- **Aspect ratio:** ${w}:${h} (width:height), or **${(w / h).toFixed(6)}** (width ÷ height), which is **4:3**
- **Reference PNG:** \`reference-physical-v2.png\` is this SVG at **${pxW} × ${pxH} px** (1536 px on the long side, width, with the viewBox aspect preserved)
- **Perspective:** flat front elevation, looking straight at the open bucket. Not a 3/4 view. The photo must use this same framing so it scales 1:1 onto the SVG.

## What the picture must include

- A generic MCC **bucket enclosure** on the right, door **swung open to the left** so the **inside face of the door** is visible.
- **22 mm operators** on the door, each with a legend plate: PB3 mushroom E-stop, PB1 START, PB2 STOP, and pilot lights PL1–PL11 plus PLF.
- On the inside of the door, the **contact / lamp terminals** stay visible and meterable (same nets as before).
- A flexible **door wiring harness** looping through the hinge gap into the enclosure. Only wires **91 and 92 are orange** (foreign-voltage remote interlock). Do not invent a color code for the other wires.
- The **interior backplate** on the right, with:
  - the orange safety warning label
  - a greyed-out **Chapter 2 power section** at the top (disconnect, power fuses, contactor M, OL, motor leads) — visible, inspect only
  - the **CPT** (control transformer) with X1 and X2 secondary terminals
  - the **F1** control-fuse holder (line on X1, load on wire 1)
  - a **DIN rail** holding CR1, TR1 and TR2 (pneumatic timer heads on relays), and TD3 / TD4 (solid-state timers)
  - the **terminal strip** (X1, 1–17, 91, 92, G)
- A **field-devices inset** under the bucket for FS1, PS1, TS1, LS1, FLS1, and SOL1 (these are not mounted in a real bucket). Every pin stays meterable.
- Positions below are **percent of the full viewBox** (origin at the top-left of the SVG). \`center\` is the center of each box; \`box\` is x, y, width, height.

## Regions

- Door (inside face): ${fmt(lay.door.x / w * 100)}%, ${fmt(lay.door.y / h * 100)}%, ${fmt(lay.door.w / w * 100)}% × ${fmt(lay.door.h / h * 100)}%
- Hinge / harness gap: ${fmt(lay.hinge.x / w * 100)}%, ${fmt(lay.hinge.y / h * 100)}%, ${fmt(lay.hinge.w / w * 100)}% × ${fmt(lay.hinge.h / h * 100)}%
- Enclosure: ${fmt(lay.enclosure.x / w * 100)}%, ${fmt(lay.enclosure.y / h * 100)}%, ${fmt(lay.enclosure.w / w * 100)}% × ${fmt(lay.enclosure.h / h * 100)}%
- Field-devices inset: ${fmt(lay.fieldInset.box.x / w * 100)}%, ${fmt(lay.fieldInset.box.y / h * 100)}%, ${fmt(lay.fieldInset.box.w / w * 100)}% × ${fmt(lay.fieldInset.box.h / h * 100)}%

`;

const emitDev = (d: LaidDevice) => {
  const pins = d.pins.map((p) => `${p.label} → ${netLabel(p.net)}`).join('; ');
  let line = `- **${d.designation}** — ${typeOf(d)}. ${d.title}. Legend: ${d.legend.join(' / ')}. Pins: ${pins || 'none'}.`;
  if (d.foreign) line += ' Orange foreign circuit (wires 91/92).';
  line += ` Center at **${fmt(d.centerPct.x)}%** width, **${fmt(d.centerPct.y)}%** height. Box: ${fmt(d.boxPct.x)}%, ${fmt(d.boxPct.y)}%, ${fmt(d.boxPct.w)}% × ${fmt(d.boxPct.h)}%.\n`;
  return line;
};

md += `## Door — inside face (22 mm operators)\n\n`;
md += `Left side of the view. Operators are drawn on the inside face with legend plates and screw terminals.\n\n`;
for (const d of zoneDevices('door')) md += emitDev(d);

md += `\n## Enclosure interior — control power\n\n`;
md += `These exist in the bucket model; in v2 they are drawn in the Physical view (they were control-bar only in v1).\n\n`;
for (const t of lay.cpt.terminals) {
  md += `- **CPT ${t.net}**: clickable node \`${t.id}\`. Center **${fmt(t.centerPct.x)}%**, **${fmt(t.centerPct.y)}%**. Box: ${fmt(t.boxPct.x)}%, ${fmt(t.boxPct.y)}%, ${fmt(t.boxPct.w)}% × ${fmt(t.boxPct.h)}%.\n`;
}
for (const t of lay.f1.terminals) {
  md += `- **F1 ${t.net === 'X1' ? 'line (X1)' : 'load (wire 1)'}**: clickable node \`${t.id}\`. Center **${fmt(t.centerPct.x)}%**, **${fmt(t.centerPct.y)}%**. Box: ${fmt(t.boxPct.x)}%, ${fmt(t.boxPct.y)}%, ${fmt(t.boxPct.w)}% × ${fmt(t.boxPct.h)}%.\n`;
}

md += `\n## Enclosure interior — DIN rail\n\n`;
for (const d of zoneDevices('din')) md += emitDev(d);

md += `\n## Terminal strip\n\n`;
md += `Label: "${lay.terminalStrip.label}". Two rows (X1 and 1–10 on the first row; 11–17, 91, 92, G on the second). 91 and 92 are the orange interlock.\n\n`;
for (const tm of lay.terminalStrip.terminals) {
  md += `- **${tm.net}**${tm.foreign ? ' (orange, foreign interlock, stays live with the bucket off)' : ''}: center **${fmt(tm.centerPct.x)}%**, **${fmt(tm.centerPct.y)}%**. Box: ${fmt(tm.boxPct.x)}%, ${fmt(tm.boxPct.y)}%, ${fmt(tm.boxPct.w)}% × ${fmt(tm.boxPct.h)}%.\n`;
}

md += `\n## Chapter 2 power section (inspect only, greyed out)\n\n`;
md += `Upper backplate of the enclosure. Label: "${lay.ch2Preview.label}".\n\n`;
for (const c of lay.ch2Preview.items) {
  md += `- **${c.tag}** — ${c.title}. Center **${fmt(c.centerPct.x)}%**, **${fmt(c.centerPct.y)}%**. Box: ${fmt(c.boxPct.x)}%, ${fmt(c.boxPct.y)}%, ${fmt(c.boxPct.w)}% × ${fmt(c.boxPct.h)}%.\n`;
}

md += `\n## Field devices inset (not mounted in the bucket)\n\n`;
md += `Label: "${lay.fieldInset.label}". Shown under the bucket so every existing pin stays present and clickable.\n\n`;
for (const d of zoneDevices('field')) md += emitDev(d);

const wb = lay.warning.boxPct;
md += `\n## Header and warning\n\n`;
md += `- Nameplate: "${lay.nameplate.text}".\n`;
md += `- Orange warning banner on the enclosure: "${lay.warning.text}". Center of the banner at about **${fmt(wb.x + wb.w / 2)}%**, **${fmt(wb.y + wb.h / 2)}%**. Box: ${fmt(wb.x)}%, ${fmt(wb.y)}%, ${fmt(wb.w)}% × ${fmt(wb.h)}%.\n`;

writeFileSync(`${outDir}/layout.md`, md);
console.log(`wrote ${outDir}/layout.md`);
console.log(`viewBox 0 0 ${w} ${h}; aspect ${w}:${h} = ${(w / h).toFixed(6)}; png ${pxW}x${pxH}`);
