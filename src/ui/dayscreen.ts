// The one-screen day: top bar, step strip, the bucket (hero) with coach + floating meter, right-hand tab dock, status bar.
// All state that matters lives on save.session.ui (and the session's question fields), so tab switches, view switches and reloads resume exactly here.
import { h, btn } from './dom';
import { renderBucket2 } from './bucket2';
import { bucket2Terms, GOTOS, devRect } from './bucket2layout';
import { createViewport, type Viewport } from './viewport';
import { createCoach, type Coach } from './coach';
import { createDock, type Dock } from './dock';
import { makeDraggable, clampPos } from './drag';
import { symbolFigure } from './symbols';
import { mountBucket } from './bucketpanel';
import { buildBucket, type Bucket } from '../model/bucket';
import { measure, type Reading, type MeterMode } from '../model/meter';
import { faultDefs } from '../model/faults';
import { getSave, commit as commitSave } from '../game/save';
import { defaultUi, LOG_MAX, type DayUi, type InProgressSession, type MeterModeId } from '../game/session';
import { stepsForDay, currentStep, latchDone, isStepDone, stepCounts, nextTarget, isNativeDay, untaught, type StepDef, type StepCtx } from '../game/steps';
import { planDay } from '../game/daystart';
import { finishNativeActivity, finishClassicActivity, finishDay } from '../game/flow';
import { dayKey, RANK_TITLE, rank } from '../game/progress';
import { patchSession } from '../game/session';
import { params, faults, items } from '../content';
import { BASE, SHOW_UNREVIEWED } from '../config';
import { PHOTO_FILE } from './physicallayout';

export type NavView = 'home' | 'lessons' | 'practice' | 'progress' | 'settings';
export interface DayScreenOpts {
  onNavigate: (v: NavView) => void;
  /** Day finished and dismissed. `extra` = the learner asked for an extra rep. */
  onExit: (extra: boolean) => void;
  today?: string;
}
export interface DayScreen { el: HTMLElement; destroy(): void; /** test hooks */ debug: { reading(): Reading | null; ui(): DayUi; bucket(): Bucket } }

const MODES: [MeterModeId, string][] = [['VAC', 'V AC'], ['LOZ', 'LoZ V'], ['VDC', 'V DC'], ['OHMS', 'Ω'], ['CONT', 'Cont']];
const MODE_NOTE: Record<MeterModeId, string> = { VAC: 'hi-Z (10 MΩ)', LOZ: 'LoZ (3 kΩ)', VDC: 'DC volts', OHMS: 'ohms (de-energized only)', CONT: 'continuity' };

/** X1 to X2, where TB1 terminal 2 is the X2 conductor (wire 2). */
export const isX1X2 = (a: string | null, b: string | null): boolean => !!a && !!b && ((a === 'X1' && (b === 'X2' || b === 'w2')) || (b === 'X1' && (a === 'X2' || a === 'w2')));

export function mountDayScreen(root: HTMLElement, o: DayScreenOpts): DayScreen {
  const save = getSave();
  const session = save.session as InProgressSession;
  if (!session) throw new Error('mountDayScreen needs an open session');
  const today = o.today ?? dayKey();
  const day = session.day;
  const plan = planDay(save, day, session.extraRep, today);
  const steps: StepDef[] = stepsForDay(day, { extraRep: session.extraRep, hasActivity: !!plan.scenario });
  const ui: DayUi = (session.ui ??= defaultUi(day));
  const native = isNativeDay(day) && !session.extraRep;

  // ---- model: rebuilt from the persisted handle / fuse state ----
  const bucket: Bucket = buildBucket(params);
  const w = bucket.world;
  const applyWorld = () => {
    if (w.el<any>('SRC').on !== ui.handleOn) w.setSource('SRC', ui.handleOn);
    const f = w.el<any>('F1');
    if (ui.fusePulled && !f.pulled) w.pullFuse('F1'); else if (!ui.fusePulled && f.pulled) w.installFuse('F1');
  };
  applyWorld();

  // ---- transient (not persisted): reading, highlight, toast, nameplate, classic bench ----
  let reading: Reading | null = null;
  let hl: string | null = null;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let classicManual = false;
  let classicNext: (() => void) | null = null;
  let nameplate: string | null = null;
  let wrapTab = false;
  const lastKey: Record<string, string> = {};
  let photoAvailable = false;

  const commit = () => commitSave();
  let viewTimer: ReturnType<typeof setTimeout> | undefined;
  const log = (text: string, kind: 'info' | 'ok' | 'warn' = 'info') => { ui.log.push({ t: Date.now(), kind, text }); if (ui.log.length > LOG_MAX) ui.log.splice(0, ui.log.length - LOG_MAX); };

  const activityDone = () => session.phase === 'activity' && (native || session.activityStarted) && (plan.faultIds.length === 0 || (session.activitySubmitted && session.index >= plan.faultIds.length - 1));
  const ctx = (): StepCtx => ({ session, ui, day, activityDone: activityDone() });
  const finished = () => session.phase === 'wrap' || session.completed;
  const current = (): StepDef | null => {
    if (finished()) return null;
    const c = steps.find((s) => s.id === ui.step);
    return c ?? currentStep(steps, ctx());
  };

  /** Latch finished steps; phase-driven steps (read / practice) move on by themselves, bucket steps wait for Next. */
  function sync(): void {
    latchDone(steps, ctx());
    if (!steps.some((s) => s.id === ui.step)) ui.step = (currentStep(steps, ctx()) ?? steps[steps.length - 1])?.id ?? '';
    for (let n = 0; n < steps.length; n++) {
      const i = steps.findIndex((s) => s.id === ui.step);
      const cur = steps[i];
      if (cur && (cur.id === 'read' || cur.id === 'practice') && isStepDone(cur.id, ctx()) && steps[i + 1]) ui.step = steps[i + 1].id; else break;
    }
  }
  sync();

  // ============================================================ DOM skeleton
  const topbar = h('header', { class: 'ds-top' });
  const strip = h('section', { class: 'ds-strip', 'aria-label': 'Steps' });
  const toolbar = h('div', { class: 'ds-tools' });
  const svgHost = h('div', { class: 'ds-svg', 'data-bucket': '1' });
  const classicHost = h('div', { class: 'desk-bucket ds-classic', hidden: true, 'aria-label': 'Bench' });
  const photoImg = h('img', { class: 'ds-photo', alt: 'Reference photo of a bucket (illustrative)', draggable: 'false', hidden: true, src: BASE + PHOTO_FILE }) as HTMLImageElement;
  const stage = h('div', { class: 'ds-stage' }, svgHost, photoImg);
  const canvas = h('div', { class: 'ds-canvas' }, stage);
  const meterEl = h('div', { class: 'ds-float ds-meter', 'aria-label': 'Multimeter' });
  const toastEl = h('div', { class: 'ds-toast', role: 'status', 'aria-live': 'polite', hidden: true });
  const npEl = h('div', { class: 'ds-nameplate', hidden: true });
  canvas.append(npEl, meterEl, toastEl);
  const left = h('section', { class: 'ds-left' }, toolbar, canvas, classicHost);
  const status = h('footer', { class: 'ds-status', role: 'status' });
  let dock!: Dock;
  const main = h('main', { class: 'ds-main' }, left);
  const el = h('div', { class: 'ds-root', 'data-day': String(day) }, topbar, strip, main, status);
  root.replaceChildren(el);

  const probeImg = new Image();
  probeImg.onload = () => { photoAvailable = true; drawTools(); };
  probeImg.src = BASE + PHOTO_FILE;

  // ============================================================ viewport + coach
  const vp: Viewport = createViewport(svgHost, ui.view, (v, pct) => {
    ui.view = v; pctLabel.textContent = pct + '%';
    clearTimeout(viewTimer); viewTimer = setTimeout(commit, 150);
  });
  const coach: Coach = createCoach(canvas, ui.coach, { onChange: () => { commit(); drawStrip(); }, onShowMe: () => { const t = target(); if (t) goToTarget(t); } });
  canvas.append(coach.card);
  const pctLabel = h('span', { class: 'ds-pct' }, '100%');

  const target = (): string | null => { const c = current(); return finished() || !native ? null : nextTarget(c?.id ?? null, ui); };
  function goToTarget(t: string) {
    const terms = bucket2Terms(bucket);
    const map: Record<string, string> = { handle: 'handle', door: 'door', label: 'label' };
    if (map[t]) return vp.goTo(map[t]);
    if (t.startsWith('term:')) { const n = t.slice(5).split('@')[0]; return vp.goTo(n === 'w91' || n === 'w92' ? 'tb91' : n === 'X1' || n === 'X2' ? 'cpt' : 'tb1'); }
    if (t.startsWith('dev:')) { const r = devRect(t.slice(4)); if (r) vp.goRect({ x: r.x - 30, y: r.y - 30, w: r.w + 60, h: r.h + 60 }); }
    void terms;
  }

  // ============================================================ actions
  function toast(msg: string, ms = 6000) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
  }
  function changed(opts: { world?: boolean } = {}): void {
    if (opts.world) { if (reading && ui.meter.red && ui.meter.black) remeasure(false); }
    sync();
    if (finished() && !wrapTab) { wrapTab = true; ui.tab = 'work'; }
    commit(); redraw();
  }
  function remeasure(count: boolean): void {
    if (!ui.meter.red || !ui.meter.black) { reading = null; return; }
    reading = measure(w, ui.meter.mode as MeterMode, ui.meter.red, ui.meter.black, { applyLoading: true });
    if (count) {
      const who = `${ui.meter.mode === 'LOZ' ? 'LoZ V' : ui.meter.mode === 'VAC' ? 'V AC' : ui.meter.mode} ${ui.meter.red} to ${ui.meter.black}`;
      log(`Meter ${who}: ${reading.display}${reading.unit === 'V' && reading.display !== 'ERR' ? ' V' : ''}${reading.note && reading.strike ? ' (' + reading.note + ')' : ''}`, reading.strike ? 'warn' : 'ok');
      if (ui.meter.mode === 'VAC' && ui.handleOn && isX1X2(ui.meter.red, ui.meter.black) && reading.valid && ui.doorOpen && !ui.proved) {
        ui.proved = true; log('Meter proved on the live bucket (X1 to X2).', 'ok');
      }
    }
  }
  function onTerminal(node: string): void {
    if (!ui.doorOpen) return;
    const m = ui.meter;
    if (!m.red || (m.red && m.black)) { if (m.red && m.black) w.settle(); m.red = node; m.black = null; reading = null; }
    else if (node === m.red) { m.red = null; reading = null; }
    else { m.black = node; remeasure(true); }
    for (const t of ['w91', 'w92']) if (node === t && !ui.found.includes(t)) { ui.found.push(t); log(`Found orange wire ${t.slice(1)} on TB1 (remote source circuit).`, 'ok'); }
    changed();
  }
  function onDevice(tag: string): void {
    nameplate = tag;
    if (!ui.inspected.includes(tag)) { ui.inspected.push(tag); log(`Read the nameplate: ${tag}`); }
    changed();
  }
  function onUntaught(tag: string, why: string): void { nameplate = null; toast(`${tag} is taught ${why === 'Chapter 2' ? 'in Chapter 2' : why}. It is greyed out until then.`); drawNameplate(); }
  function onLabel(): void {
    if (!ui.found.includes('label')) { ui.found.push('label'); log('Found the caution label: wires 91/92 are fed from another panel (RP-2).', 'ok'); }
    toast('Caution label: wires 91/92 are fed from another panel and stay live with this handle OFF.');
    changed();
  }
  function toggleHandle(): void {
    if (ui.locked) { toast('The handle is locked OFF (lock L-01). Switch to "Live" to remove the lock.'); return; }
    ui.handleOn = !ui.handleOn;
    applyWorld(); log(`Handle ${ui.handleOn ? 'ON: control source is live' : 'OFF: control source removed (91/92 still live)'}`, ui.handleOn ? 'warn' : 'info');
    changed({ world: true });
  }
  function toggleDoor(): void {
    if (!ui.doorOpen && ui.handleOn) { toast('Door interlock: the door will not open while the handle is ON. Turn the handle OFF first.'); log('Tried to open the door with the handle ON: interlock held it shut.', 'warn'); commit(); drawStatus(); dock.soft(); return; }
    ui.doorOpen = !ui.doorOpen;
    if (ui.doorOpen) ui.doorOpened = true;
    log(ui.doorOpen ? 'Door opened.' : 'Door closed.');
    changed();
  }
  function setPower(mode: 'live' | 'locked'): void {
    if (mode === 'live') { ui.locked = false; ui.handleOn = true; } else { ui.handleOn = false; ui.locked = true; }
    applyWorld();
    log(mode === 'live' ? 'Switched to LIVE: lock removed, handle ON.' : 'Switched to LOCKED OUT: handle OFF, lock L-01 and tag applied. The remote source for 91/92 is not isolated.', mode === 'live' ? 'warn' : 'info');
    changed({ world: true });
  }
  function onPress(tag: string, down: boolean): void {
    const d = w.devs[tag] as any;
    if (!d) return;
    if (d.maintained) { if (down) w.press(tag); else w.resetMaintained(tag); } else if (down) w.press(tag); else w.release(tag);
    if (down) log(`Operated ${tag}.`);
    changed({ world: true });
  }
  function onFuse(): void { ui.fusePulled = !ui.fusePulled; applyWorld(); log(ui.fusePulled ? 'Pulled fuse F1.' : 'Installed fuse F1.', 'info'); changed({ world: true }); }
  function setMode(m: MeterModeId): void { ui.meter.mode = m; if (ui.meter.red && ui.meter.black) remeasure(false); changed(); }
  function clearProbes(): void { ui.meter.red = null; ui.meter.black = null; reading = null; w.settle(); changed(); }

  // ============================================================ renderers
  function drawBucket(): void {
    const svg = renderBucket2({ b: bucket, day: session.extraRep ? 10 : day, doorOpen: ui.doorOpen, handleOn: ui.handleOn, locked: ui.locked, fusePulled: ui.fusePulled, red: ui.meter.red, black: ui.meter.black, hl, target: target(), tool: ui.tool, inspected: ui.inspected, found: ui.found, lastKey },
      { onTerminal: (n, key) => { if (key) lastKey[n] = key; onTerminal(n); }, onDevice, onHandle: toggleHandle, onDoor: toggleDoor, onLabel, onPress, onFuse, onUntaught });
    svgHost.replaceChildren(svg);
    vp.attach(svg);
  }
  function drawTools(): void {
    const badgeCls = ui.locked ? 'locked' : ui.handleOn ? 'live' : 'off';
    const sel = h('select', { 'aria-label': 'Go to', class: 'ds-sel', onchange: (e: any) => { if (e.target.value) vp.goTo(e.target.value); e.target.value = ''; } }, h('option', { value: '' }, 'Go to…'), ...GOTOS.map((g) => h('option', { value: g.id }, g.label)));
    const seg = (items: [string, string, boolean, () => void][], label: string) => h('div', { class: 'ds-seg', role: 'group', 'aria-label': label }, ...items.map(([id, t, on, f]) => h('button', { type: 'button', class: on ? 'on' : '', 'data-seg': id, 'aria-pressed': String(on), onclick: f }, t)));
    const photoBtn = photoAvailable ? h('button', { type: 'button', class: 'ds-tbtn' + (ui.photo.on ? ' on' : ''), 'aria-pressed': String(ui.photo.on), onclick: () => { ui.photo.on = !ui.photo.on; commit(); drawPhoto(); drawTools(); } }, 'Photo') : null;
    const slider = photoAvailable && ui.photo.on ? h('input', { type: 'range', min: '0', max: '100', value: String(ui.photo.opacity), class: 'ds-range', 'aria-label': 'Photo opacity', oninput: (e: any) => { ui.photo.opacity = Number(e.target.value); photoImg.style.opacity = String(ui.photo.opacity / 100); clearTimeout(viewTimer); viewTimer = setTimeout(commit, 150); } }) : null;
    const benchBtn = h('button', { type: 'button', class: 'ds-tbtn' + (classicOn() ? ' on' : ''), 'aria-pressed': String(classicOn()), disabled: classicForced(), title: 'The classic bench: process controls, lockout sheet, repair sheet', onclick: () => { classicManual = !classicManual; syncClassic(); drawTools(); } }, 'Bench');
    if (classicOn()) { toolbar.replaceChildren(h('span', { class: 'ds-badge off' }, classicForced() ? 'Work order bench' : 'Classic bench'), h('span', { class: 'ds-sp' }), benchBtn); return; }
    toolbar.replaceChildren(
      h('span', { class: 'ds-badge ' + badgeCls, 'data-state': badgeCls }, ui.locked ? '🔒 Locked out' : ui.handleOn ? '● Live' : '○ Handle OFF'),
      seg([['live', 'Live', !ui.locked && ui.handleOn, () => setPower('live')], ['locked', 'Locked out', ui.locked, () => setPower('locked')]], 'Bucket state'),
      seg([['probe', 'Probe', ui.tool === 'probe', () => { ui.tool = 'probe'; changed(); }], ['operate', 'Operate', ui.tool === 'operate', () => { ui.tool = 'operate'; changed(); }]], 'Tool'),
      sel,
      h('span', { class: 'ds-sp' }),
      ...(photoBtn ? [photoBtn] : []), ...(slider ? [slider] : []),
      benchBtn,
      h('div', { class: 'ds-zoom', role: 'group', 'aria-label': 'Zoom' }, h('button', { type: 'button', 'aria-label': 'Zoom out', onclick: () => vp.zoomBy(1 / 1.3) }, '−'), pctLabel, h('button', { type: 'button', 'aria-label': 'Zoom in', onclick: () => vp.zoomBy(1.3) }, '+'), h('button', { type: 'button', 'data-zoom': 'fit', onclick: () => vp.fit() }, 'Fit'), h('button', { type: 'button', 'data-zoom': '100', onclick: () => vp.actual() }, '100%')));
    pctLabel.textContent = vp.pct() + '%';
  }
  function drawPhoto(): void { photoImg.hidden = !(ui.photo.on && photoAvailable); photoImg.style.opacity = String(ui.photo.opacity / 100); }

  function microText(): { title: string; body: string } {
    const c = current();
    if (finished()) return { title: 'Day complete', body: 'Open the Work order tab for the wrap-up, then press Done.' };
    if (!c) return { title: 'All steps done', body: 'Press the Next button to finish the day.' };
    const t = target();
    if (native && c.id === 'tour') {
      if (t === 'handle') return { title: 'Turn the handle OFF', body: 'The door interlock holds the door shut while the handle is ON. Tap the red handle on the door.' };
      if (t === 'door') return { title: ui.doorOpen ? 'Open the door' : 'Open the door', body: 'The handle is OFF, so the interlock is released. Tap the latch on the left edge of the door.' };
      if (t?.startsWith('dev:')) return { title: `Read the nameplate: ${t.slice(4)}`, body: 'Tap the pulsing part. Its nameplate appears on the bucket.' };
      return { title: 'Tour done', body: 'You have been round every part. Press Next.' };
    }
    if (native && c.id === 'sources') {
      if (t === 'door') return { title: 'Open the door first', body: 'The terminals are behind the door.' };
      if (t === 'term:w91') return { title: 'Find orange wire 91', body: 'It is the orange terminal on TB1, near the right end. Tap it.' };
      if (t === 'term:w92') return { title: 'Find orange wire 92', body: 'Next to 91. Tap it.' };
      if (t === 'label') return { title: 'Find the caution label', body: 'It is orange, on the lower part of the door. Tap it.' };
      return { title: 'Sources found', body: 'Press Next.' };
    }
    if (native && c.id === 'meter') {
      if (t === 'door') return { title: 'Open the door', body: 'The terminals are behind the door.' };
      if (t === 'handle') return { title: 'Turn the handle ON', body: 'You prove the meter on the live source. The door stays open for this test.' };
      if (t === 'meter-mode') return { title: 'Set the meter to V AC', body: 'Press "V AC" on the meter.' };
      if (t?.startsWith('term:X')) return { title: ui.meter.red ? 'Touch the black probe to X2' : 'Touch the red probe to X1', body: 'Tap the pulsing terminal on the transformer (TB1 also has X1 and wire 2). The first tap places red, the second places black.' };
      return { title: ui.proved ? 'Meter proved' : 'Read the meter', body: ui.proved ? 'X1 to X2 reads line voltage on the live bucket. Press Next.' : 'Tap X1 then X2.' };
    }
    return { title: c.instruction, body: '' };
  }
  function drawCoach(): void {
    const c = current(), i = c ? steps.indexOf(c) : steps.length - 1;
    const m = microText();
    coach.update({ kicker: finished() ? 'Day complete' : `Step ${i + 1} of ${steps.length} · ${c?.label ?? ''}`, title: m.title, body: m.body, why: c?.why ?? 'Done for today.', hint: c?.hint ?? '' });
  }
  function drawStrip(): void {
    const c = current(), cx = ctx();
    const items: Node[] = [];
    steps.forEach((s, i) => {
      const done = finished() || isStepDone(s.id, cx), cur = !finished() && c?.id === s.id && !isStepDone(s.id, cx);
      const here = !finished() && c?.id === s.id;
      if (i) items.push(h('div', { class: 'ds-bar' + (done || here ? ' done' : '') }));
      items.push(h('div', { class: 'ds-st ' + (done ? 'done' : here ? 'cur' : 'locked'), 'data-step': s.id, 'aria-current': here ? 'step' : false, title: s.instruction }, h('div', { class: 'n' }, done ? '✓' : String(i + 1)), h('div', { class: 'l' }, s.label)));
      void cur;
    });
    const m = microText();
    const cnt = c ? stepCounts(c.id, cx) : null;
    const idx = c ? steps.indexOf(c) : steps.length - 1;
    const last = idx === steps.length - 1;
    const doneNow = c ? isStepDone(c.id, cx) : true;
    let label = 'Next', sub = '', enabled = doneNow, act: () => void = () => {};
    if (finished()) { label = 'Done'; sub = 'close the day'; enabled = true; act = () => endSession(false); }
    else if (!last && c) { label = `Next: ${steps[idx + 1].label}`; sub = doneNow ? 'this step is done' : 'finish this step first'; act = () => { ui.step = steps[idx + 1].id; changed(); }; }
    else if (c) {
      label = 'Finish day'; sub = doneNow ? 'wrap up' : 'finish this step first';
      act = () => { if (native) { finishNativeActivity(save, today); changed(); } else if (classicNext) classicNext(); else { finishDay(save, today); changed(); } };
      if (!native && c.id === 'activity') enabled = doneNow && !!classicNext;
    }
    strip.replaceChildren(
      h('div', { class: 'ds-steps' }, ...items),
      h('div', { class: 'ds-task' }, h('b', {}, m.title), ' ', h('span', {}, m.body)),
      h('div', { class: 'ds-strip-r' }, coach.pill,
        h('button', { class: 'ds-link', type: 'button', onclick: () => coach.showWhy() }, 'Why?'), h('button', { class: 'ds-link', type: 'button', onclick: () => coach.showHint() }, 'I’m stuck'),
        cnt ? h('div', { class: 'ds-count' }, h('b', {}, `${cnt.done} / ${cnt.total}`), h('br'), cnt.noun) : null,
        h('button', { class: 'ds-next' + (enabled ? ' ready' : ''), type: 'button', 'data-next': '1', disabled: !enabled, onclick: act }, `${label} →`, h('small', {}, sub))));
  }
  function drawTop(): void {
    const nav = (v: NavView, t: string) => h('button', { class: 'ds-navbtn', type: 'button', 'data-nav': v, onclick: () => o.onNavigate(v) }, t);
    topbar.replaceChildren(h('button', { class: 'ds-navbtn', type: 'button', 'data-nav': 'home', onclick: () => o.onNavigate('home') }, '← Home'), h('span', { class: 'ds-app' }, 'Understanding Motor Controls'),
      h('span', { class: 'ds-crumb' }, `Chapter 1 · `, h('b', {}, session.extraRep ? 'Extra rep' : `Day ${day}`), ` · Bucket 1A, control section`), h('span', { class: 'ds-sp' }),
      ...(SHOW_UNREVIEWED ? [h('span', { class: 'ds-playtest', title: 'Content shows with UNREVIEWED badges until the reviewer approves it.' }, 'PLAY-TEST BUILD')] : []),
      nav('lessons', 'Book'), nav('practice', 'Review'), nav('progress', 'Tickets'), nav('settings', 'Settings'),
      h('span', { class: 'ds-saved', title: `Rank: ${RANK_TITLE[rank(save)]}` }, h('span', { class: 'dot' }), 'Saved'));
  }
  function drawStatus(): void {
    const c = current(), cnt = c ? stepCounts(c.id, ctx()) : null;
    const state = ui.locked ? 'Locked out' : ui.handleOn ? 'Live' : 'Handle OFF';
    const inter = ui.doorOpen ? 'door open' : ui.handleOn ? 'door interlocked' : 'door closed, interlock released';
    status.replaceChildren(
      h('span', { class: 's', 'data-s': 'state' }, h('i', { style: `background:${ui.locked ? '#c62828' : ui.handleOn ? '#e08a00' : '#7b8794'}` }), state, ' · ', inter),
      h('span', { class: 's', 'data-s': 'meter' }, `Meter: ${MODES.find((m) => m[0] === ui.meter.mode)?.[1]} · ${MODE_NOTE[ui.meter.mode]}`),
      h('span', { class: 's', 'data-s': 'probes' }, `Red ${ui.meter.red ?? '—'} · Black ${ui.meter.black ?? '—'}`, reading ? ` · ${reading.display}${reading.unit === 'V' && reading.display !== 'ERR' ? ' V' : ''}` : ''),
      h('span', { class: 'ds-sp' }),
      h('span', { class: 's', 'data-s': 'progress' }, finished() ? 'Day complete' : `Step ${(c ? steps.indexOf(c) : 0) + 1}/${steps.length}${cnt && cnt.total ? ` · ${cnt.done}/${cnt.total} ${cnt.noun}` : ''}`));
  }
  function drawMeter(): void {
    const r = reading, m = ui.meter;
    const body = h('div', { class: 'ds-meter-body' },
      h('div', { class: 'ds-readout', 'aria-live': 'polite', 'data-value': r ? r.display : '', 'data-mode': m.mode }, r ? r.display : '—', r && r.mode !== 'CONT' && r.unit === 'V' && r.display !== 'ERR' ? h('small', {}, ' V') : null),
      h('div', { class: 'ds-probes' }, h('b', { class: 'r' }, 'Red'), ` ${m.red ?? 'tap a terminal'} · `, h('b', { class: 'k' }, 'Black'), ` ${m.black ?? (m.red ? 'tap a second terminal' : '—')}${r?.floating ? ' · FLOATING' : ''}${r?.beep ? ' · 🔔' : ''}`),
      r?.note && r.strike ? h('div', { class: 'warn-txt' }, 'SAFETY STRIKE: ' + r.note) : null,
      h('div', { class: 'ds-modes' }, ...MODES.map(([id, l]) => h('button', { type: 'button', class: id === m.mode ? 'on' : '', 'data-mode': id, 'aria-pressed': String(id === m.mode), onclick: () => setMode(id) }, l)), h('button', { type: 'button', class: 'clr', onclick: clearProbes }, 'Clear')));
    const head = h('div', { class: 'ds-float-hd', title: 'Drag to move' }, 'Multimeter', h('span', { class: 'x' }, ' · drag to move'), h('span', { class: 'ds-sp' }), h('button', { type: 'button', 'aria-label': m.min ? 'Expand the meter' : 'Minimize the meter', onclick: () => { m.min = !m.min; commit(); drawMeter(); } }, m.min ? '▢' : '–'));
    meterEl.replaceChildren(head, ...(m.min ? [] : [body]));
    if (m.x != null && m.y != null) { meterEl.style.left = m.x + 'px'; meterEl.style.top = m.y + 'px'; meterEl.style.right = 'auto'; meterEl.style.bottom = 'auto'; }
    makeDraggable(meterEl, head, canvas, (p) => { m.x = p.x; m.y = p.y; clearTimeout(viewTimer); viewTimer = setTimeout(commit, 150); });
  }
  function nameplateInfo(tag: string): { title: string; lines: string[]; symbol?: { key: string; des: string }; illus?: boolean } {
    const spec = (t: string) => items.find((i) => i.type === 'deviceSpec' && i.body.tag === t)?.body.title as string | undefined;
    const dv = bucket.layout.devices.find((d) => d.tag === tag);
    if (tag === 'CPT') return { title: 'CPT · control power transformer', lines: [spec('SRC') ?? 'Control power supply (X1/X2)', 'Its 120 V secondary feeds the control circuit between X1 and X2.', 'X2 is bonded to the enclosure ground.'], symbol: undefined };
    if (tag === 'F1') return { title: 'F1 · control supply fuse', lines: [spec('F1') ?? 'Control supply fuse F1 (X1 side)', `Rating: ${params.F1?.rating} A`, 'It sits in the X1 conductor, between the CPT and wire 1.'], illus: true };
    if (tag === 'TB1') return { title: 'TB1 · terminal strip', lines: ['Numbered terminals for the control wires. X1, X2 and G sit at the ends of the run.', 'Orange 91 and 92 come from another panel and stay live with the handle OFF.'] };
    if (dv) return { title: `${dv.tag} · ${dv.title}`, lines: [`Terminals: ${dv.pins.map((p) => p.label).join(', ')}`], symbol: { key: dv.symbol, des: dv.tag } };
    return { title: tag, lines: [] };
  }
  function drawNameplate(): void {
    if (!nameplate) { npEl.hidden = true; return; }
    const n = nameplateInfo(nameplate);
    npEl.replaceChildren(h('div', { class: 'ds-np-hd' }, h('b', {}, n.title), h('button', { type: 'button', 'aria-label': 'Close nameplate', onclick: () => { nameplate = null; drawNameplate(); } }, '✕')),
      ...n.lines.map((l) => h('div', { class: 'ds-np-l' }, l)), ...(n.illus ? [h('span', { class: 'ds-illus' }, 'illustrative - pending review')] : []), ...(n.symbol ? [h('div', { class: 'ds-np-sym' }, symbolFigure(n.symbol.key, n.symbol.des))] : []));
    npEl.hidden = false;
  }

  // ============================================================ classic bench (work orders on days 2-10, plus on request)
  const classicForced = () => !native && session.phase === 'activity' && session.activityStarted;
  const classicOn = () => classicForced() || classicManual;
  let classicKind: string | null = null;
  function syncClassic(): void {
    const on = classicOn();
    classicHost.hidden = !on; canvas.hidden = on;
    if (!on) { classicKind = null; classicNext = null; return; }
    const kind = classicForced() ? `act:${session.index}` : 'free';
    if (kind === classicKind) return;
    classicKind = kind;
    if (kind === 'free') { classicNext = null; mountBucket(classicHost, { title: 'Bucket 1A (classic bench)', showLoto: true, troubleshoot: false }); return; }
    mountClassicActivity();
  }
  function mountClassicActivity(): void {
    const ids = plan.faultIds, i = session.index;
    const defs = faultDefs(params);
    const def = ids.length ? defs.find((d) => d.id === ids[i]) ?? null : null;
    const item = def ? faults().find((f) => f.body.engineId === def.id) : null;
    const last = i + 1 >= ids.length;
    let submitted = session.activitySubmitted || !def;
    const sc = plan.scenario;
    const action = () => {
      if (!last && def) { patchSession(save, { index: i + 1, activitySubmitted: false }); commit(); classicKind = null; syncClassic(); redraw(); return; }
      finishClassicActivity(save, today, !!def); changed();
    };
    classicNext = submitted ? action : null;
    mountBucket(classicHost, {
      fault: def, minMeasurements: item?.body.minMeasurements ?? 1, showLoto: day === 2 || !!def, troubleshoot: !!def, title: `${sc?.body.title ?? 'Work order'}${ids.length > 1 ? ` (${i + 1}/${ids.length})` : ''}`,
      footer: () => (submitted ? btn(!last && def ? 'Next work order' : 'Finish activity', action, 'primary') : null),
      onFinish: (r) => {
        if (r.score && def) {
          save.tickets.push({ faultId: def.id, date: today, score: r.score.total, passed: r.score.passed });
          save.xp = Math.max(0, save.xp + r.score.xp - 15 * r.score.violations.length);
          save.safetyViolations += r.score.violations.length;
          if (r.score.passed) patchSession(save, { passes: session.passes + 1 });
        }
        submitted = true; classicNext = action;
        patchSession(save, { activitySubmitted: true }); commit(); drawStrip(); drawStatus(); dock.soft();
      },
    });
  }
  function startActivity(): void { patchSession(save, { activityStarted: true, activitySubmitted: false, index: 0 }); commit(); classicKind = null; redraw(); }

  function endSession(extra: boolean): void { save.session = null; commit(); o.onExit(extra); }

  // ============================================================ wiring
  dock = createDock({
    save, session, ui, day, today, plan, steps, current, ctx,
    bucket: () => bucket, hl: () => hl, setHl: (n) => { hl = n; drawBucket(); dock.soft(); },
    commit, refresh: () => { sync(); commit(); redraw(true); },
    finish: () => { finishDay(save, today); changed(); },
    startActivity, endSession, classicActive: classicOn,
    tapInfo: (t) => toast(t),
  });
  main.append(dock.el);

  function redraw(fromDock = false): void {
    syncClassic();
    drawBucket(); drawTools(); drawStrip(); drawStatus(); drawMeter(); drawCoach(); drawNameplate(); drawPhoto();
    if (!fromDock) dock.soft(); else dock.soft();
  }
  // first paint
  drawTop();
  redraw();
  if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(() => { vp.resize(); coach.reclamp(); }); ro.observe(svgHost); }
  else void clampPos;
  void untaught;
  // restore the reading for persisted probes (not counted again)
  if (ui.meter.red && ui.meter.black) { reading = measure(w, ui.meter.mode as MeterMode, ui.meter.red, ui.meter.black, { applyLoading: true }); drawMeter(); drawStatus(); drawBucket(); }
  commit();

  return { el, destroy() { clearTimeout(toastTimer); clearTimeout(viewTimer); commit(); }, debug: { reading: () => reading, ui: () => ui, bucket: () => bucket } };
}
