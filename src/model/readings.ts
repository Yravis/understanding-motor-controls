// Model-generated readings tables (healthy vs faulted) for review sheets. Never hand-typed.
import { Params } from './params';
import { buildBucket, Bucket } from './bucket';
import { FaultDef, buildFaulted, structuredCloneBucket } from './faults';
import { measure } from './meter';

export const KEY_POINTS: { mode: 'VAC' | 'OHMS'; red: string; black: string; what: string }[] = [
  { mode: 'VAC', red: 'X1', black: 'X2', what: 'control source' },
  { mode: 'VAC', red: 'X1', black: 'w1', what: 'across supply fuse F1' },
  { mode: 'VAC', red: 'w1', black: 'w2', what: 'rails 1-2' },
  { mode: 'VAC', red: 'X1', black: 'G', what: 'X1 to ground' },
  { mode: 'VAC', red: 'X2', black: 'G', what: 'X2 to ground' },
  { mode: 'VAC', red: 'PB1:1', black: 'PB1:2', what: 'across START contact' },
  { mode: 'VAC', red: 'CR1:C1', black: 'CR1:C2', what: 'across CR1 coil' },
  { mode: 'VAC', red: 'CR1:1', black: 'CR1:2', what: 'across CR1 NO contact' },
  { mode: 'VAC', red: 'PL1:1', black: 'PL1:2', what: 'across PL1' },
  { mode: 'VAC', red: 'FS1:1', black: 'FS1:2', what: 'across float switch' },
  { mode: 'VAC', red: 'SOL1:C1', black: 'SOL1:C2', what: 'across SOL1' },
  { mode: 'VAC', red: 'TR1:A1', black: 'TR1:A2', what: 'across TR1 coil' },
  { mode: 'VAC', red: 'w91', black: 'w92', what: 'foreign circuit' },
  { mode: 'VAC', red: 'w7', black: 'G', what: 'wire 7 to ground' },
  { mode: 'OHMS', red: 'CR1:C1', black: 'CR1:C2', what: 'CR1 coil resistance' },
  { mode: 'OHMS', red: 'PB1:1', black: 'PB1:2', what: 'START contact (released)' },
  { mode: 'OHMS', red: 'CR1:1', black: 'CR1:2', what: 'CR1 NO contact' },
  { mode: 'OHMS', red: 'CR1:5', black: 'CR1:6', what: 'CR1 NC contact' },
  { mode: 'OHMS', red: 'w7', black: 'G', what: 'wire 7 to ground' },
];

export const STATES: { id: string; label: string; run: (b: Bucket) => void }[] = [
  { id: 'idle', label: 'Bucket ON, idle (nothing pressed)', run: () => {} },
  { id: 'start', label: 'Bucket ON, START held 1 s', run: (b) => { b.world.press('PB1'); b.world.advance(1); } },
  { id: 'dead', label: 'Bucket supply OFF and remote source OFF (de-energized, for ohms)', run: (b) => { b.world.setSource('SRC', false); b.world.setSource('FSRC', false); } },
  { id: 'bucket-off-foreign-live', label: 'Bucket supply OFF, remote source still ON', run: (b) => { b.world.setSource('SRC', false); } },
];
export interface Row { state: string; mode: string; what: string; points: string; display: string; note: string }

export function readingsFor(b0: Bucket): Row[] {
  const rows: Row[] = [];
  for (const st of STATES) {
    const b = structuredCloneBucket(b0);
    st.run(b);
    for (const k of KEY_POINTS) {
      if (st.id === 'dead' && k.mode === 'VAC') continue;
      if (st.id === 'bucket-off-foreign-live' && k.mode === 'OHMS') continue;
      if ((st.id === 'idle' || st.id === 'start') && k.mode === 'OHMS') continue;
      const r = measure(b.world, k.mode, k.red, k.black);
      rows.push({ state: st.label, mode: k.mode, what: k.what, points: `${k.red} → ${k.black}`, display: r.display + (r.floating ? ' (floating)' : ''), note: r.strike ? 'safety strike' : '' });
    }
    if (st.id === 'start') rows.push({ state: st.label, mode: 'state', what: 'lit lamps', points: '', display: Object.keys(b.world.ledOn).filter((id) => b.world.lit(id)).join(' ') || 'none', note: '' });
    if (st.id === 'idle') rows.push({ state: st.label, mode: 'state', what: 'lit lamps', points: '', display: Object.keys(b.world.ledOn).filter((id) => b.world.lit(id)).join(' ') || 'none', note: '' });
  }
  return rows;
}
export function healthyReadings(p: Params): Row[] { return readingsFor(buildBucket(p)); }
export function faultReadings(p: Params, f: FaultDef): Row[] { return readingsFor(buildFaulted(p, f)); }

export function readingsMarkdown(healthy: Row[], faulted: Row[] | null, title: string): string {
  let md = `### ${title}\n\n| State | Mode | Test point | Points (red → black) | Healthy | ${faulted ? 'Faulted |' : ''}\n|---|---|---|---|---|${faulted ? '---|' : ''}\n`;
  healthy.forEach((h, i) => { md += `| ${h.state} | ${h.mode} | ${h.what} | ${h.points} | ${h.display} | ${faulted ? faulted[i].display + (h.display !== faulted[i].display ? ' **≠**' : '') + ' |' : ''}\n`; });
  return md + '\n';
}
