// A day's session: warm-up review -> lesson cards -> practice -> bucket activity -> wrap-up.
// Progress lives on the save (src/game/session.ts) so a tab switch or reload resumes mid-day.
import { h, btn } from './dom';
import { symbolFigure } from './symbols';
import { cardsForDay, questionsForDay, byId, badgeOf, dayInfo, faults, ofType } from '../content';
import { getSave, commit } from '../game/save';
import { dayKey, dueIds, scheduleReview, addXp, XP, streak, rank, RANK_TITLE, unitDays } from '../game/progress';
import { present, grade } from '../game/questions';
import { openSession, patchSession, setDraft, recordAttempt, clearSession } from '../game/session';
import { mountBucket } from './bucketpanel';
import { renderSchematic } from './schematic';
import { buildBucket } from '../model/bucket';
import { faultDefs } from '../model/faults';
import { params } from '../content';
import { Rng } from '../model/rng';

/** Optional desk layout: the bucket stays in a side pane so lesson/practice don't have to flip tabs. */
export interface DeskLayout {
  bucket: HTMLElement;
  showFreeBench: () => void;
  noteActivity: () => void;
}

const badge = (id: string) => (badgeOf.get(id) ? h('span', { class: 'badge unrev' }, badgeOf.get(id)!) : null);

export function runSession(root: HTMLElement, day: number, exit: () => void, extraRep = false, layout?: DeskLayout): void {
  const save = getSave();
  const today = dayKey();
  const info = dayInfo(day);
  const seed = day * 1000 + Number(today.replace(/-/g, '')) % 1000;

  const due = extraRep ? [] : dueIds(save, today).filter((id) => byId(id)).slice(0, 5);
  const cards = cardsForDay(day);
  const pool = extraRep ? ofType('question').filter((q) => (save.completedDays[String(q.body.day)] || q.body.day <= day)) : questionsForDay(day);
  const builtQs = extraRep ? [...pool].sort(() => new Rng(seed + pool.length).next() - 0.5).slice(0, 6) : [...pool];
  const defs = faultDefs(params);
  const pickFaults = (n: number, allowed?: string[]): string[] => {
    const r = new Rng(seed);
    const poolIds = defs.filter((d) => d.id !== 'foreign-voltage-bucket-off' && (!allowed || allowed.includes(d.id))).map((d) => d.id);
    const out: string[] = [];
    while (out.length < Math.min(n, poolIds.length)) { const x = r.pick(poolIds); if (!out.includes(x)) out.push(x); }
    return out;
  };
  const computeFaultIds = (): string[] => {
    const sc = info?.activity ? byId(info.activity) : null;
    if (!sc) return [];
    let ids: string[] = sc.body.faults ?? [];
    if (day === 9) ids = pickFaults(2, defs.slice(0, 11).map((d) => d.id));
    if (day === 10) ids = pickFaults(3);
    else if (ids.length && day < 9) ids = [ids[0]];
    return ids;
  };

  const sess = openSession(save, {
    day, extraRep, date: today,
    warmIds: due,
    questionIds: builtQs.map((q) => q.id),
    faultIds: computeFaultIds(),
    cardCount: cards.length,
  });
  commit();
  if (sess.phase !== 'activity' || !sess.activityStarted) layout?.showFreeBench();
  const qs = sess.questionIds.map((id) => byId(id)).filter(Boolean);

  const shell = (title: string, ...kids: (Node | null | false)[]) => { root.replaceChildren(h('div', { class: 'screen' }, h('div', { class: 'crumb' }, `Day ${day} · ${info?.focus ?? ''}`), h('h2', {}, title), ...kids)); window.scrollTo(0, 0); };

  const show = (): void => {
    if (sess.phase === 'warm') return showWarm();
    if (sess.phase === 'lesson') return showLesson();
    if (sess.phase === 'practice') return showPractice();
    if (sess.phase === 'activity') return showActivity();
    return showWrap();
  };
  const go = (phase: typeof sess.phase, index = 0, extra: Parameters<typeof patchSession>[1] = {}): void => {
    patchSession(save, { phase, index, ...extra });
    commit();
    show();
  };

  const showWarm = (): void => {
    if (!sess.warmIds.length || sess.index >= sess.warmIds.length) return go(cards.length && !extraRep ? 'lesson' : 'practice', 0);
    const i = sess.index;
    const it = byId(sess.warmIds[i]);
    if (it.type === 'question') return askQuestion(it, `Warm-up review ${i + 1}/${sess.warmIds.length}`, (ok) => { scheduleReview(save, it.id, ok, today); recordAttempt(save, it.id, ok); }, false);
    shell(`Warm-up review ${i + 1}/${sess.warmIds.length}`, h('div', { class: 'card' }, h('strong', {}, it.body.title), h('p', {}, it.body.text), h('p', { class: 'small' }, 'Did you still remember this?')),
      h('div', { class: 'row' }, btn('Got it', () => { scheduleReview(save, it.id, true, today); patchSession(save, { index: i + 1 }); commit(); show(); }, 'primary'), btn('Review again soon', () => { scheduleReview(save, it.id, false, today); patchSession(save, { index: i + 1 }); commit(); show(); })));
  };

  const showLesson = (): void => {
    if (extraRep || !cards.length) return go('practice', 0);
    if (sess.index >= cards.length) {
      if (!sess.lessonXpAwarded) { addXp(save, XP.cardSet); patchSession(save, { lessonXpAwarded: true }); commit(); }
      return go('practice', 0);
    }
    const i = sess.index;
    const c = cards[i];
    const pg = save.settings.bookFree ? '' : ` · book p. ${c.book.page} (TOC, unverified)`;
    shell(`Lesson ${i + 1}/${cards.length}`,
      h('div', { class: 'card' }, badge(c.id), h('div', { class: 'small' }, `Section ${c.book.section}${pg}`), h('h3', {}, c.body.title),
        c.body.loto ? h('p', { class: 'banner' }, 'Example procedure (standard OSHA 1910.147 + NFPA 70E 2024). Always follow your employer’s lockout/tagout procedure.') : null,
        h('p', {}, c.body.text), h('p', { class: 'field' }, h('strong', {}, 'In the field: '), c.body.fieldNote),
        c.body.symbol ? h('div', { class: 'symbox' }, symbolFigure(c.body.symbol.key, c.body.symbol.designation), h('p', { class: 'small' }, h('strong', {}, 'NEMA: '), `${c.body.symbol.designation}. ${c.body.symbol.nemaNote}`), h('p', { class: 'small iec' }, h('strong', {}, 'IEC side note: '), c.body.symbol.iecNote)) : null),
      save.settings.bookFree ? h('p', { class: 'small' }, 'Book not here yet? These summaries stand alone.') : h('p', { class: 'small' }, `Read book section ${c.book.section} first.`),
      h('div', { class: 'row' }, i > 0 ? btn('Back', () => go('lesson', i - 1)) : null, btn(i === cards.length - 1 ? 'Start practice' : 'Next', () => go('lesson', i + 1), 'primary')));
  };

  const showPractice = (): void => {
    if (sess.index >= qs.length) return go(extraRep ? 'wrap' : 'activity', 0);
    const i = sess.index;
    const q = qs[i];
    askQuestion(q, `Practice ${i + 1}/${qs.length}`, (ok) => {
      if (ok) addXp(save, XP.correct);
      scheduleReview(save, q.id, ok, today);
      const a = (save.answers[q.id] ??= { version: q.version, right: 0, wrong: 0, last: today });
      ok ? a.right++ : a.wrong++; a.version = q.version; a.last = today;
      recordAttempt(save, q.id, ok);
    }, true);
  };

  function askQuestion(q: any, title: string, done: (ok: boolean) => void, showFeedback: boolean) {
    const b = q.body;
    const p = present(q, seed);
    const chosen: number[] = sess.draft?.chosen ? [...sess.draft.chosen] : [];
    const taps: string[] = sess.draft?.taps ? [...sess.draft.taps] : [];
    let locked = false;
    const touch = () => { setDraft(save, { chosen, taps }); commit(); };
    const area = h('div', { class: 'card' }, badge(q.id), h('p', { class: 'stem' }, b.stem));
    const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
    const finish = (ok: boolean, why: string) => {
      locked = true;
      setDraft(save, undefined);
      done(ok);
      commit();
      fb.replaceChildren(h('div', { class: ok ? 'ok' : 'bad' }, ok ? '✔ Correct' : '✘ Not quite'), h('p', {}, b.explanation), ...(why ? [h('p', { class: 'small' }, why)] : []), btn('Continue', () => show(), 'primary'));
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
      const svg = renderSchematic(bk, { onTap: (id) => { const k = taps.indexOf(id); if (k >= 0) taps.splice(k, 1); else taps.push(id); sel.textContent = 'Selected: ' + (taps.join(', ') || 'none'); touch(); } });
      const sel = h('div', { class: 'small' }, 'Tap the element on the schematic, then Check.');
      if (taps.length) sel.textContent = 'Selected: ' + taps.join(', ');
      area.append(h('div', { class: 'schem-wrap' }, svg), sel, btn('Check', check, 'primary'));
    } else if (b.format === 'order-steps') {
      const list = h('ol', { class: 'ordered' });
      const opts = h('div', { class: 'opts' });
      const redraw = () => {
        list.replaceChildren(...chosen.map((c) => h('li', {}, b.steps[c])));
        opts.replaceChildren(...p.options.filter((o) => !chosen.includes(o.index)).map((o) => btn(o.text, () => { if (!locked) { chosen.push(o.index); touch(); redraw(); } }, 'opt')), chosen.length ? btn('Undo last', () => { if (!locked) { chosen.pop(); touch(); redraw(); } }, 'small') : h('span'));
        if (chosen.length === b.steps.length) check();
      };
      area.append(h('p', { class: 'small' }, 'Tap the steps in the correct order.'), list, opts); redraw();
    } else {
      const opts = h('div', { class: 'opts' });
      if (b.format === 'identify-symbol' && b.symbol) area.append(h('div', { class: 'symbox' }, symbolFigure(b.symbol)));
      for (const o of p.options) {
        const el = h('button', { class: 'btn opt' + (chosen.includes(o.index) ? ' active' : ''), type: 'button', 'aria-pressed': String(chosen.includes(o.index)) }, o.text);
        el.addEventListener('click', () => {
          if (locked) return;
          if (p.multi) { const k = chosen.indexOf(o.index); if (k >= 0) chosen.splice(k, 1); else chosen.push(o.index); el.classList.toggle('active'); el.setAttribute('aria-pressed', String(k < 0)); touch(); }
          else { chosen.length = 0; chosen.push(o.index); touch(); check(); }
        });
        opts.append(el);
      }
      area.append(opts);
      if (p.multi) area.append(h('p', { class: 'small' }, 'Select all that apply.'), btn('Check', check, 'primary'));
    }
    shell(title, area, fb);
  }

  const showActivity = (): void => {
    if (extraRep) return go('wrap', 0);
    const sc = info?.activity ? byId(info.activity) : null;
    if (!sc) return go('wrap', 0);
    const ids = sess.faultIds;
    if (!sess.activityStarted) {
      layout?.showFreeBench();
      shell(sc.body.title, h('div', { class: 'card' }, badge(sc.id), h('ol', {}, ...sc.body.steps.map((s: string) => h('li', {}, s)))), btn(ids.length ? 'Start work order' : 'Open the bucket', () => { patchSession(save, { activityStarted: true, activitySubmitted: false, index: 0 }); commit(); show(); }, 'primary'));
      return;
    }
    if (layout) {
      shell(sc.body.title, h('div', { class: 'card' }, badge(sc.id), h('p', {}, 'The work-order bucket is in the pane beside this card. Diagnose and submit there.'), h('ol', {}, ...sc.body.steps.map((s: string) => h('li', {}, s)))));
    }
    runFaults(ids, sess.index, sc);
  };

  const runFaults = (ids: string[], i: number, sc: any) => {
    const isLoto = day === 2;
    const def = ids.length ? defs.find((d) => d.id === ids[i]) ?? null : null;
    const item = def ? faults().find((f) => f.body.engineId === def.id) : null;
    let submitted = sess.activitySubmitted || !def;
    const last = i + 1 >= ids.length;
    if (layout) layout.noteActivity();
    mountBucket(layout?.bucket ?? root, {
      fault: def, minMeasurements: item?.body.minMeasurements ?? 1, showLoto: isLoto || !!def, troubleshoot: !!def, title: `${sc.body.title}${ids.length > 1 ? ` (${i + 1}/${ids.length})` : ''}`,
      footer: () => (submitted ? btn(!last && def ? 'Next work order' : 'Finish activity', () => {
        if (!last && def) { patchSession(save, { index: i + 1, activitySubmitted: false }); commit(); show(); return; }
        if (!def) { addXp(save, XP.activity); commit(); }
        if (day === 10 && sess.passes >= 2) { save.commissioningPassed = true; commit(); }
        go('wrap', 0);
      }, 'primary') : null),
      onFinish: (r) => {
        if (r.score && def) {
          save.tickets.push({ faultId: def.id, date: today, score: r.score.total, passed: r.score.passed });
          addXp(save, r.score.xp - XP.safetyViolation * r.score.violations.length);
          save.safetyViolations += r.score.violations.length;
          if (r.score.passed) patchSession(save, { passes: sess.passes + 1 });
        }
        submitted = true;
        patchSession(save, { activitySubmitted: true });
        commit();
      },
    });
  };

  const showWrap = (): void => {
    layout?.showFreeBench();
    if (!sess.completed) {
      if (!extraRep) { save.completedDays[String(day)] = { date: today, score: sess.stats.total ? Math.round((100 * sess.stats.right) / sess.stats.total) : 0 }; addXp(save, XP.activity); }
      if (!save.activity.includes(today)) save.activity.push(today);
      patchSession(save, { phase: 'wrap', completed: true });
      commit();
    }
    const st = streak(save.activity, save.settings.days, today);
    const unitDone = Object.entries(unitDays).filter(([, ds]) => ds.every((d) => save.completedDays[String(d)])).map(([u]) => u);
    shell('Wrap-up', h('div', { class: 'card' },
      h('p', {}, `Practice: ${sess.stats.right}/${sess.stats.total} correct`), h('p', {}, `XP total: ${save.xp}`), h('p', {}, `Streak: ${st} scheduled day${st === 1 ? '' : 's'}`),
      h('p', {}, `Rank: ${RANK_TITLE[rank(save)]}`), unitDone.length ? h('p', { class: 'small' }, `Book units completed: ${unitDone.join(', ')}`) : null,
      day === 10 && save.commissioningPassed ? h('p', { class: 'ok' }, 'Commissioning check passed. Act 1 complete.') : day === 10 ? h('p', { class: 'bad' }, 'Commissioning not passed yet: you need 2 of 3 faults diagnosed safely. Try again from Home.') : null,
      h('p', { class: 'field' }, h('strong', {}, 'Takeaway: '), info?.focus ?? '')),
    h('div', { class: 'row' }, btn('Done', () => { clearSession(save); commit(); exit(); }, 'primary'), btn('Extra rep', () => { clearSession(save); commit(); runSession(root, day, exit, true); })));
  };

  show();
}
