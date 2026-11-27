// In-progress day session, held on the save object (outside any view) and written to localStorage
// with the rest of the save. Switching tabs or reloading resumes mid-day instead of restarting.
import type { Save } from './save';

export type SessionPhase = 'warm' | 'lesson' | 'practice' | 'activity' | 'wrap';

export interface SessionAttempt { id: string; ok: boolean }

export type DockTab = 'work' | 'lesson' | 'schem' | 'loto' | 'log';
export const DOCK_TABS: DockTab[] = ['work', 'lesson', 'schem', 'loto', 'log'];
export type MeterModeId = 'VAC' | 'LOZ' | 'VDC' | 'OHMS' | 'CONT';
const METER_MODES: MeterModeId[] = ['VAC', 'LOZ', 'VDC', 'OHMS', 'CONT'];
export interface LogEntry { t: number; kind: 'info' | 'ok' | 'warn'; text: string }
export interface ViewBoxState { x: number; y: number; w: number; h: number }

/** Everything the one-screen day shows that is not a question answer: survives dock-tab switches, view switches and reloads. */
export interface DayUi {
  step: string;                     // current step id
  done: string[];                   // step ids completed so far
  tab: DockTab;
  doorOpen: boolean;
  doorOpened: boolean;              // door has been opened at least once this session (Tour check)
  handleOn: boolean;                // disconnect handle: ON = bucket control source live
  locked: boolean;                  // lock + tag on the handle (only with the handle OFF)
  fusePulled: boolean;
  inspected: string[];              // device tags whose nameplate was read
  found: string[];                  // 'w91' | 'w92' | 'label'
  proved: boolean;                  // X1-X2 read in VAC on the live bucket
  tool: 'probe' | 'operate';
  meter: { mode: MeterModeId; red: string | null; black: string | null; x: number | null; y: number | null; min: boolean };
  view: ViewBoxState | null;        // zoom/pan; null = fit
  coach: { x: number | null; y: number | null; folded: boolean };
  photo: { on: boolean; opacity: number };
  log: LogEntry[];
}
export const LOG_MAX = 200;

export function defaultUi(day: number): DayUi {
  return {
    step: '', done: [], tab: day === 1 ? 'lesson' : 'work',
    doorOpen: day !== 1, doorOpened: false, handleOn: true, locked: false, fusePulled: false,
    inspected: [], found: [], proved: false, tool: 'probe',
    meter: { mode: 'VAC', red: null, black: null, x: null, y: null, min: false },
    view: null, coach: { x: null, y: null, folded: false }, photo: { on: false, opacity: 40 }, log: [],
  };
}

/** Defensive parse: unknown / missing / wrong-typed fields fall back to defaults so an old or hand-edited save still loads. */
export function parseDayUi(raw: unknown, day: number): DayUi | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, any>;
  const d = defaultUi(day);
  const strs = (x: unknown) => (Array.isArray(x) ? [...new Set(x.filter((v) => typeof v === 'string') as string[])] : []);
  const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
  const bool = (x: unknown, f: boolean) => (typeof x === 'boolean' ? x : f);
  if (typeof r.step === 'string') d.step = r.step;
  d.done = strs(r.done);
  if (DOCK_TABS.includes(r.tab)) d.tab = r.tab;
  d.doorOpen = bool(r.doorOpen, d.doorOpen); d.doorOpened = bool(r.doorOpened, d.doorOpened) || d.doorOpen;
  d.handleOn = bool(r.handleOn, d.handleOn); d.locked = bool(r.locked, d.locked) && !d.handleOn; d.fusePulled = bool(r.fusePulled, false);
  d.inspected = strs(r.inspected); d.found = strs(r.found); d.proved = bool(r.proved, false);
  if (r.tool === 'probe' || r.tool === 'operate') d.tool = r.tool;
  if (r.meter && typeof r.meter === 'object') {
    const m = r.meter;
    if (METER_MODES.includes(m.mode)) d.meter.mode = m.mode;
    d.meter.red = typeof m.red === 'string' ? m.red : null;
    d.meter.black = d.meter.red && typeof m.black === 'string' ? m.black : null;
    d.meter.x = fin(m.x) ? m.x : null; d.meter.y = fin(m.y) ? m.y : null; d.meter.min = bool(m.min, false);
  }
  const v = r.view;
  if (v && typeof v === 'object' && fin(v.x) && fin(v.y) && fin(v.w) && fin(v.h) && v.w > 1 && v.h > 1 && v.w < 1e5 && v.h < 1e5) d.view = { x: v.x, y: v.y, w: v.w, h: v.h };
  if (r.coach && typeof r.coach === 'object') { d.coach.x = fin(r.coach.x) ? r.coach.x : null; d.coach.y = fin(r.coach.y) ? r.coach.y : null; d.coach.folded = bool(r.coach.folded, false); }
  if (r.photo && typeof r.photo === 'object') { d.photo.on = bool(r.photo.on, false); if (fin(r.photo.opacity)) d.photo.opacity = Math.max(0, Math.min(100, Math.round(r.photo.opacity))); }
  if (Array.isArray(r.log)) d.log = r.log.filter((e: any) => e && fin(e.t) && typeof e.text === 'string').slice(-LOG_MAX).map((e: any) => ({ t: e.t, kind: e.kind === 'ok' || e.kind === 'warn' ? e.kind : 'info', text: e.text }));
  return d;
}

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
  ui?: DayUi;                       // one-screen day shell state (optional: older saves have none)
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
  const ui = parseDayUi(s.ui, out.day);
  if (ui) out.ui = ui;
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
