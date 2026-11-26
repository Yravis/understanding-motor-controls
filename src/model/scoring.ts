// Diagnosis scoring: root cause (required), safety, efficiency vs the model-computed minimum, and a
// penalty for replacing good parts. Grades diagnosis and process, never a specific typical meter value.
import { Bucket, buildBucket } from './bucket';
import { Params } from './params';
import { FaultDef, buildFaulted, candidateProbes, distinguishes, observations } from './faults';
import { checkLoto, LotoEvent } from './safety';

export interface Attempt {
  diagnosis: string | null;          // component id named as the root cause
  replaced: string[];                // components the player replaced
  measurementCount: number;
  strikes: number;                   // e.g. ohms on an energized circuit
  loto: LotoEvent[];
  lotoRequired?: boolean;
}
export interface Score {
  rootCause: boolean; safety: number; efficiency: number; partsPenalty: number;
  violations: string[]; total: number; xp: number; passed: boolean;
}

/** Greedy set cover over model-generated observations: smallest measurement set (upper bound) that separates `f` from all others. */
export function minimalMeasurements(p: Params, f: FaultDef, all: FaultDef[], cache?: Map<string, Map<string, string>>): number {
  const probes = candidateProbes(buildBucket(p));
  const obs = (d: FaultDef | null) => {
    const k = d?.id ?? 'healthy';
    if (cache?.has(k)) return cache.get(k)!;
    const m = observations(d ? buildFaulted(p, d) : buildBucket(p), probes);
    cache?.set(k, m);
    return m;
  };
  const mine = obs(f);
  const others = [null, ...all.filter((x) => x.id !== f.id)];
  // Lamp states, hum and the fuse are free observations; only meter readings count as measurements.
  const isFree = (k: string) => /:(lit|hum|fuse)$/.test(k);
  const diffs = others.map((o) => distinguishes(mine, obs(o)));
  if (diffs.some((r) => r.length === 0)) return Infinity;
  let count = 0;
  let left = diffs.filter((keys) => !keys.some(isFree)).map((keys) => new Set(keys));
  while (left.some((s) => s.size)) {
    const tally = new Map<string, number>();
    for (const s of left) for (const k of s) tally.set(k, (tally.get(k) ?? 0) + 1);
    let best = '', n = 0;
    for (const [k, v] of tally) if (v > n) { best = k; n = v; }
    left = left.filter((s) => !s.has(best));
    count++;
  }
  return Math.max(1, count);
}

export function scoreAttempt(f: FaultDef, a: Attempt, minMeas: number): Score {
  const violations: string[] = [];
  if (a.lotoRequired !== false) violations.push(...checkLoto(a.loto).violations);
  if (a.strikes > 0) violations.push(`${a.strikes} ohmmeter reading(s) on an energized circuit`);
  const rootCause = a.diagnosis === f.rootCause;
  const goodParts = a.replaced.filter((r) => !f.fixActions.some((x) => x.target === r));
  const partsPenalty = goodParts.length * 15;
  const safety = Math.max(0, 100 - violations.length * 25);
  // The model minimum is an omniscient lower bound (one well-chosen reading), so a practical allowance of 4 extra readings is free.
  const extra = Math.max(0, a.measurementCount - (Math.max(minMeas, 1) + 4));
  const efficiency = Math.max(0, 100 - extra * 8);
  const total = rootCause ? Math.max(0, Math.round(0.5 * 100 + 0.3 * safety + 0.2 * efficiency - partsPenalty)) : 0;
  const xp = rootCause ? Math.max(0, Math.round(total / 2) - violations.length * 10) : 0;
  return { rootCause, safety, efficiency, partsPenalty, violations, total, xp, passed: rootCause && violations.length === 0 };
}
export type { Bucket };
