// A day's session: warm-up review -> lesson cards -> practice -> bucket activity -> wrap-up.
import { h, btn } from './dom';
import { cardsForDay, questionsForDay, byId, badgeOf, dayInfo, faults, ofType, items } from '../content';
import { getSave, commit } from '../game/save';
import { dayKey, dueIds, scheduleReview, addXp, XP, streak, rank, RANK_TITLE, unitDays } from '../game/progress';
import { present, grade } from '../game/questions';
import { mountBucket } from './bucketpanel';
import { renderSchematic } from './schematic';
import { buildBucket } from '../model/bucket';
import { faultDefs } from '../model/faults';
import { params } from '../content';
import { Rng } from '../model/rng';

const badge = (id: string) => (badgeOf.get(id) ? h('span', { class: 'badge unrev' }, badgeOf.get(id)!) : null);

export function runSession(root: HTMLElement, day: number, exit: () => void, extraRep = false): void {
  const save = getSave();
  const today = dayKey();
  const info = dayInfo(day);
  const seed = day * 1000 + Number(today.replace(/-/g, '')) % 1000;
  const stats = { right: 0, total: 0 };

  const shell = (title: string, ...kids: (Node | null | false)[]) => { root.replaceChildren(h('div', { class: 'screen' }, h('div', { class: 'crumb' }, `Day ${day} · ${info?.focus ?? ''}`), h('h2', {}, title), ...kids)); window.scrollTo(0, 0); };

  // ---- warm-up ----
  const due = extraRep ? [] : dueIds(save, today).filter((id) => byId(id)).slice(0, 5);
  const warm = () => {
    if (!due.length) return lesson(0);
    let i = 0;
    const next = () => { if (++i >= due.length) lesson(0); else show(); };
    const show = () => {
      const it = byId(due[i]);
      if (it.type === 'question') return askQuestion(it, `Warm-up review ${i + 1}/${due.length}`, (ok) => { scheduleReview(save, it.id, ok, today); commit(); next(); }, false);
      shell(`Warm-up review ${i + 1}/${due.length}`, h('div', { class: 'card' }, h('strong', {}, it.body.title), h('p', {}, it.body.text), h('p', { class: 'small' }, 'Did you still remember this?')),
        h('div', { class: 'row' }, btn('Got it', () => { scheduleReview(save, it.id, true, today); commit(); next(); }, 'primary'), btn('Review again soon', () => { scheduleReview(save, it.id, false, today); commit(); next(); })));
    };
    show();
  };

  // ---- lesson ----
  const cards = cardsForDay(day);
  const lesson = (i: number) => {
    if (extraRep || !cards.length) return practice();
    if (i >= cards.length) { addXp(save, XP.cardSet); commit(); return practice(); }
    const c = cards[i];
    const pg = save.settings.bookFree ? '' : ` · book p. ${c.book.page} (TOC, unverified)`;
    shell(`Lesson ${i + 1}/${cards.length}`,
      h('div', { class: 'card' }, badge(c.id), h('div', { class: 'small' }, `Section ${c.book.section}${pg}`), h('h3', {}, c.body.title),
        c.body.loto ? h('p', { class: 'banner' }, 'Example procedure. Always follow your employer’s procedure. LOTO steps pending your sign-off and PSC’s procedure.') : null,
        h('p', {}, c.body.text), h('p', { class: 'field' }, h('strong', {}, 'In the field: '), c.body.fieldNote),
        c.body.symbol ? h('p', { class: 'small' }, `Symbol: ${c.body.symbol.designation}. ${c.body.symbol.nemaNote} `, h('em', {}, c.body.symbol.iecNote)) : null),
      save.settings.bookFree ? h('p', { class: 'small' }, 'Book not here yet? These summaries stand alone.') : h('p', { class: 'small' }, `Read book section ${c.book.section} first.`),
      h('div', { class: 'row' }, i > 0 ? btn('Back', () => lesson(i - 1)) : null, btn(i === cards.length - 1 ? 'Start practice' : 'Next', () => lesson(i + 1), 'primary')));
  };

  // ---- practice ----
  const pool = extraRep ? ofType('question').filter((q) => (save.completedDays[String(q.body.day)] || q.body.day <= day)) : questionsForDay(day);
  const qs = extraRep ? [...pool].sort(() => new Rng(seed + pool.length).next() - 0.5).slice(0, 6) : [...pool];
  const practice = () => {
    let i = 0;
    const step = () => {
      if (i >= qs.length) return activity();
      const q = qs[i];
      askQuestion(q, `Practice ${i + 1}/${qs.length}`, (ok) => { stats.total++; if (ok) { stats.right++; addXp(save, XP.correct); } scheduleReview(save, q.id, ok, today); const a = (save.answers[q.id] ??= { version: q.version, right: 0, wrong: 0, last: today }); ok ? a.right++ : a.wrong++; a.version = q.version; a.last = today; commit(); i++; step(); }, true);
    };
    step();
  };

  function askQuestion(q: any, title: string, done: (ok: boolean) => void, showFeedback: boolean) {
    const b = q.body;
    const p = present(q, seed);
    const chosen: number[] = [];
    const taps: string[] = [];
    let locked = false;
    const area = h('div', { class: 'card' }, badge(q.id), h('p', { class: 'stem' }, b.stem));
    const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
    const finish = (ok: boolean, why: string) => {
      locked = true;
      fb.replaceChildren(h('div', { class: ok ? 'ok' : 'bad' }, ok ? '✔ Correct' : '✘ Not quite'), h('p', {}, b.explanation), ...(why ? [h('p', { class: 'small' }, why)] : []), btn('Continue', () => done(ok), 'primary'));
      void showFeedback;
    };
    const check = () => {
      if (locked) return;
      let ok: boolean, why = '';
      if (b.format === 'tap-schematic') { ok = grade(q, taps); why = ok ? '' : b.tapWhy ?? ''; }
      else { ok = grade(q, chosen); if (!ok && b.answers) { const wrong = chosen.filter((c) => !b.answers[c].correct).map((c) => b.answers[c].distractorWhy).filter(Boolean); why = wrong.join(' '); } }
      finish(ok, why);
    };
    if (b.format === 'tap-schematic') {
      const bk = buildBucket(params);
      const svg = renderSchematic(bk, { onTap: (id) => { const k = taps.indexOf(id); if (k >= 0) taps.splice(k, 1); else taps.push(id); sel.textContent = 'Selected: ' + (taps.join(', ') || 'none'); } });
      const sel = h('div', { class: 'small' }, 'Tap the element on the schematic, then Check.');
      area.append(h('div', { class: 'schem-wrap' }, svg), sel, btn('Check', check, 'primary'));
    } else if (b.format === 'order-steps') {
      const list = h('ol', { class: 'ordered' });
      const opts = h('div', { class: 'opts' });
      const redraw = () => {
        list.replaceChildren(...chosen.map((c) => h('li', {}, b.steps[c])));
        opts.replaceChildren(...p.options.filter((o) => !chosen.includes(o.index)).map((o) => btn(o.text, () => { if (!locked) { chosen.push(o.index); redraw(); } }, 'opt')), chosen.length ? btn('Undo last', () => { if (!locked) { chosen.pop(); redraw(); } }, 'small') : h('span'));
        if (chosen.length === b.steps.length) check();
      };
      area.append(h('p', { class: 'small' }, 'Tap the steps in the correct order.'), list, opts); redraw();
    } else {
      const opts = h('div', { class: 'opts' });
      if (b.format === 'identify-symbol' && b.symbol) area.append(h('p', { class: 'small' }, `Symbol key: ${b.symbol}`));
      for (const o of p.options) {
        const el = h('button', { class: 'btn opt', type: 'button', 'aria-pressed': 'false' }, o.text);
        el.addEventListener('click', () => {
          if (locked) return;
          if (p.multi) { const k = chosen.indexOf(o.index); if (k >= 0) chosen.splice(k, 1); else chosen.push(o.index); el.classList.toggle('active'); el.setAttribute('aria-pressed', String(k < 0)); }
          else { chosen.length = 0; chosen.push(o.index); check(); }
        });
        opts.append(el);
      }
      area.append(opts);
      if (p.multi) area.append(h('p', { class: 'small' }, 'Select all that apply.'), btn('Check', check, 'primary'));
    }
    shell(title, area, fb);
  }

  // ---- bucket activity ----
  const defs = faultDefs(params);
  const pickFaults = (n: number, allowed?: string[]): string[] => {
    const r = new Rng(seed);
    const pool = defs.filter((d) => d.id !== 'foreign-voltage-bucket-off' && (!allowed || allowed.includes(d.id))).map((d) => d.id);
    const out: string[] = [];
    while (out.length < Math.min(n, pool.length)) { const x = r.pick(pool); if (!out.includes(x)) out.push(x); }
    return out;
  };
  const activity = () => {
    if (extraRep) return wrap();
    const sc = byId(info?.activity);
    if (!sc) return wrap();
    let ids: string[] = sc.body.faults ?? [];
    if (day === 9) ids = pickFaults(2, defs.slice(0, 11).map((d) => d.id));
    if (day === 10) ids = pickFaults(3);
    else if (ids.length && day < 9) ids = [ids[0]];
    shell(sc.body.title, h('div', { class: 'card' }, badge(sc.id), h('ol', {}, ...sc.body.steps.map((s: string) => h('li', {}, s)))), btn(ids.length ? 'Start work order' : 'Open the bucket', () => runFaults(ids, 0, sc), 'primary'));
  };
  const runFaults = (ids: string[], i: number, sc: any) => {
    const isLoto = day === 2;
    const def = ids.length ? defs.find((d) => d.id === ids[i]) ?? null : null;
    const item = def ? faults().find((f) => f.body.engineId === def.id) : null;
    let submitted = !def; // free-exploration activities can always be finished
    const last = i + 1 >= ids.length;
    mountBucket(root, {
      fault: def, minMeasurements: item?.body.minMeasurements ?? 1, showLoto: isLoto || !!def, troubleshoot: !!def, title: `${sc.body.title}${ids.length > 1 ? ` (${i + 1}/${ids.length})` : ''}`,
      footer: () => (submitted ? btn(!last && def ? 'Next work order' : 'Finish activity', () => {
        if (!last && def) return runFaults(ids, i + 1, sc);
        if (!def) { addXp(save, XP.activity); commit(); }
        if (day === 10 && passes >= 2) { save.commissioningPassed = true; commit(); }
        wrap();
      }, 'primary') : null),
      onFinish: (r) => {
        if (r.score && def) {
          save.tickets.push({ faultId: def.id, date: today, score: r.score.total, passed: r.score.passed });
          addXp(save, r.score.xp - XP.safetyViolation * r.score.violations.length);
          save.safetyViolations += r.score.violations.length;
          if (r.score.passed) passes++;
        }
        if (!def) { /* nothing to score */ }
        submitted = true; commit();
      },
    });
  };
  let passes = 0;

  // ---- wrap-up ----
  const wrap = () => {
    if (!extraRep) { save.completedDays[String(day)] = { date: today, score: stats.total ? Math.round((100 * stats.right) / stats.total) : 0 }; addXp(save, XP.activity); }
    if (!save.activity.includes(today)) save.activity.push(today);
    commit();
    const st = streak(save.activity, save.settings.days, today);
    const unitDone = Object.entries(unitDays).filter(([, ds]) => ds.every((d) => save.completedDays[String(d)])).map(([u]) => u);
    shell('Wrap-up', h('div', { class: 'card' },
      h('p', {}, `Practice: ${stats.right}/${stats.total} correct`), h('p', {}, `XP total: ${save.xp}`), h('p', {}, `Streak: ${st} scheduled day${st === 1 ? '' : 's'}`),
      h('p', {}, `Rank: ${RANK_TITLE[rank(save)]}`), unitDone.length ? h('p', { class: 'small' }, `Book units completed: ${unitDone.join(', ')}`) : null,
      day === 10 && save.commissioningPassed ? h('p', { class: 'ok' }, 'Commissioning check passed. Act 1 complete.') : day === 10 ? h('p', { class: 'bad' }, 'Commissioning not passed yet: you need 2 of 3 faults diagnosed safely. Try again from Home.') : null,
      h('p', { class: 'field' }, h('strong', {}, 'Takeaway: '), info?.focus ?? '')),
      h('div', { class: 'row' }, btn('Done', exit, 'primary'), btn('Extra rep', () => runSession(root, day, exit, true))));
  };

  warm();
  void items;
}
