// Node-side content loader shared by tests, review scripts and the Vite plugin.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { createHash } from 'node:crypto';

export interface Item { id: string; type: string; version: number; book: any; nec: any[]; nema: any[]; ieee: any[]; excerpts: any[]; basis: string; enforcedNote: any; other: any[]; bookAlignment: string; claim: string; body: any; reviewerNotes?: string; [k: string]: any }
export interface Content {
  manifest: any;
  sources: any[];
  items: Item[];
  vectors: Record<string, any>;
  files: Record<string, Item[]>;
}

export function readYaml(path: string): any { return parse(readFileSync(path, 'utf8'), { merge: true }); }
const itemsOf = (root: any): any[] => (Array.isArray(root) ? root : root?.items ?? []);

export function loadContent(root = process.cwd()): Content {
  const dir = join(root, 'content');
  const manifest = readYaml(join(dir, 'manifest.yaml'));
  const sources = itemsOf(readYaml(join(dir, 'refs', 'sources.yaml')));
  const items: Item[] = [];
  const files: Record<string, Item[]> = {};
  const ch = join(dir, 'ch01');
  if (existsSync(ch)) {
    for (const f of readdirSync(ch).filter((x) => x.endsWith('.yaml')).sort()) {
      const list = itemsOf(readYaml(join(ch, f))) as Item[];
      files[`ch01/${f}`] = list;
      items.push(...list);
    }
  }
  const vectors: Record<string, any> = {};
  const vd = join(dir, 'test-vectors');
  if (existsSync(vd)) for (const f of readdirSync(vd).filter((x) => x.endsWith('.yaml')).sort()) vectors[f] = readYaml(join(vd, f));
  return { manifest, sources, items, vectors, files };
}

export function canonical(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return '{' + Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}
/** sha256 of canonical JSON (sorted keys) of the item. */
export function itemHash(item: unknown): string { return createHash('sha256').update(canonical(item)).digest('hex'); }
