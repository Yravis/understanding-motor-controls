import { mkdirSync, writeFileSync } from 'node:fs';
import { loadContent, readYaml } from './lib/content';
import { renderItem } from './lib/render';
import { paramsFromItems } from '../src/model/params';
import { faultDefs } from '../src/model/faults';
import { healthyReadings, faultReadings, readingsMarkdown } from '../src/model/readings';

const batch = process.argv[2];
const itemsFlag = process.argv.indexOf('--items');
const onlyIds = itemsFlag >= 0 ? new Set(process.argv[itemsFlag + 1].split(',').filter(Boolean)) : null;
if (!batch) { console.error('usage: npm run review:sheets -- <batch-id> [--items id,id,...]'); process.exit(1); }
const content = loadContent();
const dir = `review/sheets/${batch}`;
mkdirSync(dir, { recursive: true });
const days = content.manifest.days as any[];
const p = paramsFromItems(readYaml('content/ch01/devices.yaml').items);
const defs = faultDefs(p);
const healthy = healthyReadings(p);
const dayOf = (it: any) => it.body?.day ?? (it.type === 'deviceSpec' ? 0 : it.book.unit);
let index = `# Review sheets: ${batch}\n\nGenerated; do not edit. Each file renders items as the learner sees them.` + (onlyIds ? ' This batch is limited to the changed items listed in the re-review queue.' : ' Day 0 = device library + solver readings (review first).') + `\n\n`;
if (onlyIds) {
  const missing = [...onlyIds].filter((id) => !content.items.some((it) => it.id === id));
  if (missing.length) { console.error('unknown --items ids:', missing.join(', ')); process.exit(1); }
}
for (let d = 0; d <= 10; d++) {
  const items = content.items.filter((it) => (it.type === 'deviceSpec' ? 0 : dayOf(it)) === d && (!onlyIds || onlyIds.has(it.id)));
  if (!items.length) continue;
  let md = `# ${batch} · ${d === 0 ? 'Device library and model readings' : 'Day ' + d + ' - ' + (days.find((x) => x.day === d)?.focus ?? '')}\n\n`;
  if (d === 0) md += '## Healthy bucket readings (model output)\n\n' + readingsMarkdown(healthy, null, 'Reference bucket 1A') + '\n';
  for (const it of items) {
    md += renderItem(it);
    if (it.type === 'fault') {
      const f = defs.find((x) => x.id === it.body.engineId)!;
      md += readingsMarkdown(healthy, faultReadings(p, f), `Readings: healthy vs ${it.body.title} (model-generated; ≠ marks differences)`);
    }
  }
  writeFileSync(`${dir}/day-${String(d).padStart(2, '0')}.md`, md);
  index += `- day-${String(d).padStart(2, '0')}.md: ${items.length} items\n`;
}
writeFileSync(`${dir}/index.md`, index);
console.log(`sheets written to ${dir}` + (onlyIds ? ` (${onlyIds.size} items)` : ''));
