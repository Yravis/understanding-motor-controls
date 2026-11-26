# ch01-batch1 · Day 3 - Control terminology

## ch01.u2.s2-1.activity.device-bench

*type* scenario · *book* 2.1 p.11 (toc-unverified) · *basis* illustrative · *alignment* provisional

**Claim (what is being checked):** Meter a pushbutton and CR1's NO and NC contacts at rest and operated, and record a truth table.

**Device bench: truth table** (Day 3)

1. Press and release PB1 and watch the contact
2. Meter across PB1 contacts, open and closed
3. Meter CR1 NO and NC contacts, dropped out and picked up
4. Fill in the truth table

*Reviewer notes (builder's doubts):* Bucket readings are model outputs (typical/illustrative device values); nothing here is graded on a specific reading. See the generated review sheets.

---

## ch01.u2.s2-1.card.maintained-vs-momentary

*type* lessonCard · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A momentary operator returns to rest when released; a maintained operator stays in its operated position until it is deliberately reset.

**Momentary versus maintained**

These words describe what an operator does when you let go. A momentary device, like a typical START button, springs back to its rest position the moment you release it, so its contact is changed only while you hold it. A maintained device stays where you put it until you reset it: a toggle or selector switch stays in position, and a mushroom-head button may latch down until it is pulled or twisted back. Maintained does not mean the load is running; it only describes the operator. What the circuit does after release depends on how the rest of the circuit is wired.

*Field note:* If a button seems stuck down, check whether it is meant to be maintained before you decide it is broken.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary card; checked against common US control practice only. Book alignment pending.

---

## ch01.u2.s2-1.card.normal-state

*type* lessonCard · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A contact's normal state (normally open or normally closed) is its state with the device de-energized and unoperated, as manufactured, not its state in an operating circuit.

**Normally open and normally closed**

Normal means the state on the shelf: the device is not energized, nobody is pressing it, and nothing is acting on it. A normally open (NO) contact is open in that state and closes when the device operates. A normally closed (NC) contact is closed on the shelf and opens when the device operates. The word describes the device as manufactured, not what you see in a running machine. A float switch in a full tank, or a pressure switch on a charged system, may be holding its contact away from the normal state, yet it is still called by its shelf name.

*Field note:* Always name a contact by its shelf state. Otherwise two people can look at the same switch and disagree about what it is.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary card; checked against common US control practice only. Book alignment pending.

---

## ch01.u2.s2-1.card.coil-contacts-relay

*type* lessonCard · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A relay is an electromagnetic switch: current in its coil moves an armature that changes the state of its contacts, which are electrically separate from the coil.

**Coil, contacts, and the relay**

A relay has two electrically separate parts. The coil is a winding that becomes an electromagnet when voltage is applied. The contacts are the switching points that the moving armature opens and closes. When the coil is energized, its NO contacts close and its NC contacts open; when the coil is de-energized, springs return everything to the normal state. Because the coil and contacts are separate, a small coil signal can control contacts in a different circuit. On drawings the coil and each contact are often drawn in different places and linked by the same designation, such as CR1.

*Field note:* When you test a relay, check the coil and the contacts separately. A good coil says nothing about the contacts.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary card; checked against common US control practice only. Book alignment pending.

---

## ch01.u2.s2-1.card.pickup-dropout

*type* lessonCard · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** Pickup is the coil voltage level at which a relay's armature moves to the energized position; dropout is the lower level at which it returns.

**Pickup and dropout**

Pickup describes the moment a coil becomes strong enough to pull its armature to the energized position, so contacts change state. Dropout describes the moment the coil is weak enough for the springs to return the armature, so contacts go back to normal. They are different voltages: the armature needs a stronger pull to start moving across the open gap than it needs to stay held in once closed, so dropout happens at a lower voltage than pickup. This is vocabulary for now; real devices have manufacturer ratings, and nothing here depends on specific numbers.

*Field note:* Low control voltage can leave a relay chattering or refusing to pull in. Remember that pickup and dropout are not the same point.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary card; checked against common US control practice only. Book alignment pending.

---

## ch01.u2.s2-1.card.seal-in-vocabulary

*type* lessonCard · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** Seal-in (holding) refers to a relay or starter using one of its own contacts to keep its coil energized after a momentary START signal ends.

**Seal-in: a word to know**

Seal-in, also called holding or maintaining, is the idea that a relay or starter can use one of its own auxiliary contacts to keep its own coil energized. The START signal only has to be momentary: once the coil picks up and its contact closes, that contact carries the coil current and keeps it going after the button is released. The word names the effect and the contact involved, often called the seal-in or holding contact. This card is vocabulary only. The circuit that creates a seal-in is covered later, so do not worry about how it is wired yet.

*Field note:* If a drawing mentions a seal-in contact, you now know its job: it keeps the coil on after a momentary start.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary card; checked against common US control practice only. Book alignment pending.

---

## ch01.u2.s2-1.card.control-vs-power-load

*type* lessonCard · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** The power circuit carries the current that feeds the load; the control circuit carries the signals that tell the controller when to operate; the load is the device that does the work.

**Control circuit, power circuit, and load**

The load is the device that converts electrical energy into useful work: a motor, a heater, a solenoid valve. The power circuit carries the current that feeds the load. The control circuit carries the small signals, from pushbuttons, sensors, and coils, that decide when the controller connects the load to power. Some devices fit in both worlds: a coil is a load of the control circuit, even though it is part of the controller. Keeping the words straight prevents confusion when two circuits are in the same enclosure but have different voltages and different jobs.

*Field note:* Always ask which circuit you are touching. Control and power circuits can share one enclosure and still be fed from different sources.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary card; checked against common US control practice only. Book alignment pending.

---

## ch01.u2.s2-1.card.contactor-starter-overload

*type* lessonCard · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A contactor is a coil-operated switch for power contacts; a motor starter is a contactor plus overload protection; an overload relay responds to sustained excess motor current.

**Contactor, starter, and overload**

A contactor is a coil-operated switch with heavy power contacts for carrying load current. A motor starter is a contactor combined with overload protection. The overload relay is the part that responds when a motor draws too much current for too long, and it signals the controller to drop out, usually through a small contact in the control circuit. These are vocabulary words for now: the bucket shows them greyed out as a preview of Chapter 2. For now, remember that the coil is a control-circuit device while the power contacts it moves belong to the power circuit.

*Field note:* A contactor by itself does not protect the motor from overload. The overload relay is what does that job in a starter.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary card; checked against common US control practice only. Book alignment pending.

---

## ch01.u2.s2-1.question.normally-closed-meaning

*type* question · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A normally closed contact is closed in the de-energized, unoperated (shelf) state.

*Format* mcq · *Day* 3

**A control relay sits on the shelf, never connected to power. One of its contacts is described as 'normally closed.' What does that mean?**

- ✅ It is closed while the coil is de-energized, and it opens when the coil energizes
- ❌ It is closed whenever the machine is running normally, even while the coil is energized  
  *why wrong:* 'Normal' is not the running condition of a machine. It is the shelf, de-energized state.
- ❌ It is closed only after the coil has been energized for some period of time  
  *why wrong:* That describes a timed contact, not the plain normal state.
- ❌ It is closed or open depending on how the technician left it last  
  *why wrong:* The normal state is fixed by construction, not by the last user.

*Explanation:* Normal means de-energized and unoperated, as manufactured. A normally closed contact is closed in that state and opens when the device operates. A normally open contact is the reverse.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary question; no numbers from typical parameters. Book alignment pending.

---

## ch01.u2.s2-1.question.maintained-operator

*type* question · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A maintained operator stays in its operated position after release until reset; a momentary operator springs back.

*Format* mcq · *Day* 3

**Which operator stays in its operated position after you let go, until someone resets it by hand?**

- ✅ A maintained operator, such as a latching mushroom head pulled to reset
- ❌ A momentary pushbutton, since its contacts keep the new state after release  
  *why wrong:* Momentary operators spring back as soon as they are released.
- ❌ A normally open contact, since open and closed describe how long it stays put  
  *why wrong:* NO and NC describe the shelf state of a contact, not what the operator does after release.
- ❌ A pilot light, since its lens stays lit until the circuit is reset  
  *why wrong:* A pilot light is an indicator, not an operator you press or release.

*Explanation:* Maintained and momentary describe the operator's behavior after release. Normal state (NO/NC) is a different idea that describes the contact on the shelf.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary question; no numbers from typical parameters. Book alignment pending.

---

## ch01.u2.s2-1.question.pickup-event

*type* question · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** Pickup is the point where a relay's armature moves to the energized position; dropout is the point where it returns.

*Format* mcq · *Day* 3

**A relay coil's voltage slowly rises from zero. At a certain point the armature pulls in and the contacts change state. What is that event called?**

- ✅ Pickup, the armature moving to its energized position
- ❌ Dropout, the armature moving back to its de-energized position  
  *why wrong:* Dropout happens when the voltage falls enough to release the armature, the opposite event.
- ❌ Seal-in, a contact holding its own coil on after the start signal ends  
  *why wrong:* Seal-in describes a contact holding the coil on, not the armature's first movement.
- ❌ Overload, the motor drawing more current than its rating allows  
  *why wrong:* Overload is about excess motor current, not about relay armature movement.

*Explanation:* Pickup is the armature moving to the energized state. Dropout is the return to the de-energized state, and it happens at a lower voltage than pickup.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary question; no numbers from typical parameters. Book alignment pending.

---

## ch01.u2.s2-1.question.seal-in-term

*type* question · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** Seal-in means a relay or starter uses one of its own contacts to keep its coil energized after a momentary start signal.

*Format* mcq · *Day* 3

**A technician says a starter is 'sealed in' after START is released. What is being described?**

- ✅ One of its own contacts is keeping its coil energized, so START need not be held
- ❌ Its enclosure gasket is keeping dust and moisture out of the starter cabinet  
  *why wrong:* That describes an enclosure seal, not the control-circuit term.
- ❌ Its START button is mechanically locked down so it cannot be pressed again  
  *why wrong:* A locked button would be a maintained operator, not seal-in.
- ❌ Its overload relay has tripped and is holding the contactor open for safety  
  *why wrong:* A tripped overload drops the starter out; it is not seal-in.

*Explanation:* Seal-in, or holding, is a contact of the relay or starter itself carrying the coil current after a momentary signal ends. How it is wired comes later.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary question; no numbers from typical parameters. Book alignment pending.

---

## ch01.u2.s2-1.question.pilot-device-meaning

*type* question · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A pilot device is a control-circuit device, such as a pushbutton or float switch, that signals a controller and does not carry the load current.

*Format* mcq · *Day* 3

**Which statement best describes a pilot device?**

- ✅ A control-circuit device, like a pushbutton, that signals a controller what to do
- ❌ A power-circuit device that carries the full running current to a motor load  
  *why wrong:* That describes the power contacts of a contactor or starter.
- ❌ A small auxiliary motor that moves a larger machine into position for starting  
  *why wrong:* A pilot device is not a motor; it is a switching or sensing device.
- ❌ A protective part that opens the circuit when current stays high for too long  
  *why wrong:* That describes an overload device or a fuse, not a pilot device.

*Explanation:* Pilot devices sit in the control circuit and give signals. Pushbuttons, selector switches, limit switches, float switches, and pressure switches are examples.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary question; no numbers from typical parameters. Book alignment pending.

---

## ch01.u2.s2-1.question.pilot-devices-select

*type* question · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** Pushbuttons, float switches, and pressure switches are pilot devices; a motor and a contactor's power contacts are not.

*Format* multi-select · *Day* 3

**Which of these are pilot devices? Select all that apply.**

- ✅ A pushbutton
- ✅ A float switch
- ✅ A pressure switch
- ❌ The motor it controls  
  *why wrong:* The motor is the load, not a signal giver.
- ❌ The power contacts of a contactor  
  *why wrong:* Those carry load current in the power circuit; they are not pilot devices.

*Explanation:* Pilot devices signal a controller through small control-circuit contacts. The motor is the load and the power contacts carry its current.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary question; no numbers from typical parameters. Book alignment pending.

---

## ch01.u2.s2-1.question.control-vs-power

*type* question · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** The control circuit carries signals that tell the controller when to operate; the power circuit carries the current that feeds the load.

*Format* mcq · *Day* 3

**Which statement correctly separates the control circuit from the power circuit in a motor installation?**

- ✅ Control carries the signals that decide when to operate; power carries the load's current
- ❌ Control carries the load's current; power carries the signals that decide when to operate  
  *why wrong:* The roles are reversed.
- ❌ They are the same conductors; only the insulation color of the wire differs  
  *why wrong:* They are separate circuits with different jobs, not the same conductors.
- ❌ Pushbuttons and lamps belong to the power circuit; motors belong to the control circuit  
  *why wrong:* Pushbuttons and lamps are control devices; the motor is the load.

*Explanation:* The load is the device doing the work, such as a motor. The power circuit feeds it. The control circuit decides when the controller connects it.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary question; no numbers from typical parameters. Book alignment pending.

---

## ch01.u2.s2-1.question.relay-sequence

*type* question · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** When a relay coil is energized, its magnetic field pulls the armature in, which closes NO contacts and opens NC contacts.

*Format* order-steps · *Day* 3

**Put the events in order when a relay coil is energized.**

1. Voltage is applied across the relay coil
2. Coil current builds a magnetic field
3. The field pulls the armature to its energized position
4. NO contacts close and NC contacts open

*Explanation:* The coil acts first, the armature moves second, and only then do the contacts change state. The contacts are electrically separate from the coil.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary question; no numbers from typical parameters. Book alignment pending.

---

## ch01.u2.s2-1.question.maintained-estop-predict

*type* question · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A maintained NC mushroom button stays latched open after release, so holding START afterward does not energize CR1.

*Format* predict-state · *Day* 3

**In the reference bucket, the maintained mushroom PB3 is pressed and then released (it stays latched), and then START PB1 is pressed and held. What is the state of CR1 and the lamps?**

- ✅ CR1 stays dropped out: green PL1 off, red PL2 on
- ❌ CR1 picks up: green PL1 on, red PL2 off  
  *why wrong:* The latched NC contact of PB3 is open in series with START, so the coil has no path.
- ❌ CR1 picks up, and both PL1 and PL2 are lit  
  *why wrong:* If CR1 picked up, its NC contact would open and PL2 would go dark.
- ❌ CR1 stays dropped out and both PL1 and PL2 are off  
  *why wrong:* With CR1 dropped out, its NC contact is closed, so red PL2 is lit.
Scene: `[{"do":"press","dev":"PB3"},{"do":"release","dev":"PB3"},{"do":"press","dev":"PB1"},{"do":"advance","arg":1}]` → expected `{"lit":{"PL1":false,"PL2":true},"coil":{"CR1.coil":false}}` (machine-verified against the simulator)

*Explanation:* PB3 is NC and maintained. Pressing it opens its contact and it stays that way after release. It is in series with START, so CR1 cannot energize, and its NC contact keeps red PL2 lit.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary question; no numbers from typical parameters. Book alignment pending.

---

## ch01.u2.s2-1.question.momentary-start-predict

*type* question · *book* 2.1 p.11 (toc-unverified) · *basis* general-knowledge · *alignment* provisional

**Claim (what is being checked):** A momentary START with no holding contact in the rung de-energizes CR1 as soon as it is released.

*Format* predict-state · *Day* 3

**In the reference bucket, START PB1 is pressed, held for a moment, and then released. The CR1 rung has only PB3 and PB1 in series with the coil. What is the state after release?**

- ✅ CR1 drops out: green PL1 off, red PL2 on
- ❌ CR1 stays picked up: green PL1 on, red PL2 off  
  *why wrong:* Nothing in this rung holds the coil on; the button is momentary.
- ❌ CR1 stays picked up, but red PL2 also lights  
  *why wrong:* A picked-up CR1 opens its NC contact, so PL2 could not be lit.
- ❌ CR1 drops out and both lamps are dark  
  *why wrong:* CR1's NC contact closes when it drops out, so red PL2 is lit.
Scene: `[{"do":"press","dev":"PB1"},{"do":"advance","arg":1},{"do":"release","dev":"PB1"},{"do":"advance","arg":1}]` → expected `{"lit":{"PL1":false,"PL2":true},"coil":{"CR1.coil":false}}` (machine-verified against the simulator)

*Explanation:* START is momentary and this rung has no holding contact, so releasing it removes the coil's path. A circuit that keeps the coil on after release uses a seal-in, which comes later.

*Reviewer notes (builder's doubts):* General-knowledge vocabulary question; no numbers from typical parameters. Book alignment pending.

---

