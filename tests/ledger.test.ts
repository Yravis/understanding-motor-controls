import { describe, it, expect } from 'vitest';
import { loadContent, readYaml, itemHash } from '../scripts/lib/content';
import { needsSource } from '../scripts/lib/ledger';

const content = loadContent();
const ledger: any[] = readYaml('review/ch01.review.yaml').entries;
const byId = new Map(ledger.map((e) => [e.id, e]));

describe('committed review ledger (run `npm run review:seed` after editing content)', () => {
  it('has exactly one entry per content item, with the current hash', () => {
    expect(ledger.length).toBe(content.items.length);
    for (const it of content.items) { const e = byId.get(it.id); expect(e, it.id).toBeTruthy(); expect(e.hash, it.id).toBe(itemHash(it)); }
  });
  it('entry shape: {id, hash, status, severity: null, checkedAgainst: [], basis: null, notes, reviewer: null, date: null}', () => {
    for (const e of ledger) expect(Object.keys(e).sort()).toEqual(['basis', 'checkedAgainst', 'date', 'hash', 'id', 'notes', 'reviewer', 'severity', 'status']);
  });
  it('everything is pending, except items citing NEC/NEMA/IEEE/OSHA/70E which are blocked-on-source', () => {
    for (const it of content.items) expect(byId.get(it.id).status, it.id).toBe(needsSource(it) ? 'blocked-on-source' : 'pending');
  });
  it('LOTO and symbol items are blocked-on-source; LOTO items await user sign-off', () => {
    for (const it of content.items.filter((i) => i.body?.loto || i.userSignoff)) { expect(byId.get(it.id).status).toBe('blocked-on-source'); expect(it.userSignoff).toBe('pending'); }
    for (const it of content.items.filter((i) => i.body?.symbol && i.type === 'lessonCard')) expect(byId.get(it.id).status).toBe('blocked-on-source');
  });
  it('every item with an nec ref is blocked-on-source with excerpts: []', () => {
    for (const it of content.items.filter((i) => i.nec.length)) { expect(byId.get(it.id).status).toBe('blocked-on-source'); expect(it.excerpts).toEqual([]); }
  });
});
