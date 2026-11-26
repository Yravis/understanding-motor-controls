# Understanding Motor Controls

Live: https://yravis.github.io/understanding-motor-controls/ (symbol gallery for review: `#symbols`)

A phone-first study game for apprentice electricians working through Mike Holt's *Understanding Basic Motor Controls*
(Revised Ed.), **Chapter 1 (Act 1: Units 1-3)**. It is a job-site career, not an RPG: each session is a **work order** from
the foreman, you rank up from Apprentice 1st year to Journeyman-ready as you finish book units, and every fault you solve goes
in your trouble-ticket log. Vite + vanilla TypeScript PWA, works offline, no backend.

> Status: **play-test build.** All content is original, written without the book, and has **not been reviewed**. See "SHOW_UNREVIEWED" below.

## How to play
1. Open the app on your phone (GitHub Pages, base path `/understanding-motor-controls/`) and "Add to Home Screen".
2. **Work order tab:** start the next day. Each day (30-45 min): warm-up spaced review (1/3/7/14/30 days) -> lesson cards (read the cited book section first once you have the book; until then "Book not here yet? These summaries stand alone") -> practice (8-12 original questions, mixed formats) -> bucket activity -> wrap-up. "Extra rep" gives optional extra practice.
3. **Bucket tab / activities:** a generic MCC bucket ("1A", control section) with a 120 V control source (X1/X2), terminal strip, pushbuttons, relay CR1, LED pilot lights, float/pressure/temperature/limit/flow switches, solenoid valve, pneumatic and solid-state timers, and an orange **foreign-voltage interlock circuit** that stays live with the bucket off. Disconnect, power fuses, starter, overload relay and motor are shown greyed out as a **Chapter 2 preview**.
   Tap a terminal for the red probe, another for the black probe; the docked meter (V AC, LoZ, V DC, Ω, continuity) reads from the same circuit model as everything else. Toggle Physical / Schematic; tap a wire number to highlight it in both. Undo reverts your last action. Ohmmeter on an energized circuit is an invalid reading and a safety strike.
4. **Troubleshooting:** read the symptom, lock out (example procedure with live-dead-live on X1-X2, X1-G, X2-G and the foreign terminals), measure, mark the root cause, replace/repair, test behavior, submit. Safety violations cost more than wrong answers; replacing good parts is penalized.
5. Schedule: pick your 5 days in Settings (default Mon-Fri). Streaks count only scheduled days. Progress exports/imports as a JSON file or a pasted code.
Day 10 is the commissioning check (3 random faults; pass 2 safely) and completes Act 1.

## How content review works
Content lives in `content/` (YAML, compiled at build time) and is reviewed item by item; nothing graded should ship until the reviewer approves that exact version. See `/workspace/understanding-motor-controls-notes/content-review-process.md` and `design.md`.
* `review/ch01.review.yaml` is the **ledger** (one entry per item: `{id, hash, status, severity, checkedAgainst, basis, notes, reviewer, date}`). Only the reviewer edits verdicts. `npm run review:seed` adds missing entries as `pending` (or `blocked-on-source` for items citing NEC/NEMA/IEEE/OSHA/NFPA 70E, or awaiting sign-off) and flags verdicts whose item changed (hash mismatch) as `stale`; it never overwrites a verdict.
* `npm run review:sheets -- <batch-id>` writes `review/sheets/<batch-id>/` (each item as the learner sees it, plus model-generated readings tables, healthy vs faulted). `npm run review:queue -- <batch-id>` writes `review/queue/<batch-id>.md`. Batch `ch01-batch1` covers all of Chapter 1, one sheet per day (Day 0 = device library and solver readings, review first).
* Readings tables are snapshot-tested (`tests/__snapshots__`): any model change that moves a reading shows up as a diff the reviewer must re-approve.
* After editing content: `npx tsx scripts/gen-faults.ts` (fault items are generated from `src/model/faults.ts`), `npm run review:seed`, regenerate sheets/queue.

## SHOW_UNREVIEWED (temporary play-test switch)
`src/config.ts` has `SHOW_UNREVIEWED = true`. The production gate (`src/gate.ts`) includes an item only if its ledger status is `approved` or `approved-pending-book` **and** the item's hash still matches. With the flag on, every non-rejected item is shown with a red **UNREVIEWED** badge (`UNREVIEWED · source needed` for blocked-on-source). **Set it to `false` before real use.** Both modes are tested.

## Known gaps, by design
* **NEC 2026.** Only sections the user has photographed are taught: 430.74 (control-circuit arrangement) and 250.21(A)(3)/(B)/(C) (ungrounded control systems). Photos are in `review/source-photos/` and referenced from each item's `excerpts`. Those items are `pending`; any other NEC ref without a photo stays `blocked-on-source`. `enforcedNote` exists on every item and is null. The home screen shows "Exam / locally enforced edition notes — coming once confirmed."
* **LOTO uses the standard OSHA 29 CFR 1910.147(d) + NFPA 70E 2024 sequence**, which the user approved on 2026-11-26 (`userSignoff: approved`). It's framed as *always follow your employer's lockout/tagout procedure*. Items resting only on OSHA text cite the public osha.gov URL and are `pending`. Items that also rest on NFPA 70E 2024 text (live-dead-live re-verification, test for absence) stay `blocked-on-source` until a 70E excerpt is attached.
* **No datasheets.** All device parameters (coil VA/PF, DC resistance, pickup/dropout, LED, timers, meter impedances, coupling) are `typical`/`illustrative` with `datasheet:TBD`; nothing graded depends on them (lint-enforced).
* Book page numbers come from the publisher TOC (`pageStatus: toc-unverified`); lessons are `bookAlignment: provisional`.

## Development
```
npm ci
npm run dev            # vite dev server
npm test               # vitest: engine, solver, faults, content lint, gate, ledger, game rules (~1 min)
npm run build          # tsc --noEmit + vite build (precaches for offline)
npm run test:e2e       # Playwright (system Chrome) phone check at 390x844 and 360x740; run locally after `npm run build`
npm run icons          # regenerate PNG icons
```
Layout: `src/model/` pure engine (complex MNA solver, world/devices/timers/meter, faults, LOTO, scoring), `src/game/` save + rules, `src/ui/` DOM/SVG views, `content/` YAML, `review/` ledger/sheets/queue, `tests/`. CI (`.github/workflows/deploy.yml`) runs `npm ci`, `npm test`, `npm run build` and deploys to Pages; the Playwright check is local-only.
