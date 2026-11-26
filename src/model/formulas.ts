// Pure formulas used by the engine and by the hand-worked test vectors.
import { C, c, add, mul, div, abs, polar, scale } from './complex';

export const ohmsLawV = (i: number, r: number) => i * r;
export const ohmsLawI = (v: number, r: number) => v / r;
export const powerVI = (v: number, i: number) => v * i;
/** I = S / V */
export const currentFromVA = (va: number, v: number) => va / v;
/** |Z| = V^2 / S */
export const zMagFromVA = (v: number, va: number) => (v * v) / va;
/** Inductive coil impedance from VA and power factor: |Z| at +acos(PF). */
export function coilZ(v: number, va: number, pf: number): C {
  return polar(zMagFromVA(v, va), Math.acos(pf));
}
export const seriesZ = (...z: C[]): C => z.reduce((a, b) => add(a, b), c(0));
export const parallelZ = (...z: C[]): C => {
  let y = c(0);
  for (const x of z) y = add(y, div(c(1), x));
  return div(c(1), y);
};
export const parallelR = (...r: number[]) => 1 / r.reduce((s, x) => s + 1 / x, 0);
/** Voltage across the second element of a series divider. */
export const voltageDivider = (vin: number, z1: C, z2: C): number => abs(scale(div(z2, add(z1, z2)), vin));
/** Voltage magnitude across a meter (zm) in series with a load z, source v: meter is across an open contact. */
export const meterAcrossOpenContact = (v: number, zm: C, zLoad: C): number => abs(mul(div(zm, add(zm, zLoad)), c(v)));
/** Coil voltage at inrush instant behind source impedance zs. */
export const coilVoltageBehindSource = (v: number, zs: C, zCoil: C): number => v * abs(div(zCoil, add(zs, zCoil)));
/** Capacitive reactance coupling: Y = j*2*pi*f*C */
export const capAdmittance = (cap: number, f = 60): C => c(0, 2 * Math.PI * f * cap);
