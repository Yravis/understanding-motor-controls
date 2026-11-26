// Netlist + device types. Everything is plain data so a World can be cloned with structuredClone.
export type Basis = 'datasheet' | 'standard' | 'book' | 'typical' | 'illustrative' | 'general-knowledge';

interface Base { id: string; a: string; b: string; label?: string }
export interface Source extends Base { kind: 'source'; volts: number; zsR: number; zsX: number; on: boolean }
export interface Res extends Base { kind: 'res'; r: number }
export interface Cap extends Base { kind: 'cap'; c: number }
export interface Wire extends Base { kind: 'wire'; r: number; fault?: 'open' | 'highR' | 'intermittent'; faultR?: number; intermittentOpen?: boolean }
export interface Coil extends Base {
  kind: 'coil'; dev: string; role: 'main' | 'supply' | 'trigger';
  rated: number; inrushVA: number; inrushPF: number; sealedVA: number; sealedPF: number; dcR: number;
  guaranteedOperatePct: [number, number]; simPickupPct: number; simDropoutPct: number;
  open?: boolean; shorted?: boolean; shadingRingBroken?: boolean;
}
export interface Led extends Base { kind: 'led'; dev: string; rLamp: number; rOff: number; vOnRms: number; vf: number; litI: number } // a = anode
export interface Lamp extends Base { kind: 'lamp'; dev: string; hotR: number; coldFactor: number; ratedV: number }
export type Pole = 'main' | 'inst' | 'timed';
export interface Contact extends Base {
  kind: 'contact'; dev: string; pole: Pole; nc: boolean; rClosed: number;
  welded?: boolean; stuckOpen?: boolean; extraR?: number;
}
export interface Fuse extends Base { kind: 'fuse'; rating: number; r: number; minMeltX: number; i2tMelt: number; blown: boolean; pulled: boolean; accum: number }
export interface Prox extends Base { kind: 'prox'; dev: string; rLeak: number; rOn: number }
export type El = Source | Res | Cap | Wire | Coil | Led | Lamp | Contact | Fuse | Prox;

export interface ProcessLink { proc: string; actuateOn: 'rising' | 'falling'; threshold: number; release: number }
export interface Process { id: string; label: string; unit: string; value: number; target: number; tau: number; basis: Basis }

export type Dev =
  | { kind: 'relay'; id: string; coil: string }
  | { kind: 'solenoid'; id: string; coil: string }
  | { kind: 'pb'; id: string; maintained: boolean; pressed: boolean }
  | { kind: 'switch'; id: string; sw: 'float' | 'pressure' | 'temp' | 'limit' | 'flow' | 'prox'; actuated: boolean; link?: ProcessLink; override?: boolean }
  | { kind: 'timer'; id: string; tech: 'pneumatic' | 'solid'; mode: 'on' | 'off'; presetS: number; repeatAccuracyPct: number; coil?: string; supply?: string; trigger?: string;
      out: boolean; timing: boolean; expireAt: number; lastIn: boolean; lastSup: boolean; supplyConstantRequired?: boolean };
export type DevMap = Record<string, Dev>;
