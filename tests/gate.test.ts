import { describe, it, expect } from 'vitest';
import { gate } from '../src/gate';
import { seedLedger, needsSource } from '../scripts/lib/ledger';
import { itemHash, canonical, loadContent } from '../scripts/lib/content';

const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }];
const hashes = Object.fromEntries(items.map((i) => [i.id, 'h-' + i.id]));
const ledger = [
  { id: 'a', hash: 'h-a', status: 'approved' }, { id: 'b', hash: 'h-b', status: 'approved-pending-book' },
  { id: 'c', hash: 'OLD', status: 'approved' }, { id: 'd', hash: 'h-d', status: 'pending' },
  { id: 'e', hash: 'h-e', status: 'blocked-on-source' }, { id: 'f', hash: 'h-f', status: 'rejected' },
];
describe('gate, production (SHOW_UNREVIEWED=false)', () => {
  it('includes only approved / approved-pending-book with matching hash', () => {
    expect(gate(items, ledger, hashes, false).map((g) => g.item.id)).toEqual(['a', 'b']);
    expect(gate(items, ledger, hashes, false).every((g) => g.badge === null)).toBe(true);
  });
  it('items missing from the ledger are excluded', () => expect(gate([{ id: 'z' }], ledger, { z: 'h' }, false)).toEqual([]));
});
describe('gate, play-test (SHOW_UNREVIEWED=true)', () => {
  const g = gate(items, ledger, hashes, true);
  it('includes every non-rejected item', () => expect(g.map((x) => x.item.id)).toEqual(['a', 'b', 'c', 'd', 'e']));
  it('badges: none for approved, UNREVIEWED for stale/pending, source-needed for blocked', () => {
    const m = Object.fromEntries(g.map((x) => [x.item.id, x.badge]));
    expect(m).toEqual({ a: null, b: null, c: 'UNREVIEWED', d: 'UNREVIEWED', e: 'UNREVIEWED · source needed' });
  });
  it('items absent from the ledger show as UNREVIEWED', () => expect(gate([{ id: 'z' }], ledger, { z: 'h' }, true)[0].badge).toBe('UNREVIEWED'));
});

describe('hashing and ledger seeding', () => {
  it('hash is sha256 of canonical JSON with sorted keys', () => {
    expect(canonical({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
    expect(itemHash({ a: 1, b: 2 })).toBe(itemHash({ b: 2, a: 1 }));
    expect(itemHash({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
  const mk = (over: any = {}) => ({ id: 'x', type: 'question', version: 1, book: {}, nec: [], nema: [], ieee: [], excerpts: [], basis: 'general-knowledge', enforcedNote: null, other: [], bookAlignment: 'provisional', claim: 'c', body: {}, ...over });
  it('adds missing entries as pending, or blocked-on-source when standards are cited', () => {
    const r = seedLedger([mk(), mk({ id: 'y', ieee: [{ std: 'IEEE 315' }] })] as any, []);
    expect(r.ledger.map((l) => l.status)).toEqual(['pending', 'blocked-on-source']);
    expect(needsSource(mk({ other: [{ src: 'osha:1910.147(d)' }] }) as any)).toBe(true);
  });
  it('never overwrites a verdict; sends a changed item back to pending with its history', () => {
    const a = mk();
    const approved = { id: 'x', hash: itemHash(a), status: 'approved', severity: null, checkedAgainst: ['src'], basis: 'source', notes: 'ok', reviewer: 'Eli', date: '2026-12-02' };
    expect(seedLedger([a] as any, [approved]).ledger[0]).toEqual(approved);
    const r = seedLedger([mk({ claim: 'changed' })] as any, [approved]);
    expect(r.ledger[0].status).toBe('pending');
    expect((r.ledger[0] as any).history[0].status).toBe('approved');
    expect(r.ledger[0].notes).toBe('ok');
    expect(r.stale).toEqual(['x']);
  });
  it('an edited approved item falls out of the production gate', () => {
    const a = mk(), h1 = itemHash(a), h2 = itemHash(mk({ claim: 'changed' }));
    expect(gate([a], [{ id: 'x', hash: h1, status: 'approved' }], { x: h2 }, false)).toEqual([]);
  });
  it('seeded chapter ledger covers every content item', () => {
    const items2 = loadContent().items;
    const r = seedLedger(items2, []);
    expect(r.ledger.length).toBe(items2.length);
  });
});
