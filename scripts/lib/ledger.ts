import { itemHash, Item } from './content';

export interface LedgerEntry { id: string; hash: string; status: string; severity: string | null; checkedAgainst: string[]; basis: string | null; notes: string; reviewer: string | null; date: string | null }

/** Source keys an item rests on: every NEC/NEMA/IEEE ref, OSHA/NFPA 70E citation, and symbol identification. */
export function sourceKeys(it: Item): string[] {
  const k = new Set<string>();
  for (const n of it.nec) k.add(`nec2026:${n.ref}`);
  for (const n of it.nema) k.add(`nema:${n.std}`);
  for (const n of it.ieee) k.add(`ieee:${n.std}`);
  for (const o of it.other ?? []) {
    const m = /^(osha|nfpa70e[^:]*):?(.*)$/i.exec(o.src);
    if (m) k.add(m[1].toLowerCase().startsWith('osha') ? `osha:${m[2].replace(/\(.*$/, '')}` : 'nfpa70e-2024');
  }
  if (it.body?.format === 'identify-symbol') k.add('symbols:nema-ics19');
  return [...k];
}
/** Keys not covered by an excerpt the reviewer can open (URL, photo or typed text). */
export function missingSources(it: Item): string[] {
  const covered = new Set((it.excerpts ?? []).flatMap((e: any) => (e.url || e.photo || e.text) ? e.covers ?? [] : []));
  return sourceKeys(it).filter((k) => !covered.has(k));
}
/** Items whose source text is not yet available to the reviewer cannot be reviewed. */
export function needsSource(it: Item): boolean { return missingSources(it).length > 0; }
const initialStatus = (it: Item) => (needsSource(it) ? 'blocked-on-source' : 'pending');
const initialNote = (it: Item) => (needsSource(it) ? `needs source text before review: ${missingSources(it).join(', ')}` : '');

export interface SeedResult { ledger: LedgerEntry[]; added: string[]; stale: string[]; removed: string[] }
export interface HistoryEntry { hash: string; status: string; severity: string | null; reviewer: string | null; date: string | null; staledOn: string }
/**
 * Reviewer-safe seeding. The reviewer owns every existing entry:
 *  - unchanged hash  -> entry kept exactly as written (status, notes, everything)
 *  - changed hash    -> back to `pending` with the new hash; notes, checkedAgainst, basis, reviewer and date are KEPT,
 *                       and the previous verdict is appended to `history`
 *  - new item        -> added (`pending`, or `blocked-on-source` when its source text is missing)
 *  - removed item    -> reported as orphaned (dropped from the ledger)
 */
export function seedLedger(items: Item[], existing: LedgerEntry[], today = new Date().toISOString().slice(0, 10)): SeedResult {
  const byId = new Map(existing.map((e) => [e.id, e]));
  const out: LedgerEntry[] = [];
  const added: string[] = [], stale: string[] = [];
  for (const it of items) {
    const hash = itemHash(it);
    const e = byId.get(it.id) as (LedgerEntry & { history?: HistoryEntry[] }) | undefined;
    if (!e) {
      out.push({ id: it.id, hash, status: initialStatus(it), severity: null, checkedAgainst: [], basis: null, notes: initialNote(it), reviewer: null, date: null });
      added.push(it.id);
    } else if (e.hash !== hash) {
      // already pending (no verdict since the last change): just track the new hash, don't stack history
      const history = e.status === 'pending' ? e.history : [...(e.history ?? []), { hash: e.hash, status: e.status, severity: e.severity, reviewer: e.reviewer, date: e.date, staledOn: today }];
      out.push({ ...e, hash, status: 'pending', severity: null, ...(history ? { history } : {}) } as LedgerEntry);
      stale.push(it.id);
    } else out.push(e);
  }
  const ids = new Set(items.map((i) => i.id));
  const removed = existing.filter((e) => !ids.has(e.id)).map((e) => e.id);
  return { ledger: out, added, stale, removed };
}
