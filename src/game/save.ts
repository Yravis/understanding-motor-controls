// Versioned localStorage save with migrations, JSON export/import (file or pasted code).
import { SAVE_KEY } from '../config';
import { InProgressSession, parseSession } from './session';

export const SAVE_VERSION = 3;
export interface ReviewState { step: number; due: string; seen: number }
export interface Save {
  version: number;
  settings: { theme: 'auto' | 'light' | 'dark'; days: number[]; bookFree: boolean };
  xp: number;
  completedDays: Record<string, { date: string; score: number }>; // key = day number
  reviews: Record<string, ReviewState>;                              // key = item id (cards and questions)
  answers: Record<string, { version: number; right: number; wrong: number; last: string }>;
  tickets: { faultId: string; date: string; score: number; passed: boolean }[];
  safetyViolations: number;
  bookScores: Record<string, { got: number; total: number; date: string }>; // key = unit number
  activity: string[];                                                // dates with a finished session
  commissioningPassed: boolean;
  session: InProgressSession | null;                                 // mid-day lesson/practice; survives tab switches and reloads
}
export const defaults = (): Save => ({
  version: SAVE_VERSION, settings: { theme: 'auto', days: [1, 2, 3, 4, 5], bookFree: true }, xp: 0, completedDays: {}, reviews: {}, answers: {},
  tickets: [], safetyViolations: 0, bookScores: {}, activity: [], commissioningPassed: false, session: null,
});

type Raw = Record<string, any>;
/** Migrations: each takes version n to n+1. */
const MIGRATIONS: Record<number, (s: Raw) => Raw> = {
  // v1 (early prototype): { version:1, points, done:number[] }
  1: (s) => ({
    ...s, version: 2, xp: Number(s.points) || 0,
    completedDays: Object.fromEntries((Array.isArray(s.done) ? s.done : []).map((d: number) => [String(d), { date: '1970-01-01', score: 0 }])),
  }),
  // v2: add in-progress day session (null if none)
  2: (s) => ({ ...s, version: 3, session: s.session ?? null }),
};

export function parseSave(raw: unknown): Save {
  let s = raw as Raw;
  if (!s || typeof s !== 'object' || typeof s.version !== 'number') throw new Error('Not a Motor Controls save file.');
  if (s.version > SAVE_VERSION) throw new Error('This save is from a newer version of the app.');
  while (s.version < SAVE_VERSION) { const m = MIGRATIONS[s.version]; if (!m) throw new Error('Unknown save version ' + s.version); s = m(s); }
  const d = defaults();
  const num = (x: unknown, f = 0) => (Number.isFinite(x) ? Number(x) : f);
  d.xp = Math.max(0, Math.round(num(s.xp)));
  if (s.settings && typeof s.settings === 'object') {
    if (['auto', 'light', 'dark'].includes(s.settings.theme)) d.settings.theme = s.settings.theme;
    if (Array.isArray(s.settings.days)) { const days = [...new Set<number>(s.settings.days.filter((x: unknown) => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 6))]; if (days.length) d.settings.days = days.sort(); }
    d.settings.bookFree = s.settings.bookFree !== false;
  }
  if (s.completedDays && typeof s.completedDays === 'object') for (const [k, v] of Object.entries<any>(s.completedDays)) if (v && typeof v.date === 'string') d.completedDays[k] = { date: v.date, score: num(v.score) };
  if (s.reviews && typeof s.reviews === 'object') for (const [k, v] of Object.entries<any>(s.reviews)) if (v && typeof v.due === 'string') d.reviews[k] = { step: Math.max(0, Math.min(4, num(v.step))), due: v.due, seen: num(v.seen) };
  if (s.answers && typeof s.answers === 'object') for (const [k, v] of Object.entries<any>(s.answers)) if (v) d.answers[k] = { version: num(v.version, 1), right: num(v.right), wrong: num(v.wrong), last: String(v.last ?? '') };
  if (Array.isArray(s.tickets)) d.tickets = s.tickets.filter((t: any) => t && typeof t.faultId === 'string').map((t: any) => ({ faultId: t.faultId, date: String(t.date), score: num(t.score), passed: !!t.passed }));
  d.safetyViolations = Math.max(0, num(s.safetyViolations));
  if (s.bookScores && typeof s.bookScores === 'object') for (const [k, v] of Object.entries<any>(s.bookScores)) if (v) d.bookScores[k] = { got: num(v.got), total: num(v.total), date: String(v.date ?? '') };
  if (Array.isArray(s.activity)) d.activity = s.activity.filter((a: unknown) => typeof a === 'string');
  d.commissioningPassed = !!s.commissioningPassed;
  d.session = parseSession(s.session);
  return d;
}

let cache: Save | null = null;
export function getSave(): Save {
  if (cache) return cache;
  try { const raw = localStorage.getItem(SAVE_KEY); cache = raw ? parseSave(JSON.parse(raw)) : defaults(); } catch { cache = defaults(); }
  return cache;
}
export function commit(): void { if (cache) localStorage.setItem(SAVE_KEY, JSON.stringify(cache)); }
export function replaceSave(s: Save): void { cache = s; commit(); }
/** Test helper: install a save (or defaults) as the in-memory cache without touching an existing one accidentally. */
export function resetSaveForTests(s?: Save): Save { cache = s ?? defaults(); return cache; }
export const exportJson = (s: Save = getSave()): string => JSON.stringify(s, null, 2);
/** Accepts raw JSON or a pasted code (base64 of the JSON). */
export function importText(text: string): Save {
  const t = text.trim();
  let json: unknown;
  try { json = JSON.parse(t); } catch { try { json = JSON.parse(decodeURIComponent(escape(atob(t)))); } catch { throw new Error('Could not read that save. Paste the exported JSON or code.'); } }
  return parseSave(json);
}
export const exportCode = (s: Save = getSave()): string => btoa(unescape(encodeURIComponent(JSON.stringify(s))));
