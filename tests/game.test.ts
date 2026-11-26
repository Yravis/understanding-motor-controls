import { describe, it, expect, beforeEach } from 'vitest';
import { defaults, parseSave, exportJson, importText, exportCode, SAVE_VERSION } from '../src/game/save';
import { openSession, patchSession, setDraft, recordAttempt, clearSession, hasActiveSession, parseSession } from '../src/game/session';
import { scheduleReview, dueIds, streak, rank, INTERVALS, addXp, nextDay } from '../src/game/progress';
import { present, grade } from '../src/game/questions';

describe('save: migration and export/import', () => {
  it('migrates v1 to the current version', () => {
    const s = parseSave({ version: 1, points: 120, done: [1, 2] });
    expect(s.version).toBe(SAVE_VERSION); expect(s.xp).toBe(120); expect(Object.keys(s.completedDays)).toEqual(['1', '2']);
  });
  it('round-trips export JSON and the pasted code', () => {
    const s = defaults(); s.xp = 77; s.settings.days = [0, 2, 4, 5, 6]; s.reviews.a = { step: 2, due: '2026-12-10', seen: 3 }; s.bookScores['1'] = { got: 8, total: 10, date: '2026-12-01' };
    expect(parseSave(JSON.parse(exportJson(s)))).toEqual(s);
    expect(importText(exportJson(s))).toEqual(s);
    expect(importText(exportCode(s))).toEqual(s);
  });
  it('rejects garbage and newer versions', () => {
    expect(() => parseSave(null)).toThrow(); expect(() => parseSave({ version: 99 })).toThrow(); expect(() => importText('nonsense')).toThrow();
  });
  it('sanitizes odd fields', () => {
    const s = parseSave({ version: 2, xp: -5, settings: { theme: 'neon', days: [9, 1, 1] } });
    expect(s.xp).toBe(0); expect(s.settings.theme).toBe('auto'); expect(s.settings.days).toEqual([1]);
  });
});

describe('spaced review 1/3/7/14/30', () => {
  it('advances on correct and resets on wrong', () => {
    const s = defaults(); let day = '2026-12-01';
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) { scheduleReview(s, 'x', true, day); const due = s.reviews.x.due; seen.push((Date.parse(due) - Date.parse(day)) / 864e5); day = due; }
    expect(seen).toEqual(INTERVALS);
    scheduleReview(s, 'x', false, day); expect(s.reviews.x.step).toBe(0);
    expect(dueIds(s, '2099-01-01')).toEqual(['x']); expect(dueIds(s, '2000-01-01')).toEqual([]);
  });
});

describe('streak counts only scheduled weekdays', () => {
  // 2026-12-07 is a Monday
  const days = [1, 2, 3, 4, 5];
  it('a skipped weekend does not break it', () => expect(streak(['2026-12-03', '2026-12-04', '2026-12-07'], days, '2026-12-07')).toBe(3));
  it('a missed scheduled day breaks it', () => expect(streak(['2026-12-03', '2026-12-07'], days, '2026-12-07')).toBe(1));
  it('today not yet done does not break it', () => expect(streak(['2026-12-04'], days, '2026-12-07')).toBe(1));
  it('respects a custom schedule', () => expect(streak(['2026-12-05', '2026-12-07'], [1, 6], '2026-12-07')).toBe(2));
});

describe('rank is tied to completed units, not XP', () => {
  it('lots of XP alone stays apprentice 1', () => { const s = defaults(); addXp(s, 100000); expect(rank(s)).toBe('apprentice-1'); });
  it('advances unit by unit; journeyman needs the commissioning check', () => {
    const s = defaults(); const done = (...d: number[]) => d.forEach((x) => (s.completedDays[String(x)] = { date: 'x', score: 1 }));
    done(1, 2); expect(rank(s)).toBe('apprentice-2'); done(3, 4); expect(rank(s)).toBe('apprentice-3');
    done(5, 6, 7, 8, 9); expect(rank(s)).toBe('apprentice-4'); expect(nextDay(s)).toBe(10);
    s.commissioningPassed = true; expect(rank(s)).toBe('journeyman-ready');
  });
});

describe('question shuffle and grading', () => {
  const q = { id: 'q1', body: { format: 'mcq', answers: [{ text: 'right', correct: true }, { text: 'b', distractorWhy: 'x' }, { text: 'c', distractorWhy: 'x' }, { text: 'd', distractorWhy: 'x' }] } };
  it('correct answer position is roughly uniform over 1000 seeds', () => {
    const pos = [0, 0, 0, 0];
    for (let s = 0; s < 1000; s++) pos[present(q, s).options.findIndex((o) => o.index === 0)]++;
    for (const n of pos) { expect(n).toBeGreaterThan(190); expect(n).toBeLessThan(310); }
  });
  it('is deterministic per seed', () => expect(present(q, 5)).toEqual(present(q, 5)));
  it('grades mcq, multi, order and tap', () => {
    expect(grade(q, [0])).toBe(true); expect(grade(q, [1])).toBe(false);
    const m = { body: { format: 'multi-select', answers: [{ correct: true }, { correct: true }, {}, {}] } };
    expect(grade(m, [1, 0])).toBe(true); expect(grade(m, [0])).toBe(false); expect(grade(m, [0, 1, 2])).toBe(false);
    const o = { body: { format: 'order-steps', steps: ['a', 'b', 'c'] } }; expect(grade(o, [0, 1, 2])).toBe(true); expect(grade(o, [1, 0, 2])).toBe(false);
    const t = { body: { format: 'tap-schematic', tapTargets: ['PB1.c'] } }; expect(grade(t, ['PB1.c'])).toBe(true); expect(grade(t, ['PL1'])).toBe(false);
  });
});
beforeEach(() => {});


describe('in-progress day session persists across view switches and reloads', () => {
  const ids = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];
  const start = (save = defaults()) => openSession(save, {
    day: 1, extraRep: false, date: '2026-11-26',
    warmIds: [], questionIds: ids, faultIds: ['open-start'], cardCount: 4,
  });

  it('keeps practice position, answers, and score when switching views mid-practice', () => {
    const save = defaults();
    const sess = start(save);
    patchSession(save, { phase: 'practice', index: 0, lessonXpAwarded: true });
    // Six questions graded (five right, one wrong) — player is now on practice question 7.
    for (const [id, ok] of [['q1', true], ['q2', true], ['q3', true], ['q4', false], ['q5', true], ['q6', true]] as const) {
      recordAttempt(save, id, ok);
    }
    setDraft(save, { chosen: [2], taps: [] });
    expect(sess.phase).toBe('practice');
    expect(sess.index).toBe(6);
    expect(sess.stats).toEqual({ right: 5, total: 6 });
    expect(sess.attempts.map((a) => a.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6']);
    expect(sess.draft).toEqual({ chosen: [2], taps: [] });

    // Simulate leaving the Work order view (Bucket / Lessons / Progress / Settings) then coming back:
    // the view is destroyed; a new runSession calls openSession again.
    const resumed = openSession(save, {
      day: 1, extraRep: false, date: '2026-11-26',
      warmIds: ['stale-warm'], questionIds: ids.map((id) => id + '-new'), faultIds: [], cardCount: 4,
    });
    expect(resumed).toBe(sess);
    expect(resumed.phase).toBe('practice');
    expect(resumed.index).toBe(6);
    expect(resumed.stats).toEqual({ right: 5, total: 6 });
    expect(resumed.attempts).toEqual(sess.attempts);
    expect(resumed.draft).toEqual({ chosen: [2], taps: [] });
    expect(resumed.questionIds).toEqual(ids);

    // Reload from serialized save (localStorage / export) also resumes mid-day.
    const reloaded = parseSave(JSON.parse(exportJson(save)));
    expect(reloaded.session?.phase).toBe('practice');
    expect(reloaded.session?.index).toBe(6);
    expect(reloaded.session?.stats).toEqual({ right: 5, total: 6 });
    expect(reloaded.session?.attempts).toHaveLength(6);
    expect(reloaded.session?.attempts[3]).toEqual({ id: 'q4', ok: false });
    expect(reloaded.session?.draft).toEqual({ chosen: [2], taps: [] });
    expect(reloaded.session?.questionIds).toEqual(ids);
    const afterReload = openSession(reloaded, {
      day: 1, extraRep: false, date: '2026-11-27',
      warmIds: [], questionIds: ids, faultIds: [], cardCount: 4,
    });
    expect(afterReload.index).toBe(6);
    expect(afterReload.stats).toEqual({ right: 5, total: 6 });
  });

  it('migrates a v2 save to v3 with a null session', () => {
    const s = parseSave({ version: 2, xp: 10 });
    expect(s.version).toBe(3);
    expect(s.session).toBeNull();
  });

  it('does not let an extra-rep start clobber an official day in progress', () => {
    const save = defaults();
    const official = start(save);
    patchSession(save, { phase: 'practice', index: 6 });
    expect(hasActiveSession(save, false)).toBe(true);
    expect(hasActiveSession(save, true)).toBe(false);
    const attempted = openSession(save, {
      day: 3, extraRep: true, date: '2026-11-26',
      warmIds: [], questionIds: ['extra-a'], faultIds: [], cardCount: 0,
    });
    expect(attempted).toBe(official);
    expect(attempted.day).toBe(1);
    expect(attempted.extraRep).toBe(false);
    expect(attempted.index).toBe(6);
    expect(attempted.phase).toBe('practice');
  });

  it('starts a new session only after the previous one is cleared or completed', () => {
    const save = defaults();
    const first = start(save);
    patchSession(save, { phase: 'wrap', completed: true, index: 0 });
    const next = openSession(save, {
      day: 2, extraRep: false, date: '2026-11-27',
      warmIds: [], questionIds: ['d2-q1'], faultIds: [], cardCount: 3,
    });
    expect(next).not.toBe(first);
    expect(next.day).toBe(2);
    expect(next.phase).toBe('lesson');
    expect(next.index).toBe(0);
    clearSession(save);
    expect(hasActiveSession(save, false)).toBe(false);
    expect(parseSession(null)).toBeNull();
  });
});
