# obstacle review

Issue 70 makes the road easier to read. Collision timing and traffic speed stay the same.

Jump barriers are low amber hurdles with dark stripes. Duck beams have an open floor and a cyan overhead bar. Roadworks are a tall closed fence with a red X. Parked cars have a red warning and rear hazard lights. The loose dispatch boxes are gone.

Raised markers identify the nearest hazard in each lane from 60 metres away. Their size compensates for distance so cars do not hide the instruction. Text, arrows and silhouettes carry the meaning without relying on color. Tow confirmations no longer override an approaching hazard instruction. Damage and exit instructions still take priority.

## what I checked

Reviewed Chrome at 1440 by 900, 390 by 844 and 844 by 390. The local review page uses the real renderer, controls and collision model. Focused encounters start 35 metres before each obstacle with the rider in that lane and no tow. Traffic keeps its replayed position.

| interaction     | result                                                                   | what it tells us                                                                |
| --------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| jump barrier    | manual jump about nine metres before the barrier cleared with 100% cargo | low silhouette and upward marker agree with the action                          |
| late jump       | jumping about five metres before contact hit the barrier                 | startup timing still matters and needs attention in the collision feedback work |
| duck beam       | manual crouch cleared with 100% cargo                                    | open floor and downward marker show where to go                                 |
| roadworks       | manual move left passed with 100% cargo                                  | tall fence and X communicate a closed lane                                      |
| parked car      | manual move right passed with 100% cargo                                 | warning identifies stationary traffic before contact                            |
| opening tow     | recorded inputs cleared the first hurdle and beam with 100% cargo        | warning stays visible over the tow car and the tow message does not hide it     |
| phone portrait  | all four types reviewed at approach distance                             | markers can be read without waiting for the obstacle to fill the screen         |
| phone landscape | roadworks and controls reviewed                                          | scene remains visible, but distant text is smaller in the short view            |

The first marker design was too small on a phone. It was replaced with larger text and distance scaling before this review passed. Review also caught a parked car retaining its source scene position. The cloned model now resets its position and rotation before placement.

## automated checks

Tests cover advance warning for every route hazard, one warning per lane, removal after passing, guidance priority, and correct and incorrect responses for all four obstacle types. Existing delivery tests cover sustained towing, recovery and arrival. Browser suites cover the kitchen, delivery, arrival and audio.

## limits

These are browser viewports, not physical phones. The focused manual checks use time stepping to inspect contact. The opening sequence uses recorded inputs. Neither is a claim of a complete manual playthrough or a physical phone performance test.

The warning tells you what is coming. It does not mean jump immediately when it appears. Late jump feedback belongs to issue 71. Physical phone testing remains issue 73.

For repeatable review, run `node scripts/review-junctions.js` and open `/junction-review.html`. Choose jump barrier, duck beam, roadworks or parked car. Step forward and use the normal controls. These review controls are excluded from the normal build.
