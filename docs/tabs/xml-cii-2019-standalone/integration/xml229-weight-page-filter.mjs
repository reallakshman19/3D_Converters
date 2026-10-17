/**
 * Read-only predicate for Worker-owned verified original physical Weight rows.
 * "Blank" does not mean an empty proposal field: a qualified suggestion is
 * still unaccepted engineering evidence. Existing source, Match-1 and Final
 * accepted masses remain the only effective weight signals.
 */
export const xml229WeightReviewFilters=Object.freeze([
 'all','rigid','blank-rigid','needs-review',
]);
export function matchesXml229WeightReviewFilter(filter,{
 componentType,sourceKg,match1State,finalState,
}={}){
 if(!xml229WeightReviewFilters.includes(filter))
   throw new RangeError('Unknown verified Weight review filter');
 const rigid=/^RIGID/i.test(String(componentType??''));
 if((filter==='rigid'||filter==='blank-rigid')&&!rigid)return false;
 const accepted=match1State==='accepted'||finalState==='accepted'||
   (typeof sourceKg==='number'&&Number.isFinite(sourceKg)&&sourceKg>0);
 if((filter==='needs-review'||filter==='blank-rigid')&&accepted)return false;
 return true;
}
