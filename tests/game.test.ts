import { describe, it, expect, beforeEach } from 'vitest';
import { defaults, parseSave, exportJson, importText, exportCode, SAVE_VERSION } from '../src/game/save';
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
