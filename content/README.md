# Content authoring guide (Chapter 1)

Original wording only. The Holt textbook is NOT available: summaries are keyed to the book's section titles
(see `content/manifest.yaml` `sections`). Never quote the book, never invent page numbers, datasheet values or code text.
Correctness beats coverage. If unsure, leave it out or phrase conservatively and say so in `reviewerNotes`.

## File shape
Each YAML file is `defaults: &d {...}` + `items:` and each item starts with `<<: *d` (see `content/ch01/devices.yaml`).
Defaults for lessons/questions:
```yaml
defaults: &d
  version: 1
  nec: []
  nema: []
  ieee: []
  excerpts: []
  basis: general-knowledge
  enforcedNote: null
  other: []
  bookAlignment: provisional
  reviewerNotes: "..."
```
Every item needs: `id` (`ch01.u{unit}.s{sec-dashed}.{card|symbol|question|activity|fault}.{slug}`, e.g. `ch01.u3.s3-2.card.relay-coil-vs-contacts`), `type` (`lessonCard` or `question`),
`book: {chapter: 1, unit, section: "3.2", page: <TOC start page of that section>, pageStatus: toc-unverified, figure: null}`, `claim` (one plain sentence a reviewer can check), `body`.
Cards: `body: {title, text, fieldNote, terms: [...], day}`. `text` 60-140 words. Symbol cards add `body.symbol: {key, designation, nemaNote, iecNote}`
and set `nema: [{std: "NEMA ICS 19", clause: null, note: "symbols"}]`, `ieee: [{std: "IEEE 315", clause: null}]` (these become blocked-on-source automatically).
NEMA symbols primary; `iecNote` = "IEC: you may also see ..." (only state IEC facts you are sure of; designations like KM/SB are fine only if you are certain).
Questions: see `src/content/schema.ts` (`questionBody`). Correct answer FIRST with `correct: true`; every wrong answer has `distractorWhy`;
3-5 answers; no "all/none of the above"; answers unique; the correct answer must NOT be systematically the longest (make distractors similar length/detail);
`explanation` teaches the why. Formats: mcq, multi-select (2+ correct first), identify-symbol (`symbol` key), tap-schematic (`tapTargets` = element ids like `PB1.c`, `CR1.NO1`, `PL1`),
order-steps (`steps` in correct order), predict-state (`scene` with actions + `expect`, machine-checked against the simulator; answers are mcq about lamp/relay states).
`day` = the day (1-10) the item belongs to (see manifest). Mix formats: roughly 55% mcq, 10% multi-select, 10% identify-symbol/tap, 10% order-steps, 15% predict-state.

## Hard rules
* No NEC / NEMA-clause / OSHA / 70E *text* claims. Teach the concepts. (If you must reference one, put it in `nec:` etc. and say so in `reviewerNotes`; it will be marked blocked-on-source. Prefer none.)
* No graded question may depend on a typical/illustrative device number (coil VA, pickup %, timer accuracy, meter impedance, resistances). Qualitative facts are fine
  ("a voltmeter across an open contact in series with a load reads about source voltage", "across a closed contact about 0 V", "ohmmeter only on de-energized, isolated circuits").
  Numbers inside a question must come from the stem itself (e.g. "preset 5 s", "a 120 V coil"). Never write numeric meter readings as answers unless derivable from stated values.
* "Normal" = de-energized / shelf (as-manufactured) state. Float/pressure/etc. "normal" is not "as installed in an empty tank".
* Bucket facts (reference circuit, see `src/model/bucket.ts`): 120 V X1/X2, wire 1 = X1 rail, wire 2 = X2 rail; PB3 mushroom NC maintained + PB1 NO START in series -> CR1 coil;
  CR1 NO1->PL1 green, CR1 NC1->PL2 red, PB2 NC->PL3, FS1 float NO->PL4, PS1->PL5, TS1->PL6, LS1 NC->SOL1, FLS1->PL7, CR1 NO2->TR1(on-delay pneumatic)/TR2(off-delay pneumatic)/TD3(SS on-delay)/TD4(SS off-delay, constant supply on wire 1, trigger wire 13); PLF remote interlock (orange, foreign source, live with bucket off).
  Contacts sit on the X1 side; coils/loads connect directly to X2.
* Safety: never teach or reward unsafe practice. LOTO is framed "example procedure - always follow your employer's procedure". Items about LOTO/test-for-absence: add `userSignoff: approved` + `userSignoffDate` (user approved the standard OSHA + 70E 2024 approach on 2026-11-26),
  `other: [{src: "osha:1910.147(d)"}, {src: "nfpa70e-2024:test-for-absence"}]` and card `body.loto: true`.
* Banned: "all of the above", "none of the above", "both of the above", "as the book says", "Mike Holt".
* Timers: on-delay (NOTC/NCTO): timing starts on energize, resets if coil drops before preset. Off-delay (NOTO/NCTC): contacts transfer immediately on energize, timing starts on de-energize, re-energize during timing resets.
  Solid-state off-delay needs constant supply + separate trigger; supply loss drops the output immediately.
* Validate with `npx vitest run tests/content.test.ts` (schema, ids, banned phrases, answer lint). Fix every failure.
