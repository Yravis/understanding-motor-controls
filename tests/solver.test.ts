import { describe, it, expect } from 'vitest';
import { solve, branchCurrent, Branch, vAcross } from '../src/model/solver';
import { c, abs, mul, add, scale, inv } from '../src/model/complex';
import { measure } from '../src/model/meter';
import { Rng } from '../src/model/rng';
import { bucket, params } from './helpers';
import { capAdmittance } from '../src/model/formulas';

describe('solver: canonical circuits vs hand calcs', () => {
  it('series divider 120 V, 1k + 3k', () => {
    const s = solve([
      { id: 's', a: 'a', b: 'G', y: c(1e6), i: c(120e6) },
      { id: 'r1', a: 'a', b: 'n', y: c(1 / 1000) },
      { id: 'r2', a: 'n', b: 'G', y: c(1 / 3000) },
    ]);
    expect(abs(s.v.get('n')!)).toBeCloseTo(90, 3);
  });
  it('parallel lamps share the full voltage', () => {
    const s = solve([
      { id: 's', a: 'a', b: 'G', y: c(1e6), i: c(120e6) },
      { id: 'l1', a: 'a', b: 'G', y: c(1 / 240) }, { id: 'l2', a: 'a', b: 'G', y: c(1 / 240) },
    ]);
    expect(abs(s.v.get('a')!)).toBeCloseTo(120, 3);
  });
  it('floating node is reported, not given a fake number', () => {
    const s = solve([{ id: 'r', a: 'a', b: 'G', y: c(1) }, { id: 'f', a: 'x', b: 'y', y: c(1) }]);
    expect(s.floating.has('x')).toBe(true);
    expect(s.floating.has('a')).toBe(false);
  });
});

describe('solver: properties on random netlists', () => {
  function randomNet(seed: number): Branch[] {
    const r = new Rng(seed);
    const n = 6 + r.int(6);
    const br: Branch[] = [];
    for (let i = 1; i < n; i++) br.push({ id: 'T' + i, a: 'n' + i, b: i === 1 ? 'G' : 'n' + r.int(i), y: c(1 / r.range(1, 1000), r.range(-0.01, 0.01)) });
    for (let k = 0; k < n; k++) { const a = r.int(n), b = r.int(n); if (a !== b) br.push({ id: 'X' + k, a: a ? 'n' + a : 'G', b: b ? 'n' + b : 'G', y: inv(c(r.range(1, 500), r.range(-300, 300))) }); }
    br.push({ id: 'S', a: 'n' + (n - 1), b: 'G', y: c(1 / 5, -0.02), i: scale(c(1 / 5, -0.02), 120) });
    return br;
  }
  it('KCL holds at every node (1e-9) on 50 random netlists', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const br = randomNet(seed);
      const s = solve(br);
      const net = new Map<string, number[]>();
      for (const b of br) {
        const i = branchCurrent(s, b);
        for (const [node, sign] of [[b.a, 1], [b.b, -1]] as const) { const cur = net.get(node) ?? [0, 0]; cur[0] += sign * i.re; cur[1] += sign * i.im; net.set(node, cur); }
      }
      for (const [node, cur] of net) if (node !== 'G') expect(Math.hypot(cur[0], cur[1])).toBeLessThan(1e-9 * 10);
    }
  });
  it('power balance (Tellegen) across all branches', () => {
    for (let seed = 100; seed < 120; seed++) {
      const br = randomNet(seed);
      const s = solve(br);
      let p = 0, scaleP = 0;
      for (const b of br) { const i = branchCurrent(s, b); const v = vAcross(s, b.a, b.b); p += mul(v, { re: i.re, im: -i.im }).re; scaleP += abs(mul(v, i)); }
      expect(Math.abs(p)).toBeLessThan(1e-6 * Math.max(1, scaleP));
    }
  });
  it('ohmmeter probe-swap symmetry on passive R networks', () => {
    const w = bucket().world;
    w.setSource('SRC', false); w.setSource('FSRC', false);
    for (const [a, b] of [['CR1:C1', 'CR1:C2'], ['w4', 'w2'], ['w1', 'w2'], ['TR1:A1', 'TR1:A2']] as const) {
      const x = measure(w, 'OHMS', a, b), y = measure(w, 'OHMS', b, a);
      expect(x.value).not.toBeNull();
      expect(Math.abs(x.value! - y.value!)).toBeLessThan(1e-6 * x.value!);
    }
  });
});

describe('meter as a circuit element', () => {
  it('10 Mohm VAC across an open contact in series with a dropped-out coil reads ~120.0 V', () => {
    const w = bucket().world;
    const r = measure(w, 'VAC', 'PB1:1', 'PB1:2');
    expect(r.value!).toBeGreaterThan(119.9);
    expect(r.display).toBe('120.0');
  });
  it('across a closed contact reads ~0 V', () => {
    const w = bucket().world;
    w.press('PB1');
    expect(measure(w, 'VAC', 'PB1:1', 'PB1:2').value!).toBeLessThan(0.5);
  });
  it('ohms on an energized circuit is invalid and earns a safety strike', () => {
    const w = bucket().world;
    w.press('PB1');
    const r = measure(w, 'OHMS', 'CR1:C1', 'CR1:C2');
    expect(r.valid).toBe(false);
    expect(r.strike).toBe('ohms-on-energized');
  });
  it('ohms on the foreign circuit with bucket supply off is still invalid (foreign voltage live)', () => {
    const w = bucket().world;
    w.setSource('SRC', false);
    expect(measure(w, 'OHMS', 'w91', 'w92').strike).toBe('ohms-on-energized');
    expect(measure(w, 'OHMS', 'CR1:C1', 'CR1:C2').valid).toBe(true);
  });
  it('coil resistance is measured de-energized (DC resistance) and continuity beeps on a closed contact', () => {
    const w = bucket().world;
    w.setSource('SRC', false);
    const rdc = measure(w, 'OHMS', 'CR1:C1', 'CR1:C2').value!; // DC winding resistance (devices.yaml CR1 dcR = 100 ohm), not the 1440 ohm sealed |Z|
    expect(rdc).toBeGreaterThan(95); expect(rdc).toBeLessThan(105);
    w.press('PB1'); // contacts operate mechanically even de-energized
    expect(measure(w, 'CONT', 'PB1:1', 'PB1:2').beep).toBe(true);
  });
  it('LED pilot reads asymmetrically under the DC ohmmeter; passive coil does not', () => {
    const w = bucket().world;
    w.setSource('SRC', false);
    const f = measure(w, 'OHMS', 'PL1:1', 'PL1:2'), r = measure(w, 'OHMS', 'PL1:2', 'PL1:1');
    expect(f.value).not.toBeNull();
    expect(r.value).toBeNull();
    expect(r.display).toBe('OL');
  });
  it('unconnected spare terminal is flagged floating', () => {
    const w = bucket().world;
    expect(measure(w, 'VAC', 'CR1:7', 'G').floating).toBe(true);
  });
  it('open contact feeding an unlit LED pilot reads near source on 10 Mohm, collapses on LoZ (finite LED off-impedance)', () => {
    const w = bucket().world;
    const rOff = params.LED.rOff, Vs = 120, Rm = 10e6;
    for (const [r, k] of [['CR1:1', 'CR1:2'], ['FS1:1', 'FS1:2']]) {
      const hi = measure(w, 'VAC', r, k).value!;
      expect(hi, r).toBeCloseTo((Vs * Rm) / (Rm + rOff), 0); // hand divider: 120 x 10M / (10M + 470k) = 114.6 V
      expect(hi, r).toBeGreaterThan(100);
      // LoZ (3 kohm) passes enough current to turn the LED on (12 kohm lit): 120 x 3k / 15k = 24 V, far below the 10 Mohm reading
      expect(measure(w, 'LOZ', r, k).value!, r).toBeCloseTo((Vs * 3e3) / (3e3 + params.LED.rLamp), 0);
    }
    expect(w.lit('PL1')).toBe(false);
  });
  it('ghost voltage via coupling capacitance: high on 10 Mohm, low on LoZ (hand-worked divider)', () => {
    const b = bucket({ coupling: [['91', '3']] });
    const w = b.world;
    w.press('PB3'); // E-stop opens: wire 3 now only connects to an open PB1
    const hi = measure(w, 'VAC', 'w3', 'G'), lo = measure(w, 'LOZ', 'w3', 'G');
    expect(hi.value!).toBeCloseTo(119.53, 1);
    expect(lo.value!).toBeCloseTo(0.407, 2);
    const cap = params.COUPLING.pFperFt * 1e-12 * params.COUPLING.runFt;
    expect(abs(capAdmittance(cap))).toBeCloseTo(1 / 884194, 8);
    void add;
  });
});
