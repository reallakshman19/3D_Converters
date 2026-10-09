/**
 * B0-09 — fail-closed XML population gate for the real research Resolver.
 * Negative matched-status counts are valid only after a complete XML census.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runStandaloneResolverJsonTrace} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js';
import {assertCompleteResearchXmlLedger} from './xml-csv-parity.mjs';

const xml=await readFile('Benchmarks/1885Sjson/FirstpassXML','utf8');
const original=runStandaloneResolverJsonTrace({
  sourceKind:'xml',sourceText:xml,stagedJsonText:[],jsonConfig:{}
});
const rows=assertCompleteResearchXmlLedger(original);
assert.equal(rows.length,216,'original authentic Firstpass XML parser census');
assert.ok(rows.every(x=>x.status==='UNRESOLVED'),
  'test intentionally supplies no source JSON: matching is not qualified');
const reject=(result,scenario)=>assert.throws(
  ()=>assertCompleteResearchXmlLedger(result),
  error=>error?.code==='XML_LEDGER_CENSUS',
  scenario+' must reject before any CSV SHA is produced');

const withoutRecords={...original,traceResolutionLedger:{
  ...original.traceResolutionLedger,records:[]}};
reject(withoutRecords,'empty ledger despite parsed XML nodes');

const withoutNode={...original,traceResolutionLedger:{
  ...original.traceResolutionLedger,records:rows.slice(0,-1)}};
reject(withoutNode,'incomplete ledger despite 216 parsed XML nodes');

const reidentified={...original,traceResolutionLedger:{
  ...original.traceResolutionLedger,records:rows.map((row,i)=>
    i===5?{...row,xmlIndex:999}:row)}};
reject(reidentified,'source occurrence identity replacement');

const wrongParserCount={...original,indexStats:{
  ...original.indexStats,xmlNodeCount:215}};
reject(wrongParserCount,'wrong authoritative XML population');

const invalid=runStandaloneResolverJsonTrace({
  sourceKind:'xml',sourceText:'<CAESARII><UNFINISHED',
  stagedJsonText:[],jsonConfig:{}
});
reject(invalid,'nonempty but unparseable XML');

assert.equal(assertCompleteResearchXmlLedger(original),rows,
  'genuine all-unresolved results must remain acceptable');

console.log('LFJ_B0_09_XML_LEDGER_CENSUS_GUARD_PASS '+JSON.stringify({
  schema:'LFJ.B0.XmlLedgerCensusGuard.v1',
  authenticFirstpassXmlNodes:rows.length,
  verifiedEmptySourceMatching:'ALL_UNRESOLVED_NOT_XML_EMPTY',
  rejectedCases:5,
  noProductionChanges:true,
  noBrowserClaim:true
}));
