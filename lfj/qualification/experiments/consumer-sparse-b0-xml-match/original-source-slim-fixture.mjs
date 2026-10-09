/** Shared test-only original-source → authentic B0 compact consumer facts. No product authority. */
import assert from 'node:assert/strict';
import {buildStandaloneDtxrPositionGroups} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js';
import {decorateJsonTraceMember} from
  '../../../../tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js';
import {compactMatchingEvidence} from
  '../consumer-sparse-b0-consumer/branch-sliced-projection.mjs';
import {slimNode} from './xml-csv-parity.mjs';

const attrsWithOwnNode=new Set([
  'JSON_NODE_NO','JSONNODENO','NODE_NO','NODENUMBER','NODE','SEQ','SEQUENCE'
]);
const factKeys=[
  'jsonNodeNo','jsonSequence','branchName','point','bore','type',
  'description','dtxrPs','labeled','name','componentRef','tags','cmpSupGap',
  'path','capturedFields','semanticFields'
];
const normalized=fact=>Object.fromEntries(factKeys.map(key=>
  [key,fact[key]??(key==='point'?null:'')]));
function countStaged(value){
  if(Array.isArray(value))
    return value.reduce((n,child)=>n+countStaged(child),0);
  if(!value||typeof value!=='object')return 0;
  return 1+(Array.isArray(value.children)?countStaged(value.children):0);
}
function originalNodeIsExplicit(raw){
  const attrs=raw?.attributes&&typeof raw.attributes==='object'
    ?raw.attributes:{};
  return Object.entries(attrs).some(([key,value])=>
    attrsWithOwnNode.has(key.toUpperCase())&&value!==null&&
    value!==undefined&&String(value).trim()!=='');
}
// Independent test-side original branch producer reconstruction. This uses
// exactly the real B0 capture/slim adapters and the real original legacy
// per-branch traversal, not a new/duplicated XML matching implementation.
export function slimSourceFromOriginal(original,config={}){
  assert.ok(Array.isArray(original)&&original.length,
    'authentic source must have root staged branches');
  let offset=0,facts=0;
  const branches=[];
  for(let rootIndex=0;rootIndex<original.length;rootIndex++){
    const root=original[rootIndex];
    const branch={type:'BRANCH',name:null,children:[]};
    const entries=buildStandaloneDtxrPositionGroups([root],6,config)
      .flatMap(group=>group.entries)
      .sort((a,b)=>a.jsonSequence-b.jsonSequence);
    for(const entry of entries){
      const decorated=decorateJsonTraceMember(entry,config);
      const fact=normalized({...decorated,
        // The real producer reads source-global original occurrence paths and
        // restores the global fallback sequence when a root branch is sliced.
        path:'$['+rootIndex+']'+entry.path.slice(4),
        jsonSequence:offset+entry.jsonSequence,
        jsonNodeNo:originalNodeIsExplicit(entry.raw)?entry.jsonNodeNo:
          String(offset+entry.jsonSequence)
      });
      const node=slimNode({...fact,
        matchingEvidence:compactMatchingEvidence(entry.raw,config)});
      if(branch.name===null)branch.name=fact.branchName;
      assert.equal(branch.name,fact.branchName,'cross-branch fact leaked');
      branch.children.push(node);
      facts++;
    }
    assert.ok(branch.children.length,'empty/missing root domain branch');
    branches.push(branch);
    offset+=countStaged(root);
  }
  return {branches,facts,sourceObjects:offset};
}
