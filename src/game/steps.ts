// The day as a list of steps. Pure data + predicates (no DOM), so the shell, the coach and the tests share one definition.
// Day 1 is "native": its Tour / Find sources / Prove meter steps run on the new bucket. Every other day maps its existing
// flow into Read -> Practice -> Work order, with the work order using the classic bench panel (faults, LOTO sheet, repair).
import type { DayUi, InProgressSession } from './session';

export const NATIVE_BUCKET_DAYS = [1];
export const isNativeDay = (day: number): boolean => NATIVE_BUCKET_DAYS.includes(day);

export type StepId = 'read' | 'practice' | 'activity' | 'tour' | 'sources' | 'meter';
export interface StepDef { id: StepId; label: string; instruction: string; why: string; hint: string }

const S: Record<StepId, StepDef> = {
  read: { id: 'read', label: 'Read', instruction: 'Read the lesson cards, then answer the questions in the Lesson tab.', why: 'Cards first, then questions: you get the idea before you are asked about it.', hint: 'Open the Lesson tab on the right. Your place is saved if you leave.' },
  practice: { id: 'practice', label: 'Practice', instruction: 'Answer the practice questions in the Lesson tab.', why: 'Short questions after the cards lock the ideas in.', hint: 'Pick an answer; the explanation shows right after.' },
  activity: { id: 'activity', label: 'Work order', instruction: 'Do the work order in the bench panel, then submit it.', why: 'This is the hands-on part of the day.', hint: 'Use the meter and the controls in the bench; the Work order tab lists the steps.' },
  tour: { id: 'tour', label: 'Tour', instruction: 'Turn the handle OFF, open the door, then tap each device to read its nameplate.', why: 'The door only opens with the handle OFF (the interlock). Knowing what each part is comes before measuring anything.', hint: 'Tap the red handle, then the door latch. Then tap the pulsing device.' },
  sources: { id: 'sources', label: 'Find sources', instruction: 'Find the orange wires 91 and 92 on the terminal strip, and the caution label on the door.', why: 'A bucket can hold more than one energy source. The orange 91/92 circuit comes from another panel and stays live with this handle OFF.', hint: 'Tap terminals 91 and 92 on TB1, and tap the orange caution label on the door.' },
  meter: { id: 'meter', label: 'Prove meter', instruction: 'Set the meter to VAC, turn the handle ON, and read X1 to X2 on the live bucket.', why: 'You prove the meter on a known source before you trust it to say "dead".', hint: 'Turn the handle ON (door stays open for the test), set VAC, tap X1 then X2.' },
};

export interface DayShape { extraRep: boolean; hasActivity: boolean }
export function stepsForDay(day: number, o: DayShape): StepDef[] {
  if (o.extraRep) return [S.practice];
  if (isNativeDay(day)) return [S.read, S.tour, S.sources, S.meter];
  return o.hasActivity ? [S.read, S.practice, S.activity] : [S.read, S.practice];
}

/** Devices whose nameplate the Tour requires (the rest are still tappable). */
export const TOUR_DEVICES = ['CPT', 'F1', 'CR1', 'TB1', 'PB1', 'PB2', 'PB3', 'PL1', 'PL2', 'PL3', 'PLF'] as const;
export const SOURCE_FINDS = ['w91', 'w92', 'label'] as const;

export interface StepCtx { session: InProgressSession; ui: DayUi; day: number; activityDone: boolean }
const past = (s: InProgressSession, ...ph: InProgressSession['phase'][]) => ph.includes(s.phase);

/** Raw predicate: is the work of this step complete right now? */
export function stepSatisfied(id: StepId, c: StepCtx): boolean {
  const { session: s, ui } = c;
  switch (id) {
    case 'read': return isNativeDay(c.day) ? past(s, 'activity', 'wrap') : past(s, 'practice', 'activity', 'wrap');
    case 'practice': return past(s, 'activity', 'wrap');
    case 'activity': return c.activityDone || s.completed || s.phase === 'wrap';
    case 'tour': return ui.doorOpened && TOUR_DEVICES.every((t) => ui.inspected.includes(t));
    case 'sources': return SOURCE_FINDS.every((f) => ui.found.includes(f));
    case 'meter': return ui.proved;
  }
}
export const isStepDone = (id: StepId, c: StepCtx): boolean => c.ui.done.includes(id) || stepSatisfied(id, c);

/** First not-done step, or null once every step is done (the day is ready to finish). Steps are strictly ordered. */
export function currentStep(steps: StepDef[], c: StepCtx): StepDef | null {
  return steps.find((st) => !isStepDone(st.id, c)) ?? null;
}
/** Latch finished steps into ui.done (a step stays done even if the bucket state later changes). Returns true if anything changed. */
export function latchDone(steps: StepDef[], c: StepCtx): boolean {
  let changed = false;
  for (const st of steps) {
    if (!c.ui.done.includes(st.id) && stepSatisfied(st.id, c)) { c.ui.done.push(st.id); changed = true; }
    if (!c.ui.done.includes(st.id)) break; // later steps stay locked until earlier ones are done
  }
  return changed;
}

/** Progress counters shown in the strip / status bar for the current step. */
export function stepCounts(id: StepId, c: StepCtx): { done: number; total: number; noun: string } {
  const { ui } = c;
  switch (id) {
    case 'tour': return { done: TOUR_DEVICES.filter((t) => ui.inspected.includes(t)).length + (ui.doorOpened ? 1 : 0), total: TOUR_DEVICES.length + 1, noun: 'tour checks' };
    case 'sources': return { done: SOURCE_FINDS.filter((f) => ui.found.includes(f)).length, total: SOURCE_FINDS.length, noun: 'sources found' };
    case 'meter': return { done: ui.proved ? 1 : 0, total: 1, noun: 'meter proved' };
    case 'read': case 'practice': return { done: Math.min(c.session.index, c.session.questionIds.length), total: c.session.questionIds.length, noun: 'questions' };
    case 'activity': return { done: c.activityDone ? 1 : 0, total: 1, noun: 'work order' };
  }
}

/** What the current step wants touched next. 'term:ID' | 'dev:TAG' | 'handle' | 'door' | 'label' | 'meter-mode' | null. */
export function nextTarget(id: StepId | null, ui: DayUi): string | null {
  if (!id) return null;
  if (id === 'tour') {
    if (!ui.doorOpen && !ui.doorOpened) return ui.handleOn ? 'handle' : 'door';
    const next = TOUR_DEVICES.find((t) => !ui.inspected.includes(t));
    return next ? (ui.doorOpen ? 'dev:' + next : 'door') : null;
  }
  if (id === 'sources') {
    if (!ui.doorOpen) return 'door';
    if (!ui.found.includes('w91')) return 'term:w91';
    if (!ui.found.includes('w92')) return 'term:w92';
    if (!ui.found.includes('label')) return 'label';
    return null;
  }
  if (id === 'meter') {
    if (!ui.doorOpen) return 'door';
    if (!ui.handleOn) return 'handle';
    if (ui.meter.mode !== 'VAC') return 'meter-mode';
    if (!ui.meter.red) return 'term:X1@CPT_X1';
    if (!ui.meter.black) return ui.meter.red === 'X1' ? 'term:X2@CPT_X2' : 'term:X1@CPT_X1';
    return null;
  }
  return null;
}

/** Parts the learner has not been taught yet (greyed, with a small label). Chapter 2 power parts stay grey for all of Act 1. */
export function untaught(day: number): Record<string, string> {
  const d = day > 0 ? day : 10;
  const out: Record<string, string> = {};
  for (const t of ['DISC', 'PF', 'M', 'OL', 'MTR']) out[t] = 'Chapter 2';
  if (d < 8) for (const t of ['TR1', 'TR2', 'TD3', 'TD4', 'PL8', 'PL9', 'PL10', 'PL11']) out[t] = 'Day 8';
  return out;
}
