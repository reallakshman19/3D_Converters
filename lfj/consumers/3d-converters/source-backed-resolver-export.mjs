/**
 * A3 product-owned CSV acceptance; never upgrades a research Worker right.
 * This grant is ephemeral and bound to the current, independently verified
 * A3 view object. A new source/config/scope revision revokes both downloads.
 * Passing here qualifies only candidate browser export, not Owner release.
 */
const grants=new WeakSet();
const enc=new TextEncoder();
const sha=async text=>[...new Uint8Array(
  await crypto.subtle.digest('SHA-256',enc.encode(text))
)].map(x=>x.toString(16).padStart(2,'0')).join('');
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const shaLabel=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const two=[
  ['node-wise-trace','nodeWiseCsv','nodeWiseCsvSha256','nodeWiseCsvBytes','nodeWiseRows','xml-cii-node-wise-trace.csv'],
  ['evidence-tree','evidenceTreeCsv','evidenceTreeCsvSha256','evidenceTreeCsvBytes','evidenceTreeRows','xml-cii-evidence-tree.csv']
];

function assertView(view){
  if(!view || view.schema!=='LFJ.A3.VerifiedResearchView.v1' ||
      view.sourceOnly!==true || view.engineeringReady!==false ||
      view.downloadAuthorized!==false || view.appWired!==false ||
      !Number.isSafeInteger(view.revision)||view.revision<0 ||
      !Number.isSafeInteger(view.xmlNodes)||view.xmlNodes<1 ||
      !Number.isSafeInteger(view.matchedXmlNodes) ||
      view.matchedXmlNodes<0||view.matchedXmlNodes>view.xmlNodes ||
      !Array.isArray(view.nodeWiseRows)||
      view.nodeWiseRows.length!==view.xmlNodes ||
      !Array.isArray(view.evidenceTreeRows) ||
      !shaLabel(view.originalSha256) || !shaLabel(view.xmlSha256) ||
      !shaLabel(view.projectionConfigDigest))
    fail('A3_EXPORT_VIEW','complete source-backed product view required');
  if(view.nodeWiseRows.reduce((n,row)=>n+
      (typeof row?.status==='string' && row.status.startsWith('RESOLVED_')?1:0),0)
      !==view.matchedXmlNodes)
    fail('A3_EXPORT_CENSUS','matched XML row status count is inconsistent');
}
function assertCurrent(grant,getCurrent){
  const state=getCurrent?.();
  if(!state || state.resolverResearchView!==grant.view ||
      state.resolverProductCsvGrant!==grant ||
      state.resolverResearchBuildToken ||
      state.resolverJsonTraceRunning ||
      state.resolverJsonTraceInputRevision!==grant.revision)
    fail('A3_EXPORT_STALE','source-backed CSV grant no longer matches the current Build');
}
/** Issue a nontransferable product grant, separate from the Worker capsule. */
export async function admitSourceBackedCsvProductGrant(view,{
  revision,currentRevision
}={}){
  assertView(view);
  if(!Number.isSafeInteger(revision)||revision!==view.revision ||
      typeof currentRevision!=='function')
    fail('A3_EXPORT_BASIS','live exact product revision required');
  const current=()=>{
    if(currentRevision()!==revision)fail('A3_EXPORT_STALE','inputs changed while admitting CSVs');
  };
  current();
  for(const [,key,hashKey,bytesKey] of two){
    const csv=view[key];
    if(typeof csv!=='string'||csv.charCodeAt(0)!==0xFEFF||
        !csv.endsWith('\r\n')||!shaLabel(view[hashKey])||
        !Number.isSafeInteger(view[bytesKey])||
        enc.encode(csv).byteLength!==view[bytesKey]||
        await sha(csv)!==view[hashKey])
      fail('A3_EXPORT_CSV','full original CSV bytes/BOM/hash are not accepted');
    current();
  }
  const grant=Object.freeze({
    schema:'LFJ.A3.ProductCsvGrant.v1',
    revision,view,
    basis:Object.freeze({
      originalSha256:view.originalSha256,xmlSha256:view.xmlSha256,
      projectionConfigDigest:view.projectionConfigDigest
    })
  });
  grants.add(grant);
  current();
  return grant;
}
/**
 * On each real button click: use the exact output already verified; hash it
 * again and re-read the LIVE current state after the async digest completes.
 * No re-resolution, fallback to legacy state, or mutable CSV row regeneration.
 */
export async function selectSourceBackedCsvForDownload(stateRef,kind){
  const state=stateRef?.current,view=state?.resolverResearchView;
  const grant=state?.resolverProductCsvGrant;
  if(!grant || !grants.has(grant) || grant.view!==view)
    fail('A3_EXPORT_NOT_ADMITTED','current product CSV grant is missing');
  assertView(view);
  assertCurrent(grant,()=>stateRef.current);
  const def=two.find(row=>row[0]===kind);
  if(!def)fail('A3_EXPORT_KIND','invalid CSV download kind');
  const [,csvKey,hashKey,bytesKey,rowsKey,fileName]=def;
  const csv=view[csvKey];
  if(typeof csv!=='string'||enc.encode(csv).byteLength!==view[bytesKey]||
      await sha(csv)!==view[hashKey])
    fail('A3_EXPORT_TAMPER','product CSV changed since acceptance');
  assertCurrent(grant,()=>stateRef.current);
  return Object.freeze({fileName,content:csv,rowCount:view[rowsKey].length,
    revision:grant.revision,sha256:view[hashKey],bytes:view[bytesKey]});
}
