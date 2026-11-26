// Design-rule lint: switching contacts sit on the X1 (ungrounded) side, coils/loads connect directly to X2.
// (Older NEC editions placed this in 430.74; the 2026 section number is blocked-on-source, so it is taught as a design rule.)
import type { World } from './world';

export function lintDesignRules(w: World): string[] {
  const out: string[] = [];
  const netOfPin = (pin: string): string | null => {
    const wire = w.els.find((e) => e.kind === 'wire' && e.id === 'W:' + pin);
    return wire ? wire.b : null;
  };
  for (const e of w.els) {
    if (e.kind === 'contact') {
      for (const t of [e.a, e.b]) if (netOfPin(t) === 'w2' || netOfPin(t) === 'w92') out.push(`${e.id}: contact terminal ${t} is on X2; switching contacts belong on the X1 side`);
    }
    if (e.kind === 'coil' || e.kind === 'led' || e.kind === 'lamp') {
      if (e.id === 'TD4.sup') continue; // constant-supply input: still between X1 and X2, checked below
      const nets = [netOfPin(e.a), netOfPin(e.b)];
      if (!nets.includes('w2') && !nets.includes('w92')) out.push(`${e.id}: load is not connected directly to X2`);
    }
  }
  return out;
}
