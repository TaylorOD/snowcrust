# exit review

Both junctions now have advance signs, signs at the fork and repeated pavement arrows. Green means the delivery road continues straight. Amber marks the traffic branch. The exit ramp gradually leaves the road while cars keep moving forward. Buildings, sidewalks and billboards leave room for the ramp.

The renderer lives in `src/delivery/road-junctions.js`. It builds the geometry once and moves it with route distance. `exit-ramp.js` supplies the same gradual path to the renderer and traffic. Cars merge into a narrower branch over 60 metres, then continue diagonally. The ramp shares the main road material and surface height. It never overlays the main lanes. Collision rules and the destination stay the same.

## repeat the visual check

Run `node scripts/review-junctions.js` and open `/junction-review.html` on the printed server address. The local fixture replays the existing delivery pilot through the real run model and renderer. Its checkpoint buttons are review tools and are never included in the regular build.

Inspect both approaches and both turns. Press play to continue the recorded inputs. Check the delivery arrow, the side road, the departing car and the road after the junction. Repeat at phone width and from the outside lanes.

## observed

The original curved exits below were replaced after review. They looked like broad sideways turns and used visibly different pavement. The current ramp was checked in desktop, phone portrait and phone landscape views. Replays showed both departures continuing forward on matching pavement. New tests check pavement clearance from every starting lane, heading continuity and forward traffic movement. Physical devices remain untested.

![current ramp on desktop](screenshots/ramp-right-desktop.jpg)

![current ramp on phone](screenshots/ramp-right-phone.jpg)

![current left ramp on phone](screenshots/ramp-left-phone.jpg)

### earlier exit review

1. Desktop views show separate delivery and exit signs at both junctions. The branch turns right at freight and left at through traffic.
2. The 390 by 844 phone view exposed an overly wide sign layout. Smaller panels keep both direction labels readable at the reviewed checkpoints, including the left lane at the final junction. The outer border can still reach the screen edge close to the sign.
3. Green arrows repeat through all three lanes. The destination does not depend on staying attached to the opening car.
4. The replay continued past both junctions and reached the arrival state with intact cargo. This fixture is a scene review, not a manual playthrough of the kitchen and handoff.
5. Screenshots capture desktop freight and both phone junctions. Physical phone performance and Safari remain untested here and have their own queued task.

![desktop freight exit](screenshots/freight-exit-desktop.jpg)

![phone freight exit](screenshots/freight-exit-phone.jpg)

![phone traffic exit](screenshots/traffic-exit-phone.jpg)
