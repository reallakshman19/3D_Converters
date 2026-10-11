import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {slimSourceFromOriginal} from '../../lfj/qualification/experiments/consumer-sparse-b0-xml-match/original-source-slim-fixture.mjs';
import {ORIGINAL_B0_OUTPUT_GOLDENS_V1} from '../../lfj/qualification/experiments/consumer-sparse-b0-xml-match/authentic-original-output-goldens.mjs';
import {runStandaloneResolverJsonTrace} from '../../tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js';
import {buildBoundedOriginalXmlSourceFacts} from '../../lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-source-fact-handoff.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');

test('212-T5: genuine original Firstpass ordered ledger creates complete bounded source-only Preview facts',async()=>{
  const golden=ORIGINAL_B0_OUTPUT_GOLDENS_V1.firstpass;
  const jb=await readFile(new URL('../../Benchmarks/1885Sjson/Sjson.json',import.meta.url));
  const xb=await readFile(new URL('../../Benchmarks/1885Sjson/FirstpassXML',import.meta.url));
  assert.equal(jb.length,golden.jsonBytes);
  assert.equal(sha(jb),golden.jsonSha256);
  assert.equal(sha(xb),golden.xmlSha256);
  const slice=slimSourceFromOriginal(JSON.parse(jb.toString('utf8')),{});
  const result=runStandaloneResolverJsonTrace({sourceKind:'xml',sourceText:xb.toString('utf8'),
    stagedJsonText:slice.branches,jsonConfig:{}});
  assert.equal(sha(JSON.stringify(result.traceResolutionLedger.records)),golden.ledgerSha256);
  const fact=buildBoundedOriginalXmlSourceFacts(result.traceResolutionLedger.records);
  assert.equal(fact.available,true,
    'authenticated source-only Preview fact transport must cover every resolved original occurrence: '+fact.code);
  assert.equal(fact.records.length,golden.xmlNodes);
  assert.equal(fact.matchedCount,golden.matchedXmlNodes);
  assert.deepEqual(fact.records.map(r=>r.xmlIndex),Array.from({length:golden.xmlNodes},(_,i)=>i+1));
  assert.equal(fact.records.filter(r=>r.status.startsWith('RESOLVED_')&&r.sourcePaths.length===0).length,0);
  assert.equal(fact.records.filter(r=>r.status==='UNRESOLVED').length,golden.statuses.UNRESOLVED);
  assert.equal(fact.bytes<=8*1024*1024,true);
});
