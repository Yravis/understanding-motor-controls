// Renders content items the way the learner sees them (markdown), for review sheets.
import { Item } from './content';

export function renderItem(it: Item): string {
  const b = it.body;
  let md = `## ${it.id}\n\n*type* ${it.type} · *book* ${it.book.section} p.${it.book.page} (${it.book.pageStatus}) · *basis* ${it.basis} · *alignment* ${it.bookAlignment}\n\n**Claim (what is being checked):** ${it.claim}\n\n`;
  if (it.userSignoff) md += `> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.\n\n`;
  if (it.type === 'lessonCard') {
    md += `**${b.title}**\n\n${b.text}\n\n*Field note:* ${b.fieldNote}\n\n`;
    if (b.symbol) md += `*Symbol* \`${b.symbol.key}\` (${b.symbol.designation}). NEMA: ${b.symbol.nemaNote} **IEC side note:** ${b.symbol.iecNote}\n\n`;
  } else if (it.type === 'question') {
    md += `*Format* ${b.format} · *Day* ${b.day}\n\n**${b.stem}**\n\n`;
    for (const a of b.answers ?? []) md += `- ${a.correct ? '✅' : '❌'} ${a.text}${a.distractorWhy ? `  \n  *why wrong:* ${a.distractorWhy}` : ''}\n`;
    if (b.steps) b.steps.forEach((s: string, i: number) => (md += `${i + 1}. ${s}\n`));
    if (b.tapTargets) md += `Tap target(s): ${b.tapTargets.join(', ')}. ${b.tapWhy ?? ''}\n`;
    if (b.scene) md += `Scene: \`${JSON.stringify(b.scene.actions)}\` → expected \`${JSON.stringify(b.scene.expect)}\` (machine-verified against the simulator)\n`;
    md += `\n*Explanation:* ${b.explanation}\n\n`;
  } else if (it.type === 'deviceSpec') {
    md += `**${b.title}** (tag ${b.tag}, ${b.kind})\n\n`;
    if (b.params) { md += '| Parameter | Value | Unit | Tolerance/range |\n|---|---|---|---|\n'; for (const [k, v] of Object.entries<any>(b.params)) md += `| ${k} | ${v.qty} | ${v.unit} | ${v.tol} |\n`; }
    if (b.note) md += `\n${b.note}\n`;
    md += '\n';
  } else if (it.type === 'scenario') {
    md += `**${b.title}** (Day ${b.day})\n\n${b.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}\n\n${b.faults?.length ? 'Faults: ' + b.faults.join(', ') + '\n\n' : ''}`;
  } else if (it.type === 'fault') {
    md += `**${b.title}**\n\n*Cause:* ${b.cause}\n\n*Symptom:* ${b.symptom}\n\n*Fix:* ${b.fixActions.map((f: any) => `${f.kind} ${f.target}: ${f.note}`).join('; ')}\n\n`;
  }
  if (it.reviewerNotes) md += `*Reviewer notes (builder's doubts):* ${it.reviewerNotes}\n\n`;
  return md + '---\n\n';
}
