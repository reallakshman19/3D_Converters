import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);
function source(path) { return fs.readFileSync(new URL(path, ROOT), 'utf8'); }

test('AIV UI exposes pinned master package load/apply and visible master provenance', () => {
  const view = source('tabs/vibration-aiv-master-db-view.js');
  const input = source('tabs/vibration-aiv-input-view.js');
  const tab = source('tabs/vibration-aiv-qualification-tab.js');
  assert.match(view, /data-aiv-master-files/u);
  assert.match(view, /data-aiv-action="apply-master-data"/u);
  assert.match(view, /explicit project\/user values[\s\S]*\[M\][\s\S]*\[A\]/u);
  assert.match(input, /data-aiv-master-derived/u);
  assert.match(input, />\[M\]/u);
  assert.match(tab, /createAivMasterDbController/u);
  assert.match(tab, /masterDbController\.noteUserEdit/u);
});

test('AIV master resolver has no process-case or physical-distance population path', () => {
  const resolver = source('converters/vibration/aiv/aiv-master-db-resolver.js');
  for (const column of [
    'Mass Flow', 'Upstream Pressure', 'Downstream Pressure', 'Upstream Temperature',
    'Molecular Weight', 'Source State', 'Operating Case', 'Physical Distance',
    'Applicability Disposition', 'Simultaneous Source Group',
  ]) assert.doesNotMatch(resolver, new RegExp(`setBlank\\([^\\n]+['"]${column}['"]`, 'u'));
  assert.match(resolver, /processCaseValuesInvented:\s*false/u);
  assert.match(resolver, /generalTopologyDistanceInvented:\s*false/u);
  assert.match(resolver, /screeningAuthorityConferred:\s*false/u);
  assert.match(resolver, /designAuthority:\s*false/u);
});
