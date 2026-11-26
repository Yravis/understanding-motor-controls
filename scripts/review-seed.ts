// Seeds review/ch01.review.yaml without touching reviewed entries (see seedLedger in scripts/lib/ledger.ts).
// Edits the YAML document in place, so the reviewer's formatting and comments are preserved byte-for-byte
// for every entry that did not change.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseDocument, Document, isMap, isSeq, YAMLSeq } from 'yaml';
import { loadContent } from './lib/content';
import { seedLedger } from './lib/ledger';

const path = 'review/ch01.review.yaml';
const HEADER = '# Review ledger. Eli writes verdicts here. The seed script never edits a reviewed entry: it only adds new ids, and sends\n# changed-hash items back to `pending` (notes kept, previous verdict moved to `history`).\n';
const content = loadContent();
const doc: Document = existsSync(path) ? parseDocument(readFileSync(path, 'utf8')) : parseDocument(HEADER + 'entries: []\n');
const existing = (doc.toJS()?.entries ?? []) as any[];
const r = seedLedger(content.items, existing);
let seq = doc.get('entries') as YAMLSeq;
if (!isSeq(seq)) { doc.set('entries', doc.createNode([])); seq = doc.get('entries') as YAMLSeq; }
const nodeById = new Map<string, any>();
for (const n of seq.items) if (isMap(n)) nodeById.set(String(n.get('id')), n);
const changed = new Set(r.stale);
const newItems: any[] = [];
for (const e of r.ledger) {
  const n = nodeById.get(e.id);
  if (!n) { newItems.push(doc.createNode(e)); continue; }
  if (changed.has(e.id)) for (const k of ['hash', 'status', 'severity', 'history'] as const) if ((e as any)[k] !== undefined) n.set(k, doc.createNode((e as any)[k]));
}
// drop orphans, keep order of the existing entries, append new ones
seq.items = seq.items.filter((n: any) => !isMap(n) || !r.removed.includes(String(n.get('id'))));
seq.items.push(...newItems);
let out = doc.toString({ lineWidth: 0 });
if (!out.startsWith('#')) out = HEADER + out;
writeFileSync(path, out);
console.log(`ledger: ${r.ledger.length} entries, +${r.added.length} added, ${r.stale.length} changed -> pending, ${r.removed.length} orphaned`);
if (r.stale.length) console.log('changed: ' + r.stale.join(', '));
if (r.removed.length) console.log('orphaned: ' + r.removed.join(', '));
writeFileSync('review/.last-seed.json', JSON.stringify({ changed: r.stale, added: r.added, removed: r.removed }, null, 2) + '\n');
