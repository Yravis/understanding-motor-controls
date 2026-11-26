# ch01-batch1 · Day 2 - Motor control basics; first definitions; lockout/tagout drill

## ch01.u1.s1-2.activity.loto-drill

*type* scenario · *book* 1.2 p.8 (toc-unverified) · *basis* illustrative · *alignment* provisional

**Claim (what is being checked):** Follow the ordered example sequence and verify absence of voltage on every combination before touching anything. Always follow your employer's procedure.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

**LOTO drill (example procedure)** (Day 2)

1. Identify all sources, including the foreign circuit
2. Normal shutdown
3. Isolate both sources
4. Lock and tag each isolation point
5. Relieve stored energy
6. Meter on known source, test X1-X2, X1-G, X2-G and 91/92, 91-G, 92-G, re-verify the meter
7. Measure continuity on the de-energized bench

*Reviewer notes (builder's doubts):* Bucket readings are model outputs (typical/illustrative device values); nothing here is graded on a specific reading. See the generated review sheets.

---

## ch01.u1.s1-2.card.motor-control-basics

*type* lessonCard · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** Basic motor control lets an operator or a sensor start, stop and protect a load from a convenient location by switching a control device that in turn switches the load.

**Motor control basics**

At its simplest, motor control lets someone start and stop a machine from a convenient place without handling the heavy power wiring. The operator works a pilot device, the control circuit responds, and a relay or similar device switches the load. Good control also considers safety: a stop device should always be able to end the run, and an unexpected restart must not be possible while someone is working on the equipment. That last idea is why isolating and locking out the energy matters before any hands-on work.

*Field note:* Control that is convenient for the operator must never be mistaken for a safe way to isolate the machine for maintenance.

*Reviewer notes (builder's doubts):* General-knowledge summary keyed to the section title only; the textbook is not available. Check against the book when it arrives.

---

## ch01.u1.s1-2.card.loto-prepare-shutdown

*type* lessonCard · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** An example lockout/tagout sequence begins by preparing and identifying all energy sources, then stopping the equipment by its normal shutdown procedure.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

**LOTO example: prepare and shut down**

This is an example procedure that follows OSHA lockout/tagout practice. Always follow your employer's own written procedure. Step one is to prepare: learn what the equipment is, find every energy source using drawings and labels, including a foreign source such as a remote interlock circuit, and tell the people affected. Step two is to stop the equipment the normal way, using its regular stop control, so it comes to rest in an orderly manner. Only after that do you start isolating. Skipping the preparation is how a hidden source gets missed.

*Field note:* Write down every source you find. If the drawing and the enclosure disagree, stop and resolve it before going on.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure.

---

## ch01.u1.s1-2.card.loto-isolate-lock-tag

*type* lessonCard · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** In the example sequence, every identified energy source is isolated, including a foreign source, and a lock and tag are applied at each isolation point.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

**LOTO example: isolate, lock and tag**

Next you isolate: open or disconnect every source of energy you identified. The bucket's own disconnect does not touch a circuit fed from a remote source, so that source must be isolated at its own origin. Then apply a lock and a tag at each isolation point. The lock physically holds the device off, and the tag tells others who applied it and why. Each person working on the equipment follows your employer's rules for applying their own lock. This example follows OSHA lockout/tagout practice, but your employer's procedure always governs.

*Field note:* A tag alone is a warning, not a barrier. Use the lock whenever the device can be locked.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure.

---

## ch01.u1.s1-2.card.loto-stored-energy

*type* lessonCard · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** After isolating and locking out, stored energy such as a charged capacitor, a raised load or compressed air must be relieved, disconnected or restrained before the work starts.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

**LOTO example: stored energy**

Turning off the sources is not always the end of the energy. Some equipment keeps energy after it is isolated: a capacitor that holds a charge, a spring under tension, a load that could fall, or air or fluid trapped under pressure. Before work starts, that energy must be relieved, disconnected or restrained, for example by draining the pressure, blocking the load or discharging the capacitor by an approved method. Which method is acceptable comes from the equipment documentation and your employer's procedure, not from guesswork.

*Field note:* Ask what could still move, spin, fall or discharge even with every source off.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure.

---

## ch01.u1.s1-2.card.loto-live-dead-live

*type* lessonCard · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** Verification for electrical energy uses live-dead-live: prove the meter on a known live source, test for absence of voltage on every combination including foreign circuit terminals, then prove the meter again.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

**LOTO example: live-dead-live**

The last step is to verify, and for electrical energy this follows the live-dead-live method used in NFPA 70E. First, check your meter on a known live source. Second, test for absence of voltage on every combination: X1 to X2, X1 to ground, X2 to ground, and the terminals of any foreign circuit to each other and to ground. Third, check the meter again on the known source to show it still works. If any reading shows voltage, stop and go back to find the source you missed.

*Field note:* Only the final live check proves that the zero you saw came from a working meter.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure. Claim also rests on NFPA 70E 2024 (test for absence / live-dead-live, 120.6): blocked until that excerpt is attached.

---

## ch01.u1.s1-2.card.ohmmeter-only-dead

*type* lessonCard · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** The ohmmeter or continuity function must be used only on circuits that are de-energized and isolated, never to test for voltage.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

**Ohmmeter only on dead circuits**

In resistance and continuity modes the meter supplies its own small test current and expects the circuit to have no voltage of its own. On a live circuit the reading is meaningless and the meter can be damaged or the result can mislead you. So use the ohms or continuity function only after the circuit has been isolated and proven dead by the live-dead-live test. Never use it to find out whether a circuit is energized; use the voltage function for that, after proving the meter on a known source.

*Field note:* Choose the function first, then touch the circuit. A wrong dial setting is a common cause of a damaged meter.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure. Claim also rests on NFPA 70E 2024 (test for absence / live-dead-live, 120.6): blocked until that excerpt is attached.

---

## ch01.u1.s1-2.question.employer-procedure

*type* question · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A lockout/tagout sequence taught as an example does not replace the employer's own written procedure, which must be followed.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

*Format* mcq · *Day* 2

**The lockout/tagout steps in this course are an example. What should you do when your employer's procedure differs in some details?**

- ✅ Follow your employer's written procedure.
- ❌ Follow the course steps, since they were learned most recently.  
  *why wrong:* The course is an example; the employer's procedure governs on the job.
- ❌ Use whichever procedure takes fewer steps on that job.  
  *why wrong:* Shortcuts are how steps get skipped; fewer steps is not a valid reason.
- ❌ Combine both and skip any step the two do not share.  
  *why wrong:* Dropping steps based on a comparison is unsafe and not a sanctioned approach.

*Explanation:* Employers write procedures for their own equipment and hazards. An example teaches the logic; the employer's procedure is the one to follow.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure.

---

## ch01.u1.s1-2.question.loto-order

*type* question · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** The example lockout/tagout order is prepare and identify all sources, normal shutdown, isolate, lock and tag, relieve stored energy, then verify.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

*Format* order-steps · *Day* 2

**Put this example lockout/tagout sequence in the correct order.**

1. Prepare and identify all energy sources
2. Shut down by the normal stopping procedure
3. Isolate every energy source, including the foreign source
4. Apply a lock and tag at each isolation point
5. Relieve or restrain stored energy
6. Verify absence of voltage with live-dead-live

*Explanation:* You must know every source before isolating, stop the equipment in an orderly way, isolate and lock, deal with stored energy, and only then prove the circuit dead.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure.

---

## ch01.u1.s1-2.question.identify-sources-multi

*type* question · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** Preparation must find the control supply, any remote foreign source and stored energy, not only the source controlled by the local disconnect.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

*Format* multi-select · *Day* 2

**Before isolating a bucket for work, which of these must be identified as energy to deal with? Select all that apply.**

- ✅ The control supply feeding X1 and X2
- ✅ A remote source feeding an interlock circuit
- ✅ Stored energy such as a charged capacitor or trapped pressure
- ❌ Only whatever the bucket disconnect handle controls  
  *why wrong:* A disconnect does not control a circuit fed from another source.
- ❌ The pilot lamp PL1, since it is the only part that glows  
  *why wrong:* A lamp is a load, not a source of energy.

*Explanation:* Energy can come from the local supply, from a foreign source, or be stored in equipment. Missing any one of them leaves a hazard.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure.

---

## ch01.u1.s1-2.question.normal-shutdown

*type* question · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** In the example sequence the equipment is stopped by its normal stopping procedure before the energy sources are isolated.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

*Format* mcq · *Day* 2

**In the example lockout/tagout sequence, why is the equipment stopped normally before the isolating devices are opened?**

- ✅ So the equipment stops in an orderly way, not by an abrupt loss of power.
- ❌ So the stop button can serve as the lock in place of a padlock.  
  *why wrong:* A stop control is not an isolation device and never replaces a lock.
- ❌ So the isolating devices are not needed once the stop is pressed.  
  *why wrong:* Normal stopping does not isolate any energy source; isolation is still required.
- ❌ So the test for absence of voltage can be skipped later on.  
  *why wrong:* Verification is always required; stopping does not replace it.

*Explanation:* A normal stop brings the machine to rest in a controlled way. It is not isolation, so every later step is still needed.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure.

---

## ch01.u1.s1-2.question.isolate-foreign

*type* question · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A foreign-voltage circuit must be isolated at its own remote source, because the bucket disconnect does not de-energize it.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

*Format* mcq · *Day* 2

**Where is the interlock circuit fed from a remote panel isolated in the example sequence?**

- ✅ At its own source, in the remote panel, with its own lock and tag.
- ❌ At the bucket disconnect, since that handle opens every circuit inside.  
  *why wrong:* The bucket disconnect only opens the circuits it controls; the remote source is unaffected.
- ❌ Nowhere, because a low-energy interlock circuit cannot hurt anyone.  
  *why wrong:* Low energy does not mean harmless; every source must be isolated or proven dead.
- ❌ By pulling the warning label off the door and keeping it nearby.  
  *why wrong:* A label is information, not an isolation device.

*Explanation:* Each source is isolated where it originates. The bucket disconnect cannot isolate a remote source, so the foreign circuit needs its own lock and tag.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure.

---

## ch01.u1.s1-2.question.lock-versus-tag

*type* question · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A lock physically holds an isolating device off, while a tag is a warning that identifies who applied it and why.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

*Format* mcq · *Day* 2

**What is the difference between the lock and the tag at an isolation point?**

- ✅ The lock holds the device off; the tag warns and names who applied it.
- ❌ The tag holds the device off; the lock is only a decoration for visibility.  
  *why wrong:* A tag cannot physically hold a device off; the lock does that.
- ❌ They do the same job, so using one of them on the device is always enough.  
  *why wrong:* They serve different purposes; a lock is a barrier and a tag is a warning.
- ❌ The lock tells others the reason, and the tag stops the handle moving.  
  *why wrong:* That reverses the roles: the tag communicates, the lock restrains.

*Explanation:* A lock is a barrier; a tag is information. The example procedure uses both.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure.

---

## ch01.u1.s1-2.question.recheck-meter

*type* question · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** In live-dead-live, the meter is checked on a known source again after the absence-of-voltage tests to show it did not fail during the tests.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

*Format* mcq · *Day* 2

**In live-dead-live, why is the meter checked on the known live source again after the zero readings?**

- ✅ To show the meter still works, so the zero readings can be trusted.
- ❌ To drain any leftover charge out of the circuit that was tested.  
  *why wrong:* A meter check does not discharge anything; stored energy is handled earlier.
- ❌ To re-energize the circuit so the lock can be removed safely.  
  *why wrong:* Re-energizing is the opposite of the goal; the final check only proves the meter.
- ❌ To reset the meter so it displays zero for the next user.  
  *why wrong:* The check is about proof of function, not about resetting a display.

*Explanation:* A meter can fail during the tests. The second live check shows it still read correctly, so the dead readings mean the circuit really was dead.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure. Claim also rests on NFPA 70E 2024 (test for absence / live-dead-live, 120.6): blocked until that excerpt is attached.

---

## ch01.u1.s1-2.question.absence-combinations

*type* question · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** Absence of voltage is tested on every combination: X1 to X2, X1 to ground, X2 to ground, and any foreign circuit terminals.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

*Format* mcq · *Day* 2

**Which set of checks correctly covers the test for absence of voltage on the bucket?**

- ✅ X1-X2, X1-ground, X2-ground, plus foreign circuit terminals
- ❌ X1-X2 only, since that pair is the control supply itself  
  *why wrong:* A single pair can read zero while another combination is still live, for example a fault to ground.
- ❌ X1-ground only, since ground is the safest reference point  
  *why wrong:* One combination does not show the other conductor or the foreign circuit is dead.
- ❌ Only the terminals that a technician happened to label  
  *why wrong:* Labels can be missing or wrong; every combination must be tested.

*Explanation:* Testing every combination, including foreign-circuit terminals, catches live conductors that a single reading would miss.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure. Claim also rests on NFPA 70E 2024 (test for absence / live-dead-live, 120.6): blocked until that excerpt is attached.

---

## ch01.u1.s1-2.question.ohmmeter-rule

*type* question · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** The ohmmeter or continuity function is used only on circuits that are de-energized and isolated.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

*Format* mcq · *Day* 2

**When is it appropriate to use the ohmmeter or continuity function on a control circuit?**

- ✅ Only after the circuit is isolated and proven de-energized
- ❌ Any time, because the meter protects itself from live circuits  
  *why wrong:* Resistance mode is not designed for live circuits and can give false readings or damage the meter.
- ❌ To decide whether the circuit is live before you test it  
  *why wrong:* Use the voltage function to look for voltage, after proving the meter on a known source.
- ❌ Whenever the pilot lamp is dark, since a dark lamp means dead  
  *why wrong:* A dark lamp does not prove the circuit is dead; a blown lamp or open contact looks the same.

*Explanation:* Ohms and continuity supply their own test current and assume no external voltage. Isolate and verify first, then switch to those functions.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure. Claim also rests on NFPA 70E 2024 (test for absence / live-dead-live, 120.6): blocked until that excerpt is attached.

---

## ch01.u1.s1-2.question.supply-off-predict

*type* question · *book* 1.2 p.8 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** After the bucket control supply is removed, CR1 drops out and the bucket lamps go dark, but the remote interlock lamp PLF stays lit.

> LOTO: standard OSHA 1910.147(d) + NFPA 70E 2024 approach, approved by the user 2026-11-26. Example procedure; always follow your employer's procedure.

*Format* predict-state · *Day* 2

**The START button was pressed and CR1 is running. The bucket control supply is then switched off. What is the state of CR1 and the lamps PL1, PL2 and PLF?**

- ✅ CR1 drops out and PL1 and PL2 are off, but PLF is still lit.
- ❌ CR1 drops out and every lamp including PLF goes dark.  
  *why wrong:* PLF is fed from a foreign source and stays lit with the bucket supply off.
- ❌ CR1 stays in and PL1 remains lit because the button is held.  
  *why wrong:* With no supply there is no coil current, so CR1 cannot stay picked up.
- ❌ CR1 drops out and PL2 lights because the NC contact has closed.  
  *why wrong:* PL2 needs supply voltage to light; with the supply off, it cannot be on.
Scene: `[{"do":"press","dev":"PB1"},{"do":"advance","arg":1},{"do":"supply","arg":false}]` → expected `{"lit":{"PL1":false,"PL2":false,"PLF":true},"coil":{"CR1.coil":false}}` (machine-verified against the simulator)

*Explanation:* No supply means no coil current and no lamp current in the bucket. The interlock circuit is the exception, since a different source feeds it. That is why a bucket that looks dead can still be live.

*Reviewer notes (builder's doubts):* LOTO item. User approved the standard OSHA 1910.147(d) + NFPA 70E 2024 approach on 2026-11-26 (PSC follows standard practice). Example procedure; always follow your employer's procedure.

---

## ch01.u2.s2-1.card.control-defined

*type* lessonCard · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** In motor work, 'control' means deciding when and how a load starts, stops, and runs, as opposed to supplying the load's power.

**Control: the decision-making side**

In motor work, control means deciding when a load runs, when it stops, and sometimes how it runs, such as direction or order of operation. It is separate from power, which is the energy the load actually uses. A button that starts a pump is control; the current flowing through the pump motor is power. Control circuits usually work at a lower voltage and a much smaller current than the loads they command, which is one reason they can be wired with smaller conductors and handled with different devices. Keeping the two ideas apart makes every drawing easier to read.

*Field note:* When something will not start, first ask whether the decision (control) or the work (power) is missing. It tells you where to look.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary card; checked against common US control practice only. Book alignment pending.

---

## ch01.u2.s2-1.card.controller-defined

*type* lessonCard · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A controller is the device that starts, stops, or otherwise governs the electrical load according to signals it receives.

**Controller: the device in charge of the load**

A controller is the piece of equipment that actually switches and governs the load. It receives instructions, for example from a pushbutton, and then connects or disconnects the load from its supply. A simple on/off controller closes contacts to feed a motor and opens them to stop it. Controllers can be as basic as a manual switch or as involved as a starter with several protective and timing features. The important idea is the division of labor: the operator or sensor suggests, the controller carries out the action, and the load does the work.

*Field note:* On a job drawing, the controller is usually the device whose coil you trace back to find what commands it.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary card; checked against common US control practice only. Book alignment pending.

---

## ch01.u2.s2-1.card.pilot-device-intro

*type* lessonCard · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A pilot device is a control-circuit device, such as a pushbutton or a float switch, that signals a controller; it does not carry the load current.

**Pilot device: the signal giver**

A pilot device sits in the control circuit and tells the controller what is wanted. Pushbuttons, selector switches, limit switches, float switches, pressure switches, and temperature switches are all examples. Each one opens or closes a small contact in response to a hand, a position, a level, or a process condition. The pilot device is a messenger: it carries only the small control current needed to operate a coil, not the load current. Because it is the part people touch and the part the process acts on, it is also the part that most often wears out or is miswired.

*Field note:* Pilot devices take the daily abuse. Suspect them early when a control circuit misbehaves, then confirm with a measurement.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary card; checked against common US control practice only. Book alignment pending.

---

