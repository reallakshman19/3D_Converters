/**
 * #1104 A04-COMPOSE: source-only app-owned published generation -> A04 typed
 * node candidates. Original R05 census + selected original bytes MUST come
 * from the SAME live app-owned generation. Never accepts a caller-supplied
 * root profile, an arbitrary list of facts, or LFJ's engineering authority.
 *
 * This is a bounded, volatile preflight. Real 30/90MB and deployed app H1 are
 * separate product gates; no Resolver/Enrichment, CII, CSV or XML promotion.
 */
import {inspectStructuredJsonRootFacts} from '../../contracts/profiles/root-profile.mjs';
import {projectTypedOwnAttributes} from './typed-own-attributes.mjs';

export class PublishedTypedSourceError extends TypeError {
  constructor(code,detail){super(code+': '+detail);this.name='PublishedTypedSourceError';this.code=code;}
}
const fail=(code,detail)=>{throw new PublishedTypedSourceError(code,detail);};
const sourceKeys=['sourceRefId','sourceSha256','sourceRevision'];
const epochKeys=['selectionDigest','jobId','dependencyRevision','byteLength'];
function eligible(view){
  if(!view||view.receipt?.schema!=='LFJ.3D.ConsumerSourceFactsReceipt.v1'||
    view.receipt.complete!==true||view.receipt.rightsBasis!=='SOURCE_FACTS_ONLY'||
    view.receipt.engineeringReady!==false||
    view.rightsBasis!=='SOURCE_FACTS_ONLY'||view.engineeringReady!==false||
    !Array.isArray(view.facts)||
    !Number.isSafeInteger(view.receipt.selectedCount)||
    view.receipt.selectedCount!==view.facts.length||
    view.sourceIndexSummary?.schema!=='LFJ.JSON.OccurrenceIndexSummary.v1'||
    view.sourceIndexSummary.complete!==true||
    view.sourceIndexSummary.rightsBasis!=='SOURCE_FACTS_ONLY'||
    view.sourceIndexSummary.engineeringReady!==false||
    sourceKeys.some(k=>view.receipt[k]!==view.sourceIndexSummary[k])||
    view.receipt.byteLength!==view.sourceIndexSummary.byteLength||
    !view.sourceIndexSummary.rootFacts)
    fail('APP_SOURCE_GENERATION_INVALID',
      'only the same atomically committed source-only R05 original generation may be projected');
}
/** @param {{generationStore, maxRows?, maxScalarBytes?}} input */
export function projectPublishedSourceCandidate({
  generationStore,maxRows=4096,maxScalarBytes=65536
}={}){
  if(typeof generationStore?.readPublished!=='function')
    fail('APP_SOURCE_GENERATION_REQUIRED','first-party source-generation read port required');
  const original=generationStore.readPublished();
  if(!original)
    fail('APP_SOURCE_GENERATION_REQUIRED','no live committed original source generation');
  eligible(original);
  let rootProfile;
  try{
    rootProfile=inspectStructuredJsonRootFacts(original.sourceIndexSummary.rootFacts);
  }catch{
    fail('APP_SOURCE_ROOT_INVALID',
      'the committed original R05 token root does not qualify for read-only structured projection');
  }
  const result=projectTypedOwnAttributes({
    facts:original.facts,receipt:original.receipt,
    summary:original.sourceIndexSummary,rootProfile,
    maxRows,maxScalarBytes
  });
  // A store may invalidate its publication under a changed XML/master/job or
  // file basis. A second owned read fences even a getter's synchronous side
  // effects before returning a projected candidate to an app consumer.
  const still=generationStore.readPublished();
  if(!still)
    fail('APP_SOURCE_GENERATION_STALE','original source generation superseded during typed projection');
  eligible(still);
  if([...sourceKeys,...epochKeys].some(k=>original.receipt[k]!==still.receipt[k])||
    still.receipt.selectedCount!==original.receipt.selectedCount||
    still.sourceIndexSummary.occurrenceCount!==
      original.sourceIndexSummary.occurrenceCount||
    JSON.stringify(still.sourceIndexSummary.rootFacts)!==
      JSON.stringify(original.sourceIndexSummary.rootFacts))
    fail('APP_SOURCE_GENERATION_STALE','published original or source root changed during typed projection');
  return result;
}
