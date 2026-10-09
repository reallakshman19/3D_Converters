/**
 * #1147 B0-08 — authentic original 10.23 MB source + topology XML,
 * whole Resolver ledger and BOTH exact engineering CSV byte-oracles.
 * Node-only source-level research; a whole JSON.parse here is TEST-ONLY.
 * A negative/zero-match pair is never substituted for positive FirstpassXML.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {slimSourceFromOriginal} from './original-source-slim-fixture.mjs';
import {runStandaloneResolverJsonTrace} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js';
import {buildEvidenceTreeCsv,buildXmlNodeWiseTraceCsv} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-trace-export.js';

const sourcePath='Benchmarks/1885_NC/1885_NC.json';
const xmlPath='Benchmarks/1885_NC/1885_NC.topology.input.xml';
const SOURCE_SHA='89f9c2ab7a9f1df15c1b9e1e0e30a8ca6c97ef994dcd56aec86c3a90f7d71646';
const XML_SHA='516f61dce7074dcf55b3c43325612141c1b7c2fb006b6f6b67d07f112f88f8a2';
const sha=data=>createHash('sha256').update(data).digest('hex');
const counts=rows=>rows.reduce((out,row)=>
  (out[row.status]=(out[row.status]||0)+1,out),{});

const started=performance.now();
const sourceBytes=await readFile(sourcePath);
assert.equal(sourceBytes.length,10232634,'original 10 MB byte census drift');
assert.equal(sha(sourceBytes),SOURCE_SHA,'original 10 MB SHA drift');
const xmlBytes=await readFile(xmlPath);
assert.equal(xmlBytes.length,1067628,'authentic XML byte census drift');
assert.equal(sha(xmlBytes),XML_SHA,'authentic XML SHA drift');

const original=JSON.parse(sourceBytes.toString('utf8'));
const xmlText=xmlBytes.toString('utf8'),config={};
const sliced=slimSourceFromOriginal(original,config);
assert.equal(sliced.facts,4320,'complete original engineering fact census drift');

const legacy=runStandaloneResolverJsonTrace({
  sourceKind:'xml',sourceText:xmlText,stagedJsonText:original,jsonConfig:config
});
const sparse=runStandaloneResolverJsonTrace({
  sourceKind:'xml',sourceText:xmlText,stagedJsonText:sliced.branches,jsonConfig:config
});
const originalLedger=legacy.traceResolutionLedger.records;
const sparseLedger=sparse.traceResolutionLedger.records;
assert.equal(originalLedger.length,3429,'authentic large XML node census drift');
assert.deepEqual(counts(originalLedger),{UNRESOLVED:3429},
  'authentic 1885_NC pairing is a verified all-unresolved NEGATIVE test');
assert.deepEqual(sparseLedger,originalLedger,
  'sparse normalized source changes real XML matching/evidence rows');

const nodeCsv=buildXmlNodeWiseTraceCsv(legacy),
  sparseNodeCsv=buildXmlNodeWiseTraceCsv(sparse);
const evidenceCsv=buildEvidenceTreeCsv(legacy),
  sparseEvidenceCsv=buildEvidenceTreeCsv(sparse);
assert.equal(sparseNodeCsv,nodeCsv,'large original Node-wise CSV mismatch');
assert.equal(sparseEvidenceCsv,evidenceCsv,'large original Evidence Tree CSV mismatch');
assert.equal(Buffer.byteLength(evidenceCsv,'utf8'),103,
  'authentic large negative pair should have evidence header only');
assert.equal(Buffer.byteLength(nodeCsv,'utf8'),180840,
  'authentic large node-wise source-golden bytes changed');

console.log('LFJ_B0_LARGE_AUTHENTIC_SOURCE_PARITY_PASS '+JSON.stringify({
  schema:'LFJ.B0.LargeAuthenticSourceParity.v1',
  sourcePath,sourceBytes:sourceBytes.length,sourceSha256:SOURCE_SHA,
  xmlPath,xmlBytes:xmlBytes.length,xmlSha256:XML_SHA,
  branchRoots:sliced.branches.length,sourceFacts:sliced.facts,
  sourceDomainObjects:sliced.sourceObjects,xmlNodes:originalLedger.length,
  matchedXmlNodes:originalLedger.filter(r=>r.status.startsWith('RESOLVED_')).length,
  statuses:counts(originalLedger),
  completeLedgerSha256:sha(JSON.stringify(originalLedger)),
  nodeWiseCsvSha256:sha(nodeCsv),evidenceTreeCsvSha256:sha(evidenceCsv),
  nodeWiseCsvBytes:Buffer.byteLength(nodeCsv,'utf8'),
  evidenceTreeCsvBytes:Buffer.byteLength(evidenceCsv,'utf8'),
  sourceTestElapsedMs:performance.now()-started,
  nodeHeapUsedBytes:process.memoryUsage().heapUsed,
  fixturePurpose:'REAL_NEGATIVE_PARITY_ONLY',
  sourceOnly:true,engineeringReady:false,chromiumWorkerQualified:false,
  deployedBuildQualified:false,authentic30MBQualified:false
}));
