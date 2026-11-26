// NEMA-style ladder-diagram symbols (US practice), drawn horizontally with leads at x-18 and x+18.
// One renderer is used by the schematic, the symbol lesson cards, and identify-symbol questions, so
// what the learner studies is exactly what appears in the bucket's schematic.
// Drawing conventions follow common NEMA/US textbook practice; exact shapes are pending reviewer
// cross-check against NEMA ICS 19 / IEEE 315 (symbol items are blocked-on-source in the review ledger).
import { s } from './dom';

export const SYMBOL_KEYS = [
  'contact-no', 'contact-nc', 'pb-no', 'pb-nc', 'pb-nc-mushroom', 'relay-coil', 'pilot-light', 'solenoid',
  'float-no', 'float-nc', 'limit-no', 'limit-nc', 'pressure-no', 'pressure-nc', 'temp-no', 'temp-nc', 'flow-no', 'flow-nc',
  'timer-on-notc', 'timer-on-ncto', 'timer-off-noto', 'timer-off-nctc',
] as const;
export type SymbolKey = (typeof SYMBOL_KEYS)[number];

const L = (x1: number, y1: number, x2: number, y2: number, cls = 'sym') => s('line', { x1, y1, x2, y2, class: cls });
const C = (cx: number, cy: number, r: number, fill = 'var(--card)') => s('circle', { cx, cy, r, class: 'sym', fill });
const P = (d: string, fill = 'none') => s('path', { d, class: 'sym', fill });
const T = (x: number, y: number, t: string, cls = 'tiny') => s('text', { x, y, 'text-anchor': 'middle', class: cls }, t);

/** Draw a symbol centred at (x, y). `designation` labels coils/lights (e.g. CR1, R, G). */
export function drawSymbol(key: string, x: number, y: number, designation = ''): SVGGElement {
  const g = s('g', { class: 'nema-sym', 'data-symbol': key });
  const leads = (inner: number) => g.append(L(x - 18, y, x - inner, y, 'wire'), L(x + inner, y, x + 18, y, 'wire'));
  const [base, kind] = key.split('-');
  if (key === 'contact-no' || key === 'contact-nc' || base === 'timer') {
    // relay / timed contact: two parallel bars; NC adds a diagonal slash
    leads(6);
    g.append(L(x - 6, y - 9, x - 6, y + 9), L(x + 6, y - 9, x + 6, y + 9));
    const nc = key === 'contact-nc' || key.endsWith('ncto') || key.endsWith('nctc');
    if (nc) g.append(L(x - 10, y + 10, x + 10, y - 10));
    if (base === 'timer') {
      // timed contact: arrow shows the direction of the delayed action (up = timed closing, down = timed opening)
      const up = key.endsWith('notc') || key.endsWith('nctc');
      g.append(L(x, y - 20, x, y - 11));
      g.append(up ? P(`M ${x - 4} ${y - 16} L ${x} ${y - 21} L ${x + 4} ${y - 16}`) : P(`M ${x - 4} ${y - 15} L ${x} ${y - 10} L ${x + 4} ${y - 15}`));
      g.append(T(x, y + 21, key.split('-')[2].toUpperCase()));
    }
    return g;
  }
  if (base === 'pb') {
    // pushbutton: two terminal circles; NO = bridging bar above (not touching), NC = bar under the terminals (touching)
    leads(12);
    g.append(C(x - 10, y, 2.5), C(x + 10, y, 2.5));
    const barY = kind === 'no' ? y - 7 : y + 3;
    g.append(L(x - 14, barY, x + 14, barY), L(x, barY, x, y - 17));
    if (key === 'pb-nc-mushroom') g.append(P(`M ${x - 10} ${y - 17} A 10 7 0 0 1 ${x + 10} ${y - 17} Z`));
    else g.append(L(x - 5, y - 17, x + 5, y - 17));
    return g;
  }
  if (key === 'relay-coil') { leads(12); g.append(C(x, y, 12), T(x, y + 3, designation || 'CR', 'pinlbl')); return g; }
  if (key === 'pilot-light') {
    leads(11); g.append(C(x, y, 11));
    for (let a = 0; a < 8; a++) { const t = (a * Math.PI) / 4 + Math.PI / 8; g.append(L(x + Math.cos(t) * 13, y + Math.sin(t) * 13, x + Math.cos(t) * 17, y + Math.sin(t) * 17)); }
    if (designation) g.append(T(x, y + 3, designation, 'pinlbl'));
    return g;
  }
  if (key === 'solenoid') {
    leads(12); g.append(P(`M ${x - 12} ${y} q 4 -10 8 0 q 4 -10 8 0 q 4 -10 8 0`), T(x, y + 14, designation || 'SOL'));
    return g;
  }
  // sensing switches: blade pivots at the left terminal; NO blade sits above the right terminal (open),
  // NC blade passes under the right terminal (closed). The actuator mark hangs from the blade.
  leads(12);
  g.append(C(x - 10, y, 2.5), C(x + 10, y, 2.5));
  const nc = kind === 'nc';
  const tipY = nc ? y + 5 : y - 11;
  g.append(L(x - 10, y, x + 13, tipY));
  const mx = x + 1, my = (y + tipY) / 2;
  if (base === 'float') g.append(L(mx, my, mx, y + 13), C(mx, y + 17, 4));
  else if (base === 'limit') g.append(P(`M ${mx - 4} ${my + 6} L ${mx} ${my} L ${mx + 4} ${my + 6} Z`));
  else if (base === 'pressure') g.append(L(mx, my, mx, y + 12), P(`M ${mx - 7} ${y + 12} L ${mx + 7} ${y + 12} A 7 6 0 0 1 ${mx - 7} ${y + 12}`));
  else if (base === 'temp') g.append(L(mx, my, mx, y + 10), P(`M ${mx} ${y + 10} l -4 3 l 8 3 l -8 3 l 4 3`));
  else if (base === 'flow') g.append(L(mx, my, mx, y + 18), P(`M ${mx} ${y + 10} L ${mx + 9} ${y + 13} L ${mx} ${y + 16} Z`));
  return g;
}

/** Stand-alone symbol picture for lesson cards and identify-symbol questions. */
export function symbolFigure(key: string, designation = ''): SVGSVGElement {
  const svg = s('svg', { viewBox: '0 0 120 60', class: 'symfig', role: 'img', 'aria-label': `Symbol ${key}` });
  svg.append(L(4, 30, 26, 30, 'wire'), L(94, 30, 116, 30, 'wire'));
  const g = drawSymbol(key, 60, 30, designation);
  g.setAttribute('transform', 'translate(60 30) scale(1.9) translate(-60 -30)');
  svg.append(g);
  return svg;
}
