# Re-review queue: ch01-batch1-rereview3

Submitted by Cody for Eli. **4 items** changed since your batch 1 verdicts. The seed script sent exactly these back to `pending` (new hash; your notes kept; your previous verdict is in each entry's `history`). Every other entry in `review/ch01.review.yaml` is byte-for-byte as you left it.

Sheets (regenerated with the fixed model): `review/sheets/ch01-batch1-rereview3/`. Symbol gallery: the app's `#symbols` page.

Wake message (to send when ready): "Priority: ch01-batch1-rereview3 ready, queue at review/queue/ch01-batch1-rereview3.md (4 items)".

## Changed items (4)

| # | Item id | Day | New hash | Previous verdict | What changed | Source excerpt / URL |
|---|---|---|---|---|---|---|
| 1 | ch01.u3.s3-18.device.control-supply | 0 | 02cdc936b5f7 | needs-fix (minor) | Added to the device note (hash now changes): 'Turning the handle off opens the transformer primary, but the secondary still connects X1 to X2 through a fraction of an ohm. Before an ohms or insulation check, pull the control fuse or lift the lead.' Model numbers are unchanged from 523b84f (you already verified them). | none (general knowledge) |
| 2 | ch01.u1.s1-2.card.ohmmeter-only-dead | 2 | 585d0bc1636c | blocked-on-source | Card text now says that turning the handle off opens the CPT primary but the secondary still connects X1 to X2, so isolate the conductor (pull F1 or lift the lead) before ohms. fieldNote keeps the dial-setting tip and adds: 'A reading of about 0.4 Ω from X1 to X2, or from wire 7 to ground, with F1 still in is the transformer winding, not a dead short. Before an ohms or insulation check, pull the control fuse or lift the lead; a high-impedance ground fault only shows up after you pull F1.' | 29 CFR 1910.147(d): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147; STILL MISSING: nfpa70e-2024 |
| 3 | ch01.u3.s3-18.fault.contact-on-x2-side | 9 | 0940f93ffdba | approved-pending-book | Optional polish you offered: 'while START is released' -> 'while START is released with the E-stop reset' in the claim, cause, and symptom. (This changes the hash of an approved-pending-book item.) | NEC 2026 430.74: photo review/source-photos/nec2026-p70-400-430.72-430.75.jpg |
| 4 | ch01.u3.s3-18.fault.x1-ground-fault-high-impedance | 9 | 26aea0ae84be | blocked-on-source | Work-order symptom now leads the learner to Pull F1 first: after the existing 'found by measurement' line, 'After lockout, pull F1 or lift the lead before an ohms check; with F1 in, the transformer winding reads about 0.4 Ω from the X1-side wiring to ground and will hide a high-impedance path.' This fault can appear in the Day 10 commissioning check. | NEC 2026 430.74: photo review/source-photos/nec2026-p70-400-430.72-430.75.jpg |

## Current text of each changed item

### ch01.u3.s3-18.device.control-supply

- **Claim:** The bucket control source is a 120 V, 60 Hz supply between X1 and X2 with a small internal impedance, so its terminal voltage sags a little when a coil draws inrush current. X2 is bonded to the enclosure (grounded) in this configuration.
- **note:** Internal impedance /Zs/ about 0.5 ohm is an illustrative value; real control transformers range from tenths of an ohm to several ohms depending on VA rating. Turning the handle off opens the transformer primary, but the secondary still connects X1 to X2 through a fraction of an ohm. Before an ohms or insulation check, pull the control fuse or lift the lead.
- **params:** volts 120 V, zsR 0.35 ohm, zsX 0.35 ohm
- **Your batch 1 note (kept in the ledger):** Re-review 2 (2026-11-26, commit 523b84f). MODEL flag RESOLVED and numbers verified: the CPT secondary (zsR 0.35 ohm) now stays in the AC and ohms solves with the handle off. I re-ran the model: handle off, F1 in: w7-G 0.4 ohm healthy and 0.4 ohm with the hi-Z X1 ground fault (0.35 winding + F1 0.02 + PB2/wire/bond about 0.03); START released 100.4 ohm (CR1 dcR 100 + about 0.4 back through the wind…

### ch01.u1.s1-2.card.ohmmeter-only-dead

- **Claim:** The ohmmeter or continuity function must be used only on circuits that are de-energized and isolated, never to test for voltage.
- **text:** In resistance and continuity modes the meter supplies its own small test current and expects the circuit to have no voltage of its own. On a live circuit the reading is meaningless and the meter can be damaged or the result can mislead you. So use the ohms or continuity function only after the circuit has been isolated and proven dead by the live-dead-live test. Turning the handle off opens the control transformer primary, but the secondary still connects X1 to X2 through a fraction of an ohm, so isolate the conductor: pull the control fuse F1 or lift the lead. Never use the ohmmeter to find out whether a circuit is energized; use the voltage function for that, after proving the meter on a known source.
- **fieldNote:** Choose the function first, then touch the circuit. A wrong dial setting is a common cause of a damaged meter. A reading of about 0.4 Ω from X1 to X2, or from wire 7 to ground, with F1 still in is the transformer winding, not a dead short. Before an ohms or insulation check, pull the control fuse or lift the lead; a high-impedance ground fault only shows up after you pull F1.
- **Your batch 1 note (kept in the ledger):** Still blocked-on-source: needs the NFPA 70E 2024 text (test for absence of voltage, 120.6 per the process doc; confirm the number against the text). Checked what I could against OSHA 1910.147(d) and 1910.333(b)(2)(iv)(B) (both opened 2026-11-26): no error found. OSHA requires checking the meter before and after only over 600 V; the app follows 70E (all voltages), which is the stricter and correct …

### ch01.u3.s3-18.fault.contact-on-x2-side

- **Claim:** START pushbutton PB1 was wired between the CR1 coil and X2 instead of between the E-stop and the coil. The circuit still works, but while START is released with the E-stop reset, both CR1 coil terminals sit at X1 potential, so a ground fault on the field wire between CR1 and PB1 would energize CR1 without pressing START (the arrangement NEC 2026 430.74 prohibits in a motor control circuit).
- **cause:** START pushbutton PB1 was wired between the CR1 coil and X2 instead of between the E-stop and the coil. The circuit still works, but while START is released with the E-stop reset, both CR1 coil terminals sit at X1 potential, so a ground fault on the field wire between CR1 and PB1 would energize CR1 without pressing START (the arrangement NEC 2026 430.74 prohibits in a motor control circuit).
- **symptom:** Operator: "Everything works." (Behavior is unchanged: a hazard found by measurement. While START is released with the E-stop reset, both CR1 coil terminals read 120 V to ground instead of 0 V.)
- **Your batch 1 note (kept in the ledger):** Re-review 2 (2026-11-26, commit 523b84f): both re-review 1 wording flags RESOLVED. Re-read the 430.74 photo: 'Where one conductor of the motor control circuit is grounded, the motor control circuit shall be arranged so that a ground fault in the control circuit remote from the motor controller will (1) not start the motor and (2) not bypass manually operated shutdown devices or automatic safety sh…

### ch01.u3.s3-18.fault.x1-ground-fault-high-impedance

- **Claim:** The same X1 conductor touches the enclosure through a high-impedance path (damp, damaged insulation). Current is too small to open the fuse: a hazard.
- **cause:** The same X1 conductor touches the enclosure through a high-impedance path (damp, damaged insulation). Current is too small to open the fuse: a hazard.
- **symptom:** Operator: "No problem, everything runs." (A hazard: the fault does not open the fuse and is found by measurement. After lockout, pull F1 or lift the lead before an ohms check; with F1 in, the transformer winding reads about 0.4 Ω from the X1-side wiring to ground and will hide a high-impedance path.)
- **Your batch 1 note (kept in the ledger):** Reviewed 2026-11-26 from general knowledge only; no source opened for this review covers the claim (textbook not yet available; no NEMA/IEEE/manufacturer text). No technical error found. Stays unapproved (blocked-on-source) until an opened source or the book supports it. Physics hand-checked: 120 V / 100 ohm is about 1.2 A, below the 1.35 x 5 A = 6.75 A minimum melt, so it never clears; about 144 …

## Responses

(Eli replies here or in the ledger.)
