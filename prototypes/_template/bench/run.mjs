// __CARD_ID__ benchmarks: node bench/run.mjs --root XCU=<path> --root 3DC=<path>
// One row per card benchmark (B1, B2, ...). Times are the median of 3 engine calls only.
import { timeMedian } from '../kit/core.mjs';
import { parseArgs, readBenchmark, writeResult } from '../kit/node.mjs';
import { run } from '../engine/index.mjs';

const args = parseArgs();
const rows = [];

// B1 example: replace input id, engine call and limit with the card's.
{
  const { bytes, entry } = await readBenchmark('X-SRC', args);
  const t = await timeMedian(() => run(bytes));
  rows.push({ bench: 'B1', input: entry.id, sha256: entry.sha256, bytes: t.last.bytes, ms: t.ms, limitMs: 300, pass: t.ms < 300 });
}

const doc = writeResult(rows);
console.table(doc.rows);
process.exit(rows.every(r => r.pass !== false) ? 0 : 1);
