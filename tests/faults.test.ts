import { describe, it, expect } from 'vitest';
import { params, bucket } from './helpers';
import { faultDefs, buildFaulted, repair, behaviorMatches, runScript, candidateProbes, observations, distinguishes, STANDARD_SEQUENCE } from '../src/model/faults';
import { buildBucket, snapshotBehavior } from '../src/model/bucket';
import { lintDesignRules } from '../src/model/lint';
import { checkLoto, perfectLoto } from '../src/model/safety';
import { scoreAttempt, minimalMeasurements } from '../src/model/scoring';

const defs = faultDefs(params);
const seeds = Array.from({ length: 150 }, (_, i) => i + 1);

describe('design-rule lint on the reference circuit', () => {
  it('contacts on X1 side, coils/loads on X2', () => expect(lintDesignRules(bucket().world)).toEqual([]));
  it('flags the deliberate X2-side contact miswire', () => {
    const f = defs.find((d) => d.id === 'contact-on-x2-side')!;
    expect(lintDesignRules(buildFaulted(params, f).world).length).toBeGreaterThan(0);
  });
});

describe('fault inventory', () => {
  it('has every fault from the brief', () => {
    for (const id of ['open-coil', 'shorted-coil', 'welded-contact', 'high-resistance-contact', 'loose-terminal', 'open-wire', 'float-no-nc-miswire', 'contact-on-x2-side', 'wrong-timer-type', 'ss-offdelay-no-constant-supply', 'stuck-limit-switch', 'broken-shading-ring', 'foreign-voltage-bucket-off'])
      expect(defs.some((d) => d.id === id), id).toBe(true);
    expect(defs.filter((d) => d.id.startsWith('x1-ground-fault')).length).toBe(2);
  });
  it('every fault has cause, symptom, fixActions', () => {
    for (const d of defs) { expect(d.cause.length).toBeGreaterThan(10); expect(d.symptom.length).toBeGreaterThan(10); expect(d.fixActions.length).toBeGreaterThan(0); }
  });
});

describe('distinguishability', () => {
  const probes = candidateProbes(bucket());
  const obs = new Map<string, Map<string, string>>();
  obs.set('healthy', observations(bucket(), probes));
  for (const d of defs) obs.set(d.id, observations(buildFaulted(params, d), probes));
  it('each fault differs from the healthy bucket by a measurement or lamp/hum observation', () => {
    for (const d of defs) expect(distinguishes(obs.get(d.id)!, obs.get('healthy')!).length, d.id).toBeGreaterThan(0);
  });
  it('every pair of faults is uniquely identifiable', () => {
    for (let i = 0; i < defs.length; i++) for (let j = i + 1; j < defs.length; j++)
      expect(distinguishes(obs.get(defs[i].id)!, obs.get(defs[j].id)!).length, `${defs[i].id} vs ${defs[j].id}`).toBeGreaterThan(0);
  });
  it('behavioral faults change behavior under their scripted sequence', () => {
    for (const d of defs.filter((x) => !x.behaviorSame)) {
      const b = buildFaulted(params, d);
      const r = bucket();
      expect(JSON.stringify(runScript(b.world, d.sequence, b)) !== JSON.stringify(runScript(r.world, d.sequence, r)), d.id).toBe(true);
    }
  });
  it('minimal measurement count exists for each fault', () => {
    for (const d of defs) { const n = minimalMeasurements(params, d, defs, obs); expect(n, d.id).toBeGreaterThan(0); expect(Number.isFinite(n), d.id).toBe(true); }
  }, 120000);
});

describe('ground faults and the fuse', () => {
  const run = (id: string, secs: number) => { const b = buildFaulted(params, defs.find((d) => d.id === id)!); b.world.advance(secs); return b.world; };
  it('bolted X1-to-enclosure fault clears the fuse via the EGC path', () => {
    const w = run('x1-ground-fault-clears-fuse', 1);
    expect(w.els.find((e) => e.id === 'F1')).toMatchObject({ blown: true });
  });
  it('high-impedance fault carries less than the melt current and does not clear', () => {
    const b = buildFaulted(params, defs.find((d) => d.id === 'x1-ground-fault-high-impedance')!);
    const i = b.world.fuseI.F1;
    expect(i).toBeGreaterThan(0.5);
    expect(i).toBeLessThan(params.F1.minMeltX * params.F1.rating);
    b.world.advance(3600);
    expect(b.world.els.find((e) => e.id === 'F1')).toMatchObject({ blown: false });
  });
  it('shorted coil clears the fuse when START is pressed', () => {
    const b = buildFaulted(params, defs.find((d) => d.id === 'shorted-coil')!);
    b.world.press('PB1'); b.world.advance(1);
    expect(b.world.els.find((e) => e.id === 'F1')).toMatchObject({ blown: true });
  });
});

describe('repairs restore reference behavior (scripted + 150 seeded random sequences)', () => {
  const refSnap = JSON.stringify(runScript(bucket().world, STANDARD_SEQUENCE));
  for (const d of defs) {
    if (d.id === 'foreign-voltage-bucket-off') continue; // an isolation scenario, not a repair
    it(d.id, () => {
      const b = buildFaulted(params, d);
      repair(params, b, d);
      expect(JSON.stringify(runScript(b.world, STANDARD_SEQUENCE))).toBe(refSnap);
      const fresh = buildFaulted(params, d); repair(params, fresh, d);
      expect(behaviorMatches(params, fresh, seeds).ok).toBe(true);
      expect(lintDesignRules(fresh.world)).toEqual([]);
    }, 120000);
  }
  it('an unrepaired fault is caught by the random sequences', () => {
    const b = buildFaulted(params, defs.find((d) => d.id === 'open-coil')!);
    expect(behaviorMatches(params, b, seeds).ok).toBe(false);
  });
});

describe('LOTO and diagnosis scoring', () => {
  it('perfect sequence passes', () => expect(checkLoto(perfectLoto())).toEqual({ ok: true, violations: [] }));
  it('missing the foreign source is a violation', () => {
    const ev = perfectLoto().filter((e) => e.source !== 'foreign' && !(e.step === 'test-absence' && e.pair?.[0] === 'w91'));
    expect(checkLoto(ev).ok).toBe(false);
  });
  it('skipping X2-G test, or testing before verifying the meter, is a violation', () => {
    expect(checkLoto(perfectLoto().filter((e) => !(e.step === 'test-absence' && e.pair?.join() === 'X2,G'))).ok).toBe(false);
    const ev = perfectLoto(); const k = ev.findIndex((e) => e.step === 'meter-known-before'); ev.splice(k, 1); ev.push({ step: 'meter-known-before' });
    expect(checkLoto(ev).ok).toBe(false);
  });
  it('scoring: root cause required, parts cannon and ohms-on-live penalized', () => {
    const f = defs[0];
    const good = scoreAttempt(f, { diagnosis: f.rootCause, replaced: ['CR1.coil'], measurementCount: 3, strikes: 0, loto: perfectLoto() }, 3);
    expect(good.passed).toBe(true);
    const cannon = scoreAttempt(f, { diagnosis: f.rootCause, replaced: ['CR1.coil', 'PB1.c', 'F1'], measurementCount: 3, strikes: 1, loto: perfectLoto() }, 3);
    expect(cannon.total).toBeLessThan(good.total);
    expect(cannon.passed).toBe(false);
    expect(scoreAttempt(f, { diagnosis: 'PB1.c', replaced: [], measurementCount: 1, strikes: 0, loto: perfectLoto() }, 3).total).toBe(0);
  });
  it('reference bucket snapshot is stable', () => {
    expect(snapshotBehavior(buildBucket(params).world).lamps.PLF).toBe(true);
  });
});
