// The meter is a circuit element: it adds its own input impedance between the probes before solving.
import { c, abs } from './complex';
import { Branch, vAcross, vOf } from './solver';
import type { World } from './world';
import { OHM_SOURCE_R, OHM_SOURCE_V } from './world';

export type MeterMode = 'VAC' | 'LOZ' | 'VDC' | 'OHMS' | 'CONT';
export const METER_HIZ = 10e6; // ohms, typical DMM VAC input (basis: typical)
export const METER_LOZ = 3e3; // ohms, typical LoZ mode (basis: typical)
export const CONT_BEEP_OHMS = 50; // typical continuity threshold (basis: typical)
export const ENERGIZED_V = 5; // rms volts at a probe (vs ground) that makes an ohm reading invalid

export interface Reading {
  mode: MeterMode; red: string; black: string;
  value: number | null; unit: string; display: string;
  valid: boolean; floating: boolean; beep: boolean;
  strike: 'ohms-on-energized' | null;
  note: string;
}

export function fmtVolts(v: number): string { return (Math.round(v * 10) / 10).toFixed(1); }
export function fmtOhms(r: number): string {
  if (r >= 40e6) return 'OL';
  if (r >= 1e6) return (r / 1e6).toFixed(2) + ' MΩ';
  if (r >= 1e3) return (r / 1e3).toFixed(2) + ' kΩ';
  return r.toFixed(1) + ' Ω';
}

export function measure(w: World, mode: MeterMode, red: string, black: string, opts?: { applyLoading?: boolean }): Reading {
  const base: Reading = { mode, red, black, value: null, unit: '', display: '', valid: true, floating: false, beep: false, strike: null, note: '' };
  const nodes = new Set(w.nodes());
  if (red === black) return { ...base, value: 0, unit: mode === 'VDC' || mode === 'VAC' || mode === 'LOZ' ? 'V' : 'Ω', display: mode.startsWith('V') || mode === 'LOZ' ? '0.0' : '0.0 Ω', note: 'both probes on the same point' };
  if (!nodes.has(red) || !nodes.has(black)) return { ...base, valid: false, display: 'ERR', note: 'unknown terminal' };

  if (mode === 'VAC' || mode === 'LOZ') {
    const zm = mode === 'VAC' ? METER_HIZ : METER_LOZ;
    const meter: Branch = { id: 'METER', a: red, b: black, y: c(1 / zm) };
    const savedLed = structuredClone(w.ledOn);
    const savedSolve = w.lastSolve;
    // pre-solve without the meter to detect floating probes (floating means no real path to reference)
    const { sol: s0 } = w.solveAC([]);
    const floating = s0.floating.has(red) || s0.floating.has(black);
    const { sol, branches } = w.solveAC([meter]);
    const val = abs(vAcross(sol, red, black));
    let note = floating ? 'a probe is on a floating (unconnected) point' : '';
    if (opts?.applyLoading) {
      w.lastSolve = { v: Object.fromEntries(sol.v), floating: [...sol.floating], branches };
      const litByMeter = Object.keys(w.ledOn).filter((id) => w.lit(id) && !savedLed[id]);
      if (litByMeter.length) note = (note ? note + ' ' : '') + `Meter loading lights ${litByMeter.join(', ')}.`;
    } else {
      w.ledOn = savedLed;
      w.lastSolve = savedSolve;
    }
    return { ...base, value: val, unit: 'V', display: fmtVolts(val), floating, note };
  }
  if (mode === 'VDC') {
    const meter: Branch = { id: 'METER', a: red, b: black, y: c(1 / METER_HIZ) };
    const { sol } = w.solveDC([meter]);
    const val = vAcross(sol, red, black).re;
    return { ...base, value: val, unit: 'V', display: fmtVolts(val), note: 'DC range on an AC circuit reads about zero' };
  }
  // OHMS / CONT: refuse if the probed circuit is energized
  const saved = structuredClone(w.ledOn);
  const { sol: s0 } = w.solveAC([]);
  w.ledOn = saved;
  const hot = Math.max(abs(vOf(s0, red)), abs(vOf(s0, black)));
  const floatingNow = s0.floating.has(red) && s0.floating.has(black);
  if (hot >= ENERGIZED_V) {
    return { ...base, valid: false, value: null, unit: 'Ω', display: 'ERR', strike: 'ohms-on-energized', note: 'Resistance measured on an energized circuit: invalid reading, and unsafe.' };
  }
  const probe: Branch = { id: 'METER', a: red, b: black, y: c(1 / OHM_SOURCE_R), i: c(OHM_SOURCE_V / OHM_SOURCE_R) };
  const { sol } = w.solveDC([probe]);
  const vm = vAcross(sol, red, black).re;
  const headroom = OHM_SOURCE_V - vm;
  const r = headroom <= 1e-6 ? Infinity : (vm * OHM_SOURCE_R) / headroom;
  const ohm = r >= 40e6 || !isFinite(r) ? Infinity : Math.max(0, r);
  const beep = mode === 'CONT' && ohm < CONT_BEEP_OHMS;
  return {
    ...base, value: isFinite(ohm) ? ohm : null, unit: 'Ω',
    display: mode === 'CONT' ? (beep ? `BEEP ${fmtOhms(ohm)}` : isFinite(ohm) ? fmtOhms(ohm) : 'OL') : fmtOhms(ohm),
    floating: floatingNow, beep,
    note: 'Model output with the circuit de-energized; parallel paths through other devices are included.',
  };
}
