// One practice / warm-up question rendered inside the dock. Selection state is mirrored to the save (draft) so a tab switch or reload keeps it.
import { h, btn } from './dom';
import { symbolFigure } from './symbols';
import { renderSchematic } from './schematic';
import { buildBucket } from '../model/bucket';
import { present, grade } from '../game/questions';
import { badgeOf, params } from '../content';

const badge = (id: string) => (badgeOf.get(id) ? h('span', { class: 'badge unrev' }, badgeOf.get(id)!) : null);

export interface QuestionOpts {
  q: any; seed: number;
  draft?: { chosen: number[]; taps: string[] };
  onDraft: (d: { chosen: number[]; taps: string[] }) => void;
  onGraded: (ok: boolean) => void;        // called once, when the answer is checked
  onContinue: () => void;
}
export function renderQuestion(o: QuestionOpts): HTMLElement {
  const { q } = o, b = q.body;
  const p = present(q, o.seed);
  const chosen: number[] = o.draft?.chosen ? [...o.draft.chosen] : [];
  const taps: string[] = o.draft?.taps ? [...o.draft.taps] : [];
  let locked = false;
  const touch = () => o.onDraft({ chosen: [...chosen], taps: [...taps] });
  const area = h('div', { class: 'card ds-q' }, badge(q.id), h('p', { class: 'stem' }, b.stem));
  const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const finish = (ok: boolean, why: string) => {
    locked = true;
    o.onGraded(ok);
    fb.replaceChildren(h('div', { class: ok ? 'ok' : 'bad' }, ok ? '✔ Correct' : '✘ Not quite'), h('p', {}, b.explanation), ...(why ? [h('p', { class: 'small' }, why)] : []), btn('Continue', () => o.onContinue(), 'primary'));
  };
  const check = () => {
    if (locked) return;
    let ok: boolean, why = '';
    if (b.format === 'tap-schematic') { ok = grade(q, taps); why = ok ? '' : b.tapWhy ?? ''; }
    else { ok = grade(q, chosen); if (!ok && b.answers) why = chosen.filter((c) => !b.answers[c].correct).map((c) => b.answers[c].distractorWhy).filter(Boolean).join(' '); }
    finish(ok, why);
  };
  if (b.format === 'tap-schematic') {
    const bk = buildBucket(params);
    const sel = h('div', { class: 'small' }, taps.length ? 'Selected: ' + taps.join(', ') : 'Tap the element on the schematic, then Check.');
    const svg = renderSchematic(bk, { onTap: (id) => { const k = taps.indexOf(id); if (k >= 0) taps.splice(k, 1); else taps.push(id); sel.textContent = 'Selected: ' + (taps.join(', ') || 'none'); touch(); } });
    area.append(h('div', { class: 'schem-wrap' }, svg), sel, btn('Check', check, 'primary'));
  } else if (b.format === 'order-steps') {
    const list = h('ol', { class: 'ordered' });
    const opts = h('div', { class: 'opts' });
    const redraw = () => {
      list.replaceChildren(...chosen.map((c) => h('li', {}, b.steps[c])));
      opts.replaceChildren(...p.options.filter((o2) => !chosen.includes(o2.index)).map((o2) => btn(o2.text, () => { if (!locked) { chosen.push(o2.index); touch(); redraw(); } }, 'opt')), chosen.length ? btn('Undo last', () => { if (!locked) { chosen.pop(); touch(); redraw(); } }, 'small') : h('span'));
      if (chosen.length === b.steps.length) check();
    };
    area.append(h('p', { class: 'small' }, 'Tap the steps in the correct order.'), list, opts); redraw();
  } else {
    const opts = h('div', { class: 'opts' });
    if (b.format === 'identify-symbol' && b.symbol) area.append(h('div', { class: 'symbox' }, symbolFigure(b.symbol)));
    for (const op of p.options) {
      const el = h('button', { class: 'btn opt' + (chosen.includes(op.index) ? ' active' : ''), type: 'button', 'aria-pressed': String(chosen.includes(op.index)) }, op.text);
      el.addEventListener('click', () => {
        if (locked) return;
        if (p.multi) { const k = chosen.indexOf(op.index); if (k >= 0) chosen.splice(k, 1); else chosen.push(op.index); el.classList.toggle('active'); el.setAttribute('aria-pressed', String(k < 0)); touch(); }
        else { chosen.length = 0; chosen.push(op.index); touch(); check(); }
      });
      opts.append(el);
    }
    area.append(opts);
    if (p.multi) area.append(h('p', { class: 'small' }, 'Select all that apply.'), btn('Check', check, 'primary'));
  }
  return h('div', {}, area, fb);
}
