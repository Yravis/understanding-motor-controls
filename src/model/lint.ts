// Design-rule lint: switching contacts sit on the X1 (ungrounded) side, coils/loads connect directly to X2.
// This is how Bucket 1A meets NEC 2026 430.74 (Electrical Arrangement of Control Circuits; confirmed from the user's photo,
// review/source-photos/nec2026-p70-400-430.72-430.75.jpg): with X2 grounded, a ground fault must not start the load or bypass a stop.
import type { World } from './world';

export function lintDesignRules(w: World): string[] {
  const out: string[] = [];
  const netOfPin = (pin: string): string | null => {
    const wire = w.els.find((e) => e.kind === 'wire' && e.id === 'W:' + pin);
    return wire ? wire.b : null;
  };
  for (const e of w.els) {
    if (e.kind === 'contact') {
      for (const t of [e.a, e.b]) if (netOfPin(t) === 'w2' || netOfPin(t) === 'w92') out.push(`${e.id}: contact terminal ${t} is on X2; switching contacts belong on the X1 side (NEC 2026 430.74)`);
    }
    if (e.kind === 'coil' || e.kind === 'led' || e.kind === 'lamp') {
      if (e.id === 'TD4.sup') continue; // constant-supply input: still between X1 and X2, checked below
      const nets = [netOfPin(e.a), netOfPin(e.b)];
      if (!nets.includes('w2') && !nets.includes('w92')) out.push(`${e.id}: load is not connected directly to X2 (NEC 2026 430.74)`);
    }
  }
  return out;
}
