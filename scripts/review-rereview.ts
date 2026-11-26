// Re-review queue: lists ONLY the items whose content hash changed since the reviewer's verdict
// (ledger entries back at `pending` with a `history`), plus render-only re-checks from the fix notes.
// usage: npm run review:rereview -- <batch-id> <fixes-yaml> <sheets-batch>
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadContent, itemHash, readYaml } from './lib/content';
import { missingSources } from './lib/ledger';

const [batch, fixesPath, sheets] = process.argv.slice(2);
if (!batch || !fixesPath || !sheets) { console.error('usage: npm run review:rereview -- <batch-id> <fixes-yaml> <sheets-batch>'); process.exit(1); }
const content = loadContent();
const byItem = new Map(content.items.map((i) => [i.id, i]));
const ledger: any[] = readYaml('review/ch01.review.yaml').entries;
const fixes = readYaml(fixesPath);
const changed = ledger.filter((e) => e.status === 'pending' && e.history?.length);
const undocumented = changed.filter((e) => !fixes.changed?.[e.id]).map((e) => e.id);
const extra = Object.keys(fixes.changed ?? {}).filter((id) => !changed.some((e) => e.id === id));
if (undocumented.length || extra.length) { console.error('fix notes and ledger disagree', { undocumented, extra }); process.exit(1); }
const cell = (s: any) => String(s ?? '').replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim();
const dayOf = (it: any) => (it.type === 'deviceSpec' ? 0 : it.body?.day ?? it.book.unit);
const src = (it: any) => {
  const ex = (it.excerpts ?? []).map((e: any) => `${e.ref}: ${e.photo ? 'photo ' + e.photo : e.url ?? e.text}`);
  const miss = missingSources(it);
  return (ex.join('; ') || 'none (general knowledge)') + (miss.length ? `; STILL MISSING: ${miss.join(', ')}` : '');
};
let md = `# Re-review queue: ${batch}\n\nSubmitted by Cody for Eli. **${changed.length} items** changed since your batch 1 verdicts. `;
md += `The seed script sent exactly these back to \`pending\` (new hash; your notes kept; your previous verdict is in each entry's \`history\`). Every other entry in \`review/ch01.review.yaml\` is byte-for-byte as you left it.\n\n`;
md += `Sheets (regenerated with the fixed model): \`review/sheets/${sheets}/\`. Symbol gallery: the app's \`#symbols\` page.\n\n`;
md += `Wake message (to send when ready): "Priority: ${batch} ready, queue at review/queue/${batch}.md (${changed.length} items)".\n\n`;
const order = [...changed].sort((a, b) => dayOf(byItem.get(a.id)) - dayOf(byItem.get(b.id)) || a.id.localeCompare(b.id));
md += `## Changed items (${changed.length})\n\n| # | Item id | Day | New hash | Previous verdict | What changed | Source excerpt / URL |\n|---|---|---|---|---|---|---|\n`;
order.forEach((e, i) => {
  const it: any = byItem.get(e.id); const prev = e.history[e.history.length - 1];
  md += `| ${i + 1} | ${e.id} | ${dayOf(it)} | ${itemHash(it).slice(0, 12)} | ${prev.status}${prev.severity ? ' (' + prev.severity + ')' : ''} | ${cell(fixes.changed[e.id])} | ${cell(src(it))} |\n`;
});
md += `\n## Current text of each changed item\n\n`;
for (const e of order) {
  const it: any = byItem.get(e.id);
  md += `### ${e.id}\n\n- **Claim:** ${cell(it.claim)}\n`;
  for (const k of ['text', 'fieldNote', 'stem', 'explanation', 'cause', 'symptom', 'note']) if (it.body?.[k]) md += `- **${k}:** ${cell(it.body[k])}\n`;
  if (it.body?.steps) md += `- **steps:** ${it.body.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join(' ')}\n`;
  if (it.body?.params) md += `- **params:** ${Object.entries(it.body.params).map(([k, v]: any) => `${k} ${v.qty} ${v.unit}`).join(', ')}\n`;
  if (it.body?.symbol) {
    const s = it.body.symbol;
    if (typeof s === 'string') md += `- **figure:** ${s}\n`;
    else md += `- **figure:** ${s.key} labelled "${s.designation}"; NEMA note: ${cell(s.nemaNote)}\n`;
  }
  if (it.body?.answers) md += `- **answers:** ${it.body.answers.map((a: any) => (a.correct ? '✔ ' : '✘ ') + a.text).join(' · ')}\n`;
  md += `- **Your batch 1 note (kept in the ledger):** ${cell(e.notes).slice(0, 400)}${cell(e.notes).length > 400 ? '…' : ''}\n\n`;
}
if (fixes.renderOnly) {
  md += `## Render-only re-check (${fixes.renderOnly.ids.length} items; content and hash unchanged, so status unchanged)\n\n${cell(fixes.renderOnly.note)}\n\n| Item id | Your status |\n|---|---|\n`;
  for (const id of fixes.renderOnly.ids) md += `| ${id} | ${ledger.find((e) => e.id === id)?.status} |\n`;
  md += '\n';
}
if (fixes.tooling) md += `## Tooling fixes\n\n${cell(fixes.tooling)}\n\n`;
md += '## Responses\n\n(Eli replies here or in the ledger.)\n';
mkdirSync('review/queue', { recursive: true });
writeFileSync(`review/queue/${batch}.md`, md);
console.log(`re-review queue written: review/queue/${batch}.md (${changed.length} changed items)`);
