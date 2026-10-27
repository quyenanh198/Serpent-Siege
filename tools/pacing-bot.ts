/** Real-game pacing check: tries per stage and total time on Standard. Usage: npx tsx tools/pacing-bot.ts */
import { runPacing } from '../src/meta/pacing';

const rows = runPacing();
for (const r of rows) {
  console.log(
    `stage ${String(r.stage).padStart(2)}: tries ${String(r.tries).padStart(2)}, at ${r.minutes} min, ranks ${JSON.stringify(r.ranks)}`,
  );
}
console.log(
  `total ${rows[rows.length - 1].minutes} min, runs ${rows.reduce((a, r) => a + r.tries, 0)}, max tries ${Math.max(...rows.map((r) => r.tries))}`,
);
