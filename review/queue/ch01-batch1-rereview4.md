# Re-review queue: ch01-batch1-rereview4

Submitted by Cody for Eli. **2 items** changed since your batch 1 verdicts. The seed script sent exactly these back to `pending` (new hash; your notes kept; your previous verdict is in each entry's `history`). Every other entry in `review/ch01.review.yaml` is byte-for-byte as you left it.

Sheets (regenerated with the fixed model): `review/sheets/ch01-batch1-rereview4/`. Symbol gallery: the app's `#symbols` page.

Wake message (to send when ready): "Priority: ch01-batch1-rereview4 ready, queue at review/queue/ch01-batch1-rereview4.md (2 items)".

## Changed items (2)

| # | Item id | Day | New hash | Previous verdict | What changed | Source excerpt / URL |
|---|---|---|---|---|---|---|
| 1 | ch01.u3.s3-18.device.control-supply | 0 | 5f9e1a955e26 | needs-fix (minor) | Ohms vs insulation split in the device note (hash changes). After the existing handle-off / secondary sentence, the note now reads: 'Before an ohms check, pull the control fuse or lift the lead. Pulling F1 only removes the winding; the coils, lamps, and TD3/TD4 electronics still connect the wire to X2 (about 146 Ω). For an insulation test, lift the conductor at both ends so no load or electronics are connected. A 500/1000 V megger could damage the timers and LED drivers.' Model numbers are unchanged (you already verified them). | none (general knowledge) |
| 2 | ch01.u1.s1-2.card.ohmmeter-only-dead | 2 | a4eda25268d9 | blocked-on-source | Three wording fixes from your re-review 3 flags. (a) fieldNote no longer claims 0.4 Ω from X1 to X2: it now says a reading of about 0.4 Ω from wire 1, wire 7 or any X1-side wire to ground with F1 in is the winding, not a dead short (X1 to X2 always reads the winding, about 0.3 Ω here, whether F1 is in or out). (b) Same ohms vs insulation split as the control-supply note: 'Before an ohms check, pull the control fuse or lift the lead. For an insulation test, lift the conductor at both ends so no load or electronics are connected.' The card text keeps the existing 'pull F1 or lift the lead' ohms isolation sentence and then adds that insulation-test sentence. (c) The hi-Z hint is no longer 'only shows up after you pull F1': on the ohmmeter it shows up only after you pull F1 or lift the lead; a voltage reading still hints at it faintly (119.5 V vs 120 V). | 29 CFR 1910.147(d): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147; STILL MISSING: nfpa70e-2024 |

## Current text of each changed item

### ch01.u3.s3-18.device.control-supply

- **Claim:** The bucket control source is a 120 V, 60 Hz supply between X1 and X2 with a small internal impedance, so its terminal voltage sags a little when a coil draws inrush current. X2 is bonded to the enclosure (grounded) in this configuration.
- **note:** Internal impedance /Zs/ about 0.5 ohm is an illustrative value; real control transformers range from tenths of an ohm to several ohms depending on VA rating. Turning the handle off opens the transformer primary, but the secondary still connects X1 to X2 through a fraction of an ohm. Before an ohms check, pull the control fuse or lift the lead. Pulling F1 only removes the winding; the coils, lamps, and TD3/TD4 electronics still connect the wire to X2 (about 146 Ω). For an insulation test, lift the conductor at both ends so no load or electronics are connected. A 500/1000 V megger could damage the timers and LED drivers.
- **params:** volts 120 V, zsR 0.35 ohm, zsX 0.35 ohm
- **Your batch 1 note (kept in the ledger):** Re-review 3 (2026-11-26, commit 73e7d0f). Re-review 2 gap RESOLVED: the note now explains that the handle opens the CPT primary and the secondary still connects X1 to X2 through a fraction of an ohm (consistent with the model and sheets: w7-G 0.4 ohm with F1 in, 146.4 ohm with F1 pulled; START 100.4 / 246.4 ohm). ONE WORDING FIX (minor): 'Before an ohms or insulation check, pull the control fuse o…

### ch01.u1.s1-2.card.ohmmeter-only-dead

- **Claim:** The ohmmeter or continuity function must be used only on circuits that are de-energized and isolated, never to test for voltage.
- **text:** In resistance and continuity modes the meter supplies its own small test current and expects the circuit to have no voltage of its own. On a live circuit the reading is meaningless and the meter can be damaged or the result can mislead you. So use the ohms or continuity function only after the circuit has been isolated and proven dead by the live-dead-live test. Turning the handle off opens the control transformer primary, but the secondary still connects X1 to X2 through a fraction of an ohm, so isolate the conductor: pull the control fuse F1 or lift the lead. For an insulation test, lift the conductor at both ends so no load or electronics are connected. Never use the ohmmeter to find out whether a circuit is energized; use the voltage function for that, after proving the meter on a known source.
- **fieldNote:** Choose the function first, then touch the circuit. A wrong dial setting is a common cause of a damaged meter. A reading of about 0.4 Ω from wire 1, wire 7 or any X1-side wire to ground with F1 in is the winding, not a dead short (X1 to X2 always reads the winding, about 0.3 Ω here, whether F1 is in or out). Before an ohms check, pull the control fuse or lift the lead. For an insulation test, lift the conductor at both ends so no load or electronics are connected. On the ohmmeter, a high-impedance ground fault only shows up after you pull F1 or lift the lead; a voltage reading still hints at it faintly (119.5 V vs 120 V).
- **Your batch 1 note (kept in the ledger):** Re-review 3 (2026-11-26, commit 73e7d0f). Still blocked-on-source: needs the NFPA 70E 2024 text (the card ties ohms use to the live-dead-live test). The original text still checks against OSHA 1910.147(d) and 1910.333(b)(2)(iv)(B) (opened 2026-11-26); the new winding/isolation material is general knowledge and is right in substance. TWO FLAGS in the new fieldNote (minor): (1) 'A reading of about 0…

## Responses

(Eli replies here or in the ledger.)
