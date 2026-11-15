# delivery spec

make a pizza, watch the kourier collect it, then ride a fast three lane delivery to a real customer ending. the road should reward steering, jumping, ducking and changing tows. losing one car must never lose the destination.

this is the acceptance spec for the current route. the earlier review described what shipped, but did not define enough failure and recovery checks. use this document to judge changes. use [the interaction audit](INTERACTION_AUDIT.md) for actual results and limits.

## the run

| part             | required behavior                                                                     |
| ---------------- | ------------------------------------------------------------------------------------- |
| pickup           | show the approach, cargo collection, hook flight and pull away before changing camera |
| first car        | enter the playable road attached to that car, already moving                          |
| steering         | three lanes, one press or swipe per lane, with a readable transition                  |
| tow control      | steering stays with the player while the car supplies speed                           |
| jump and duck    | clear their matching obstacles, with visible poses and room for the carried box       |
| traffic          | travel forward, keep physical clearance and hold a fast pace instead of queueing      |
| sustained towing | a clean run must allow at least 18 seconds on one car                                 |
| release          | a separate input cuts the line and retains momentum                                   |
| catch            | a reachable bumper gets a marker, hook flight takes time and a miss stays a miss      |
| recovery         | collisions can cost cargo and momentum, but a safe input must free the rider          |
| destination      | fixed world distance and customer address, independent of every car identity          |
| exits            | show direction, distance and the correct delivery direction before the junction       |
| late release     | show the car turning before cutting the line and applying damage                      |
| roadside props   | anything that looks interactive needs a purpose. no loose boxes that resemble pickups |
| ending           | brake into the correct doorstep, park, then let the player hand over the actual pizza |
| receipt          | keep topping accuracy, delivery time and cargo condition separate                     |

## current tuning

| setting                 | value                                          |
| ----------------------- | ---------------------------------------------- |
| route                   | 960 metres                                     |
| road limit              | 90 seconds                                     |
| normal traffic cruise   | 20 metres per second, shown as 72 km/h         |
| free skating            | 14 metres per second, shown as 50 km/h         |
| lane transition         | 0.18 seconds                                   |
| freight exit            | 430 metres, right                              |
| through traffic exit    | 910 metres, left                               |
| delivery direction      | straight through both junctions                |
| exit warning            | starts 120 metres before the junction          |
| late release            | 15 cargo points after the visible turn         |
| obstacle or traffic hit | 35 cargo points with a short protection period |
| approach                | final 20 metres slow into the forecourt        |

these speeds are arcade tuning. do not turn the road into a traffic queue to make them physically realistic. traffic contact still needs to prevent cars and the rider passing through one another.

## recovery contract

1. finish with no replacement tow after releasing the opening car.
2. finish after hitting the first barrier and taking a safe recovery action.
3. finish after fifteen seconds of hesitation at the opening barrier.
4. finish after a release at every 100 metre mark from 0 through 800, with a 2, 5 or 10 second wait before trying another hook.
5. missing both exit releases costs cargo but does not erase the route.
6. doing nothing can still fail. zero cargo or the road timer ends the run and offers retry.
7. retry keeps the pizza. practice after delivery keeps the original receipt.

these are repeatable acceptance scenarios, not a promise that every sequence of mistakes is survivable.

## controls and presentation

keyboard, touch buttons and all four swipe directions need to work. pause must freeze the road and order clock. resuming or rotating the screen must keep the rider and controls visible. sound starts off. slower road removes damage and labels the result as assisted. automatic delivery skips the playable road but keeps the ending.

review the actual animation on desktop, phone portrait and phone landscape. inspect pickup, a sustained tow, both junctions, a collision, recovery, failure, retry and the customer handoff. screenshots belong in every PR, but screenshots alone do not prove motion works.

## world and art

Snowcrust is the project. C0saN0stra Pizza is the restaurant. keep the existing kitchen, vehicle families, RadiKS kourier, smart box and franchise city style. the pizza and box must remain recognizable across every scene. use the [world guide](WORLD.md) for references.

this route uses the setting as a game adaptation. the customer calls are original dialogue. it is not a literal map or recreation of a passage from the novel.

## release bar

run lint, formatting, unit tests, the recovery audit and the browser suites. review the changed scene in a browser before pushing. fix a failed acceptance row before calling that part complete. record untested devices and interactions as untested.

one clean run does not establish that the game meets this spec. neither does a passing test count. the [interaction audit](INTERACTION_AUDIT.md) keeps the evidence and the remaining gaps together.
