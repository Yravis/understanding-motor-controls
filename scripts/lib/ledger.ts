import { itemHash, Item } from './content';

export interface LedgerEntry { id: string; hash: string; status: string; severity: string | null; checkedAgainst: string[]; basis: string | null; notes: string; reviewer: string | null; date: string | null }
const VERDICTS = new Set(['approved', 'approved-pending-book', 'needs-fix', 'question', 'blocked-on-book', 'rejected']);

/** Items that cite NEC/NEMA/IEEE/OSHA/70E clause text (or need sign-off) cannot be reviewed without source text. */
export function needsSource(it: Item): boolean {
  return it.nec.length > 0 || it.nema.length > 0 || it.ieee.length > 0 || !!it.userSignoff ||
    (it.other ?? []).some((o: any) => /^(osha|nfpa70e|nfpa-70e|nec|nema|ieee)/i.test(o.src));
}

export interface SeedResult { ledger: LedgerEntry[]; added: string[]; stale: string[]; removed: string[] }
/** Adds missing entries (never overwrites existing verdicts); flags verdicts whose hash no longer matches as `stale`. */
export function seedLedger(items: Item[], existing: LedgerEntry[]): SeedResult {
  const byId = new Map(existing.map((e) => [e.id, e]));
  const out: LedgerEntry[] = [];
  const added: string[] = [], stale: string[] = [];
  for (const it of items) {
    const hash = itemHash(it);
    const e = byId.get(it.id);
    if (!e) {
      out.push({ id: it.id, hash, status: needsSource(it) ? 'blocked-on-source' : 'pending', severity: null, checkedAgainst: [], basis: null, notes: needsSource(it) ? 'needs source text (NEC 2026 photo / NEMA / IEEE / OSHA / NFPA 70E excerpt) before review' : '', reviewer: null, date: null });
      added.push(it.id);
    } else if (e.hash !== hash) {
      if (VERDICTS.has(e.status)) { out.push({ ...e, status: 'stale' }); stale.push(it.id); }
      else out.push({ ...e, hash }); // never reviewed: just track the new hash
    } else out.push(e);
  }
  const ids = new Set(items.map((i) => i.id));
  const removed = existing.filter((e) => !ids.has(e.id)).map((e) => e.id);
  return { ledger: out, added, stale, removed };
}
