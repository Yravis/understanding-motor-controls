import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { loadContent, itemHash, readYaml } from './lib/content';
import { needsSource, missingSources } from './lib/ledger';

const batch = process.argv[2];
if (!batch) { console.error('usage: npm run review:queue -- <batch-id>'); process.exit(1); }
const content = loadContent();
const ledger: any[] = existsSync('review/ch01.review.yaml') ? readYaml('review/ch01.review.yaml').entries ?? [] : [];
const byId = new Map(ledger.map((e) => [e.id, e]));
mkdirSync('review/queue', { recursive: true });
const days = content.manifest.days as any[];
const dayOf = (it: any) => (it.type === 'deviceSpec' ? 0 : it.body?.day ?? it.book.unit);
const sourceFor = (it: any): string => {
  const ex = (it.excerpts ?? []).map((e: any) => `${e.ref}: ${e.photo ? 'photo ' + e.photo : e.url ?? e.text}`).filter(Boolean);
  const miss = missingSources(it);
  if (ex.length) return ex.join('; ') + (miss.length ? `; STILL MISSING: ${miss.join(', ')} (blocked-on-source)` : '');
  if (needsSource(it)) return `NONE — blocked-on-source (needs: ${miss.join(', ')})`;
  return 'NONE — blocked-on-source (general knowledge only; cannot approve alone, needs an opened source)';
};
const doubts = (it: any): string => {
  const d: string[] = [];
  if (it.basis === 'typical' || it.basis === 'illustrative') d.push(`${it.basis} values (datasheet:TBD)`);
  if (it.userSignoff) d.push('LOTO: user approved the standard approach 2026-11-26');
  d.push('page from TOC, unverified');
  if (it.reviewerNotes) d.push(String(it.reviewerNotes).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 300));
  return d.join('; ');
};
let md = `# Review queue: ${batch}\n\nSubmitted by Cody for Eli. Chapter 1 (Units 1-3), all items. Statuses come from \`review/ch01.review.yaml\` (seeded: pending, or blocked-on-source where a standard's text is needed).\n\n`;
md += `Review order suggestion: Day 0 (device library, solver readings) first, then Days 1-10. Sheets: \`review/sheets/${batch}/\`.\n\n`;
md += `Wake message (to send when ready): "Priority: ${batch} ready for review, queue at review/queue/${batch}.md".\n\n`;
// ---- summary ----
{
  const counts: Record<string, number> = {};
  for (const it of content.items) { const st = byId.get(it.id)?.status ?? 'unseeded'; counts[st] = (counts[st] ?? 0) + 1; }
  md += `## Summary\n\nTotal items: **${content.items.length}**. ` + Object.entries(counts).map(([k, v]) => `${k}: **${v}**`).join(' · ') + '\n\n';
  md += '| Day | Items | pending | blocked-on-source |\n|---|---|---|---|\n';
  for (let d = 0; d <= 10; d++) {
    const its = content.items.filter((it) => dayOf(it) === d); if (!its.length) continue;
    const c = (st: string) => its.filter((it) => byId.get(it.id)?.status === st).length;
    md += `| ${d === 0 ? '0 (device library)' : d} | ${its.length} | ${c('pending')} | ${c('blocked-on-source')} |\n`;
  }
  const by = content.items.filter((it) => byId.get(it.id)?.status === 'blocked-on-source');
  md += `\n### Blocked on source (${by.length}): what is needed\n\n| Item | Needs |\n|---|---|\n`;
  for (const it of by) md += `| ${it.id} | ${missingSources(it).map((k) => k === 'nfpa70e-2024' ? 'NFPA 70E 2024 text (120.6 test for absence)' : k.startsWith('nema:') || k.startsWith('symbols:') ? 'NEMA ICS 19 symbol page' : k.startsWith('ieee:') ? 'IEEE 315 symbol page' : k).filter((v, i, a) => a.indexOf(v) === i).join('; ')} |\n`;
  md += `\nSource photos and URLs available now: \`review/source-photos/nec2026-p70-400-430.72-430.75.jpg\` (NEC 2026 430.72–430.75), \`review/source-photos/nec2026-p70-139-250.21-250.24.jpg\` (NEC 2026 250.21–250.24), https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147 , https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.333 . Symbol drawings for review: the app's \`#symbols\` gallery (src/ui/symbols.ts).\n\n`;
}
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
