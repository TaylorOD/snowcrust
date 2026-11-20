import { spawnSync } from 'node:child_process';
import { copyFile, writeFile } from 'node:fs/promises';
import { playDelivery } from '../tests/delivery-pilot.js';

// Local review only. The regular build never publishes these controls.
const build = spawnSync(process.execPath, ['scripts/build.js'], { stdio: 'inherit' });
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
for (const extension of ['html', 'js'])
  await copyFile(
    `tests/browser/fixtures/junction-review.${extension}`,
    `dist/junction-review.${extension}`
  );
const actions = [];
playDelivery((action) => actions.push(action));
await writeFile('dist/junction-actions.json', JSON.stringify(actions));
console.log('Open /junction-review.html to inspect both exits.');
await import('./server.js');
