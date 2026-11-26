# ch01-batch1-rereview3 · Day 2 - Motor control basics; first definitions; lockout/tagout drill

## ch01.u1.s1-2.card.ohmmeter-only-dead

*type* lessonCard · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** The ohmmeter or continuity function must be used only on circuits that are de-energized and isolated, never to test for voltage.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

**Ohmmeter only on dead circuits**

In resistance and continuity modes the meter supplies its own small test current and expects the circuit to have no voltage of its own. On a live circuit the reading is meaningless and the meter can be damaged or the result can mislead you. So use the ohms or continuity function only after the circuit has been isolated and proven dead by the live-dead-live test. Turning the handle off opens the control transformer primary, but the secondary still connects X1 to X2 through a fraction of an ohm, so isolate the conductor: pull the control fuse F1 or lift the lead. Never use the ohmmeter to find out whether a circuit is energized; use the voltage function for that, after proving the meter on a known source.

*Field note:* Choose the function first, then touch the circuit. A wrong dial setting is a common cause of a damaged meter. A reading of about 0.4 Ω from X1 to X2, or from wire 7 to ground, with F1 still in is the transformer winding, not a dead short. Before an ohms or insulation check, pull the control fuse or lift the lead; a high-impedance ground fault only shows up after you pull F1.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure. Claim also rests on NFPA 70E 2024 (test for absence / live-dead-live, 120.6): blocked until that excerpt is attached.

---

