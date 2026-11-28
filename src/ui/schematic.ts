// Ladder schematic (SVG) rendered from the same netlist + layout metadata as the physical view.
import { s } from './dom';
import type { Bucket } from '../model/bucket';
import { drawSymbol } from './symbols';

export const RUNG_H = 96, X1 = 30, X2 = 330, LEFT = 40;
/** Contact designation baseline (below the symbol centre). */
export const NAME_DY = 32;
/** Live-state lines sit BELOW the symbol, directly under that contact's own designation, so they can never read as the
 *  previous contact's label. First line baseline, then the second. The next rung's tallest symbol (mushroom cap) starts at
 *  RUNG_H - 24 below this rung's centre, which these clear. */
export const STATE_LINE_DY = [43, 53] as const;
export interface ContactStateText { form: 'NO' | 'NC'; closed: boolean; reason: string; fault?: string }
const CTL = new Set(['relay', 'solenoid']);
/** Live state of a series contact, worded so the shelf (drawn) state cannot be mistaken for it. Uses World.contactClosed. */
export function contactState(b: Bucket, e: any): ContactStateText {
  const w = b.world;
  const closed = w.contactClosed(e);
  const act = w.devActuated(e.dev, e.pole);
  const d = w.devs[e.dev];
  let reason: string;
  if (d?.kind === 'pb') reason = act ? 'pressed' : 'released';
  else if (d?.kind === 'switch') reason = act ? 'actuated' : 'not actuated';
  else if (d?.kind === 'timer' && e.pole === 'timed') reason = act ? 'timed' : 'not timed';
  else if (d && CTL.has(d.kind)) reason = `${e.dev} ${act ? 'energized' : 'off'}`;
  else reason = act ? 'actuated' : 'not actuated';
  const fault = e.welded ? 'welded' : e.stuckOpen ? 'stuck open' : undefined;
  return { form: e.nc ? 'NC' : 'NO', closed, reason, fault };
}
/** Two short lines for the schematic: "NO · now open" / "CR1 off". */
export function contactStateLines(st: ContactStateText): [string, string] {
  return [`${st.form} · now ${st.closed ? 'closed' : 'open'}`, st.fault ? `${st.reason}, ${st.fault}` : st.reason];
}
/** One sentence for tap-info: "NO contact, now open (CR1 off)". */
export function contactStateSentence(b: Bucket, e: any): string {
  const st = contactState(b, e);
  return `${st.form} contact, now ${st.closed ? 'closed' : 'open'} (${st.reason}${st.fault ? ', ' + st.fault : ''})`;
}
export interface SchemOpts { highlightNet?: string | null; onTap?: (elementId: string) => void; onNet?: (net: string) => void }

function devOf(b: Bucket, tag: string) { return b.layout.devices.find((d) => d.tag === tag); }
/** Symbol for a series contact: the owning device's own symbol (pushbutton, sensing switch, timed contact), else a relay contact. */
export function contactSymbolKey(b: Bucket, e: any): string { return contactSymbol(b, e); }
function contactSymbol(b: Bucket, e: any): string {
  const d = devOf(b, e.dev);
  if (d && e.id === `${d.tag}.T`) return d.symbol;                                  // timed contact
  if (d && d.symbol && !['relay-coil', 'solenoid', 'pilot-light'].includes(d.symbol)) return d.symbol; // PB / sensing switch
  return e.nc ? 'contact-nc' : 'contact-no';
}
function loadSymbol(b: Bucket, e: any): string {
  if (e.kind === 'led' || e.kind === 'lamp') return 'pilot-light';
  const d = devOf(b, e.dev);
  return d?.symbol === 'solenoid' ? 'solenoid' : 'relay-coil';
}
function loadDesignation(b: Bucket, e: any): string {
  const d = devOf(b, e.dev);
  if (e.kind === 'led' || e.kind === 'lamp') { const t = (d?.title ?? '').toLowerCase(); return t.includes('green') ? 'G' : t.includes('red') ? 'R' : t.includes('amber') ? 'A' : t.includes('white') ? 'W' : ''; }
  return e.dev ?? '';
}
export function renderSchematic(b: Bucket, opts: SchemOpts = {}): SVGSVGElement {
  const w = b.world;
  const rungs = b.layout.rungs;
  const H = rungs.reduce((a, r) => a + RUNG_H + Math.max(0, r.loads.length - 1) * 34, 0) + 60;
  const svg = s('svg', { viewBox: `0 0 360 ${H}`, class: 'schem', role: 'img', 'aria-label': 'Ladder schematic' });
  const rail = (x: number, label: string) => { svg.append(s('line', { x1: x, y1: 24, x2: x, y2: H - 10, class: 'rail' }), s('text', { x, y: 16, class: 'lbl', 'text-anchor': 'middle' }, label)); };
  rail(X1, 'X1 (1)'); rail(X2, 'X2 (2)');
  let y = 54;
  for (const r of rungs) {
    const foreign = r.foreign;
    const rowH = RUNG_H + Math.max(0, r.loads.length - 1) * 34;
    svg.append(s('text', { x: 4, y: y + 4, class: 'tiny' }, 'R' + r.n));
    if (foreign) svg.append(s('text', { x: LEFT + 10, y: y - 22, class: 'tiny foreign' }, 'ORANGE · foreign source · live with bucket off'));
    // series devices from left rail
    const cells = r.series.length;
    const stepX = (X2 - X1 - 40) / (cells + 1);
    let prevX = X1;
    r.series.forEach((id, i) => {
      const e = w.el(id) as any;
      const cx = X1 + stepX * (i + 1) + 10;
      const [l1, l2] = contactStateLines(contactState(b, e));
      const hl = opts.highlightNet && [netOf(b, e.a), netOf(b, e.b)].includes(opts.highlightNet);
      const g = s('g', { class: 'tap' + (hl ? ' hl' : ''), onclick: () => opts.onTap?.(id) });
      g.append(s('line', { x1: prevX, y1: y, x2: cx - 18, y2: y, class: 'wire' }), drawSymbol(contactSymbol(b, e), cx, y));
      const st = s('text', { class: 'tiny state-lbl', 'text-anchor': 'middle', 'data-state-for': id });
      st.append(s('tspan', { x: cx, y: y + STATE_LINE_DY[0] }, l1 + ' '), s('tspan', { x: cx, y: y + STATE_LINE_DY[1] }, l2));
      g.append(s('text', { x: cx, y: y + NAME_DY, class: 'lbl', 'text-anchor': 'middle', 'data-name-for': id }, label(id)), st, s('rect', { x: cx - 22, y: y - 22, width: 44, height: 44, fill: 'transparent' }));
      const wn = netOf(b, e.b);
      g.append(s('text', { x: cx + 18, y: y + 14, class: 'wn' + (opts.highlightNet === wn ? ' hl' : ''), onclick: (ev: Event) => { ev.stopPropagation(); opts.onNet?.(wn); } }, wn.slice(1)));
      svg.append(g);
      prevX = cx + 18;
    });
    r.loads.forEach((id, k) => {
      const ly = y + k * 34;
      const e = w.el(id) as any;
      const lx = X2 - 44;
      const lit = (e.kind === 'led' || e.kind === 'lamp') && w.lit(id);
      const on = e.kind === 'coil' && !!w.coilOn[id];
      const chatter = w.chatter.includes(id);
      const g = s('g', { class: 'tap' + (lit || on ? ' on' : ''), onclick: () => opts.onTap?.(id) });
      g.append(s('line', { x1: k === 0 ? prevX : prevX, y1: k === 0 ? y : y, x2: k === 0 ? lx - 18 : prevX, y2: ly, class: 'wire' }));
      if (k > 0) g.append(s('line', { x1: prevX, y1: ly, x2: lx - 18, y2: ly, class: 'wire' }));
      if (lit || on) g.append(s('circle', { cx: lx, cy: ly, r: 16, class: 'glow' }));
      g.append(drawSymbol(loadSymbol(b, e), lx, ly, loadDesignation(b, e)));
      g.append(s('line', { x1: lx + 18, y1: ly, x2: X2, y2: ly, class: 'wire' }));
      g.append(s('text', { x: lx, y: ly + 26, class: 'lbl', 'text-anchor': 'middle' }, label(id) + (lit ? ' · LIT' : on ? ' · ON' : e.kind === 'coil' ? ' · off' : ' · off') + (chatter ? ' · CHATTER' : '')));
      g.append(s('rect', { x: lx - 22, y: ly - 22, width: 44, height: 44, fill: 'transparent' }));
      svg.append(g);
    });
    y += rowH;
  }
  return svg;
}
const label = (id: string) => id.replace('.coil', ' coil').replace(/\.c$/, '').replace('.sup', ' supply').replace('.trg', ' trigger').replace('.T', ' timed').replace('.', ' ');
function netOf(b: Bucket, pinNode: string): string {
  for (const d of b.layout.devices) for (const p of d.pins) if (p.id === pinNode) return p.net;
  return pinNode;
}
