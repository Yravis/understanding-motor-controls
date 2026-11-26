// Deterministic seeded RNG (mulberry32). Same seed => same scenario, readings, shuffles.
export class Rng {
  private s: number;
  constructor(seed: number | string) {
    this.s = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n: number): number { return Math.floor(this.next() * n); }
  range(lo: number, hi: number): number { return lo + (hi - lo) * this.next(); }
  pick<T>(a: readonly T[]): T { return a[this.int(a.length)]; }
  bool(p = 0.5): boolean { return this.next() < p; }
}
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** Seeded Fisher-Yates; returns a new array. */
export function shuffle<T>(a: readonly T[], seed: number | string): T[] {
  const r = new Rng(seed);
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) { const j = r.int(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
