/** Source-only original O1 index is never a CII release authority.
 * Pure predicate shared by checklist and actual native Run execution gates.
 * Select only ENABLED Mode A source records; do not block unrelated flows.
 */
export function hasSelectedXml229OriginalO1Receipt(input={}){
 if(!input||typeof input!=='object')return false;
 if(input.xml229StagedSourceReceipt||input.workflow?.xml229StagedSourceReceipt)return true;
 return Array.isArray(input.sourceBatch?.sources)&&input.sourceBatch.sources.some(
  source=>source?.enabled!==false&&Boolean(
   source.xml229StagedSourceReceipt||source.workflow?.xml229StagedSourceReceipt));
}
