import { describe, it, expect } from 'vitest';
import { loadContent, readYaml, itemHash } from '../scripts/lib/content';
import { needsSource, missingSources } from '../scripts/lib/ledger';

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
  it('LOTO items resting only on OSHA text (public URL excerpt) are pending; those also resting on NFPA 70E stay blocked', () => {
    const loto = content.items.filter((i) => i.userSignoff);
    expect(loto.length).toBeGreaterThan(10);
    for (const it of loto) {
      const uses70E = (it.other ?? []).some((o: any) => /nfpa70e/i.test(o.src));
      expect(byId.get(it.id).status, it.id).toBe(uses70E ? 'blocked-on-source' : 'pending');
      expect(it.excerpts.some((e: any) => /osha\.gov/.test(e.url ?? '')), it.id).toBe(true);
    }
    for (const it of content.items.filter((i) => i.body?.symbol && i.type === 'lessonCard')) expect(byId.get(it.id).status).toBe('blocked-on-source');
  });
  it('NEC items with a photo excerpt are pending; without one they are blocked-on-source', () => {
    const nec = content.items.filter((i) => i.nec.length);
    expect(nec.length).toBeGreaterThanOrEqual(3);
    for (const it of nec) expect(byId.get(it.id).status, it.id).toBe(missingSources(it).length ? 'blocked-on-source' : 'pending');
  });
});
