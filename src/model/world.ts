// The World: one netlist + device/process state + simulated clock. Every view (schematic, bucket, meter,
// lamps, relays) reads from this single model. Pure TypeScript, no DOM.
import { C, c, add, inv, abs, scale } from './complex';
import { Branch, Solution, solve, vAcross, vOf, branchCurrent } from './solver';
import { coilZ, capAdmittance } from './formulas';
import { Rng, hashString } from './rng';
import type { El, Coil, Contact, Dev, DevMap, Process, Led } from './types';

export const SHORTED_COIL_R = 0.02;
export const OHM_SOURCE_V = 3.0; // illustrative DMM resistance-mode open-circuit voltage
export const OHM_SOURCE_R = 1000; // illustrative

export interface SchedAction { t: number; kind: 'press' | 'release' | 'toggle' | 'supply' | 'foreign' | 'target'; dev: string; value?: number | boolean }

export class World {
  els: El[] = [];
  devs: DevMap = {};
  procs: Record<string, Process> = {};
  t = 0;
  coilOn: Record<string, boolean> = {};
  ledOn: Record<string, boolean> = {};
  ledFwd: Record<string, boolean> = {};
  chatter: string[] = []; // coil element ids that oscillate
  hum: string[] = []; // coils with broken shading ring while energized
  oscillation = false;
  fuseI: Record<string, number> = {};
  sched: SchedAction[] = [];
  seed = 1;
  jitter = false;
  timerStarts = 0;
  doorOpen = false;
  lastSolve: { v: Record<string, C>; floating: string[]; branches: Branch[] } | null = null;
  log: string[] = [];

  clone(): World {
    const w = new World();
    Object.assign(w, structuredClone({ ...this, lastSolve: null }));
    return w;
  }
  el<T extends El = El>(id: string): T {
    const e = this.els.find((x) => x.id === id);
    if (!e) throw new Error('no element ' + id);
    return e as T;
  }
  has(id: string): boolean { return this.els.some((x) => x.id === id); }
  nodes(): string[] {
    const s = new Set<string>();
    for (const e of this.els) { s.add(e.a); s.add(e.b); }
    return [...s];
  }

  // ---- contact / device state -------------------------------------------------------------------
  /** Is the device's operating member actuated (relay picked up, PB pressed, switch actuated, timer timed out)? */
  devActuated(id: string, pole: 'main' | 'inst' | 'timed'): boolean {
    const d = this.devs[id];
    if (!d) return false;
    switch (d.kind) {
      case 'relay': case 'solenoid': return !!this.coilOn[d.coil];
      case 'pb': return d.pressed;
      case 'switch': return d.actuated;
      case 'timer': {
        if (pole === 'timed') return d.out;
        const k = d.coil ?? d.supply ?? d.trigger!; // instantaneous contacts follow the coil directly
        return !!this.coilOn[k];
      }
    }
  }
  contactClosed(e: Contact): boolean {
    if (e.welded) return true;
    if (e.stuckOpen) return false;
    const act = this.devActuated(e.dev, e.pole);
    return e.nc ? !act : act;
  }

  // ---- netlist -> branches ------------------------------------------------------------------------
  acBranches(extra: Branch[] = []): Branch[] {
    const out: Branch[] = [];
    for (const e of this.els) {
      switch (e.kind) {
        case 'source': if (e.on) { const y = inv(c(e.zsR, e.zsX)); out.push({ id: e.id, a: e.a, b: e.b, y, i: scale(y, e.volts) }); } break;
        case 'res': out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / e.r) }); break;
        case 'cap': out.push({ id: e.id, a: e.a, b: e.b, y: capAdmittance(e.c) }); break;
        case 'wire': {
          if (e.fault === 'open') break;
          if (e.fault === 'intermittent' && e.intermittentOpen) break;
          const r = e.fault === 'highR' ? (e.faultR ?? 1e5) : e.r;
          out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / r) });
          break;
        }
        case 'coil': {
          if (e.open) break;
          if (e.shorted) { out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / SHORTED_COIL_R) }); break; }
          const on = !!this.coilOn[e.id];
          const z = on ? coilZ(e.rated, e.sealedVA, e.sealedPF) : coilZ(e.rated, e.inrushVA, e.inrushPF);
          out.push({ id: e.id, a: e.a, b: e.b, y: inv(z) });
          break;
        }
        // off is high but finite: a real 120 V LED unit still passes microamps, so a 10 Mohm meter reads near line voltage across an open contact feeding it
        case 'led': out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / (this.ledOn[e.id] ? e.rLamp : e.rOff)) }); break;
        case 'lamp': out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / e.hotR) }); break;
        case 'contact': if (this.contactClosed(e)) out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / (e.rClosed + (e.extraR ?? 0))) }); break;
        case 'fuse': if (!e.blown) out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / e.r) }); break;
        case 'prox': out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / (this.devActuated(e.dev, 'main') ? e.rOn : e.rLeak)) }); break;
      }
    }
    return [...out, ...extra];
  }

  dcBranches(extra: Branch[], fwd: Record<string, boolean>): Branch[] {
    const out: Branch[] = [];
    for (const e of this.els) {
      switch (e.kind) {
        case 'source': if (e.on) out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / Math.max(e.zsR, 1e-3)) }); break; // winding DC resistance
        case 'res': out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / e.r) }); break;
        case 'cap': break; // DC blocks
        case 'wire': {
          if (e.fault === 'open') break;
          if (e.fault === 'intermittent' && e.intermittentOpen) break;
          out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / (e.fault === 'highR' ? (e.faultR ?? 1e5) : e.r)) });
          break;
        }
        case 'coil': {
          if (e.open) break;
          out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / (e.shorted ? SHORTED_COIL_R : e.dcR)) });
          break;
        }
        case 'led': if (fwd[e.id]) out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / e.rLamp), i: c(e.vf / e.rLamp) }); break;
        case 'lamp': out.push({ id: e.id, a: e.a, b: e.b, y: c(e.coldFactor / e.hotR) }); break; // cold resistance = hot / factor
        case 'contact': if (this.contactClosed(e)) out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / (e.rClosed + (e.extraR ?? 0))) }); break;
        case 'fuse': if (!e.blown) out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / e.r) }); break;
        case 'prox': out.push({ id: e.id, a: e.a, b: e.b, y: c(1 / e.rLeak) }); break;
      }
    }
    return [...out, ...extra];
  }

  /** AC solve with LED operating-point iteration (piecewise-linear). Updates this.ledOn to the converged point;
   *  LEDs that cannot settle (hysteresis ping-pong, e.g. near the turn-on voltage) are left off. */
  solveAC(extra: Branch[] = []): { sol: Solution; branches: Branch[] } {
    let sol!: Solution, br: Branch[] = [];
    let flips: Record<string, number> = {};
    for (let k = 0; k < 40; k++) {
      br = this.acBranches(extra);
      sol = solve(br, this.nodes());
      let ch = false;
      for (const e of this.els) {
        if (e.kind !== 'led') continue;
        const v = abs(vAcross(sol, e.a, e.b));
        const on = !!this.ledOn[e.id];
        const next = !on ? v >= e.vOnRms : v >= 0.8 * e.vOnRms;
        if (next !== on) {
          flips[e.id] = (flips[e.id] ?? 0) + 1;
          this.ledOn[e.id] = flips[e.id] > 4 ? false : next;
          ch = true;
        }
      }
      if (!ch) break;
      if (k === 39) { br = this.acBranches(extra); sol = solve(br, this.nodes()); }
    }
    return { sol, branches: br };
  }

  solveDC(extra: Branch[]): { sol: Solution; branches: Branch[] } {
    const fwd: Record<string, boolean> = {};
    let sol!: Solution, br: Branch[] = [];
    for (let k = 0; k < 30; k++) {
      br = this.dcBranches(extra, fwd);
      sol = solve(br, this.nodes());
      let ch = false;
      for (const e of this.els) {
        if (e.kind !== 'led') continue;
        const v = vAcross(sol, e.a, e.b).re;
        const want = v > e.vf;
        if (!!fwd[e.id] !== want) { fwd[e.id] = want; ch = true; }
      }
      if (!ch) break;
    }
    return { sol, branches: br };
  }

  // ---- electromechanical fixed point ------------------------------------------------------------------
  private stateKey(): string {
    const parts: string[] = [];
    for (const e of this.els) if (e.kind === 'coil') parts.push(this.coilOn[e.id] ? '1' : '0');
    for (const d of Object.values(this.devs)) if (d.kind === 'timer') parts.push(d.out ? 'T' : 't');
    return parts.join('');
  }

  settle(): void {
    this.updateSwitches();
    const seen: string[] = [];
    const states: Record<string, boolean>[] = [];
    this.chatter = [];
    this.oscillation = false;
    for (let iter = 0; iter < 60; iter++) {
      const { sol, branches } = this.solveAC();
      let changed = false;
      for (const e of this.els) {
        if (e.kind !== 'coil') continue;
        const v = abs(vAcross(sol, e.a, e.b));
        const on = !!this.coilOn[e.id];
        const ok = !e.open && !e.shorted;
        if (!on && ok && v >= (e.simPickupPct / 100) * e.rated) { this.coilOn[e.id] = true; changed = true; }
        else if (on && (!ok || v < (e.simDropoutPct / 100) * e.rated)) { this.coilOn[e.id] = false; changed = true; }
      }
      for (const d of Object.values(this.devs)) if (d.kind === 'timer' && this.timerUpdate(d)) changed = true;
      this.lastSolve = { v: Object.fromEntries(sol.v), floating: [...sol.floating], branches };
      if (!changed) { this.finishSettle(sol, branches); return; }
      const key = this.stateKey();
      const at = seen.indexOf(key);
      states.push({ ...this.coilOn });
      seen.push(key);
      if (at >= 0) {
        // limit cycle: coils whose state differs inside the cycle are chattering
        const cyc = states.slice(at);
        const chat = new Set<string>();
        for (const e of this.els) if (e.kind === 'coil') { const vals = new Set(cyc.map((s) => !!s[e.id])); if (vals.size > 1) chat.add(e.id); }
        this.chatter = [...chat];
        this.oscillation = true;
        for (const id of chat) this.coilOn[id] = false; // shown as buzzing; contacts rest in shelf state
        const r = this.solveAC();
        this.lastSolve = { v: Object.fromEntries(r.sol.v), floating: [...r.sol.floating], branches: r.branches };
        this.finishSettle(r.sol, r.branches);
        return;
      }
    }
    this.oscillation = true;
  }

  private finishSettle(sol: Solution, branches: Branch[]): void {
    this.fuseI = {};
    for (const e of this.els) {
      if (e.kind === 'fuse' && !e.blown) {
        const br = branches.find((b) => b.id === e.id);
        if (br) this.fuseI[e.id] = abs(branchCurrent(sol, br));
      }
    }
    this.hum = this.els.filter((e): e is Coil => e.kind === 'coil' && !!e.shadingRingBroken && !!this.coilOn[e.id]).map((e) => e.id);
  }

  // ---- timers (design.md 4.3.1) --------------------------------------------------------------------------
  private actualPreset(d: Extract<Dev, { kind: 'timer' }>): number {
    if (!this.jitter) return d.presetS;
    const u = new Rng((this.seed ^ hashString(d.id)) + this.timerStarts++).next();
    return d.presetS * (1 + (d.repeatAccuracyPct / 100) * (2 * u - 1));
  }
  /** Idempotent per instant. Returns true if the timer output changed. */
  private timerUpdate(d: Extract<Dev, { kind: 'timer' }>): boolean {
    const before = d.out;
    const on = (id?: string) => !!id && !!this.coilOn[id];
    if (d.tech === 'solid' && d.mode === 'off') {
      const sup = on(d.supply), trg = on(d.trigger);
      if (!sup) { d.out = false; d.timing = false; }
      else if (trg) { d.out = true; d.timing = false; }
      else if (d.lastIn && d.out && !d.timing) { d.timing = true; d.expireAt = this.t + this.actualPreset(d); }
      d.lastIn = trg;
      d.lastSup = sup;
    } else {
      const inp = on(d.coil ?? d.supply);
      if (d.mode === 'on') {
        if (inp && !d.lastIn) { d.timing = true; d.expireAt = this.t + this.actualPreset(d); }
        if (!inp && d.lastIn) { d.timing = false; d.out = false; } // reset; contacts return immediately
      } else {
        if (inp && !d.lastIn) { d.out = true; d.timing = false; } // re-energize during timing resets
        if (!inp && d.lastIn && d.out) { d.timing = true; d.expireAt = this.t + this.actualPreset(d); }
      }
      d.lastIn = inp;
    }
    if (d.out !== before) this.log.push(`t=${this.t.toFixed(3)} ${d.id} out=${d.out}`);
    return d.out !== before;
  }
  private expireTimers(): boolean {
    let any = false;
    for (const d of Object.values(this.devs)) {
      if (d.kind === 'timer' && d.timing && this.t >= d.expireAt - 1e-9) { // tie rule: elapsed >= preset
        d.timing = false;
        d.out = d.mode === 'on';
        this.log.push(`t=${this.t.toFixed(3)} ${d.id} out=${d.out}`);
        any = true;
      }
    }
    return any;
  }

  // ---- processes and switches ---------------------------------------------------------------------------
  private updateSwitches(): void {
    for (const d of Object.values(this.devs)) {
      if (d.kind !== 'switch' || !d.link || d.override) continue;
      const p = this.procs[d.link.proc].value, L = d.link, eps = 1e-6 * Math.max(1, Math.abs(L.threshold));
      if (L.actuateOn === 'rising') {
        if (!d.actuated && p >= L.threshold - eps) d.actuated = true;
        else if (d.actuated && p <= L.release + eps) d.actuated = false;
      } else {
        if (!d.actuated && p <= L.threshold + eps) d.actuated = true;
        else if (d.actuated && p >= L.release - eps) d.actuated = false;
      }
    }
  }
  private crossTime(p: Process, level: number): number {
    const num = p.value - p.target, den = level - p.target;
    if (Math.abs(num) < 1e-12) return Infinity;
    if (num * den <= 0 || Math.abs(den) >= Math.abs(num)) return Math.abs(p.value - level) < 1e-9 ? 0 : Infinity;
    return p.tau * Math.log(num / den);
  }
  private nextEvent(limit: number): number {
    let best = Infinity;
    for (const s of this.sched) best = Math.min(best, s.t);
    for (const d of Object.values(this.devs)) {
      if (d.kind === 'timer' && d.timing) best = Math.min(best, d.expireAt);
      if (d.kind === 'switch' && d.link && !d.override) {
        const p = this.procs[d.link.proc];
        const level = d.actuated ? d.link.release : d.link.threshold;
        best = Math.min(best, this.t + this.crossTime(p, level));
      }
    }
    for (const e of this.els) {
      if (e.kind === 'fuse' && !e.blown) {
        const i = this.fuseI[e.id] ?? 0;
        if (i >= e.minMeltX * e.rating) best = Math.min(best, this.t + Math.max(0, (e.i2tMelt - e.accum) / (i * i)));
      }
    }
    return best <= limit + 1e-12 ? Math.max(best, this.t) : Infinity;
  }
  private advanceState(to: number): void {
    const dt = to - this.t;
    if (dt <= 0) return;
    for (const p of Object.values(this.procs)) p.value = p.target + (p.value - p.target) * Math.exp(-dt / p.tau);
    for (const e of this.els) if (e.kind === 'fuse' && !e.blown) e.accum += (this.fuseI[e.id] ?? 0) ** 2 * dt;
    this.t = to;
  }
  private applyAction(a: SchedAction): void {
    switch (a.kind) {
      case 'press': this.press(a.dev, false); break;
      case 'release': this.release(a.dev, false); break;
      case 'toggle': this.toggleSwitch(a.dev, false); break;
      case 'supply': this.el<Extract<El, { kind: 'source' }>>(a.dev).on = !!a.value; break;
      case 'foreign': this.el<Extract<El, { kind: 'source' }>>(a.dev).on = !!a.value; break;
      case 'target': this.procs[a.dev].target = Number(a.value); break;
    }
  }
  schedule(dt: number, a: Omit<SchedAction, 't'>): void { this.sched.push({ ...a, t: this.t + dt }); }

  /** Run the event-driven clock forward by dt seconds. */
  advance(dt: number): void { this.advanceTo(this.t + dt); }
  advanceTo(T: number): void {
    for (let guard = 0; guard < 5000; guard++) {
      const ev = this.nextEvent(T);
      if (!isFinite(ev)) { this.advanceState(T); this.updateSwitches(); this.settle(); return; }
      this.advanceState(ev);
      // inputs scheduled at this instant are applied BEFORE the timeout check (tie rule)
      const due = this.sched.filter((s) => s.t <= this.t + 1e-12);
      this.sched = this.sched.filter((s) => s.t > this.t + 1e-12);
      for (const a of due) this.applyAction(a);
      this.settle();
      for (let k = 0; k < 20 && this.expireTimers(); k++) this.settle();
      for (const e of this.els) if (e.kind === 'fuse' && !e.blown && e.accum >= e.i2tMelt - 1e-9) { e.blown = true; this.log.push(`t=${this.t.toFixed(3)} ${e.id} cleared`); this.settle(); }
    }
    throw new Error('advance: event loop did not converge');
  }

  // ---- operator actions ---------------------------------------------------------------------------------
  press(id: string, settle = true): void {
    const d = this.devs[id];
    if (d?.kind !== 'pb') throw new Error(id + ' is not a pushbutton');
    d.pressed = d.maintained ? !d.pressed : true;
    if (settle) this.settle();
  }
  release(id: string, settle = true): void {
    const d = this.devs[id];
    if (d?.kind !== 'pb') throw new Error(id + ' is not a pushbutton');
    if (!d.maintained) d.pressed = false;
    if (settle) this.settle();
  }
  /** Maintained operators (mushroom) are reset by pulling/twisting. */
  resetMaintained(id: string): void { const d = this.devs[id]; if (d?.kind === 'pb' && d.maintained) { d.pressed = false; this.settle(); } }
  toggleSwitch(id: string, settle = true): void {
    const d = this.devs[id];
    if (d?.kind !== 'switch') throw new Error(id + ' is not a switch');
    d.actuated = !d.actuated;
    if (d.link) d.override = true; // operated by hand, overriding the process
    if (settle) this.settle();
  }
  /** Release a hand-operated override so the process drives the switch again. */
  clearOverride(id: string): void { const d = this.devs[id]; if (d?.kind === 'switch') { d.override = false; this.settle(); } }
  setSource(id: string, on: boolean): void { this.el<Extract<El, { kind: 'source' }>>(id).on = on; this.settle(); }
  setTarget(proc: string, target: number): void { this.procs[proc].target = target; this.settle(); }

  // ---- readouts -----------------------------------------------------------------------------------------
  v(a: string, b = 'G'): C { return this.lastSolve ? add(vOfRecord(this.lastSolve.v, a), scale(vOfRecord(this.lastSolve.v, b), -1)) : c(0); }
  lit(id: string): boolean {
    const e = this.el(id);
    if (!this.lastSolve) return false;
    if (e.kind === 'led') return !!this.ledOn[id] && abs(this.currentThrough(id)) >= e.litI;
    if (e.kind === 'lamp') return abs(this.v(e.a, e.b)) >= 0.5 * e.ratedV;
    return false;
  }
  currentThrough(id: string): C {
    const br = this.lastSolve?.branches.find((b) => b.id === id);
    if (!br || !this.lastSolve) return c(0);
    const s: Solution = { v: new Map(Object.entries(this.lastSolve.v)), floating: new Set(), singular: false };
    return branchCurrent(s, br);
  }
  coilVoltagePct(id: string): number { const e = this.el<Coil>(id); return (abs(this.v(e.a, e.b)) / e.rated) * 100; }
}
function vOfRecord(r: Record<string, C>, n: string): C { return n === 'G' ? c(0) : (r[n] ?? c(0)); }
export { vOf };
export type { Led };
