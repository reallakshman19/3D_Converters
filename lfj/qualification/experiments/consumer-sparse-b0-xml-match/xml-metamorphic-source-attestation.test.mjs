/**
 * #161 H05 deterministic metamorphic source attestation — AUTHOR TESTS ONLY.
 * Never rewrite originals or recalculate protected engineering CSV goldens.
 * Valid XML edits must preserve ordered XML source semantics; malicious
 * edits must fail the same pre-CSV boundary actually used by the research
 * Worker (no node-wise or evidence-tree CSV serializer callbacks entered).
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ORIGINAL_B0_OUTPUT_GOLDENS_V1 as goldens}
  from './authentic-original-output-goldens.mjs';
import {parseStandaloneDtxrXmlNodes} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js';
import {assertResearchXmlDocument} from './xml-input-integrity.mjs';
import {generateAttestedResearchCsv} from './xml-csv-serializer-boundary.mjs';

const loadOriginal=spec=>{
  const bytes=readFileSync(new URL('../../../../'+spec.xmlPath,import.meta.url));
  assert.equal(bytes.length,spec.xmlBytes,'original XML byte custody '+spec.xmlPath);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    spec.xmlSha256,'original XML SHA-256 custody '+spec.xmlPath);
  return bytes.toString('utf8');
};
const first=loadOriginal(goldens.firstpass);
const originalSmallPath='Benchmarks/1885Sjson/ExpectedXML';
const smallBytes=readFileSync(new URL('../../../../'+originalSmallPath,import.meta.url));
assert.equal(smallBytes.length,156060,'original SMALL XML byte custody');
assert.equal(createHash('sha256').update(smallBytes).digest('hex'),
  '9ec2cd0215a69d016f54839ece9965e744834c761f2993d663d0c895b6c1b8d5',
  'original SMALL XML SHA-256 custody');
const small=smallBytes.toString('utf8');

function replaceOnce(source,from,to,label){
  assert.ok(source.includes(from),'missing pinned mutation anchor '+label);
  const changed=source.replace(from,to);
  assert.notEqual(changed,source,'mutation must actually change XML '+label);
  return changed;
}
function execute(xml){
  let nodeCsvCalls=0,evidenceCsvCalls=0;
  const callbackNode=()=>{nodeCsvCalls++;return 'NODE_OUTPUT_SENTINEL';};
  const callbackEvidence=()=>{evidenceCsvCalls++;return 'EVIDENCE_OUTPUT_SENTINEL';};
  try{
    const population=assertResearchXmlDocument(xml);
    const nodes=parseStandaloneDtxrXmlNodes(xml);
    const records=nodes.map(n=>({...structuredClone(n),
      nodeNumber:n.xmlNodeNumber,nodeName:n.xmlNodeName}));
    const result={traceResolutionLedger:{nodes,records}};
    const csv=generateAttestedResearchCsv({
      xmlText:xml,originalXmlPopulation:population,result,records,
      buildNodeCsv:callbackNode,buildEvidenceCsv:callbackEvidence
    });
    return {code:'SUCCESS',nodes,csv,nodeCsvCalls,evidenceCsvCalls};
  }catch(error){
    return {code:error.code||'UNKNOWN',message:String(error.message),
      nodeCsvCalls,evidenceCsvCalls};
  }
}
const semanticRows=nodes=>nodes.map(n=>({
  xmlIndex:n.xmlIndex,xmlNodeNumber:n.xmlNodeNumber,
  xmlNodeName:n.xmlNodeName,componentType:n.componentType,
  componentRefNo:n.componentRefNo,xmlBranch:n.xmlBranch,
  xmlPosition:n.xmlPosition,xmlPoint:n.xmlPoint,psKey:n.psKey
}));
function acceptedUnchanged(name,before,after,expected){
  test('H05 metamorphic identity: '+name,()=>{
    const baseline=execute(before),changed=execute(after);
    assert.equal(baseline.code,'SUCCESS',name+' original: '+baseline.message);
    assert.equal(changed.code,'SUCCESS',name+' variant: '+changed.message);
    assert.equal(changed.nodes.length,expected);
    assert.deepEqual(semanticRows(changed.nodes),semanticRows(baseline.nodes),
      name+': full ordered source semantics changed');
    assert.deepEqual([baseline.nodeCsvCalls,baseline.evidenceCsvCalls],[1,1]);
    assert.deepEqual([changed.nodeCsvCalls,changed.evidenceCsvCalls],[1,1]);
  });
}
function rejected(name,xml,expectedCodes){
  test('H05 metamorphic fail-closed: '+name,()=>{
    const result=execute(xml);
    assert.ok(expectedCodes.includes(result.code),
      name+': expected '+expectedCodes.join('/')+', got '+
      result.code+' '+result.message);
    assert.equal(result.nodeCsvCalls,0,'node CSV invoked on rejected '+name);
    assert.equal(result.evidenceCsvCalls,0,'evidence CSV invoked on rejected '+name);
  });
}
const firstBranch=first.match(/<Branchname>[\s\S]*?<\/Branchname>/)?.[0];
const firstPosition=first.match(/<Position>[\s\S]*?<\/Position>/)?.[0];
assert.ok(firstBranch&&firstPosition,'firstpass original mutation anchors');
const firstNodeNumber='<NodeNumber>10</NodeNumber>';
assert.ok(first.includes(firstNodeNumber),'source NodeNumber 10 anchor');
const secondBranch=([...first.matchAll(/<Branchname>[\s\S]*?<\/Branchname>/g)])[1]?.[0];
assert.ok(secondBranch,'need two authentic branches');

acceptedUnchanged('firstpass-benign-header-comment',first,
  replaceOnce(first,'<Pipe>','<Pipe><!-- H05 neutral -->','firstpass Pipe'),216);
acceptedUnchanged('firstpass-benign-node-comment',first,
  replaceOnce(first,'<Node>','<Node><!-- H05 neutral -->','firstpass Node'),216);
acceptedUnchanged('firstpass-node-processing-instruction',first,
  replaceOnce(first,'<Node>','<Node><?h05 neutral?>','firstpass Node PI'),216);
acceptedUnchanged('firstpass-terminal-lineno-metadata',first,
  replaceOnce(first,'</Branch>',
    '<LineNo>H05-AUXILIARY-NOT-BRANCH-ID</LineNo></Branch>',
    'firstpass terminal LineNo'),216);
acceptedUnchanged('firstpass-xml-quot-entity-equivalence',first,
  replaceOnce(first,'&quot;','"','firstpass escaped quotation'),216);
acceptedUnchanged('firstpass-node-number-whitespace',first,
  replaceOnce(first,firstNodeNumber,
    '<NodeNumber> 10 </NodeNumber>','firstpass scalar trim'),216);
acceptedUnchanged('small-benign-header-comment',small,
  replaceOnce(small,'<Pipe>','<Pipe><!-- H05 neutral -->','small Pipe'),174);
acceptedUnchanged('small-node-processing-instruction',small,
  replaceOnce(small,'<Node>','<Node><?h05 neutral?>','small Node PI'),174);
acceptedUnchanged('small-branch-terminal-lineno-preserved',small,
  replaceOnce(small,'<LineNo>S8811956</LineNo>',
    '<!-- H05 metadata neutral --><LineNo>S8811956</LineNo>',
    'small real trailing LineNo'),174);

rejected('missing-authentic-second-branchname',
  replaceOnce(first,secondBranch,'','missing second source branch'),
  ['XML_SEMANTIC_DOCUMENT_INVALID']);
rejected('duplicate-authentic-first-branchname',
  replaceOnce(first,firstBranch,firstBranch+firstBranch,'duplicate first branch'),
  ['XML_SEMANTIC_DOCUMENT_INVALID']);
rejected('metadata-shadow-branchname',
  replaceOnce(first,'<Node>',
    '<Metadata><Branchname>FAKE-SHADOW</Branchname></Metadata><Node>',
    'shadow nested branch'),['XML_SEMANTIC_DOCUMENT_INVALID']);
rejected('four-numbers-in-authentic-position',
  replaceOnce(first,firstPosition,
    '<Position>1 2 3 999</Position>','ambiguous XML position'),
  ['XML_SEMANTIC_DOCUMENT_INVALID']);
rejected('numeric-entity-source-node',
  replaceOnce(first,firstNodeNumber,'<NodeNumber>&#49;0</NodeNumber>',
    'numeric-entity parser mismatch'),['XML_SEMANTIC_MISMATCH']);
rejected('new-unnamed-sibling-branch',
  replaceOnce(first,'</Pipe>',
    '<Branch><Node><NodeNumber>99999</NodeNumber>'+
    '<Position>1 2 3</Position></Node></Branch></Pipe>',
    'unnamed sibling branch'),['XML_SEMANTIC_DOCUMENT_INVALID']);
rejected('midbranch-lineno-cannot-override-existing-primary',
  replaceOnce(first,'</Node>','</Node><LineNo>FAKE-MIDBRANCH</LineNo>',
    'late secondary branch label'),['XML_SEMANTIC_MISMATCH']);
rejected('small-authentic-lineno-as-primary-after-missing-name',
  replaceOnce(small,'<Branchname>/ASIM-1885-8"-S8810103-91261M7-HC/B1</Branchname>',
    '','small missing first scoped primary'),['XML_SEMANTIC_DOCUMENT_INVALID']);
