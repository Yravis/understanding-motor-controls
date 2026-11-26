import { itemHash, Item } from './content';

export interface LedgerEntry { id: string; hash: string; status: string; severity: string | null; checkedAgainst: string[]; basis: string | null; notes: string; reviewer: string | null; date: string | null }
const VERDICTS = new Set(['approved', 'approved-pending-book', 'needs-fix', 'question', 'blocked-on-book', 'rejected']);

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
const UNREVIEWED = new Set(['pending', 'blocked-on-source']);
const initialStatus = (it: Item) => (needsSource(it) ? 'blocked-on-source' : 'pending');
const initialNote = (it: Item) => (needsSource(it) ? `needs source text before review: ${missingSources(it).join(', ')}` : '');

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
      out.push({ id: it.id, hash, status: initialStatus(it), severity: null, checkedAgainst: [], basis: null, notes: initialNote(it), reviewer: null, date: null });
      added.push(it.id);
    } else if (e.hash !== hash) {
      if (VERDICTS.has(e.status)) { out.push({ ...e, status: 'stale' }); stale.push(it.id); }
      else out.push({ ...e, hash, ...(UNREVIEWED.has(e.status) ? { status: initialStatus(it), notes: initialNote(it) } : {}) }); // never reviewed: track hash + source status
    } else out.push(UNREVIEWED.has(e.status) ? { ...e, status: initialStatus(it), notes: initialNote(it) } : e);
  }
  const ids = new Set(items.map((i) => i.id));
  const removed = existing.filter((e) => !ids.has(e.id)).map((e) => e.id);
  return { ledger: out, added, stale, removed };
}
