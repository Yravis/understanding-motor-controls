// Minimal complex-number helpers (pure, no DOM).
export interface C { re: number; im: number }
export const c = (re: number, im = 0): C => ({ re, im });
export const ZERO: C = c(0);
export const add = (a: C, b: C): C => c(a.re + b.re, a.im + b.im);
export const sub = (a: C, b: C): C => c(a.re - b.re, a.im - b.im);
export const mul = (a: C, b: C): C => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const scale = (a: C, k: number): C => c(a.re * k, a.im * k);
export const abs = (a: C): number => Math.hypot(a.re, a.im);
export const arg = (a: C): number => Math.atan2(a.im, a.re);
export const polar = (mag: number, ang: number): C => c(mag * Math.cos(ang), mag * Math.sin(ang));
export function div(a: C, b: C): C {
  const d = b.re * b.re + b.im * b.im;
  return c((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}
export const inv = (a: C): C => div(c(1), a);
