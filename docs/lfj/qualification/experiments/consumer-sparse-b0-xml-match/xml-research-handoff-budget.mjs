/** H10 source-only research capsule cap. NOT a production download grant. */
export const RESEARCH_HANDOFF_MAX_BYTES=8*1024*1024;
const encoder=new TextEncoder();
const tooLarge=()=>{throw Object.assign(new Error(
  'research-only inline result exceeds the bounded transfer budget'),
  {code:'RESEARCH_HANDOFF_TOO_LARGE'});};

/**
 * Count the precise UTF-8 bytes of the four transported strings without
 * concatenating them into another potentially multi-megabyte allocation.
 * CSV serialization and row generation are unchanged in the caller.
 */
export function assertResearchHandoffPayloadBytes({
  nodeCsv,evidenceCsv,nodeWiseRows,evidenceTreeRows
}={}){
  let total=0;
  const add=value=>{
    // UTF-8 byte length of a JS string can never be smaller than its
    // UTF-16 code-unit length. Fail before a huge encoder allocation.
    if(typeof value!=='string')
      throw Object.assign(new TypeError('research handoff payload must be text'),
        {code:'RESEARCH_HANDOFF_INVALID'});
    if(value.length>RESEARCH_HANDOFF_MAX_BYTES-total)tooLarge();
    total+=encoder.encode(value).length;
    if(total>RESEARCH_HANDOFF_MAX_BYTES)tooLarge();
  };
  add(nodeCsv);
  add(evidenceCsv);
  add(JSON.stringify(nodeWiseRows));
  add(JSON.stringify(evidenceTreeRows));
  return total;
}
