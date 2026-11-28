import { describe, it, expect } from 'vitest';
import { defaults, parseSave, importText, exportJson, SAVE_VERSION } from '../src/game/save';
import { openSession, parseSession, parseDayUi, defaultUi, patchSession, LOG_MAX } from '../src/game/session';
import { stepsForDay, currentStep, latchDone, isStepDone, nextTarget, stepSatisfied, untaught, TOUR_DEVICES, isNativeDay, type StepCtx } from '../src/game/steps';
import { goPhase, afterPractice, finishDay, finishNativeActivity } from '../src/game/flow';

const sessionOpts = (day = 1, extraRep = false) => ({ day, extraRep, date: '2026-11-27', warmIds: [], questionIds: ['q1', 'q2'], faultIds: [], cardCount: 3 });
const roundTrip = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('save version and old saves', () => {
  it('keeps v3 (session.ui is an optional, defensively parsed field)', () => expect(SAVE_VERSION).toBe(3));
  it('loads a v1 prototype save', () => {
    const s = parseSave({ version: 1, points: 40, done: [1, 2] });
    expect(s.xp).toBe(40); expect(Object.keys(s.completedDays)).toEqual(['1', '2']); expect(s.session).toBeNull();
  });
  it('loads a v2 save and adds a null session', () => {
    const s = parseSave({ version: 2, xp: 12, completedDays: { 1: { date: '2026-01-02', score: 80 } } });
    expect(s.xp).toBe(12); expect(s.session).toBeNull(); expect(s.version).toBe(3);
  });
  it('loads a v3 save with a mid-day session that has no ui, keeping every old field', () => {
    const old = { version: 3, xp: 25, session: { day: 1, extraRep: false, date: '2026-11-26', phase: 'practice', index: 2, stats: { right: 1, total: 2 }, attempts: [{ id: 'a', ok: true }], warmIds: [], questionIds: ['a', 'b', 'c'], faultIds: [], activityStarted: false, activitySubmitted: false, passes: 0, lessonXpAwarded: true, completed: false } };
    const s = parseSave(old);
    expect(s.xp).toBe(25);
    expect(s.session).toMatchObject({ day: 1, phase: 'practice', index: 2, questionIds: ['a', 'b', 'c'], lessonXpAwarded: true });
    expect(s.session!.ui).toBeUndefined();
  });
  it('ignores a garbage ui instead of failing the whole save', () => {
    const base = { version: 3, session: { day: 2, phase: 'lesson', ui: 'nonsense' } };
    expect(parseSave(base).session!.ui).toBeUndefined();
    const s = parseSave({ version: 3, session: { day: 2, phase: 'lesson', ui: { tab: 'bogus', doorOpen: 'yes', inspected: [1, 'CPT', 'CPT'], meter: { mode: 'XYZ', red: 5 }, view: { x: 'a' }, coach: { x: Infinity }, log: [{ t: 1, text: 'ok', kind: 'zzz' }, null, { t: 'x' }] } } });
    const ui = s.session!.ui!;
    expect(ui.tab).toBe('lesson');                     // the default tab (bogus tab rejected)
    expect(ui.doorOpen).toBe(true);                    // default for non-day-1
    expect(ui.inspected).toEqual(['CPT']);
    expect(ui.meter).toMatchObject({ mode: 'VAC', red: null, black: null });
    expect(ui.view).toBeNull(); expect(ui.coach.x).toBeNull();
    expect(ui.log).toEqual([{ t: 1, kind: 'info', text: 'ok' }]);
  });
  it('a locked flag without a handle OFF is dropped (cannot be locked and ON)', () => {
    expect(parseDayUi({ handleOn: true, locked: true }, 1)!.locked).toBe(false);
    expect(parseDayUi({ handleOn: false, locked: true }, 1)!.locked).toBe(true);
  });
  it('caps the log', () => {
    const log = Array.from({ length: LOG_MAX + 50 }, (_, i) => ({ t: i, kind: 'info', text: 'e' + i }));
    const ui = parseDayUi({ log }, 1)!;
    expect(ui.log).toHaveLength(LOG_MAX); expect(ui.log[ui.log.length - 1].text).toBe('e' + (LOG_MAX + 49));
  });
});

describe('the one-screen day state survives a save / reload round trip', () => {
  it('keeps step, completion, tab, door, handle, inspected devices, found items, meter, zoom/pan, coach and photo', () => {
    const save = defaults();
    const s = openSession(save, sessionOpts());
    const ui = (s.ui = defaultUi(1));
    Object.assign(ui, { step: 'sources', done: ['read', 'tour'], tab: 'schem', doorOpen: true, doorOpened: true, handleOn: false, locked: true, fusePulled: true, inspected: ['CPT', 'F1'], found: ['w91'], proved: false, tool: 'operate' });
    ui.meter = { mode: 'LOZ', red: 'w91', black: 'G', x: 40, y: 60, min: true };
    ui.view = { x: 330.5, y: 380, w: 420, h: 332 };
    ui.coach = { x: 120, y: 30, folded: true };
    ui.photo = { on: true, opacity: 55 };
    ui.log.push({ t: 1700000000000, kind: 'ok', text: 'Found orange wire 91' });
    patchSession(save, { phase: 'activity', activityStarted: true, index: 2, stats: { right: 2, total: 3 } });
    const back = parseSave(roundTrip(save));
    expect(back).toEqual(save);
    expect(back.session!.ui).toEqual(ui);
    expect(importText(exportJson(save))).toEqual(save);
  });
  it('a lesson-tab switch is just a field change: nothing else on the session moves', () => {
    const save = defaults();
    const s = openSession(save, sessionOpts());
    s.ui = defaultUi(1);
    const before = roundTrip({ ...s, ui: undefined });
    for (const tab of ['work', 'schem', 'loto', 'log', 'lesson'] as const) s.ui.tab = tab;
    expect(roundTrip({ ...s, ui: undefined })).toEqual(before);
    expect(parseSession(roundTrip(s))!.ui!.tab).toBe('lesson');
  });
});

describe('steps', () => {
  it('Day 1 has Read, Tour, Find sources, Prove meter; other days map to Read -> Practice -> Work order', () => {
    expect(stepsForDay(1, { extraRep: false, hasActivity: true }).map((s) => s.label)).toEqual(['Read', 'Tour', 'Find sources', 'Prove meter']);
    expect(stepsForDay(3, { extraRep: false, hasActivity: true }).map((s) => s.id)).toEqual(['read', 'practice', 'activity']);
    expect(stepsForDay(3, { extraRep: false, hasActivity: false }).map((s) => s.id)).toEqual(['read', 'practice']);
    expect(stepsForDay(5, { extraRep: true, hasActivity: true }).map((s) => s.id)).toEqual(['practice']);
    expect(isNativeDay(1)).toBe(true); expect(isNativeDay(2)).toBe(false);
  });
  const mk = (): StepCtx => {
    const save = defaults();
    const session = openSession(save, sessionOpts());
    session.ui = defaultUi(1);
    return { session, ui: session.ui, day: 1, activityDone: false };
  };
  const steps = stepsForDay(1, { extraRep: false, hasActivity: true });
  it('steps complete in order and latch', () => {
    const c = mk();
    expect(currentStep(steps, c)!.id).toBe('read');
    c.session.phase = 'activity';
    latchDone(steps, c);
    expect(c.ui.done).toEqual(['read']);
    c.ui.doorOpened = true; c.ui.inspected = [...TOUR_DEVICES];
    latchDone(steps, c);
    expect(c.ui.done).toEqual(['read', 'tour']);
    // a later step cannot latch before an earlier one is done
    const c2 = mk(); c2.ui.proved = true; latchDone(steps, c2);
    expect(c2.ui.done).toEqual([]);
    // latched steps stay done when the bucket changes afterwards
    c.ui.doorOpen = false; c.ui.inspected = [];
    expect(isStepDone('tour', c)).toBe(true);
    expect(stepSatisfied('tour', c)).toBe(false);
  });
  it('the next-terminal target follows the step', () => {
    const ui = defaultUi(1);
    expect(nextTarget('tour', ui)).toBe('handle');                       // handle ON, door shut
    ui.handleOn = false; expect(nextTarget('tour', ui)).toBe('door');
    ui.doorOpen = true; ui.doorOpened = true; expect(nextTarget('tour', ui)).toBe('dev:CPT');
    ui.inspected = [...TOUR_DEVICES]; expect(nextTarget('tour', ui)).toBeNull();
    expect(nextTarget('sources', ui)).toBe('term:w91');
    ui.found = ['w91']; expect(nextTarget('sources', ui)).toBe('term:w92');
    ui.found = ['w91', 'w92']; expect(nextTarget('sources', ui)).toBe('label');
    expect(nextTarget('meter', ui)).toBe('handle');                      // must be live
    ui.handleOn = true; expect(nextTarget('meter', ui)).toBe('term:X1@TB_X1');
    ui.meter.red = 'X1'; expect(nextTarget('meter', ui)).toBe('term:X2@TB_X2');
    ui.meter.black = 'X2'; expect(nextTarget('meter', ui)).toBeNull();
    ui.meter.mode = 'OHMS'; ui.meter.red = null; ui.meter.black = null; expect(nextTarget('meter', ui)).toBe('meter-mode');
  });
  it('Day 1 greys only the Chapter 2 power parts, the timers and PL8-PL11', () => {
    expect(untaught(1)).toEqual({ DISC: 'Chapter 2', PF: 'Chapter 2', M: 'Chapter 2', OL: 'Chapter 2', MTR: 'Chapter 2', TR1: 'Day 8', TR2: 'Day 8', TD3: 'Day 8', TD4: 'Day 8', PL8: 'Day 8', PL9: 'Day 8', PL10: 'Day 8', PL11: 'Day 8' });
    expect(Object.keys(untaught(8)).sort()).toEqual(['DISC', 'M', 'MTR', 'OL', 'PF']);
  });
});

describe('day flow rules', () => {
  it('Day 1 practice ends in an open activity; finishing the tour completes the day once', () => {
    const save = defaults();
    const s = openSession(save, sessionOpts(1));
    s.ui = defaultUi(1);
    goPhase(save, 'practice', 2);
    afterPractice({ save, today: '2026-11-27', cardCount: 3, hasScenario: true });
    expect(s.phase).toBe('activity'); expect(s.activityStarted).toBe(true);
    finishNativeActivity(save, '2026-11-27'); finishNativeActivity(save, '2026-11-27');
    expect(s.completed).toBe(true); expect(save.completedDays['1']).toBeTruthy();
    const xp = save.xp; finishDay(save, '2026-11-27'); expect(save.xp).toBe(xp);
  });
  it('an extra rep finishes after practice without recording a day', () => {
    const save = defaults();
    const s = openSession(save, sessionOpts(4, true));
    goPhase(save, 'practice', 2);
    afterPractice({ save, today: '2026-11-27', cardCount: 3, hasScenario: true });
    expect(s.phase).toBe('wrap'); expect(save.completedDays['4']).toBeUndefined();
  });
});
