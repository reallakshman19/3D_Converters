import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  runTopoEnrichedXmlProduction,
  serializeProductionResult,
} from '../../../../tabs/stagedjson-to-enrichxml/production/topo-enriched-xml-production.js';

const requestedWriter = String(process.argv[2] || 'CANONICAL').toUpperCase();
if (!['CANONICAL', 'SEQUENTIAL'].includes(requestedWriter)) {
  throw new Error(`Unsupported requested writer: ${requestedWriter}`);
}
const fixtureUrl = new URL('../production/production-fixture.mjs', import.meta.url);
let source = await readFile(fixtureUrl, 'utf8');
source = source.replace(/from '([^']+)'/g, (match, specifier) => {
  if (!specifier.startsWith('.')) return match;
  return `from '${new URL(specifier, fixtureUrl).href}'`;
});
const componentLine = "      { sourceEntityId: 'SE-FLAN', sourceBranch: '/LINE-B/B1' },\n";
const recordLine = "    record('SE-FLAN', 'FLAN', 'FLANGE-1', { POS: point(300) }),\n";
if (!source.includes(componentLine) || !source.includes(recordLine)) {
  throw new Error('Accepted TE-013 production fixture shape changed.');
}
source = source.replace(componentLine, '').replace(recordLine, '');
const directory = await mkdtemp(join(tmpdir(), 'te014-remediation-fixture-'));
const modulePath = join(directory, 'production-fixture-remediation.mjs');
try {
  await writeFile(modulePath, source, 'utf8');
  const { makeProductionFixture } = await import(`${pathToFileURL(modulePath).href}?v=1`);
  const input = await makeProductionFixture({ requestedWriter });
  const result = await runTopoEnrichedXmlProduction(input);
  if (result.validation.status !== 'PASS' || !result.productionBundle) {
    throw new Error(`TE-013 remediation fixture failed: ${JSON.stringify(result.validation)}`);
  }
  process.stdout.write(serializeProductionResult(result));
} finally {
  await rm(directory, { recursive: true, force: true });
}
