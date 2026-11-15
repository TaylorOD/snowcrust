import { mkdir, writeFile } from 'node:fs/promises';
import { playDelivery } from '../tests/delivery-pilot.js';

// Exercise choices through the same inputs as the player. This is model
// evidence, not a substitute for watching the corresponding browser runs.
const scenarios = [
  ['clean delivery', {}],
  ['no replacement tow', { noTow: true }],
  ['hit first barrier', { hitFirst: true }],
  ['miss both exit releases', { missExit: true }],
  ['wait fifteen seconds', { waitUntil: 15 }],
  ...[0, 100, 200, 300, 400, 500, 600, 700, 800].flatMap((releaseAt) =>
    [2, 5, 10].map((hookDelay) => [
      `release at ${releaseAt}m, wait ${hookDelay}s`,
      { releaseAt, hookDelay }
    ])
  )
];
const results = scenarios.map(([scenario, options]) => {
  const cars = new Set();
  const state = playDelivery(() => {}, {
    ...options,
    observe(s) {
      if (s.towed) cars.add(s.towId);
    }
  });
  return {
    scenario,
    arrived: state.arrived,
    seconds: +state.elapsed.toFixed(2),
    condition: state.condition,
    hits: state.hits,
    catches: state.catches,
    cars: [...cars],
    failure: state.failure
  };
});
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/delivery-audit.json', JSON.stringify(results, null, 2));
console.table(results.map(({ cars, ...result }) => ({ ...result, cars: cars.join(', ') })));
if (results.some((result) => !result.arrived)) process.exitCode = 1;
