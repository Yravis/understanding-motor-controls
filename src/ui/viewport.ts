// Zoom / pan for the bucket SVG by driving its viewBox: wheel zooms at the cursor, drag pans, two fingers pinch.
// The current viewBox is reported to the caller so it can be saved in the session (it survives tab switches and reloads).
import { B2, GOTOS, type Rect } from './bucket2layout';
import type { ViewBoxState } from '../game/session';

export const MIN_PCT = 40, MAX_PCT = 600;
export interface Viewport {
  attach(svg: SVGSVGElement): void;
  fit(): void; actual(): void; zoomBy(f: number): void; goTo(id: string): void; goRect(r: Rect): void;
  pct(): number; state(): ViewBoxState | null; resize(): void;
}

export function createViewport(host: HTMLElement, initial: ViewBoxState | null, onChange: (v: ViewBoxState | null, pct: number) => void): Viewport {
  let svg: SVGSVGElement | null = null;
  let vb: ViewBoxState = initial ?? { x: 0, y: 0, w: B2.W, h: B2.H };
  let isFit = !initial;
  const size = () => ({ cw: host.clientWidth || 900, ch: host.clientHeight || 720 });
  const fitBox = (r: Rect): ViewBoxState => {
    const { cw, ch } = size();
    const a = cw / ch;
    let w = r.w, h = r.h;
    if (w / h < a) w = h * a; else h = w / a;
    return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w, h };
  };
  const normalize = () => { // keep the host aspect, clamp zoom and keep the bucket reachable
    const { cw, ch } = size();
    const a = cw / ch;
    const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
    const wFit = fitBox({ x: 0, y: 0, w: B2.W, h: B2.H }).w;
    let w = Math.min(Math.max(vb.w, cw / (MAX_PCT / 100)), Math.max(wFit * 1.1, cw / (MIN_PCT / 100)));
    const h = w / a;
    const px = Math.min(Math.max(cx, 0), B2.W), py = Math.min(Math.max(cy, 0), B2.H);
    vb = { x: px - w / 2, y: py - h / 2, w, h };
  };
  const pct = () => Math.round((size().cw / vb.w) * 100);
  const apply = (notify = true) => {
    normalize();
    svg?.setAttribute('viewBox', `${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`);
    if (notify) onChange(isFit ? null : { ...vb }, pct());
  };
  const vp: Viewport = {
    attach(el) { svg = el; el.setAttribute('preserveAspectRatio', 'xMidYMid meet'); if (isFit) vb = fitBox({ x: 0, y: 0, w: B2.W, h: B2.H }); apply(false); },
    fit() { isFit = true; vb = fitBox({ x: 0, y: 0, w: B2.W, h: B2.H }); apply(); },
    actual() { const { cw } = size(); const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2; isFit = false; vb = { x: cx - cw / 2, y: cy - size().ch / 2, w: cw, h: size().ch }; apply(); },
    zoomBy(f) { const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2; isFit = false; vb = { x: cx - (vb.w / f) / 2, y: cy - (vb.h / f) / 2, w: vb.w / f, h: vb.h / f }; apply(); },
    goRect(r) { isFit = r.w >= B2.W && r.h >= B2.H; vb = fitBox(r); apply(); },
    goTo(id) { const g = GOTOS.find((x) => x.id === id); if (g) vp.goRect(g.rect); },
    pct, state: () => (isFit ? null : { ...vb }),
    resize() { if (isFit) vb = fitBox({ x: 0, y: 0, w: B2.W, h: B2.H }); apply(false); },
  };

  const toBox = (e: { clientX: number; clientY: number }) => { const r = host.getBoundingClientRect(); const { cw, ch } = size(); return { x: vb.x + ((e.clientX - r.left) / cw) * vb.w, y: vb.y + ((e.clientY - r.top) / ch) * vb.h, fx: (e.clientX - r.left) / cw, fy: (e.clientY - r.top) / ch }; };
  const zoomAt = (f: number, e: { clientX: number; clientY: number }) => {
    const p = toBox(e);
    const w = vb.w / f, h = vb.h / f;
    isFit = false;
    vb = { x: p.x - p.fx * w, y: p.y - p.fy * h, w, h };
    apply();
  };
  host.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(Math.pow(1.0015, -e.deltaY), e); }, { passive: false });

  const pts = new Map<number, { x: number; y: number }>();
  let drag: { x: number; y: number; moved: boolean; vb: ViewBoxState } | null = null;
  let pinch = 0;
  let suppress = false;
  host.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('.ds-float, .ds-coach')) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, moved: false, vb: { ...vb } };
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); if (drag) drag.moved = true; }
  });
  host.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) zoomAt(d / pinch, { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      pinch = d; suppress = true; return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; try { host.setPointerCapture(e.pointerId); } catch { /* not capturable */ } host.classList.add('panning'); }
    if (drag.moved) {
      const { cw } = size();
      const k = drag.vb.w / cw;
      isFit = false;
      vb = { ...drag.vb, x: drag.vb.x - dx * k, y: drag.vb.y - dy * k };
      apply(false);
    }
  });
  const up = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    if (drag?.moved) { suppress = true; setTimeout(() => { suppress = false; }, 0); apply(); }
    if (pts.size < 2) pinch = 0;
    if (!pts.size) { drag = null; host.classList.remove('panning'); }
  };
  host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
  host.addEventListener('click', (e) => { if (suppress) { e.stopPropagation(); e.preventDefault(); suppress = false; } }, true);
  return vp;
}
