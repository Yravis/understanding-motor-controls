import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { loadContent, itemHash, readYaml } from './lib/content';
import { needsSource } from './lib/ledger';

const batch = process.argv[2];
if (!batch) { console.error('usage: npm run review:queue -- <batch-id>'); process.exit(1); }
const content = loadContent();
const ledger: any[] = existsSync('review/ch01.review.yaml') ? readYaml('review/ch01.review.yaml').entries ?? [] : [];
const byId = new Map(ledger.map((e) => [e.id, e]));
mkdirSync('review/queue', { recursive: true });
const days = content.manifest.days as any[];
const dayOf = (it: any) => (it.type === 'deviceSpec' ? 0 : it.body?.day ?? it.book.unit);
const sourceFor = (it: any): string => {
  const ex = (it.excerpts ?? []).map((e: any) => e.url ?? e.text ?? e.ref).filter(Boolean);
  if (ex.length) return ex.join('; ');
  if (needsSource(it)) return 'NONE — blocked-on-source';
  return 'NONE — blocked-on-source (general knowledge only; cannot approve alone, needs an opened source)';
};
const doubts = (it: any): string => {
  const d: string[] = [];
  if (it.basis === 'typical' || it.basis === 'illustrative') d.push(`${it.basis} values (datasheet:TBD)`);
  if (it.userSignoff) d.push('needs user sign-off and PSC procedure');
  d.push('page from TOC, unverified');
  if (it.reviewerNotes) d.push(String(it.reviewerNotes).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 300));
  return d.join('; ');
};
let md = `# Review queue: ${batch}\n\nSubmitted by Cody for Eli. Chapter 1 (Units 1-3), all items. Statuses come from \`review/ch01.review.yaml\` (seeded: pending, or blocked-on-source where a standard's text is needed).\n\n`;
md += `Review order suggestion: Day 0 (device library, solver readings) first, then Days 1-10. Sheets: \`review/sheets/${batch}/\`.\n\n`;
md += `Wake message (to send when ready): "Priority: ${batch} ready for review, queue at review/queue/${batch}.md".\n\n`;
for (let d = 0; d <= 10; d++) {
  const items = content.items.filter((it) => dayOf(it) === d);
  if (!items.length) continue;
  md += `## ${d === 0 ? 'Day 0: device library' : 'Day ' + d + ': ' + (days.find((x) => x.day === d)?.focus ?? '')}\n\n| Item id | Hash | Status | What changed | Known doubts | Source excerpt / URL for the claim |\n|---|---|---|---|---|---|\n`;
  for (const it of items) {
    const h = itemHash(it);
    const e = byId.get(it.id);
    md += `| ${it.id} | ${h.slice(0, 12)} | ${e?.status ?? 'unseeded'} | ${e?.status === 'stale' ? 'changed since last verdict' : 'new (first submission)'} | ${doubts(it)} | ${sourceFor(it)} |\n`;
  }
  md += '\n';
}
md += '## Responses\n\n(Cody replies to Eli\'s notes here.)\n';
writeFileSync(`review/queue/${batch}.md`, md);
console.log(`queue written: review/queue/${batch}.md`);
