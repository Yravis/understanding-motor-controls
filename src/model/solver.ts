// Complex modified-nodal-analysis solver. Works for AC phasors (60 Hz) and, with real
// admittances, for DC. Pure function of a list of branches.
import { C, c, add, sub, mul, abs } from './complex';

export const REF = 'G';
export const LEAK = 1e-12; // siemens, ties every node to reference so the matrix stays solvable
export const CONNECT_EPS = 1e-9; // |y| above this counts as a real connection for floating detection

/** Two-terminal branch: admittance y between a and b, plus a Norton current source `i` injected into a (drawn from b). */
export interface Branch { id: string; a: string; b: string; y: C; i?: C }

export interface Solution {
  v: Map<string, C>;
  floating: Set<string>; // nodes with no connection (other than leakage) to the reference
  singular: boolean;
}

export function solve(branches: Branch[], extraNodes: string[] = []): Solution {
  const idx = new Map<string, number>();
  const names: string[] = [];
  const reg = (n: string) => { if (n !== REF && !idx.has(n)) { idx.set(n, names.length); names.push(n); } };
  for (const n of extraNodes) reg(n);
  for (const br of branches) { reg(br.a); reg(br.b); }
  const n = names.length;
  const re = new Float64Array(n * n), im = new Float64Array(n * n);
  const bre = new Float64Array(n), bim = new Float64Array(n);
  const stamp = (r: number, col: number, y: C) => { re[r * n + col] += y.re; im[r * n + col] += y.im; };
  for (const br of branches) {
    const ia = br.a === REF ? -1 : idx.get(br.a)!;
    const ib = br.b === REF ? -1 : idx.get(br.b)!;
    if (ia >= 0) stamp(ia, ia, br.y);
    if (ib >= 0) stamp(ib, ib, br.y);
    if (ia >= 0 && ib >= 0) { stamp(ia, ib, c(-br.y.re, -br.y.im)); stamp(ib, ia, c(-br.y.re, -br.y.im)); }
    if (br.i) {
      if (ia >= 0) { bre[ia] += br.i.re; bim[ia] += br.i.im; }
      if (ib >= 0) { bre[ib] -= br.i.re; bim[ib] -= br.i.im; }
    }
  }
  for (let k = 0; k < n; k++) re[k * n + k] += LEAK;

  // Gaussian elimination, partial pivoting, complex.
  let singular = false;
  for (let k = 0; k < n; k++) {
    let p = k, best = Math.hypot(re[k * n + k], im[k * n + k]);
    for (let r = k + 1; r < n; r++) { const m = Math.hypot(re[r * n + k], im[r * n + k]); if (m > best) { best = m; p = r; } }
    if (best < 1e-30) { singular = true; continue; }
    if (p !== k) {
      for (let col = 0; col < n; col++) {
        let t = re[k * n + col]; re[k * n + col] = re[p * n + col]; re[p * n + col] = t;
        t = im[k * n + col]; im[k * n + col] = im[p * n + col]; im[p * n + col] = t;
      }
      let t = bre[k]; bre[k] = bre[p]; bre[p] = t; t = bim[k]; bim[k] = bim[p]; bim[p] = t;
    }
    const pr = re[k * n + k], pi = im[k * n + k], pd = pr * pr + pi * pi;
    for (let r = k + 1; r < n; r++) {
      const ar = re[r * n + k], ai = im[r * n + k];
      if (ar === 0 && ai === 0) continue;
      const fr = (ar * pr + ai * pi) / pd, fi = (ai * pr - ar * pi) / pd;
      for (let col = k; col < n; col++) {
        const xr = re[k * n + col], xi = im[k * n + col];
        re[r * n + col] -= fr * xr - fi * xi;
        im[r * n + col] -= fr * xi + fi * xr;
      }
      bre[r] -= fr * bre[k] - fi * bim[k];
      bim[r] -= fr * bim[k] + fi * bre[k];
    }
  }
  const xr = new Float64Array(n), xi = new Float64Array(n);
  for (let k = n - 1; k >= 0; k--) {
    let sr = bre[k], si = bim[k];
    for (let col = k + 1; col < n; col++) {
      sr -= re[k * n + col] * xr[col] - im[k * n + col] * xi[col];
      si -= re[k * n + col] * xi[col] + im[k * n + col] * xr[col];
    }
    const pr = re[k * n + k], pi = im[k * n + k], pd = pr * pr + pi * pi;
    xr[k] = (sr * pr + si * pi) / pd;
    xi[k] = (si * pr - sr * pi) / pd;
  }
  const v = new Map<string, C>();
  v.set(REF, c(0));
  names.forEach((nm, k) => v.set(nm, c(xr[k], xi[k])));

  // floating-node detection: BFS from reference over real connections
  const adj = new Map<string, string[]>();
  const link = (a: string, b: string) => { (adj.get(a) ?? adj.set(a, []).get(a)!).push(b); (adj.get(b) ?? adj.set(b, []).get(b)!).push(a); };
  for (const br of branches) if (abs(br.y) > CONNECT_EPS) link(br.a, br.b);
  const seen = new Set<string>([REF]);
  const q = [REF];
  while (q.length) { const x = q.pop()!; for (const y of adj.get(x) ?? []) if (!seen.has(y)) { seen.add(y); q.push(y); } }
  const floating = new Set(names.filter((nm) => !seen.has(nm)));
  return { v, floating, singular };
}

export const vOf = (s: Solution, n: string): C => s.v.get(n) ?? c(0);
export const vAcross = (s: Solution, a: string, b: string): C => sub(vOf(s, a), vOf(s, b));
/** Current through a branch from a to b. */
export function branchCurrent(s: Solution, br: Branch): C {
  const d = vAcross(s, br.a, br.b);
  const i = mul(d, br.y);
  return br.i ? sub(i, br.i) : i;
}
export { add };
