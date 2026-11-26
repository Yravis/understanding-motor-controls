import { describe, it, expect } from 'vitest';
import { bucket } from './helpers';
import { abs } from '../src/model/complex';
import { coilVoltageBehindSource, coilZ } from '../src/model/formulas';
import { c } from '../src/model/complex';
import type { Coil, Contact } from '../src/model/types';

describe('coil inrush vs sealed', () => {
  it('draws inrush current dropped out and sealed current when picked up', () => {
    const w = bucket().world;
    w.press('PB1');
    expect(w.coilOn['CR1.coil']).toBe(true);
    expect(abs(w.currentThrough('CR1.coil'))).toBeCloseTo(10 / 120, 2); // sealed
    w.release('PB1');
    // force dropped-out state to read inrush current: coil energized from rest
    const w2 = bucket().world;
    w2.el<Coil>('CR1.coil').simPickupPct = 999; // cannot pick up
    w2.press('PB1');
    expect(w2.coilOn['CR1.coil']).toBe(false);
    expect(abs(w2.currentThrough('CR1.coil'))).toBeCloseTo(120 / 205.714, 2);
  });
});

describe('pickup/dropout hysteresis', () => {
  const setV = (w: ReturnType<typeof bucket>['world'], v: number) => { (w.el('SRC') as { volts: number }).volts = v; w.settle(); };
  it('picks up above pickup, holds down to dropout, drops below', () => {
    const w = bucket().world;
    w.press('PB1');
    expect(w.coilOn['CR1.coil']).toBe(true);
    setV(w, 70); expect(w.coilOn['CR1.coil']).toBe(true);   // 58% > 50% dropout: still held
    setV(w, 55); expect(w.coilOn['CR1.coil']).toBe(false);  // 46% < dropout
    setV(w, 70); expect(w.coilOn['CR1.coil']).toBe(false);  // 58% < 75% pickup: does not re-pick
    setV(w, 100); expect(w.coilOn['CR1.coil']).toBe(true);
  });
});

describe('source sag at energization: at / above / below pickup', () => {
  const zs = { r: 40, x: 40 };
  const pct = (100 * coilVoltageBehindSource(120, c(zs.r, zs.x), coilZ(120, 70, 0.6))) / 120;
  for (const [label, delta, expectOn] of [['above', -1, true], ['below', +1, false]] as const) {
    it(`${label} pickup threshold`, () => {
      const w = bucket().world;
      const s = w.el('SRC') as { zsR: number; zsX: number };
      s.zsR = zs.r; s.zsX = zs.x;
      const probe = bucket().world; (probe.el('SRC') as { zsR: number; zsX: number }).zsR = zs.r; (probe.el('SRC') as { zsR: number; zsX: number }).zsX = zs.x;
      probe.el<Coil>('CR1.coil').simPickupPct = 999; probe.press('PB1');
      const actual = probe.coilVoltagePct('CR1.coil');
      expect(Math.abs(actual - pct)).toBeLessThan(6); // hand formula ignores the other bucket loads
      w.el<Coil>('CR1.coil').simPickupPct = actual + delta;
      w.press('PB1');
      expect(w.coilOn['CR1.coil']).toBe(expectOn);
    });
  }
});

describe('chatter emerges from source impedance and shared load', () => {
  function chatters(scale: number): boolean {
    const w = bucket({ zsScale: scale }).world;
    const k = w.el<Coil>('CR1.coil'); k.simPickupPct = 60; k.simDropoutPct = 55; // test fixture thresholds
    for (const t of ['TR1.coil', 'TR2.coil']) w.el<Coil>(t).inrushVA = 300; // fixture: heavy loads switched by CR1 NO #2
    w.press('PB1');
    return w.chatter.includes('CR1.coil');
  }
  it('no chatter on the normal stiff source', () => expect(chatters(1)).toBe(false));
  it('some weak-source value makes the relay chatter (pick up -> timers load the source -> drop out -> repeat)', () => {
    let found = false;
    for (let s = 20; s <= 200; s += 10) if (chatters(s)) { found = true; break; }
    expect(found).toBe(true);
  });
});

describe('broken shading ring flag', () => {
  it('hums only while energized', () => {
    const w = bucket().world;
    w.el<Coil>('CR1.coil').shadingRingBroken = true;
    w.settle(); expect(w.hum).toEqual([]);
    w.press('PB1'); expect(w.hum).toEqual(['CR1.coil']);
  });
});

describe('contact state tables (shelf vs operated)', () => {
  const closed = (w: ReturnType<typeof bucket>['world'], id: string) => w.contactClosed(w.el<Contact>(id));
  it('pushbuttons', () => {
    const w = bucket().world;
    expect([closed(w, 'PB1.c'), closed(w, 'PB2.c'), closed(w, 'PB3.c')]).toEqual([false, true, true]);
    w.press('PB1'); w.press('PB2'); w.press('PB3');
    expect([closed(w, 'PB1.c'), closed(w, 'PB2.c'), closed(w, 'PB3.c')]).toEqual([true, false, false]);
    w.release('PB1'); w.release('PB2');
    expect([closed(w, 'PB1.c'), closed(w, 'PB2.c'), closed(w, 'PB3.c')]).toEqual([false, true, false]); // maintained stays
    w.resetMaintained('PB3');
    expect(closed(w, 'PB3.c')).toBe(true);
  });
  it('relay NO/NC and switches', () => {
    const w = bucket().world;
    expect([closed(w, 'CR1.NO1'), closed(w, 'CR1.NC1')]).toEqual([false, true]);
    w.press('PB1');
    expect([closed(w, 'CR1.NO1'), closed(w, 'CR1.NC1')]).toEqual([true, false]);
    for (const [id, shelf] of [['FS1.c', false], ['PS1.c', false], ['TS1.c', false], ['LS1.c', true], ['FLS1.c', false]] as const) {
      const w2 = bucket().world;
      expect(closed(w2, id)).toBe(shelf);
      w2.toggleSwitch(id.split('.')[0]);
      expect(closed(w2, id)).toBe(!shelf);
    }
  });
  it('float switch: normal state is as manufactured, tank level drives actuation', () => {
    const w = bucket().world;
    expect(closed(w, 'FS1.c')).toBe(false); // empty-ish tank (20%): shelf state
    w.setTarget('TANK', 100); w.advance(60);
    expect(closed(w, 'FS1.c')).toBe(true);
    w.setTarget('TANK', 0); w.advance(5);
    expect(closed(w, 'FS1.c')).toBe(true); // hysteresis: not yet below release
    w.advance(60);
    expect(closed(w, 'FS1.c')).toBe(false);
  });
});
