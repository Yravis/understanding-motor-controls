// Bucket "1A" (Act 1): generic MCC bucket, control section only. Builds the reference netlist from device
// parameters (content/ch01/devices.yaml) plus layout metadata used by the schematic and physical views.
import { World } from './world';
import { Params, P } from './params';
import type { Coil, Contact, Led, Dev } from './types';

export interface PinView { id: string; label: string; net: string }
export interface DeviceView {
  tag: string; kind: string; title: string; designation: string; symbol: string;
  pins: PinView[]; foreign?: boolean; spare?: string[];
}
export interface RungView { n: number; label: string; series: string[]; loads: string[]; foreign?: boolean }
export interface Layout {
  devices: DeviceView[]; rungs: RungView[];
  ch2Preview: { tag: string; title: string }[];
  tbNets: string[]; // terminal strip numbering (wire numbers)
  tags: Record<string, { name: string; icon: string }>; // lamp / device captions (never color alone)
}
export interface Bucket { world: World; layout: Layout; params: Params }

export interface BucketOptions {
  seed?: number;
  zsScale?: number; // scale the source impedance (weak source tests)
  coupling?: [string, string][]; // pairs of nets sharing a raceway (ghost-voltage scenarios, illustrative)
  led?: boolean; // default true; false => incandescent pilots
}

export function buildBucket(p: Params, opt: BucketOptions = {}): Bucket {
  const w = new World();
  w.seed = opt.seed ?? 1;
  const layoutDevices: DeviceView[] = [];
  const use = (n: string) => n;
  const net = (n: string) => 'w' + n;
  const wireR = P(p, 'WIRE', 'r');

  /** Create a device pin node and its wire to the numbered net. */
  const pinTo = (dev: string, pin: string, n: string, label = pin): PinView => {
    w.els.push({ kind: 'wire', id: `W:${dev}:${pin}`, a: `${dev}:${pin}`, b: net(n), r: wireR });
    return { id: `${dev}:${pin}`, label, net: net(n) };
  };
  const addDev = (v: DeviceView) => { layoutDevices.push(v); };

  // ---- source, fuse, bond ----
  const zs = opt.zsScale ?? 1;
  w.els.push({ kind: 'source', id: 'SRC', a: 'X1', b: 'X2', volts: P(p, 'SRC', 'volts'), zsR: P(p, 'SRC', 'zsR') * zs, zsX: P(p, 'SRC', 'zsX') * zs, on: true, label: 'Control supply' });
  w.els.push({ kind: 'fuse', id: 'F1', a: 'X1', b: net('1'), rating: P(p, 'F1', 'rating'), r: P(p, 'F1', 'r'), minMeltX: P(p, 'F1', 'minMeltX'), i2tMelt: P(p, 'F1', 'i2tMelt'), blown: false, pulled: false, accum: 0 });
  w.els.push({ kind: 'wire', id: 'W:X2', a: 'X2', b: net('2'), r: wireR });
  w.els.push({ kind: 'wire', id: 'BOND:X2-G', a: 'X2', b: 'G', r: P(p, 'WIRE', 'bondR') });

  const rClosed = P(p, 'CONTACT', 'rClosed');
  const contact = (id: string, dev: string, pole: Contact['pole'], nc: boolean, a: string, b: string) => {
    w.els.push({ kind: 'contact', id, dev, pole, nc, rClosed, a, b });
  };
  const coil = (id: string, dev: string, tag: string, role: Coil['role'], a: string, b: string) => {
    w.els.push({
      kind: 'coil', id, dev, role, a, b,
      rated: P(p, tag, 'rated'), inrushVA: P(p, tag, 'inrushVA'), inrushPF: P(p, tag, 'inrushPF'), sealedVA: P(p, tag, 'sealedVA'), sealedPF: P(p, tag, 'sealedPF'), dcR: P(p, tag, 'dcR'),
      guaranteedOperatePct: [P(p, tag, 'guaranteedLowPct'), P(p, tag, 'guaranteedHighPct')], simPickupPct: P(p, tag, 'simPickupPct'), simDropoutPct: P(p, tag, 'simDropoutPct'),
    });
    w.coilOn[id] = false;
  };
  const lamp = (tag: string, hotNet: string, label: string): void => {
    const a = `${tag}:1`, b = `${tag}:2`;
    if (opt.led === false) w.els.push({ kind: 'lamp', id: tag, dev: tag, a, b, hotR: P(p, 'LAMP', 'hotR'), coldFactor: P(p, 'LAMP', 'coldFactor'), ratedV: P(p, 'LAMP', 'ratedV'), label });
    else {
      const l: Led = { kind: 'led', id: tag, dev: tag, a, b, rLamp: P(p, 'LED', 'rLamp'), rOff: P(p, 'LED', 'rOff'), vOnRms: P(p, 'LED', 'vOnRms'), vf: P(p, 'LED', 'vf'), litI: P(p, 'LED', 'litI'), label };
      w.els.push(l);
      w.ledOn[tag] = false;
    }
    addDev({ tag, kind: 'lamp', title: label, designation: tag, symbol: 'pilot-light', pins: [pinTo(tag, '1', hotNet), pinTo(tag, '2', '2')] });
  };

  // ---- Rung 1: mushroom E-stop (NC, maintained) + START (NO) -> CR1 coil ----
  w.devs.PB3 = { kind: 'pb', id: 'PB3', maintained: true, pressed: false };
  contact('PB3.c', 'PB3', 'main', true, 'PB3:1', 'PB3:2');
  addDev({ tag: 'PB3', kind: 'pb-mushroom', title: 'Mushroom PB, maintained, NC (STOP)', designation: 'PB3', symbol: 'pb-nc-mushroom', pins: [pinTo('PB3', '1', '1'), pinTo('PB3', '2', '3')] });
  w.devs.PB1 = { kind: 'pb', id: 'PB1', maintained: false, pressed: false };
  contact('PB1.c', 'PB1', 'main', false, 'PB1:1', 'PB1:2');
  addDev({ tag: 'PB1', kind: 'pb-no', title: 'START pushbutton, NO, momentary', designation: 'PB1', symbol: 'pb-no', pins: [pinTo('PB1', '1', '3'), pinTo('PB1', '2', '4')] });
  w.devs.CR1 = { kind: 'relay', id: 'CR1', coil: 'CR1.coil' };
  coil('CR1.coil', 'CR1', 'CR1', 'main', 'CR1:C1', 'CR1:C2');
  contact('CR1.NO1', 'CR1', 'main', false, 'CR1:1', 'CR1:2');
  contact('CR1.NO2', 'CR1', 'main', false, 'CR1:3', 'CR1:4');
  contact('CR1.NC1', 'CR1', 'main', true, 'CR1:5', 'CR1:6');
  contact('CR1.NC2', 'CR1', 'main', true, 'CR1:7', 'CR1:8');
  addDev({
    tag: 'CR1', kind: 'relay', title: 'Control relay CR1 (2 NO + 2 NC)', designation: 'CR1', symbol: 'relay-coil',
    pins: [pinTo('CR1', 'C1', '4', 'C1'), pinTo('CR1', 'C2', '2', 'C2'), pinTo('CR1', '1', '1'), pinTo('CR1', '2', '5'), pinTo('CR1', '3', '1'), pinTo('CR1', '4', '13'), pinTo('CR1', '5', '1'), pinTo('CR1', '6', '6')],
    spare: ['CR1:7', 'CR1:8'],
  });
  // ---- Rungs 2-3: CR1 NO and NC contacts -> lamps ----
  lamp('PL1', '5', 'PL1 green "CR1 PICKED UP"');
  lamp('PL2', '6', 'PL2 red "CR1 DROPPED OUT"');
  // ---- Rung 4: NC pushbutton -> lamp ----
  w.devs.PB2 = { kind: 'pb', id: 'PB2', maintained: false, pressed: false };
  contact('PB2.c', 'PB2', 'main', true, 'PB2:1', 'PB2:2');
  addDev({ tag: 'PB2', kind: 'pb-nc', title: 'STOP pushbutton, NC, momentary', designation: 'PB2', symbol: 'pb-nc', pins: [pinTo('PB2', '1', '1'), pinTo('PB2', '2', '7')] });
  lamp('PL3', '7', 'PL3 amber "PB2 CLOSED"');

  // ---- Sensing switches (shelf vs installed state) ----
  const sw = (tag: string, sw: Extract<Dev, { kind: 'switch' }>['sw'], nc: boolean, n: string, symbol: string, title: string, link?: { proc: string; a: number; r: number; on?: 'rising' | 'falling' }) => {
    w.devs[tag] = { kind: 'switch', id: tag, sw, actuated: false, link: link ? { proc: link.proc, actuateOn: link.on ?? 'rising', threshold: link.a, release: link.r } : undefined };
    contact(`${tag}.c`, tag, 'main', nc, `${tag}:1`, `${tag}:2`);
    addDev({ tag, kind: 'switch-' + sw, title, designation: tag, symbol, pins: [pinTo(tag, '1', '1'), pinTo(tag, '2', n)] });
  };
  const proc = (id: string, tag: string, label: string, unit: string) => {
    w.procs[id] = { id, label, unit, value: P(p, tag, 'initial'), target: P(p, tag, 'initial'), tau: P(p, tag, 'tau'), basis: 'illustrative' };
  };
  proc('TANK', 'TANK', 'Tank level', '%');
  proc('AIR', 'AIR', 'Air receiver pressure', 'psi');
  proc('HEAT', 'HEAT', 'Process temperature', '°F');
  sw('FS1', 'float', false, '8', 'float-no', 'Float switch FS1 (NO as manufactured)', { proc: 'TANK', a: P(p, 'TANK', 'actuate'), r: P(p, 'TANK', 'release') });
  lamp('PL4', '8', 'PL4 "TANK HIGH"');
  sw('PS1', 'pressure', false, '9', 'pressure-no', 'Pressure switch PS1 (NO)', { proc: 'AIR', a: P(p, 'AIR', 'actuate'), r: P(p, 'AIR', 'release') });
  lamp('PL5', '9', 'PL5 "AIR PRESSURE OK"');
  sw('TS1', 'temp', false, '10', 'temp-no', 'Temperature switch TS1 (NO)', { proc: 'HEAT', a: P(p, 'HEAT', 'actuate'), r: P(p, 'HEAT', 'release') });
  lamp('PL6', '10', 'PL6 "HIGH TEMP"');
  sw('LS1', 'limit', true, '11', 'limit-nc', 'Limit switch LS1 (NC, mechanical)');
  w.devs.SOL1 = { kind: 'solenoid', id: 'SOL1', coil: 'SOL1.coil' };
  coil('SOL1.coil', 'SOL1', 'SOL1', 'main', 'SOL1:C1', 'SOL1:C2');
  addDev({ tag: 'SOL1', kind: 'solenoid', title: 'Solenoid valve SOL1', designation: 'SOL1', symbol: 'solenoid', pins: [pinTo('SOL1', 'C1', '11', 'C1'), pinTo('SOL1', 'C2', '2', 'C2')] });
  sw('FLS1', 'flow', false, '12', 'flow-no', 'Flow switch FLS1 (NO)');
  lamp('PL7', '12', 'PL7 "FLOW"');

  // ---- Timers, driven from CR1 NO#2 (wire 13) ----
  const timer = (tag: string, tech: 'pneumatic' | 'solid', mode: 'on' | 'off', cfg: { coil?: boolean; supplyNet?: string; triggerNet?: string }) => {
    const d: Dev = { kind: 'timer', id: tag, tech, mode, presetS: P(p, tag, 'presetS'), repeatAccuracyPct: P(p, tag, 'repeatAccuracyPct'), out: false, timing: false, expireAt: 0, lastIn: false, lastSup: false };
    w.devs[tag] = d;
    const pins: PinView[] = [];
    if (cfg.coil) { d.coil = `${tag}.coil`; coil(`${tag}.coil`, tag, tag, 'main', `${tag}:A1`, `${tag}:A2`); pins.push(pinTo(tag, 'A1', '13', 'A1'), pinTo(tag, 'A2', '2', 'A2')); }
    else {
      d.supply = `${tag}.sup`; coil(`${tag}.sup`, tag, tag, 'supply', `${tag}:A1`, `${tag}:A2`);
      pins.push(pinTo(tag, 'A1', cfg.supplyNet!, 'A1 (supply)'), pinTo(tag, 'A2', '2', 'A2'));
      if (cfg.triggerNet) { d.trigger = `${tag}.trg`; coil(`${tag}.trg`, tag, tag, 'trigger', `${tag}:T`, `${tag}:A2`); pins.push(pinTo(tag, 'T', cfg.triggerNet, 'T (trigger)')); }
    }
    contact(`${tag}.T`, tag, 'timed', false, `${tag}:1`, `${tag}:2`);
    return pins;
  };
  const timerView = (tag: string, title: string, pins: PinView[], contactNet: string, symbol: string) => {
    pins.push(pinTo(tag, '1', '1'), pinTo(tag, '2', contactNet));
    addDev({ tag, kind: 'timer', title, designation: tag, symbol, pins });
  };
  timerView('TR1', 'Pneumatic on-delay TR1 (NOTC)', timer('TR1', 'pneumatic', 'on', { coil: true }), '14', 'timer-on-notc');
  timerView('TR2', 'Pneumatic off-delay TR2 (NOTO)', timer('TR2', 'pneumatic', 'off', { coil: true }), '15', 'timer-off-noto');
  timerView('TD3', 'Solid-state on-delay TD3 (supply-timed)', timer('TD3', 'solid', 'on', { supplyNet: '13' }), '16', 'timer-on-notc');
  timerView('TD4', 'Solid-state off-delay TD4 (constant supply + trigger)', timer('TD4', 'solid', 'off', { supplyNet: '1', triggerNet: '13' }), '17', 'timer-off-noto');
  lamp('PL8', '14', 'PL8 "TR1 TIMED"');
  lamp('PL9', '15', 'PL9 "TR2 TIMED"');
  lamp('PL10', '16', 'PL10 "TD3 TIMED"');
  lamp('PL11', '17', 'PL11 "TD4 TIMED"');

  // ---- Foreign-voltage interlock circuit (remote source, orange conductors, stays live with bucket off) ----
  w.els.push({ kind: 'source', id: 'FSRC', a: 'RS1', b: 'RS2', volts: 120, zsR: P(p, 'SRC', 'zsR'), zsX: P(p, 'SRC', 'zsX'), on: true, label: 'Remote panel source' });
  w.els.push({ kind: 'wire', id: 'W:RS1', a: 'RS1', b: net('91'), r: wireR });
  w.els.push({ kind: 'wire', id: 'W:RS2', a: 'RS2', b: net('92'), r: wireR });
  w.els.push({ kind: 'wire', id: 'BOND:RS2-G', a: 'RS2', b: 'G', r: P(p, 'WIRE', 'bondR') });
  w.els.push({ kind: 'led', id: 'PLF', dev: 'PLF', a: 'PLF:1', b: 'PLF:2', rLamp: P(p, 'LED', 'rLamp'), rOff: P(p, 'LED', 'rOff'), vOnRms: P(p, 'LED', 'vOnRms'), vf: P(p, 'LED', 'vf'), litI: P(p, 'LED', 'litI'), label: 'PLF "REMOTE INTERLOCK"' });
  w.ledOn.PLF = false;
  addDev({ tag: 'PLF', kind: 'lamp', title: 'PLF "REMOTE INTERLOCK" (orange circuit, remote source)', designation: 'PLF', symbol: 'pilot-light', foreign: true, pins: [pinTo('PLF', '1', '91'), pinTo('PLF', '2', '92')] });

  // ---- optional coupling capacitance between conductors sharing a raceway (illustrative) ----
  for (const [a, b] of opt.coupling ?? []) {
    w.els.push({ kind: 'cap', id: `CPL:${a}-${b}`, a: net(a), b: net(b), c: P(p, 'COUPLING', 'pFperFt') * 1e-12 * P(p, 'COUPLING', 'runFt') });
  }

  const rungs: RungView[] = [
    { n: 1, label: 'START circuit', series: ['PB3.c', 'PB1.c'], loads: ['CR1.coil'] },
    { n: 2, label: 'CR1 NO contact', series: ['CR1.NO1'], loads: ['PL1'] },
    { n: 3, label: 'CR1 NC contact', series: ['CR1.NC1'], loads: ['PL2'] },
    { n: 4, label: 'NC pushbutton', series: ['PB2.c'], loads: ['PL3'] },
    { n: 5, label: 'Float switch', series: ['FS1.c'], loads: ['PL4'] },
    { n: 6, label: 'Pressure switch', series: ['PS1.c'], loads: ['PL5'] },
    { n: 7, label: 'Temperature switch', series: ['TS1.c'], loads: ['PL6'] },
    { n: 8, label: 'Limit switch + solenoid', series: ['LS1.c'], loads: ['SOL1.coil'] },
    { n: 9, label: 'Flow switch', series: ['FLS1.c'], loads: ['PL7'] },
    { n: 10, label: 'Timer coils (CR1 NO #2)', series: ['CR1.NO2'], loads: ['TR1.coil', 'TR2.coil', 'TD3.sup', 'TD4.trg'] },
    { n: 11, label: 'TD4 constant supply', series: [], loads: ['TD4.sup'] },
    { n: 12, label: 'TR1 timed contact', series: ['TR1.T'], loads: ['PL8'] },
    { n: 13, label: 'TR2 timed contact', series: ['TR2.T'], loads: ['PL9'] },
    { n: 14, label: 'TD3 timed contact', series: ['TD3.T'], loads: ['PL10'] },
    { n: 15, label: 'TD4 timed contact', series: ['TD4.T'], loads: ['PL11'] },
    { n: 91, label: 'Remote interlock (orange, foreign source)', series: [], loads: ['PLF'], foreign: true },
  ];
  const layout: Layout = {
    devices: layoutDevices, rungs,
    ch2Preview: [
      { tag: 'DISC', title: 'Disconnect' }, { tag: 'PF', title: 'Power fuses' }, { tag: 'M', title: 'Contactor / starter' },
      { tag: 'OL', title: 'Overload relay' }, { tag: 'MTR', title: 'Motor' },
    ],
    tbNets: ['X1', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '91', '92', 'G'],
    tags: {},
  };
  use('');
  w.settle();
  return { world: w, layout, params: p };
}

/** Process modes: fill/hold/drain move the process target (illustrative first-order models). */
export function setProcessMode(b: Bucket, proc: 'TANK' | 'AIR' | 'HEAT', mode: 'fill' | 'hold' | 'drain'): void {
  const w = b.world;
  const tag = proc;
  const t = mode === 'fill' ? P(b.params, tag, 'fillTarget') : mode === 'drain' ? P(b.params, tag, 'drainTarget') : w.procs[proc].value;
  w.setTarget(proc, t);
}

export const LAMP_IDS = ['PL1', 'PL2', 'PL3', 'PL4', 'PL5', 'PL6', 'PL7', 'PL8', 'PL9', 'PL10', 'PL11', 'PLF'];
export function snapshotBehavior(w: World) {
  return {
    lamps: Object.fromEntries(LAMP_IDS.map((id) => [id, w.lit(id)])),
    coils: Object.fromEntries(Object.entries(w.coilOn).map(([k, v]) => [k, v])),
    timers: Object.fromEntries(Object.values(w.devs).filter((d) => d.kind === 'timer').map((d) => [d.id, (d as Extract<Dev, { kind: 'timer' }>).out])),
    fuse: w.els.filter((e) => e.kind === 'fuse').map((e) => (e as { blown: boolean }).blown),
  };
}
