// Pure game rules: spaced review, streaks on scheduled weekdays, XP, ranks tied to book units.
import type { Save } from './save';

export const INTERVALS = [1, 3, 7, 14, 30]; // days
export const dayKey = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseKey = (k: string): Date => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k: string, n: number): string => { const d = parseKey(k); d.setDate(d.getDate() + n); return dayKey(d); };

export function scheduleReview(save: Save, id: string, correct: boolean, today: string): void {
  const r = save.reviews[id] ?? { step: -1, due: today, seen: 0 };
  const step = correct ? Math.min(INTERVALS.length - 1, r.step + 1) : 0;
  save.reviews[id] = { step, due: addDays(today, INTERVALS[step]), seen: r.seen + 1 };
}
export const dueIds = (save: Save, today: string): string[] => Object.entries(save.reviews).filter(([, r]) => r.due <= today).sort((a, b) => a[1].due.localeCompare(b[1].due)).map(([id]) => id);

/** Streak counts only scheduled weekdays; unscheduled days (e.g. weekend) never break it. Today not yet done does not break it. */
export function streak(activity: string[], scheduled: number[], today: string): number {
  const done = new Set(activity);
  let n = 0;
  let k = today;
  for (let i = 0; i < 400; i++) {
    const sched = scheduled.includes(parseKey(k).getDay());
    if (sched) { if (done.has(k)) n++; else if (k !== today) break; }
    else if (done.has(k)) n++; // extra credit session on an off day
    k = addDays(k, -1);
  }
  return n;
}

export const XP = { cardSet: 10, correct: 5, activity: 15, safetyViolation: 15, wrong: 0 };
export const unitDays: Record<number, number[]> = { 1: [1, 2], 2: [3, 4], 3: [5, 6, 7, 8, 9] };
export const RANKS = ['apprentice-1', 'apprentice-2', 'apprentice-3', 'apprentice-4', 'journeyman-ready'] as const;
export const RANK_TITLE: Record<string, string> = { 'apprentice-1': 'Apprentice, 1st year', 'apprentice-2': 'Apprentice, 2nd year', 'apprentice-3': 'Apprentice, 3rd year', 'apprentice-4': 'Apprentice, 4th year', 'journeyman-ready': 'Journeyman-ready' };

/** Rank follows completed BOOK UNITS (and the commissioning check), never XP alone. */
export function rank(save: Save): string {
  const done = (u: number) => unitDays[u].every((d) => save.completedDays[String(d)]);
  if (done(1) && done(2) && done(3) && save.commissioningPassed) return 'journeyman-ready';
  if (done(1) && done(2) && done(3)) return 'apprentice-4';
  if (done(1) && done(2)) return 'apprentice-3';
  if (done(1)) return 'apprentice-2';
  return 'apprentice-1';
}
export const nextDay = (save: Save): number => { for (let d = 1; d <= 10; d++) if (!save.completedDays[String(d)]) return d; return 10; };
export function addXp(save: Save, n: number): void { save.xp = Math.max(0, save.xp + n); }
