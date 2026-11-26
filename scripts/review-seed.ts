import { existsSync, writeFileSync } from 'node:fs';
import { stringify } from 'yaml';
import { loadContent, readYaml } from './lib/content';
import { seedLedger } from './lib/ledger';

const path = 'review/ch01.review.yaml';
const content = loadContent();
const existing = existsSync(path) ? (readYaml(path)?.entries ?? []) : [];
const r = seedLedger(content.items, existing);
const header = '# Review ledger. Eli writes verdicts here; the seed script only adds missing entries and flags stale hashes.\n';
writeFileSync(path, header + stringify({ entries: r.ledger }, { lineWidth: 0 }));
console.log(`ledger: ${r.ledger.length} entries, +${r.added.length} added, ${r.stale.length} stale, ${r.removed.length} orphaned`);
