import { existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { loadContent } from '../scripts/lib/content';
import { itemSchema } from '../src/content/schema';
import { bucket } from './helpers';
import { runScript } from '../src/model/faults';
import { LAMP_IDS } from '../src/model/bucket';

const content = loadContent();
const items = content.items;
const questions = items.filter((i) => i.type === 'question');
const cards = items.filter((i) => i.type === 'lessonCard');
const BANNED = /all of the above|none of the above|both of the above|all the above|none of these|mike holt|according to the book/i;
const UNIT = /\d\s*(VA|Ω|ohms?|kΩ|MΩ|psi|°F|mA|µA|pF|%|seconds?|s)\b/;

describe('content schema', () => {
  it('has content', () => { expect(items.length).toBeGreaterThan(0); });
  it('every item validates', () => {
    for (const it of items) { const r = itemSchema.safeParse(it); expect(r.success ? [] : r.error.issues.map((i) => it.id + ' ' + i.path.join('.') + ': ' + i.message), it.id).toEqual([]); }
  });
  it('ids are unique and carry the right section', () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const it of items) expect(it.id.startsWith(`ch01.u${it.book.unit}.s${String(it.book.section).replace('.', '-')}.`) || it.type === 'deviceSpec' , it.id).toBe(true);
  });
  it('citations present: every item has a claim, book section/page from the manifest, provisional alignment', () => {
    for (const it of items) {
      expect(it.claim?.length, it.id).toBeGreaterThan(14);
      const sec = content.manifest.sections[it.book.section];
      expect(sec, it.id + ' section ' + it.book.section).toBeTruthy();
      expect(it.book.page, it.id).toBe(sec.page);
      expect(it.book.pageStatus).toBe('toc-unverified');
      expect(it.bookAlignment).toBe('provisional');
    }
  });
  it('NEC refs are edition 2026; each is covered by a photo excerpt that exists, or flagged as needing one', () => {
    for (const it of items) for (const n of it.nec) {
      expect(n.edition).toBe(2026);
      const ex = it.excerpts.find((e: any) => (e.covers ?? []).includes(`nec2026:${n.ref}`));
      if (ex) { expect(ex.photo ?? ex.url, it.id).toBeTruthy(); if (ex.photo) { expect(ex.photo.startsWith('review/source-photos/'), ex.photo).toBe(true); if (!process.env.CI) expect(existsSync(ex.photo), ex.photo).toBe(true); } /* photos are box-only (copyright), absent in CI */ }
      else expect(it.reviewerNotes, it.id).toContain('needs user photo of NEC 2026 page');
    }
  });
  it('enforcedNote exists on every item and is null (no unsourced note)', () => {
    for (const it of items) { expect('enforcedNote' in it).toBe(true); expect(it.enforcedNote).toBeNull(); }
  });
  it('symbol cards carry an IEEE 315 cross-check field and an IEC note', () => {
    for (const it of cards.filter((c) => c.body.symbol)) { expect(it.ieee.some((x: any) => x.std === 'IEEE 315'), it.id).toBe(true); expect(it.body.symbol.iecNote.length, it.id).toBeGreaterThan(5); }
  });
  it('LOTO items carry the user approval of the standard OSHA + 70E 2024 approach', () => {
    for (const it of items.filter((i) => i.body?.loto)) { expect(it.userSignoff, it.id).toBe('approved'); expect(it.userSignoffDate, it.id).toBe('2026-11-26'); }
  });
  it('no leftover pending-PSC / pending-sign-off wording', () => {
    for (const it of items) expect(/PSC.s procedure|pending (your )?sign-off|needs human safety sign-off/i.test(JSON.stringify(it)), it.id).toBe(false);
  });
  it('banned phrases absent everywhere', () => {
    for (const it of items) expect(BANNED.test(JSON.stringify(it.body)), it.id).toBe(false);
  });
});

describe('question lint', () => {
  it('no graded item relies on typical/illustrative values', () => {
    for (const q of questions) {
      expect(['typical', 'illustrative']).not.toContain(q.basis);
      expect(q.body.dependsOn ?? [], q.id).toEqual([]);
      const stem = q.body.stem as string;
      const correct = (q.body.answers ?? []).filter((a: any) => a.correct).map((a: any) => a.text as string);
      for (const a of correct) {
        const nums = a.match(/\d+(\.\d+)?/g) ?? [];
        if (UNIT.test(a)) for (const n of nums) expect(stem.includes(n) || ['120', '0'].includes(n), `${q.id}: correct answer number ${n} must come from the stem`).toBe(true);
      }
    }
  });
  it('answers unique; correct first; distractorWhy on wrong answers', () => {
    for (const q of questions.filter((x) => x.body.answers)) {
      const texts = q.body.answers.map((a: any) => a.text.trim().toLowerCase());
      expect(new Set(texts).size, q.id).toBe(texts.length);
    }
  });
  it('correct answer is the longest option in <= 40% of mcq questions per unit', () => {
    for (const unit of [1, 2, 3]) {
      const qs = questions.filter((q) => q.book.unit === unit && q.body.format === 'mcq');
      if (qs.length < 5) continue;
      const longest = qs.filter((q) => { const L = q.body.answers.map((a: any) => a.text.length); return L[0] === Math.max(...L) && L.filter((x: number) => x === L[0]).length === 1; }).length;
      expect(longest / qs.length, `unit ${unit}`).toBeLessThanOrEqual(0.4);
    }
  });
  it('about 10 questions per day (days 1-9 have 8-14)', () => {
    for (let d = 1; d <= 9; d++) { const n = questions.filter((q) => q.body.day === d).length; expect(n, `day ${d}`).toBeGreaterThanOrEqual(8); expect(n).toBeLessThanOrEqual(14); }
  });
  it('predict-state scenes are verified against the simulator', () => {
    for (const q of questions.filter((x) => x.body.format === 'predict-state')) {
      const b = bucket();
      runScript(b.world, q.body.scene.actions, b);
      for (const [id, v] of Object.entries<boolean>(q.body.scene.expect.lit ?? {})) { expect(LAMP_IDS).toContain(id); expect(b.world.lit(id), `${q.id} lamp ${id}`).toBe(v); }
      for (const [id, v] of Object.entries<boolean>(q.body.scene.expect.coil ?? {})) expect(!!b.world.coilOn[id], `${q.id} coil ${id}`).toBe(v);
    }
  });
  it('tap-schematic targets exist in the reference netlist', () => {
    const w = bucket().world;
    for (const q of questions.filter((x) => x.body.format === 'tap-schematic')) for (const t of q.body.tapTargets) expect(w.has(t), q.id + ' ' + t).toBe(true);
  });
});

import { SYMBOL_KEYS } from '../src/ui/symbols';
describe('symbols', () => {
  it('every symbol key used by content or the bucket has a drawing', () => {
    const keys = new Set<string>(SYMBOL_KEYS);
    for (const it of items) {
      if (it.body?.symbol?.key) expect(keys.has(it.body.symbol.key), it.id).toBe(true);
      if (typeof it.body?.symbol === 'string') expect(keys.has(it.body.symbol), it.id).toBe(true);
    }
    for (const d of bucket().layout.devices) expect(keys.has(d.symbol), d.tag).toBe(true);
  });
});
