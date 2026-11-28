// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { resetSaveForTests, parseSave, getSave } from '../src/game/save';
import { startSession } from '../src/game/daystart';
import { defaultUi } from '../src/game/session';
import { mountDayScreen, type DayScreen } from '../src/ui/dayscreen';
import { buildBucket } from '../src/model/bucket';
import { measure, type MeterMode } from '../src/model/meter';
import { params } from '../src/content';
import { untaught, TOUR_DEVICES, nextTarget } from '../src/game/steps';
import { bucket2Terms, B2, TB_COUNT } from '../src/ui/bucket2layout';

const TODAY = '2026-11-27';
let root: HTMLElement;
let screen: DayScreen | null;

/** Open Day 1 straight at the bucket steps (questions answered), as after the Read step. */
function boot(ui: Partial<ReturnType<typeof defaultUi>> = {}, phase: 'lesson' | 'activity' = 'activity', day = 1) {
  const save = resetSaveForTests();
  const s = startSession(save, day, false, TODAY);
  s.phase = phase; s.index = 0; s.activityStarted = phase === 'activity';
  s.ui = { ...defaultUi(day), ...ui };
  return mount(save);
}
function mount(_save?: unknown): DayScreen {
  root = document.createElement('div'); document.body.replaceChildren(root);
  screen = mountDayScreen(root, { onNavigate: () => {}, onExit: () => {}, today: TODAY });
  return screen;
}
const click = (el: Element | null) => { expect(el, 'element to click').toBeTruthy(); el!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); };
const term = (key: string) => root.querySelector(`g.term2[data-key="${key}"]`);
const readout = () => root.querySelector('.ds-readout') as HTMLElement;
const seg = (id: string) => root.querySelector(`[data-seg="${id}"]`);
const mode = (m: string) => root.querySelector(`.ds-modes [data-mode="${m}"]`);
const lit = () => [...root.querySelectorAll('g.pilot')].filter((g) => g.getAttribute('data-lit') === '1').map((g) => g.getAttribute('data-tag')).sort();
const live = { doorOpen: true, doorOpened: true, handleOn: true, step: 'meter' };

/** What the model says on a fresh bucket in the same state. */
function expected(m: MeterMode, a: string, b: string, handleOn: boolean) {
  const bk = buildBucket(params);
  if (!handleOn) bk.world.setSource('SRC', false);
  return measure(bk.world, m, a, b, { applyLoading: true });
}

beforeEach(() => { screen?.destroy(); screen = null; localStorage.clear(); });

describe('readings through the new bucket', () => {
  it('LIVE, VAC: tap X1 then X2 shows exactly measure() (about 120 V) and proves the meter', () => {
    boot(live);
    expect(root.querySelector('.ds-badge')!.getAttribute('data-state')).toBe('live');
    click(mode('VAC'));
    click(term('CPT_X1')); click(term('CPT_X2'));
    const exp = expected('VAC', 'X1', 'X2', true);
    expect(readout().getAttribute('data-value')).toBe(exp.display);
    expect(Number(exp.display)).toBeCloseTo(120, 0);
    expect(readout().textContent).toContain(exp.display);
    expect(screen!.debug.ui().proved).toBe(true);
    expect(screen!.debug.ui().log.some((e) => /Meter V AC X1 to X2: 120\.0/.test(e.text))).toBe(true);
  });
  it('LIVE: the TB1 screws give the same readings as the model for the same nodes', () => {
    boot(live);
    click(term('TB_X1')); click(term('TB_2'));          // TB1 X1 and TB1 2 (the X2 conductor)
    expect(readout().getAttribute('data-value')).toBe(expected('VAC', 'X1', 'w2', true).display);
  });
  it('TB1 X1 to TB1 X2: live reads measure() = 120.0, locked out reads 0.0', () => {
    boot({ ...live, step: 'meter' });
    expect(buildBucket(params).layout.tbNets.length).toBe(TB_COUNT);
    click(mode('VAC')); click(term('TB_X1')); click(term('TB_X2'));
    expect(readout().getAttribute('data-value')).toBe(expected('VAC', 'X1', 'X2', true).display);
    expect(readout().getAttribute('data-value')).toBe('120.0');
    click(seg('locked'));
    expect(readout().getAttribute('data-value')).toBe(expected('VAC', 'X1', 'X2', false).display);
    expect(readout().getAttribute('data-value')).toBe('0.0');
  });
  it('after the meter is proved the coach stays on "Meter proved" whatever the handle/lock does', () => {
    boot({ ...live, step: 'meter' });
    click(mode('VAC')); click(term('TB_X1')); click(term('TB_X2'));
    expect(screen!.debug.ui().proved).toBe(true);
    const coach = () => root.querySelector('.ds-coach-t')!.textContent! + ' | ' + root.querySelector('.ds-coach-b')!.textContent!;
    expect(coach()).toContain('Meter proved');
    click(seg('locked'));
    expect(coach()).toContain('Meter proved'); expect(coach()).not.toContain('Turn the handle ON');
    click(seg('live'));
    expect(coach()).not.toContain('Turn the handle ON');
    expect(nextTarget('meter', screen!.debug.ui())).toBeNull();
  });
  it('a finished current step stays highlighted as current until Next', () => {
    boot({ step: 'tour', doorOpen: true, doorOpened: true, handleOn: false, inspected: [...TOUR_DEVICES.filter((t) => t !== 'PLF')] } as any);
    click(root.querySelector('g.dev2[data-tag="PLF"]'));
    const el = root.querySelector('.ds-st[data-step="tour"]')!;
    expect(el.className).toContain('done'); expect(el.className).toContain('cur'); expect(el.getAttribute('aria-current')).toBe('step');
    click(root.querySelector('[data-next="1"]'));
    expect(root.querySelector('.ds-st[data-step="tour"]')!.className).not.toContain('cur');
    expect(root.querySelector('.ds-st[data-step="sources"]')!.className).toContain('cur');
  });
  it('tour counter is n/11 nameplates once the door is open', () => {
    boot({ step: 'tour', doorOpen: true, doorOpened: true, handleOn: false });
    expect(root.querySelector('.ds-count')!.textContent).toContain('0 / 11');
    expect(root.querySelector('.ds-count')!.textContent).toContain('nameplates');
    expect(root.querySelector('.ds-count')!.textContent).not.toContain('tour checks');
  });
  it('LOCKED OUT: X1-X2 reads 0.0, but 91-92 and 91-G still read 120.0 (foreign source stays live)', () => {
    boot({ ...live, step: 'meter' });
    click(seg('locked'));
    expect(root.querySelector('.ds-badge')!.getAttribute('data-state')).toBe('locked');
    expect(root.querySelector('g.lock2')).toBeTruthy();           // lock + tag drawn
    click(term('CPT_X1')); click(term('CPT_X2'));
    expect(readout().getAttribute('data-value')).toBe(expected('VAC', 'X1', 'X2', false).display);
    expect(readout().getAttribute('data-value')).toBe('0.0');
    click(root.querySelector('.ds-modes .clr'));
    click(term('TB_91')); click(term('TB_92'));
    expect(readout().getAttribute('data-value')).toBe(expected('VAC', 'w91', 'w92', false).display);
    expect(readout().getAttribute('data-value')).toBe('120.0');
    click(term('TB_91')); click(term('EGC_0'));                     // third tap starts over: red on 91 again, then black on the EGC (G)
    click(term('TB_91')); click(term('EGC_0'));
    expect(readout().getAttribute('data-value')).toBe(expected('VAC', 'w91', 'G', false).display);
    expect(readout().getAttribute('data-value')).toBe('120.0');
  });
  it('every meter mode matches measure() for the same two nodes', () => {
    boot(live);
    for (const m of ['VAC', 'LOZ', 'VDC'] as MeterMode[]) {
      click(root.querySelector('.ds-modes .clr'));
      click(mode(m));
      click(term('CR1_1')); click(term('CR1_2'));
      const exp = expected(m, 'CR1:1', 'CR1:2', true);
      expect(readout().getAttribute('data-value'), m).toBe(exp.display);
    }
    // the mock's idle-live reading across the open CR1 contact is about 114.6 V
    click(root.querySelector('.ds-modes .clr')); click(mode('VAC')); click(term('CR1_1')); click(term('CR1_2'));
    expect(readout().getAttribute('data-value')).toBe(expected('VAC', 'CR1:1', 'CR1:2', true).display);
    expect(Number(readout().getAttribute('data-value'))).toBeGreaterThan(100);
  });
  it('ohms on a live bucket is refused exactly as the model refuses it', () => {
    boot(live);
    click(mode('OHMS')); click(term('CR1_1')); click(term('CR1_2'));
    expect(readout().getAttribute('data-value')).toBe(expected('OHMS', 'CR1:1', 'CR1:2', true).display);
    expect(readout().getAttribute('data-value')).toBe('ERR');
  });
  it('terminals are only reachable with the door open', () => {
    boot({ doorOpen: false, handleOn: false, step: 'tour' });
    expect(term('CPT_X1')).toBeNull();
    expect(root.querySelector('g.dev2[data-tag="PL1"]')).toBeTruthy();   // door operators stay
  });
});

describe('pilot lights come from the circuit model', () => {
  it('live and idle: PL2, PL3 and PLF are lit', () => {
    boot(live);
    expect(lit()).toEqual(['PL2', 'PL3', 'PLF']);
  });
  it('locked out: only the orange remote-interlock light (PLF) stays lit', () => {
    boot(live);
    click(seg('locked'));
    expect(lit()).toEqual(['PLF']);
  });
  it('operating START in Operate mode picks CR1 up and changes the lights', () => {
    boot({ ...live, tool: 'operate' });
    const pb1 = root.querySelector('g.dev2[data-tag="PB1"]')!;
    pb1.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    expect(lit()).toContain('PL1');
    expect(lit()).not.toContain('PL2');
    root.querySelector('g.dev2[data-tag="PB1"]')!.dispatchEvent(new Event('pointerup', { bubbles: true }));
    // CR1 drops out again (the timers keep their own state: TR2 is an off-delay), so PL1 is off and PL2 is back on
    expect(lit()).not.toContain('PL1');
    expect(lit()).toEqual(expect.arrayContaining(['PL2', 'PL3', 'PLF']));
  });
});

describe('door, handle and interlock', () => {
  it('the door will not open while the handle is ON; it opens once the handle is OFF', () => {
    boot({ doorOpen: false, handleOn: true, step: 'tour' });
    click(root.querySelector('g.latch2'));
    expect(screen!.debug.ui().doorOpen).toBe(false);
    expect(root.querySelector('.ds-toast')!.textContent).toMatch(/interlock/i);
    click(root.querySelector('g.handle2'));
    expect(screen!.debug.ui().handleOn).toBe(false);
    expect(screen!.debug.bucket().world.el<any>('SRC').on).toBe(false);   // the model followed the handle
    click(root.querySelector('g.latch2'));
    expect(screen!.debug.ui().doorOpen).toBe(true);
    expect(screen!.debug.ui().doorOpened).toBe(true);
    expect(root.querySelector('g.term2')).toBeTruthy();
  });
  it('a locked handle cannot be turned ON; Live removes the lock', () => {
    boot({ ...live });
    click(seg('locked'));
    click(root.querySelector('g.handle2'));
    expect(screen!.debug.ui().handleOn).toBe(false);
    click(seg('live'));
    expect(screen!.debug.ui().locked).toBe(false); expect(screen!.debug.ui().handleOn).toBe(true);
  });
});

describe('greyed parts and illustrative markers', () => {
  it('Day 1 greys exactly the Chapter 2 power parts, the timers and PL8-PL11', () => {
    boot(live);
    const greyed = [...root.querySelectorAll('g.dev2.grey, g.dev2.ch2')].map((g) => g.getAttribute('data-tag')!).sort();
    expect(greyed).toEqual(Object.keys(untaught(1)).sort());
    for (const t of ['CPT', 'F1', 'CR1', 'PL1', 'PL7', 'PLF', 'PB1']) expect(root.querySelector(`g.dev2[data-tag="${t}"]`)!.classList.contains('grey'), t).toBe(false);
  });
  it('greyed devices are not probe-able and say why when tapped', () => {
    boot(live);
    click(term('TR1_A1'));
    expect(screen!.debug.ui().meter.red).toBeNull();
    expect(root.querySelector('.ds-toast')!.textContent).toMatch(/Day 8/);
    expect(root.textContent).toContain('Timers · taught Day 8');
  });
  it('invented values carry an "illustrative - pending review" marker (RP-2 label, F1 rating, lock when shown)', () => {
    boot({ ...live, tab: 'work' });
    const marks = () => [...root.querySelectorAll('.illus')].map((m) => m.getAttribute('data-illustrative')!);
    expect(marks().some((m) => /RP-2/.test(m))).toBe(true);
    expect(marks().some((m) => /F1/.test(m))).toBe(true);
    expect(marks().every((m) => /illustrative · pending review/.test(m))).toBe(true);
    click(seg('locked'));
    expect(marks().some((m) => /L-01/.test(m))).toBe(true);
    expect(root.textContent).toContain('illustrative - pending review');     // dock badge text
  });
  it('unreviewed content badges still show on lesson cards', () => {
    boot({}, 'lesson');
    // the card flow is in the Lesson tab; at least one card carries the UNREVIEWED badge while SHOW_UNREVIEWED is on
    expect(root.querySelector('.ds-pane .badge.unrev')?.textContent).toMatch(/UNREVIEWED/);
  });
});

describe('persistence across tab switches, view switches and reload', () => {
  const tabs = () => root.querySelector('.ds-tab.on')!.getAttribute('data-tab');
  it('dock tab switches keep every bit of bucket and step state', () => {
    boot({ ...live, step: 'meter' });
    click(term('TB_91')); click(term('TB_92'));
    const snap = JSON.stringify({ ...screen!.debug.ui(), tab: '', log: [] });
    for (const t of ['schem', 'loto', 'log', 'work', 'lesson']) { click(root.querySelector(`.ds-tab[data-tab="${t}"]`)); expect(tabs()).toBe(t); }
    expect(JSON.stringify({ ...screen!.debug.ui(), tab: '', log: [] })).toBe(snap);
    expect(readout().getAttribute('data-value')).toBe('120.0');
    expect(screen!.debug.ui().found).toEqual(expect.arrayContaining(['w91', 'w92']));
  });
  it('a view switch (unmount, mount again) resumes the same step, tab, door, probes and inspected devices', () => {
    boot({ ...live, step: 'meter', tab: 'log' });
    click(root.querySelector('g.dev2[data-tag="CPT"]'));
    click(term('CPT_X1')); click(term('CPT_X2'));
    const before = JSON.parse(JSON.stringify(getSave().session!.ui));
    screen!.destroy();
    mount();                                              // what main.ts does when you come back from Settings / Progress
    expect(screen!.debug.ui()).toEqual(before);
    expect(tabs()).toBe('log');
    expect(readout().getAttribute('data-value')).toBe('120.0');
    expect(screen!.debug.ui().step).toBe('meter');
    expect(root.querySelector('.ds-st[data-step="meter"]')!.className).toContain('done');   // proved before the switch
  });
  it('a full reload (save through JSON, parse, mount) restores state, handle, door, zoom and coach', () => {
    boot({ ...live, step: 'sources' });
    click(root.querySelector('g.handle2'));                // handle OFF
    click(term('TB_91'));
    ui().view = { x: 700, y: 400, w: 250, h: 200 };
    ui().coach = { x: 33, y: 44, folded: true };
    screen!.destroy();
    const raw = JSON.parse(JSON.stringify(getSave()));
    screen = null;
    resetSaveForTests(parseSave(raw));                     // a new page load reads the save again
    mount();
    const u = screen!.debug.ui();
    expect(u.handleOn).toBe(false); expect(u.doorOpen).toBe(true); expect(u.found).toContain('w91');
    expect(u.view).toEqual({ x: 700, y: 400, w: 250, h: 200 });
    expect(u.coach).toEqual({ x: 33, y: 44, folded: true });
    expect(screen!.debug.bucket().world.el<any>('SRC').on).toBe(false);   // world rebuilt from the saved handle
    expect(root.querySelector('.ds-coach')!.hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('.ds-pill-coach')!.hasAttribute('hidden')).toBe(false);
    expect(root.querySelector('svg.b2')!.getAttribute('viewBox')!.split(' ').map(Number)[0]).toBeCloseTo(700, 0);
  });
  it('the step strip shows done / current / locked and Next needs the current step done', () => {
    boot({ step: 'tour', doorOpen: true, doorOpened: true, handleOn: false });
    const st = (id: string) => root.querySelector(`.ds-st[data-step="${id}"]`)!.className;
    expect(st('read')).toContain('done'); expect(st('tour')).toContain('cur'); expect(st('sources')).toContain('locked'); expect(st('meter')).toContain('locked');
    const next = () => root.querySelector('[data-next="1"]') as HTMLButtonElement;
    expect(next().disabled).toBe(true);
    for (const t of TOUR_DEVICES) click(root.querySelector(`g.dev2[data-tag="${t}"]`));
    expect(next().disabled).toBe(false);
    click(next());
    expect(st('tour')).toContain('done'); expect(st('sources')).toContain('cur');
    expect(getSave().session!.ui!.step).toBe('sources');
  });
  it('the coach folds into the strip and unfolds; position persists', () => {
    boot(live);
    click(root.querySelector('.ds-coach-fold'));
    expect(getSave().session!.ui!.coach.folded).toBe(true);
    click(root.querySelector('.ds-pill-coach'));
    expect(getSave().session!.ui!.coach.folded).toBe(false);
  });
  it('the next-terminal highlight pulses the terminal the step wants', () => {
    boot({ ...live });
    expect(root.querySelector('g.target2')!.getAttribute('data-target')).toBe('term:X1@TB_X1');
    click(term('TB_X1'));
    expect(root.querySelector('g.target2')!.getAttribute('data-target')).toBe('term:X2@TB_X2');
  });
  function ui() { return screen!.debug.ui(); }
});

describe('Day 2 keeps the classic flow reachable (Read -> Practice -> Work order)', () => {
  it('shows the Read / Practice / Work order strip and the lesson card inside the dock', () => {
    boot({}, 'lesson', 2);
    expect([...root.querySelectorAll('.ds-st')].map((e) => e.getAttribute('data-step'))).toEqual(['read', 'practice', 'activity']);
    expect(root.querySelector('.ds-pane .stem, .ds-pane h2')).toBeTruthy();
  });
  it('the Work order step opens the classic bench with its lockout sheet', () => {
    const save = resetSaveForTests();
    const s = startSession(save, 2, false, TODAY);
    s.phase = 'activity'; s.activityStarted = true; s.ui = defaultUi(2);
    mount(save);
    expect(root.querySelector('.ds-classic')!.hasAttribute('hidden')).toBe(false);
    expect(root.querySelector('.ds-classic .bucket-screen')).toBeTruthy();
    expect(root.querySelector('.ds-classic')!.textContent).toMatch(/Lockout/);
  });
});

describe('bucket layout', () => {
  const bk = buildBucket(params);
  const terms = bucket2Terms(bk);
  it('has a clickable screw for every tbNet (top and bottom) on TB1', () => {
    for (const n of bk.layout.tbNets) {
      expect(terms.filter((t) => t.part === 'TB1' && t.label === n), n).toHaveLength(2);
    }
  });
  it('every probe-able terminal is a real model node; keys are unique; all inside the viewBox; none overlap', () => {
    const nodes = new Set(bk.world.nodes());
    expect(new Set(terms.map((t) => t.key)).size).toBe(terms.length);
    for (const t of terms) {
      if (t.node) expect(nodes.has(t.node), `${t.key} -> ${t.node}`).toBe(true);
      expect(t.x - t.r).toBeGreaterThanOrEqual(0); expect(t.x + t.r).toBeLessThanOrEqual(B2.W);
      expect(t.y - t.r).toBeGreaterThanOrEqual(0); expect(t.y + t.r).toBeLessThanOrEqual(B2.H);
    }
    for (let i = 0; i < terms.length; i++) for (let j = i + 1; j < terms.length; j++) {
      const d = Math.hypot(terms[i].x - terms[j].x, terms[i].y - terms[j].y);
      expect(d, `${terms[i].key} vs ${terms[j].key}`).toBeGreaterThan(terms[i].r + terms[j].r);
    }
  });
});

describe('nameplates never share a click target with an action', () => {
  const tour = (tool: 'probe' | 'operate') => boot({ step: 'tour', doorOpen: true, doorOpened: true, handleOn: false, tool } as any);
  const f1Title = () => [...root.querySelectorAll('g.f1label[data-tag="F1"] text')].find((t) => /^F1 · .* A/.test(t.textContent ?? ''))!;
  const fuseBtn = () => root.querySelector('[data-action="fuse"]');
  const f1Pulled = () => (screen!.debug.bucket().world.el<any>('F1')).pulled;

  it('Operate: clicking the F1 title reads the nameplate and leaves the fuse installed', () => {
    tour('operate');
    click(f1Title());
    expect(screen!.debug.ui().inspected).toContain('F1');
    expect(screen!.debug.ui().fusePulled).toBe(false);
    expect(f1Pulled()).toBe(false);
    expect(root.querySelector('.ds-np-hd')?.textContent ?? '').toMatch(/F1/);
  });
  it('Probe: clicking the F1 body reads the nameplate', () => {
    tour('probe');
    click(root.querySelector('g.dev2[data-tag="F1"]'));
    expect(screen!.debug.ui().inspected).toContain('F1');
    expect(screen!.debug.ui().fusePulled).toBe(false);
  });
  it('the Tour completes in Operate with the fuse installed and nothing operated', () => {
    tour('operate');
    const next = () => root.querySelector('[data-next="1"]') as HTMLButtonElement;
    expect(next().disabled).toBe(true);
    for (const t of TOUR_DEVICES) {
      const el = t === 'F1' ? f1Title() : root.querySelector(`g.dev2[data-tag="${t}"] .pblegend`) ?? root.querySelector(`g.dev2[data-tag="${t}"]`);
      click(el);
    }
    expect(screen!.debug.ui().fusePulled).toBe(false);
    for (const t of ['PB1', 'PB2', 'PB3']) expect((screen!.debug.bucket().world.devs[t] as any).pressed, t).toBeFalsy();
    expect(next().disabled).toBe(false);
  });
  it('Pull / Install fuse is its own control; the body and title never toggle it', () => {
    tour('operate');
    expect(fuseBtn()!.textContent).toMatch(/Pull fuse/);
    click(fuseBtn());
    expect(screen!.debug.ui().fusePulled).toBe(true); expect(f1Pulled()).toBe(true);
    expect(fuseBtn()!.textContent).toMatch(/Install fuse/);
    click(root.querySelector('g.dev2[data-tag="F1"]')); click(f1Title());
    expect(screen!.debug.ui().inspected).toContain('F1');
    expect(f1Pulled()).toBe(true);
    click(fuseBtn());
    expect(screen!.debug.ui().fusePulled).toBe(false); expect(f1Pulled()).toBe(false);
  });
  it('F1 screws stay probe-able and do not pull the fuse', () => {
    boot({ doorOpen: true, doorOpened: true, handleOn: true, step: 'meter', tool: 'operate' } as any);
    click(term('F1_T'));
    expect(screen!.debug.ui().fusePulled).toBe(false);
  });
  it('Operate: the PB legend plate reads the nameplate without latching the button', () => {
    tour('operate');
    for (const t of ['PB1', 'PB2', 'PB3']) {
      click(root.querySelector(`g.dev2[data-tag="${t}"] .pblegend`));
      expect(screen!.debug.ui().inspected, t).toContain(t);
      expect((screen!.debug.bucket().world.devs[t] as any).pressed, t).toBeFalsy();
    }
  });
  it('Operate: the cap still operates the button (momentary press and release)', () => {
    tour('operate');
    const cap = root.querySelector('g.dev2[data-tag="PB1"] .pbcap')!;
    cap.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    expect((screen!.debug.bucket().world.devs['PB1'] as any).pressed).toBe(true);
    root.querySelector('g.dev2[data-tag="PB1"] .pbcap')!.dispatchEvent(new Event('pointerup', { bubbles: true }));
    expect((screen!.debug.bucket().world.devs['PB1'] as any).pressed).toBeFalsy();
  });
});
