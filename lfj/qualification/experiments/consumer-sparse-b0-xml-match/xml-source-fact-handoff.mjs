/** LFJ source-only original XML occurrence facts. Never grants engineering/CII authority. */
const encoder=new TextEncoder();
export function buildBoundedOriginalXmlSourceFacts(records,{remainingBytes=8*1024*1024}={}){
  if(!Array.isArray(records)||!records.length)return {available:false,code:'LFJ_FACT_LEDGER_EMPTY'};
  if(!Number.isSafeInteger(remainingBytes)||remainingBytes<0)return {available:false,code:'LFJ_FACT_BUDGET_INVALID'};
  const facts=[];
  for(let i=0;i<records.length;i++){
    const row=records[i]||{},status=String(row.status||'');
    if(row.xmlIndex!==i+1)return {available:false,code:'LFJ_FACT_XML_ORDER'};
    if(status!=='UNRESOLVED'&&!status.startsWith('RESOLVED_'))return {available:false,code:'LFJ_FACT_STATUS'};
    const members=Array.isArray(row.positionMembers)?row.positionMembers:[];
    const paths=Array.isArray(row.sourcePaths)?row.sourcePaths.filter(x=>typeof x==='string'&&x.length):[];
    if(!paths.length)for(const m of members){const p=m?.sourcePath||m?.path;if(typeof p==='string'&&p&&!paths.includes(p))paths.push(p);}
    if(status.startsWith('RESOLVED_')&&!paths.length)return {available:false,code:'LFJ_FACT_SOURCE_PATH'};
    const sourceOccurrences=members.map(m=>({sourcePath:m?.sourcePath||m?.path||'',
      jsonNodeNo:m?.jsonNodeNo??null,sourceOrdinal:m?.sourceOrdinal??null})).filter(m=>m.sourcePath);
    facts.push({xmlIndex:row.xmlIndex,xmlNodeNumber:row.xmlNodeNumber??null,
      xmlBranch:String(row.xmlBranch||''),status,matchType:String(row.matchType||''),
      sourcePaths:paths,sourceOccurrences});
  }
  const json=JSON.stringify(facts);
  if(json.length>remainingBytes||encoder.encode(json).byteLength>remainingBytes)
    return {available:false,code:'LFJ_FACT_TRANSFER_BOUND'};
  return {available:true,code:'LFJ_SOURCE_ONLY_FACTS',records:facts,
    bytes:encoder.encode(json).byteLength,
    matchedCount:facts.filter(f=>f.status.startsWith('RESOLVED_')).length};
}
