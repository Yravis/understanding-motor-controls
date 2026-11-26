// Runtime question presentation: seeded shuffle of stored (correct-first) answers, and grading.
import { shuffle } from '../model/rng';

export interface Presented { qid: string; format: string; options: { text: string; index: number }[]; multi: boolean }
export function present(q: any, seed: number | string): Presented {
  const b = q.body;
  if (b.format === 'order-steps') return { qid: q.id, format: b.format, options: shuffle(b.steps as string[], seed + q.id).map((text: string) => ({ text, index: (b.steps as string[]).indexOf(text) })), multi: false };
  if (!b.answers) return { qid: q.id, format: b.format, options: [], multi: false };
  const idx = (b.answers as unknown[]).map((_, i) => i);
  const order = shuffle(idx, seed + q.id);
  return { qid: q.id, format: b.format, options: order.map((i) => ({ text: b.answers[i].text, index: i })), multi: b.format === 'multi-select' };
}
/** response: chosen original indices (mcq / multi), ordered original indices (order-steps), or tapped element ids. */
export function grade(q: any, response: number[] | string[]): boolean {
  const b = q.body;
  if (b.format === 'order-steps') return (response as number[]).length === b.steps.length && (response as number[]).every((v, i) => v === i);
  if (b.format === 'tap-schematic') { const t = new Set<string>(b.tapTargets); const r = new Set(response as string[]); return r.size === t.size && [...r].every((x) => t.has(x)); }
  const correct = new Set<number>((b.answers as any[]).map((a, i) => (a.correct ? i : -1)).filter((i) => i >= 0));
  const r = new Set(response as number[]);
  return r.size === correct.size && [...r].every((x) => correct.has(x));
}
