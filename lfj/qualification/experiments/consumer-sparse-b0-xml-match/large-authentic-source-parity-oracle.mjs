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
import {ORIGINAL_B0_OUTPUT_GOLDENS_V1} from './authentic-original-output-goldens.mjs';
import {runStandaloneResolverJsonTrace} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js';
import {buildEvidenceTreeCsv,buildXmlNodeWiseTraceCsv} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-trace-export.js';

const sourcePath='Benchmarks/1885_NC/1885_NC.json';
const xmlPath='Benchmarks/1885_NC/1885_NC.topology.input.xml';
const ORIGINAL_GOLDEN=ORIGINAL_B0_OUTPUT_GOLDENS_V1.largeNegative;
const SOURCE_SHA=ORIGINAL_GOLDEN.jsonSha256;
const XML_SHA=ORIGINAL_GOLDEN.xmlSha256;
const sha=data=>createHash('sha256').update(data).digest('hex');
const counts=rows=>rows.reduce((out,row)=>
  (out[row.status]=(out[row.status]||0)+1,out),{});

const started=performance.now();
const sourceBytes=await readFile(sourcePath);
assert.equal(sourceBytes.length,ORIGINAL_GOLDEN.jsonBytes,'original 10 MB byte census drift');
assert.equal(sha(sourceBytes),SOURCE_SHA,'original 10 MB SHA drift');
const xmlBytes=await readFile(xmlPath);
assert.equal(xmlBytes.length,ORIGINAL_GOLDEN.xmlBytes,'authentic XML byte census drift');
assert.equal(sha(xmlBytes),XML_SHA,'authentic XML SHA drift');

const original=JSON.parse(sourceBytes.toString('utf8'));
const xmlText=xmlBytes.toString('utf8'),config={};
const sliced=slimSourceFromOriginal(original,config);
assert.equal(sliced.branches.length,ORIGINAL_GOLDEN.sourceRoots,
  'complete root-branch count drift');
assert.equal(sliced.facts,ORIGINAL_GOLDEN.sourceFacts,
  'complete original engineering fact census drift');
assert.equal(sliced.sourceObjects,ORIGINAL_GOLDEN.sourceDomainObjects,
  'complete original-domain occurrence count drift');

const legacy=runStandaloneResolverJsonTrace({
  sourceKind:'xml',sourceText:xmlText,stagedJsonText:original,jsonConfig:config
});
const sparse=runStandaloneResolverJsonTrace({
  sourceKind:'xml',sourceText:xmlText,stagedJsonText:sliced.branches,jsonConfig:config
});
const originalLedger=legacy.traceResolutionLedger.records;
const sparseLedger=sparse.traceResolutionLedger.records;
assert.equal(originalLedger.length,ORIGINAL_GOLDEN.xmlNodes,
  'authentic large XML node census drift');
assert.deepEqual(counts(originalLedger),ORIGINAL_GOLDEN.statuses,
  'authentic 1885_NC pairing is a verified all-unresolved NEGATIVE test');
assert.deepEqual(sparseLedger,originalLedger,
  'sparse normalized source changes real XML matching/evidence rows');

const nodeCsv=buildXmlNodeWiseTraceCsv(legacy),
  sparseNodeCsv=buildXmlNodeWiseTraceCsv(sparse);
const evidenceCsv=buildEvidenceTreeCsv(legacy),
  sparseEvidenceCsv=buildEvidenceTreeCsv(sparse);
assert.equal(sparseNodeCsv,nodeCsv,'large original Node-wise CSV mismatch');
assert.equal(sparseEvidenceCsv,evidenceCsv,'large original Evidence Tree CSV mismatch');
// Fixed pinned-original hashes prevent correlated legacy+sparse output drift.
assert.equal(sha(JSON.stringify(originalLedger)),ORIGINAL_GOLDEN.ledgerSha256,
  'immutable original 10MB full ledger SHA-256 drift');
assert.equal(sha(nodeCsv),ORIGINAL_GOLDEN.nodeWiseCsvSha256,
  'immutable original 10MB Node-wise CSV SHA-256 drift');
assert.equal(sha(evidenceCsv),ORIGINAL_GOLDEN.evidenceTreeCsvSha256,
  'immutable original 10MB Evidence Tree CSV SHA-256 drift');
assert.equal(Buffer.byteLength(evidenceCsv,'utf8'),
  ORIGINAL_GOLDEN.evidenceTreeCsvBytes,
  'authentic large negative pair should have evidence header only');
assert.equal(Buffer.byteLength(nodeCsv,'utf8'),
  ORIGINAL_GOLDEN.nodeWiseCsvBytes,
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
