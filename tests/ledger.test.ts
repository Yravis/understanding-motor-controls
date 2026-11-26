import { describe, it, expect } from 'vitest';
import { loadContent, readYaml, itemHash } from '../scripts/lib/content';
import { missingSources, seedLedger } from '../scripts/lib/ledger';

const content = loadContent();
const ledger: any[] = readYaml('review/ch01.review.yaml').entries;
const byId = new Map(ledger.map((e) => [e.id, e]));
const STATUSES = ['pending', 'stale', 'approved', 'approved-pending-book', 'needs-fix', 'question', 'blocked-on-book', 'blocked-on-source', 'rejected'];
const REQUIRED = ['basis', 'checkedAgainst', 'date', 'hash', 'id', 'notes', 'reviewer', 'severity', 'status'];
const OPTIONAL = ['history', 'suggestedFix'];

describe('committed review ledger (structure only; verdicts belong to the reviewer)', () => {
  it('has exactly one entry per content item, with the current hash', () => {
    expect(ledger.length).toBe(content.items.length);
    for (const it of content.items) { const e = byId.get(it.id); expect(e, it.id).toBeTruthy(); expect(e.hash, it.id).toBe(itemHash(it)); }
  });
  it('every entry has the required fields, a known status, and nothing unexpected', () => {
    for (const e of ledger) {
      for (const k of REQUIRED) expect(Object.keys(e), `${e.id} missing ${k}`).toContain(k);
      for (const k of Object.keys(e)) expect([...REQUIRED, ...OPTIONAL], `${e.id} unexpected ${k}`).toContain(k);
      expect(STATUSES, e.id).toContain(e.status);
      expect(Array.isArray(e.checkedAgainst), e.id).toBe(true);
      if (e.status === 'needs-fix') expect(e.severity, e.id).toBeTruthy();
    }
  });
  it('an approved verdict never sits on an item whose source text is missing for an NEC/OSHA/70E/NEMA/IEEE ref', () => {
    for (const it of content.items) {
      const st = byId.get(it.id).status;
      if (st === 'approved' || st === 'approved-pending-book') expect(missingSources(it), it.id).toEqual([]);
    }
  });
  it('LOTO items cite the public OSHA text; NEC items cite a photo', () => {
    for (const it of content.items.filter((i) => i.userSignoff)) expect(it.excerpts.some((e: any) => /osha\.gov/.test(e.url ?? '')), it.id).toBe(true);
    for (const it of content.items.filter((i) => i.nec.length)) expect(it.excerpts.some((e: any) => !!e.photo), it.id).toBe(true);
  });
});

describe('seedLedger never clobbers the reviewer', () => {
  const items = content.items.slice(0, 3);
  const reviewed = items.map((it) => ({ id: it.id, hash: itemHash(it), status: 'approved-pending-book', severity: null, checkedAgainst: ['x'], basis: 'source', notes: 'Eli note', reviewer: 'Eli', date: '2026-11-26' }));
  it('keeps unchanged entries exactly, including notes and blocked/pending statuses', () => {
    const ex = [...reviewed.slice(0, 2), { ...reviewed[2], status: 'blocked-on-source', notes: 'needs ICS 19' }];
    const r = seedLedger(items, ex as any);
    expect(r.ledger).toEqual(ex);
    expect(r.stale).toEqual([]);
  });
  it('sends a changed item back to pending, keeps notes, records history; adds new ids', () => {
    const changed = { ...items[0], claim: items[0].claim + ' (edited)' };
    const extra = content.items[3];
    const r = seedLedger([changed, items[1], items[2], extra], reviewed as any, '2026-11-27');
    const e: any = r.ledger[0];
    expect(e.status).toBe('pending'); expect(e.notes).toBe('Eli note'); expect(e.hash).toBe(itemHash(changed));
    expect(e.history).toEqual([{ hash: reviewed[0].hash, status: 'approved-pending-book', severity: null, reviewer: 'Eli', date: '2026-11-26', staledOn: '2026-11-27' }]);
    expect(r.ledger[1]).toEqual(reviewed[1]);
    expect(r.stale).toEqual([changed.id]); expect(r.added).toEqual([extra.id]);
  });
});
