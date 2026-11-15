# working on snowcrust

## start here

src/app.js creates the renderer, kitchen and city, then starts the order controller.

src/order/order.js owns the order state and frame loop. scene modules build and update meshes. UI modules update the page or handle pointer input. keep those jobs separate.

the normal flow is prep, baking, baked, pickup, running, arriving, dispatched. inspecting a slice switches between baked and sliced. reset returns to prep, including during baking, pickup, the road or handoff.

## change the pizza

src/kitchen/kitchen.js builds the pizza and shared ingredient models. ingredient-station.js uses those same models for the trays.

pizza-oven.js builds the oven. oven-motion.js owns its dimensions and loading path. browning starts after the whole pizza enters. the peel and pizza stay above the stone and fire through entry and exit.

pizza-peel.js builds the blade, collar and handle. topping-motion.js controls the small rebound when ingredients land. sauce-surface.js paints one texture shared by all slices and stops updating when the sauce settles.

toppings share geometry and materials for the life of the page. clearing an order removes meshes without disposing those shared resources. the browser checks watch GPU buffers across repeated orders.

## change delivery

src/delivery/courier.js builds the shop, rider, board, box and tow line. traffic-vehicles.js builds the car models.

courier-motion.js owns the path and timing. it uses elapsed seconds, so a slow frame or replay lands at the same pose. clearance tests cover the shop, counter and rear bumper. the box must meet the rider's hand without jumping.

delivery-session.js owns the playable road and ending. it coordinates input, sound and scenes. the order controller still owns the pizza, caller and receipt.

run-model.js is the pure simulation. it advances in steps of 1/120 second, clamps a frame to 0.25 seconds and applies each hazard once. route.js owns lane width, route length, hazard spacing and customer addresses. keep at least one reachable safe path.

tow-traffic.js owns each car's approach, reachable bumper window and signaled exit. the model and run-scene.js read the same positions. do not invent a second traffic timeline in the renderer.

run-scene.js reuses the original rider and car families. the road moves around a rider near the camera. meshes are allocated once. the longer road fog range is restored when the road hides.

arrival-set.js builds the physical doorsteps. arrival-scene.js handles parking, the carry, box transfer and camera. delivered-pizza.js clones the actual pizza and changes only slice transforms. cloned meshes share kitchen geometry and materials. removing them must not dispose those shared resources.

delivery-audio.js builds one audio graph after a user gesture. ambient gains fade on pause. short cues disconnect when finished. sound is optional and never carries information alone.

keep new street props outside both traffic lanes and the pickup route. src/scene/franchise-details.js holds the kitchen and street reference details. [WORLD.md](WORLD.md) explains their sources and the game adaptations.

## change an order

src/order/orders.js holds callers, scoring and the round clock without browser dependencies. score is matched toppings divided by requested toppings plus extras, rounded to a whole number. taking a bite subtracts 10 points. time does not change the score.

src/ui/order-ticket.js renders the caller, counts, timer and receipt. it excludes pauses and saves the first delivery result. arrival freezes that result before parking or waiting for the handoff button. later calls to finish render the saved result.

practice uses the same pizza and authored route with the elapsed time recorded at the start of skating. its condition and clock belong to the practice run. the original receipt remains unchanged. replay handoff reads that saved receipt directly.

src/ui/delivery-controls.js handles keyboard, swipe and button input. gestures are captured only on the road surface. buttons and checkbox labels must not be captured as swipes. changing tabs pauses the run. order-view.js updates the controls and delivery steps. pizza-input.js handles turning and topping placement.

src/order/recipe.js validates old recipe links. a valid link replaces the pizza and resets its position. a broken link leaves the current order alone.

## tests and build

unit tests live in tests/unit. they cover scores, motion, safe tow windows, collision recovery and cloning the real pizza without changing the kitchen.

browser tests live in tests/browser. browser-check.js covers the original kitchen and pickup. delivery-check.js covers a manual run, keyboard and touch input, pause, replay and practice. arrival-check.js cycles every caller and checks that repeated deliveries reuse GPU buffers. audio-check.js checks actual browser audio gains and graph reuse.

tests use a paused clock for animation checks. delivery tests advance it in 250ms increments so every movement step still runs. skipping a whole minute in one frame would only simulate the bounded frame, not the route.

scripts/run-browser-tests.js builds the site and starts its own server. screenshot output goes in artifacts/screenshots, not in the source tree. GitHub uploads that folder even when checks fail.

docs/screenshots keeps earlier PR evidence. it is an archive, not a visual baseline. new test runs do not overwrite it.

scripts/build.js replaces the generated dist folder and copies all of src. adding a source module does not need another entry in a build list. keep imports relative so the site works under /snowcrust/.

the minimatch override is for the development tools. it is not shipped with the site.
