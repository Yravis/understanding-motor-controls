// In-progress day session, held on the save object (outside any view) and written to localStorage
// with the rest of the save. Switching tabs or reloading resumes mid-day instead of restarting.
import type { Save } from './save';

export type SessionPhase = 'warm' | 'lesson' | 'practice' | 'activity' | 'wrap';

export interface SessionAttempt { id: string; ok: boolean }

export interface InProgressSession {
  day: number;
  extraRep: boolean;
  date: string;
  phase: SessionPhase;
  index: number;
  stats: { right: number; total: number };
  attempts: SessionAttempt[];
  warmIds: string[];
  questionIds: string[];
  faultIds: string[];
  activityStarted: boolean;
  activitySubmitted: boolean;
  passes: number;
  lessonXpAwarded: boolean;
  completed: boolean;
  draft?: { chosen: number[]; taps: string[] };
}

export function parseSession(raw: unknown): InProgressSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, any>;
  const phases: SessionPhase[] = ['warm', 'lesson', 'practice', 'activity', 'wrap'];
  if (!phases.includes(s.phase) || !Number.isInteger(s.day) || s.day < 1) return null;
  const num = (x: unknown, f = 0) => (Number.isFinite(x) ? Number(x) : f);
  const ids = (x: unknown) => (Array.isArray(x) ? x.filter((v) => typeof v === 'string') as string[] : []);
  const out: InProgressSession = {
    day: Math.round(num(s.day, 1)),
    extraRep: !!s.extraRep,
    date: String(s.date ?? ''),
    phase: s.phase,
    index: Math.max(0, Math.round(num(s.index))),
    stats: { right: Math.max(0, Math.round(num(s.stats?.right))), total: Math.max(0, Math.round(num(s.stats?.total))) },
    attempts: Array.isArray(s.attempts) ? s.attempts.filter((a: any) => a && typeof a.id === 'string').map((a: any) => ({ id: a.id, ok: !!a.ok })) : [],
    warmIds: ids(s.warmIds),
    questionIds: ids(s.questionIds),
    faultIds: ids(s.faultIds),
    activityStarted: !!s.activityStarted,
    activitySubmitted: !!s.activitySubmitted,
    passes: Math.max(0, Math.round(num(s.passes))),
    lessonXpAwarded: !!s.lessonXpAwarded,
    completed: !!s.completed,
  };
  if (s.draft && typeof s.draft === 'object') {
    out.draft = {
      chosen: Array.isArray(s.draft.chosen) ? s.draft.chosen.filter((n: unknown) => Number.isInteger(n)).map(Number) : [],
      taps: Array.isArray(s.draft.taps) ? s.draft.taps.filter((t: unknown) => typeof t === 'string') : [],
    };
  }
  return out;
}

export function hasActiveSession(save: Save, extraRep = false): boolean {
  const s = save.session;
  return !!s && s.extraRep === extraRep && !s.completed;
}

/** Start a new session, or return the existing one when the day and extra-rep flag match. */
export function openSession(save: Save, opts: {
  day: number; extraRep: boolean; date: string;
  warmIds: string[]; questionIds: string[]; faultIds: string[]; cardCount: number;
}): InProgressSession {
  const cur = save.session;
  // Never replace mid-day progress: a tab switch, extra-rep start, or a different-day click resumes the open session.
  if (cur && !cur.completed) return cur;
  const phase: SessionPhase = opts.extraRep || !opts.cardCount ? 'practice' : opts.warmIds.length ? 'warm' : 'lesson';
  save.session = {
    day: opts.day, extraRep: opts.extraRep, date: opts.date, phase, index: 0,
    stats: { right: 0, total: 0 }, attempts: [],
    warmIds: opts.warmIds, questionIds: opts.questionIds, faultIds: opts.faultIds,
    activityStarted: false, activitySubmitted: false, passes: 0, lessonXpAwarded: false, completed: false,
  };
  return save.session;
}

export function patchSession(save: Save, patch: Partial<InProgressSession>): InProgressSession {
  if (!save.session) throw new Error('no in-progress session');
  Object.assign(save.session, patch);
  if (patch.stats) save.session.stats = { ...save.session.stats, ...patch.stats };
  return save.session;
}

export function setDraft(save: Save, draft: InProgressSession['draft']): void {
  if (!save.session) return;
  if (draft) save.session.draft = { chosen: [...draft.chosen], taps: [...draft.taps] };
  else delete save.session.draft;
}

/** Record one graded practice (or warm-up question) answer. Does not award XP; the caller does that once. */
export function recordAttempt(save: Save, id: string, ok: boolean): InProgressSession {
  const s = save.session;
  if (!s) throw new Error('no in-progress session');
  s.attempts.push({ id, ok });
  s.stats.total += 1;
  if (ok) s.stats.right += 1;
  s.index += 1;
  delete s.draft;
  return s;
}

export function clearSession(save: Save): void {
  save.session = null;
}
