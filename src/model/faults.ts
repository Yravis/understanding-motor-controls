// Faults are netlist mutations or condition flags with a declared physical cause (design.md 4.4).
// Expected readings are never hand-typed: they are generated from the model (see readingsTable).
import { World } from './world';
import { Bucket, BucketOptions, buildBucket, snapshotBehavior, setProcessMode } from './bucket';
import { Params, P } from './params';
import { measure, Reading } from './meter';
import { Rng } from './rng';
import type { Coil, Contact, Wire } from './types';

export type FixAction =
  | { kind: 'replace'; target: string; note: string }   // replace a device/element with a good one
  | { kind: 'tighten'; target: string; note: string }   // re-terminate a loose connection
  | { kind: 'reland'; target: string; note: string }    // land a wire on the correct terminal
  | { kind: 'remove'; target: string; note: string };   // remove an extra element (e.g. a ground fault path)

export interface FaultDef {
  id: string;
  title: string;
  cause: string;
  symptom: string;
  apply(b: Bucket): void;
  fixActions: FixAction[];
  /** Condition faults that change no on/off behavior (hazards) and are found by measurement only. */
  behaviorSame?: boolean;
  /** Needs a scripted operating sequence to show. */
  sequence: ScriptStep[];
  /** the component a correct diagnosis must name */
  rootCause: string;
  /** which parts are good (for the 'parts cannon' penalty) is derived: everything not in fixActions targets */
}

export type ScriptStep = { do: 'press' | 'release' | 'toggle' | 'advance' | 'supply' | 'mode'; dev?: string; arg?: number | boolean | string };

export const STANDARD_SEQUENCE: ScriptStep[] = [
  { do: 'press', dev: 'PB1' }, { do: 'advance', arg: 6 }, { do: 'release', dev: 'PB1' }, { do: 'advance', arg: 6 },
];

export function runScript(w: World, steps: ScriptStep[], b?: Bucket): ReturnType<typeof snapshotBehavior>[] {
  const out: ReturnType<typeof snapshotBehavior>[] = [];
  for (const s of steps) {
    switch (s.do) {
      case 'press': w.press(s.dev!); break;
      case 'release': w.release(s.dev!); break;
      case 'toggle': w.toggleSwitch(s.dev!); break;
      case 'advance': w.advance(Number(s.arg)); break;
      case 'supply': w.setSource('SRC', !!s.arg); break;
      case 'mode': if (b) setProcessMode(b, s.dev as 'TANK' | 'AIR' | 'HEAT', s.arg as 'fill' | 'hold' | 'drain'); break;
    }
    out.push(snapshotBehavior(w));
  }
  return out;
}

const W = (b: Bucket, id: string) => b.world.el<Wire>(id);

export function faultDefs(p: Params): FaultDef[] {
  return [
    {
      id: 'open-coil', title: 'Open relay coil', rootCause: 'CR1.coil',
      cause: 'The CR1 coil winding is broken (open circuit).',
      symptom: 'Operator: "I press START and nothing happens." CR1 never picks up; the green PL1 stays off and the red PL2 stays on.',
      apply: (b) => { b.world.el<Coil>('CR1.coil').open = true; },
      fixActions: [{ kind: 'replace', target: 'CR1.coil', note: 'Replace the relay (coil) after proving the coil open with the circuit de-energized.' }],
      sequence: [{ do: 'press', dev: 'PB1' }, { do: 'advance', arg: 6 }],
    },
    {
      id: 'shorted-coil', title: 'Shorted relay coil (fuse clears)', rootCause: 'CR1.coil',
      cause: 'The CR1 coil winding is shorted (insulation failure), badly enough that it draws far more current than the control fuse allows.',
      symptom: 'Operator: "When I press START everything on the bucket goes dead." Supply fuse F1 is open.',
      apply: (b) => { b.world.el<Coil>('CR1.coil').shorted = true; },
      fixActions: [{ kind: 'replace', target: 'CR1.coil', note: 'Replace the relay.' }, { kind: 'replace', target: 'F1', note: 'Replace the cleared fuse with the same rating after the cause is fixed.' }],
      sequence: [{ do: 'press', dev: 'PB1' }, { do: 'advance', arg: 1 }, { do: 'release', dev: 'PB1' }],
    },
    {
      id: 'welded-contact', title: 'Welded relay contact', rootCause: 'CR1.NO1',
      cause: 'The CR1 NO contact (pins 1-2) has welded closed.',
      symptom: 'Operator: "The green CR1 PICKED UP lamp is on even when nobody pressed START."',
      apply: (b) => { b.world.el<Contact>('CR1.NO1').welded = true; },
      fixActions: [{ kind: 'replace', target: 'CR1.NO1', note: 'Replace the relay contact block / relay.' }],
      sequence: [{ do: 'advance', arg: 1 }],
    },
    {
      id: 'high-resistance-contact', title: 'High-resistance START contact', rootCause: 'PB1.c',
      cause: 'The START pushbutton contact is burned or dirty and has high resistance when closed.',
      symptom: 'Operator: "START is sluggish, CR1 buzzes or does not pull in."',
      apply: (b) => { b.world.el<Contact>('PB1.c').extraR = P(p, 'CONTACT', 'highRFaultR'); b.world.settle(); },
      fixActions: [{ kind: 'replace', target: 'PB1.c', note: 'Replace the contact block.' }],
      sequence: [{ do: 'press', dev: 'PB1' }, { do: 'advance', arg: 6 }],
    },
    {
      id: 'loose-terminal', title: 'Loose terminal (intermittent)', rootCause: 'W:CR1:C1',
      cause: 'The wire on CR1 coil terminal C1 is loose and makes contact only some of the time.',
      symptom: 'Operator: "START works sometimes. Tapping the bucket door changes things."',
      apply: (b) => { const e = W(b, 'W:CR1:C1'); e.fault = 'intermittent'; e.intermittentOpen = true; b.world.settle(); },
      fixActions: [{ kind: 'tighten', target: 'W:CR1:C1', note: 'Re-terminate and torque the connection to the manufacturer value.' }],
      sequence: [{ do: 'press', dev: 'PB1' }, { do: 'advance', arg: 6 }],
    },
    {
      id: 'open-wire', title: 'Open (broken) wire', rootCause: 'W:PB1:2',
      cause: 'The wire from START pushbutton terminal 2 to wire 4 is broken.',
      symptom: 'Operator: "START does nothing." The coil is fine.',
      apply: (b) => { W(b, 'W:PB1:2').fault = 'open'; b.world.settle(); },
      fixActions: [{ kind: 'replace', target: 'W:PB1:2', note: 'Replace the wire and re-terminate.' }],
      sequence: [{ do: 'press', dev: 'PB1' }, { do: 'advance', arg: 6 }],
    },
    {
      id: 'float-no-nc-miswire', title: 'Float switch landed on the wrong contact (NO vs NC)', rootCause: 'FS1.c',
      cause: 'FS1 is wired to its NC contact instead of the NO contact.',
      symptom: 'Operator: "The TANK HIGH lamp is on when the tank is empty and goes out when it fills."',
      apply: (b) => { b.world.el<Contact>('FS1.c').nc = true; b.world.settle(); },
      fixActions: [{ kind: 'reland', target: 'FS1.c', note: 'Move the conductors to the NO terminals of the float switch.' }],
      sequence: [{ do: 'mode', dev: 'TANK', arg: 'fill' }, { do: 'advance', arg: 60 }],
    },
    {
      id: 'contact-on-x2-side', title: 'Contact wired on the X2 side', rootCause: 'W:CR1:1',
      cause: 'The CR1 NO contact for PL1 was wired between the lamp and X2, so the lamp terminal stays at X1 potential when the contact is open.',
      symptom: 'Operator: "Everything works." (Behavior is unchanged: a hazard found by measurement, a miswire that breaks the contacts-on-X1 rule.)',
      behaviorSame: true,
      apply: (b) => {
        W(b, 'W:PL1:1').b = 'w1'; W(b, 'W:PL1:2').b = 'w5'; W(b, 'W:CR1:1').b = 'w5'; W(b, 'W:CR1:2').b = 'w2'; b.world.settle();
      },
      fixActions: [{ kind: 'reland', target: 'W:CR1:1', note: 'Land the contact on the X1 side (wire 1).' }, { kind: 'reland', target: 'W:CR1:2', note: 'Land the contact output on wire 5.' }, { kind: 'reland', target: 'W:PL1:1', note: 'Land the lamp feed on wire 5.' }, { kind: 'reland', target: 'W:PL1:2', note: 'Land the lamp directly on X2 (wire 2).' }],
      sequence: [{ do: 'press', dev: 'PB1' }, { do: 'advance', arg: 1 }],
    },
    {
      id: 'wrong-timer-type', title: 'Wrong timer type installed', rootCause: 'TR1',
      cause: 'TR1 is labeled on-delay but an off-delay timer is installed.',
      symptom: 'Operator: "The TR1 lamp comes on immediately when START is pressed instead of after 5 seconds."',
      apply: (b) => { const d = b.world.devs.TR1; if (d.kind === 'timer') d.mode = 'off'; b.world.settle(); },
      fixActions: [{ kind: 'replace', target: 'TR1', note: 'Install an on-delay timing relay.' }],
      sequence: [{ do: 'press', dev: 'PB1' }, { do: 'advance', arg: 1 }, { do: 'advance', arg: 6 }, { do: 'release', dev: 'PB1' }, { do: 'advance', arg: 6 }],
    },
    {
      id: 'ss-offdelay-no-constant-supply', title: 'Solid-state off-delay without constant supply', rootCause: 'W:TD4:A1',
      cause: 'TD4 supply terminal A1 was landed on switched wire 13 instead of constant wire 1, so removing the trigger also removes supply.',
      symptom: 'Operator: "TD4 never delays: its lamp goes out the instant CR1 drops."',
      apply: (b) => { W(b, 'W:TD4:A1').b = 'w13'; b.world.settle(); },
      fixActions: [{ kind: 'reland', target: 'W:TD4:A1', note: 'Move the TD4 supply wire to constant wire 1.' }],
      sequence: [{ do: 'press', dev: 'PB1' }, { do: 'advance', arg: 6 }, { do: 'release', dev: 'PB1' }, { do: 'advance', arg: 1 }],
    },
    {
      id: 'stuck-limit-switch', title: 'Stuck limit switch', rootCause: 'LS1.c',
      cause: 'The LS1 actuator is jammed in the operated position, so its NC contact stays open.',
      symptom: 'Operator: "The solenoid valve never opens even though the gate is clear."',
      apply: (b) => { b.world.el<Contact>('LS1.c').stuckOpen = true; b.world.settle(); },
      fixActions: [{ kind: 'replace', target: 'LS1.c', note: 'Free or replace the limit switch.' }],
      sequence: [{ do: 'advance', arg: 1 }],
    },
    {
      id: 'broken-shading-ring', title: 'Broken shading ring (hum and chatter)', rootCause: 'CR1.coil',
      cause: 'The shading ring on the CR1 magnet is broken: a mechanical/magnetic defect, modeled as a condition flag.',
      symptom: 'Operator: "CR1 hums and buzzes loudly when it is picked up, voltage is normal."',
      apply: (b) => { b.world.el<Coil>('CR1.coil').shadingRingBroken = true; b.world.settle(); },
      fixActions: [{ kind: 'replace', target: 'CR1.coil', note: 'Replace the relay (or its magnet assembly).' }],
      behaviorSame: true,
      sequence: [{ do: 'press', dev: 'PB1' }, { do: 'advance', arg: 6 }],
    },
    {
      id: 'x1-ground-fault-clears-fuse', title: 'X1 conductor shorted to the enclosure (fuse clears via EGC)', rootCause: 'GF',
      cause: 'A damaged X1-side conductor (wire 7) touches the grounded enclosure with low impedance; current returns through the enclosure/EGC to X2 and opens the supply fuse.',
      symptom: 'Operator: "F1 blows the moment I turn the bucket on."',
      apply: (b) => { b.world.els.push({ kind: 'res', id: 'GF', a: 'w7', b: 'G', r: P(p, 'WIRE', 'groundFaultBoltedR'), label: 'ground fault path' }); b.world.settle(); },
      fixActions: [{ kind: 'remove', target: 'GF', note: 'Repair the damaged conductor; then replace the cleared fuse.' }, { kind: 'replace', target: 'F1', note: 'Replace the fuse with the same rating.' }],
      sequence: [{ do: 'advance', arg: 1 }],
    },
    {
      id: 'x1-ground-fault-high-impedance', title: 'X1 high-impedance ground fault (does NOT clear)', rootCause: 'GF',
      cause: 'The same X1 conductor touches the enclosure through a high-impedance path (damp, damaged insulation). Current is too small to open the fuse: a hazard.',
      symptom: 'Operator: "No problem, everything runs." (A hazard: the fault does not open the fuse and is found by measurement.)',
      behaviorSame: true,
      apply: (b) => { b.world.els.push({ kind: 'res', id: 'GF', a: 'w7', b: 'G', r: P(p, 'WIRE', 'groundFaultHighZR'), label: 'ground fault path' }); b.world.settle(); },
      fixActions: [{ kind: 'remove', target: 'GF', note: 'Repair the damaged conductor.' }],
      sequence: [{ do: 'advance', arg: 60 }],
    },
    {
      id: 'foreign-voltage-bucket-off', title: 'Foreign voltage present with the bucket off', rootCause: 'FSRC',
      cause: 'The orange interlock circuit is fed from a remote panel and stays energized when the bucket supply is off.',
      symptom: 'Technician: "The bucket handle is off but the REMOTE INTERLOCK lamp is lit."',
      behaviorSame: true,
      apply: (b) => { b.world.el('SRC'); (b.world.el('SRC') as { on: boolean }).on = false; b.world.settle(); },
      fixActions: [{ kind: 'remove', target: 'FSRC', note: 'Isolate and lock out the remote source (this is part of the lockout, not a repair).' }],
      sequence: [{ do: 'advance', arg: 1 }],
    },
  ];
}

export function buildFaulted(p: Params, f: FaultDef, opt?: BucketOptions): Bucket {
  const b = buildBucket(p, opt);
  f.apply(b);
  b.world.settle();
  return b;
}

/** Apply fixActions: restore each target from a freshly built reference bucket. */
export function repair(p: Params, b: Bucket, f: FaultDef, opt?: BucketOptions): void {
  const ref = buildBucket(p, opt);
  for (const fx of f.fixActions) {
    const w = b.world;
    if (fx.kind === 'remove') { w.els = w.els.filter((e) => e.id !== fx.target); if (fx.target === 'FSRC') { /* isolation, not repair */ } continue; }
    if (fx.target in w.devs) { w.devs[fx.target] = structuredClone(ref.world.devs[fx.target]); }
    const i = w.els.findIndex((e) => e.id === fx.target);
    const r = ref.world.els.find((e) => e.id === fx.target);
    if (i >= 0 && r) w.els[i] = structuredClone(r);
    // timers & relays: replacing the device resets matching coil/contacts too
    if (fx.kind === 'replace' && fx.target in ref.world.devs) {
      for (const e of ref.world.els) if ('dev' in e && (e as { dev: string }).dev === fx.target) { const j = w.els.findIndex((x) => x.id === e.id); if (j >= 0) w.els[j] = structuredClone(e); }
    }
    if (fx.target === 'CR1.coil') for (const e of ref.world.els) if ('dev' in e && (e as { dev: string }).dev === 'CR1') { const j = w.els.findIndex((x) => x.id === e.id); if (j >= 0) w.els[j] = structuredClone(e); }
  }
  for (const k of Object.keys(b.world.coilOn)) b.world.coilOn[k] = false; // a repaired circuit starts from rest
  b.world.settle();
}

// ---- behavior-based verification ------------------------------------------------------------------------
export type RandomStep = ScriptStep;
export function randomSequence(seed: number, n = 14): ScriptStep[] {
  const r = new Rng(seed);
  const out: ScriptStep[] = [];
  for (let i = 0; i < n; i++) {
    switch (r.int(10)) {
      case 0: out.push({ do: 'press', dev: 'PB1' }); break;
      case 1: out.push({ do: 'release', dev: 'PB1' }); break;
      case 2: out.push({ do: 'press', dev: 'PB2' }); out.push({ do: 'release', dev: 'PB2' }); break;
      case 3: out.push({ do: 'press', dev: 'PB3' }); break;
      case 4: out.push({ do: 'toggle', dev: 'LS1' }); break;
      case 5: out.push({ do: 'toggle', dev: 'FLS1' }); break;
      case 6: out.push({ do: 'mode', dev: r.pick(['TANK', 'AIR', 'HEAT']), arg: r.pick(['fill', 'hold', 'drain']) }); break;
      case 7: out.push({ do: 'supply', arg: r.bool(0.8) }); break;
      default: out.push({ do: 'advance', arg: r.pick([0.5, 1, 2, 5, 8, 20]) });
    }
  }
  out.push({ do: 'supply', arg: true });
  return out;
}

export function behaviorMatches(p: Params, repaired: Bucket, seeds: number[], opt?: BucketOptions): { ok: boolean; seed?: number } {
  for (const seed of seeds) {
    const seq = randomSequence(seed);
    const ref = buildBucket(p, opt);
    const rep = structuredCloneBucket(repaired);
    const a = JSON.stringify(runScript(ref.world, seq, ref));
    const bb = JSON.stringify(runScript(rep.world, seq, rep));
    if (a !== bb) return { ok: false, seed };
  }
  return { ok: true };
}
export function structuredCloneBucket(b: Bucket): Bucket { return { ...b, world: b.world.clone() }; }

// ---- distinguishability ---------------------------------------------------------------------------------
export interface Observation { key: string; value: string }
/** Probe pairs that a technician would realistically take: across every device (pin to pin), from each pin to its net, to ground/rails. */
export function candidateProbes(b: Bucket): [string, string][] {
  const pairs: [string, string][] = [];
  const nets = new Set<string>(); const pins: string[] = [];
  for (const d of b.layout.devices) for (const p of d.pins) { pins.push(p.id); nets.add(p.net); }
  for (const d of b.layout.devices) {
    for (let i = 0; i < d.pins.length; i++) { pairs.push([d.pins[i].id, d.pins[i].net]); }
  }
  for (const e of b.world.els) if (e.kind !== 'wire' && !e.id.startsWith('BOND') && e.kind !== 'cap') pairs.push([e.a, e.b]);
  for (const pid of pins) { pairs.push([pid, 'G']); }
  for (const n of ['X1', 'w1', 'w2', 'w91', 'w92']) pairs.push([n, 'G']);
  pairs.push(['X1', 'X2'], ['w1', 'w2'], ['w91', 'w92'], ['X2', 'G']);
  const seen = new Set<string>();
  return pairs.filter(([a, c]) => { const k = a + '|' + c; if (a === c || seen.has(k)) return false; seen.add(k); return true; });
}

export interface ObsState { id: string; run: (b: Bucket) => void; mode: 'VAC' | 'OHMS' }
export const OBS_STATES: ObsState[] = [
  { id: 'idle', run: () => {}, mode: 'VAC' },
  { id: 'start-held', run: (b) => { b.world.press('PB1'); b.world.advance(1); }, mode: 'VAC' },
  { id: 'dead-ohms', run: (b) => { b.world.setSource('SRC', false); b.world.setSource('FSRC', false); }, mode: 'OHMS' },
];

export function observations(b0: Bucket, probes: [string, string][]): Map<string, string> {
  // Voltage observations use the unloaded node voltages (one solve per state); ohm observations run the
  // DC meter model only for device-internal pairs (the pairs a technician would actually meter).
  const out = new Map<string, string>();
  for (const st of OBS_STATES) {
    const b = structuredCloneBucket(b0);
    st.run(b);
    const wld = b.world;
    const nodes = new Set(wld.nodes());
    for (const [r, k] of probes) {
      if (!nodes.has(r) || !nodes.has(k)) { out.set(`${st.id}:${r}>${k}`, 'n/a'); continue; }
      if (st.mode === 'VAC') {
        const dv = wld.v(r, k);
        out.set(`${st.id}:${r}>${k}`, String(Math.round(Math.hypot(dv.re, dv.im) / 2)));
      } else if (r === 'G' || k === 'G' || r.split(':')[0] === k.split(':')[0]) {
        const rd = measure(wld, 'OHMS', r, k);
        out.set(`${st.id}:${r}>${k}`, rd.value === null ? rd.display : String(Math.round(Math.log10(Math.max(rd.value, 0.01)) * 4)));
      }
    }
    out.set(`${st.id}:hum`, wld.hum.join(','));
    out.set(`${st.id}:lit`, Object.keys(wld.ledOn).filter((id) => wld.lit(id)).join(','));
    out.set(`${st.id}:fuse`, String(wld.els.some((e) => e.kind === 'fuse' && (e as { blown: boolean }).blown)));
  }
  return out;
}
export function distinguishes(a: Map<string, string>, c: Map<string, string>): string[] {
  const keys: string[] = [];
  for (const [k, v] of a) if (c.get(k) !== v) keys.push(k);
  return keys;
}
export type { Reading };

/** Apply a single fix action by restoring that target from a fresh reference bucket. Returns true if it was one of the fault's real fixes. */
export function applyPartFix(p: Params, b: Bucket, f: FaultDef | null, target: string, opt?: BucketOptions): boolean {
  const real = !!f && f.fixActions.some((x) => x.target === target);
  const ref = buildBucket(p, opt);
  const w = b.world;
  if (real && f!.fixActions.find((x) => x.target === target)!.kind === 'remove') { w.els = w.els.filter((e) => e.id !== target); }
  else {
    if (target in w.devs) w.devs[target] = structuredClone(ref.world.devs[target]);
    const members = target in ref.world.devs || target === 'CR1.coil' ? ref.world.els.filter((e) => 'dev' in e && (e as { dev: string }).dev === (target === 'CR1.coil' ? 'CR1' : target)) : ref.world.els.filter((e) => e.id === target);
    for (const e of members) { const j = w.els.findIndex((x) => x.id === e.id); if (j >= 0) w.els[j] = structuredClone(e); }
  }
  if (target === 'F1' || real) { /* fuse replacement restores a fresh fuse via members above */ }
  for (const k of Object.keys(w.coilOn)) w.coilOn[k] = false;
  w.settle();
  return real;
}
