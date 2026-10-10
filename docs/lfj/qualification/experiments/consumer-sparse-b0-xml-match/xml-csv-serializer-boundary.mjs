/**
 * H04 research-only CSV call boundary. Both real serializers are injected by
 * the existing XML adapter, unchanged. Tests can count their actual calls.
 * Neither callback is entered until source census and independent XML
 * semantics agree with the Resolver ledger. This is NOT product export.
 */
import {assertResearchXmlConsumerPopulation} from './xml-input-integrity.mjs';
import {assertResearchXmlSemanticLedger} from './xml-semantic-attestor.mjs';

export function generateAttestedResearchCsv({
  xmlText,originalXmlPopulation,result,records,
  buildNodeCsv,buildEvidenceCsv
}={}){
  assertResearchXmlConsumerPopulation(originalXmlPopulation,records.length);
  assertResearchXmlSemanticLedger(
    xmlText,result.traceResolutionLedger.nodes,records);
  // Preserve the previous order and exact arguments for the two real CSV
  // serializers. Do not invoke either on ANY failed pre-CSV attestation.
  const nodeCsv=buildNodeCsv(result);
  const evidenceCsv=buildEvidenceCsv(result);
  return {nodeCsv,evidenceCsv};
}
