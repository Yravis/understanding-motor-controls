// The interactive bucket: physical/schematic toggle, docked meter, controls, LOTO sheet, diagnosis + repair.
import { h, btn } from './dom';
import { renderSchematic, contactStateSentence } from './schematic';
import { renderPhysical, zoomable } from './bucketview';
import { buildBucket, Bucket, setProcessMode, LAMP_IDS } from '../model/bucket';
import { measure, Reading, MeterMode } from '../model/meter';
import { FaultDef, applyPartFix, behaviorMatches, buildFaulted, faultDefs } from '../model/faults';
import { LotoEvent, checkLoto, REQUIRED_PAIRS } from '../model/safety';
import { scoreAttempt, Score } from '../model/scoring';
import { params } from '../content';
import { BASE } from '../config';
import { PHOTO_FILE } from './physicallayout';

export interface PanelOpts {
  fault?: FaultDef | null; minMeasurements?: number; showLoto?: boolean; troubleshoot?: boolean; title: string;
  footer?: () => HTMLElement | null;
  onFinish?: (r: { score: Score | null; loto: LotoEvent[]; strikes: number }) => void;
}
const MODES: [MeterMode, string][] = [['VAC', 'V AC'], ['LOZ', 'LoZ V'], ['VDC', 'V DC'], ['OHMS', 'Ω'], ['CONT', 'Cont']];
const LAMP_LABEL: Record<string, string> = { PL1: 'CR1 PICKED UP', PL2: 'CR1 DROPPED OUT', PL3: 'PB2 CLOSED', PL4: 'TANK HIGH', PL5: 'AIR PRESSURE OK', PL6: 'HIGH TEMP', PL7: 'FLOW', PL8: 'TR1 TIMED', PL9: 'TR2 TIMED', PL10: 'TD3 TIMED', PL11: 'TD4 TIMED', PLF: 'REMOTE INTERLOCK (orange)' };

export function mountBucket(root: HTMLElement, o: PanelOpts): void {
  let b: Bucket = o.fault ? buildFaulted(params, o.fault) : buildBucket(params);
  const undo: Bucket[] = [];
  let view: 'physical' | 'schematic' = 'physical';
  let photoOn = false, photoOpacity = 80, photoAvailable = false, photoProbed = false;
  const photoSrc = BASE + PHOTO_FILE;
  const probePhoto = () => {
    if (photoProbed) return;
    photoProbed = true;
    const im = new Image();
    im.onload = () => { photoAvailable = true; render(); };
    im.onerror = () => { photoAvailable = false; };
    im.src = photoSrc;
  };
  let red: string | null = null, black: string | null = null, mode: MeterMode = 'VAC';
  let reading: Reading | null = null;
  let hl: string | null = null;
  let loto: LotoEvent[] = [];
  let strikes = 0, count = 0, replaced: string[] = [], suspect = '', score: Score | null = null;
  let door = true, msg = '';
  const snap = () => { undo.push({ ...b, world: b.world.clone() }); if (undo.length > 40) undo.shift(); };
  const refreshLoading = () => { if (red && black) reading = measure(b.world, mode, red, black, { applyLoading: true }); };
  const act = (f: () => void) => { snap(); f(); refreshLoading(); msg = ''; render(); };

  const liftProbes = () => { b.world.settle(); }; // drop meter loading so lamps return to the unloaded state
  const takeReading = () => {
    if (!red || !black) return;
    reading = measure(b.world, mode, red, black, { applyLoading: true });
    count++;
    if (reading.strike) strikes++;
  };
  const terminal = (id: string) => {
    if (!red || (red && black)) { if (red && black) liftProbes(); red = id; black = null; reading = null; }
    else if (id === red) { red = null; }
    else { black = id; takeReading(); }
    hl = id.startsWith('w') ? id : hl;
    render();
  };
  const remeasure = () => { if (red && black) takeReading(); };

  function controls(): HTMLElement {
    const w = b.world;
    const src = w.el<any>('SRC');
    const pbBtn = (tag: string, label: string) => {
      const d = w.devs[tag] as any;
      const el = h('button', { class: 'btn ctl' + (d.pressed ? ' active' : ''), type: 'button' }, label + (d.maintained ? (d.pressed ? ' (LATCHED)' : '') : ''));
      if (d.maintained) el.addEventListener('click', () => act(() => (d.pressed ? w.resetMaintained(tag) : w.press(tag))));
      else {
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); snap(); w.press(tag); msg = ''; render(); });
        const rel = () => { if ((w.devs[tag] as any).pressed) { w.release(tag); render(); } };
        el.addEventListener('pointerup', rel); el.addEventListener('pointercancel', rel); el.addEventListener('pointerleave', rel);
      }
      return el;
    };
    const sw = (tag: string, label: string) => btn(`${label}: ${(w.devs[tag] as any).actuated ? 'ACTUATED' : 'at rest'}`, () => act(() => w.toggleSwitch(tag)), 'ctl');
    const proc = (p: 'TANK' | 'AIR' | 'HEAT', label: string) => h('div', { class: 'row' }, h('span', { class: 'plabel' }, `${label}: ${w.procs[p].value.toFixed(0)}${w.procs[p].unit}`),
      btn('Fill', () => act(() => setProcessMode(b, p, 'fill')), 'small'), btn('Hold', () => act(() => setProcessMode(b, p, 'hold')), 'small'), btn('Drain', () => act(() => setProcessMode(b, p, 'drain')), 'small'));
    return h('div', { class: 'card' },
      h('div', { class: 'row' }, btn(`Handle: ${src.on ? 'ON' : 'OFF'} (tap to change)`, () => act(() => w.setSource('SRC', !src.on)), 'ctl'),
        btn((() => { const f = w.els.find((e) => e.id === 'F1') as any; return f?.pulled ? 'Install F1' : 'Pull F1'; })(), () => act(() => { const f = w.el<any>('F1'); f.pulled ? w.installFuse('F1') : w.pullFuse('F1'); }), 'ctl'),
        btn(door ? 'Close door' : 'Open door', () => { if (!door && src.on) { msg = 'Door is interlocked: turn the handle OFF first.'; render(); } else act(() => { door = !door; }); }, 'ctl')),
      h('div', { class: 'row' }, pbBtn('PB1', 'PB1 START (hold)'), pbBtn('PB2', 'PB2 STOP (hold)'), pbBtn('PB3', 'PB3 mushroom')),
      h('div', { class: 'row' }, sw('LS1', 'LS1 limit'), sw('FLS1', 'FLS1 flow')),
      proc('TANK', 'Tank level'), proc('AIR', 'Air pressure'), proc('HEAT', 'Temperature'),
      h('div', { class: 'row' }, h('span', { class: 'plabel' }, `Clock ${w.t.toFixed(0)} s`), btn('+1 s', () => act(() => w.advance(1)), 'small'), btn('+5 s', () => act(() => w.advance(5)), 'small'), btn('+10 s', () => act(() => w.advance(10)), 'small'),
        btn('Undo', () => { const p = undo.pop(); if (p) { b = p; render(); } }, 'small')),
      h('div', { class: 'row' }, btn('Hand-operated switches back to process', () => act(() => { for (const t of ['FS1', 'PS1', 'TS1']) w.clearOverride(t); }), 'small')));
  }

  function lamps(): HTMLElement {
    const w = b.world;
    const notes: string[] = [];
    const f1 = w.els.find((e) => e.id === 'F1') as any;
    if (f1?.pulled) notes.push('FUSE F1 IS PULLED (CPT secondary isolated from the X1 rail)');
    else if (f1?.blown) notes.push('FUSE F1 IS OPEN');
    if (w.chatter.length) notes.push('CHATTER: ' + w.chatter.join(', '));
    if (w.hum.length) notes.push('HUM/BUZZ: ' + w.hum.join(', '));
    return h('div', { class: 'card lamps' }, h('strong', {}, 'Lamps and relays'),
      h('div', { class: 'lamplist' }, ...LAMP_IDS.map((id) => { const on = w.lit(id); return h('span', { class: 'lamp' + (on ? ' on' : '') }, `${on ? '●' : '○'} ${id} ${LAMP_LABEL[id]}: ${on ? 'LIT' : 'off'}`); })),
      h('div', { class: 'small' }, `CR1 ${w.coilOn['CR1.coil'] ? 'PICKED UP' : 'dropped out'} · SOL1 ${w.coilOn['SOL1.coil'] ? 'ENERGIZED' : 'off'} · TR1 ${(w.devs.TR1 as any).out ? 'timed' : 'not timed'} · TR2 ${(w.devs.TR2 as any).out ? 'timed' : 'not timed'}`),
      ...notes.map((n) => h('div', { class: 'warn-txt' }, n)));
  }

  function meterDock(): HTMLElement {
    const r = reading;
    return h('div', { class: 'meter' },
      h('div', { class: 'readout', 'aria-live': 'polite' }, r ? r.display : '—', r && r.mode !== 'CONT' && r.unit === 'V' && r.display !== 'ERR' ? ' V' : ''),
      h('div', { class: 'probes small' }, `Red: ${red ?? 'tap a terminal'} · Black: ${black ?? (red ? 'tap a second terminal' : '—')}${r?.floating ? ' · FLOATING point' : ''}${r?.beep ? ' · 🔔 BEEP' : ''}`),
      r?.note && r.strike ? h('div', { class: 'warn-txt' }, 'SAFETY STRIKE: ' + r.note) : null,
      h('div', { class: 'modes' }, ...MODES.map(([m, l]) => h('button', { class: 'btn small' + (m === mode ? ' active' : ''), type: 'button', onclick: () => { mode = m; remeasure(); render(); } }, l)),
        btn('Clear', () => { red = null; black = null; reading = null; liftProbes(); render(); }, 'small')));
  }

  function lotoSheet(): HTMLElement {
    const ev = (e: LotoEvent, label: string) => btn(label, () => act(() => {
      if (e.step === 'isolate' && e.source === 'bucket') b.world.setSource('SRC', false);
      if (e.step === 'isolate' && e.source === 'foreign') b.world.setSource('FSRC', false);
      loto.push(e);
    }), 'small');
    const pair = h('select', { class: 'sel', id: 'pairsel', 'aria-label': 'Test pair' }, ...[...REQUIRED_PAIRS, ['w3', 'G'] as [string, string]].map((p) => h('option', { value: p.join('|') }, `${p[0]} – ${p[1]}`)));
    const chk = checkLoto(loto);
    return h('details', { class: 'card', open: !!o.showLoto },
      h('summary', {}, 'Lockout / test for absence of voltage (EXAMPLE procedure; always follow your employer’s procedure)'),
      h('p', { class: 'banner' }, 'Example procedure (standard OSHA 1910.147 + NFPA 70E 2024). Always follow your employer’s lockout/tagout procedure.'),
      h('div', { class: 'row' }, ev({ step: 'identify', source: 'bucket' }, '1 Identify bucket source'), ev({ step: 'identify', source: 'foreign' }, '1 Identify foreign source'), ev({ step: 'notify' }, '1 Notify')),
      h('div', { class: 'row' }, ev({ step: 'shutdown' }, '2 Normal shutdown')),
      h('div', { class: 'row' }, ev({ step: 'isolate', source: 'bucket' }, '3 Isolate bucket'), ev({ step: 'isolate', source: 'foreign' }, '3 Isolate remote source')),
      h('div', { class: 'row' }, ev({ step: 'lock', source: 'bucket' }, '4 Lock bucket'), ev({ step: 'tag', source: 'bucket' }, '4 Tag bucket'), ev({ step: 'lock', source: 'foreign' }, '4 Lock remote'), ev({ step: 'tag', source: 'foreign' }, '4 Tag remote')),
      h('div', { class: 'row' }, ev({ step: 'release-stored' }, '5 Relieve stored energy')),
      h('div', { class: 'row' }, btn('6 Try START (verify it cannot restart)', () => act(() => {
        // OSHA 1910.333(b)(2)(iv)(A): operate the controls to verify the equipment cannot be restarted
        const was = b.world.devActuated('CR1', 'main'); b.world.press('PB1'); const ran = b.world.devActuated('CR1', 'main') && !was; b.world.release('PB1');
        loto.push({ step: 'try-start' }); msg = ran ? 'Pressed START: CR1 PICKED UP. The equipment is NOT isolated. Stop.' : 'Pressed START: nothing operated. Equipment will not restart.';
      }), 'small')),
      h('div', { class: 'row' }, ev({ step: 'meter-known-before' }, '7a Prove meter on known source')),
      h('div', { class: 'row' }, pair, btn('7b Test absence', () => act(() => { const [a, c] = (document.getElementById('pairsel') as HTMLSelectElement).value.split('|'); const r = measure(b.world, 'VAC', a, c); count++; reading = r; red = a; black = c; loto.push({ step: 'test-absence', pair: [a, c] }); msg = `${a}–${c}: ${r.display} V${(r.value ?? 0) > 5 ? ' — VOLTAGE PRESENT. Stop.' : ' — no voltage'}`; }), 'small')),
      h('div', { class: 'row' }, ev({ step: 'meter-known-after' }, '7c Re-verify meter on known source')),
      h('div', { class: 'small' }, chk.ok ? '✔ Sequence complete and in order.' : 'Not yet complete / issues: ' + chk.violations.join('; ')));
  }

  function repairSheet(): HTMLElement {
    const w = b.world;
    const parts = w.els.filter((e) => !['source', 'cap'].includes(e.kind) && !e.id.startsWith('BOND')).map((e) => e.id);
    const sel = h('select', { class: 'sel', id: 'partsel', 'aria-label': 'Component' }, h('option', { value: '' }, '— choose a component —'), ...[...new Set(parts), 'FSRC'].map((id) => h('option', { value: id }, id.replace('W:', 'wire at ') ) ));
    const fault = o.fault ?? null;
    return h('div', { class: 'card' }, h('strong', {}, 'Work order'), h('p', {}, fault ? fault.symptom : 'Free exploration: no fault installed.'),
      h('div', { class: 'row' }, sel),
      h('div', { class: 'row' }, btn('Mark as root cause', () => { suspect = (document.getElementById('partsel') as HTMLSelectElement).value; msg = suspect ? `Root cause marked: ${suspect}` : 'Choose a component first.'; render(); }, 'small'),
        btn('Replace / repair this part', () => { const t = (document.getElementById('partsel') as HTMLSelectElement).value; if (!t) return; act(() => { const real = applyPartFix(params, b, fault, t); replaced.push(t); msg = real ? `Repaired: ${t}` : `${t} was good: replaced for nothing (penalty).`; }); }, 'small')),
      h('div', { class: 'row' }, btn('Test behavior', () => { const r = behaviorMatches(params, b, Array.from({ length: 10 }, (_, i) => i + 1)); msg = r.ok ? 'Behavior matches the reference circuit.' : 'Still behaves differently from a healthy bucket.'; render(); }, 'small'),
        btn('Submit work order', () => {
          const lotoOk = o.showLoto !== false;
          score = fault ? scoreAttempt(fault, { diagnosis: suspect || null, replaced, measurementCount: count, strikes, loto, lotoRequired: lotoOk }, o.minMeasurements ?? 1) : null;
          o.onFinish?.({ score, loto, strikes }); render();
        }, 'primary small')),
      score ? h('div', { class: 'result' }, `Root cause ${score.rootCause ? 'CORRECT' : 'WRONG'} · safety ${score.safety} · efficiency ${score.efficiency} · parts penalty ${score.partsPenalty} · total ${score.total}${score.violations.length ? ' · ' + score.violations.join('; ') : ''}`) : null);
  }

  function render(): void {
    root.replaceChildren();
    const wrap = h('div', { class: 'bucket-screen' });
    probePhoto();
    wrap.append(h('h2', {}, o.title));
    const tabs = [btn('Physical', () => { view = 'physical'; photoOn = false; render(); }, 'small' + (view === 'physical' && !photoOn ? ' active' : '')), btn('Schematic', () => { view = 'schematic'; photoOn = false; render(); }, 'small' + (view === 'schematic' ? ' active' : ''))];
    if (photoAvailable) tabs.push(btn('Photo', () => { view = 'physical'; photoOn = true; render(); }, 'small' + (view === 'physical' && photoOn ? ' active' : '')));
    wrap.append(h('div', { class: 'row' }, ...tabs));
    if (view === 'physical' && photoOn && photoAvailable) {
      const sl = h('input', { type: 'range', min: '0', max: '100', value: String(photoOpacity), class: 'photo-opacity', 'aria-label': 'Photo opacity' }) as HTMLInputElement;
      const pct = h('span', { class: 'small photo-opacity-label' }, `${photoOpacity}%`);
      sl.addEventListener('input', () => {
        photoOpacity = Number(sl.value);
        pct.textContent = `${photoOpacity}%`;
        const img = root.querySelector('.phys-photo') as HTMLImageElement | null;
        if (img) img.style.opacity = String(photoOpacity / 100);
      });
      wrap.append(h('div', { class: 'row photo-opacity-row' }, h('span', { class: 'small' }, 'Photo opacity'), sl, pct));
      wrap.append(h('div', { class: 'small photo-caption' }, 'Photo is illustrative; labels and terminal numbers come from the drawing.'));
    }
    if (msg) wrap.append(h('div', { class: 'msg', role: 'status' }, msg));
    const phys = renderPhysical(b, { red, black, highlightNet: hl, onTerminal: terminal, doorOpen: door, onDevice: (t) => { msg = t.startsWith('ch2:') ? 'Coming in Chapter 2' : `${t}: ${b.layout.devices.find((d) => d.tag === t)?.title ?? ''}`; render(); } });
    const sch = renderSchematic(b, { highlightNet: hl, onNet: (n) => { hl = hl === n ? null : n; render(); }, onTap: (id) => { const e = b.world.el<any>(id); msg = `${id}: ${e.kind === 'contact' ? contactStateSentence(b, e) : e.kind}. Tap a wire number to highlight it in both views.`; render(); } });
    if (view === 'physical') {
      const stage = h('div', { class: 'phys-stage' + (photoOn && photoAvailable ? ' photo-on' : '') });
      if (photoOn && photoAvailable) {
        phys.classList.add('photo-mode');
        const img = h('img', { class: 'phys-photo', src: photoSrc, alt: 'Photo of Bucket 1A, door open', draggable: 'false' }) as HTMLImageElement;
        img.style.opacity = String(photoOpacity / 100);
        stage.append(img);
      }
      stage.append(phys);
      wrap.append(zoomable(stage));
    } else {
      wrap.append(h('div', { class: 'schem-wrap' }, sch));
    }
    wrap.append(lamps(), controls());
    if (o.showLoto || o.troubleshoot) wrap.append(lotoSheet());
    wrap.append(repairSheet());
    const ft = o.footer?.(); if (ft) wrap.append(ft);
    root.append(wrap, meterDock());
  }
  render();
}
export { faultDefs };
