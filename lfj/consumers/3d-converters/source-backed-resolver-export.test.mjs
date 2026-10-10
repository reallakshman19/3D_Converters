/** Product-owned CSV grant negative and exact-byte selection tests. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  admitSourceBackedCsvProductGrant,selectSourceBackedCsvForDownload
} from './source-backed-resolver-export.mjs';

const digest=x=>createHash('sha256').update(x).digest('hex');
const makeView=()=>{
  const rows=[{status:'RESOLVED_POS'},{status:'UNRESOLVED'}];
  const eRows=[{sourcePath:'$[0].children[0]'}];
  const nodeWiseCsv='\ufeffXML Node,Status\r\n1,RESOLVED_POS\r\n2,UNRESOLVED\r\n';
  const evidenceTreeCsv='\ufeffSource Path\r\n$[0].children[0]\r\n';
  return Object.freeze({
    schema:'LFJ.A3.VerifiedResearchView.v1',
    revision:3,originalSha256:'a'.repeat(64),xmlSha256:'b'.repeat(64),
    projectionConfigDigest:'c'.repeat(64),
    xmlNodes:2,matchedXmlNodes:1,
    nodeWiseRows:rows,evidenceTreeRows:eRows,
    nodeWiseCsv,evidenceTreeCsv,
    nodeWiseCsvSha256:digest(nodeWiseCsv),
    evidenceTreeCsvSha256:digest(evidenceTreeCsv),
    nodeWiseCsvBytes:Buffer.byteLength(nodeWiseCsv,'utf8'),
    evidenceTreeCsvBytes:Buffer.byteLength(evidenceTreeCsv,'utf8'),
    sourceOnly:true,engineeringReady:false,
    downloadAuthorized:false,appWired:false
  });
};
const setup=async()=>{
  const view=makeView();let rev=3;
  const grant=await admitSourceBackedCsvProductGrant(view,{
    revision:3,currentRevision:()=>rev
  });
  const ref={current:{
    resolverResearchView:view,resolverProductCsvGrant:grant,
    resolverResearchBuildToken:null,resolverJsonTraceRunning:false,
    resolverJsonTraceInputRevision:3
  }};
  return {view,grant,ref,setRev:n=>{rev=n}};
};
const err=code=>error=>error?.code===code;

test('both complete original CSVs have exact source-accepted UTF-8 bytes',async()=>{
  const {view,grant,ref}=await setup();
  const node=await selectSourceBackedCsvForDownload(ref,'node-wise-trace');
  const evidence=await selectSourceBackedCsvForDownload(ref,'evidence-tree');
  assert.deepEqual([node.fileName,evidence.fileName],
    ['xml-cii-node-wise-trace.csv','xml-cii-evidence-tree.csv']);
  assert.deepEqual([node.bytes,evidence.bytes],
    [view.nodeWiseCsvBytes,view.evidenceTreeCsvBytes]);
  assert.deepEqual([node.sha256,evidence.sha256],
    [digest(view.nodeWiseCsv),digest(view.evidenceTreeCsv)]);
  assert.equal(grant.schema,'LFJ.A3.ProductCsvGrant.v1');
  assert.equal(view.downloadAuthorized,false,'research rights remain false');
});
test('missing grant never permits export',async()=>{
  const {ref}=await setup();ref.current.resolverProductCsvGrant=null;
  await assert.rejects(()=>selectSourceBackedCsvForDownload(ref,'node-wise-trace'),
    err('A3_EXPORT_NOT_ADMITTED'));
});
test('forged grant identity never permits export',async()=>{
  const {view,ref}=await setup();
  ref.current.resolverProductCsvGrant=Object.freeze({
    schema:'LFJ.A3.ProductCsvGrant.v1',view,revision:3
  });
  await assert.rejects(()=>selectSourceBackedCsvForDownload(ref,'node-wise-trace'),
    err('A3_EXPORT_NOT_ADMITTED'));
});
test('stale XML source revision vetoes both outputs',async()=>{
  const {ref}=await setup();ref.current.resolverJsonTraceInputRevision=4;
  await assert.rejects(()=>selectSourceBackedCsvForDownload(ref,'node-wise-trace'),
    err('A3_EXPORT_STALE'));
  await assert.rejects(()=>selectSourceBackedCsvForDownload(ref,'evidence-tree'),
    err('A3_EXPORT_STALE'));
});
test('new concurrent Build revokes existing download grant',async()=>{
  const {ref}=await setup();ref.current.resolverJsonTraceRunning=true;
  await assert.rejects(()=>selectSourceBackedCsvForDownload(ref,'node-wise-trace'),
    err('A3_EXPORT_STALE'));
});
test('running worker token revokes old download grant',async()=>{
  const {ref}=await setup();ref.current.resolverResearchBuildToken={};
  await assert.rejects(()=>selectSourceBackedCsvForDownload(ref,'evidence-tree'),
    err('A3_EXPORT_STALE'));
});
test('view replacement revokes original grant',async()=>{
  const {ref}=await setup();ref.current.resolverResearchView=makeView();
  await assert.rejects(()=>selectSourceBackedCsvForDownload(ref,'evidence-tree'),
    err('A3_EXPORT_NOT_ADMITTED'));
});
test('input changes during asynchronous SHA cannot publish download',async()=>{
  const {ref}=await setup();
  const pending=selectSourceBackedCsvForDownload(ref,'node-wise-trace');
  ref.current={...ref.current,resolverJsonTraceInputRevision:4};
  await assert.rejects(pending,err('A3_EXPORT_STALE'));
});
test('invalid CSV type is never treated as node-wise',async()=>{
  const {ref}=await setup();
  await assert.rejects(()=>selectSourceBackedCsvForDownload(ref,'unsupported'),
    err('A3_EXPORT_KIND'));
});
test('unverified research view cannot mint a product grant',async()=>{
  const view={...makeView(),downloadAuthorized:true};
  await assert.rejects(()=>admitSourceBackedCsvProductGrant(view,
    {revision:3,currentRevision:()=>3}),err('A3_EXPORT_VIEW'));
});
test('CSV missing BOM cannot be admitted',async()=>{
  const view={...makeView(),nodeWiseCsv:'XML Node\r\n1\r\n'};
  await assert.rejects(()=>admitSourceBackedCsvProductGrant(view,
    {revision:3,currentRevision:()=>3}),err('A3_EXPORT_CSV'));
});
test('CSV hash or byte count changes cannot be admitted',async()=>{
  const view={...makeView(),evidenceTreeCsvSha256:'f'.repeat(64)};
  await assert.rejects(()=>admitSourceBackedCsvProductGrant(view,
    {revision:3,currentRevision:()=>3}),err('A3_EXPORT_CSV'));
});
test('forged matched status census cannot be admitted',async()=>{
  const view={...makeView(),matchedXmlNodes:2};
  await assert.rejects(()=>admitSourceBackedCsvProductGrant(view,
    {revision:3,currentRevision:()=>3}),err('A3_EXPORT_CENSUS'));
});
test('product revision changes during admission cannot mint a grant',async()=>{
  const view=makeView();let revision=3;
  const pending=admitSourceBackedCsvProductGrant(view,{
    revision:3,currentRevision:()=>revision
  });
  revision=4;
  await assert.rejects(pending,err('A3_EXPORT_STALE'));
});
test('wrong live product revision rejects grant admission',async()=>{
  const view=makeView();
  await assert.rejects(()=>admitSourceBackedCsvProductGrant(view,{
    revision:99,currentRevision:()=>99
  }),err('A3_EXPORT_BASIS'));
});
