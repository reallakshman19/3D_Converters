/** Read-only observation of the existing policy and resolver on original inputs. */
import {buildStandaloneDtxrResolutionLedger,standaloneDtxrBranchRelationship} from './xml-cii-trace-resolution-ledger.js';
import {supportKindFromMember} from './xml-cii-mds-restraint-closure.js';
import {restraintEntriesFromSupportKind} from '../../converters/xml-cii2019-core/support-mapping.js';
import {migrateSupportMappingConfig} from '../../converters/xml-cii2019-core/support-mapping-config.js';

const text=value=>String(value??'').trim();
const children=(node,tag)=>[...(node?.childNodes||[])].filter(n=>n.nodeType===1&&n.nodeName.replace(/^.*:/,'')===tag);
const field=(node,tag)=>text(children(node,tag)[0]?.textContent);

function originalNodes(journal) {
  const document=new DOMParser().parseFromString(journal.sourceText,'application/xml');
  return [...document.getElementsByTagName('Branch')].flatMap(branch=>children(branch,'Node'));
}

function expectation(source,journal,ledger,nodes,config,disabled) {
  const branches=[...new Set(journal.original.map(row=>row.target.branch))];
  if(source.branch&&!branches.some(branch=>standaloneDtxrBranchRelationship(branch,source.branch).compatible))
    return {path:source.path,status:'EXCLUDED_BRANCH',reason:'Source branch is outside the selected XML pipe/branch scope.'};
  if(disabled)return {path:source.path,status:'JSON_RESTRAINTS_DISABLED',reason:'Consumed configuration disables JSON restraints.'};
  let decision;
  const kind=supportKindFromMember({raw:{attributes:source.fields},capturedFields:source.fields},config,value=>{decision=value;});
  if(!kind)return {path:source.path,status:'NO_QUALIFIED_KIND',reason:'Existing active closure cannot classify this original source member.'};
  const candidates=ledger.records.filter(row=>String(row.status).startsWith('RESOLVED_')&&
    ['ANCI','ATTA'].includes(row.componentType.toUpperCase())&&row.sourcePaths.includes(source.path)).map(row=>({
      target:journal.original.find(node=>node.target.xmlIndex===row.xmlIndex)?.target,
      method:row.matchType,branchRelationship:row.branchRelationship,distanceMm:row.positionDistanceMm,
      toleranceMm:row.coordinateToleranceMm,
      entries:restraintEntriesFromSupportKind(kind,source.fields,nodes[row.xmlIndex-1],config)
        .map(entry=>({type:entry.type,gap:entry.gap})),
    })).filter(row=>row.target);
  return {path:source.path,status:candidates.some(row=>!row.entries.length)?'UNSUPPORTED_POLICY_PROFILE':'EVALUATED',
    kind,decision:decision||{source:'existing-active-closure'},candidates,
    mappingAuthority:'Existing compatibility position-group resolution; not a qualified physical-vertex correspondence.',
    mappingCardinality:'All resolved legacy targets checked; no unique target inferred.'};
}

export function inspectActiveSourceExpectations(journal,config) {
  try {
    const disabled=migrateSupportMappingConfig(config).useJsonForRestraints===false;
    const ledger=buildStandaloneDtxrResolutionLedger(journal.sourceText,journal.stagedJsonText,config);
    const nodes=originalNodes(journal);
    return {resolution:{jsonRestraintsEnabled:!disabled,toleranceMm:ledger.toleranceMm,calibration:ledger.calibration},
      sources:journal.sourceCensus.sources.map(source=>{
        try{return expectation(source,journal,ledger,nodes,config,disabled);}
        catch(error){return {path:source.path,status:'POLICY_EVALUATION_FAILED',reason:String(error.message)};}
      })};
  }catch(error){return {sources:[],error:String(error.message)};}
}
