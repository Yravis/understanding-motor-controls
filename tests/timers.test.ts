import { describe, it, expect } from 'vitest';
import { bucket } from './helpers';

const out = (w: ReturnType<typeof bucket>['world'], id: string) => (w.devs[id] as { out: boolean }).out;

describe('on-delay (TR1, preset 5 s)', () => {
  it('boundary: just before, at, just after preset (equality counts as timed out)', () => {
    const w = bucket().world; w.press('PB1');
    w.advance(4.999); expect(out(w, 'TR1')).toBe(false);
    w.advance(0.001); expect(out(w, 'TR1')).toBe(true);
    w.advance(0.5); expect(out(w, 'TR1')).toBe(true);
  });
  it('resets if the coil drops before preset; restarts from zero', () => {
    const w = bucket().world; w.press('PB1'); w.advance(3); w.release('PB1'); w.advance(10);
    expect(out(w, 'TR1')).toBe(false);
    w.press('PB1'); w.advance(4.9); expect(out(w, 'TR1')).toBe(false);
    w.advance(0.1); expect(out(w, 'TR1')).toBe(true);
  });
  it('contacts return immediately on de-energize after timing out', () => {
    const w = bucket().world; w.press('PB1'); w.advance(6); w.release('PB1');
    expect(out(w, 'TR1')).toBe(false);
  });
  it('tie rule: an input change at the same instant as timeout is applied first', () => {
    const w = bucket().world; w.press('PB1');
    w.schedule(5, { kind: 'release', dev: 'PB1' });
    w.advance(10);
    expect(w.log.some((l) => l.includes('TR1 out=true'))).toBe(false);
  });
});

describe('off-delay (TR2, preset 5 s)', () => {
  it('transfers immediately and returns after the preset', () => {
    const w = bucket().world; w.press('PB1'); expect(out(w, 'TR2')).toBe(true);
    w.release('PB1'); w.advance(4.999); expect(out(w, 'TR2')).toBe(true);
    w.advance(0.001); expect(out(w, 'TR2')).toBe(false);
  });
  it('re-energizing during timing resets the timer', () => {
    const w = bucket().world; w.press('PB1'); w.release('PB1'); w.advance(3);
    w.press('PB1'); w.advance(10); expect(out(w, 'TR2')).toBe(true);
    w.release('PB1'); w.advance(4.9); expect(out(w, 'TR2')).toBe(true);
    w.advance(0.2); expect(out(w, 'TR2')).toBe(false);
  });
  it('tie rule at re-energize instant equal to timeout: no drop-out blip', () => {
    const w = bucket().world; w.press('PB1'); w.release('PB1');
    w.schedule(5, { kind: 'press', dev: 'PB1' });
    w.advance(6);
    expect(w.log.some((l) => l.includes('TR2 out=false'))).toBe(false);
  });
});

describe('solid-state timers', () => {
  it('SS on-delay (TD3) times from supply-on', () => {
    const w = bucket().world; w.press('PB1'); w.advance(2.9); expect(out(w, 'TD3')).toBe(false); w.advance(0.2); expect(out(w, 'TD3')).toBe(true);
  });
  it('SS off-delay (TD4): trigger loss starts timing, supply stays', () => {
    const w = bucket().world; w.press('PB1'); expect(out(w, 'TD4')).toBe(true);
    w.release('PB1'); w.advance(2.9); expect(out(w, 'TD4')).toBe(true); w.advance(0.2); expect(out(w, 'TD4')).toBe(false);
  });
  it('SS off-delay: supply loss drops the output immediately (no timing)', () => {
    const w = bucket().world; w.press('PB1'); expect(out(w, 'TD4')).toBe(true);
    w.release('PB1'); w.advance(1); w.setSource('SRC', false);
    expect(out(w, 'TD4')).toBe(false);
  });
  it('SS off-delay: re-trigger during timing resets', () => {
    const w = bucket().world; w.press('PB1'); w.release('PB1'); w.advance(2); w.press('PB1'); w.advance(5);
    expect(out(w, 'TD4')).toBe(true);
  });
});

describe('repeat accuracy', () => {
  it('jittered preset stays within tolerance and varies', () => {
    const times = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      const w = bucket({ seed }).world; w.jitter = true; w.press('PB1');
      const d = w.devs.TR1 as { expireAt: number };
      expect(d.expireAt).toBeGreaterThanOrEqual(5 * 0.9 - 1e-9); expect(d.expireAt).toBeLessThanOrEqual(5 * 1.1 + 1e-9);
      times.add(d.expireAt);
    }
    expect(times.size).toBeGreaterThan(10);
  });
  it('is deterministic for a seed', () => {
    const run = () => { const w = bucket({ seed: 7 }).world; w.jitter = true; w.press('PB1'); return (w.devs.TR1 as { expireAt: number }).expireAt; };
    expect(run()).toBe(run());
  });
});
