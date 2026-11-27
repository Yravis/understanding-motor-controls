// Coach card: shows the current step's instruction on top of the bucket. Draggable; folds into a pill in the step strip.
import { h, btn } from './dom';
import { makeDraggable, clampPos } from './drag';

export interface CoachModel { kicker: string; title: string; body: string; why: string; hint: string }
export interface CoachState { x: number | null; y: number | null; folded: boolean }
export interface Coach { card: HTMLElement; pill: HTMLElement; update(m: CoachModel): void; reclamp(): void; showWhy(): void; showHint(): void }

export function createCoach(container: HTMLElement, st: CoachState, opts: { onChange: () => void; onShowMe: () => void }): Coach {
  const kicker = h('div', { class: 'ds-coach-k' });
  const title = h('div', { class: 'ds-coach-t' });
  const body = h('div', { class: 'ds-coach-b' });
  const why = h('div', { class: 'ds-coach-why', hidden: true });
  const hint = h('div', { class: 'ds-coach-hint', hidden: true });
  const grip = h('div', { class: 'ds-coach-grip', title: 'Drag to move' }, kicker);
  const fold = h('button', { class: 'ds-coach-fold', type: 'button', 'aria-label': 'Fold the coach into the step strip', title: 'Fold into the step strip', onclick: () => setFolded(true) }, '▴ fold');
  const head = h('div', { class: 'ds-coach-head' }, grip, fold);
  const card = h('div', { class: 'ds-coach', role: 'region', 'aria-label': 'Coach' }, head, title, body, why, hint,
    h('div', { class: 'ds-coach-row' }, btn('Show me', () => opts.onShowMe(), 'ds-mini'), btn('Why?', () => { why.hidden = !why.hidden; }, 'ds-mini')));
  const pillText = h('span', {}, '');
  const pill = h('button', { class: 'ds-pill-coach', type: 'button', 'aria-label': 'Unfold the coach', onclick: () => setFolded(false) }, 'Coach · ', pillText, ' ▾');
  card.hidden = st.folded; pill.hidden = !st.folded;

  const place = () => {
    if (st.x == null || st.y == null) { card.style.left = ''; card.style.top = ''; card.style.right = ''; return; }
    const c = container.getBoundingClientRect();
    const p = c.width ? clampPos({ x: st.x, y: st.y }, { w: card.offsetWidth || 300, h: card.offsetHeight || 120 }, { w: c.width, h: c.height }) : { x: st.x, y: st.y };
    card.style.left = p.x + 'px'; card.style.top = p.y + 'px'; card.style.right = 'auto';
  };
  const setFolded = (f: boolean) => { st.folded = f; card.hidden = f; pill.hidden = !f; if (!f) place(); opts.onChange(); };
  makeDraggable(card, grip, container, (p) => { st.x = p.x; st.y = p.y; opts.onChange(); });
  place();
  return {
    card, pill,
    update(m) {
      kicker.textContent = m.kicker; title.textContent = m.title; body.textContent = m.body; why.textContent = 'Why: ' + m.why; hint.textContent = m.hint;
      pillText.textContent = m.title;
    },
    reclamp: place,
    showWhy() { if (st.folded) setFolded(false); why.hidden = false; },
    showHint() { if (st.folded) setFolded(false); hint.hidden = false; },
  };
}
