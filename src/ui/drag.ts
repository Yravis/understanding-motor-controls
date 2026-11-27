// Make a floating card draggable inside its container. Position is reported in container pixels (left/top), clamped to stay visible.
export interface Pos { x: number; y: number }
export function clampPos(p: Pos, box: { w: number; h: number }, container: { w: number; h: number }): Pos {
  return { x: Math.round(Math.max(0, Math.min(p.x, Math.max(0, container.w - Math.min(box.w, container.w))))), y: Math.round(Math.max(0, Math.min(p.y, Math.max(0, container.h - Math.min(box.h, container.h))))) };
}
export function makeDraggable(card: HTMLElement, handle: HTMLElement, container: HTMLElement, onMove: (p: Pos) => void): void {
  let start: { px: number; py: number; x: number; y: number } | null = null;
  handle.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('button, input, select, a')) return;
    const c = container.getBoundingClientRect(), r = card.getBoundingClientRect();
    start = { px: e.clientX, py: e.clientY, x: r.left - c.left, y: r.top - c.top };
    try { handle.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    e.preventDefault(); e.stopPropagation();
  });
  handle.addEventListener('pointermove', (e) => {
    if (!start) return;
    const c = container.getBoundingClientRect();
    const p = clampPos({ x: start.x + e.clientX - start.px, y: start.y + e.clientY - start.py }, { w: card.offsetWidth, h: card.offsetHeight }, { w: c.width, h: c.height });
    card.style.left = p.x + 'px'; card.style.top = p.y + 'px'; card.style.right = 'auto'; card.style.bottom = 'auto';
    onMove(p);
  });
  const end = () => { start = null; };
  handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
}
