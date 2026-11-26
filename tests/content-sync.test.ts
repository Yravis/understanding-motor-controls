import { describe, it, expect } from 'vitest';
import { readYaml } from '../scripts/lib/content';
import { faultItems } from '../scripts/gen-faults';
describe('generated fault content', () => {
  it('content/ch01/faults.yaml is in sync with src/model/faults.ts (run npx tsx scripts/gen-faults.ts)', () => {
    expect(readYaml('content/ch01/faults.yaml').items).toEqual(JSON.parse(JSON.stringify(faultItems())));
  }, 120000);
  it('device meter constants in content equal the constants used by the meter model', async () => {
    const m = await import('../src/model/meter');
    const w = await import('../src/model/world');
    const { params } = await import('./helpers');
    expect(params.METER.hiZ).toBe(m.METER_HIZ); expect(params.METER.loZ).toBe(m.METER_LOZ);
    expect(params.METER.contBeepOhm).toBe(m.CONT_BEEP_OHMS); expect(params.METER.energizedV).toBe(m.ENERGIZED_V);
    expect(params.METER.ohmSourceV).toBe(w.OHM_SOURCE_V); expect(params.METER.ohmSourceR).toBe(w.OHM_SOURCE_R);
  });
});
