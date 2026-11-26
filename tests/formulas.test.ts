import { describe, it, expect } from 'vitest';
import { readYaml } from '../scripts/lib/content';
import * as F from '../src/model/formulas';
import { c, abs } from '../src/model/complex';
import { solve } from '../src/model/solver';
import { params } from './helpers';

const vectors = readYaml('content/test-vectors/formulas.yaml').vectors as any[];

function compute(v: any): number {
  const i = v.inputs;
  switch (v.kind) {
    case 'currentFromVA': return F.currentFromVA(i.va, i.volts);
    case 'zMagFromVA': return F.zMagFromVA(i.volts, i.va);
    case 'meterAcrossOpenContact': return F.meterAcrossOpenContact(i.volts, c(i.zm), F.coilZ(i.volts, i.va, i.pf));
    case 'coilVoltageBehindSource': return F.coilVoltageBehindSource(i.volts, c(i.zsR, i.zsX), F.coilZ(i.volts, i.va, i.pf));
    case 'voltageDivider': return F.voltageDivider(i.vin, c(i.z1), c(i.z2));
    case 'seriesR': return abs(F.seriesZ(...i.r.map((r: number) => c(r))));
    case 'parallelR': return F.parallelR(...i.r);
    case 'couplingDivider': {
      // ideal source -> coupling cap -> floating node -> meter -> ground, solved with the real solver
      const s = solve([
        { id: 'src', a: 'a', b: 'G', y: c(1e6), i: c(120e6) },
        { id: 'cap', a: 'a', b: 'n', y: F.capAdmittance(i.cpF * 1e-12, i.f) },
        { id: 'm', a: 'n', b: 'G', y: c(1 / i.zm) },
      ]);
      return abs(s.v.get('n')!);
    }
  }
  throw new Error('unknown vector kind ' + v.kind);
}

describe('hand-worked formula vectors', () => {
  for (const v of vectors) {
    it(`${v.id}: ${v.expected.value}`, () => {
      expect(v.steps.length).toBeGreaterThan(0);
      expect(Math.abs(compute(v) - v.expected.value)).toBeLessThanOrEqual(v.expected.tol);
    });
  }
  it('required exact vectors: sealed 0.0833 A / 1440 ohm, inrush 205.7 ohm, 10 Mohm across open contact', () => {
    expect(F.currentFromVA(10, 120)).toBeCloseTo(0.0833, 4);
    expect(F.zMagFromVA(120, 10)).toBe(1440);
    expect(F.zMagFromVA(120, 70)).toBeCloseTo(205.7, 1);
    const v = F.meterAcrossOpenContact(120, c(10e6), F.coilZ(120, 70, 0.6));
    expect(v).toBeCloseTo(119.9985, 4);
    expect(v.toFixed(1)).toBe('120.0');
    expect(120 / 10.0001e6).toBeLessThan(1.3e-5);
    expect(120 / 10.0001e6).toBeGreaterThan(1.1e-5);
  });
  it('meter current is far below the CR1 pickup current', () => {
    const iMeter = 120 / 10e6;
    const iPickup = (params.CR1.simPickupPct / 100) * 120 / F.zMagFromVA(120, params.CR1.inrushVA);
    expect(iMeter).toBeLessThan(iPickup / 1000);
  });
});
