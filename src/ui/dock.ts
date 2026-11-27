// Right-hand tab dock: Work order | Lesson | Schematic | LOTO | Log. Panes are rebuilt from state, never hold state of their own,
// so switching tabs (or views, or reloading) cannot lose anything.
import { h, btn } from './dom';
import { symbolFigure } from './symbols';
import { renderSchematic } from './schematic';
import { renderQuestion } from './questionview';
import { badgeOf, byId } from '../content';
import { DOCK_TABS, setDraft, type DockTab } from '../game/session';
import { warmCardAnswered, warmQuestionGraded, afterWarm, afterCards, practiceGraded, afterPractice, goPhase } from '../game/flow';
import { streak, rank, RANK_TITLE, unitDays } from '../game/progress';
import { isNativeDay, type StepDef, type StepId, TOUR_DEVICES, isStepDone, type StepCtx } from '../game/steps';
import type { Save } from '../game/save';
import type { InProgressSession, DayUi } from '../game/session';
import type { Bucket } from '../model/bucket';
import type { planDay } from '../game/daystart';

const TAB_LABEL: Record<DockTab, string> = { work: 'Work order', lesson: 'Lesson', schem: 'Schematic', loto: 'LOTO', log: 'Log' };
const badge = (id: string) => (badgeOf.get(id) ? h('span', { class: 'badge unrev' }, badgeOf.get(id)!) : null);
export const ILLUSTRATIVE = 'illustrative - pending review';
const illus = () => h('span', { class: 'ds-illus', title: 'This value is invented for the model and has not been reviewed yet' }, ILLUSTRATIVE);

export interface DockApi {
  save: Save; session: InProgressSession; ui: DayUi; day: number; today: string;
  plan: ReturnType<typeof planDay>;
  steps: StepDef[]; current: () => StepDef | null; ctx: () => StepCtx;
  bucket: () => Bucket;
  hl: () => string | null; setHl: (n: string | null) => void;
  commit: () => void;
  /** Re-render everything outside the dock (strip, status bar, coach, bucket) after a state change made inside the dock. */
  refresh: () => void;
  finish: () => void;           // wrap the day (completes it)
  startActivity: () => void;    // classic work order
  endSession: (extra: boolean) => void;
  classicActive: () => boolean;
  tapInfo: (text: string) => void;
}

export interface Dock { el: HTMLElement; render(): void; /** After a bucket event: refresh tabs and every pane except Lesson (a question mid-answer must not be rebuilt). */ soft(): void }

export function createDock(api: DockApi): Dock {
  const tabs = h('nav', { class: 'ds-tabs', role: 'tablist', 'aria-label': 'Day panels' });
  const pane = h('div', { class: 'ds-pane', role: 'tabpanel' });
  const el = h('aside', { class: 'ds-dock', 'aria-label': 'Day panels' }, tabs, pane);

  const sel = (t: DockTab) => { api.ui.tab = t; api.commit(); render(); };
  const attention = (t: DockTab): boolean => (t === 'lesson' && ['warm', 'lesson', 'practice'].includes(api.session.phase) && api.ui.tab !== 'lesson');

  function renderTabs(): void {
    tabs.replaceChildren(...DOCK_TABS.map((t) => h('button', { class: 'ds-tab' + (api.ui.tab === t ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(api.ui.tab === t), 'data-tab': t, onclick: () => sel(t) }, TAB_LABEL[t], attention(t) ? h('span', { class: 'ds-dotc', 'aria-label': 'needs you' }) : null)));
  }
  function render(): void {
    renderTabs();
    const body = api.ui.tab === 'work' ? workPane() : api.ui.tab === 'lesson' ? lessonPane() : api.ui.tab === 'schem' ? schemPane() : api.ui.tab === 'loto' ? lotoPane() : logPane();
    pane.dataset.pane = api.ui.tab;
    pane.replaceChildren(body);
  }

  // ---------------------------------------------------------------- Work order
  function workPane(): HTMLElement {
    const s = api.session, info = api.plan.info, sc = api.plan.scenario;
    const out = h('div', {});
    if (s.phase === 'wrap' || s.completed) return wrapPane();
    out.append(h('h2', {}, sc?.body.title ?? (s.extraRep ? 'Extra rep' : `Day ${api.day}`)), h('div', { class: 'ds-sub' }, `Day ${api.day} · ${info?.focus ?? ''}`));
    const bd = sc ? badge(sc.id) : null;
    if (bd) out.append(bd);
    if (sc?.claim) out.append(h('p', { class: 'ds-lead' }, sc.claim));
    out.append(h('h3', {}, 'Steps'));
    const c = api.ctx();
    for (const st of api.steps) {
      const done = isStepDone(st.id, c), now = api.current()?.id === st.id;
      out.append(h('div', { class: 'ds-chk' + (done ? ' ok' : '') + (now ? ' now' : ''), 'data-step': st.id }, h('i', {}, done ? '✓' : ''), h('span', {}, `${st.label}: ${st.instruction}`)));
      if (now && isNativeDay(api.day)) for (const sub of subChecks(st.id)) out.append(h('div', { class: 'ds-chk sub' + (sub.ok ? ' ok' : '') }, h('i', {}, sub.ok ? '✓' : ''), h('span', {}, sub.text), ...(sub.v ? [h('span', { class: 'v' }, sub.v)] : [])));
    }
    if (sc?.body.steps?.length) out.append(h('h3', {}, 'The work order says'), h('ol', { class: 'ds-ol' }, ...sc.body.steps.map((x: string) => h('li', {}, x))));
    if (!isNativeDay(api.day) && sc && s.phase === 'activity' && !s.activityStarted) out.append(btn(api.plan.faultIds.length ? 'Start work order' : 'Open the bucket', () => api.startActivity(), 'primary'));
    out.append(h('h3', {}, 'The bucket'),
      h('dl', { class: 'ds-dl' },
        h('dt', {}, 'Control source'), h('dd', {}, '120 V between X1 and X2 (control transformer CPT); X2 is bonded to ground'),
        h('dt', {}, 'Protection'), h('dd', {}, 'Fuse F1 in the X1 conductor', ' ', illus()),
        h('dt', {}, 'Second source'), h('dd', {}, 'Wires 91/92 (orange) come from another panel, "RP-2"', ' ', illus(), h('div', { class: 'ds-note-s' }, 'They stay live with this handle OFF.')),
        h('dt', {}, 'Power section'), h('dd', {}, 'Shown greyed. Taught in Chapter 2.')));
    out.append(h('div', { class: 'ds-note' }, h('b', {}, 'Always follow your employer’s procedure. '), 'Example procedure (standard OSHA 1910.147 + NFPA 70E 2024). Always follow your employer’s lockout/tagout procedure.'));
    return out;
  }
  function subChecks(id: StepId): { text: string; ok: boolean; v?: string }[] {
    const u = api.ui;
    if (id === 'tour') return [{ text: 'Open the door (handle OFF first)', ok: u.doorOpened }, ...TOUR_DEVICES.map((t) => ({ text: `Read the nameplate of ${t}`, ok: u.inspected.includes(t) }))];
    if (id === 'sources') return [{ text: 'Wire 91 (orange)', ok: u.found.includes('w91') }, { text: 'Wire 92 (orange)', ok: u.found.includes('w92') }, { text: 'Caution label on the door', ok: u.found.includes('label') }];
    if (id === 'meter') return [{ text: 'Bucket live (handle ON, door open)', ok: u.handleOn && u.doorOpen }, { text: 'Meter on VAC', ok: u.meter.mode === 'VAC' }, { text: 'Read X1 to X2', ok: u.proved }];
    return [];
  }

  function wrapPane(): HTMLElement {
    const s = api.session, save = api.save;
    const st = streak(save.activity, save.settings.days, api.today);
    const unitDone = Object.entries(unitDays).filter(([, ds]) => ds.every((d) => save.completedDays[String(d)])).map(([u]) => u);
    return h('div', {}, h('h2', {}, 'Wrap-up'), h('div', { class: 'ds-sub' }, `Day ${api.day} · ${api.plan.info?.focus ?? ''}`),
      h('div', { class: 'card' },
        h('p', {}, `Practice: ${s.stats.right}/${s.stats.total} correct`), h('p', {}, `XP total: ${save.xp}`), h('p', {}, `Streak: ${st} scheduled day${st === 1 ? '' : 's'}`),
        h('p', {}, `Rank: ${RANK_TITLE[rank(save)]}`), unitDone.length ? h('p', { class: 'small' }, `Book units completed: ${unitDone.join(', ')}`) : null,
        api.day === 10 && save.commissioningPassed ? h('p', { class: 'ok' }, 'Commissioning check passed. Act 1 complete.') : api.day === 10 ? h('p', { class: 'bad' }, 'Commissioning not passed yet: you need 2 of 3 faults diagnosed safely. Try again from Home.') : null,
        h('p', { class: 'field' }, h('strong', {}, 'Takeaway: '), api.plan.info?.focus ?? '')),
      h('div', { class: 'row' }, btn('Done', () => api.endSession(false), 'primary'), btn('Extra rep', () => api.endSession(true))));
  }

  // ---------------------------------------------------------------- Lesson & questions
  function lessonPane(): HTMLElement {
    const s = api.session, cards = api.plan.cards, save = api.save, today = api.today;
    const fctx = () => ({ save, today, cardCount: cards.length, hasScenario: !!api.plan.scenario });
    const after = () => { advance(); api.commit(); api.refresh(); render(); };
    const qs = s.questionIds.map((id) => byId(id)).filter(Boolean);
    /** Phase transitions that fall due (end of warm-ups / cards / practice). Idempotent. */
    function advance(): void {
      for (let n = 0; n < 4; n++) {
        const cur = api.session;
        if (cur.phase === 'warm' && (!cur.warmIds.length || cur.index >= cur.warmIds.length)) afterWarm(fctx());
        else if (cur.phase === 'lesson' && cur.index >= cards.length) afterCards(fctx());
        else if (cur.phase === 'practice' && cur.index >= qs.length) afterPractice(fctx());
        else break;
      }
    }
    advance(); api.commit();
    const out = h('div', {});
    const chips = cards.length && !s.extraRep ? h('div', { class: 'ds-chips' }, ...cards.map((c, i) => { const passed = s.phase !== 'warm' && s.phase !== 'lesson' || (s.phase === 'lesson' && i < s.index); const now = s.phase === 'lesson' && i === s.index; return h('span', { class: passed ? 'ok' : now ? 'on' : '' }, c.body.title); })) : null;
    if (chips) out.append(chips);

    if (s.phase === 'warm') {
      const i = s.index, it = byId(s.warmIds[i]);
      out.append(h('h3', {}, `Warm-up review ${i + 1}/${s.warmIds.length}`));
      if (it.type === 'question') {
        out.append(renderQuestion({ q: it, seed: api.plan.seed, draft: s.draft, onDraft: (d) => { setDraft(save, d); api.commit(); }, onGraded: (ok) => { setDraft(save, undefined); warmQuestionGraded(save, it.id, ok, today); api.commit(); }, onContinue: after }));
      } else {
        out.append(h('div', { class: 'card' }, h('strong', {}, it.body.title), h('p', {}, it.body.text), h('p', { class: 'small' }, 'Did you still remember this?')),
          h('div', { class: 'row' }, btn('Got it', () => { warmCardAnswered(save, it.id, true, today); after(); }, 'primary'), btn('Review again soon', () => { warmCardAnswered(save, it.id, false, today); after(); })));
      }
      return out;
    }
    if (s.phase === 'lesson') {
      const i = s.index, c = cards[i];
      const pg = save.settings.bookFree ? '' : ` · book p. ${c.book.page} (TOC, unverified)`;
      out.append(h('div', { class: 'card' }, badge(c.id), h('div', { class: 'ds-sub' }, `Section ${c.book.section}${pg} · card ${i + 1} of ${cards.length}`), h('h2', {}, c.body.title),
        c.body.loto ? h('p', { class: 'banner' }, 'Example procedure (standard OSHA 1910.147 + NFPA 70E 2024). Always follow your employer’s lockout/tagout procedure.') : null,
        h('p', {}, c.body.text), h('div', { class: 'ds-note' }, h('b', {}, 'In the field: '), c.body.fieldNote),
        c.body.symbol ? h('div', { class: 'symbox' }, symbolFigure(c.body.symbol.key, c.body.symbol.designation), h('p', { class: 'small' }, h('strong', {}, 'NEMA: '), `${c.body.symbol.designation}. ${c.body.symbol.nemaNote}`), h('p', { class: 'small iec' }, h('strong', {}, 'IEC side note: '), c.body.symbol.iecNote)) : null),
        save.settings.bookFree ? h('p', { class: 'small' }, 'Book not here yet? These summaries stand alone.') : h('p', { class: 'small' }, `Read book section ${c.book.section} first.`),
        h('div', { class: 'row' }, i > 0 ? btn('Back', () => { goPhase(save, 'lesson', i - 1); after(); }) : null, btn(i === cards.length - 1 ? 'Start practice' : 'Next card', () => { goPhase(save, 'lesson', i + 1); after(); }, 'primary')));
      return out;
    }
    if (s.phase === 'practice') {
      const i = s.index, q = qs[i];
      out.append(h('h3', {}, `Practice · question ${i + 1} of ${qs.length}`),
        renderQuestion({ q, seed: api.plan.seed, draft: s.draft, onDraft: (d) => { setDraft(save, d); api.commit(); }, onGraded: (ok) => { setDraft(save, undefined); practiceGraded(save, q, ok, today); api.commit(); }, onContinue: after }),
        h('div', { class: 'ds-sub' }, 'Answering here never leaves the bucket. Your place is saved.'));
      return out;
    }
    // activity / wrap: the cards stay readable
    out.append(h('div', { class: 'ds-sub' }, s.phase === 'wrap' ? 'Day complete. The cards stay here to re-read.' : 'Questions are done for today. The cards stay here to re-read.'));
    for (const c of cards) out.append(h('details', { class: 'card' }, h('summary', {}, c.body.title), badge(c.id), h('p', {}, c.body.text), h('p', { class: 'field' }, h('strong', {}, 'In the field: '), c.body.fieldNote)));
    if (!cards.length) out.append(h('p', {}, 'No lesson cards for this day.'));
    return out;
  }

  // ---------------------------------------------------------------- Schematic
  function schemPane(): HTMLElement {
    const b = api.bucket();
    const live = b.world.lit('PL2') || b.world.lit('PL3');
    const svg = renderSchematic(b, {
      highlightNet: api.hl(),
      onNet: (n) => { api.setHl(api.hl() === n ? null : n); },
      onTap: (id) => { const e = b.world.el<any>(id); api.tapInfo(`${id}: ${e.kind}${e.kind === 'contact' ? ' is ' + (b.world.contactClosed(e) ? 'CLOSED' : 'OPEN') : ''}`); },
    });
    return h('div', {}, h('h2', {}, 'Schematic · live state'),
      h('div', { class: 'ds-sub' }, `Same circuit as the bucket. ${live ? 'Bucket is live: lit lamps and closed contacts follow the model.' : 'Handle OFF: only the orange 91/92 lamp stays lit.'} Tap a wire number to highlight it on the bucket.`),
      h('div', { class: 'ds-legend' }, h('span', {}, h('i', { style: 'background:#e87d00' }), 'Orange: remote-source circuit (91/92)'), h('span', {}, h('i', { style: 'background:#1f4e79' }), 'Wire numbers (tap to highlight)')),
      h('div', { class: 'schem-wrap' }, svg));
  }

  // ---------------------------------------------------------------- LOTO
  function lotoPane(): HTMLElement {
    const day1 = api.day < 2;
    return h('div', {}, h('h2', {}, 'Lockout / tagout'), h('div', { class: 'ds-sub' }, 'Example procedure · always follow your employer’s procedure'),
      h('p', { class: 'banner' }, 'Example procedure (standard OSHA 1910.147 + NFPA 70E 2024). Always follow your employer’s lockout/tagout procedure.'),
      day1 ? h('div', { class: 'card ds-stub' }, h('strong', {}, 'Day 2'), h('p', {}, 'The lockout card is taught on Day 2. For now, notice how the bucket changes when you switch the state to "Locked out" in the bar above the bucket: the handle goes OFF, a lock and tag appear, X1-X2 reads 0.0 V, and the orange 91/92 circuit is still live.'))
        : h('div', { class: 'card' }, h('p', {}, 'The interactive lockout sheet (identify, isolate, lock, tag, verify, test absence of voltage) is part of the work order bench.'), api.classicActive() ? h('p', { class: 'small' }, 'It is open in the bench panel next to this dock.') : h('p', { class: 'small' }, 'Open the work order (Work order tab), or use "Classic bench" above the bucket.')));
  }

  // ---------------------------------------------------------------- Log
  function logPane(): HTMLElement {
    const log = api.ui.log;
    if (!log.length) return h('div', { class: 'ds-log' }, h('h2', {}, 'Log'), h('p', { class: 'ds-sub' }, 'Nothing yet. Everything you do on the bucket is noted here.'));
    return h('div', { class: 'ds-log' }, h('h2', {}, 'Log'), ...log.slice().reverse().map((e) => {
      const d = new Date(e.t);
      return h('div', { class: 'e ' + e.kind }, h('span', { class: 'tm' }, `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`), h('span', {}, h('span', { class: 'tag' }, e.kind === 'ok' ? 'OK' : e.kind === 'warn' ? 'NOTE' : 'DID'), e.text));
    }));
  }

  render();
  return { el, render, soft() { if (api.ui.tab === 'lesson') renderTabs(); else render(); } };
}
