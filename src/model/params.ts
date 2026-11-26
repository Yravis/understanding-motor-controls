// Flattened device parameters (tag -> name -> qty). Read from content/ch01/devices.yaml; never hard-coded here.
export type Params = Record<string, Record<string, number>>;
export function paramsFromItems(items: { type: string; body: any }[]): Params {
  const out: Params = {};
  for (const it of items) {
    if (it.type !== 'deviceSpec' || !it.body?.params) continue;
    const o: Record<string, number> = {};
    for (const [k, v] of Object.entries<any>(it.body.params)) o[k] = v.qty;
    out[it.body.tag] = o;
  }
  return out;
}
export function P(p: Params, tag: string, name: string): number {
  const v = p[tag]?.[name];
  if (v === undefined) throw new Error(`missing device param ${tag}.${name}`);
  return v;
}
