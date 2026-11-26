// Build gate. Include an item iff its ledger entry is approved / approved-pending-book WITH A MATCHING HASH,
// or SHOW_UNREVIEWED is on (then every non-rejected item, carrying a visible badge).
export interface LedgerRow { id: string; hash: string; status: string }
export interface Gated<T> { item: T; badge: string | null }

export function gate<T extends { id: string }>(items: T[], ledger: LedgerRow[], hashes: Record<string, string>, showUnreviewed: boolean): Gated<T>[] {
  const byId = new Map(ledger.map((l) => [l.id, l]));
  const out: Gated<T>[] = [];
  for (const item of items) {
    const row = byId.get(item.id);
    const current = hashes[item.id];
    const ok = !!row && (row.status === 'approved' || row.status === 'approved-pending-book') && row.hash === current;
    if (ok) { out.push({ item, badge: null }); continue; }
    if (!showUnreviewed) continue;
    if (row?.status === 'rejected') continue;
    out.push({ item, badge: row?.status === 'blocked-on-source' ? 'UNREVIEWED · source needed' : 'UNREVIEWED' });
  }
  return out;
}
