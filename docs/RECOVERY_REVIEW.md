# collision and recovery review

Issue 71 makes a hit explain what happened and what still works.

The notice shows the cause and actual cargo change. A short edge highlight marks the impact without flashing over the road. The protection bar shows the existing 1.2 second period when another hit cannot remove cargo. Steering and firing remain available during protection. The notice distinguishes a ready poon, rearming, a shot in flight and an attached tow.

Solid obstacles still stop the rider. Their escape instruction stays visible after protection ends. Moving clear removes the stale blocked message. Tow guidance also avoids recommending a lane with a nearby obstacle.

## outcomes

| check                            | outcome                                                                              | assessment                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| center barrier                   | manual impact showed 100% to 65%, protection and jump or steer                       | cause, loss and available action agree                             |
| steering during protection       | moved right immediately, then caught a replacement tow with protection still active  | recovery does not imply an input lock                              |
| left parked car                  | manual impact and move right cleared the car with 65% cargo                          | the damage does not repeat while touching the same object          |
| right roadworks                  | manual impact and move left cleared the lane                                         | tow advice must not send the rider back into that obstruction      |
| beam                             | manual crouch after stopping cleared the beam with 65% cargo                         | duck remains a useful recovery action                              |
| pause and restart                | pause hid recovery, restart restored 100% and removed the old notice                 | state does not leak into a new run                                 |
| missed exit release              | showed 100% to 85% alongside the straight ahead instruction                          | destination remains independent of the departing tow               |
| reduced motion                   | inspected a beam impact with reduced motion enabled                                  | text and protection remain, edge highlight is absent               |
| repeated hits and failure        | model tests covered separate hits down to zero cargo, frozen failure and fresh retry | damage uses the actual remaining cargo, not a fixed displayed loss |
| completed delivery after a crash | desktop and mobile browser checks reached the customer with 65/100 cargo             | a crash does not make the route unwinnable                         |

## visual review

Reviewed Chrome at 1440 by 900, 390 by 844, 320 by 568 and 844 by 390 before pushing.

The first short phone layout covered the rider. The notice now uses the space above the road on short portrait screens. The exit warning gets a compact layout when both notices are present. Normal portrait and desktop views keep recovery above the controls. Landscape keeps it beside the rider.

Review also caught stale blocked text after steering clear, and a tow hint pointing back into nearby roadworks. Both were fixed and covered by tests.

## validation and limits

Unit checks cover traffic hits in all three lanes, continued contact, protected contact with another solid obstacle, separate damage events, failure, retry, hook readiness, pause, guidance and a completed route after an early crash. Browser checks cover the visible notice, usable steering, failure, retry and a recorded recovery route through the actual delivery page to the receipt.

Focused visual checks use the local review page and time stepping through the real model and renderer. The completed browser delivery uses recorded inputs. This is not a claim of a complete manual playthrough. The phone sizes are browser viewports, not physical phones. Physical phone testing remains issue 73.

Jump startup and collision timing are unchanged. A late jump can still hit before the board is high enough. The impact now identifies the barrier and explains how to get clear.

Run `node scripts/review-junctions.js` and open `/junction-review.html` for repeatable encounters. The review controls are excluded from the normal build.
