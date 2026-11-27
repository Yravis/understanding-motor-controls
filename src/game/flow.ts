// The day's phase flow (warm-up -> cards -> practice -> activity -> wrap), as pure functions on the save.
// The UI calls these; they never touch the DOM, so persistence and rules are unit-tested without a browser.
import type { Save } from './save';
import { patchSession, recordAttempt, clearSession, type InProgressSession, type SessionPhase } from './session';
import { addXp, XP, scheduleReview } from './progress';
import { isNativeDay } from './steps';

export interface FlowCtx { save: Save; today: string; cardCount: number; hasScenario: boolean }

export function goPhase(save: Save, phase: SessionPhase, index = 0, extra: Partial<InProgressSession> = {}): InProgressSession {
  return patchSession(save, { phase, index, ...extra });
}

/** Warm-up item finished (card self-rating or question answered): schedule the review and move to the next item. */
export function warmCardAnswered(save: Save, id: string, remembered: boolean, today: string): void {
  scheduleReview(save, id, remembered, today);
  patchSession(save, { index: (save.session?.index ?? 0) + 1 });
}
export function warmQuestionGraded(save: Save, id: string, ok: boolean, today: string): void {
  scheduleReview(save, id, ok, today);
  recordAttempt(save, id, ok);
}
/** After the last warm-up item (or none): lessons, or straight to practice for extra reps / days without cards. */
export function afterWarm(c: FlowCtx): void {
  const s = c.save.session!;
  goPhase(c.save, c.cardCount && !s.extraRep ? 'lesson' : 'practice', 0);
}
/** After the last lesson card: award the card-set XP once, then practice. */
export function afterCards(c: FlowCtx): void {
  const s = c.save.session!;
  if (!s.lessonXpAwarded) { addXp(c.save, XP.cardSet); patchSession(c.save, { lessonXpAwarded: true }); }
  goPhase(c.save, 'practice', 0);
}
export function practiceGraded(save: Save, q: { id: string; version: number }, ok: boolean, today: string): void {
  if (ok) addXp(save, XP.correct);
  scheduleReview(save, q.id, ok, today);
  const a = (save.answers[q.id] ??= { version: q.version, right: 0, wrong: 0, last: today });
  if (ok) a.right++; else a.wrong++;
  a.version = q.version; a.last = today;
  recordAttempt(save, q.id, ok);
}
/** After the last practice question: the activity (Day 1 runs its steps on the new bucket, so it starts already open), or wrap-up. */
export function afterPractice(c: FlowCtx): void {
  const s = c.save.session!;
  if (s.extraRep || !c.hasScenario) { finishDay(c.save, c.today); return; }
  goPhase(c.save, 'activity', 0, { activityStarted: isNativeDay(s.day), activitySubmitted: false });
}

/** Wrap-up: record the day once (completedDays, XP, activity date). Idempotent. */
export function finishDay(save: Save, today: string): InProgressSession {
  const s = save.session!;
  if (!s.completed) {
    if (!s.extraRep) { save.completedDays[String(s.day)] = { date: today, score: s.stats.total ? Math.round((100 * s.stats.right) / s.stats.total) : 0 }; addXp(save, XP.activity); }
    if (!save.activity.includes(today)) save.activity.push(today);
    patchSession(save, { phase: 'wrap', completed: true });
  }
  return s;
}
/** Native bucket day: closing the tour awards the activity XP (the classic work order does the same on "Finish activity"). */
export function finishNativeActivity(save: Save, today: string): void {
  const s = save.session!;
  if (s.phase === 'wrap' || s.completed) return;
  addXp(save, XP.activity);
  finishDay(save, today);
}
/** Classic work order finished (all tickets submitted). Day 10 commissioning needs two clean passes. */
export function finishClassicActivity(save: Save, today: string, hadFault: boolean): void {
  const s = save.session!;
  if (!hadFault) addXp(save, XP.activity);
  if (s.day === 10 && s.passes >= 2) save.commissioningPassed = true;
  finishDay(save, today);
}
export function dismissSession(save: Save): void { clearSession(save); }
