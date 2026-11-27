import { defineConfig } from 'vitest/config';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadContent, itemHash, readYaml } from './scripts/lib/content.ts';

const BASE = '/understanding-motor-controls/';
const VIRTUAL = 'virtual:content';

// Compiles the YAML content (+ review ledger + per-item hashes) into one JSON module at build time.
function contentPlugin() {
  return {
    name: 'umc-content',
    resolveId(id: string) { return id === VIRTUAL ? '\0' + VIRTUAL : null; },
    load(id: string) {
      if (id !== '\0' + VIRTUAL) return null;
      const c = loadContent();
      const hashes: Record<string, string> = {};
      for (const it of c.items) hashes[it.id] = itemHash(it);
      const ledger = existsSync('review/ch01.review.yaml') ? readYaml('review/ch01.review.yaml')?.entries ?? [] : [];
      return 'export default ' + JSON.stringify({ manifest: c.manifest, sources: c.sources, items: c.items, hashes, ledger });
    },
    handleHotUpdate() { return undefined; },
  };
}

// Injects the list of built files into the service worker so the app works offline after the first visit.
function precachePlugin() {
  let outDir = 'dist';
  return {
    name: 'sw-precache',
    configResolved(c: { build: { outDir: string } }) { outDir = c.build.outDir; },
    writeBundle(_: unknown, bundle: Record<string, unknown>) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const extra = ['manifest.webmanifest', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'img/bucket-1a-photo.jpg'];
      const list = ['./', ...new Set([...files, ...extra])];
      const p = join(outDir, 'sw.js');
      const src = readFileSync(p, 'utf8');
      writeFileSync(p, src.replace("'__PRECACHE__'", JSON.stringify(list)).replace('__VERSION__', Date.now().toString(36)));
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [contentPlugin(), precachePlugin()],
  test: { include: ['tests/**/*.test.ts'], testTimeout: 30000 },
});
