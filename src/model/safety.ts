// Example LOTO / electrically-safe-work-condition sequence (design.md 4.2). Framed as an EXAMPLE procedure:
// always follow your employer's procedure. User approved this standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26.
export type LotoStep =
  | 'identify' | 'notify' | 'shutdown' | 'isolate' | 'lock' | 'tag' | 'release-stored'
  | 'try-start' | 'meter-known-before' | 'test-absence' | 'meter-known-after';
export interface LotoEvent { step: LotoStep; source?: 'bucket' | 'foreign'; pair?: [string, string] }

export const REQUIRED_SOURCES: ('bucket' | 'foreign')[] = ['bucket', 'foreign'];
export const REQUIRED_PAIRS: [string, string][] = [['X1', 'X2'], ['X1', 'G'], ['X2', 'G'], ['w91', 'w92'], ['w91', 'G'], ['w92', 'G']];
const key = (p: [string, string]) => [...p].sort().join('|');

export interface LotoCheck { ok: boolean; violations: string[] }
export function checkLoto(ev: LotoEvent[]): LotoCheck {
  const v: string[] = [];
  const idx = (s: LotoStep, src?: string) => ev.findIndex((e) => e.step === s && (!src || e.source === src));
  const idAll = REQUIRED_SOURCES.map((s) => idx('identify', s));
  REQUIRED_SOURCES.forEach((s, i) => { if (idAll[i] < 0) v.push(`did not identify the ${s} energy source before starting`); });
  const iShut = idx('shutdown');
  if (iShut < 0) v.push('no normal shutdown step');
  else if (idAll.some((i) => i >= 0 && i > iShut)) v.push('shut down before identifying every energy source');
  for (const s of REQUIRED_SOURCES) {
    const iso = idx('isolate', s), lock = idx('lock', s), tag = idx('tag', s);
    if (iso < 0) v.push(`${s} source not isolated`);
    else if (iShut >= 0 && iso < iShut) v.push(`isolated the ${s} source before shutdown`);
    if (lock < 0) v.push(`no lock applied at the ${s} isolation point`);
    else if (iso >= 0 && lock < iso) v.push(`lock applied before isolating the ${s} source`);
    if (tag < 0) v.push(`no tag at the ${s} isolation point`);
  }
  const iStored = idx('release-stored');
  if (iStored < 0) v.push('stored energy not relieved, disconnected or restrained');
  // OSHA 1910.333(b)(2)(iv)(A): operate the equipment controls (or otherwise verify) that it cannot be restarted,
  // after every lock is on and before the meter test of (iv)(B).
  const iTry = idx('try-start');
  const lastLockT = Math.max(...REQUIRED_SOURCES.map((s) => idx('lock', s)));
  if (iTry < 0) v.push('did not operate the start controls to verify the equipment cannot restart');
  else if (iTry < lastLockT) v.push('tried the start controls before every lock was applied');
  const before = idx('meter-known-before');
  if (before < 0) v.push('did not verify the meter on a known live source first (live-dead-live)');
  const tests = ev.map((e, i) => ({ e, i })).filter((x) => x.e.step === 'test-absence');
  for (const p of REQUIRED_PAIRS) if (!tests.some((t) => t.e.pair && key(t.e.pair) === key(p))) v.push(`no absence-of-voltage test on ${p[0]}-${p[1]}`);
  if (tests.length && before >= 0 && tests.some((t) => t.i < before)) v.push('tested for absence before verifying the meter');
  const after = idx('meter-known-after');
  if (after < 0) v.push('did not re-verify the meter on a known live source after testing');
  else if (tests.some((t) => t.i > after)) v.push('re-verified the meter before finishing the absence tests');
  const lastLock = Math.max(...REQUIRED_SOURCES.map((s) => idx('lock', s)));
  if (tests.length && tests.some((t) => t.i < lastLock)) v.push('tested for absence before every lock was applied');
  if (iStored >= 0 && tests.length && tests.some((t) => t.i < iStored)) v.push('verified isolation before relieving stored energy');
  return { ok: v.length === 0, violations: v };
}

/** The ordered example sequence (what a perfect run looks like). */
export function perfectLoto(): LotoEvent[] {
  const ev: LotoEvent[] = [{ step: 'identify', source: 'bucket' }, { step: 'identify', source: 'foreign' }, { step: 'notify' }, { step: 'shutdown' }];
  for (const s of REQUIRED_SOURCES) ev.push({ step: 'isolate', source: s }, { step: 'lock', source: s }, { step: 'tag', source: s });
  ev.push({ step: 'release-stored' }, { step: 'try-start' }, { step: 'meter-known-before' });
  for (const p of REQUIRED_PAIRS) ev.push({ step: 'test-absence', pair: p });
  ev.push({ step: 'meter-known-after' });
  return ev;
}
