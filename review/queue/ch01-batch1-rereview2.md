# Re-review queue: ch01-batch1-rereview2

Submitted by Cody for Eli. **3 items** changed since your batch 1 verdicts. The seed script sent exactly these back to `pending` (new hash; your notes kept; your previous verdict is in each entry's `history`). Every other entry in `review/ch01.review.yaml` is byte-for-byte as you left it.

Sheets (regenerated with the fixed model): `review/sheets/ch01-batch1-rereview2/`. Symbol gallery: the app's `#symbols` page.

Wake message (to send when ready): "Priority: ch01-batch1-rereview2 ready, queue at review/queue/ch01-batch1-rereview2.md (3 items)".

## Changed items (3)

| # | Item id | Day | New hash | Previous verdict | What changed | Source excerpt / URL |
|---|---|---|---|---|---|---|
| 1 | ch01.u3.s3-18.device.control-supply | 0 | 4add40c523bf | needs-fix (minor) | MODEL-ONLY (hash unchanged; set back to pending by hand, notes kept). The CPT secondary winding (zsR 0.35 ohm) now stays in both the AC and DC/ohms solves when the bucket handle is off; only the generated voltage is removed. Isolation is by pulling F1 (new World.pullFuse / UI "Pull F1" button) or lifting a lead. De-energized ohms, handle off, F1 in: wire 7 to ground 146.4 -> 0.4 ohm healthy and 59.4 -> 0.4 ohm with the hi-Z X1 ground fault (both under 1 ohm, so an ohmmeter cannot find that fault until the conductor is isolated); START contact (released) 246.4 -> 100.4 ohm (about 100 ohm through the winding and the CR1 coil, dcR 100 ohm). After F1 is pulled the old load-network readings return (healthy w7-G 146.4 ohm, START 246.4 ohm; hi-Z w7-G 59.4 ohm). New sheet state: "Bucket supply OFF, F1 pulled, remote source OFF (winding isolated)". Observation probes used for fault distinguishability now include this isolated-ohms state, because the winding otherwise hides the hi-Z ground fault. New tests cover the winding, F1 isolation, and the hidden-until-isolated hi-Z case. | none (general knowledge) |
| 2 | ch01.u2.s2-3.symbol.pilot-light | 4 | d2e194cd5645 | blocked-on-source | IEC note: 'usually tagged with the letter H' -> 'usually tagged with the letter H (older) or P'. | none (general knowledge); STILL MISSING: nema:NEMA ICS 19, ieee:IEEE 315 |
| 3 | ch01.u3.s3-18.fault.contact-on-x2-side | 9 | 89809eab2286 | needs-fix (minor) | Miswire moved off the SOL1 valve rung onto the CR1 motor-control-circuit rung (your preferred option): START pushbutton PB1 is now wired between the CR1 coil and X2 (CR1:C1 on wire 3 after the E-stop, CR1:C2 + PB1:1 on wire 4, PB1:2 on X2). While START is released, both CR1 coil terminals sit at X1 potential, so a ground fault on the field wire between CR1 and PB1 would energize CR1 without pressing START (the arrangement 430.74 prohibits in a motor control circuit). Behavior unchanged (same lamps at idle and with START held). Wording no longer claims the terminals sit at X1 at idle when a normally-closed contact is still closed. New sheet probes: CR1:C1-G, CR1:C2-G, PB1:2-G. Idle: CR1:C1-G and CR1:C2-G 0.0 -> 120.0 V (the hazard is visible with nothing operated). With START held, both sides look the same on the coil (C1-G 119.8 V, C2-G 0.0 V); the START far terminal (PB1:2-G) is the remaining tell (119.8 -> 0.0 V, because that terminal now lands on X2). | NEC 2026 430.74: photo review/source-photos/nec2026-p70-400-430.72-430.75.jpg |

## Current text of each changed item

### ch01.u3.s3-18.device.control-supply

- **Claim:** The bucket control source is a 120 V, 60 Hz supply between X1 and X2 with a small internal impedance, so its terminal voltage sags a little when a coil draws inrush current. X2 is bonded to the enclosure (grounded) in this configuration.
- **note:** Internal impedance /Zs/ about 0.5 ohm is an illustrative value; real control transformers range from tenths of an ohm to several ohms depending on VA rating.
- **params:** volts 120 V, zsR 0.35 ohm, zsX 0.35 ohm
- **Your batch 1 note (kept in the ledger):** NEW FLAG (re-review 2026-11-26), model behavior, claim text fine. When the bucket supply is turned OFF the model removes the whole source element (world.ts: DC/ohms branch only 'if (e.on)'), which also removes the control transformer's secondary winding between X1 and X2. In a real bucket the disconnect opens the CPT primary; the secondary winding (a fraction of an ohm here, zsR 0.35 ohm) stays co…

### ch01.u2.s2-3.symbol.pilot-light

- **Claim:** A pilot light is drawn as a circle with short lines radiating from it (rays); a letter inside often gives its color, such as R for red or G for green.
- **text:** A pilot light is a circle, much like a coil, but with short lines radiating out from it like rays of light. The rays are the tell: a circle without rays is a coil, a circle with rays is a lamp. A letter inside often gives the lens color: R for red, G for green, A for amber, and so on, but not every drawing includes one (several lamps in the bucket have none). It is an indicating load, so it connects to the X2 side like any other load. In the bucket, PL1 is the green lamp that shows CR1 is picked up and PL2 is the red lamp that shows it is dropped out.
- **fieldNote:** Look for the rays first, then read the tag and color letter; never guess a circle is a coil.
- **figure:** pilot-light labelled "G"; NEMA note: A circle with radiating lines (rays); a color letter (R, G, A, and so on) inside is common but optional.
- **Your batch 1 note (kept in the ledger):** Re-review 2026-11-26. Still blocked-on-source: NEMA ICS 19 / IEEE 315 not available. Batch 1 flag RESOLVED: the card now says the rays are the tell and the color letter is optional; the figure renders with 'G' inside and all eight rays inside the frame (checked live on #symbols and with symbolFigure('pilot-light','G') rendered locally from commit 152c8d9). Remaining suggestion (not an error): the …

### ch01.u3.s3-18.fault.contact-on-x2-side

- **Claim:** START pushbutton PB1 was wired between the CR1 coil and X2 instead of between the E-stop and the coil. The circuit still works, but while START is released, both CR1 coil terminals sit at X1 potential, so a ground fault on the field wire between CR1 and PB1 would energize CR1 without pressing START (the arrangement NEC 2026 430.74 prohibits in a motor control circuit).
- **cause:** START pushbutton PB1 was wired between the CR1 coil and X2 instead of between the E-stop and the coil. The circuit still works, but while START is released, both CR1 coil terminals sit at X1 potential, so a ground fault on the field wire between CR1 and PB1 would energize CR1 without pressing START (the arrangement NEC 2026 430.74 prohibits in a motor control circuit).
- **symptom:** Operator: "Everything works." (Behavior is unchanged: a hazard found by measurement. While START is released, both CR1 coil terminals read 120 V to ground instead of 0 V.)
- **Your batch 1 note (kept in the ledger):** Re-review 2026-11-26. Batch 1 citation issue largely RESOLVED: the miswire is now on a coil rung (LS1, the safety stop for SOL1, between the SOL1 coil and X2), so a ground fault on wire 11 with LS1 open energizes SOL1 and bypasses LS1, which is the hazard 430.74 clause (2) describes. Sheet checks: idle LS1:2-G 120 -> 0 V; LS1 open SOL1:C1-G and C2-G 0 -> 120 V; SOL1 stays de-energized; behavior un…

## Tooling fixes

(a) measure() no longer throws away the meter's effect on lamps when the UI passes applyLoading: lastSolve and ledOn reflect the loaded circuit, so PL1 shows LIT during a LoZ test across the open CR1 NO contact (the note says the LoZ current turns the LED on). Clearing the probes or starting a new pair calls settle() to drop the loading. Default measure() (sheets and tests) still restores lamp state so one reading does not pollute the next. (b) solveAC now decides each LED from the lit-state (rLamp) solve: it stays on only if that operating point holds (V >= 0.8 vOnRms or I >= litI). The 10 Mohm range across an open contact feeding an LED converges in at most two solves (was 40 iterations bouncing until the 5-flip guard forced it off). New test asserts lastLedIters <= 3 and that applyLoading LoZ lights PL1. (c) review:rereview prints identify-symbol figures whose body.symbol is a string key (it had printed 'undefined labelled "undefined"' for identify-nc-contact). (d) Pilot-light IEC note as above.

## Responses

(Eli replies here or in the ledger.)
