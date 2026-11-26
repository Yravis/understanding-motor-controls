# Re-review queue: ch01-batch1-rereview

Submitted by Cody for Eli. **19 items** changed since your batch 1 verdicts. The seed script sent exactly these back to `pending` (new hash; your notes kept; your previous verdict is in each entry's `history`). Every other entry in `review/ch01.review.yaml` is byte-for-byte as you left it.

Sheets (regenerated with the fixed model): `review/sheets/ch01-batch1-rereview/`. Symbol gallery: the app's `#symbols` page.

Wake message (to send when ready): "Priority: ch01-batch1-rereview ready, queue at review/queue/ch01-batch1-rereview.md (19 items)".

## Changed items (19)

| # | Item id | Day | New hash | Previous verdict | What changed | Source excerpt / URL |
|---|---|---|---|---|---|---|
| 1 | ch01.u3.s3-10.device.led-pilot | 0 | 35b9f07d0c0c | needs-fix (major) | MAJOR fixed. Off-state LED is now a high but finite AC impedance (new param rOff = 470 kohm) instead of an open (src/model/world.ts acBranches). Idle sheet now: across CR1 NO1 = 114.6 V and across FS1 = 114.6 V on the 10 Mohm VAC range (was 0.0 floating); hand divider 120 x 10M / 10.47M = 114.6 V. On LoZ (3 kohm) the meter current turns the LED on, so it reads 24.0 V (120 x 3k / 15k), not near 0; noted in the device entry, and new solver test checks both readings against the hand dividers. Current figures agree: claim says "on the order of 10 mA when lit" = note (120 V / 12 kohm); litI 2 mA is labelled as the visibly-lit threshold. "default in new installations" -> "now the most common choice"; lead-reversal hedged to "may read differently ... or OL both ways, depending on the internal circuit". The DC ohmmeter model stays forward-conducting only (noted). | none (general knowledge) |
| 2 | ch01.u3.s3-11.device.sol1 | 0 | d91638b2e437 | needs-fix (minor) | dcR 400 -> 150 ohm (inrush R_ac = 14400/40 x 0.5 = 180 ohm; sealed 540 ohm). Healthy wire-7-to-ground ohms now 146.4 ohm (was 387). | none (general knowledge) |
| 3 | ch01.u3.s3-14.device.tr1 | 0 | 3d4e96798ab4 | needs-fix (minor) | dcR 500 -> 250 ohm (inrush R_ac 288 ohm, sealed 617 ohm). Covered by the new R_dc <= Z*PF test. | none (general knowledge) |
| 4 | ch01.u3.s3-14.device.tr2 | 0 | defc6ed3f165 | needs-fix (minor) | dcR 500 -> 250 ohm (same as TR1). Covered by the new R_dc <= Z*PF test. | none (general knowledge) |
| 5 | ch01.u3.s3-16.device.td3 | 0 | 45cefd286da7 | blocked-on-source | Found by the new R_dc <= Z*PF test (not in your list): 1.5 VA at PF 0.7 gives R_ac 6720 ohm, below the old dcR 12 kohm. dcR 12000 -> 6000 ohm (illustrative equivalent of the electronic input). | none (general knowledge) |
| 6 | ch01.u3.s3-16.device.td4 | 0 | 378d563d2fc6 | needs-fix (minor) | Claim scoped to the trigger type: 'TD4 is a trigger-type (control-signal) solid-state off-delay timer ... (True off-delay models that time out after power is removed, with no trigger, also exist.)'. Also dcR 12000 -> 6000 ohm (same R_dc <= Z*PF finding as TD3). | none (general knowledge) |
| 7 | ch01.u3.s3-2.device.cr1 | 0 | 527f30592f08 | needs-fix (minor) | dcR 350 -> 100 ohm (inrush R_ac = 14400/70 x 0.6 = 123 ohm; sealed 432 ohm). Sheet ohms reading now 100.0 ohm. New test: R_dc <= Z*PF for inrush and sealed on every coil. | none (general knowledge) |
| 8 | ch01.u1.s1-2.activity.loto-drill | 2 | 10627509bfb5 | blocked-on-source | Added drill step 'Try START to verify the bucket cannot restart (OSHA 1910.333(b)(2)(iv)(A))'. The LOTO sheet in the bucket has a new '6 Try START' button (presses PB1 and reports whether CR1 picked up); checkLoto now requires it after every lock. Meter steps renumbered 7a-7c. 1910.333 excerpt added. | 29 CFR 1910.147(d): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147; 29 CFR 1910.333(b)(2)(iv)(A): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.333; STILL MISSING: nfpa70e-2024 |
| 9 | ch01.u1.s1-2.card.loto-live-dead-live | 2 | d5bbdba14917 | blocked-on-source | Verification now opens with operating the controls (1910.333(b)(2)(iv)(A)) before live-dead-live; claim updated; 1910.333 excerpt added. Still also rests on NFPA 70E (not yet opened). | 29 CFR 1910.147(d): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147; 29 CFR 1910.333(b)(2)(iv)(A): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.333; STILL MISSING: nfpa70e-2024 |
| 10 | ch01.u1.s1-2.question.loto-order | 2 | 56fdd0429ca6 | approved-pending-book | Added step 'Operate the start controls to verify the equipment cannot restart' between stored energy and live-dead-live (1910.333(b)(2)(iv)(A), then (iv)(B)); claim and explanation updated; 1910.333 cited with the osha.gov URL excerpt. | 29 CFR 1910.147(d): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147; 29 CFR 1910.333(b)(2)(iv)(A): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.333 |
| 11 | ch01.u2.s2-1.card.pilot-device-intro | 2 | ac309fcf6031 | needs-fix (minor) | 'carries only the small control current needed to operate a coil, not the load current' -> 'carries only control-circuit current, such as the current for a coil or a pilot lamp, never the motor's power-circuit current.' Claim reworded to match. | none (general knowledge) |
| 12 | ch01.u2.s2-1.question.pilot-device-meaning | 3 | fae220cbeabb | blocked-on-source | Claim reworded the same way (your note on pilot-device-intro flagged it). Answers unchanged. | none (general knowledge) |
| 13 | ch01.u2.s2-3.question.identify-nc-contact | 4 | 18aa3927faf7 | blocked-on-source | Distractor 'A pilot light that shows a color letter inside a circle' / why 'a circle with a letter' -> 'A pilot light that shows its lens color' / why 'a circle with radiating lines', to match the rays fix. | none (general knowledge); STILL MISSING: symbols:nema-ics19 |
| 14 | ch01.u2.s2-3.symbol.pilot-light | 4 | 51cb878d0ecc | blocked-on-source | Card now says the rays are the tell ('a circle without rays is a coil, a circle with rays is a lamp'), color letter is common but optional (several bucket lamps have none). Figure designation PL1 -> G. nemaNote updated. | none (general knowledge); STILL MISSING: nema:NEMA ICS 19, ieee:IEEE 315 |
| 15 | ch01.u2.s2-3.symbol.solenoid | 4 | 9562ad2b45a1 | blocked-on-source | Your IEC note: 'tagged with a Y letter for valves' -> 'Older IEC/DIN drawings often tag valve solenoids with the letter Y; current IEC 81346-2 drawings tend to use M-class codes such as MB.' | none (general knowledge); STILL MISSING: nema:NEMA ICS 19, ieee:IEEE 315 |
| 16 | ch01.u3.s3-16.card.solid-state-timer | 8 | 704337487107 | needs-fix (minor) | Claim and text scoped to 'the common trigger-type (control-signal) solid-state off-delay timer, like TD4'; added your sentence about true off-delay models ('check the wiring diagram on the timer'). fieldNote scoped to trigger-type. | none (general knowledge) |
| 17 | ch01.u3.s3-18.card.contacts-left-loads-right | 9 | 47227daccce4 | needs-fix (minor) | 'Never place a contact between a coil and X2' -> your wording: 'keep stop, start and other switching devices on the X1 side, and connect the coil directly to X2. (The overload-relay contact inside a starter is a common exception you'll meet in Chapter 2.)'. fieldNote -> your wording ('in field wiring ... Treat that as a defect'). Claim reworded to match. | NEC 2026 430.74: photo review/source-photos/nec2026-p70-400-430.72-430.75.jpg |
| 18 | ch01.u3.s3-18.card.nec-430-74-ground-fault-arrangement | 9 | 12c10f9f0420 | needs-fix (minor) | fieldNote -> 'look for stop, start or safety contacts wired between a coil and the grounded conductor in the remote wiring. That's the arrangement 430.74 is written to prevent.' | NEC 2026 430.74: photo review/source-photos/nec2026-p70-400-430.72-430.75.jpg |
| 19 | ch01.u3.s3-18.fault.contact-on-x2-side | 9 | e6944a06112f | needs-fix (minor) | Miswire moved to a coil rung (your option b): limit switch LS1 (safety stop for SOL1) is now wired between the SOL1 coil and X2 (SOL1:C1 on wire 1, SOL1:C2 + LS1:1 on wire 11, LS1:2 on X2). A ground fault on the field wire between SOL1 and LS1 would energize SOL1 and bypass LS1, a real 430.74 hazard; the 430.74 cite stays. Behavior unchanged. Sheets gained probes PL1:1-G, SOL1:C1-G, SOL1:C2-G, LS1:2-G and a new "LS1 operated" state: idle LS1:2-G 120 -> 0 V; LS1 open SOL1:C1-G and SOL1:C2-G 0 -> 120 V (the hazard is visible). | NEC 2026 430.74: photo review/source-photos/nec2026-p70-400-430.72-430.75.jpg |

## Current text of each changed item

### ch01.u3.s3-10.device.led-pilot

- **Claim:** LED pilot lights are now the most common choice. A typical 120 V unit draws on the order of 10 mA when lit. They are nonlinear: they conduct well only above a small threshold voltage, and with an ohmmeter they may read differently with the probes reversed, or OL both ways, depending on the internal circuit.
- **note:** Lit: 120 V / 12 kohm = 10 mA. Off: still a high but finite impedance (470 kohm in this model), so a 10 Mohm meter across an open contact feeding the lamp reads about 115 V (near line), while a 3 kohm LoZ meter draws enough current to turn the LED on and reads about 24 V (120 x 3k / 15k). The ohmmeter model conducts forward only (diode); real LED pilot lights vary by manufacturer, and many with a bridge rectifier or driver read OL both ways.
- **params:** rLamp 12000 ohm, vOnRms 3 V, vf 1.8 V, litI 0.002 A, rOff 470000 ohm
- **Your batch 1 note (kept in the ledger):** MODEL ERROR (major): the engine treats an LED pilot that is off as a perfect open circuit (world.ts acBranches only adds the LED branch while ledOn). So on the default 10 Mohm VAC range, an open contact in series with an LED pilot reads 0.0 V 'floating' instead of about source voltage. Model output: idle CR1:1-CR1:2 (CR1 NO1 feeding PL1) = 0.0 (floating) and FS1:1-FS1:2 = 0.0 (floating); LoZ reads…

### ch01.u3.s3-11.device.sol1

- **Claim:** A solenoid valve operator is a coil load: like a relay coil it draws more current while its plunger is out than after it seats.
- **params:** rated 120 V, inrushVA 40 VA, inrushPF 0.5 pf, sealedVA 8 VA, sealedPF 0.3 pf, dcR 150 ohm, guaranteedLowPct 85 pct, guaranteedHighPct 110 pct, simPickupPct 75 pct, simDropoutPct 50 pct
- **Your batch 1 note (kept in the ledger):** PARAMETER INCONSISTENCY (physics): inrush 40 VA at PF 0.5 gives /Z/ = 360 ohm and R = 180 ohm, below dcR = 400 ohm (I = 0.333 A, so I2Rdc = 44 W, more than 40 VA). Impossible. FIX: dcR 170 ohm or less, or inrushVA 18 VA or less (14400 x 0.5 / 400 = 18 VA). Sealed (8 VA: R = 540 ohm) is fine. This also changes the healthy wire7-to-ground ohms reading (387 ohm today is mostly SOL1's 400 ohm in paral…

### ch01.u3.s3-14.device.tr1

- **Claim:** A pneumatic on-delay timing relay is driven by its own coil; its timed contacts change state after the preset once the coil has stayed energized, and reset if the coil drops first.
- **params:** rated 120 V, inrushVA 30 VA, inrushPF 0.6 pf, sealedVA 7 VA, sealedPF 0.3 pf, dcR 250 ohm, guaranteedLowPct 85 pct, guaranteedHighPct 110 pct, simPickupPct 75 pct, simDropoutPct 50 pct, presetS 5 s, repeatAccuracyPct 10 pct
- **Your batch 1 note (kept in the ledger):** PARAMETER INCONSISTENCY (physics, same as CR1): inrush 30 VA at PF 0.6 gives /Z/ = 480 ohm and R = 288 ohm, below dcR = 500 ohm (I = 0.25 A, so I2Rdc = 31 W, more than 30 VA). Impossible. FIX: dcR 250 ohm or less, or inrushVA 17 VA or less (14400 x 0.6 / 500 = 17.3 VA). Sealed (7 VA: R = 617 ohm) is fine.

### ch01.u3.s3-14.device.tr2

- **Claim:** A pneumatic off-delay timing relay changes its timed contacts immediately when the coil energizes and returns them after the preset once the coil de-energizes; re-energizing during timing resets it.
- **params:** rated 120 V, inrushVA 30 VA, inrushPF 0.6 pf, sealedVA 7 VA, sealedPF 0.3 pf, dcR 250 ohm, guaranteedLowPct 85 pct, guaranteedHighPct 110 pct, simPickupPct 75 pct, simDropoutPct 50 pct, presetS 5 s, repeatAccuracyPct 10 pct
- **Your batch 1 note (kept in the ledger):** PARAMETER INCONSISTENCY (physics, same values as TR1): inrush 30 VA at PF 0.6 gives R = 288 ohm, below dcR = 500 ohm. Impossible. FIX: dcR 250 ohm or less, or inrushVA 17 VA or less.

### ch01.u3.s3-16.device.td3

- **Claim:** A solid-state on-delay timer with no separate trigger starts timing when its supply is applied.
- **params:** rated 120 V, inrushVA 1.5 VA, inrushPF 0.7 pf, sealedVA 1.5 VA, sealedPF 0.7 pf, dcR 6000 ohm, guaranteedLowPct 85 pct, guaranteedHighPct 110 pct, simPickupPct 70 pct, simDropoutPct 50 pct, presetS 3 s, repeatAccuracyPct 1 pct
- **Your batch 1 note (kept in the ledger):** Reviewed 2026-11-26 from general knowledge only; no source opened for this review covers the claim (textbook not yet available; no NEMA/IEEE/manufacturer text). No technical error found. Stays unapproved (blocked-on-source) until an opened source or the book supports it. Device library entry, typical/illustrative values (datasheet:TBD). Simulation only; nothing graded on these numbers. No datashee…

### ch01.u3.s3-16.device.td4

- **Claim:** TD4 is a trigger-type (control-signal) solid-state off-delay timer: it needs a constant supply plus a separate trigger input. Timing starts when the trigger is removed; if the supply is lost the output drops immediately. (True off-delay models that time out after power is removed, with no trigger, also exist.)
- **params:** rated 120 V, inrushVA 1.5 VA, inrushPF 0.7 pf, sealedVA 1.5 VA, sealedPF 0.7 pf, dcR 6000 ohm, guaranteedLowPct 85 pct, guaranteedHighPct 110 pct, simPickupPct 70 pct, simDropoutPct 50 pct, presetS 3 s, repeatAccuracyPct 1 pct
- **Your batch 1 note (kept in the ledger):** Claim overgeneralizes: 'A solid-state off-delay timer needs a constant supply plus a separate trigger input'. Scope it to this device: 'TD4 is a trigger-type solid-state off-delay timer: it needs...'. True off-delay solid-state timers exist that time after power removal with no trigger (see ch01.u3.s3-16.card.solid-state-timer). Typical values otherwise unremarkable for simulation (an electronic i…

### ch01.u3.s3-2.device.cr1

- **Claim:** A 120 V control relay coil draws much more current (inrush) while its armature is open than after the armature seals in. Its guaranteed-operate band is a rating, not the exact pickup point.
- **note:** Simulator pickup/dropout are separate from the guaranteed-operate band and are typical values only; nothing is graded on them.
- **params:** rated 120 V, inrushVA 70 VA, inrushPF 0.6 pf, sealedVA 10 VA, sealedPF 0.3 pf, dcR 100 ohm, guaranteedLowPct 85 pct, guaranteedHighPct 110 pct, simPickupPct 75 pct, simDropoutPct 50 pct
- **Your batch 1 note (kept in the ledger):** PARAMETER INCONSISTENCY (physics): inrush 70 VA at PF 0.6 on 120 V gives /Z/ = 14400/70 = 205.7 ohm and R = 205.7 x 0.6 = 123 ohm. That is smaller than dcR = 350 ohm, which is impossible: the AC resistance of a coil can't be below its DC winding resistance. Check by power: I_inrush = 70/120 = 0.583 A, and copper loss alone I2 x Rdc = 0.34 x 350 = 119 W, more than the 42 W real power and even the 7…

### ch01.u1.s1-2.activity.loto-drill

- **Claim:** Follow the ordered example sequence, operate the start controls to verify the bucket cannot restart, and verify absence of voltage on every combination before touching anything. Always follow your employer's procedure.
- **steps:** 1. Identify all sources, including the foreign circuit 2. Normal shutdown 3. Isolate both sources 4. Lock and tag each isolation point 5. Relieve stored energy 6. Try START to verify the bucket cannot restart (OSHA 1910.333(b)(2)(iv)(A)) 7. Meter on known source, test X1-X2, X1-G, X2-G and 91/92, 91-G, 92-G, re-verify the meter 8. Measure continuity on the de-energized bench
- **Your batch 1 note (kept in the ledger):** Still blocked-on-source: needs the NFPA 70E 2024 text (test for absence of voltage, 120.6 per the process doc; confirm the number against the text). Checked what I could against OSHA 1910.147(d) and 1910.333(b)(2)(iv)(B) (both opened 2026-11-26): no error found. OSHA requires checking the meter before and after only over 600 V; the app follows 70E (all voltages), which is the stricter and correct …

### ch01.u1.s1-2.card.loto-live-dead-live

- **Claim:** Verification starts by operating the controls to confirm the equipment cannot restart (OSHA 1910.333(b)(2)(iv)(A)); for electrical energy it then uses live-dead-live: prove the meter on a known live source, test for absence of voltage on every combination including foreign circuit terminals, then prove the meter again.
- **text:** The last step is to verify. Start by operating the equipment controls: press START and confirm nothing operates (OSHA 1910.333(b)(2)(iv)(A) requires a qualified person to operate the controls or otherwise verify the equipment cannot be restarted). Then, for electrical energy, follow the live-dead-live method used in NFPA 70E. First, check your meter on a known live source. Second, test for absence of voltage on every combination: X1 to X2, X1 to ground, X2 to ground, and the terminals of any foreign circuit to each other and to ground. Third, check the meter again on the known source to show it still works. If any reading shows voltage, stop and go back to find the source you missed.
- **fieldNote:** Only the final live check proves that the zero you saw came from a working meter.
- **Your batch 1 note (kept in the ledger):** Still blocked-on-source: needs the NFPA 70E 2024 text (test for absence of voltage, 120.6 per the process doc; confirm the number against the text). Checked what I could against OSHA 1910.147(d) and 1910.333(b)(2)(iv)(B) (both opened 2026-11-26): no error found. OSHA requires checking the meter before and after only over 600 V; the app follows 70E (all voltages), which is the stricter and correct …

### ch01.u1.s1-2.question.loto-order

- **Claim:** The example lockout/tagout order is prepare and identify all sources, normal shutdown, isolate, lock and tag, relieve stored energy, try the start controls to verify the equipment cannot restart, then verify absence of voltage.
- **stem:** Put this example lockout/tagout sequence in the correct order.
- **explanation:** You must know every source before isolating, stop the equipment in an orderly way, isolate and lock, and deal with stored energy. Then OSHA 1910.333(b)(2)(iv)(A) has you operate the controls (try START) to verify the equipment cannot restart, and only then prove the circuit dead with the meter.
- **steps:** 1. Prepare and identify all energy sources 2. Shut down by the normal stopping procedure 3. Isolate every energy source, including the foreign source 4. Apply a lock and tag at each isolation point 5. Relieve or restrain stored energy 6. Operate the start controls to verify the equipment cannot restart 7. Verify absence of voltage with live-dead-live
- **Your batch 1 note (kept in the ledger):** Verified: 1910.147(d) says the procedure 'shall be done in the following sequence': (d)(1) preparation, (d)(2) shutdown, (d)(3) isolation, (d)(4) lockout/tagout device application, (d)(5) stored energy, (d)(6) verification of isolation. The six steps match that order exactly. The last step's label names live-dead-live (a 70E method whose text I have not opened), but the graded thing here is the or…

### ch01.u2.s2-1.card.pilot-device-intro

- **Claim:** A pilot device is a control-circuit device, such as a pushbutton or a float switch, that signals a controller; it carries only control-circuit current, never motor power current.
- **text:** A pilot device sits in the control circuit and tells the controller what is wanted. Pushbuttons, selector switches, limit switches, float switches, pressure switches, and temperature switches are all examples. Each one opens or closes a small contact in response to a hand, a position, a level, or a process condition. The pilot device is a messenger: it carries only control-circuit current, such as the current for a coil or a pilot lamp, never the motor's power-circuit current. Because it is the part people touch and the part the process acts on, it is also the part that most often wears out or is miswired.
- **fieldNote:** Pilot devices take the daily abuse. Suspect them early when a control circuit misbehaves, then confirm with a measurement.
- **Your batch 1 note (kept in the ledger):** OVERREACH / internal contradiction: 'it carries only the small control current needed to operate a coil, not the load current'. In this same bucket PB2 feeds PL3 directly and FS1/PS1/TS1/FLS1 feed lamps directly, so the pilot device carries the full current of that load. Pilot-duty float and pressure switches also commonly switch small loads directly (two-wire control). Day 1's card (ch01.u1.s1-1.…

### ch01.u2.s2-1.question.pilot-device-meaning

- **Claim:** A pilot device is a control-circuit device, such as a pushbutton or float switch, that signals a controller; it carries only control-circuit current, never motor power current.
- **stem:** Which statement best describes a pilot device?
- **explanation:** Pilot devices sit in the control circuit and give signals. Pushbuttons, selector switches, limit switches, float switches, and pressure switches are examples.
- **answers:** ✔ A control-circuit device, like a pushbutton, that signals a controller what to do · ✘ A power-circuit device that carries the full running current to a motor load · ✘ A small auxiliary motor that moves a larger machine into position for starting · ✘ A protective part that opens the circuit when current stays high for too long
- **Your batch 1 note (kept in the ledger):** Reviewed 2026-11-26 from general knowledge only; no source opened for this review covers the claim (textbook not yet available; no NEMA/IEEE/manufacturer text). No technical error found. Stays unapproved (blocked-on-source) until an opened source or the book supports it. Answers are fine. The claim text repeats the overreach 'does not carry the load current'; align it with the fix on ch01.u2.s2-1.…

### ch01.u2.s2-3.question.identify-nc-contact

- **Claim:** Two parallel vertical lines with a diagonal slash is the NEMA symbol for a normally closed contact.
- **stem:** What does the symbol shown represent?
- **explanation:** The slash across the two lines marks the contact as normally closed, which is its shelf state. Without the slash the same pair of lines is a normally open contact.
- **figure:** undefined labelled "undefined"; NEMA note: 
- **answers:** ✔ A contact that is closed on the shelf and opens when its device operates · ✘ A contact that is open on the shelf and closes when its device operates · ✘ A pilot light that shows its lens color · ✘ A relay coil that moves its armature when voltage is applied
- **Your batch 1 note (kept in the ledger):** Still blocked-on-source: NEMA ICS 19 / IEEE 315 symbol pages not available. Rendered gallery checked live 2026-11-26 (https://yravis.github.io/understanding-motor-controls/#symbols) and src/ui/symbols.ts read. No error found; symbol renders fully; one defensible answer.

### ch01.u2.s2-3.symbol.pilot-light

- **Claim:** A pilot light is drawn as a circle with short lines radiating from it (rays); a letter inside often gives its color, such as R for red or G for green.
- **text:** A pilot light is a circle, much like a coil, but with short lines radiating out from it like rays of light. The rays are the tell: a circle without rays is a coil, a circle with rays is a lamp. A letter inside often gives the lens color: R for red, G for green, A for amber, and so on, but not every drawing includes one (several lamps in the bucket have none). It is an indicating load, so it connects to the X2 side like any other load. In the bucket, PL1 is the green lamp that shows CR1 is picked up and PL2 is the red lamp that shows it is dropped out.
- **fieldNote:** Look for the rays first, then read the tag and color letter; never guess a circle is a coil.
- **figure:** pilot-light labelled "G"; NEMA note: A circle with radiating lines (rays); a color letter (R, G, A, and so on) inside is common but optional.
- **Your batch 1 note (kept in the ledger):** Still blocked-on-source: NEMA ICS 19 / IEEE 315 symbol pages not available. Rendered gallery checked live 2026-11-26 (https://yravis.github.io/understanding-motor-controls/#symbols) and src/ui/symbols.ts read. FLAG (misleading): the card says the color letter is what tells a lamp from a coil ('a plain circle with a tag could be a coil, while a circle with a color letter is a lamp'). The app's own …

### ch01.u2.s2-3.symbol.solenoid

- **Claim:** A solenoid is a coil-type load tagged SOL; it sits at the load end of its rung like a relay coil.
- **text:** A solenoid is a coil that moves a plunger when energized, often to operate a valve. On a ladder diagram it is a load, so it sits at the right end of its rung, connected to the X2 side, and it is tagged SOL with a number. Its symbol is a coil-type mark labeled SOL; drawings differ on the exact shape, so read the tag and the legend. Like a relay coil, it draws more current while the plunger is out than after it seats, but the symbol does not show that. In the bucket, SOL1 is fed through the limit switch.
- **fieldNote:** If a valve does not move, confirm the solenoid has voltage across it before you suspect the valve.
- **figure:** solenoid labelled "SOL1"; NEMA note: A coil-type load symbol labeled SOL at the load end of its rung.
- **Your batch 1 note (kept in the ledger):** Still blocked-on-source: NEMA ICS 19 / IEEE 315 symbol pages not available. Rendered gallery checked live 2026-11-26 (https://yravis.github.io/understanding-motor-controls/#symbols) and src/ui/symbols.ts read. No technical error. IEC note 'Y for valves': Y is older DIN/IEC practice; current IEC 81346-2 tends to use M-class letters (e.g. MB) for solenoids/actuators. Keep it as 'you may also see' or…

### ch01.u3.s3-16.card.solid-state-timer

- **Claim:** The common trigger-type (control-signal) solid-state off-delay timer, like TD4, needs a constant supply plus a separate trigger, and losing supply drops the output immediately.
- **text:** A solid-state timing relay uses electronics to time the delay, with an adjustable setting and generally better repeatability than a pneumatic timer. An on-delay solid-state timer can time from the moment its supply is applied. The common solid-state off-delay timer (the trigger or control-signal type, like TD4) works differently: it needs constant supply power to stay alive, plus a separate trigger input. The trigger energizing makes the output transfer immediately, and removing the trigger starts the delay. If the constant supply is lost, the output drops at once, with no timing. Some models, sold as true off-delay timers, time out after power is removed with no separate trigger; check the wiring diagram on the timer. In the reference bucket, TD4 has its supply on wire 1 and its trigger on wire 13.
- **fieldNote:** A trigger-type solid-state off-delay wired without a constant supply will not time out; it just drops out when the supply is gone.
- **Your batch 1 note (kept in the ledger):** OVERGENERALIZATION: 'An off-delay solid-state timer ... needs constant supply power ... plus a separate trigger input' and 'If the constant supply is lost, the output drops at once'. That's true of the common trigger (control-signal) type modeled as TD4, but 'true off-delay' solid-state timers also exist. They need no separate trigger or constant supply: they time out after their input power is re…

### ch01.u3.s3-18.card.contacts-left-loads-right

- **Claim:** Stop, start and other switching devices belong on the ungrounded X1 side, and coils connect directly to the grounded X2 side (the overload contact inside a starter is a common exception).
- **text:** In a grounded control circuit, the X2 side is bonded to ground. Placing every switching device on the X1 side and connecting loads directly to X2 means an accidental ground in the wiring downstream of a contact cannot energize the load, because the load is already at ground potential on that side. It also keeps a stop device from being bypassed by a ground fault. The layout rule is simple to read: keep stop, start and other switching devices on the X1 side, and connect the coil directly to X2. (The overload-relay contact inside a starter is a common exception you'll meet in Chapter 2.)
- **fieldNote:** A coil whose switching contacts are on its X2 leg in field wiring can be energized, or have its stop bypassed, by a ground fault. Treat that as a defect.
- **Your batch 1 note (kept in the ledger):** Checked against the 430.74 photo. The core physics and the 430.74 rationale are correct (with X2 grounded and switching on X1, a ground fault downstream of a contact can't energize the load, and an X1-side ground fault opens the fuse instead of bypassing the stop). OVERREACH to fix: 'Never place a contact between a coil and X2' and the fieldNote 'treat that wiring as a defect'. As the builder's ow…

### ch01.u3.s3-18.card.nec-430-74-ground-fault-arrangement

- **Claim:** NEC 2026 430.74 requires that, where one conductor of a motor control circuit is grounded, a ground fault in the control circuit remote from the controller must not start the motor and must not bypass manual or automatic safety shutdown devices.
- **text:** The habit of putting contacts on X1 and coils on X2 isn't just tradition. NEC 2026 section 430.74 says that when one conductor of a motor control circuit is grounded, the circuit has to be arranged so that a ground fault out in the remote control wiring will not start the motor and will not bypass a manual stop or an automatic safety shutdown device. In Bucket 1A, X2 is the grounded conductor and the enclosure is bonded to it. If a wire on the X1 side makes a solid (low-impedance) contact with the enclosure, the fault current returns through the bonding path and the control fuse opens. The coil is never energized by the fault. That is the arrangement 430.74 is asking for.
- **fieldNote:** When you inspect a control circuit, look for stop, start or safety contacts wired between a coil and the grounded conductor in the remote wiring. That's the arrangement 430.74 is written to prevent.
- **Your batch 1 note (kept in the ledger):** Checked against the photo. Claim and body paraphrase 430.74 correctly: grounded conductor, ground fault remote from the controller must (1) not start the motor and (2) not bypass manually operated or automatic safety shutdown devices. Section number unchanged in 2026 (not marked revised), so 'older editions used the same number' is consistent. The bucket explanation also checks: a bolted X1-to-enc…

### ch01.u3.s3-18.fault.contact-on-x2-side

- **Claim:** Limit switch LS1 (the safety stop for SOL1) was wired between the SOL1 coil and X2 instead of between X1 and the coil. The valve still works, but the SOL1 coil terminals now sit at X1 potential, so a ground fault on the field wire between SOL1 and LS1 would energize SOL1 and bypass LS1 (the arrangement NEC 2026 430.74 prohibits).
- **cause:** Limit switch LS1 (the safety stop for SOL1) was wired between the SOL1 coil and X2 instead of between X1 and the coil. The valve still works, but the SOL1 coil terminals now sit at X1 potential, so a ground fault on the field wire between SOL1 and LS1 would energize SOL1 and bypass LS1 (the arrangement NEC 2026 430.74 prohibits).
- **symptom:** Operator: "Everything works." (Behavior is unchanged: a hazard found by measurement. With LS1 closed, LS1's far terminal reads 0 V to ground instead of 120 V; with LS1 open, SOL1 still has 120 V to ground on both terminals.)
- **Your batch 1 note (kept in the ledger):** Physics is right: with CR1 NO1 moved to the X2 side of PL1, the PL1 terminals and the contact's line side sit at X1 potential while the contact is open, and behavior is unchanged (behaviorSame true). CITATION ISSUE: this item cites NEC 430.74 as the reason it's a defect, but 430.74 is about a ground fault starting the motor or bypassing shutdown devices. Here the load is an indicating lamp, so a g…

## Render-only re-check (10 items; content and hash unchanged, so status unchanged)

symbolFigure() viewBox 120x60 at 1.9x -> 120x84 at 1.45x, centred. New e2e check (e2e/phone.mjs) measures every primitive's real bounding box in all 22 gallery figures and fails on any clipping; it fails on the old renderer (pb caps, mushroom cap, pilot rays, timer arrows/labels) and passes now. Timer-arrow direction stays blocked-on-source.

| Item id | Your status |
|---|---|
| ch01.u2.s2-3.symbol.pb-no | blocked-on-source |
| ch01.u2.s2-3.symbol.pb-nc | blocked-on-source |
| ch01.u2.s2-3.symbol.pb-nc-mushroom | blocked-on-source |
| ch01.u2.s2-3.symbol.float-no | blocked-on-source |
| ch01.u2.s2-3.symbol.timer-on-notc | blocked-on-source |
| ch01.u2.s2-3.symbol.timer-off-noto | blocked-on-source |
| ch01.u2.s2-3.question.identify-mushroom | blocked-on-source |
| ch01.u2.s2-3.question.identify-notc | blocked-on-source |
| ch01.u3.s3-10.question.mushroom-stop-symbol | blocked-on-source |
| ch01.u3.s3-17.question.timer-symbol-off-delay | blocked-on-source |

## Tooling fixes

(1) review:seed edits the YAML in place: unchanged entries are byte-identical (verified: a no-op seed leaves 0 diff lines); changed-hash entries go to pending with notes kept and the old verdict appended to `history`; new ids are appended. (2) tests/ledger.test.ts validates structure only (fields, known statuses, needs-fix has severity, no approval on an item with missing source text) plus seedLedger unit tests; no status expectations. (3) Sheets settle the cloned bucket and read lit lamps before any meter reading: idle now shows PL2 PL3 PLF. (4) Every sheet state runs simulated time (1 s); bolted X1 ground fault now shows F1 blown, rails 0 V, 'blown fuses: F1' (was a sustained 21.9 V).

## Responses

(Eli replies here or in the ledger.)
