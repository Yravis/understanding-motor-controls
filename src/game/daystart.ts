// Builds the in-progress session for a day (due reviews, question list, fault list). No DOM: shared by the shell and the tests.
import type { Save } from './save';
import { openSession, type InProgressSession } from './session';
import { cardsForDay, questionsForDay, byId, dayInfo, ofType, params } from '../content';
import { dueIds } from './progress';
import { faultDefs } from '../model/faults';
import { Rng } from '../model/rng';

export function planDay(save: Save, day: number, extraRep: boolean, today: string) {
  const info = dayInfo(day);
  const seed = day * 1000 + Number(today.replace(/-/g, '')) % 1000;
  const due = extraRep ? [] : dueIds(save, today).filter((id) => byId(id)).slice(0, 5);
  const cards = cardsForDay(day);
  const pool = extraRep ? ofType('question').filter((q) => (save.completedDays[String(q.body.day)] || q.body.day <= day)) : questionsForDay(day);
  const questions = extraRep ? [...pool].sort(() => new Rng(seed + pool.length).next() - 0.5).slice(0, 6) : [...pool];
  const defs = faultDefs(params);
  const pickFaults = (n: number, allowed?: string[]): string[] => {
    const r = new Rng(seed);
    const poolIds = defs.filter((d) => d.id !== 'foreign-voltage-bucket-off' && (!allowed || allowed.includes(d.id))).map((d) => d.id);
    const out: string[] = [];
    while (out.length < Math.min(n, poolIds.length)) { const x = r.pick(poolIds); if (!out.includes(x)) out.push(x); }
    return out;
  };
  const sc = info?.activity ? byId(info.activity) : null;
  let faultIds: string[] = [];
  if (sc) {
    let ids: string[] = sc.body.faults ?? [];
    if (day === 9) ids = pickFaults(2, defs.slice(0, 11).map((d) => d.id));
    if (day === 10) ids = pickFaults(3);
    else if (ids.length && day < 9) ids = [ids[0]];
    faultIds = ids;
  }
  return { info, seed, due, cards, questions, faultIds, scenario: sc };
}

/** Open (or resume) the session for a day. An open session is never replaced (see openSession). */
export function startSession(save: Save, day: number, extraRep: boolean, today: string): InProgressSession {
  const p = planDay(save, day, extraRep, today);
  return openSession(save, { day, extraRep, date: today, warmIds: p.due, questionIds: p.questions.map((q) => q.id), faultIds: p.faultIds, cardCount: p.cards.length });
}
